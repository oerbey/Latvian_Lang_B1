/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');
const { HttpResponse } = require('@azure/functions');
const { getProgressHandler } = require('../src/functions/getProgress');
const { saveProgressHandler } = require('../src/functions/saveProgress');
const { getProgressSummaryHandler } = require('../src/functions/getProgressSummary');
const { getProgressDefinitions } = require('../src/lib/progress-definitions');
const { validateSaveRequest, MAX_PROGRESS_BYTES } = require('../src/lib/progress-validation');
const { createProgressContainer } = require('./helpers/progress-container.cjs');
const { identity } = require('./helpers/external-identity.cjs');
const matchingFixture = require('../../test/fixtures/progress/darbibas-vards.json');
const questFixture = require('../../test/fixtures/progress/word-quest.json');
let learner;
let other;
let definitions;

test.before(async () => {
  learner = await identity();
  other = await identity('55555555-5555-4555-8555-555555555555');
  definitions = await getProgressDefinitions();
});

function request({
  gameId = 'darbibas-vards',
  data = matchingFixture,
  expectedRevision = 0,
  principal = learner,
  extra = {},
} = {}) {
  return {
    headers: new Headers({ 'X-Latvian-Authorization': `Bearer ${principal.token}` }),
    query: new URLSearchParams({ gameId, userId: other.userId }),
    json: async () => ({ gameId, data, expectedRevision, ...extra }),
  };
}

function dependencies(container) {
  return { ...learner.dependencies, getContainer: () => container };
}

test('matching progress saves and restores independently for two games and two verified owners', async () => {
  const container = createProgressContainer();
  const deps = dependencies(container);
  for (const options of [
    { extra: { userId: other.userId, identityProvider: 'forged', ownershipSchemaVersion: 99 } },
    { gameId: 'word-quest', data: questFixture },
    { principal: other, data: { ...matchingFixture, currentBoard: null } },
  ])
    assert.equal((await saveProgressHandler(request(options), deps)).status, 200);
  assert.equal(container.records.size, 3);
  const matching = await getProgressHandler(request(), deps);
  assert.deepEqual(matching.jsonBody.data, matchingFixture);
  assert.equal(matching.jsonBody.userId, learner.userId);
  assert.equal(matching.jsonBody.gameId, 'darbibas-vards');
  assert.equal(matching.jsonBody.revision, 1);
  assert.equal(matching.jsonBody._etag, undefined);
  assert.equal(matching.jsonBody.identityProvider, undefined);
  const record = container.records.get(`${learner.userId}:${learner.userId}:darbibas-vards`);
  assert.equal(record.ownershipSchemaVersion, 2);
  assert.equal(record.identityProvider, 'external-id');
  assert.deepEqual(
    (await getProgressHandler(request({ gameId: 'word-quest' }), deps)).jsonBody.data,
    questFixture,
  );
  assert.equal(
    (await getProgressHandler(request({ principal: other }), deps)).jsonBody.data.currentBoard,
    null,
  );
  assert.equal(
    await new HttpResponse(
      await getProgressHandler(request({ gameId: 'word-quest', principal: other }), deps),
    ).json(),
    null,
  );
  for (const call of container.calls.filter(({ operation }) => operation === 'item')) {
    assert.ok(call.id.startsWith(`${call.partitionKey}:`));
  }
});

test('unsupported games and malformed matching snapshots are rejected before storage', async () => {
  const deps = {
    ...learner.dependencies,
    getContainer: () => assert.fail('Invalid requests must not access Cosmos'),
  };
  for (const gameId of ['other', 'form-factory-v3', '__proto__', '../word-quest']) {
    assert.equal((await getProgressHandler(request({ gameId }), deps)).status, 400);
    assert.equal((await saveProgressHandler(request({ gameId }), deps)).status, 400);
  }
  for (const data of [
    {},
    null,
    [],
    questFixture,
    { ...matchingFixture, schemaVersion: 2 },
    { ...matchingFixture, settings: { ...matchingFixture.settings, boardSize: 99 } },
    { ...matchingFixture, stats: { word: { correct: -1, incorrect: 0, lastSeen: 0 } } },
    { ...matchingFixture, currentBoard: { itemIds: ['a'], matchedIds: ['b'], wrong: 0 } },
    { ...matchingFixture, padding: 'ā'.repeat(256 * 1024) },
  ])
    assert.equal((await saveProgressHandler(request({ data }), deps)).status, 400);
  for (const expectedRevision of [undefined, -1, 0.5, '1']) {
    const body = { gameId: 'darbibas-vards', data: matchingFixture, expectedRevision };
    assert.match((await validateSaveRequest(body)).error, /expectedRevision/);
  }
});

