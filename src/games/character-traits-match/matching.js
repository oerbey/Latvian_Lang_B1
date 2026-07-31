/**
 * @file character-traits-match/matching.js
 * Initialisation and wiring for the Character Traits Match game.
 *
 * Loads personality-word data, renders optimist/pessimist group
 * progress, and bootstraps the shared matching-game engine
 * with game-specific DOM selectors and callbacks.
 */

import { initMatchingGame, MATCHING_CONSTANTS } from '../../lib/matching-game.js';
import { loadPersonalityWords } from '../../lib/personality-data.js';
import { $id, mustId } from '../../lib/dom.js';

function renderGroupProgress(container, items) {
  if (!container) return;
  const counts = items.reduce(
    (acc, item) => {
      acc[item.group] = (acc[item.group] || 0) + 1;
      return acc;
    },
    { optimists: 0, pesimists: 0, neutral: 0 },
  );
  container.textContent = `Optimisti: ${counts.optimists || 0} • Pesimisti: ${
    counts.pesimists || 0
  } • Neitrāli: ${counts.neutral || 0}`;
}

function renderRoundProgress(elements, payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const score = payload?.score || { right: 0, wrong: 0 };
  const total = items.length;
  const matched = Math.min(score.right || 0, total);
  const percent = total ? Math.round((matched / total) * 100) : 0;

  if (elements.progressText) elements.progressText.textContent = `${matched}/${total}`;
  if (elements.progressBar) elements.progressBar.style.width = `${percent}%`;
  if (elements.progress) elements.progress.setAttribute('aria-valuenow', String(percent));
  if (elements.roundScore) elements.roundScore.textContent = String(matched);
  if (elements.roundMistakes) elements.roundMistakes.textContent = String(score.wrong || 0);
}

function showScreen(elements, screen) {
  if (!elements.screens) return;
  Object.entries(elements.screens).forEach(([name, node]) => {
    if (node) node.hidden = name !== screen;
  });
}

function renderSummary(elements, payload) {
  if (!elements.summary) return;
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const score = payload?.score || { right: 0, wrong: 0 };
  const attempts = (score.right || 0) + (score.wrong || 0);
  const accuracy = attempts ? Math.round((score.right / attempts) * 100) : 0;

  elements.summaryAccuracy.textContent = `${accuracy}%`;
  elements.summaryAccuracyRing.style.setProperty('--traits-accuracy', String(accuracy));
  elements.summaryScore.textContent = `${score.right}/${items.length}`;
  elements.summaryAttempts.textContent = String(attempts);
  elements.summaryMistakes.textContent = String(score.wrong || 0);
  elements.summaryWords.textContent = String(items.length);
  elements.summaryMessage.textContent =
    accuracy >= 90
      ? 'Lieliski! Tu ātri atpazini šī komplekta rakstura īpašības.'
      : 'Labs darbs. Atkārto komplektu vēlreiz, lai nostiprinātu pārus.';

  elements.review.replaceChildren();
  items.forEach((item) => {
    const row = document.createElement('li');
    const pair = document.createElement('span');
    pair.className = 'traits-review__pair';
    pair.textContent = `${item.lv} — ${item.en}`;
    const group = document.createElement('span');
    group.className = 'traits-review__group';
    group.textContent = item.group === 'pesimists' ? 'Pesimisti' : 'Optimisti';
    row.append(pair, group);
    elements.review.appendChild(row);
  });
}

