import { initMatchingGame, MATCHING_CONSTANTS } from '../../lib/matching-game.js';
import { loadPersonalityWords } from '../../lib/personality-data.js';

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

export function initTraitsMatching({ defaultMode = MATCHING_CONSTANTS.MODE_ALL } = {}) {
  const elements = {
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
    groupProgress: document.getElementById('group-progress'),
  };

  initMatchingGame({
    elements,
    dataLoader: async () => ({ items: await loadPersonalityWords() }),
    languages: [{ id: 'eng', label: 'Angļu' }],
    defaultLanguage: 'eng',
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
