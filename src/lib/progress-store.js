const ownerPattern = /^extid:[a-f0-9]{64}$/;

/** A single browser record keeps the snapshot and its pending revision together. */
export function openProgressStore(gameId, userId, storage, adapter, readLegacy) {
  if (userId !== null && (typeof userId !== 'string' || !ownerPattern.test(userId)))
    throw new TypeError('Invalid progress owner');
  const key = `llb1:progress:v1:${gameId}:${userId ?? 'guest'}`;
  let raw;
  const isCurrent = () => storage.getItem(key) === raw;

  function write(record) {
    // Avoid replacing a known newer local record from another tab, including on acknowledgement.
    if (!isCurrent()) return 'local-conflict';
    const next = JSON.stringify(record);
    storage.setItem(key, next);
    raw = next;
    return null;
  }

  return {
    isCurrent,
    write,
    read({ migrateLegacy = true } = {}) {
      raw = storage.getItem(key);
      if (raw === null) {
        const legacy = readLegacy?.(storage, userId);
        if (!legacy) return { data: adapter.createDefault(), revision: null, pending: false };
        const record = { ...legacy, data: adapter.normalize(legacy.data) };
        if (migrateLegacy && write(record)) throw new Error('Progress changed during migration');
        return record;
      }
      const record = JSON.parse(raw);
      if (
        !record?.data ||
        typeof record.pending !== 'boolean' ||
        !(
          record.revision === null ||
          (Number.isSafeInteger(record.revision) && record.revision >= 0)
        )
      )
        throw new TypeError('Invalid stored progress');
      return { ...record, data: adapter.normalize(record.data) };
    },
  };
}
