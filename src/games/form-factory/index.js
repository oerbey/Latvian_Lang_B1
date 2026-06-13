/**
 * Form Factory — Latvian adverbial participle practice.
 *
 * Loads prompt data from data/form-factory/items.json and offers two modes:
 * multiple choice recognition and stem + ending construction.
 */
import { hideLoading, showLoading } from '../../lib/loading.js';
import { assetUrl } from '../../lib/paths.js';
import { sanitizeText } from '../../lib/sanitize.js';
import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import { shuffle } from '../../lib/utils.js';

const DATA_PATH = 'data/form-factory/items.json';
const GAME_ID = 'form-factory';
const ROUND_SIZE = 12;
const ENDINGS = ['-dams', '-dama', '-damies', '-damās', '-dami', '-damas'];
const HYPHEN_EDGE_RE = /^[\u2010-\u2015-]+|[\u2010-\u2015-]+$/gu;

const SUBJECT_PROFILES = new Map([
  ['viņš', { gender: 'masculine', number: 'singular' }],
  ['jānis', { gender: 'masculine', number: 'singular' }],
  ['viņa', { gender: 'feminine', number: 'singular' }],
  ['anna', { gender: 'feminine', number: 'singular' }],
  ['viņi', { gender: 'masculine', number: 'plural' }],
  ['mēs', { gender: 'masculine', number: 'plural' }],
  ['jūs', { gender: 'masculine', number: 'plural' }],
  ['viņas', { gender: 'feminine', number: 'plural' }],
]);

function subjectKey(subject) {
  return normalizeAnswer(typeof subject === 'string' ? subject : subject?.label);
}

function getSubjectProfile(subject) {
  if (subject && typeof subject === 'object') {
    const gender = subject.gender === 'feminine' ? 'feminine' : 'masculine';
    const number = subject.number === 'plural' ? 'plural' : 'singular';
    return { gender, number };
  }
  return SUBJECT_PROFILES.get(subjectKey(subject)) || null;
}

export function getRequiredEnding(subject, reflexive) {
  const profile = getSubjectProfile(subject);
  if (!profile) return '';
  if (reflexive) {
    return profile.gender === 'feminine' ? '-damās' : '-damies';
  }
  if (profile.number === 'plural') {
    return profile.gender === 'feminine' ? '-damas' : '-dami';
  }
  return profile.gender === 'feminine' ? '-dama' : '-dams';
}

export function normalizeAnswer(value) {
  return sanitizeText(value).normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('lv-LV');
}

export function isCorrectAnswer(userAnswer, item) {
  if (!item?.answer) return false;
  return normalizeAnswer(userAnswer) === normalizeAnswer(item.answer);
}

export function buildAnswerFromParts(stemHint, ending) {
  const stem = sanitizeText(stemHint).replace(HYPHEN_EDGE_RE, '');
  const suffix = sanitizeText(ending).replace(HYPHEN_EDGE_RE, '');
  return `${stem}${suffix}`;
}

