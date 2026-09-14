/* eslint-env node */
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseClientPrincipal } = require('../src/lib/auth');
const {
  MAX_PROGRESS_BYTES,
  validateSaveRequest,
  validateWordQuestState,
} = require('../src/lib/progress-validation');

function requestWithHeader(principal) {
  return {
    headers: new Map([
      ['x-ms-client-principal', Buffer.from(JSON.stringify(principal), 'utf8').toString('base64')],
    ]),
  };
}

test('parseClientPrincipal accepts only authenticated principals', () => {
  const principal = {
    identityProvider: 'aad',
    userId: 'user-1',
    userDetails: 'learner@example.com',
    userRoles: ['anonymous', 'authenticated'],
  };

  const request = requestWithHeader(principal);
  request.headers.get = request.headers.get.bind(request.headers);
  assert.deepEqual(parseClientPrincipal(request), {
    identityProvider: 'aad',
    userId: 'user-1',
  });

  const anonymousRequest = requestWithHeader({ ...principal, userRoles: ['anonymous'] });
  anonymousRequest.headers.get = anonymousRequest.headers.get.bind(anonymousRequest.headers);
  assert.equal(parseClientPrincipal(anonymousRequest), null);
});

test('parseClientPrincipal rejects missing and malformed headers', () => {
  assert.equal(parseClientPrincipal({ headers: new Map() }), null);
  assert.equal(
    parseClientPrincipal({
      headers: { get: () => Buffer.from('{not-json', 'utf8').toString('base64') },
    }),
    null,
  );
});

test('validateSaveRequest enforces the Word Quest contract and size limit', () => {
  const data = {
    schemaVersion: 1,
    xp: 10,
    level: 1,
    streak: 2,
    bestStreak: 3,
    totalCorrect: 4,
    totalWrong: 1,
    worlds: {},
  };

  assert.deepEqual(validateSaveRequest({ gameId: 'word-quest', data, expectedRevision: 0 }), {
    value: { gameId: 'word-quest', data, expectedRevision: 0 },
  });
  assert.match(validateSaveRequest({ gameId: 'other', data, expectedRevision: 0 }).error, /gameId/);
  assert.match(validateSaveRequest({ gameId: 'word-quest', data }).error, /expectedRevision/);
  assert.match(
    validateSaveRequest({ gameId: 'word-quest', data: { ...data, level: -1 }, expectedRevision: 0 })
      .error,
    /level/,
  );

  const oversized = { text: 'x'.repeat(MAX_PROGRESS_BYTES) };
  assert.match(validateWordQuestState(oversized), /exceeds/);
});
