/**
 * Darbības Vārdi V2 — screen flow, input handling, and persistence.
 *
 * Start -> play -> summary. Mastery records decide which ladder stage each verb
 * gets, and every answer is written back to storage so progress survives reloads.
 */
import { announceLive } from '../../lib/aria.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { showReward } from '../../lib/reward.js';
import { clearGameProgress, readGameProgress, writeGameProgress } from '../../lib/storage.js';
import { loadWords } from '../../lib/words-data.js';
import {
  MAX_BOX,
  ROUND_SIZE,
  STAGES,
  STAGE_LABELS,
  applyResult,
  buildExplanation,
  buildRound,
  buildTask,
  calculateAccuracy,
  computeDailyStreak,
  describeDeck,
  isCorrectAssembly,
  isCorrectChoice,
  normalizeRecords,
  normalizeVerbs,
  stageForVerb,
  xpForAnswer,
} from './logic.js';

const GAME_ID = 'darbibas-vardi-v2';
const SWIPE_THRESHOLD = 60;
const OPTION_KEYS = ['1', '2', '3', '4'];

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function getElements(root) {
  const q = (selector) => root.querySelector(selector);
  return {
    root,
    screens: {
      start: q('[data-screen="start"]'),
      play: q('[data-screen="play"]'),
      summary: q('[data-screen="summary"]'),
    },
    error: q('#dv2-error'),
    live: q('#dv2-live'),
    xp: q('#dv2-xp'),
    dailyStreak: q('#dv2-daily-streak'),
    bestStreak: q('#dv2-best-streak'),
    dueCount: q('#dv2-due-count'),
    learningCount: q('#dv2-learning-count'),
    masteredCount: q('#dv2-mastered-count'),
    freshCount: q('#dv2-fresh-count'),
    masteryBar: q('#dv2-mastery-bar'),
    deckNote: q('#dv2-deck-note'),
    languageButtons: Array.from(root.querySelectorAll('[data-language]')),
    speechToggle: q('#dv2-speech-toggle'),
    hapticsToggle: q('#dv2-haptics-toggle'),
    start: q('#dv2-start'),
    reset: q('#dv2-reset'),
    quit: q('#dv2-quit'),
    stageLabel: q('#dv2-stage-label'),
    progressText: q('#dv2-progress-text'),
    progress: q('#dv2-progress'),
    progressBar: q('#dv2-progress-bar'),
    roundXp: q('#dv2-round-xp'),
    streak: q('#dv2-streak'),
    card: q('#dv2-card'),
    promptLabel: q('#dv2-prompt-label'),
    prompt: q('#dv2-prompt'),
    speak: q('#dv2-speak'),
    context: q('#dv2-context'),
    pronoun: q('#dv2-pronoun'),
    tense: q('#dv2-tense'),
    options: q('#dv2-options'),
    builder: q('#dv2-builder'),
    buildStem: q('#dv2-build-stem'),
    buildEnding: q('#dv2-build-ending'),
    stemOptions: q('#dv2-stem-options'),
    endingOptions: q('#dv2-ending-options'),
    check: q('#dv2-check'),
    keysHint: q('.dv2-hint__keys'),
    feedback: q('#dv2-feedback'),
    feedbackTitle: q('#dv2-feedback-title'),
    feedbackText: q('#dv2-feedback-text'),
    next: q('#dv2-next'),
    ring: q('.dv2-ring'),
    summaryMessage: q('#dv2-summary-message'),
    summaryAccuracy: q('#dv2-summary-accuracy'),
    summaryScore: q('#dv2-summary-score'),
    summaryXp: q('#dv2-summary-xp'),
    summaryStreak: q('#dv2-summary-streak'),
    summaryMastered: q('#dv2-summary-mastered'),
    review: q('#dv2-review'),
    replay: q('#dv2-replay'),
    home: q('#dv2-home'),
  };
}

function defaultProgress() {
  return {
    records: {},
    xp: 0,
    bestStreak: 0,
    dailyStreak: 0,
    roundsPlayed: 0,
    lastPlayedISO: '',
    language: 'en',
    speech: false,
    haptics: true,
  };
}

