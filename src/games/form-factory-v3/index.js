/**
 * Form Factory v3 — mobile-first participle form practice.
 *
 * Screen flow: deck picker -> focused cloze round -> summary. The shared
 * dataset stays in data/form-factory/items.json.
 */
import { hideLoading, showLoading } from '../../lib/loading.js';
import { assetUrl } from '../../lib/paths.js';
import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import {
  DECKS,
  buildExplanation,
  buildOptions,
  buildStemGap,
  calculateAccuracy,
  countDeckItems,
  createDeck,
  getAnswerEnding,
  getDeckInfo,
  isCorrectAnswer,
  makeCloze,
  normalizeItems,
} from './logic.js';

const DATA_PATH = 'data/form-factory/items.json';
const GAME_ID = 'form-factory-v3';
const ROUND_SIZE = 12;

function readStoredProgress() {
  try {
    const progress = readGameProgress(GAME_ID, {
      bestScore: 0,
      bestStreak: 0,
      roundsPlayed: 0,
      lastAccuracy: 0,
    });
    return {
      bestScore: asFiniteNumber(progress.bestScore),
      bestStreak: asFiniteNumber(progress.bestStreak),
      roundsPlayed: asFiniteNumber(progress.roundsPlayed),
      lastAccuracy: asFiniteNumber(progress.lastAccuracy),
    };
  } catch {
    return { bestScore: 0, bestStreak: 0, roundsPlayed: 0, lastAccuracy: 0 };
  }
}

function persistProgress(state, { roundFinished = false } = {}) {
  try {
    const lastAccuracy = calculateAccuracy(state.correct, state.answered);
    writeGameProgress(GAME_ID, {
      bestScore: state.bestScore,
      bestStreak: state.bestStreak,
      roundsPlayed: state.roundsPlayed + (roundFinished ? 1 : 0),
      lastAccuracy,
      lastPlayedISO: new Date().toISOString(),
    });
    if (roundFinished) state.roundsPlayed += 1;
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
    deckButtons: Array.from(root.querySelectorAll('[data-deck]')),
    bestLine: q('#ffv3-best-line'),
    roundsLine: q('#ffv3-rounds-line'),
    deckCounts: {
      core: q('#ffv3-core-count'),
      reflexive: q('#ffv3-reflexive-count'),
      all: q('#ffv3-all-count'),
    },
    quit: q('#ffv3-quit'),
    progressText: q('#ffv3-progress-text'),
    progressBar: q('#ffv3-progress-bar'),
    score: q('#ffv3-score'),
    streak: q('#ffv3-streak'),
    deckLabel: q('#ffv3-deck-label'),
    subject: q('#ffv3-subject'),
    verb: q('#ffv3-verb'),
    type: q('#ffv3-type'),
    clozeBefore: q('#ffv3-cloze-before'),
    clozeGap: q('#ffv3-cloze-gap'),
    clozeAfter: q('#ffv3-cloze-after'),
    options: q('#ffv3-options'),
    feedback: q('#ffv3-feedback'),
    feedbackTitle: q('#ffv3-feedback-title'),
    feedbackText: q('#ffv3-feedback-text'),
    next: q('#ffv3-next'),
    summaryTitle: q('#ffv3-summary-title'),
    summaryMessage: q('#ffv3-summary-message'),
    summaryAccuracy: q('#ffv3-summary-accuracy'),
    summaryScore: q('#ffv3-summary-score'),
    summaryStreak: q('#ffv3-summary-streak'),
    summaryBest: q('#ffv3-summary-best'),
    replay: q('#ffv3-replay'),
    changeDeck: q('#ffv3-change-deck'),
  };
}

