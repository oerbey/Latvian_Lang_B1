import { getAccessToken, isInteractionRequired } from './email-auth.js';
import { EXERCISES, getExercise } from './exercise-registry.js';
import { CLOUD_PROGRESS_GAME_IDS } from './progress/index.js';
export { getCurrentUser } from './email-auth.js';
function validItem(item, owner, gameId) {
  return (
    item.userId === owner &&
    item.gameId === gameId &&
    Number.isInteger(item.revision) &&
    item.revision > 0 &&
    item.data &&
    typeof item.data === 'object' &&
    !Array.isArray(item.data)
  );
}

function validSummary(payload, owner) {
  if (
    payload?.userId !== owner ||
    !Array.isArray(payload.exercises) ||
    payload.exercises.length !== EXERCISES.length
  )
    return false;
  const seen = new Set();
  return payload.exercises.every((entry) => {
    if (
      !getExercise(entry?.gameId) ||
      seen.has(entry.gameId) ||
      !['cloud', 'planned'].includes(entry.tracking)
    )
      return false;
    seen.add(entry.gameId);
    if (entry.status === 'saved')
      return entry.summary && typeof entry.summary === 'object' && !Array.isArray(entry.summary);
    return (
      ['not-started', 'not-connected', 'unavailable'].includes(entry.status) &&
      entry.summary === null
    );
  });
}

/** Capture the owner before token acquisition; session changes cannot retarget a pending write. */
export function createCloudProgressClient(
  tokenProvider = getAccessToken,
  fetchImpl = (...args) => fetch(...args),
  needsInteraction = isInteractionRequired,
) {
  async function request(path, { userId, signal, gameId, summaries = false, ...options }) {
    const result = (status, item = null) =>
      summaries ? { status, exercises: item } : { status, item };
    try {
      const token = await tokenProvider(userId);
      if (signal?.aborted) return result('cancelled');
      const response = await fetchImpl(path, {
        ...options,
        signal,
        cache: 'no-store',
        headers: { ...options.headers, 'X-Latvian-Authorization': `Bearer ${token}` },
      });
      if (signal?.aborted) return result('cancelled');
      if (response.status === 401) return result('unauthenticated');
      if (response.status === 403) return result('forbidden');
      let payload;
      try {
        payload = await response.json();
      } catch {
        return result('unavailable');
      }
      if (signal?.aborted) return result('cancelled');
      if (summaries)
        return response.ok && validSummary(payload, userId)
          ? result('ok', payload.exercises)
          : result('unavailable');
      if (response.status === 409) {
        if (payload?.current && !validItem(payload.current, userId, gameId))
          return { status: 'unavailable', item: null };
        return { status: 'conflict', item: payload?.current || null };
      }
      if (!response.ok) return { status: 'unavailable', item: null };
      const item = options.method === 'POST' ? payload?.item : payload;
      if (item && !validItem(item, userId, gameId)) return { status: 'unavailable', item: null };
      if (options.method === 'POST')
        return item && payload?.ok === true
          ? { status: 'saved', item }
          : { status: 'unavailable', item: null };
      return item ? { status: 'ok', item } : { status: 'missing', item: null };
    } catch (error) {
      return result(
        signal?.aborted ? 'cancelled' : needsInteraction(error) ? 'reauth' : 'unavailable',
      );
    }
  }
  function saveCloudProgress(gameId, data, expectedRevision = 0, options = {}) {
    if (!CLOUD_PROGRESS_GAME_IDS.includes(gameId))
      return Promise.resolve({ status: 'invalid', item: null });
    return request('/api/saveProgress', {
      ...options,
      gameId,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, data, expectedRevision }),
    });
  }
  function loadCloudProgress(gameId, options = {}) {
    if (!CLOUD_PROGRESS_GAME_IDS.includes(gameId))
      return Promise.resolve({ status: 'invalid', item: null });
    return request(`/api/getProgress?${new URLSearchParams({ gameId })}`, { ...options, gameId });
  }
  /** Load derived account summaries; aborted or mismatched-owner responses expose no entries. */
  function loadCloudProgressSummary(options = {}) {
    return request('/api/getProgressSummary', { ...options, summaries: true });
  }
  return { saveCloudProgress, loadCloudProgress, loadCloudProgressSummary };
}
const cloud = createCloudProgressClient();
export const saveCloudProgress = cloud.saveCloudProgress;
export const loadCloudProgress = cloud.loadCloudProgress;
export const loadCloudProgressSummary = cloud.loadCloudProgressSummary;
