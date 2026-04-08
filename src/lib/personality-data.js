/**
 * personality-data.js — Loader for personality / character-traits vocabulary.
 * ===========================================================================
 * Fetches and validates data/personality/words.json for use by the
 * character-traits and rakstura-ipasibas games.
 *
 * Exports:
 *   loadPersonalityWords() — Returns a validated array of {id, lv, en, enVariants, group} entries.
 */
import { assetUrl } from './paths.js';

/**
 * Parse English variant forms separated by ';' or ' / '.
 * Returns normalized array of trimmed non-empty values.
 * @param {unknown} value
 * @returns {string[]}
 */
function parseEnVariants(value) {
  if (typeof value !== 'string') return [];
  const parts = value.includes(';') ? value.split(';') : value.split(' / ');
  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * Normalize English variants into single string with " / " separator.
 * @param {unknown} value
 * @returns {string}
 */
function normalizeEn(value) {
  const parts = parseEnVariants(value);
  return parts.join(' / ');
}

/**
 * Load personality vocabulary from JSON.
 * Parses and validates entries; requires id, lv, en, and group fields.
 * Throws if no valid entries found.
 * @returns {Promise<Array>}
 */
export async function loadPersonalityWords() {
  const url = assetUrl('data/personality/words.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const payload = await res.json();
  const source = Array.isArray(payload) ? payload : [];
  const rows = source
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const lv = typeof item.lv === 'string' ? item.lv.trim() : '';
      const rawEn = typeof item.en === 'string' ? item.en : '';
      const en = normalizeEn(rawEn);
      if (!id || !lv || !en) return null;
      const enVariants = parseEnVariants(en);
      return {
        id,
        lv,
        en,
        enVariants,
        group: typeof item.group === 'string' ? item.group.trim().toLowerCase() : '',
        notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      };
    })
    .filter(Boolean);
  if (!rows.length) throw new Error('Dati nav atrasti.');
  return rows;
}
