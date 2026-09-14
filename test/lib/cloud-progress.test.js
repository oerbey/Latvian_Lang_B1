import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCurrentUser,
  loadCloudProgress,
  saveCloudProgress,
} from '../../src/lib/cloud-progress.js';

test('saveCloudProgress posts progress payload and returns parsed JSON', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, item: { revision: 1 } };
      },
    };
  };

  try {
    const result = await saveCloudProgress('word-quest', { xp: 5, level: 2 }, 0);
    assert.deepEqual(result, { status: 'saved', item: { revision: 1 } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/saveProgress');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      gameId: 'word-quest',
      data: { xp: 5, level: 2 },
      expectedRevision: 0,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('saveCloudProgress returns false when fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('offline');
  };

  try {
    const result = await saveCloudProgress('word-quest', { xp: 1, level: 1 });
    assert.deepEqual(result, { status: 'unavailable', item: null });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadCloudProgress sends game and user query params', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          userId: 'server-user',
          gameId: 'word-quest',
          data: { xp: 12, level: 3 },
        };
      },
    };
  };

  try {
    const result = await loadCloudProgress('word-quest');
    assert.deepEqual(result, {
      status: 'ok',
      item: {
        userId: 'server-user',
        gameId: 'word-quest',
        data: { xp: 12, level: 3 },
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0], '/api/getProgress?gameId=word-quest');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadCloudProgress returns null for failed requests', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    async json() {
      return { error: 'bad request' };
    },
  });

  try {
    const result = await loadCloudProgress('word-quest');
    assert.deepEqual(result, { status: 'unavailable', item: null });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getCurrentUser distinguishes authenticated and anonymous principals', async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    {
      ok: true,
      status: 200,
      async json() {
        return {
          clientPrincipal: {
            identityProvider: 'aad',
            userId: 'user-1',
            userDetails: 'learner@example.com',
            userRoles: ['anonymous', 'authenticated'],
          },
        };
      },
    },
    {
      ok: true,
      status: 200,
      async json() {
        return { clientPrincipal: null };
      },
    },
  ];
  globalThis.fetch = async () => responses.shift();

  try {
    assert.equal((await getCurrentUser()).status, 'authenticated');
    assert.equal((await getCurrentUser()).status, 'anonymous');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('cloud helpers report authentication and revision conflicts', async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    new Response(JSON.stringify({ error: 'authentication required' }), { status: 401 }),
    new Response(JSON.stringify({ error: 'progress conflict', current: { revision: 4 } }), {
      status: 409,
    }),
  ];
  globalThis.fetch = async () => responses.shift();

  try {
    assert.deepEqual(await loadCloudProgress('word-quest'), {
      status: 'unauthenticated',
      item: null,
    });
    assert.deepEqual(await saveCloudProgress('word-quest', {}, 3), {
      status: 'conflict',
      item: { revision: 4 },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
