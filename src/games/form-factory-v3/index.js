/**
 * Form Factory v3 — adaptive screen flow, input handling, and persistence.
 *
 * Start -> play -> summary. A per-item Leitner record selects one of three
 * stages: ending rule, contextual cloze, or typed form production.
 */
import { announceLive } from '../../lib/aria.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { assetUrl } from '../../lib/paths.js';
import { showReward } from '../../lib/reward.js';
import { clearGameProgress, readGameProgress, writeGameProgress } from '../../lib/storage.js';
import {
  DECKS,
  MAX_BOX,
  ROUND_SIZE,
  STAGES,
  STAGE_LABELS,
  applyResult,
  buildAdaptiveRound,
  buildExplanation,
  buildStemGap,
  buildTask,
  calculateAccuracy,
  countDeckItems,
  describeDeck,
  getDeckInfo,
  isCorrectTaskAnswer,
  normalizeItems,
  normalizeRecords,
  stageForBox,
  xpForAnswer,
} from './logic.js';

const DATA_PATH = 'data/form-factory/items.json';
const GAME_ID = 'form-factory-v3';
const OPTION_KEYS = ['1', '2', '3', '4'];

function defaultProgress() {
  return {
    records: {},
    xp: 0,
    bestStreak: 0,
    roundsPlayed: 0,
    lastAccuracy: 0,
    lastPlayedISO: '',
    deckId: 'all',
  };
}

function readStoredProgress() {
  try {
    const saved = readGameProgress(GAME_ID, defaultProgress());
    return {
      records: normalizeRecords(saved.records),
      xp: toCount(saved.xp),
      bestStreak: toCount(saved.bestStreak),
      roundsPlayed: toCount(saved.roundsPlayed),
      lastAccuracy: toCount(saved.lastAccuracy),
      lastPlayedISO: typeof saved.lastPlayedISO === 'string' ? saved.lastPlayedISO : '',
      deckId: DECKS.some((deck) => deck.id === saved.deckId) ? saved.deckId : 'all',
    };
  } catch (err) {
    console.warn('Unable to read Form Factory v3 progress', err);
    return defaultProgress();
  }
}

function persist(state) {
  try {
    writeGameProgress(GAME_ID, {
      records: state.records,
      xp: state.xp,
      bestStreak: state.bestStreak,
      roundsPlayed: state.roundsPlayed,
      lastAccuracy: state.lastAccuracy,
      lastPlayedISO: state.lastPlayedISO,
      deckId: state.deckId,
    });
  } catch (err) {
    console.warn('Unable to persist Form Factory v3 progress', err);
  }
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
    error: q('#ffv3-error'),
    live: q('#ffv3-live'),
    xp: q('#ffv3-xp'),
    rounds: q('#ffv3-rounds'),
    bestStreak: q('#ffv3-best-streak'),
    dueCount: q('#ffv3-due-count'),
    learningCount: q('#ffv3-learning-count'),
    masteredCount: q('#ffv3-mastered-count'),
    freshCount: q('#ffv3-fresh-count'),
    masteryBar: q('#ffv3-mastery-bar'),
    deckNote: q('#ffv3-deck-note'),
    deckButtons: Array.from(root.querySelectorAll('[data-deck]')),
    deckCounts: {
      core: q('#ffv3-core-count'),
      reflexive: q('#ffv3-reflexive-count'),
      all: q('#ffv3-all-count'),
    },
    reset: q('#ffv3-reset'),
    quit: q('#ffv3-quit'),
    stageLabel: q('#ffv3-stage-label'),
    progressText: q('#ffv3-progress-text'),
    progress: q('#ffv3-progress'),
    progressBar: q('#ffv3-progress-bar'),
    score: q('#ffv3-score'),
    streak: q('#ffv3-streak'),
    deckLabel: q('#ffv3-deck-label'),
    promptLabel: q('#ffv3-prompt-label'),
    prompt: q('#ffv3-prompt'),
    subject: q('#ffv3-subject'),
    verb: q('#ffv3-verb'),
    type: q('#ffv3-type'),
    cloze: q('#ffv3-cloze'),
    clozeBefore: q('#ffv3-cloze-before'),
    clozeGap: q('#ffv3-cloze-gap'),
    clozeAfter: q('#ffv3-cloze-after'),
    options: q('#ffv3-options'),
    builder: q('#ffv3-builder'),
    buildStem: q('#ffv3-build-stem'),
    buildInput: q('#ffv3-build-input'),
    check: q('#ffv3-check'),
    keysHint: q('#ffv3-keys-hint'),
    feedback: q('#ffv3-feedback'),
    feedbackTitle: q('#ffv3-feedback-title'),
    feedbackText: q('#ffv3-feedback-text'),
    next: q('#ffv3-next'),
    ring: q('.ffv3-ring'),
    summaryTitle: q('#ffv3-summary-title'),
    summaryMessage: q('#ffv3-summary-message'),
    summaryAccuracy: q('#ffv3-summary-accuracy'),
    summaryScore: q('#ffv3-summary-score'),
    summaryXp: q('#ffv3-summary-xp'),
    summaryStreak: q('#ffv3-summary-streak'),
    summaryMastered: q('#ffv3-summary-mastered'),
    review: q('#ffv3-review'),
    replay: q('#ffv3-replay'),
    changeDeck: q('#ffv3-change-deck'),
  };
}