export function initTraitsMatching({ defaultMode = MATCHING_CONSTANTS.MODE_ALL } = {}) {
  const redesigned = Boolean($id('traits-start'));
  const elements = {
    lvList: mustId('list-lv'),
    trList: mustId('list-tr'),
    score: mustId('score'),
    btnNew: $id('btn-new'),
    btnSpeak: $id('btn-speak'),
    help: mustId('help'),
    languageSelect: $id('language-select'),
    countSelect: $id('count-select'),
    modeAll: $id('mode-use-all'),
    modeLocked: $id('mode-locked-set'),
    lockedControls: $id('locked-controls'),
    lockedSizeSelect: $id('locked-set-size'),
    lockedCustomInput: $id('locked-set-custom'),
    btnNewMix: $id('btn-new-mix'),
    btnResetLocked: $id('btn-reset-locked'),
    prioritizeSwitch: $id('prioritize-mistakes'),
    lockedIndicator: $id('locked-indicator'),
    lockedProgress: $id('locked-progress'),
    lockedFeedback: $id('locked-feedback'),
    groupProgress: $id('group-progress') || $id('traits-group-progress'),
    screens: redesigned
      ? {
          start: $id('traits-start-screen'),
          play: $id('traits-play-screen'),
          summary: $id('traits-summary-screen'),
        }
      : null,
    start: $id('traits-start'),
    quit: $id('traits-quit'),
    replay: $id('traits-replay'),
    home: $id('traits-home'),
    wordCount: $id('traits-word-count'),
    progress: $id('traits-progress'),
    progressText: $id('traits-progress-text'),
    progressBar: $id('traits-progress-bar'),
    roundScore: $id('traits-round-score'),
    roundMistakes: $id('traits-round-mistakes'),
    feedback: $id('traits-feedback'),
    feedbackTitle: $id('traits-feedback-title'),
    summary: $id('traits-summary-screen'),
    summaryMessage: $id('traits-summary-message'),
    summaryAccuracyRing: $id('traits-summary-ring'),
    summaryAccuracy: $id('traits-summary-accuracy'),
    summaryScore: $id('traits-summary-score'),
    summaryAttempts: $id('traits-summary-attempts'),
    summaryMistakes: $id('traits-summary-mistakes'),
    summaryWords: $id('traits-summary-words'),
    review: $id('traits-review'),
  };

  let game = null;

  if (redesigned) {
    showScreen(elements, 'start');
    if (elements.start) elements.start.disabled = true;
    elements.start?.addEventListener('click', () => {
      showScreen(elements, 'play');
      game?.start();
    });
    elements.replay?.addEventListener('click', () => {
      showScreen(elements, 'play');
      game?.start();
    });
    [elements.quit, elements.home].forEach((button) => {
      button?.addEventListener('click', () => showScreen(elements, 'start'));
    });
  }

  game = initMatchingGame({
    elements,
    dataLoader: async () => ({ items: await loadPersonalityWords() }),
    languages: [{ id: 'en', label: 'Angļu' }],
    defaultLanguage: 'en',
    storageKeys: {
      config: 'traits_match_config',
      activeSet: 'traits_match_activeSet',
      cursor: 'traits_match_cursor',
      recent: 'traits_match_recentSets',
      stats: 'traits_match_stats',
    },
    defaultConfig: {
      mode: defaultMode,
      size: 10,
      prioritizeMistakes: false,
    },
    minCustomSize: 5,
    autoStart: !redesigned,
    onReady: ({ itemCount }) => {
      if (elements.wordCount) elements.wordCount.textContent = String(itemCount);
      if (elements.start) elements.start.disabled = false;
    },
    onScoreChange: (payload) => {
      renderRoundProgress(elements, payload);
      if (!elements.feedback) return;
      if (!payload?.result) {
        elements.feedback.hidden = true;
        return;
      }
      elements.feedback.hidden = false;
      elements.feedback.dataset.result = payload.result;
      if (elements.feedbackTitle) {
        elements.feedbackTitle.textContent =
          payload.result === 'correct' ? 'Pareizi!' : 'Vēl ne gluži';
      }
    },
    onRoundComplete: (payload) => {
      if (!redesigned) return;
      renderSummary(elements, payload);
      showScreen(elements, 'summary');
    },
    texts: {
      lockedReady: (count) => `Slēgtā kopa sagatavota (${count}).`,
      lockedMissing: 'Izveido slēgto kopu ar “Jauna sajaukšana”.',
      lockedNote: {
        capped: (poolSize) => `Pieejami tikai ${poolSize} vārdi, kopa tiks samazināta.`,
        smallSet: (setSize) => `Šajā kopā ir ${setSize} vārdi, tāpēc uz dēļa ir visi.`,
      },
    },
    onRoundRendered: (items) => renderGroupProgress(elements.groupProgress, items),
  });
}
