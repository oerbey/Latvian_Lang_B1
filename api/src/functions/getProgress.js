/* eslint-env node */
const { app } = require('@azure/functions');
const { getProgressContainer } = require('../lib/cosmos');

app.http('getProgress', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request) => {
    const userId = request.query.get('userId') || 'demo-user';
    const gameId = request.query.get('gameId');

    if (!gameId) {
      return {
        status: 400,
        jsonBody: { error: 'gameId is required' },
      };
    }

    const id = `${userId}:${gameId}`;

    try {
      const { resource } = await getProgressContainer().item(id, userId).read();

      return {
        status: 200,
        jsonBody: resource || null,
      };
    } catch (err) {
      if (err.code === 404) {
        return {
          status: 200,
          jsonBody: null,
        };
      }

      throw err;
    }
  },
});
