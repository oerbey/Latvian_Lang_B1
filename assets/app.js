import { initMatchingGame, MATCHING_CONSTANTS } from '../src/lib/matching-game.js';
import { createMatchingAccountProgress } from '../src/games/darbibas-vards/account-progress.js';
import { loadWords } from '../src/lib/words-data.js';

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
  return async () => loadWords({ cache: 'force-cache' });
}

const progress = createMatchingAccountProgress();
const game = initMatchingGame({
  elements: els,
  dataLoader: makeWordsLoader(),
  languages: [
    { id: 'en', label: 'English' },
    { id: 'ru', label: 'Русский' },
  ],
  defaultLanguage: 'en',
  storageKeys: { speak: 'dv_speak' },
  autoStart: false,
  onReady: () => progress.attach(game),
  onProgress: progress.save,
  defaultConfig: {
    mode: MATCHING_CONSTANTS.MODE_ALL,
    size: 10,
    prioritizeMistakes: false,
  },
  texts: {
    lockedReady: (count) => `Locked set ready: ${count} items.`,
    speakOn: '🔊 Izslēgt izrunu',
    speakOff: '🔊 Ieslēgt izrunu',
  },
});

window.render_game_to_text = progress.renderText;
