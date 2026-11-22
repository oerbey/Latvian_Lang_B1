import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudProgressClient } from '../../src/lib/cloud-progress.js';
import { EXERCISES } from '../../src/lib/exercise-registry.js';
const owner = `extid:${'a'.repeat(64)}`;

test('cloud requests bind owner/token, use the application header and no-store', async () => {
  const calls = [];
  const cloud = createCloudProgressClient(
    async (key) => {
      assert.equal(key, owner);
      return 'synthetic-token';
    },
    async (url, options) => {
      calls.push({ url, options });
      return new Response(
        JSON.stringify(
          url.includes('save')
            ? {
                ok: true,
                item: { userId: owner, gameId: 'word-quest', revision: 1, data: { xp: 10 } },
              }
            : { userId: owner, gameId: 'word-quest', revision: 1, data: { xp: 10 } },
        ),
      );
    },
  );
  assert.equal(
    (await cloud.saveCloudProgress('word-quest', { xp: 10 }, 0, { userId: owner })).status,
    'saved',
  );
  assert.equal((await cloud.loadCloudProgress('word-quest', { userId: owner })).status, 'ok');
  assert.equal(calls[0].options.headers['X-Latvian-Authorization'], 'Bearer synthetic-token');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[0].options.cache, 'no-store');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    gameId: 'word-quest',
    data: { xp: 10 },
    expectedRevision: 0,
  });
});

test('cloud authentication/conflicts fail without retries, and mismatched owners are rejected', async () => {
  for (const [status, body, expected] of [
    [401, {}, 'unauthenticated'],
    [403, {}, 'forbidden'],
    [409, { current: { revision: 3, userId: owner, gameId: 'word-quest', data: {} } }, 'conflict'],
    [200, { userId: 'other' }, 'unavailable'],
    [200, {}, 'unavailable'],
  ]) {
    let calls = 0;
    const cloud = createCloudProgressClient(
      async () => 'token',
      async () => {
        calls++;
        return new Response(JSON.stringify(body), { status });
      },
    );
    assert.equal(
      (await cloud.saveCloudProgress('word-quest', {}, 0, { userId: owner })).status,
      expected,
    );
    assert.equal(calls, 1);
  }
});

test('expired sessions and aborted account changes never send a write', async () => {
  class Expired extends Error {}
  const cloud = createCloudProgressClient(
    async () => {
      throw new Expired();
    },
    () => assert.fail('no write'),
    (error) => error instanceof Expired,
  );
  assert.equal(
    (await cloud.saveCloudProgress('word-quest', {}, 0, { userId: owner })).status,
    'reauth',
  );
  const controller = new AbortController();
  controller.abort();
  const aborted = createCloudProgressClient(
    async () => 'token',
    () => assert.fail('no write'),
  );
  assert.equal(
    (
      await aborted.saveCloudProgress('word-quest', {}, 0, {
        userId: owner,
        signal: controller.signal,
      })
    ).status,
    'cancelled',
  );
});

test('matching requests keep their exercise ID and reject a response or conflict from another exercise', async () => {
  const calls = [];
  let returnedGame = 'darbibas-vards';
  let responseStatus = 200;
  const cloud = createCloudProgressClient(
    async (userId) => {
      assert.equal(userId, owner);
      return 'synthetic-token';
    },
    async (url, options) => {
      calls.push({ url, options });
      const item = { gameId: returnedGame, userId: owner, revision: 1, data: {} };
      return new Response(
        JSON.stringify(
          responseStatus === 409
            ? { current: item }
            : options.method === 'POST'
              ? { ok: true, item }
              : item,
        ),
        { status: responseStatus },
      );
    },
  );
  assert.equal(
    (await cloud.saveCloudProgress('darbibas-vards', {}, 0, { userId: owner })).status,
    'saved',
  );
  assert.equal((await cloud.loadCloudProgress('darbibas-vards', { userId: owner })).status, 'ok');
  assert.equal(calls[1].url, '/api/getProgress?gameId=darbibas-vards');
  assert.equal(JSON.parse(calls[0].options.body).gameId, 'darbibas-vards');
  returnedGame = 'word-quest';
  assert.equal(
    (await cloud.loadCloudProgress('darbibas-vards', { userId: owner })).status,
    'unavailable',
  );
  responseStatus = 409;
  assert.equal(
    (await cloud.saveCloudProgress('darbibas-vards', {}, 0, { userId: owner })).status,
    'unavailable',
  );
  const previousCalls = calls.length;
  for (const id of ['form-factory-v3', 'constructor', 'unknown']) {
    assert.equal((await cloud.loadCloudProgress(id, { userId: owner })).status, 'invalid');
    assert.equal((await cloud.saveCloudProgress(id, {}, 0, { userId: owner })).status, 'invalid');
  }
  assert.equal(calls.length, previousCalls);
});

