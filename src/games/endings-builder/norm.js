/**
 * @file endings-builder/norm.js
 * Latvian-aware text normalisation for answer comparison.
 *
 * Exports:
 *  - norm(s)          — NFC + lowercase using 'lv' locale.
 *  - fold(s)          — norm + strip diacritics (ā→a, š→s, etc.).
 *  - equalsLoose(a,b) — compare two strings ignoring diacritics.
 */

const FALLBACK_MAP = {
  ā: 'a',
  ē: 'e',
  ī: 'i',
  ū: 'u',
  č: 'c',
  ģ: 'g',
  ķ: 'k',
  ļ: 'l',
  ņ: 'n',
  š: 's',
  ž: 'z',
};

export const norm = (s = '') => s.normalize('NFC').toLocaleLowerCase('lv');

export const fold = (s = '') => norm(s).replace(/[āēīūčģķļņšž]/g, (ch) => FALLBACK_MAP[ch] || ch);

export function equalsLoose(a, b) {
  return fold(a) === fold(b);
}
