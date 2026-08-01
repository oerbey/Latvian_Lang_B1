/**
 * Form Factory v2 — mobile-first cloze practice for Latvian divdabji.
 *
 * Screen flow: start (deck picker) → play (cloze card + answer chips) →
 * summary. Reuses data/form-factory/items.json; all game rules live in
 * logic.js so they stay unit-testable.
 */
import { hideLoading, showLoading } from '../../lib/loading.js';
import { assetUrl } from '../../lib/paths.js';
import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import {
  buildExplanation,
  buildOptions,
  calculateAccuracy,
  createDeck,
  isCorrectAnswer,
  makeCloze,
  normalizeItems,
} from './logic.js';

const DATA_PATH = 'data/form-factory/items.json';
const GAME_ID = 'form-factory-v2';
const ROUND_SIZE = 10;

function readStoredBest() {
  try {
    const progress = readGameProgress(GAME_ID, { bestScore: 0, bestStreak: 0 });
    return {
      bestScore: Number.isFinite(progress.bestScore) ? progress.bestScore : 0,
      bestStreak: Number.isFinite(progress.bestStreak) ? progress.bestStreak : 0,
    };
  } catch {
    return { bestScore: 0, bestStreak: 0 };
  }
}

function persistBest(state) {
  try {
    writeGameProgress(GAME_ID, {
      bestScore: state.bestScore,
      bestStreak: state.bestStreak,
      lastAccuracy: calculateAccuracy(state.correct, state.answered),
      lastPlayedISO: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Unable to persist Form Factory v2 progress', err);
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
    error: q('#ffv2-error'),
    deckButtons: Array.from(root.querySelectorAll('[data-deck]')),
    startBest: q('#ffv2-start-best'),
    progressBar: q('#ffv2-progress-bar'),
    progressText: q('#ffv2-progress-text'),
    streak: q('#ffv2-streak'),
    score: q('#ffv2-score'),
    subjectChip: q('#ffv2-subject-chip'),
    verbChip: q('#ffv2-verb-chip'),
    reflexChip: q('#ffv2-reflex-chip'),
    clozeBefore: q('#ffv2-cloze-before'),
    clozeGap: q('#ffv2-cloze-gap'),
    clozeAfter: q('#ffv2-cloze-after'),
    options: q('#ffv2-options'),
    feedback: q('#ffv2-feedback'),
    feedbackText: q('#ffv2-feedback-text'),
    next: q('#ffv2-next'),
    quit: q('#ffv2-quit'),
    summaryScore: q('#ffv2-summary-score'),
    summaryAccuracy: q('#ffv2-summary-accuracy'),
    summaryStreak: q('#ffv2-summary-streak'),
    summaryBest: q('#ffv2-summary-best'),
    summaryMessage: q('#ffv2-summary-message'),
    replay: q('#ffv2-replay'),
    changeDeck: q('#ffv2-change-deck'),
  };
}

function initFormFactoryV2(root) {
  const els = getElements(root);
  const stored = readStoredBest();
  const state = {
    items: [],
    deck: [],
    index: 0,
    score: 0,
    streak: 0,
    roundBestStreak: 0,
    correct: 0,
    answered: 0,
    locked: true,
    current: null,
    deckFilter: 'all',
    bestScore: stored.bestScore,
    bestStreak: stored.bestStreak,
  };

  bindControls(els, state);
  renderStartBest(els, state);
  showScreen(els, 'start');
  showLoading('Loading Form Factory v2 data...');

  fetch(assetUrl(DATA_PATH), { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${DATA_PATH}: ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const items = normalizeItems(payload);
      if (!items.length) throw new Error('Form Factory v2 data has no usable items.');
      state.items = items;
      state.locked = false;
      els.deckButtons.forEach((button) => {
        button.disabled = false;
      });
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
    button.disabled = true;
    button.addEventListener('click', () => {
      if (!state.items.length) return;
      state.deckFilter = button.dataset.deck || 'all';
      startRound(els, state);
    });
  });
  els.next?.addEventListener('click', () => advance(els, state));
  els.quit?.addEventListener('click', () => {
    showScreen(els, 'start');
    renderStartBest(els, state);
  });
  els.replay?.addEventListener('click', () => startRound(els, state));
  els.changeDeck?.addEventListener('click', () => {
    showScreen(els, 'start');
    renderStartBest(els, state);
  });
  document.addEventListener('keydown', (event) => {
    if (state.locked || !state.current) return;
    if (!['1', '2', '3', '4'].includes(event.key)) return;
    if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
    const button = els.options?.querySelectorAll('button')[Number(event.key) - 1];
    if (button && !button.disabled) {
      event.preventDefault();
      button.click();
    }
  });
}

function startRound(els, state) {
  hideError(els);
  state.deck = createDeck(state.items, { levelFilter: state.deckFilter, size: ROUND_SIZE });
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
  showScreen(els, 'play');
  renderQuestion(els, state);
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
  setText(els.subjectChip, item.subject);
  setText(els.verbChip, `${item.lemma}${item.translation ? ` · ${item.translation}` : ''}`);
  setText(els.reflexChip, item.reflexive ? 'atgriezenisks' : 'neatgriezenisks');

  const cloze = makeCloze(item);
  if (cloze.before !== null) {
    setText(els.clozeBefore, cloze.before);
    setText(els.clozeAfter, cloze.after);
  } else {
    setText(els.clozeBefore, `${item.subject} …`);
    setText(els.clozeAfter, '');
  }
  setText(els.clozeGap, item.stemHint.replace(/-+$/u, '') + '___');
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
    button.className = 'ffv2-option';
    button.dataset.answer = option;
    const key = document.createElement('span');
    key.className = 'ffv2-option__key';
    key.textContent = String(index + 1);
    key.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'ffv2-option__label';
    label.textContent = option;
    button.append(key, label);
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
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  persistBest(state);
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
  setText(els.summaryScore, `${state.score}/${state.deck.length}`);
  setText(els.summaryAccuracy, `${accuracy}%`);
  setText(els.summaryStreak, String(state.roundBestStreak));
  setText(els.summaryBest, String(state.bestScore));
  setText(els.summaryMessage, summaryMessage(accuracy));
  showScreen(els, 'summary');
}

function summaryMessage(accuracy) {
  if (accuracy === 100) return 'Perfekti! Visas divdabju formas pareizas.';
  if (accuracy >= 80) return 'Lieliski! Vēl nedaudz, un būs perfekti.';
  if (accuracy >= 50) return 'Labi! Atkārto atgriezeniskās formas un mēģini vēlreiz.';
  return 'Turpini trenēties — atceries: -dams (viņš), -dama (viņa), -damies/-damās (refleksīvie).';
}

function updateHud(els, state) {
  const total = state.deck.length || 1;
  const position = Math.min(state.index + 1, total);
  setText(els.progressText, `${position}/${total}`);
  setText(els.score, String(state.score));
  setText(els.streak, state.streak > 1 ? `×${state.streak}` : '—');
  if (els.progressBar) {
    const percent = Math.round((state.answered / total) * 100);
    els.progressBar.style.width = `${percent}%`;
    els.progressBar.parentElement?.setAttribute('aria-valuenow', String(percent));
  }
}

function renderStartBest(els, state) {
  setText(
    els.startBest,
    state.bestScore || state.bestStreak
      ? `Labākais rezultāts: ${state.bestScore} · Labākā sērija: ${state.bestStreak}`
      : 'Spēlē pirmo raundu, lai sāktu krāt rezultātus.',
  );
}

function showScreen(els, name) {
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

function renderGameToText(state) {
  return JSON.stringify({
    game: GAME_ID,
    deck: state.deckFilter,
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
  const root = document.querySelector('[data-form-factory-v2]');
  if (root) initFormFactoryV2(root);
}
