/* eslint-env node */
const { app } = require('@azure/functions');
const { requireClientPrincipal } = require('../lib/auth');
const { getProgressContainer } = require('../lib/cosmos');
const { toPublicProgressItem } = require('../lib/progress-item');
const { GAME_ID } = require('../lib/progress-validation');

async function getProgressHandler(request, { getContainer = getProgressContainer } = {}) {
  const auth = requireClientPrincipal(request);
  if (auth.response) return auth.response;

  const { userId } = auth.principal;
  const gameId = request.query.get('gameId');

  if (gameId !== GAME_ID) {
    return {
      status: 400,
      jsonBody: { error: `gameId must be ${GAME_ID}` },
    };
  }

  const id = `${userId}:${gameId}`;

  try {
    const { resource } = await getContainer().item(id, userId).read();

    return {
      status: 200,
      jsonBody: toPublicProgressItem(resource),
    };
  } catch (err) {
    if (err.code === 404) {
      return {
        status: 200,
        jsonBody: null,
      };
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
  handler: getProgressHandler,
});

module.exports = {
  getProgressHandler,
};
