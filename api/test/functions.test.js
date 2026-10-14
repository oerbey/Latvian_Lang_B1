/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');

const { getProgressHandler } = require('../src/functions/getProgress');
const { saveProgressHandler } = require('../src/functions/saveProgress');

const { identity } = require('./helpers/external-identity.cjs');
let learner;
let other;
test.before(async () => {
  learner = await identity();
  other = await identity('55555555-5555-4555-8555-555555555555');
});
function request({ body, gameId = 'word-quest', principalValue = learner } = {}) {
  return {
    headers: new Headers({ 'X-Latvian-Authorization': `Bearer ${principalValue.token}` }),
    query: new URLSearchParams(gameId === undefined ? '' : { gameId }),
    json: async () => body,
  };
}

function createContainer() {
  const records = new Map();
  return {
    records,
    item(id, partitionKey) {
      const key = `${partitionKey}:${id}`;
      return {
        async read() {
          const resource = records.get(key);
          if (!resource) throw Object.assign(new Error('not found'), { code: 404 });
          return { resource };
        },
        async replace(resource) {
          records.set(key, { ...resource, _etag: `etag-${resource.revision}` });
        },
      };
    },
    items: {
      async create(resource) {
        const key = `${resource.userId}:${resource.id}`;
        if (records.has(key)) throw Object.assign(new Error('conflict'), { code: 409 });
        records.set(key, { ...resource, _etag: `etag-${resource.revision}` });
      },
    },
  };
}

const progress = {
  schemaVersion: 1,
  xp: 10,
  level: 1,
  streak: 0,
  bestStreak: 0,
  totalCorrect: 1,
  totalWrong: 0,
  worlds: {},
};

test('handlers require an authenticated principal and reject anonymous requests', async () => {
  const noPrincipal = {
    headers: { get: () => null },
    query: new URLSearchParams({ gameId: 'word-quest' }),
    json: async () => ({ gameId: 'word-quest', data: progress, expectedRevision: 0 }),
  };
  assert.deepEqual(await getProgressHandler(noPrincipal), {
    status: 401,
    jsonBody: { error: 'authentication required' },
  });
  assert.deepEqual(await saveProgressHandler(noPrincipal), {
    status: 401,
    jsonBody: { error: 'authentication required' },
  });
});

test('save and get use server identity and reject stale revisions', async () => {
  const container = createContainer();
  const getContainer = () => container;

  const created = await saveProgressHandler(
    request({
      body: {
        gameId: 'word-quest',
        data: progress,
        expectedRevision: 0,
        identityProvider: 'browser-supplied-provider',
        userId: other.userId,
        ownershipSchemaVersion: 99,
      },
    }),
    { getContainer, ...learner.dependencies },
  );
  assert.equal(created.status, 200);
  assert.equal(created.jsonBody.item.userId, learner.userId);
  assert.equal(created.jsonBody.item.revision, 1);
  assert.equal('identityProvider' in created.jsonBody.item, false);
  assert.equal('ownershipSchemaVersion' in created.jsonBody.item, false);

  const stored = [...container.records.values()][0];
  assert.equal(stored.userId, learner.userId);
  assert.equal(stored.identityProvider, 'external-id');
  assert.equal(stored.ownershipSchemaVersion, 2);

  const loaded = await getProgressHandler(request(), { getContainer, ...learner.dependencies });
  assert.deepEqual(loaded.jsonBody.data, progress);

  const stale = await saveProgressHandler(
    request({ body: { gameId: 'word-quest', data: progress, expectedRevision: 0 } }),
    { getContainer, ...learner.dependencies },
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.jsonBody.current.revision, 1);

  const otherUser = await getProgressHandler(request({ principalValue: other }), {
    getContainer,
    ...learner.dependencies,
  });
  assert.equal(otherUser.jsonBody, null);
});

test('a successful save keeps server-derived ownership metadata', async () => {
  const container = createContainer();
  const key = `${learner.userId}:${learner.userId}:word-quest`;
  container.records.set(key, {
    id: `${learner.userId}:word-quest`,
    userId: learner.userId,
    gameId: 'word-quest',
    data: progress,
    revision: 3,
    updatedAt: '2026-09-01T00:00:00.000Z',
    _etag: 'etag-3',
  });

  const updated = await saveProgressHandler(
    request({ body: { gameId: 'word-quest', data: progress, expectedRevision: 3 } }),
    { getContainer: () => container, ...learner.dependencies },
  );

  assert.equal(updated.status, 200);
  assert.equal(updated.jsonBody.item.revision, 4);
  assert.equal(container.records.get(key).identityProvider, 'external-id');
  assert.equal(container.records.get(key).ownershipSchemaVersion, 2);
});

test('save handler returns controlled validation and storage errors', async () => {
  const validRequest = request({
    body: { gameId: 'word-quest', data: progress, expectedRevision: 0 },
  });
  const malformed = { ...validRequest, json: async () => JSON.parse('{bad') };
  assert.equal((await saveProgressHandler(malformed, learner.dependencies)).status, 400);

  assert.equal(
    (
      await saveProgressHandler(
        request({ body: { gameId: 'word-quest', data: progress } }),
        learner.dependencies,
      )
    ).status,
    400,
  );

  const failingContainer = {
    item() {
      return {
        async read() {
          throw Object.assign(new Error('cosmos down'), { code: 500 });
        },
      };
    },
  };
  const unavailable = await saveProgressHandler(validRequest, {
    getContainer: () => failingContainer,
    ...learner.dependencies,
  });
  assert.deepEqual(unavailable, {
    status: 503,
    jsonBody: { error: 'progress service unavailable' },
  });
});

test('legacy SWA headers alone cannot read or write progress', async () => {
  const forged = request();
  forged.headers = new Headers({
    'x-ms-client-principal': Buffer.from(
      JSON.stringify({
        userId: learner.userId,
        identityProvider: 'aad',
        userRoles: ['authenticated'],
      }),
    ).toString('base64'),
  });
  for (const handler of [getProgressHandler, saveProgressHandler]) {
    assert.equal((await handler(forged, learner.dependencies)).status, 401);
  }
});

test('two verified identities own independent partitions; wrong client/scope fail before storage', async () => {
  const container = createContainer();
  const deps = { getContainer: () => container, ...learner.dependencies };
  await saveProgressHandler(
    request({ body: { gameId: 'word-quest', data: progress, expectedRevision: 0 } }),
    deps,
  );
  await saveProgressHandler(
    request({
      principalValue: other,
      body: { gameId: 'word-quest', data: { ...progress, xp: 73 }, expectedRevision: 0 },
    }),
    deps,
  );
  assert.equal((await getProgressHandler(request(), deps)).jsonBody.data.xp, 10);
  assert.equal(
    (await getProgressHandler(request({ principalValue: other }), deps)).jsonBody.data.xp,
    73,
  );
  assert.equal(container.records.size, 2);
  for (const claims of [{ azp: '66666666-6666-4666-8666-666666666666' }, { scp: 'other.scope' }]) {
    const forbidden = await identity(undefined, claims);
    for (const handler of [getProgressHandler, saveProgressHandler]) {
      assert.equal(
        (
          await handler(request({ principalValue: forbidden }), {
            ...deps,
            getContainer: () => assert.fail('No unauthorized storage access'),
          })
        ).status,
        403,
      );
    }
  }
});
