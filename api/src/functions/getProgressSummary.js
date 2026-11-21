/* eslint-env node */
const { app } = require('@azure/functions');
const { requireExternalAccessToken } = require('../lib/external-auth');
const { getProgressContainer } = require('../lib/cosmos');
const { getProgressDefinitions } = require('../lib/progress-definitions');

/** Derive summaries from canonical records within the verified learner's partition only. */
async function getProgressSummaryHandler(request, dependencies = {}) {
  const reply = (response) => ({ ...response, headers: { 'Cache-Control': 'no-store' } });
  const auth = await requireExternalAccessToken(request, dependencies);
  if (auth.response) return reply(auth.response);
  const { userId } = auth.principal;
  const { getContainer = getProgressContainer } = dependencies;
  let definitions;
  let resources;
  try {
    definitions = await getProgressDefinitions();
    ({ resources } = await getContainer()
      .items.query(
        {
          query:
            'SELECT c.id, c.userId, c.gameId, c.data, c.revision FROM c WHERE c.userId = @userId AND ARRAY_CONTAINS(@gameIds, c.gameId) AND c.id = CONCAT(@userId, ":", c.gameId)',
          parameters: [
            { name: '@userId', value: userId },
            { name: '@gameIds', value: definitions.gameIds },
          ],
        },
        { partitionKey: userId, maxItemCount: definitions.gameIds.length },
      )
      .fetchAll());
    if (!Array.isArray(resources)) throw new Error('Invalid progress result');
  } catch {
    return reply({ status: 503, jsonBody: { error: 'progress service unavailable' } });
  }
  // Defense in depth: never project a mismatched owner or non-canonical record.
  const records = new Map(
    resources
      .filter((item) => item && item.userId === userId && item.id === `${userId}:${item.gameId}`)
      .map((item) => [item.gameId, item]),
  );
  const exercises = definitions.exercises.map((exercise) => {
    const entry = {
      gameId: exercise.id,
      tracking: exercise.tracking,
      status: 'not-connected',
      summary: null,
    };
    const adapter = definitions.getAdapter(exercise.id);
    if (!adapter) return entry;
    const record = records.get(exercise.id);
    if (!record) return { ...entry, status: 'not-started' };
    try {
      if (!Number.isSafeInteger(record.revision) || record.revision < 1)
        throw new Error('Invalid revision');
      return {
        ...entry,
        status: 'saved',
        summary: adapter.summarize(record.data, definitions.contexts[exercise.id]),
      };
    } catch {
      return { ...entry, status: 'unavailable' };
    }
  });
  return reply({ status: 200, jsonBody: { userId, exercises } });
}

app.http('getProgressSummary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request) => ({
    ...(await getProgressSummaryHandler(request)),
    headers: { 'Cache-Control': 'no-store' },
  }),
});

module.exports = { getProgressSummaryHandler };
