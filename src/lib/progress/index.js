import { darbibasVardiV2Progress } from './darbibas-vardi-v2.js';
import { darbibasVardsProgress } from './darbibas-vards.js';
import { wordQuestProgress } from './word-quest.js';

const adapters = new Map([
  ['word-quest', wordQuestProgress],
  ['darbibas-vards', darbibasVardsProgress],
  ['darbibas-vardi-v2', darbibasVardiV2Progress],
]);

export const CLOUD_PROGRESS_GAME_IDS = Object.freeze([...adapters.keys()]);

/** Adapters enable API contracts; the registry records the separate game/UI rollout. */
export function getProgressAdapter(gameId) {
  return adapters.get(gameId) || null;
}
