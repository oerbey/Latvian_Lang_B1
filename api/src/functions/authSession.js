/* eslint-env node */
const { app } = require('@azure/functions');
const { requireExternalAccessToken } = require('../lib/external-auth');

/** Return only the server-derived owner key used for local namespaces; no identity claims. */
async function authSessionHandler(request, dependencies = {}) {
  const headers = { 'Cache-Control': 'no-store' };
  const auth = await requireExternalAccessToken(request, dependencies);
  if (auth.response) return { ...auth.response, headers };
  return { status: 200, headers, jsonBody: { userId: auth.principal.userId } };
}

app.http('authSession', { methods: ['GET'], authLevel: 'anonymous', handler: authSessionHandler });

module.exports = { authSessionHandler };
