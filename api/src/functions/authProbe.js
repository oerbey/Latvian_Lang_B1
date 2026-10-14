/* eslint-env node */
const { app } = require('@azure/functions');
const { probeEnabled, requireExternalAccessToken } = require('../lib/external-auth');

/** Temporary Dev-only authentication check; never reads/writes progress or exposes claims. */
async function authProbeHandler(request, dependencies = {}) {
  const settings = dependencies.settings || process.env;
  const headers = { 'Cache-Control': 'no-store' };
  if (!probeEnabled(settings)) {
    return { status: 404, headers, jsonBody: { error: 'not available' } };
  }
  const auth = await requireExternalAccessToken(request, dependencies);
  // Diagnostic codes are exposed only behind the Dev probe guard, never claim values.
  if (auth.response) {
    return {
      ...auth.response,
      headers,
      jsonBody: { ...auth.response.jsonBody, code: auth.reason },
    };
  }
  return { status: 200, headers, jsonBody: { ok: true } };
}

app.http('authProbe', { methods: ['GET'], authLevel: 'anonymous', handler: authProbeHandler });

module.exports = { authProbeHandler };
