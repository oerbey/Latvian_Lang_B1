const clone = (value) => JSON.parse(JSON.stringify(value));

async function loadEndings() {
  const url = new URL('../data/endings.json', import.meta.url).href;
  const fallback = typeof window !== 'undefined' ? window.__ENDINGS_DATA__ : undefined;

  if (typeof window !== 'undefined' && window.location?.protocol === 'file:' && fallback) {
    return clone(fallback);
  }

  try {
    const mod = await import(url, { assert: { type: 'json' } });
    return mod.default;
  } catch (err) {
    if (fallback) {
      console.warn('Using embedded endings data fallback.', err);
      return clone(fallback);
    }
    throw err;
  }
}

const ENDINGS = await loadEndings();

export function getEnding({ pos, schema, gram }) {
  const table = ENDINGS[pos]?.[schema];
  if (!table) return null;

  if (pos === 'nouns') {
    return table[gram.case]?.[gram.number] ?? null;
  }

  const key = `${gram.number}_${gram.gender}`;
  return table[gram.case]?.[key] ?? null;
}

export function getTable(pos, schema) {
  return ENDINGS[pos]?.[schema] ?? null;
}
