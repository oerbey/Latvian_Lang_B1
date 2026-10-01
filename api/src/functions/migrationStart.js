/* eslint-env node */
const { randomBytes, createHash } = require('node:crypto');
const { app } = require('@azure/functions');
const { requireClientPrincipal } = require('../lib/auth');
const { getProgressContainer, getAccountsContainer } = require('../lib/cosmos');
const { GAME_ID, isPlainObject, validateWordQuestState } = require('../lib/progress-validation');

const OLD_DEV_ORIGIN = 'https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net';

/** Issue a short-lived proof for a server-read snapshot; never persist the bearer token. */
async function migrationStartHandler(
  request,
  {
    settings = process.env,
    getProgress = getProgressContainer,
    getAccounts = getAccountsContainer,
    now = () => Date.now(),
    generateToken = () => randomBytes(32).toString('base64url'),
  } = {},
) {
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (status, jsonBody) => ({ status, headers, jsonBody });
  const auth = requireClientPrincipal(request);
  if (auth.response) return { ...auth.response, headers };

  // Fail closed even if a production or isolated-resource setting is enabled by mistake.
  if (
    settings.MIGRATION_ISSUANCE_ENABLED !== 'true' ||
    settings.COSMOS_PROGRESS_CONTAINER !== 'progress_dev' ||
    settings.COSMOS_ACCOUNTS_CONTAINER !== 'accounts_dev'
  ) {
    return reply(404, { error: 'migration unavailable' });
  }
  if (
    auth.principal.identityProvider !== 'aad' ||
    request.headers.get('origin') !== OLD_DEV_ORIGIN
  ) {
    return reply(403, { error: 'migration request not allowed' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return reply(400, { error: 'request body must be an empty JSON object' });
  }
  if (!isPlainObject(body) || Object.keys(body).length !== 0) {
    return reply(400, { error: 'request body must be an empty JSON object' });
  }

  try {
    const { userId } = auth.principal;
    let legacy;
    try {
      legacy = (await getProgress().item(`${userId}:${GAME_ID}`, userId).read()).resource;
    } catch (error) {
      if (error.code !== 404) throw error;
    }
    if (!legacy) return reply(404, { error: 'no saved cloud progress to migrate' });
    const sourceRevision = legacy.revision ?? 0;
    if (
      validateWordQuestState(legacy.data) ||
      !Number.isSafeInteger(sourceRevision) ||
      sourceRevision < 0
    ) {
      return reply(409, { error: 'saved cloud progress cannot be migrated' });
    }

    const token = generateToken();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const capturedAt = now();
    const createdAt = new Date(capturedAt).toISOString();
    const expiresAt = new Date(capturedAt + 15 * 60 * 1000).toISOString();
    const operation = {
      id: `migration:${tokenHash}`,
      pk: `migration:${tokenHash}`,
      type: 'migration',
      schemaVersion: 1,
      gameId: GAME_ID,
      snapshot: JSON.parse(JSON.stringify(legacy.data)),
      sourceRevision,
      createdAt,
      expiresAt,
      status: 'pending',
      attemptCount: 0,
      ttl: 60 * 60,
    };
    await getAccounts().items.create(operation);
    return reply(201, { token, createdAt, expiresAt });
  } catch {
    return reply(503, { error: 'migration service unavailable' });
  }
}

app.http('migrationStart', {
  route: 'migration/start',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: migrationStartHandler,
});

module.exports = { migrationStartHandler, OLD_DEV_ORIGIN };
