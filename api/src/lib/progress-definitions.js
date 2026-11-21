/* eslint-env node */
let definitions;

/** Imports only the generated API-local package; no runtime dependency on website files. */
function getProgressDefinitions() {
  definitions ||= Promise.all([
    import('../../generated/progress-contracts/exercise-registry.js'),
    import('../../generated/progress-contracts/progress/index.js'),
    import('../../generated/progress-contracts/progress/word-quest-worlds.js'),
  ]).then(([registry, contracts, worlds]) => ({
    exercises: registry.EXERCISES,
    gameIds: contracts.CLOUD_PROGRESS_GAME_IDS,
    getAdapter: (id) => registry.getExercise(id) && contracts.getProgressAdapter(id),
    contexts: {
      ...require('../../generated/progress-contracts/contexts.json'),
      'word-quest': { worldNodeCounts: worlds.WORD_QUEST_NODE_COUNTS },
    },
  }));
  return definitions;
}

module.exports = { getProgressDefinitions };
