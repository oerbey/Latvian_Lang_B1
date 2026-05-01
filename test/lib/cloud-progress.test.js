import test from 'node:test';
import assert from 'node:assert/strict';

import { loadCloudProgress, saveCloudProgress } from '../../src/lib/cloud-progress.js';

test('saveCloudProgress posts progress payload and returns parsed JSON', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      async json() {
        return { ok: true };
      },
    };
  };

  try {
    const result = await saveCloudProgress('word-quest', { xp: 5, level: 2 });
    assert.deepEqual(result, { ok: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/saveProgress');
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      userId: 'demo-user',
      gameId: 'word-quest',
      data: { xp: 5, level: 2 },
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
    assert.equal(result, false);
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
      async json() {
        return {
          userId: 'demo-user',
          gameId: 'word-quest',
          data: { xp: 12, level: 3 },
        };
      },
    };
  };

  try {
    const result = await loadCloudProgress('word-quest');
    assert.deepEqual(result, {
      userId: 'demo-user',
      gameId: 'word-quest',
      data: { xp: 12, level: 3 },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0], '/api/getProgress?userId=demo-user&gameId=word-quest');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadCloudProgress returns null for failed requests', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    async json() {
      return { error: 'bad request' };
    },
  });

  try {
    const result = await loadCloudProgress('word-quest');
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