test('Word Quest retains its existing optional fields, schema handling and size limit', async () => {
  assert.equal(MAX_PROGRESS_BYTES, definitions.getAdapter('word-quest').maxBytes);
  const container = createProgressContainer();
  const data = { xp: 12, schemaVersion: 0, extension: { keep: true } };
  const saved = await saveProgressHandler(
    request({ gameId: 'word-quest', data }),
    dependencies(container),
  );
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.jsonBody.item.data, data);
  assert.deepEqual(
    (await getProgressHandler(request({ gameId: 'word-quest' }), dependencies(container))).jsonBody
      .data,
    data,
  );
  assert.equal(
    (
      await validateSaveRequest({
        gameId: 'word-quest',
        data: { xp: 1, padding: 'x'.repeat(MAX_PROGRESS_BYTES) },
        expectedRevision: 0,
      })
    ).error.includes('exceeds'),
    true,
  );
});

test('ETag races return conflicts without losing or overwriting a newer exercise snapshot', async () => {
  const container = createProgressContainer();
  const deps = dependencies(container);
  assert.equal((await saveProgressHandler(request(), deps)).status, 200);
  const item = container.item.bind(container);
  let readers = 0;
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  container.item = (...args) => {
    const document = item(...args);
    return {
      ...document,
      read: async () => {
        const result = await document.read();
        if (++readers === 2) release();
        await ready;
        return result;
      },
    };
  };
  const results = await Promise.all([
    saveProgressHandler(request({ expectedRevision: 1 }), deps),
    saveProgressHandler(
      request({ expectedRevision: 1, data: { ...matchingFixture, currentBoard: null } }),
      deps,
    ),
  ]);
  assert.deepEqual(results.map(({ status }) => status).sort(), [200, 409]);
  assert.equal([...container.records.values()][0].revision, 2);
  const updates = container.calls.filter(({ operation }) => operation === 'replace');
  assert.equal(updates.length, 2);
  assert.ok(updates.every(({ options }) => options.accessCondition.type === 'IfMatch'));
});

test('summaries use only the verified partition, derive metrics and omit raw learning/ownership metadata', async () => {
  const container = createProgressContainer();
  const deps = dependencies(container);
  const ids = definitions.contexts['darbibas-vards'].itemIds;
  const data = {
    ...matchingFixture,
    stats: {
      [ids[0]]: { correct: 3, incorrect: 1, lastSeen: 1794650400000 },
      [ids[1]]: { correct: 0, incorrect: 2, lastSeen: 1794650460000 },
    },
    summary: { attempts: 99999, accuracy: 100 },
  };
  await saveProgressHandler(request({ data }), deps);
  await saveProgressHandler(request({ gameId: 'word-quest', data: questFixture }), deps);
  await saveProgressHandler(
    request({ principal: other, gameId: 'word-quest', data: { ...questFixture, xp: 98765 } }),
    deps,
  );
  const response = await getProgressSummaryHandler(request(), deps);
  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  const payload = await new HttpResponse(response).json();
  assert.equal(payload.userId, learner.userId);
  assert.equal(payload.exercises.length, definitions.exercises.length);
  const verbs = payload.exercises.find(({ gameId }) => gameId === 'darbibas-vards');
  assert.deepEqual(verbs, {
    gameId: 'darbibas-vards',
    tracking: 'cloud',
    status: 'saved',
    summary: {
      attempts: 6,
      correct: 3,
      accuracy: 50,
      lastPlayedAt: '2026-11-14T10:01:00.000Z',
      wordsPractised: 2,
      coverage: { practised: 2, total: ids.length },
    },
  });
  const quest = payload.exercises.find(({ gameId }) => gameId === 'word-quest');
  assert.equal(quest.summary.xp, 125);
  assert.deepEqual(quest.summary.completion, { completed: 3, total: 49 });
  assert.equal(quest.summary.lastPlayedAt, null);
  const otherSummary = await getProgressSummaryHandler(request({ principal: other }), deps);
  assert.equal(otherSummary.jsonBody.userId, other.userId);
  assert.equal(
    otherSummary.jsonBody.exercises.find(({ gameId }) => gameId === 'word-quest').summary.xp,
    98765,
  );
  assert.equal(
    otherSummary.jsonBody.exercises.find(({ gameId }) => gameId === 'darbibas-vards').status,
    'not-started',
  );
  assert.ok(
    payload.exercises
      .filter(({ gameId }) => !definitions.gameIds.includes(gameId))
      .every(({ status, summary }) => status === 'not-connected' && summary === null),
  );
  const query = container.calls.find(({ operation }) => operation === 'query');
  assert.equal(query.options.partitionKey, learner.userId);
  assert.equal(query.options.maxItemCount, definitions.gameIds.length);
  assert.deepEqual(query.spec.parameters, [
    { name: '@userId', value: learner.userId },
    { name: '@gameIds', value: definitions.gameIds },
  ]);
  assert.match(query.spec.query, /c\.userId = @userId/);
  assert.match(query.spec.query, /c\.id = CONCAT/);
  for (const privateField of [
    'stats',
    'currentBoard',
    'worlds',
    'identityProvider',
    'ownershipSchemaVersion',
    '_etag',
    other.userId,
    '98765',
  ]) {
    assert.equal(JSON.stringify(payload).includes(privateField), false, privateField);
  }
});

