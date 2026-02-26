import { mustId } from '../../lib/dom.js';
import { clearGameProgress, readGameProgress, writeGameProgress } from '../../lib/storage.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import {
  applySeed,
  clearSessionSeed,
  computeNextPosition,
  createState,
  getCurrentLevel,
  getCurrentRoute,
  readSessionSeed,
} from './state.js';
import { fetchJSON, loadMap, loadStrings } from './loaders.js';
import { bindEvents } from './events.js';
import { createUI, normalizeAnswer } from './ui.js';
import { showReward } from '../../lib/reward.js';

const GAME_ID = 'travel-tracker';
const MAP_PATH = 'assets/img/travel-tracker/latvia.svg';
const DATA_PATH = 'data/travel-tracker/routes.json';
const BUS_ANIMATION_MS = 1100;

const selectors = {
  map: mustId('tt-map'),
  mapInner: mustId('tt-map-inner'),
  bus: mustId('tt-bus'),
  routeLayer: mustId('tt-route'),
  gap: mustId('tt-gap'),
  hint: mustId('tt-hint'),
  feedback: mustId('tt-feedback'),
  feedbackMessage: mustId('tt-feedback-message'),
  input: mustId('tt-input'),
  check: mustId('checkBtn'),
  next: mustId('tt-next'),
  start: mustId('tt-start'),
  restart: mustId('tt-restart'),
  choices: mustId('tt-choices'),
  score: mustId('tt-score'),
  streak: mustId('tt-streak'),
  multiplier: mustId('tt-multiplier'),
  level: mustId('tt-level'),
  routeMeta: mustId('tt-route-meta'),
  liveRegion: mustId('tt-live'),
  progress: mustId('tt-progress'),
  progressBar: mustId('tt-progress-bar'),
};

const state = createState();

let strings = {};
let overlaySvg = null;
let viewBox = { width: 800, height: 500 };
let cityCoords = new Map();
let animationId = null;

function setI18nLoading(isLoading) {
  if (!document?.body) return;
  document.body.classList.toggle('i18n-loading', isLoading);
}