function readStoredProgress() {
  try {
    const saved = readGameProgress(GAME_ID, {});
    return {
      records: normalizeRecords(saved.records),
      xp: toCount(saved.xp),
      bestStreak: toCount(saved.bestStreak),
      dailyStreak: toCount(saved.dailyStreak),
      roundsPlayed: toCount(saved.roundsPlayed),
      lastPlayedISO: typeof saved.lastPlayedISO === 'string' ? saved.lastPlayedISO : '',
      language: saved.language === 'ru' ? 'ru' : 'en',
      speech: saved.speech === true,
      haptics: saved.haptics !== false,
    };
  } catch (err) {
    console.warn('Unable to read Darbības Vārdi V2 progress', err);
    return defaultProgress();
  }
}

function persist(state) {
  try {
    writeGameProgress(GAME_ID, {
      records: state.records,
      xp: state.xp,
      bestStreak: state.bestStreak,
      dailyStreak: state.dailyStreak,
      roundsPlayed: state.roundsPlayed,
      lastPlayedISO: state.lastPlayedISO,
      language: state.language,
      speech: state.speech,
      haptics: state.haptics,
    });
  } catch (err) {
    console.warn('Unable to persist Darbības Vārdi V2 progress', err);
  }
}

function initGame(root) {
  const els = getElements(root);
  const stored = readStoredProgress();
  const state = {
    ...stored,
    screen: 'start',
    verbs: [],
    queue: [],
    retried: new Set(),
    reviewed: new Map(),
    task: null,
    total: 0,
    answered: 0,
    correct: 0,
    streak: 0,
    roundBestStreak: 0,
    roundXp: 0,
    locked: true,
    build: { stem: null, ending: null },
  };

  bindControls(els, state);
  renderSettings(els, state);
  renderStart(els, state);
  showScreen(els, state, 'start');

  showLoading('Ielādē darbības vārdus...');
  loadWords({ cache: 'force-cache' })
    .then(({ items }) => {
      state.verbs = normalizeVerbs(items);
      if (!state.verbs.length) throw new Error('Verb dataset is empty.');
      renderStart(els, state);
      els.start.disabled = false;
    })
    .catch((err) => {
      console.error(err);
      showError(els, 'Neizdevās ielādēt vārdu krājumu. Pārbaudi savienojumu un mēģini vēlreiz.');
      els.start.disabled = true;
    })
    .finally(() => hideLoading());
}

function showError(els, message) {
  if (!els.error) return;
  els.error.textContent = message;
  els.error.hidden = false;
}

function showScreen(els, state, screen) {
  state.screen = screen;
  Object.entries(els.screens).forEach(([name, node]) => {
    if (node) node.hidden = name !== screen;
  });
  if (screen !== 'play') hideFeedback(els);
}

/* ---------- Settings & start screen ---------- */

function renderSettings(els, state) {
  els.languageButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.language === state.language));
  });
  setSwitch(els.speechToggle, state.speech);
  setSwitch(els.hapticsToggle, state.haptics);
}

function setSwitch(button, on) {
  if (!button) return;
  button.setAttribute('aria-pressed', String(on));
  const text = button.querySelector('.dv2-switch__text');
  if (text) text.textContent = on ? 'Ieslēgta' : 'Izslēgta';
}

function renderStart(els, state) {
  const summary = describeDeck(state.verbs, state.records);
  els.xp.textContent = String(state.xp);
  els.dailyStreak.textContent = String(state.dailyStreak);
  els.bestStreak.textContent = String(state.bestStreak);
  els.dueCount.textContent = String(summary.due);
  els.learningCount.textContent = String(summary.learning);
  els.masteredCount.textContent = String(summary.mastered);
  els.freshCount.textContent = String(summary.fresh);

  const mastery = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0;
  els.masteryBar.style.width = `${mastery}%`;

  if (!summary.total) {
    els.deckNote.textContent = 'Ielādē vārdu krājumu…';
  } else if (summary.due) {
    els.deckNote.textContent = `${summary.total} vārdi kavā · ${summary.due} gaida atkārtošanu.`;
  } else {
    els.deckNote.textContent = `${summary.total} vārdi kavā · apgūti ${mastery}%.`;
  }
}

/* ---------- Round flow ---------- */

