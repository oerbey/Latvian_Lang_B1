const API_GAME_ID = 'word-quest';

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const response = await fetch('/.auth/me', { cache: 'no-store' });
    if (!response.ok) return { status: 'unavailable', user: null };

    const payload = await readJson(response);
    const principal = payload?.clientPrincipal;
    if (!principal?.userId || !Array.isArray(principal.userRoles)) {
      return { status: 'anonymous', user: null };
    }

    return {
      status: principal.userRoles.includes('authenticated') ? 'authenticated' : 'anonymous',
      user: principal,
    };
  } catch {
    return { status: 'unavailable', user: null };
  }
}

export async function saveCloudProgress(gameId, data, expectedRevision = 0) {
  if (gameId !== API_GAME_ID) return { status: 'invalid', item: null };

  try {
    const response = await fetch('/api/saveProgress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId,
        data,
        expectedRevision,
      }),
    });

    const payload = await readJson(response);
    if (response.status === 401) return { status: 'unauthenticated', item: null };
    if (response.status === 409) return { status: 'conflict', item: payload?.current || null };
    if (!response.ok) return { status: 'unavailable', item: null };
    return { status: 'saved', item: payload?.item || null };
  } catch {
    return { status: 'unavailable', item: null };
  }
}

export async function loadCloudProgress(gameId) {
  if (gameId !== API_GAME_ID) return { status: 'invalid', item: null };

  try {
    const params = new URLSearchParams({ gameId });
    const response = await fetch(`/api/getProgress?${params.toString()}`, { cache: 'no-store' });
    const payload = await readJson(response);
    if (response.status === 401) return { status: 'unauthenticated', item: null };
    if (!response.ok) return { status: 'unavailable', item: null };
    return payload ? { status: 'ok', item: payload } : { status: 'missing', item: null };
  } catch {
    return { status: 'unavailable', item: null };
  }
}
