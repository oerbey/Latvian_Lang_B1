import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export const DEV_ORIGIN = 'https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net';

// This verifier is intentionally read-only. Authenticated save/restore tests must use
// a dedicated test account and the browser acceptance flow rather than a live CLI identity.
export async function verifyCloudDev({ fetchImpl = fetch, report = console.log } = {}) {
  async function request(path, options = {}, expectedStatus = 200) {
    const response = await fetchImpl(`${DEV_ORIGIN}${path}`, {
      ...options,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, expectedStatus, `${path}: unexpected HTTP status`);
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    if (/application\/json/i.test(contentType)) {
      return text ? JSON.parse(text) : null;
    }
    assert.equal(expectedStatus, 401, `${path}: expected a JSON response`);
    return null;
  }

  function assertAuthenticationBlocked(responseBody) {
    if (responseBody !== null) {
      assert.equal(responseBody.error, 'authentication required');
    }
  }

  const health = await request('/api/health');
  assert.equal(health.ok, true);
  assert.equal(health.service, 'llb1-api');
  report('PASS: dev API health');

  const unauthenticatedRead = await request('/api/getProgress?gameId=word-quest', {}, 401);
  assertAuthenticationBlocked(unauthenticatedRead);
  report('PASS: anonymous progress reads are blocked');

  const unauthenticatedSave = await request(
    '/api/saveProgress',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'word-quest',
        data: { schemaVersion: 1, level: 1, xp: 0, worlds: {} },
        expectedRevision: 0,
      }),
    },
    401,
  );
  assertAuthenticationBlocked(unauthenticatedSave);
  report('PASS: anonymous progress writes are blocked');

  report('PASS: read-only dev verification complete; no Cosmos records changed');
  return { origin: DEV_ORIGIN, writesPerformed: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyCloudDev().catch((error) => {
    console.error(`Dev verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