function initFormFactoryV3(root) {
  const els = getElements(root);
  const stored = readStoredProgress();
  const state = {
    ...stored,
    screen: 'start',
    items: [],
    queue: [],
    retried: new Set(),
    reviewed: new Map(),
    current: null,
    task: null,
    total: 0,
    answered: 0,
    correct: 0,
    streak: 0,
    roundBestStreak: 0,
    roundXp: 0,
    locked: true,
    roundActive: false,
  };

  bindControls(els, state);
  renderStart(els, state);
  showScreen(els, state, 'start');
  showLoading('Ielādē Form Factory v3 datus...');

  fetch(assetUrl(DATA_PATH), { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${DATA_PATH}: ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      state.items = normalizeItems(payload);
      if (!state.items.length) throw new Error('Form Factory v3 data has no usable items.');
      state.locked = false;
      renderStart(els, state);
    })
    .catch((err) => {
      console.error(err);
      showError(els, 'Neizdevās ielādēt datus. Pārbaudi savienojumu un mēģini vēlreiz.');
    })
    .finally(() => hideLoading());

  window.render_game_to_text = () => renderGameToText(state);
  window.advanceTime = () => renderGameToText(state);
}

function bindControls(els, state) {
  els.deckButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (!state.items.length) return;
      startRound(els, state, button.dataset.deck || 'all');
    });
  });
  els.quit?.addEventListener('click', () => quitRound(els, state));
  els.next?.addEventListener('click', () => nextTask(els, state));
  els.replay?.addEventListener('click', () => startRound(els, state, state.deckId));
  els.changeDeck?.addEventListener('click', () => {
    renderStart(els, state);
    showScreen(els, state, 'start');
  });
  els.check?.addEventListener('click', () => submitTypedAnswer(els, state));
  els.buildInput?.addEventListener('input', () => {
    els.check.disabled = !els.buildInput.value.trim();
  });
  els.reset?.addEventListener('click', () => resetProgress(els, state));
  document.addEventListener('keydown', (event) => handleKeydown(els, state, event));
}

