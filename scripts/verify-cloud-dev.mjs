import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const DEV_ORIGIN = 'https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net';

// Fixed dev destination: this diagnostic must never write to production.
// One unique document remains per run because the API has no delete endpoint.
export async function verifyCloudDev({ fetchImpl = fetch, report = console.log } = {}) {
  const userId = `integration-check-${randomUUID()}`;
  const gameId = 'integration-check';
  const id = `${userId}:${gameId}`;
  report(`Dev verification record: ${id}`);

  async function request(path, options = {}, expectedStatus = 200, allowEmpty = false) {
    const response = await fetchImpl(`${DEV_ORIGIN}${path}`, {
      ...options,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, expectedStatus, `${path}: unexpected HTTP status`);
    const text = await response.text();
    // The deployed Functions runtime omits the body for jsonBody: null.
    if (allowEmpty && text === '') {
      report('NOTE: missing record uses an empty HTTP 200 body');
      return null;
    }
    assert.match(response.headers.get('content-type') || '', /application\/json/i);
    return JSON.parse(text);
  }

  const health = await request('/api/health');
  assert.equal(health.ok, true);
  assert.equal(health.service, 'llb1-api');
  report('PASS: dev API health');

  await request('/api/getProgress', {}, 400);
  report('PASS: missing gameId rejected');

  const query = new URLSearchParams({ userId, gameId });
  const readPath = `/api/getProgress?${query}`;
  assert.equal(await request(readPath, {}, 200, true), null, 'Test record must not already exist');
  report('PASS: missing record returns null');

  for (const revision of [1, 2]) {
    const data = {
      purpose: 'Disposable dev integration verification',
      revision,
      marker: randomUUID(),
      sample: { xp: revision * 10, level: 1, text: 'āčēģīķļņšūž' },
    };
    const saved = await request('/api/saveProgress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, gameId, data }),
    });
    assert.equal(saved.ok, true);
    assert.equal(saved.item.id, id);
    assert.deepEqual(saved.item.data, data);
    const loaded = await request(readPath);
    assert.equal(loaded?.id, id);
    assert.equal(loaded.userId, userId);
    assert.equal(loaded.gameId, gameId);
    assert.deepEqual(loaded.data, data, 'Read must return the exact saved state');
    assert.ok(Number.isFinite(Date.parse(loaded.updatedAt)), 'Server timestamp required');
    report(`PASS: revision ${revision} saved and restored`);
  }

  report(`PASS: dev round trip complete. Retained disposable record: ${id}`);
  return { origin: DEV_ORIGIN, id, userId, gameId };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyCloudDev().catch((error) => {
    console.error(`Dev verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
