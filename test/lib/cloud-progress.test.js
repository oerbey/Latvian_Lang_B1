import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudProgressClient } from '../../src/lib/cloud-progress.js';
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