function startRound(els, state) {
  const round = buildRound(state.verbs, state.records, { size: ROUND_SIZE });
  if (!round.length) {
    showError(els, 'Kavā nav neviena darbības vārda.');
    return;
  }
  state.queue = round.slice();
  state.retried = new Set();
  state.reviewed = new Map();
  state.total = round.length;
  state.answered = 0;
  state.correct = 0;
  state.streak = 0;
  state.roundBestStreak = 0;
  state.roundXp = 0;
  showScreen(els, state, 'play');
  nextTask(els, state);
}

function nextTask(els, state) {
  hideFeedback(els);
  while (state.queue.length) {
    const verb = state.queue.shift();
    const stage = stageForVerb(verb, state.records[verb.id]);
    const task = buildTask(verb, state.verbs, { stage, language: state.language });
    if (task) {
      state.task = task;
      state.build = { stem: null, ending: null };
      state.locked = false;
      renderTask(els, state);
      return;
    }
    // A verb the dataset cannot turn into any task never re-enters the round.
    state.total = Math.max(1, state.total - 1);
  }
  finishRound(els, state);
}

function renderTask(els, state) {
  const task = state.task;
  els.stageLabel.textContent = STAGE_LABELS[task.stage];
  els.promptLabel.textContent = task.promptLabel;
  els.prompt.textContent = task.prompt;
  els.speak.hidden = !state.speech;

  const hasContext = Boolean(task.pronoun || task.tenseLabel);
  els.context.hidden = !hasContext;
  els.pronoun.textContent = task.pronoun || '';
  els.tense.textContent = task.tenseLabel || '';

  renderProgress(els, state);
  if (task.stage === STAGES.BUILD) renderBuilder(els, state, task);
  else renderOptions(els, state, task);
  els.keysHint.textContent =
    task.stage === STAGES.BUILD
      ? 'Tab un atstarpe izvēlas daļas · Enter turpina'
      : 'Taustiņi 1–4 izvēlas atbildi · Enter turpina';

  announceLive(els.live, `${task.promptLabel} ${task.prompt}`);
  if (state.speech) speak(state, task.speakText);
}

function renderProgress(els, state) {
  const done = state.answered;
  els.progressText.textContent = `${done}/${state.total}`;
  const percent = state.total ? Math.round((done / state.total) * 100) : 0;
  els.progressBar.style.width = `${percent}%`;
  els.progress.setAttribute('aria-valuenow', String(percent));
  els.roundXp.textContent = String(state.roundXp);
  els.streak.textContent = String(state.streak);
}

function renderOptions(els, state, task) {
  els.builder.hidden = true;
  els.options.hidden = false;
  els.options.replaceChildren();
  task.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dv2-option';
    button.dataset.value = option;

    const key = document.createElement('span');
    key.className = 'dv2-option__key';
    key.setAttribute('aria-hidden', 'true');
    key.textContent = OPTION_KEYS[index] || String(index + 1);

    const text = document.createElement('span');
    text.className = 'dv2-option__text';
    text.textContent = option;

    button.append(key, text);
    button.addEventListener('click', () => submitChoice(els, state, option));
    els.options.append(button);
  });
  const first = els.options.querySelector('.dv2-option');
  if (first) first.focus({ preventScroll: true });
}

function renderBuilder(els, state, task) {
  els.options.hidden = true;
  els.options.replaceChildren();
  els.builder.hidden = false;
  els.check.disabled = true;
  setSlot(els.buildStem, null, 'sakne');
  setSlot(els.buildEnding, null, 'galotne');

  renderParts(els.stemOptions, task.stemOptions, (value) => selectPart(els, state, 'stem', value));
  renderParts(els.endingOptions, task.endingOptions, (value) =>
    selectPart(els, state, 'ending', value),
  );

  // A single stem candidate carries no choice, so pre-select it.
  if (task.stemOptions.length === 1) selectPart(els, state, 'stem', task.stemOptions[0]);
  const first = els.stemOptions.querySelector('.dv2-part');
  if (first) first.focus({ preventScroll: true });
}

function renderParts(container, values, onSelect) {
  container.replaceChildren();
  values.forEach((value) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dv2-part';
    button.dataset.value = value;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = value;
    button.addEventListener('click', () => onSelect(value));
    container.append(button);
  });
}