function initFormFactoryV3(root) {
  const els = getElements(root);
  const stored = readStoredProgress();
  const state = {
    screen: 'start',
    items: [],
    deck: [],
    deckId: 'all',
    index: 0,
    score: 0,
    streak: 0,
    roundBestStreak: 0,
    correct: 0,
    answered: 0,
    locked: true,
    current: null,
    bestScore: stored.bestScore,
    bestStreak: stored.bestStreak,
    roundsPlayed: stored.roundsPlayed,
    lastAccuracy: stored.lastAccuracy,
  };

  bindControls(els, state);
  renderStart(els, state);
  showScreen(els, state, 'start');
  showLoading('Loading Form Factory v3 data...');

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
  els.quit?.addEventListener('click', () => {
    state.current = null;
    state.locked = false;
    renderStart(els, state);
    showScreen(els, state, 'start');
  });
  els.next?.addEventListener('click', () => advance(els, state));
  els.replay?.addEventListener('click', () => startRound(els, state, state.deckId));
  els.changeDeck?.addEventListener('click', () => {
    renderStart(els, state);
    showScreen(els, state, 'start');
  });
  document.addEventListener('keydown', (event) => {
    if (state.locked || state.screen !== 'play' || !state.current) return;
    if (!['1', '2', '3', '4'].includes(event.key)) return;
    if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
    const button = els.options?.querySelectorAll('button')[Number(event.key) - 1];
    if (button && !button.disabled) {
      event.preventDefault();
      button.click();
    }
  });
}

function startRound(els, state, deckId) {
  hideError(els);
  state.deckId = deckId;
  state.deck = createDeck(state.items, { deckId, size: ROUND_SIZE });
  if (!state.deck.length) {
    showError(els, 'Šai kopai nav derīgu uzdevumu.');
    return;
  }
  state.index = 0;
  state.score = 0;
  state.streak = 0;
  state.roundBestStreak = 0;
  state.correct = 0;
  state.answered = 0;
  state.locked = false;
  showScreen(els, state, 'play');
  renderQuestion(els, state);
}

function renderStart(els, state) {
  setText(
    els.bestLine,
    state.bestScore || state.bestStreak
      ? `Labākais rezultāts ${state.bestScore} · sērija ${state.bestStreak}`
      : 'Sāc pirmo raundu un saglabā savu labāko sēriju.',
  );
  setText(
    els.roundsLine,
    state.roundsPlayed
      ? `Pēdējā precizitāte ${state.lastAccuracy}% · raundi ${state.roundsPlayed}`
      : '12 īsi jautājumi vienā raundā.',
  );
  DECKS.forEach((deck) => {
    const target = els.deckCounts[deck.id];
    if (target) setText(target, `${countDeckItems(state.items, deck.id)} formas`);
  });
}

function renderQuestion(els, state) {
  const item = state.deck[state.index];
  state.current = item || null;
  state.locked = false;
  if (!item) {
    finishRound(els, state);
    return;
  }

  updateHud(els, state);
  setText(els.deckLabel, getDeckInfo(state.deckId).label);
  setText(els.subject, item.subject);
  setText(els.verb, item.translation ? `${item.lemma} · ${item.translation}` : item.lemma);
  setText(els.type, item.reflexive ? 'atgriezenisks' : 'neatgriezenisks');

  const cloze = makeCloze(item);
  if (cloze.before !== null) {
    setText(els.clozeBefore, cloze.before);
    setText(els.clozeAfter, cloze.after);
  } else {
    setText(els.clozeBefore, `${item.subject} …`);
    setText(els.clozeAfter, '');
  }
  setText(els.clozeGap, buildStemGap(item));
  els.clozeGap?.classList.remove('is-correct', 'is-wrong');

  if (els.feedback) els.feedback.hidden = true;
  renderOptions(els, state);
}

function renderOptions(els, state) {
  if (!els.options || !state.current) return;
  els.options.replaceChildren();
  buildOptions(state.current).forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ffv3-option';
    button.dataset.answer = option;

    const key = document.createElement('span');
    key.className = 'ffv3-option__key';
    key.textContent = String(index + 1);
    key.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'ffv3-option__label';
    label.textContent = option;

    const ending = document.createElement('span');
    ending.className = 'ffv3-option__ending';
    ending.textContent = getAnswerEnding(option) || '';

    button.append(key, label, ending);
    button.addEventListener('click', () => submitAnswer(els, state, option, button));
    els.options.appendChild(button);
  });
}

