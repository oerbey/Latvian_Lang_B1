import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_ORIGIN, verifyCloudDev } from '../../scripts/verify-cloud-dev.mjs';

function backend({ staleRead = false, status = 200 } = {}) {
  let item = null;
  let firstItem;
  const calls = [];
  return {
    calls,
    async fetchImpl(url, options) {
      calls.push({ url, options });
      assert.equal(new URL(url).origin, DEV_ORIGIN);
      const path = new URL(url).pathname;
      let body;
      let responseStatus = status;
      if (path === '/api/health') body = { ok: true, service: 'llb1-api' };
      else if (path === '/api/saveProgress') {
        const payload = JSON.parse(options.body);
        item = {
          ...payload,
          id: `${payload.userId}:${payload.gameId}`,
          updatedAt: new Date().toISOString(),
        };
        firstItem ||= item;
        body = { ok: true, item };
      } else if (!new URL(url).searchParams.has('gameId')) {
        responseStatus = 400;
        body = { error: 'gameId is required' };
      } else body = staleRead ? firstItem || null : item;
      return new Response(JSON.stringify(body), {
        status: responseStatus,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}

test('dev verifier checks missing records, creates and updates an isolated record', async () => {
  const api = backend();
  const result = await verifyCloudDev({ fetchImpl: api.fetchImpl, report() {} });
  assert.match(result.userId, /^integration-check-/);
  assert.equal(api.calls.length, 7);
  assert.equal(api.calls.filter(({ options }) => options.method === 'POST').length, 2);
  assert.ok(api.calls.every(({ options }) => options.redirect === 'error'));
});

test('dev verifier fails if a read returns an earlier revision', async () => {
  await assert.rejects(
    verifyCloudDev({ fetchImpl: backend({ staleRead: true }).fetchImpl, report() {} }),
    /Read must return the exact saved state/,
  );
});

test('dev verifier stops before writing when health fails', async () => {
  const api = backend({ status: 500 });
  await assert.rejects(verifyCloudDev({ fetchImpl: api.fetchImpl, report() {} }), /HTTP status/);
  assert.equal(api.calls.length, 1);
});

test('dev verifier tolerates an empty missing record but rejects an empty saved record', async () => {
  const api = backend();
  let reads = 0;
  const fetchImpl = async (url, options) => {
    if (new URL(url).pathname === '/api/getProgress' && new URL(url).searchParams.has('gameId')) {
      reads++;
      return new Response(null, { status: 200 });
    }
    return api.fetchImpl(url, options);
  };
  await assert.rejects(verifyCloudDev({ fetchImpl, report() {} }), /application/);
  assert.equal(reads, 2);
  assert.equal(api.calls.filter(({ options }) => options.method === 'POST').length, 1);
});