function summaryPayload() {
  return {
    userId: owner,
    exercises: EXERCISES.map(({ id, tracking }) => ({
      gameId: id,
      tracking,
      status: tracking === 'cloud' ? 'not-started' : 'not-connected',
      summary: null,
    })),
  };
}

test('summary requests bind the verified owner and distinguish per-exercise states without raw progress', async () => {
  const payload = summaryPayload();
  payload.exercises.find(({ gameId }) => gameId === 'word-quest').status = 'unavailable';
  const matching = payload.exercises.find(({ gameId }) => gameId === 'darbibas-vards');
  matching.status = 'saved';
  matching.summary = {
    attempts: 6,
    correct: 3,
    accuracy: 50,
    lastPlayedAt: null,
    wordsPractised: 2,
    coverage: { practised: 2, total: 390 },
  };
  const cloud = createCloudProgressClient(
    async (userId) => {
      assert.equal(userId, owner);
      return 'synthetic-token';
    },
    async (url, options) => {
      assert.equal(url, '/api/getProgressSummary');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.headers['X-Latvian-Authorization'], 'Bearer synthetic-token');
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.gameId, undefined);
      assert.equal(options.summaries, undefined);
      return new Response(JSON.stringify(payload));
    },
  );
  assert.deepEqual(await cloud.loadCloudProgressSummary({ userId: owner }), {
    status: 'ok',
    exercises: payload.exercises,
  });
});

test('summary rejects mismatched owners, missing/duplicate exercises and malformed states', async () => {
  for (const mutate of [
    (payload) => {
      payload.userId = `extid:${'b'.repeat(64)}`;
    },
    (payload) => {
      payload.exercises.pop();
    },
    (payload) => {
      payload.exercises[0] = payload.exercises[1];
    },
    (payload) => {
      payload.exercises[0].gameId = 'unknown';
    },
    (payload) => {
      payload.exercises[0].tracking = 'anything';
    },
    (payload) => {
      payload.exercises[0].status = 'saved';
    },
    (payload) => {
      payload.exercises[0].status = 'other';
    },
    (payload) => {
      payload.exercises[0] = null;
    },
  ]) {
    const payload = summaryPayload();
    mutate(payload);
    const cloud = createCloudProgressClient(
      async () => 'synthetic-token',
      async () => new Response(JSON.stringify(payload)),
    );
    assert.deepEqual(await cloud.loadCloudProgressSummary({ userId: owner }), {
      status: 'unavailable',
      exercises: null,
    });
  }
});

test('private request failures and cancellation do not expose stale summaries or issue retries', async () => {
  for (const [status, expected] of [
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [503, 'unavailable'],
  ]) {
    let calls = 0;
    const cloud = createCloudProgressClient(
      async () => 'synthetic-token',
      async () => {
        calls++;
        return new Response('', { status });
      },
    );
    assert.deepEqual(await cloud.loadCloudProgressSummary({ userId: owner }), {
      status: expected,
      exercises: null,
    });
    assert.equal(calls, 1);
  }
  const controller = new AbortController();
  const cloud = createCloudProgressClient(
    async () => 'synthetic-token',
    async () => ({
      ok: true,
      status: 200,
      json: async () => {
        controller.abort();
        return summaryPayload();
      },
    }),
  );
  assert.deepEqual(
    await cloud.loadCloudProgressSummary({ userId: owner, signal: controller.signal }),
    { status: 'cancelled', exercises: null },
  );
});
