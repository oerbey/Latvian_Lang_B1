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

export function initTraitsMatching({ defaultMode = MATCHING_CONSTANTS.MODE_ALL } = {}) {
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
    groupProgress: $id('group-progress'),
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