function startRound(els, state, deckId) {
  hideError(els);
  state.deckId = deckId;
  const round = buildAdaptiveRound(state.items, state.records, {
    deckId,
    size: ROUND_SIZE,
  });
  if (!round.length) {
    showError(els, 'Šai kopai nav derīgu uzdevumu.');
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
  state.roundActive = true;
  persist(state);
  showScreen(els, state, 'play');
  nextTask(els, state);
}

function nextTask(els, state) {
  hideFeedback(els);
  while (state.queue.length) {
    const item = state.queue.shift();
    const stage = stageForBox(state.records[item.id]?.box ?? 0);
    const task = buildTask(item, stage);
    if (task) {
      state.current = item;
      state.task = task;
      state.locked = false;
      renderTask(els, state);
      return;
    }
    state.total = Math.max(1, state.total - 1);
  }
  finishRound(els, state);
}

function renderStart(els, state) {
  const summary = describeDeck(state.items, state.records, { deckId: 'all' });
  setText(els.xp, String(state.xp));
  setText(els.rounds, String(state.roundsPlayed));
  setText(els.bestStreak, String(state.bestStreak));
  setText(els.dueCount, String(summary.due));
  setText(els.learningCount, String(summary.learning));
  setText(els.masteredCount, String(summary.mastered));
  setText(els.freshCount, String(summary.fresh));

  const mastery = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0;
  if (els.masteryBar) els.masteryBar.style.width = `${mastery}%`;
  if (!summary.total) setText(els.deckNote, 'Ielādē divdabju krājumu…');
  else if (summary.due)
    setText(els.deckNote, `${summary.total} formas kavā · ${summary.due} jāatkārto tagad.`);
  else setText(els.deckNote, `${summary.total} formas kavā · apgūti ${mastery}%.`);

  DECKS.forEach((deck) => {
    const target = els.deckCounts[deck.id];
    if (target) setText(target, `${countDeckItems(state.items, deck.id)} formas`);
  });
}

function renderTask(els, state) {
  const { task, current } = state;
  setText(els.stageLabel, STAGE_LABELS[task.stage]);
  setText(els.deckLabel, getDeckInfo(state.deckId).label);
  setText(els.promptLabel, task.promptLabel);
  setText(els.prompt, task.translation ? `${task.prompt} · ${task.translation}` : task.prompt);
  setText(els.subject, task.subject);
  setText(els.verb, current.lemma);
  setText(els.type, task.typeLabel);
  renderCloze(els, current, task);
  updateHud(els, state);

  if (task.stage === STAGES.BUILD) renderBuilder(els, state);
  else renderOptions(els, state);

  setText(
    els.keysHint,
    task.stage === STAGES.BUILD
      ? 'Ieraksti formu un spied Enter'
      : 'Taustiņi 1–4 izvēlas atbildi · Enter turpina',
  );
  announceLive(els.live, `${task.promptLabel}. ${task.prompt}. ${task.subject}.`);
}

function renderCloze(els, item, task) {
  const visible = task.stage !== STAGES.RULE;
  if (els.cloze) els.cloze.hidden = !visible;
  if (!visible) return;
  const cloze = task.cloze || { before: null, after: null };
  setText(els.clozeBefore, cloze.before ?? `${item.subject} …`);
  setText(els.clozeAfter, cloze.after ?? '');
  setText(els.clozeGap, task.stage === STAGES.CLOZE ? buildStemGap(item) : '___');
  els.clozeGap?.classList.remove('is-correct', 'is-wrong');
}

function renderOptions(els, state) {
  els.builder.hidden = true;
  els.options.hidden = false;
  els.options.replaceChildren();
  state.task.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ffv3-option';
    button.dataset.answer = option;
    button.setAttribute('aria-label', option);

    const key = document.createElement('span');
    key.className = 'ffv3-option__key';
    key.textContent = OPTION_KEYS[index] || String(index + 1);
    key.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'ffv3-option__text';
    text.textContent = option;
    button.append(key, text);
    button.addEventListener('click', () => submitChoice(els, state, option, button));
    els.options.append(button);
  });
  els.options.querySelector('button')?.focus({ preventScroll: true });
}

function renderBuilder(els, state) {
  els.options.hidden = true;
  els.options.replaceChildren();
  els.builder.hidden = false;
  setText(els.buildStem, state.task.stem || '—');
  els.buildInput.value = '';
  els.buildInput.disabled = false;
  els.buildInput.setAttribute('aria-invalid', 'false');
  els.check.disabled = true;
  els.buildInput.focus({ preventScroll: true });
}

function submitChoice(els, state, answer, sourceButton) {
  if (state.locked || !state.task) return;
  const correct = isCorrectTaskAnswer(answer, state.task);
  state.locked = true;
  els.options.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
    if (isCorrectTaskAnswer(button.dataset.answer || '', state.task)) {
      button.classList.add('is-correct');
    } else if (button === sourceButton) button.classList.add('is-wrong');
  });
  resolveAnswer(els, state, correct);
}

