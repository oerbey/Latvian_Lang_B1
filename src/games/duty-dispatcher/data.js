/**
 * @file duty-dispatcher/data.js
 * Data loaders for the Duty Dispatcher game.
 *
 * Fetches roles, tasks, and i18n strings JSON via the shared assetUrl helper.
 * Uses no-store cache so content stays fresh between deploys.
 */

import { assetUrl } from '../../lib/paths.js';
async function fetchJSON(path) {
  const url = assetUrl(path);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  return res.json();
}

/**
 * Load roles dataset from JSON file.
 * @param {string} path
 * @returns {Promise<unknown>}
 */
export function loadRoles(path) {
  return fetchJSON(path);
}

/**
 * Load tasks dataset from JSON file.
 * @param {string} path
 * @returns {Promise<unknown>}
 */
export function loadTasks(path) {
  return fetchJSON(path);
}

/**
 * Load game UI strings (dutyDispatcher translation object).
 * Tries document language first, then falls back through [lang, 'lv', 'en'].
 * @returns {Promise<object>}
 */
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
