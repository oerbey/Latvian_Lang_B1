/* eslint-env node */
const { app } = require('@azure/functions');
const { probeEnabled, readExternalAuthSettings } = require('../lib/external-auth');

async function authProbeConfigHandler(_request, { settings = process.env } = {}) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!probeEnabled(settings))
    return { status: 404, headers, jsonBody: { error: 'not available' } };
  try {
    const config = readExternalAuthSettings(settings);
    const authority = new URL(settings.EXTERNAL_AUTH_AUTHORITY);
    if (
      authority.protocol !== 'https:' ||
      !authority.hostname.endsWith('.ciamlogin.com') ||
      authority.username ||
      authority.password ||
      authority.search ||
      authority.hash ||
      authority.port
    ) {
      throw new Error('Invalid authority');
    }
    return {
      status: 200,
      headers,
      jsonBody: {
        authority: authority.href,
        // CIAM discovery returns a GUID issuer host for the tenant's named sign-in host.
        knownAuthorities: [...new Set([authority.hostname, new URL(config.issuer).hostname])],
        clientId: config.spaClientId,
        scope: `api://${config.audience}/${config.scope}`,
      },
    };
  } catch {
    return { status: 503, headers, jsonBody: { error: 'authentication test not configured' } };
  }
}

app.http('authProbeConfig', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: authProbeConfigHandler,
});
module.exports = { authProbeConfigHandler };
