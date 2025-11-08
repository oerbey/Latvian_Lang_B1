const FALLBACK_MAP = {
  'ā': 'a', 'ē': 'e', 'ī': 'i', 'ū': 'u',
  'č': 'c', 'ģ': 'g', 'ķ': 'k', 'ļ': 'l', 'ņ': 'n', 'š': 's', 'ž': 'z'
};

export const norm = (s = '') => s.normalize('NFC').toLocaleLowerCase('lv');

export const fold = (s = '') => norm(s).replace(/[āēīūčģķļņšž]/g, ch => FALLBACK_MAP[ch] || ch);

export function equalsLoose(a, b) {
  return fold(a) === fold(b);
}
