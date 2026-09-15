/* eslint-env node */
const { app } = require('@azure/functions');
const { requireClientPrincipal } = require('../lib/auth');
const { getProgressContainer } = require('../lib/cosmos');
const { toPublicProgressItem } = require('../lib/progress-item');
const { createProgressOwnership } = require('../lib/progress-ownership');
const { validateSaveRequest } = require('../lib/progress-validation');

async function saveProgressHandler(request, { getContainer = getProgressContainer } = {}) {
  const auth = requireClientPrincipal(request);
  if (auth.response) return auth.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'request body must be valid JSON' },
    };
  }

  const validation = validateSaveRequest(body);
  if (validation.error) {
    return {
      status: 400,
      jsonBody: { error: validation.error },
    };
  }

  const ownership = createProgressOwnership(auth.principal);
  const { userId } = ownership;
  const { gameId, data, expectedRevision } = validation.value;
  let container;
  try {
    container = getContainer();
  } catch {
    return {
      status: 503,
      jsonBody: { error: 'progress service unavailable' },
    };
  }
  const id = `${userId}:${gameId}`;
  const document = container.item(id, userId);
  let current = null;

  try {
    current = (await document.read()).resource || null;
  } catch (err) {
    if (err.code !== 404) {
      return {
        status: 503,
        jsonBody: { error: 'progress service unavailable' },
      };
    }
  }

  const currentRevision = Number.isInteger(current?.revision) ? current.revision : 0;
  if (expectedRevision !== currentRevision) {
    return {
      status: 409,
      jsonBody: { error: 'progress conflict', current: toPublicProgressItem(current) },
    };
  }

  const item = {
    id,
    ...ownership,
    gameId,
    data,
    revision: currentRevision + 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (current) {
      await document.replace(item, {
        accessCondition: { type: 'IfMatch', condition: current._etag },
      });
    } else {
      await container.items.create(item);
    }
  } catch (err) {
    if (err.code === 409 || err.code === 412) {
      return {
        status: 409,
        jsonBody: { error: 'progress conflict' },
      };
    }
    return {
      status: 503,
      jsonBody: { error: 'progress service unavailable' },
    };
  }

  return {
    status: 200,
    jsonBody: {
      ok: true,
      item: toPublicProgressItem(item),
    },
  };
}

app.http('saveProgress', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: saveProgressHandler,
});

module.exports = {
  saveProgressHandler,
};
