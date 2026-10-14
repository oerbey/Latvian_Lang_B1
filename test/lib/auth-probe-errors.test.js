import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authProbeErrorSummary } from '../../src/lib/auth-probe-errors.js';

test('auth probe exposes only safe SDK and Entra codes', () => {
  assert.equal(
    authProbeErrorSummary({
      errorCode: 'invalid_grant',
      message: 'AADSTS65001: private@example.com callback=https://example/?code=private-token',
    }),
    ' (invalid_grant; AADSTS65001)',
  );
  assert.equal(authProbeErrorSummary({ errorCode: 'private-token', message: 'private-token' }), '');
  assert.equal(authProbeErrorSummary({ errorCode: 'state_not_found' }), ' (state_not_found)');
  assert.equal(authProbeErrorSummary(null), '');
});
