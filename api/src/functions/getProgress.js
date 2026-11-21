/* eslint-env node */
const { app } = require('@azure/functions');
const { requireExternalAccessToken } = require('../lib/external-auth');
const { getProgressContainer } = require('../lib/cosmos');
const { toPublicProgressItem } = require('../lib/progress-item');
const { getProgressDefinitions } = require('../lib/progress-definitions');

function progressResponse(item) {
  // Azure Functions treats jsonBody: null as no body; send literal JSON for a fresh account.
  return item === null
    ? { status: 200, body: 'null', headers: { 'Content-Type': 'application/json' } }
    : { status: 200, jsonBody: item };
}

async function getProgressHandler(request, dependencies = {}) {
  const { getContainer = getProgressContainer } = dependencies;
  const auth = await requireExternalAccessToken(request, dependencies);
  if (auth.response) return auth.response;

  const { userId } = auth.principal;
  const gameId = request.query.get('gameId');

  let definitions;
  try {
    definitions = await getProgressDefinitions();
  } catch {
    return { status: 503, jsonBody: { error: 'progress service unavailable' } };
  }
  if (!definitions.getAdapter(gameId)) {
    return {
      status: 400,
      jsonBody: { error: 'gameId is not enabled for cloud progress' },
    };
  }

  const id = `${userId}:${gameId}`;

  try {
    const { resource } = await getContainer().item(id, userId).read();

    return progressResponse(toPublicProgressItem(resource));
  } catch (err) {
    if (err.code === 404) {
      return progressResponse(null);
    }

    return {
      status: 503,
      jsonBody: { error: 'progress service unavailable' },
    };
  }
}

app.http('getProgress', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request) => {
    const response = await getProgressHandler(request);
    return { ...response, headers: { ...response.headers, 'Cache-Control': 'no-store' } };
  },
});

module.exports = {
  getProgressHandler,
};
