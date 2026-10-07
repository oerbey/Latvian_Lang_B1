/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { migrationStartHandler, OLD_DEV_ORIGIN } = require('../src/functions/migrationStart');

const settings = {
  MIGRATION_ISSUANCE_ENABLED: 'true',
  COSMOS_PROGRESS_CONTAINER: 'progress_dev',
  COSMOS_ACCOUNTS_CONTAINER: 'accounts_dev',
};
const principal = {
  identityProvider: 'aad',
  userId: 'test-owner',
  userRoles: ['authenticated'],
};
const snapshot = { schemaVersion: 1, level: 2, xp: 10, worlds: {} };
const capturedAt = Date.parse('2026-10-01T12:00:00Z');

function request({ identity = principal, origin = OLD_DEV_ORIGIN, body = {} } = {}) {
  return {
    headers: {
      get: (name) => {
        if (name === 'origin') return origin;
        if (name === 'x-ms-client-principal' && identity) {
          return Buffer.from(JSON.stringify(identity)).toString('base64');
        }
        return null;
      },
    },
    json: async () => body,
  };
}

function fixture({ legacy = { data: snapshot, revision: 7 }, failRead, failCreate } = {}) {
  const operations = [];
  const reads = [];
  return {
    operations,
    reads,
    options: {
      settings,
      now: () => capturedAt,
      getProgress: () => ({
        item(id, pk) {
          reads.push({ id, pk });
          return {
            async read() {
              if (failRead) throw Object.assign(new Error('private storage detail'), { code: 500 });
              if (!legacy) throw Object.assign(new Error('missing'), { code: 404 });
              return { resource: legacy };
            },
          };
        },
      }),
      getAccounts: () => ({
        items: {
          async create(item) {
            if (failCreate) throw new Error('private storage detail');
            operations.push(item);
          },
        },
      }),
    },
  };
}

test('migration issues a random proof for only the server principal and bounded snapshot', async () => {
  const f = fixture();
  const result = await migrationStartHandler(request(), f.options);
  assert.equal(result.status, 201);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.match(result.jsonBody.token, /^[A-Za-z0-9_-]{43}$/);
  const hash = createHash('sha256').update(result.jsonBody.token).digest('hex');
  const operation = f.operations[0];
  assert.deepEqual(f.reads, [{ id: 'test-owner:word-quest', pk: 'test-owner' }]);
  assert.equal(operation.id, `migration:${hash}`);
  assert.equal(operation.pk, operation.id);
  assert.equal(operation.type, 'migration');
  assert.equal(operation.sourceRevision, 7);
  assert.deepEqual(operation.snapshot, snapshot);
  assert.notEqual(operation.snapshot, snapshot);
  assert.equal(operation.ttl, 3600);
  assert.equal(Date.parse(operation.expiresAt) - Date.parse(operation.createdAt), 900000);
  assert.equal(operation.status, 'pending');
  assert.equal(operation.attemptCount, 0);
  assert.equal(JSON.stringify(operation).includes(result.jsonBody.token), false);
  assert.equal(JSON.stringify(operation).includes(principal.userId), false);
  assert.equal(JSON.stringify(result.jsonBody).includes(principal.userId), false);
  const second = await migrationStartHandler(request(), f.options);
  assert.notEqual(second.jsonBody.token, result.jsonBody.token);
});

test('migration rejects anonymous access, wrong origins/providers and production settings', async () => {
  const f = fixture();
  assert.equal((await migrationStartHandler(request({ identity: null }), f.options)).status, 401);
  for (const override of [
    { MIGRATION_ISSUANCE_ENABLED: undefined },
    { MIGRATION_ISSUANCE_ENABLED: 'false' },
    { COSMOS_PROGRESS_CONTAINER: 'progress_prod' },
    { COSMOS_ACCOUNTS_CONTAINER: 'accounts_prod' },
  ]) {
    assert.equal(
      (
        await migrationStartHandler(request(), {
          ...f.options,
          settings: { ...settings, ...override },
        })
      ).status,
      404,
    );
  }
  for (const origin of [
    null,
    'https://example.com',
    'https://red-ocean-014d1e603.4.azurestaticapps.net',
  ]) {
    assert.equal((await migrationStartHandler(request({ origin }), f.options)).status, 403);
  }
  assert.equal(
    (
      await migrationStartHandler(
        request({ identity: { ...principal, identityProvider: 'externalId' } }),
        f.options,
      )
    ).status,
    403,
  );
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.operations, []);
});

test('migration refuses browser ownership/snapshots and invalid or oversized stored data', async () => {
  for (const body of [{ userId: 'someone-else' }, { snapshot }, null, []]) {
    const f = fixture();
    assert.equal((await migrationStartHandler(request({ body }), f.options)).status, 400);
    assert.deepEqual(f.reads, []);
  }
  for (const legacy of [
    { data: { xp: -1 }, revision: 1 },
    { data: { text: 'x'.repeat(65536) }, revision: 1 },
    { data: snapshot, revision: -1 },
    { data: snapshot, revision: 1.5 },
  ]) {
    const f = fixture({ legacy });
    assert.equal((await migrationStartHandler(request(), f.options)).status, 409);
    assert.deepEqual(f.operations, []);
  }
});

test('missing progress and storage failures return controlled no-store responses without tokens', async () => {
  for (const [config, status] of [
    [{ legacy: null }, 404],
    [{ failRead: true }, 503],
    [{ failCreate: true }, 503],
  ]) {
    const f = fixture(config);
    const result = await migrationStartHandler(request(), f.options);
    assert.equal(result.status, status);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal('token' in result.jsonBody, false);
    assert.equal(JSON.stringify(result).includes('private storage detail'), false);
    assert.deepEqual(f.operations, []);
  }
});

test('another authenticated identity cannot issue a proof for the first learner snapshot', async () => {
  const f = fixture();
  const getProgress = () => ({
    item(id, pk) {
      return {
        async read() {
          if (id !== 'test-owner:word-quest' || pk !== 'test-owner') {
            throw Object.assign(new Error('missing'), { code: 404 });
          }
          return { resource: { data: snapshot, revision: 1 } };
        },
      };
    },
  });
  const result = await migrationStartHandler(
    request({ identity: { ...principal, userId: 'other-learner' } }),
    { ...f.options, getProgress },
  );
  assert.equal(result.status, 404);
  assert.deepEqual(f.operations, []);
});
