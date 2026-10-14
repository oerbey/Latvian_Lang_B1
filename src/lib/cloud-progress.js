import { getAccessToken, isInteractionRequired } from './email-auth.js';
export { getCurrentUser } from './email-auth.js';
const API_GAME_ID = 'word-quest';
function validItem(item, owner) {
  return (
    item.userId === owner &&
    item.gameId === API_GAME_ID &&
    Number.isInteger(item.revision) &&
    item.revision > 0 &&
    item.data &&
    typeof item.data === 'object' &&
    !Array.isArray(item.data)
  );
}

/** Capture the owner before token acquisition; session changes cannot retarget a pending write. */
export function createCloudProgressClient(
  tokenProvider = getAccessToken,
  fetchImpl = (...args) => fetch(...args),
  needsInteraction = isInteractionRequired,
) {
  async function request(path, { userId, signal, ...options }) {
    try {
      const token = await tokenProvider(userId);
      if (signal?.aborted) return { status: 'cancelled', item: null };
      const response = await fetchImpl(path, {
        ...options,
        signal,
        cache: 'no-store',
        headers: { ...options.headers, 'X-Latvian-Authorization': `Bearer ${token}` },
      });
      let payload;
      try {
        payload = await response.json();
      } catch {
        return { status: 'unavailable', item: null };
      }
      if (response.status === 401) return { status: 'unauthenticated', item: null };
      if (response.status === 403) return { status: 'forbidden', item: null };
      if (response.status === 409) {
        if (payload?.current && !validItem(payload.current, userId))
          return { status: 'unavailable', item: null };
        return { status: 'conflict', item: payload?.current || null };
      }
      if (!response.ok) return { status: 'unavailable', item: null };
      const item = options.method === 'POST' ? payload?.item : payload;
      if (item && !validItem(item, userId)) return { status: 'unavailable', item: null };
      if (options.method === 'POST')
        return item && payload?.ok === true
          ? { status: 'saved', item }
          : { status: 'unavailable', item: null };
      return item ? { status: 'ok', item } : { status: 'missing', item: null };
    } catch (error) {
      return {
        status: signal?.aborted ? 'cancelled' : needsInteraction(error) ? 'reauth' : 'unavailable',
        item: null,
      };
    }
  }
  function saveCloudProgress(gameId, data, expectedRevision = 0, options = {}) {
    if (gameId !== API_GAME_ID) return Promise.resolve({ status: 'invalid', item: null });
    return request('/api/saveProgress', {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, data, expectedRevision }),
    });
  }
  function loadCloudProgress(gameId, options = {}) {
    if (gameId !== API_GAME_ID) return Promise.resolve({ status: 'invalid', item: null });
    return request(`/api/getProgress?${new URLSearchParams({ gameId })}`, options);
  }
  return { saveCloudProgress, loadCloudProgress };
}
const cloud = createCloudProgressClient();
export const saveCloudProgress = cloud.saveCloudProgress;
export const loadCloudProgress = cloud.loadCloudProgress;
