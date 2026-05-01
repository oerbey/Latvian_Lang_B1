const DEFAULT_USER_ID = 'demo-user';

async function readJson(response, fallback) {
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

export async function saveCloudProgress(gameId, data, userId = DEFAULT_USER_ID) {
  try {
    const response = await fetch('/api/saveProgress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        gameId,
        data,
      }),
    });

    if (!response.ok) {
      return false;
    }

    return await readJson(response, false);
  } catch {
    return false;
  }
}

export async function loadCloudProgress(gameId, userId = DEFAULT_USER_ID) {
  try {
    const params = new URLSearchParams({
      userId,
      gameId,
    });
    const response = await fetch(`/api/getProgress?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    return await readJson(response, null);
  } catch {
    return null;
  }
}