function selectPart(els, state, slot, value) {
  if (state.locked) return;
  state.build[slot] = value;
  const container = slot === 'stem' ? els.stemOptions : els.endingOptions;
  container.querySelectorAll('.dv2-part').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.value === value));
  });
  const isStem = slot === 'stem';
  setSlot(isStem ? els.buildStem : els.buildEnding, value, isStem ? 'sakne' : 'galotne');
  els.check.disabled = !(state.build.stem && state.build.ending);
}

function setSlot(node, value, placeholder) {
  node.textContent = value || placeholder;
  node.dataset.empty = value ? 'false' : 'true';
}

function submitChoice(els, state, value) {
  if (state.locked || !state.task) return;
  const correct = isCorrectChoice(value, state.task);
  els.options.querySelectorAll('.dv2-option').forEach((button) => {
    button.disabled = true;
    const isAnswer = isCorrectChoice(button.dataset.value, state.task);
    if (isAnswer) button.classList.add('dv2-option--correct');
    else if (button.dataset.value === value) button.classList.add('dv2-option--wrong');
  });
  resolveAnswer(els, state, correct);
}

function submitAssembly(els, state) {
  if (state.locked || !state.task) return;
  const { stem, ending } = state.build;
  if (!stem || !ending) return;
  const correct = isCorrectAssembly(stem, ending, state.task);
  els.builder.querySelectorAll('.dv2-part').forEach((button) => {
    button.disabled = true;
  });
  els.check.disabled = true;
  if (!correct) {
    setSlot(els.buildStem, state.task.stem, 'sakne');
    setSlot(els.buildEnding, state.task.ending, 'galotne');
  }
  resolveAnswer(els, state, correct);
}

function resolveAnswer(els, state, correct) {
  const task = state.task;
  state.locked = true;
  state.answered += 1;

  if (correct) {
    state.correct += 1;
    state.streak += 1;
    state.roundBestStreak = Math.max(state.roundBestStreak, state.streak);
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    const gained = xpForAnswer(task.stage, state.streak - 1);
    state.roundXp += gained;
    state.xp += gained;
  } else {
    state.streak = 0;
    // Give a missed verb one more shot before the round ends.
    if (!state.retried.has(task.verbId)) {
      const verb = state.verbs.find((entry) => entry.id === task.verbId);
      if (verb) {
        state.retried.add(task.verbId);
        state.queue.push(verb);
        state.total += 1;
      }
    }
  }

  const before = state.records[task.verbId];
  const after = applyResult(before, correct);
  state.records[task.verbId] = after;
  state.reviewed.set(task.verbId, {
    lv: task.lv,
    fromBox: before?.box ?? 0,
    toBox: after.box,
  });

  vibrate(state, correct ? 18 : [12, 60, 12]);
  persist(state);
  renderProgress(els, state);
  showFeedback(els, state, correct);
}

function showFeedback(els, state, correct) {
  const message = buildExplanation(state.task, correct);
  const title = correct ? 'Pareizi!' : 'Vēl ne gluži';
  els.feedback.dataset.result = correct ? 'correct' : 'wrong';
  els.feedbackTitle.textContent = title;
  els.feedbackText.textContent = message;
  els.feedback.hidden = false;
  els.next.textContent = state.queue.length ? 'Tālāk' : 'Pabeigt';
  els.next.focus({ preventScroll: true });
  announceLive(els.live, `${title} ${message}`);
}

function hideFeedback(els) {
  els.feedback.hidden = true;
  delete els.feedback.dataset.result;
}

function finishRound(els, state) {
  state.roundsPlayed += 1;
  state.dailyStreak = computeDailyStreak(state.lastPlayedISO, state.dailyStreak);
  state.lastPlayedISO = new Date().toISOString();
  persist(state);
  renderSummary(els, state);
  renderStart(els, state);
  showScreen(els, state, 'summary');

  const accuracy = calculateAccuracy(state.correct, state.answered);
  showReward({
    title: accuracy >= 80 ? 'Lielisks raunds!' : 'Raunds pabeigts',
    detail: `Precizitāte ${accuracy}%`,
    tone: accuracy >= 80 ? 'success' : 'accent',
    points: state.roundXp,
    pointsLabel: 'XP',
  });
}

