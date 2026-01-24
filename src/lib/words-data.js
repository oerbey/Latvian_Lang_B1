import { assetUrl } from './paths.js';

const INDEX_PATH = 'data/words/index.json';

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  return res.json();
}

function getFallback() {
  if (typeof window === 'undefined') return null;
  return Array.isArray(window.__LATVIAN_WORDS__) ? window.__LATVIAN_WORDS__ : null;
}

export async function loadWords({ cache = 'force-cache' } = {}) {
  try {
    const indexUrl = assetUrl(INDEX_PATH);
    const index = await fetchJson(indexUrl, { cache });
    const chunks = Array.isArray(index?.chunks) ? index.chunks : [];
    if (!chunks.length) {
      throw new Error('No word chunks listed in index.');
    }
    const responses = await Promise.all(
      chunks.map((chunkPath) => fetch(assetUrl(chunkPath), { cache })),
    );
    const payloads = await Promise.all(
      responses.map((res, idx) => {
        if (!res.ok) {
          throw new Error(`Failed to load ${chunks[idx]}: ${res.status}`);
        }
        return res.json();
      }),
    );
    const items = payloads.flat().filter((item) => item && typeof item === 'object');
    return { items, usingFallback: false };
  } catch (err) {
    const fallback = getFallback();
    if (fallback) {
      console.warn('words index fetch failed; using embedded fallback dataset.', err);
      return { items: fallback, usingFallback: true };
    }
    throw err;
  }
}
