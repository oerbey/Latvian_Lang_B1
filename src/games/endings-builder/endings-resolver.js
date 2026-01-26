import { assetUrl } from '../../lib/paths.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

async function loadEndings() {
  const fileUrl = new URL('../../../data/endings-builder/tables.json', import.meta.url);
  const fallback = typeof window !== 'undefined' ? window.__ENDINGS_DATA__ : undefined;

  if (typeof window !== 'undefined' && window.location?.protocol === 'file:' && fallback) {
    return clone(fallback);
  }

  const isNode = typeof globalThis !== 'undefined' && globalThis.process?.versions?.node;
  if (!fallback && isNode) {
    try {
      const [{ readFile }, { fileURLToPath }] = await Promise.all([
        import('node:fs/promises'),
        import('node:url'),
      ]);
      const raw = await readFile(fileURLToPath(fileUrl), 'utf8');
      return JSON.parse(raw);
    } catch (fsErr) {
      console.warn('Failed reading endings tables from filesystem fallback.', fsErr);
    }
  }

  if (typeof fetch === 'function') {
    try {
      const url = assetUrl('data/endings-builder/tables.json');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed loading endings tables via fetch.', err);
    }
  }

  if (fallback) {
    console.warn('Using embedded endings data fallback.');
    return clone(fallback);
  }
  throw new Error('Failed to load endings tables.');
}

let ENDINGS = {};
try {
  ENDINGS = await loadEndings();
} catch (err) {
  console.error('Failed to load endings tables.', err);
  ENDINGS = {};
}

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
