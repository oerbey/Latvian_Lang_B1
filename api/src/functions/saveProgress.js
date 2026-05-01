/* eslint-env node */
const { app } = require('@azure/functions');
const { getProgressContainer } = require('../lib/cosmos');

app.http('saveProgress', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request) => {
    const body = await request.json();

    const userId = body.userId || 'demo-user';
    const gameId = body.gameId;
    const data = body.data || {};

    if (!gameId) {
      return {
        status: 400,
        jsonBody: { error: 'gameId is required' },
      };
    }

    const item = {
      id: `${userId}:${gameId}`,
      userId,
      gameId,
      data,
      updatedAt: new Date().toISOString(),
    };

    await getProgressContainer().items.upsert(item);

    return {
      status: 200,
      jsonBody: {
        ok: true,
        item,
      },
    };
  },
});
