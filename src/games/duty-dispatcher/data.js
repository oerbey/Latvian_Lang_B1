import { assetUrl } from '../../lib/paths.js';

async function fetchJSON(path) {
  const url = assetUrl(path);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  return res.json();
}

export function loadRoles(path) {
  return fetchJSON(path);
}

export function loadTasks(path) {
  return fetchJSON(path);
}

export async function loadStrings() {
  const lang = document.documentElement?.lang?.split('-')?.[0]?.toLowerCase() || 'lv';
  const fallback = lang === 'lv' ? ['lv', 'en'] : [lang, 'lv', 'en'];
  for (const code of fallback) {
    try {
      const payload = await fetchJSON(`i18n/${code}.json`);
      if (payload?.dutyDispatcher) return payload.dutyDispatcher;
      throw new Error(`Missing dutyDispatcher strings for ${code}`);
    } catch {
      // continue
    }
  }
  return {};
}
