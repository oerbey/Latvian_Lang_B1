import { darbibasVardsProgress } from '../../lib/progress/darbibas-vards.js';
import { isCount, isPlainObject } from '../../lib/progress/common.js';

const keys = ['dv_config', 'dv_activeSet', 'dv_cursor', 'dv_recentSets', 'dv_stats'];
const ids = (value) =>
  Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id) : [];

/** The original matching keys belong to this browser's guest, even when an account opens first. */
export function readLegacyMatchingProgress(storage, userId) {
  if (userId !== null) return null;
  const raw = keys.map((key) => storage.getItem(key));
  if (raw.every((value) => value === null)) return null;
  const [config, order, cursor, recentSets, stats] = raw.map((value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  });
  const data = darbibasVardsProgress.createDefault();
  data.settings.mode = config?.mode === 'locked' ? 'locked' : 'all';
  data.settings.lockedSetSize = isCount(config?.size) && config.size >= 5 ? config.size : 10;
  data.settings.prioritizeMistakes = config?.prioritizeMistakes === true;
  data.lockedSet.order = ids(order);
  data.lockedSet.cursor = isCount(cursor) ? cursor : 0;
  data.recentSets = Array.isArray(recentSets) ? recentSets.slice(-5).map(ids) : [];
  let attempts = 0;
  data.stats = Object.fromEntries(
    Object.entries(isPlainObject(stats) ? stats : {}).filter(([id, entry]) => {
      if (
        !id ||
        !isCount(entry?.correct) ||
        !isCount(entry?.incorrect) ||
        !isCount(entry?.lastSeen) ||
        entry.lastSeen > 8640000000000000
      )
        return false;
      const total = attempts + entry.correct + entry.incorrect;
      if (!isCount(total)) return false;
      attempts = total;
      return true;
    }),
  );
  return { data, revision: null, pending: false };
}