function submitAnswer(els, state, answer, sourceButton) {
  const item = state.current;
  if (!item || state.locked) return;
  const correct = isCorrectAnswer(answer, item);
  state.locked = true;
  state.answered += 1;
  if (correct) {
    state.score += 1;
    state.correct += 1;
    state.streak += 1;
    state.roundBestStreak = Math.max(state.roundBestStreak, state.streak);
  } else {
    state.streak = 0;
  }
  state.bestScore = Math.max(state.bestScore, state.score);
  state.bestStreak = Math.max(state.bestStreak, state.roundBestStreak);
  persistProgress(state);
  updateHud(els, state);

  els.options?.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
    if (isCorrectAnswer(button.dataset.answer || '', item)) button.classList.add('is-correct');
    else if (button === sourceButton) button.classList.add('is-wrong');
  });

  setText(els.clozeGap, item.answer);
  els.clozeGap?.classList.add(correct ? 'is-correct' : 'is-wrong');

  if (els.feedback) {
    els.feedback.hidden = false;
    els.feedback.dataset.tone = correct ? 'right' : 'wrong';
  }
  setText(els.feedbackTitle, correct ? 'Pareizi!' : 'Jāpārskata');
  setText(els.feedbackText, buildExplanation(item, correct));
  if (els.next) {
    els.next.textContent = state.index >= state.deck.length - 1 ? 'Rezultāti' : 'Tālāk';
    requestAnimationFrame(() => els.next.focus());
  }
}

function advance(els, state) {
  if (state.index >= state.deck.length - 1) {
    finishRound(els, state);
    return;
  }
  state.index += 1;
  renderQuestion(els, state);
}

function finishRound(els, state) {
  state.current = null;
  state.locked = true;
  const accuracy = calculateAccuracy(state.correct, state.answered);
  persistProgress(state, { roundFinished: true });
  setText(els.summaryTitle, accuracy === 100 ? 'Perfekts raunds' : 'Raunds pabeigts');
  setText(els.summaryMessage, summaryMessage(accuracy));
  setText(els.summaryAccuracy, `${accuracy}%`);
  setText(els.summaryScore, `${state.score}/${state.deck.length}`);
  setText(els.summaryStreak, String(state.roundBestStreak));
  setText(els.summaryBest, String(state.bestScore));
  showScreen(els, state, 'summary');
}

function updateHud(els, state) {
  const total = state.deck.length || 1;
  const position = Math.min(state.index + 1, total);
  const percent = Math.round((state.answered / total) * 100);
  setText(els.progressText, `${position}/${total}`);
  setText(els.score, String(state.score));
  setText(els.streak, state.streak > 0 ? `×${state.streak}` : '0');
  if (els.progressBar) {
    els.progressBar.style.width = `${percent}%`;
    els.progressBar.parentElement?.setAttribute('aria-valuenow', String(percent));
  }
}

function summaryMessage(accuracy) {
  if (accuracy === 100) return 'Visas galotnes sakrita ar subjektu un darbības vārda tipu.';
  if (accuracy >= 80) return 'Stabili. Atkārto pāris kļūdas un nākamais raunds būs vieglāks.';
  if (accuracy >= 50) return 'Labs sākums. Skaties, vai darbības vārds ir atgriezenisks.';
  return 'Atceries pamatu: viņš -dams, viņa -dama, atgriezeniskie -damies/-damās.';
}

function showScreen(els, state, name) {
  state.screen = name;
  Object.entries(els.screens).forEach(([key, section]) => {
    if (section) section.hidden = key !== name;
  });
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

function asFiniteNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function renderGameToText(state) {
  return JSON.stringify({
    game: GAME_ID,
    screen: state.screen,
    deck: state.deckId,
    round: {
      index: state.current ? state.index + 1 : state.answered,
      total: state.deck.length,
      locked: state.locked,
    },
    prompt: state.current
      ? {
          lemma: state.current.lemma,
          subject: state.current.subject,
          reflexive: state.current.reflexive,
          answer: state.current.answer,
        }
      : null,
    score: state.score,
    streak: state.streak,
    accuracy: calculateAccuracy(state.correct, state.answered),
  });
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-form-factory-v3]');
  if (root) initFormFactoryV3(root);
}
