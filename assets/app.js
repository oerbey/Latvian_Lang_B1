import { initMatchingGame, MATCHING_CONSTANTS } from '../src/lib/matching-game.js';

const els = {
  lvList: document.getElementById('list-lv'),
  trList: document.getElementById('list-tr'),
  score: document.getElementById('score'),
  btnNew: document.getElementById('btn-new'),
  btnSpeak: document.getElementById('btn-speak'),
  help: document.getElementById('help'),
  languageSelect: document.getElementById('language-select'),
  countSelect: document.getElementById('count-select'),
  modeAll: document.getElementById('mode-use-all'),
  modeLocked: document.getElementById('mode-locked-set'),
  lockedControls: document.getElementById('locked-controls'),
  lockedSizeSelect: document.getElementById('locked-set-size'),
  lockedCustomInput: document.getElementById('locked-set-custom'),
  btnNewMix: document.getElementById('btn-new-mix'),
  btnResetLocked: document.getElementById('btn-reset-locked'),
  prioritizeSwitch: document.getElementById('prioritize-mistakes'),
  lockedIndicator: document.getElementById('locked-indicator'),
  lockedProgress: document.getElementById('locked-progress'),
  lockedFeedback: document.getElementById('locked-feedback'),
};

function makeWordsLoader() {
  return async () => {
    let usingFallback = false;
    let items = [];
    try {
      const res = await fetch('data/words.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error('Neizdevās ielādēt datus.');
      items = await res.json();
    } catch (err) {
      if (Array.isArray(window.__LATVIAN_WORDS__)) {
        console.warn('words.json fetch failed; using embedded fallback dataset.', err);
        items = window.__LATVIAN_WORDS__;
        usingFallback = true;
      } else {
        throw err;
      }
    }
    return { items, usingFallback };
  };
}

initMatchingGame({
  elements: els,
  dataLoader: makeWordsLoader(),
  languages: [
    { id: 'eng', label: 'English' },
    { id: 'ru', label: 'Русский' },
  ],
  defaultLanguage: 'eng',
  storageKeys: {
    config: 'dv_config',
    activeSet: 'dv_activeSet',
    cursor: 'dv_cursor',
    recent: 'dv_recentSets',
    stats: 'dv_stats',
  },
  defaultConfig: {
    mode: MATCHING_CONSTANTS.MODE_ALL,
    size: 10,
    prioritizeMistakes: false,
  },
  texts: {
    lockedReady: (count) => `Locked set ready: ${count} items.`,
  },
});