function submitTypedAnswer(els, state) {
  if (state.locked || state.task?.stage !== STAGES.BUILD) return;
  const answer = els.buildInput.value.trim();
  if (!answer) return;
  const correct = isCorrectTaskAnswer(answer, state.task);
  state.locked = true;
  els.buildInput.disabled = true;
  els.buildInput.setAttribute('aria-invalid', String(!correct));
  els.buildInput.classList.toggle('is-correct', correct);
  els.buildInput.classList.toggle('is-wrong', !correct);
  els.check.disabled = true;
  if (!correct) els.buildInput.value = state.task.answer;
  resolveAnswer(els, state, correct);
}

function resolveAnswer(els, state, correct) {
  const { task, current } = state;
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
    if (!state.retried.has(current.id)) {
      state.retried.add(current.id);
      state.queue.push(current);
      state.total += 1;
    }
  }

  const before = state.records[current.id];
  const after = applyResult(before, correct);
  state.records[current.id] = after;
  state.reviewed.set(current.id, {
    label: `${current.subject} · ${current.answer}`,
    fromBox: before?.box ?? 0,
    toBox: after.box,
  });
  state.lastAccuracy = calculateAccuracy(state.correct, state.answered);
  persist(state);
  updateHud(els, state);
  showFeedback(els, state, correct);
}

function showFeedback(els, state, correct) {
  if (state.task.stage !== STAGES.RULE) {
    setText(els.clozeGap, state.task.answer);
    els.clozeGap?.classList.add(correct ? 'is-correct' : 'is-wrong');
  }
  els.feedback.hidden = false;
  els.feedback.dataset.result = correct ? 'correct' : 'wrong';
  setText(els.feedbackTitle, correct ? 'Pareizi!' : 'Vēl ne gluži');
  setText(els.feedbackText, buildExplanation(state.current, correct));
  setText(els.next, state.queue.length ? 'Tālāk' : 'Pabeigt');
  els.next.focus({ preventScroll: true });
  announceLive(els.live, `${els.feedbackTitle.textContent} ${els.feedbackText.textContent}`);
}

function hideFeedback(els) {
  if (!els.feedback) return;
  els.feedback.hidden = true;
  delete els.feedback.dataset.result;
  els.buildInput?.classList.remove('is-correct', 'is-wrong');
}

function updateHud(els, state) {
  const percent = state.total ? Math.round((state.answered / state.total) * 100) : 0;
  setText(els.progressText, `${state.answered}/${state.total}`);
  setText(els.score, String(state.roundXp));
  setText(els.streak, String(state.streak));
  if (els.progressBar) els.progressBar.style.width = `${percent}%`;
  els.progress?.setAttribute('aria-valuenow', String(percent));
}

function finishRound(els, state) {
  if (!state.roundActive) return;
  state.roundActive = false;
  state.current = null;
  state.task = null;
  state.locked = true;
  state.roundsPlayed += 1;
  state.lastAccuracy = calculateAccuracy(state.correct, state.answered);
  state.lastPlayedISO = new Date().toISOString();
  persist(state);
  renderSummary(els, state);
  renderStart(els, state);
  showScreen(els, state, 'summary');

  showReward({
    title: state.lastAccuracy >= 80 ? 'Lielisks raunds!' : 'Raunds pabeigts',
    detail: `Precizitāte ${state.lastAccuracy}%`,
    tone: state.lastAccuracy >= 80 ? 'success' : 'accent',
    points: state.roundXp,
    pointsLabel: 'XP',
  });
}