function renderSummary(els, state) {
  const accuracy = calculateAccuracy(state.correct, state.answered);
  const summary = describeDeck(state.verbs, state.records);
  els.ring.style.setProperty('--dv2-accuracy', String(accuracy));
  els.summaryAccuracy.textContent = `${accuracy}%`;
  els.summaryScore.textContent = `${state.correct}/${state.answered}`;
  els.summaryXp.textContent = `${state.roundXp} XP`;
  els.summaryStreak.textContent = String(state.roundBestStreak);
  els.summaryMastered.textContent = `${summary.mastered}/${summary.total}`;
  els.summaryMessage.textContent =
    summary.due > 0
      ? `${summary.due} vārdi jau gaida nākamo atkārtojumu.`
      : 'Viss atkārtots. Nāc atpakaļ rīt, lai noturētu sēriju.';

  els.review.replaceChildren();
  state.reviewed.forEach((entry) => {
    const item = document.createElement('li');

    const word = document.createElement('span');
    word.className = 'dv2-review__word';
    word.textContent = entry.lv;

    const badge = document.createElement('span');
    badge.className = 'dv2-review__box';
    badge.dataset.direction = entry.toBox > entry.fromBox ? 'up' : 'down';
    badge.textContent =
      entry.toBox > entry.fromBox
        ? `${entry.toBox}/${MAX_BOX} līmenis ↑`
        : `${entry.toBox}/${MAX_BOX} līmenis ↓`;

    item.append(word, badge);
    els.review.append(item);
  });
}

/* ---------- Output channels ---------- */

function speak(state, text) {
  if (!state.speech || !text) return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'lv-LV';
    const voice = synth.getVoices().find((entry) => entry.lang?.toLowerCase().startsWith('lv'));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis unavailable', err);
  }
}

function vibrate(state, pattern) {
  if (!state.haptics) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch (err) {
    console.warn('Vibration unavailable', err);
  }
}

/* ---------- Input wiring ---------- */

function bindControls(els, state) {
  els.start.disabled = true;
  els.start.addEventListener('click', () => startRound(els, state));
  els.replay.addEventListener('click', () => startRound(els, state));
  els.home.addEventListener('click', () => showScreen(els, state, 'start'));
  els.quit.addEventListener('click', () => quitRound(els, state));
  els.next.addEventListener('click', () => nextTask(els, state));
  els.check.addEventListener('click', () => submitAssembly(els, state));
  els.speak.addEventListener('click', () => speak(state, state.task?.speakText));

  els.languageButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.language = button.dataset.language === 'ru' ? 'ru' : 'en';
      renderSettings(els, state);
      persist(state);
    });
  });

  els.speechToggle.addEventListener('click', () => {
    state.speech = !state.speech;
    renderSettings(els, state);
    persist(state);
  });

  els.hapticsToggle.addEventListener('click', () => {
    state.haptics = !state.haptics;
    renderSettings(els, state);
    persist(state);
  });

  els.reset.addEventListener('click', () => resetProgress(els, state));

  bindSwipe(els, state);
  document.addEventListener('keydown', (event) => handleKeydown(els, state, event));
}

function quitRound(els, state) {
  state.queue = [];
  state.task = null;
  renderStart(els, state);
  showScreen(els, state, 'start');
}

function resetProgress(els, state) {
  if (!window.confirm('Notīrīt visu saglabāto progresu?')) return;
  clearGameProgress(GAME_ID);
  Object.assign(state, defaultProgress());
  renderSettings(els, state);
  renderStart(els, state);
  announceLive(els.live, 'Progress notīrīts.');
}

function bindSwipe(els, state) {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  els.card.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  });

  els.card.addEventListener('pointerup', (event) => {
    if (!tracking) return;
    tracking = false;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0 && state.locked) nextTask(els, state);
    else if (deltaX > 0) speak(state, state.task?.speakText);
  });

  els.card.addEventListener('pointercancel', () => {
    tracking = false;
  });
}

function handleKeydown(els, state, event) {
  if (state.screen !== 'play' || event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    quitRound(els, state);
    return;
  }

  if (state.locked) {
    if (event.key === 'Enter') {
      event.preventDefault();
      nextTask(els, state);
    }
    return;
  }

  const index = OPTION_KEYS.indexOf(event.key);
  if (index === -1) return;
  const buttons = Array.from(els.options.querySelectorAll('.dv2-option'));
  const target = buttons[index];
  if (!target) return;
  event.preventDefault();
  target.click();
}

const root = document.querySelector('[data-darbibas-vardi-v2]');
if (root) initGame(root);
