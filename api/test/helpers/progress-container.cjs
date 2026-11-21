function createProgressContainer() {
  const records = new Map();
  const calls = [];
  const error = (code) => Object.assign(new Error('Synthetic storage failure'), { code });
  return {
    records,
    calls,
    item(id, partitionKey) {
      calls.push({ operation: 'item', id, partitionKey });
      const key = `${partitionKey}:${id}`;
      return {
        async read() {
          if (!records.has(key)) throw error(404);
          return { resource: structuredClone(records.get(key)) };
        },
        async replace(resource, options) {
          calls.push({ operation: 'replace', options });
          if (
            options?.accessCondition?.type !== 'IfMatch' ||
            options.accessCondition.condition !== records.get(key)?._etag
          )
            throw error(412);
          records.set(key, structuredClone({ ...resource, _etag: `etag-${resource.revision}` }));
        },
      };
    },
    items: {
      async create(resource) {
        const key = `${resource.userId}:${resource.id}`;
        if (records.has(key)) throw error(409);
        records.set(key, structuredClone({ ...resource, _etag: `etag-${resource.revision}` }));
      },
      query(spec, options) {
        calls.push({ operation: 'query', spec, options });
        const owner = spec.parameters.find(({ name }) => name === '@userId').value;
        const games = spec.parameters.find(({ name }) => name === '@gameIds').value;
        return {
          fetchAll: async () => ({
            resources: [...records.values()]
              .filter(
                (item) =>
                  item.userId === options.partitionKey &&
                  item.userId === owner &&
                  games.includes(item.gameId) &&
                  item.id === `${owner}:${item.gameId}`,
              )
              .map((item) => structuredClone(item)),
          }),
        };
      },
    },
  };
}

module.exports = { createProgressContainer };