function getMultiplier(streak) {
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

const ui = createUI({
  selectors,
  state,
  getStrings: () => strings,
  getViewBox: () => viewBox,
  getOverlaySvg: () => overlaySvg,
  getAnimationId: () => animationId,
  setAnimationId: (value) => {
    animationId = value;
  },
  busAnimationMs: BUS_ANIMATION_MS,
});

function dispatchTrack(event, meta = {}) {
  const detail = { game: 'travel-tracker', event, meta };
  window.dispatchEvent(new CustomEvent('llb1:track', { detail }));
}

function saveProgress(overrides = {}) {
  const payload = {
    levelIndex: state.levelIndex,
    routeIndex: state.routeIndex,
    score: state.score,
    streak: state.streak,
    started: state.started,
    seed: state.seed,
    ...overrides,
  };
  try {
    writeGameProgress(GAME_ID, payload);
  } catch (err) {
    console.warn('Failed to persist travel tracker progress', err);
  }
}

function clearProgress() {
  try {
    clearGameProgress(GAME_ID);
  } catch (err) {
    console.warn('Failed to clear travel tracker progress', err);
  }
}

function loadProgress() {
  try {
    const data = readGameProgress(GAME_ID, {});
    if (!data || typeof data !== 'object') return;
    if (Number.isFinite(data.seed) && data.seed !== state.seed) {
      return;
    }
    const maxLevel = Math.max(0, state.levels.length - 1);
    if (Number.isInteger(data.levelIndex)) {
      state.levelIndex = Math.min(maxLevel, Math.max(0, data.levelIndex));
    }
    const level = getCurrentLevel(state);
    const maxRoute = Math.max(0, (level?.routes.length ?? 1) - 1);
    if (Number.isInteger(data.routeIndex)) {
      state.routeIndex = Math.min(maxRoute, Math.max(0, data.routeIndex));
    }
    if (Number.isInteger(data.score)) state.score = data.score;
    if (Number.isInteger(data.streak)) state.streak = data.streak;
    if (typeof data.started === 'boolean') state.started = data.started;
  } catch (err) {
    console.warn('Failed to restore travel tracker progress', err);
  }
}

function resetState() {
  state.levelIndex = 0;
  state.routeIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.attempts = 0;
  state.routeCompleted = false;
  state.inputLocked = false;
  state.started = true;
  dispatchTrack('start', { levelId: getCurrentLevel(state)?.id ?? null, restart: true });
  saveProgress();
}

function presentCurrentRoute() {
  const route = getCurrentRoute(state);
  ui.clearFeedback();
  ui.setHint();
  ui.updateChoices(route);
  if (selectors.input) {
    selectors.input.value = '';
    ui.syncChoiceSelection('');
  }
  state.attempts = 0;
  state.routeCompleted = false;
  state.inputLocked = !state.started;
  ui.updateControls();
  ui.updateScoreboard();
  ui.updateRouteMeta();
  if (!route) {
    selectors.gap.textContent = strings.noQuestion ?? '—';
    ui.drawRouteLine(null, null);
    return;
  }
  selectors.gap.textContent = route.gap;
  const from = cityCoords.get(route.from);
  const to = cityCoords.get(route.to);
  if (from) {
    ui.moveBusTo(from);
  }
  ui.drawRouteLine(from, to);
}

function showCorrect(route) {
  ui.setFeedbackMessage(strings.correct, 'correct');
  if (route?.explain) {
    ui.setHint(route.explain);
  }
}

function showHintProgression(route) {
  const baseHint = route?.hint?.trim() ?? '';
  if (state.attempts <= 1) {
    const firstHint = baseHint || strings.wrong;
    ui.setFeedbackMessage(firstHint, 'wrong');
    ui.setHint();
    return false;
  }
  if (state.attempts === 2) {
    const hintLabel = strings.hint ?? 'Hint';
    const strongerHint = baseHint
      ? `${hintLabel}: ${baseHint} ${strings.wrong ?? 'Try again!'}`
      : (strings.wrong ?? 'Try again!');
    ui.setFeedbackMessage(strongerHint, 'wrong');
    ui.setHint();
    return false;
  }
  const revealedAnswer = route?.answers?.[0] ?? '';
  const answerLabel = strings.answerLabel ?? 'Answer';
  const answerMessage = `${answerLabel}: ${revealedAnswer || '—'}`;
  ui.setFeedbackMessage(answerMessage, 'wrong');
  if (route?.explain) {
    ui.setHint(route.explain);
  } else {
    ui.setHint();
  }
  if (selectors.input) {
    selectors.input.value = revealedAnswer;
    ui.syncChoiceSelection(revealedAnswer);
  }
  state.routeCompleted = true;
  state.inputLocked = true;
  ui.setChoicesCompleted(true);
  const from = cityCoords.get(route.from);
  const to = cityCoords.get(route.to);
  ui.drawRouteLine(from, to, { completed: true });
  return true;
}

function onCorrect(route) {
  const nextStreak = state.streak + 1;
  const multiplier = getMultiplier(nextStreak);
  state.score += 10 * multiplier;
  state.streak = nextStreak;
  state.attempts = 0;
  if (state.streak > 0 && state.streak % 5 === 0) {
    showReward({
      title: `Streak ${state.streak}`,
      detail: 'Prefixes on point.',
      points: 10 * multiplier,
      pointsLabel: 'xp',
      tone: 'success',
    });
  }
  state.routeCompleted = true;
  state.inputLocked = true;
  ui.setChoicesCompleted(true);
  ui.updateScoreboard();
  showCorrect(route);
  const from = cityCoords.get(route.from);
  const to = cityCoords.get(route.to);
  ui.drawRouteLine(from, to, { completed: true });
  if (from && to) {
    ui.animateBus(from, to, () => {});
  }
  ui.updateControls();
  const nextPos = computeNextPosition(state);
  saveProgress({
    levelIndex: nextPos.levelIndex,
    routeIndex: nextPos.routeIndex,
    score: state.score,
    streak: state.streak,
    started: state.started,
  });
  dispatchTrack('correct', {
    levelId: getCurrentLevel(state)?.id ?? null,
    from: route.from,
    to: route.to,
    multiplier,
  });
}

function onWrong(route) {
  state.attempts += 1;
  state.streak = 0;
  const autoRevealed = showHintProgression(route);
  if (!autoRevealed) {
    state.routeCompleted = false;
    state.inputLocked = false;
  }
  ui.updateScoreboard();
  ui.updateControls();
  if (autoRevealed) {
    const nextPos = computeNextPosition(state);
    saveProgress({
      levelIndex: nextPos.levelIndex,
      routeIndex: nextPos.routeIndex,
      score: state.score,
      streak: state.streak,
      started: state.started,
    });
  } else {
    saveProgress();
  }
  dispatchTrack('wrong', {
    levelId: getCurrentLevel(state)?.id ?? null,
    from: route.from,
    to: route.to,
    attempts: state.attempts,
    autoRevealed,
  });
}

function handleCheck() {
  if (!state.started || state.inputLocked) return;
  const route = getCurrentRoute(state);
  if (!route) return;
  const guess = selectors.input.value?.trim() ?? '';
  selectors.input.value = guess;
  if (!guess || normalizeAnswer(guess) === '') {
    ui.setFeedbackMessage(strings.enterAnswer);
    ui.updateControls();
    return;
  }
  const normalizedGuess = normalizeAnswer(guess);
  const isCorrect = (route.answers || []).some((ans) => normalizeAnswer(ans) === normalizedGuess);
  if (isCorrect) {
    onCorrect(route);
  } else {
    onWrong(route);
  }
}

function advanceRoute() {
  if (!state.started) return;
  const level = getCurrentLevel(state);
  if (!level) return;
  const completedLevel = state.routeIndex + 1 >= level.routes.length;
  if (completedLevel) {
    dispatchTrack('levelComplete', {
      levelId: level.id,
      title: level.title,
    });
  }
  if (completedLevel) {
    state.levelIndex = (state.levelIndex + 1) % state.levels.length;
    state.routeIndex = 0;
  } else {
    state.routeIndex += 1;
  }
  state.routeCompleted = false;
  state.inputLocked = false;
  saveProgress();
  presentCurrentRoute();
  if (completedLevel && strings.level_complete) {
    ui.setFeedbackMessage(strings.level_complete);
    showReward({
      title: strings.level_complete,
      detail: level?.title || '',
      tone: 'accent',
    });
  }
  ui.updateControls();
}

function handleStart() {
  if (!state.started) {
    state.started = true;
    state.inputLocked = false;
    ui.updateControls();
    dispatchTrack('start', { levelId: getCurrentLevel(state)?.id ?? null });
  } else {
    resetState();
  }
  presentCurrentRoute();
  ui.updateControls();
  saveProgress();
}

function handleRestart() {
  const wasStarted = state.started;
  clearSessionSeed();
  applySeed(state, null);
  clearProgress();
  state.levelIndex = 0;
  state.routeIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.attempts = 0;
  state.routeCompleted = false;
  state.inputLocked = !wasStarted;
  state.started = wasStarted;
  ui.clearFeedback();
  ui.setHint();
  if (selectors.input) {
    selectors.input.value = '';
  }
  ui.updateScoreboard();
  presentCurrentRoute();
  ui.updateControls();
  saveProgress({ started: state.started });
  dispatchTrack('reshuffle', { seed: state.seed, started: wasStarted });
}

async function init() {
  showLoading('Loading game data...');
  setI18nLoading(true);
  try {
    const lang = document.documentElement.lang || 'lv';
    const [{ data: loadedStrings }, routes] = await Promise.all([
      loadStrings(lang),
      fetchJSON(DATA_PATH),
    ]);
    strings = {
      check: 'Check',
      next: 'Next',
      start: 'Start',
      restart: 'Restart',
      restartShort: 'Restart',
      level: 'Level',
      enterAnswer: 'Type an answer first.',
      progressLabel: 'Question',
      progressOf: 'of',
      progressIdle: '—',
      noHint: '—',
      answerLabel: 'Answer',
      noQuestion: 'No questions available.',
      noRoute: '—',
      ...loadedStrings,
    };
    strings.restart = strings.restart ?? strings.start ?? 'Restart';
    strings.restartShort = strings.restartShort ?? strings.restart;
    strings.level = strings.level ?? 'Level';
    strings.enterAnswer = strings.enterAnswer ?? 'Type an answer first.';
    strings.progressLabel = strings.progressLabel ?? 'Question';
    strings.progressOf = strings.progressOf ?? 'of';
    strings.progressIdle = strings.progressIdle ?? '—';
    strings.noHint = strings.noHint ?? '—';
    strings.answerLabel = strings.answerLabel ?? 'Answer';
    strings.noQuestion = strings.noQuestion ?? 'No questions available.';
    strings.noRoute = strings.noRoute ?? '—';
    ui.applyStrings();
    setI18nLoading(false);

    state.originalLevels = (routes?.levels ?? []).map((level) => ({
      ...level,
      routes: [...(level.routes ?? [])],
    }));
    applySeed(state, readSessionSeed());
    state.levelIndex = 0;
    state.routeIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.attempts = 0;
    state.routeCompleted = false;
    state.started = false;
    state.inputLocked = true;

    const mapData = await loadMap(selectors, MAP_PATH);
    overlaySvg = mapData.overlaySvg;
    viewBox = mapData.viewBox;
    cityCoords = mapData.cityCoords;

    bindEvents({
      selectors,
      state,
      handleCheck,
      handleStart,
      handleRestart,
      advanceRoute,
      syncChoiceSelection: ui.syncChoiceSelection,
      updateControls: ui.updateControls,
    });
    loadProgress();
    state.inputLocked = !state.started;
    presentCurrentRoute();
    ui.updateControls();
    ui.updateScoreboard();
  } catch (err) {
    console.error('Failed to boot Travel Tracker', err);
    if (selectors.feedbackMessage) {
      selectors.feedbackMessage.textContent = 'Failed to load Travel Tracker.';
    }
    const safeError = err instanceof Error ? err : new Error('Failed to load Travel Tracker.');
    showFatalError(safeError);
    setI18nLoading(false);
  } finally {
    hideLoading();
  }
}

init();
