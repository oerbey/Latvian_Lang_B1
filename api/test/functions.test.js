/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');

const { getProgressHandler } = require('../src/functions/getProgress');
const { saveProgressHandler } = require('../src/functions/saveProgress');

const principal = {
  identityProvider: 'aad',
  userId: 'user-1',
  userDetails: 'learner@example.com',
  userRoles: ['anonymous', 'authenticated'],
};

function principalHeader(value = principal) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function request({ body, gameId = 'word-quest', principalValue = principal } = {}) {
  return {
    headers: {
      get: (name) => (name === 'x-ms-client-principal' ? principalHeader(principalValue) : null),
    },
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
        ownershipSchemaVersion: 99,
      },
    }),
    { getContainer },
  );
  assert.equal(created.status, 200);
  assert.equal(created.jsonBody.item.userId, 'user-1');
  assert.equal(created.jsonBody.item.revision, 1);
  assert.equal('identityProvider' in created.jsonBody.item, false);
  assert.equal('ownershipSchemaVersion' in created.jsonBody.item, false);

  const stored = [...container.records.values()][0];
  assert.equal(stored.userId, 'user-1');
  assert.equal(stored.identityProvider, 'aad');
  assert.equal(stored.ownershipSchemaVersion, 1);

  const loaded = await getProgressHandler(request(), { getContainer });
  assert.deepEqual(loaded.jsonBody.data, progress);

  const stale = await saveProgressHandler(
    request({ body: { gameId: 'word-quest', data: progress, expectedRevision: 0 } }),
    { getContainer },
  );
  assert.equal(stale.status, 409);
  assert.equal(stale.jsonBody.current.revision, 1);

  const otherUser = await getProgressHandler(
    request({ principalValue: { ...principal, userId: 'user-2' } }),
    { getContainer },
  );
  assert.equal(otherUser.jsonBody, null);
});

test('a successful save upgrades legacy records with server-derived ownership metadata', async () => {
  const container = createContainer();
  const key = 'user-1:user-1:word-quest';
  container.records.set(key, {
    id: 'user-1:word-quest',
    userId: 'user-1',
    gameId: 'word-quest',
    data: progress,
    revision: 3,
    updatedAt: '2026-09-01T00:00:00.000Z',
    _etag: 'etag-3',
  });

  const updated = await saveProgressHandler(
    request({ body: { gameId: 'word-quest', data: progress, expectedRevision: 3 } }),
    { getContainer: () => container },
  );

  assert.equal(updated.status, 200);
  assert.equal(updated.jsonBody.item.revision, 4);
  assert.equal(container.records.get(key).identityProvider, 'aad');
  assert.equal(container.records.get(key).ownershipSchemaVersion, 1);
});

test('save handler returns controlled validation and storage errors', async () => {
  const validRequest = request({
    body: { gameId: 'word-quest', data: progress, expectedRevision: 0 },
  });
  const malformed = { ...validRequest, json: async () => JSON.parse('{bad') };
  assert.equal((await saveProgressHandler(malformed)).status, 400);

  assert.equal(
    (await saveProgressHandler(request({ body: { gameId: 'word-quest', data: progress } }))).status,
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
  });
  assert.deepEqual(unavailable, {
    status: 503,
    jsonBody: { error: 'progress service unavailable' },
  });
});