export function buildChoices(
  item,
  rng = createSeededRng(`${item?.id || ''}:${item?.answer || ''}`),
) {
  if (!isUsableItem(item)) return [];

  const fallbackDistractors = ENDINGS.map((ending) => buildAnswerFromParts(item.stemHint, ending));
  const candidates = [item.answer, ...(item.distractors || []), ...fallbackDistractors];
  const seen = new Set();
  const unique = [];

  candidates.forEach((candidate) => {
    const normalized = normalizeAnswer(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(sanitizeText(candidate));
  });

  return shuffle(unique.slice(0, 4), rng);
}

export function normalizeItems(payload) {
  const items = Array.isArray(payload)
    ? payload
    : [
        ...(Array.isArray(payload?.items) ? payload.items : []),
        ...(Array.isArray(payload?.extensionItems) ? payload.extensionItems : []),
      ];
  if (!Array.isArray(items)) return [];
  return items.filter(isUsableItem).map((item) => ({
    ...item,
    id: sanitizeText(item.id),
    lemma: sanitizeText(item.lemma),
    translation: sanitizeText(item.translation),
    stemHint: sanitizeText(item.stemHint),
    subject: sanitizeText(item.subject),
    answer: sanitizeText(item.answer),
    distractors: item.distractors.map(sanitizeText).filter(Boolean),
    example: sanitizeText(item.example),
    explanation: sanitizeText(item.explanation),
    reflexive: item.reflexive === true,
  }));
}

export function createRoundDeck(items, rng = Math.random, limit = ROUND_SIZE) {
  const usableItems = Array.isArray(items) ? items.filter(isUsableItem) : [];
  if (!usableItems.length) return [];
  const size = Math.max(1, Math.min(limit, usableItems.length));
  return shuffle(usableItems, rng).slice(0, size);
}

function isUsableItem(item) {
  return Boolean(
    item &&
    typeof item === 'object' &&
    sanitizeText(item.id) &&
    sanitizeText(item.lemma) &&
    sanitizeText(item.stemHint) &&
    sanitizeText(item.subject) &&
    sanitizeText(item.answer) &&
    Array.isArray(item.distractors),
  );
}

function createSeededRng(seedText) {
  let seed = 2166136261;
  for (const char of String(seedText)) {
    seed ^= char.codePointAt(0) || 0;
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function endingFromAnswer(item) {
  const answer = normalizeAnswer(item?.answer);
  return ENDINGS.find((ending) => answer.endsWith(normalizeAnswer(ending))) || '';
}

function profileText(subject, mode = 'nominative') {
  const profile = getSubjectProfile(subject);
  if (!profile) return 'subjekta forma';
  const singular = profile.number === 'singular';
  if (profile.gender === 'feminine') {
    return singular
      ? mode === 'genitive'
        ? 'sieviešu dzimtes vienskaitļa'
        : 'sieviešu dzimte, vienskaitlis'
      : mode === 'genitive'
        ? 'sieviešu dzimtes daudzskaitļa'
        : 'sieviešu dzimte, daudzskaitlis';
  }
  return singular
    ? mode === 'genitive'
      ? 'vīriešu dzimtes vienskaitļa'
      : 'vīriešu dzimte, vienskaitlis'
    : mode === 'genitive'
      ? 'vīriešu vai jauktās dzimtes daudzskaitļa'
      : 'vīriešu vai jaukta dzimte, daudzskaitlis';
}

function buildFeedback(item, correct) {
  const ending = getRequiredEnding(item.subject, item.reflexive) || endingFromAnswer(item);
  const verbType = item.reflexive
    ? 'atgriezenisks darbības vārds'
    : 'neatgriezenisks darbības vārds';
  if (correct) {
    return `Pareizi! ${capitalize(item.subject)} = ${profileText(item.subject)}; ${verbType} → ${ending}.`;
  }
  return `Gandrīz. “${capitalize(item.subject)}” prasa ${profileText(item.subject, 'genitive')} formu: ${ending}.`;
}

function capitalize(value) {
  const text = sanitizeText(value);
  if (!text) return '';
  return text.charAt(0).toLocaleUpperCase('lv-LV') + text.slice(1);
}

async function loadFormFactoryData() {
  const response = await fetch(assetUrl(DATA_PATH), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${DATA_PATH}: ${response.status}`);
  }
  return response.json();
}

function readStoredProgress() {
  try {
    const progress = readGameProgress(GAME_ID, {
      bestScore: 0,
      bestStreak: 0,
      lastAccuracy: 0,
      lastPlayedISO: null,
    });
    return {
      bestScore: Number.isFinite(progress.bestScore) ? progress.bestScore : 0,
      bestStreak: Number.isFinite(progress.bestStreak) ? progress.bestStreak : 0,
      lastAccuracy: Number.isFinite(progress.lastAccuracy) ? progress.lastAccuracy : 0,
      lastPlayedISO: typeof progress.lastPlayedISO === 'string' ? progress.lastPlayedISO : null,
    };
  } catch (err) {
    console.warn('Unable to read Form Factory progress', err);
    return { bestScore: 0, bestStreak: 0, lastAccuracy: 0, lastPlayedISO: null };
  }
}

function persistProgress(state) {
  try {
    writeGameProgress(GAME_ID, {
      bestScore: state.bestScore,
      bestStreak: state.bestStreak,
      lastAccuracy: calculateAccuracy(state),
      lastPlayedISO: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Unable to persist Form Factory progress', err);
  }
}

function calculateAccuracy(state) {
  if (!state.answered) return 0;
  return Math.round((state.correct / state.answered) * 100);
}

function getElements(root) {
  return {
    root,
    modeChoice: root.querySelector('#ff-mode-choice'),
    modeBuild: root.querySelector('#ff-mode-build'),
    modeChoiceLabel: root.querySelector('label[for="ff-mode-choice"]'),
    modeBuildLabel: root.querySelector('label[for="ff-mode-build"]'),
    score: root.querySelector('#ff-score'),
    streak: root.querySelector('#ff-streak'),
    accuracy: root.querySelector('#ff-accuracy'),
    progress: root.querySelector('#ff-progress'),
    best: root.querySelector('#ff-best'),
    error: root.querySelector('#ff-error'),
    restart: root.querySelector('#ff-restart'),
    next: root.querySelector('#ff-next'),
    roundHint: root.querySelector('#ff-round-hint'),
    reflexiveBadge: root.querySelector('#ff-reflexive-badge'),
    lemma: root.querySelector('#ff-lemma'),
    translation: root.querySelector('#ff-translation'),
    subject: root.querySelector('#ff-subject'),
    subjectMeta: root.querySelector('#ff-subject-meta'),
    choices: root.querySelector('#ff-choices'),
    feedback: root.querySelector('#ff-feedback'),
    example: root.querySelector('#ff-example'),
    choicePanel: root.querySelector('[data-ff-mode-panel="choice"]'),
    buildPanel: root.querySelector('[data-ff-mode-panel="build"]'),
    buildTarget: root.querySelector('#ff-build-target'),
    stem: root.querySelector('#ff-stem'),
    selectedEnding: root.querySelector('#ff-selected-ending'),
    input: root.querySelector('#ff-answer-input'),
    endings: root.querySelector('#ff-endings'),
    checkBuild: root.querySelector('#ff-check-build'),
  };
}

function initFormFactory(root) {
  const els = getElements(root);
  const stored = readStoredProgress();
  const state = {
    items: [],
    deck: [],
    index: 0,
    mode: 'choice',
    score: 0,
    streak: 0,
    correct: 0,
    answered: 0,
    locked: true,
    current: null,
    selectedEnding: '',
    bestScore: stored.bestScore,
    bestStreak: stored.bestStreak,
  };

  bindControls(els, state);
  syncModeControls(els, state);
  updateHud(els, state);
  setFeedback(els, 'Dati tiek ielādēti...', 'info');
  showLoading('Loading Form Factory data...');

  loadFormFactoryData()
    .then((payload) => {
      const items = normalizeItems(payload);
      if (!items.length) {
        throw new Error('Form Factory data has no usable items.');
      }
      state.items = items;
      state.locked = false;
      startRound(els, state);
    })
    .catch((err) => {
      console.error(err);
      showError(
        els,
        'Neizdevās ielādēt Form Factory datus. Pārbaudi savienojumu un mēģini vēlreiz.',
      );
      setFeedback(els, 'Datu ielāde neizdevās.', 'wrong');
    })
    .finally(() => hideLoading());

  window.render_game_to_text = () => renderGameToText(state);
  window.advanceTime = () => renderGameToText(state);
}

function bindControls(els, state) {
  els.modeChoice?.addEventListener('change', () => setMode(els, state, 'choice'));
  els.modeBuild?.addEventListener('change', () => setMode(els, state, 'build'));
  els.restart?.addEventListener('click', () => startRound(els, state));
  els.next?.addEventListener('click', () => {
    if (state.index >= state.deck.length - 1) {
      finishRound(els, state);
      return;
    }
    state.index += 1;
    renderCurrentRound(els, state);
  });
  els.checkBuild?.addEventListener('click', () => submitBuildAnswer(els, state));
  els.input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitBuildAnswer(els, state);
    }
  });
  els.buildTarget?.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  els.buildTarget?.addEventListener('drop', (event) => {
    event.preventDefault();
    const ending = event.dataTransfer?.getData('text/plain') || '';
    selectEnding(els, state, ending);
  });
  document.addEventListener('keydown', (event) => {
    if (state.mode !== 'choice' || state.locked || isInteractiveTarget(event.target)) return;
    if (!['1', '2', '3', '4'].includes(event.key)) return;
    const button = els.choices?.querySelectorAll('button')[Number(event.key) - 1];
    if (!button) return;
    event.preventDefault();
    submitAnswer(els, state, button.dataset.answer || button.textContent || '', button);
  });
}

function setMode(els, state, mode) {
  state.mode = mode === 'build' ? 'build' : 'choice';
  syncModeControls(els, state);
  if (els.choicePanel) els.choicePanel.hidden = state.mode !== 'choice';
  if (els.buildPanel) els.buildPanel.hidden = state.mode !== 'build';
  renderAnswerArea(els, state);
}

function syncModeControls(els, state) {
  const choiceActive = state.mode === 'choice';
  if (els.modeChoice) els.modeChoice.checked = choiceActive;
  if (els.modeBuild) els.modeBuild.checked = !choiceActive;
  els.modeChoiceLabel?.classList.toggle('is-active', choiceActive);
  els.modeBuildLabel?.classList.toggle('is-active', !choiceActive);
}

function startRound(els, state) {
  hideError(els);
  state.deck = createRoundDeck(state.items);
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.correct = 0;
  state.answered = 0;
  state.locked = false;
  state.current = null;
  state.selectedEnding = '';
  if (!state.deck.length) {
    showError(els, 'Nav derīgu Form Factory uzdevumu.');
    return;
  }
  renderCurrentRound(els, state);
}

function renderCurrentRound(els, state) {
  const item = state.deck[state.index];
  state.current = item || null;
  state.locked = false;
  state.selectedEnding = '';
  updateHud(els, state);

  if (!item) {
    finishRound(els, state);
    return;
  }

  setText(els.roundHint, `Izvēlies formu ${state.index + 1}. uzdevumam no ${state.deck.length}.`);
  setText(els.lemma, item.lemma);
  setText(els.translation, item.translation ? `(${item.translation})` : '');
  setText(els.subject, item.subject);
  setText(els.subjectMeta, profileText(item.subject));
  setText(els.reflexiveBadge, item.reflexive ? 'atgriezenisks' : 'neatgriezenisks');
  setText(els.example, item.example || '—');
  setFeedback(els, 'Izvēlies atbildi, lai sāktu.', 'info');
  if (els.next) {
    els.next.disabled = true;
    els.next.textContent =
      state.index >= state.deck.length - 1 ? 'Pabeigt raundu' : 'Nākamais uzdevums';
  }
  renderAnswerArea(els, state);
}

function renderAnswerArea(els, state) {
  if (state.mode === 'choice') {
    renderChoices(els, state);
  } else {
    renderBuildMode(els, state);
  }
}

function renderChoices(els, state) {
  if (!els.choices) return;
  els.choices.replaceChildren();
  const item = state.current;
  if (!item) return;
  buildChoices(item).forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ff-choice';
    button.dataset.answer = choice;
    button.textContent = choice;
    button.setAttribute('aria-label', choice);
    button.addEventListener('click', () => submitAnswer(els, state, choice, button));
    els.choices.appendChild(button);
  });
  requestAnimationFrame(() => els.choices?.querySelector('button')?.focus());
}

function renderBuildMode(els, state) {
  const item = state.current;
  if (!item) return;
  setText(els.stem, item.stemHint);
  setText(els.selectedEnding, '?');
  if (els.input) {
    els.input.value = '';
    els.input.disabled = state.locked;
    els.input.removeAttribute('aria-invalid');
    els.input.classList.remove('is-correct', 'is-wrong');
  }
  if (els.checkBuild) els.checkBuild.disabled = state.locked;
  if (!els.endings) return;
  els.endings.replaceChildren();
  ENDINGS.forEach((ending) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ff-ending-tile';
    button.draggable = true;
    button.textContent = ending;
    button.dataset.ending = ending;
    button.addEventListener('click', () => selectEnding(els, state, ending));
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', ending);
    });
    els.endings.appendChild(button);
  });
}

function selectEnding(els, state, ending) {
  if (state.locked || !ENDINGS.includes(ending) || !state.current) return;
  state.selectedEnding = ending;
  setText(els.selectedEnding, ending);
  if (els.input) {
    els.input.value = buildAnswerFromParts(state.current.stemHint, ending);
    els.input.focus();
  }
  els.endings?.querySelectorAll('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.ending === ending));
  });
}

function submitBuildAnswer(els, state) {
  if (state.locked) return;
  const value = els.input?.value || '';
  if (!normalizeAnswer(value)) {
    setFeedback(els, 'Ieraksti vai saliec atbildi.', 'wrong');
    els.input?.setAttribute('aria-invalid', 'true');
    return;
  }
  submitAnswer(els, state, value);
}

function submitAnswer(els, state, answer, sourceButton = null) {
  const item = state.current;
  if (!item || state.locked) return;
  const correct = isCorrectAnswer(answer, item);
  state.locked = true;
  state.answered += 1;

  if (correct) {
    state.score += 1;
    state.correct += 1;
    state.streak += 1;
  } else {
    state.streak = 0;
  }

  state.bestScore = Math.max(state.bestScore, state.score);
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  persistProgress(state);
  updateHud(els, state);
  setFeedback(els, buildFeedback(item, correct), correct ? 'right' : 'wrong');
  lockAnswerControls(els, state, answer, sourceButton);
  if (els.next) els.next.disabled = false;
}

function lockAnswerControls(els, state, answer, sourceButton) {
  els.choices?.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
    const buttonCorrect = isCorrectAnswer(
      button.dataset.answer || button.textContent || '',
      state.current,
    );
    if (buttonCorrect) button.classList.add('is-correct');
    if (button === sourceButton && !buttonCorrect) button.classList.add('is-wrong');
  });
  if (state.mode === 'build' && els.input) {
    const correct = isCorrectAnswer(answer, state.current);
    els.input.disabled = true;
    els.input.setAttribute('aria-invalid', String(!correct));
    els.input.classList.toggle('is-correct', correct);
    els.input.classList.toggle('is-wrong', !correct);
  }
  if (els.checkBuild) els.checkBuild.disabled = true;
  els.endings?.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
}

function finishRound(els, state) {
  state.locked = true;
  state.current = null;
  setText(els.roundHint, 'Raunds pabeigts.');
  setText(els.lemma, 'Raunds pabeigts');
  setText(els.translation, '');
  setText(els.subject, `${state.score}/${state.deck.length}`);
  setText(els.subjectMeta, `Precizitāte: ${calculateAccuracy(state)}%`);
  setText(els.example, 'Spied “Sākt no jauna”, lai sajauktu uzdevumus vēlreiz.');
  setFeedback(els, `Raunds pabeigts: ${state.score} pareizi no ${state.deck.length}.`, 'info');
  if (els.next) els.next.disabled = true;
  els.choices?.replaceChildren();
  if (els.input) els.input.value = '';
  setText(els.selectedEnding, '?');
  updateHud(els, state);
}

function updateHud(els, state) {
  setText(els.score, String(state.score));
  setText(els.streak, String(state.streak));
  setText(els.accuracy, `${calculateAccuracy(state)}%`);
  const total = state.deck.length || state.items.length || 0;
  const current = state.current ? Math.min(state.index + 1, total) : state.answered;
  setText(els.progress, `${current}/${total}`);
  setText(els.best, `Labākais rezultāts: ${state.bestScore}; labākā sērija: ${state.bestStreak}`);
}

function setFeedback(els, message, tone) {
  if (!els.feedback) return;
  els.feedback.textContent = message;
  els.feedback.dataset.tone = tone;
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

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('button, input, select, textarea, a, [contenteditable="true"]'));
}

function renderGameToText(state) {
  const item = state.current;
  return JSON.stringify({
    game: 'form-factory',
    mode: state.mode,
    round: {
      index: state.current ? state.index + 1 : state.answered,
      total: state.deck.length,
      locked: state.locked,
    },
    prompt: item
      ? {
          lemma: item.lemma,
          subject: item.subject,
          reflexive: item.reflexive,
          answer: item.answer,
        }
      : null,
    score: state.score,
    streak: state.streak,
    accuracy: calculateAccuracy(state),
  });
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-form-factory]');
  if (root) {
    initFormFactory(root);
  }
}
