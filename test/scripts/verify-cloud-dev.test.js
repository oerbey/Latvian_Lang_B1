import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_ORIGIN, verifyCloudDev } from '../../scripts/verify-cloud-dev.mjs';

function backend({ healthStatus = 200 } = {}) {
  const calls = [];
  return {
    calls,
    async fetchImpl(url, options) {
      calls.push({ url, options });
      assert.equal(new URL(url).origin, DEV_ORIGIN);
      const path = new URL(url).pathname;
      const responseStatus = path === '/api/health' ? healthStatus : 401;
      const body =
        path === '/api/health'
          ? { ok: true, service: 'llb1-api' }
          : { error: 'authentication required' };
      return new Response(JSON.stringify(body), {
        status: responseStatus,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}

test('dev verifier checks health and authentication gates without writing', async () => {
  const api = backend();
  const result = await verifyCloudDev({ fetchImpl: api.fetchImpl, report() {} });
  assert.equal(result.writesPerformed, false);
  assert.equal(api.calls.length, 3);
  assert.ok(api.calls.every(({ options }) => options.redirect === 'error'));
  assert.equal(api.calls.filter(({ options }) => options.method === 'POST').length, 1);
});

test('dev verifier stops after a failed health check', async () => {
  const api = backend({ healthStatus: 500 });
  await assert.rejects(verifyCloudDev({ fetchImpl: api.fetchImpl, report() {} }), /HTTP status/);
  assert.equal(api.calls.length, 1);
});
