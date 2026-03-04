/**
 * @file decl6-detective/data.js
 * Data loaders for the 6th Declension Detective game.
 *
 * Exports:
 *  - loadTranslations(defaultStrings) — fetches i18n strings for the game UI.
 *  - loadItems(path) — fetches the noun items JSON for the current scene.
 */

import { assetUrl } from '../../lib/paths.js';

export async function loadTranslations(defaultStrings) {
  const candidates = [navigator.language?.slice(0, 2), 'lv', 'en'].filter(Boolean);
  for (const code of candidates) {
    try {
      const url = assetUrl(`i18n/${code}.json`);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }
      const payload = await response.json();
      if (!payload?.decl6Detective) {
        throw new Error(`Missing decl6Detective strings in ${url}`);
      }
      return { strings: { ...defaultStrings, ...payload.decl6Detective }, lang: code };
    } catch (err) {
      console.warn('Unable to load decl6 translations for', code, err);
    }
  }
  return { strings: { ...defaultStrings }, lang: 'lv' };
}

export async function loadItems(path) {
  const url = assetUrl(path);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
}