function renderSummary(els, state) {
  const summary = describeDeck(state.items, state.records, { deckId: state.deckId });
  if (els.ring) els.ring.style.setProperty('--ffv3-accuracy', String(state.lastAccuracy));
  setText(els.summaryTitle, state.lastAccuracy === 100 ? 'Perfekts raunds' : 'Raunds pabeigts');
  setText(els.summaryMessage, summaryMessage(state.lastAccuracy, summary.due));
  setText(els.summaryAccuracy, `${state.lastAccuracy}%`);
  setText(els.summaryScore, `${state.correct}/${state.answered}`);
  setText(els.summaryXp, `${state.roundXp} XP`);
  setText(els.summaryStreak, String(state.roundBestStreak));
  setText(els.summaryMastered, `${summary.mastered}/${summary.total}`);

  els.review.replaceChildren();
  state.reviewed.forEach((entry) => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'ffv3-review__word';
    label.textContent = entry.label;
    const badge = document.createElement('span');
    badge.className = 'ffv3-review__box';
    badge.dataset.direction = entry.toBox > entry.fromBox ? 'up' : 'down';
    badge.textContent = `${entry.toBox}/${MAX_BOX} līmenis ${
      entry.toBox > entry.fromBox ? '↑' : '↓'
    }`;
    item.append(label, badge);
    els.review.append(item);
  });
}

function summaryMessage(accuracy, due) {
  if (accuracy === 100) return 'Visas formas izveidotas precīzi.';
  if (due) return `${due} formas jau gaida nākamo atkārtojumu.`;
  if (accuracy >= 80) return 'Stabili — nākamajā reizē parādīsies grūtāki posmi.';
  return 'Kļūdas ir ieliktas atkārtojumu rindā.';
}

function quitRound(els, state) {
  state.queue = [];
  state.current = null;
  state.task = null;
  state.roundActive = false;
  renderStart(els, state);
  showScreen(els, state, 'start');
}

function resetProgress(els, state) {
  if (!window.confirm('Notīrīt visu Form Factory v3 progresu?')) return;
  clearGameProgress(GAME_ID);
  const items = state.items;
  Object.assign(state, defaultProgress(), {
    items,
    screen: 'start',
    queue: [],
    retried: new Set(),
    reviewed: new Map(),
    current: null,
    task: null,
    total: 0,
    answered: 0,
    correct: 0,
    streak: 0,
    roundBestStreak: 0,
    roundXp: 0,
    locked: false,
    roundActive: false,
  });
  renderStart(els, state);
  announceLive(els.live, 'Progress notīrīts.');
}

function handleKeydown(els, state, event) {
  if (state.screen !== 'play' || !state.task || event.metaKey || event.ctrlKey || event.altKey)
    return;
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
  if (state.task.stage === STAGES.BUILD && event.key === 'Enter') {
    event.preventDefault();
    submitTypedAnswer(els, state);
    return;
  }
  const index = OPTION_KEYS.indexOf(event.key);
  if (index === -1) return;
  const button = els.options.querySelectorAll('button')[index];
  if (!button) return;
  event.preventDefault();
  button.click();
}

function showScreen(els, state, name) {
  state.screen = name;
  els.root.dataset.activeScreen = name;
  document.body.dataset.ffv3Screen = name;
  Object.entries(els.screens).forEach(([key, section]) => {
    if (section) section.hidden = key !== name;
  });
  if (name !== 'play') hideFeedback(els);
}

function showError(els, message) {
  if (!els.error) return;
  els.error.textContent = message;
  els.error.hidden = false;
}

function hideError(els) {
  if (!els.error) return;
  els.error.textContent = '';
  els.error.hidden = true;
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function renderGameToText(state) {
  const deck = describeDeck(state.items, state.records, { deckId: state.deckId });
  return JSON.stringify({
    game: GAME_ID,
    screen: state.screen,
    deck: state.deckId,
    round: { answered: state.answered, total: state.total, locked: state.locked },
    prompt: state.task
      ? {
          stage: state.task.stage,
          label: state.task.promptLabel,
          lemma: state.task.lemma,
          subject: state.task.subject,
          answer: state.task.answer,
          options: state.task.options || [],
          input: state.task.stage === STAGES.BUILD ? 'typed full form' : 'multiple choice',
        }
      : null,
    score: { xp: state.roundXp, streak: state.streak, accuracy: state.lastAccuracy },
    mastery: deck,
  });
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-form-factory-v3]');
  if (root) initFormFactoryV3(root);
}
