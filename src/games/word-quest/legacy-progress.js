import { wordQuestProgress } from '../../lib/progress/word-quest.js';

function readJson(storage, key) {
  const raw = storage.getItem(key);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Seed the new store from the same owner's old keys. The old keys remain as a backup. */
export function readLegacyWordQuestProgress(storage, userId) {
  const key = `llb1:word-quest:v2:${userId ?? 'guest'}`;
  const meta = userId === null ? null : readJson(storage, `${key}:sync`);
  const valid = [readJson(storage, key), meta?.pending].map((data) => {
    try {
      return data ? wordQuestProgress.normalize(data) : null;
    } catch {
      return null;
    }
  });
  // The old game wrote progress before updating its pending metadata.
  const data = valid[0] ?? valid[1];
  if (!data) return null;
  const revision =
    Number.isSafeInteger(meta?.cloudRevision) && meta.cloudRevision >= 0
      ? meta.cloudRevision
      : null;
  const hasProgress =
    data.xp > 0 ||
    data.level > 1 ||
    data.streak > 0 ||
    data.bestStreak > 0 ||
    data.totalCorrect > 0 ||
    data.totalWrong > 0 ||
    Object.keys(data.worlds).length > 0;
  return {
    data,
    // Without a pending snapshot the old split keys cannot prove which revision
    // the local data matches. Divergent cloud data requires an explicit choice.
    revision: valid[1] ? revision : null,
    pending: userId !== null && (Boolean(valid[1]) || hasProgress),
  };
}