test('V2 progress round-trips independently and summarizes only learner metrics', async () => {
  const gameId = 'darbibas-vardi-v2';
  const adapter = definitions.getAdapter(gameId);
  const deps = dependencies(createProgressContainer());
  const data = adapter.createDefault();
  data.records['būt'] = { box: 4, dueAt: 1000, seen: 4, correct: 4, wrong: 0 };
  data.xp = 60;
  data.bestStreak = 4;
  data.lastAnswerISO = '2026-11-20T08:00:00.000Z';
  data.checkpoint = {
    queue: ['iet'],
    retried: [],
    review: {},
    answered: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    xp: 0,
  };
  assert.equal((await saveProgressHandler(request({ gameId, data }), deps)).status, 200);
  assert.deepEqual((await getProgressHandler(request({ gameId }), deps)).jsonBody.data, data);
  const freshDevice = await getProgressSummaryHandler(request(), deps);
  const result = freshDevice.jsonBody.exercises.find((entry) => entry.gameId === gameId);
  assert.equal(result.status, 'saved');
  assert.deepEqual(result.summary, {
    attempts: 4,
    correct: 4,
    accuracy: 100,
    lastPlayedAt: data.lastAnswerISO,
    mastery: { mastered: 1, total: definitions.contexts[gameId].itemIds.length },
    xp: 60,
    bestStreak: 4,
  });
  const otherAccount = await getProgressSummaryHandler(request({ principal: other }), deps);
  assert.equal(
    otherAccount.jsonBody.exercises.find((entry) => entry.gameId === gameId).status,
    'not-started',
  );
});

test('summary distinguishes missing records, invalid saved data, unsupported schemas and storage outages', async () => {
  const container = createProgressContainer();
  const deps = dependencies(container);
  const fresh = await getProgressSummaryHandler(request(), deps);
  assert.ok(
    fresh.jsonBody.exercises
      .filter(({ gameId }) => definitions.gameIds.includes(gameId))
      .every(({ status, summary }) => status === 'not-started' && summary === null),
  );
  await saveProgressHandler(request(), deps);
  await saveProgressHandler(request({ gameId: 'word-quest', data: questFixture }), deps);
  const key = `${learner.userId}:${learner.userId}:word-quest`;
  container.records.get(key).data.schemaVersion = 2;
  const partial = await getProgressSummaryHandler(request(), deps);
  assert.equal(partial.status, 200);
  assert.equal(
    partial.jsonBody.exercises.find(({ gameId }) => gameId === 'word-quest').status,
    'unavailable',
  );
  assert.equal(
    partial.jsonBody.exercises.find(({ gameId }) => gameId === 'darbibas-vards').status,
    'saved',
  );
  assert.equal(container.records.get(key).data.schemaVersion, 2);
  for (const failing of [
    () => {
      throw new Error('Secret config unavailable');
    },
    () => ({
      items: {
        query: () => ({
          fetchAll: async () => {
            throw new Error('Private database details');
          },
        }),
      },
    }),
  ]) {
    assert.deepEqual(
      await getProgressSummaryHandler(request(), { ...deps, getContainer: failing }),
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
        jsonBody: { error: 'progress service unavailable' },
      },
    );
  }
});

test('summary cannot expose a mismatched owner or non-canonical record from an unexpected storage response', async () => {
  const response = await getProgressSummaryHandler(request(), {
    ...learner.dependencies,
    getContainer: () => ({
      items: {
        query: () => ({
          fetchAll: async () => ({
            resources: [
              {
                id: `${other.userId}:word-quest`,
                userId: other.userId,
                gameId: 'word-quest',
                data: questFixture,
              },
              {
                id: 'non-canonical',
                userId: learner.userId,
                gameId: 'darbibas-vards',
                data: matchingFixture,
              },
            ],
          }),
        }),
      },
    }),
  });
  assert.equal(response.status, 200);
  assert.ok(response.jsonBody.exercises.every(({ summary }) => summary === null));
});

test('all progress endpoints reject anonymous, legacy-only and wrong-scope identities before storage', async () => {
  const forbidden = await identity(undefined, { scp: 'other.scope' });
  for (const handler of [getProgressHandler, saveProgressHandler, getProgressSummaryHandler]) {
    for (const headers of [new Headers(), new Headers({ 'x-ms-client-principal': 'forged' })]) {
      assert.equal(
        (
          await handler(
            { ...request(), headers },
            {
              ...learner.dependencies,
              getContainer: () => assert.fail('Anonymous storage access'),
            },
          )
        ).status,
        401,
      );
    }
    assert.equal(
      (
        await handler(request({ principal: forbidden }), {
          ...learner.dependencies,
          getContainer: () => assert.fail('Forbidden storage access'),
        })
      ).status,
      403,
    );
  }
});
