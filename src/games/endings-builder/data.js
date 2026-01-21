import { assetUrl } from '../../lib/paths.js';
import { loadString } from '../../lib/storage.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

export async function loadItems() {
  const url = new URL('../../../data/endings-builder/items.json', import.meta.url);
  const fallback = typeof window !== 'undefined' ? window.__ENDINGS_ITEMS__ : undefined;

  if (typeof window !== 'undefined' && window.location?.protocol === 'file:' && fallback) {
    return clone(fallback);
  }

  try {
    const mod = await import(url, { assert: { type: 'json' } });
    return mod.default;
  } catch (err) {
    if (!fallback && typeof process !== 'undefined' && process.versions?.node) {
      try {
        const [{ readFile }, { fileURLToPath }] = await Promise.all([
          import('node:fs/promises'),
          import('node:url'),
        ]);
        const raw = await readFile(fileURLToPath(url), 'utf8');
        return JSON.parse(raw);
      } catch (fsErr) {
        console.warn('Failed reading endings items from filesystem fallback.', fsErr);
      }
    }
    if (fallback) {
      console.warn('Using embedded endings item fallback.', err);
      return clone(fallback);
    }
    throw err;
  }
}

export async function loadStrings() {
  const langFallback = document.documentElement.lang || 'lv';
  const params = new URLSearchParams(location.search);
  const langPref = params.get('lang') || loadString('lang', '') || langFallback;
  const order = [...new Set([langPref, 'en'])];
  const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:';

  for (const lang of order) {
    let data = null;
    if (!isFile) {
      try {
        const url = assetUrl(`i18n/${lang}.json`);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to load ${url}: ${res.status}`);
        }
        data = await res.json();
      } catch (err) {
        console.warn('Failed loading i18n', lang, err);
      }
    }

    if (!data && window.__LL_I18N__ && window.__LL_I18N__[lang]) {
      data = window.__LL_I18N__[lang];
      console.warn('Using embedded i18n fallback for', lang);
    }

    if (data?.endingsBuilder) {
      document.documentElement.lang = lang;
      return data.endingsBuilder;
    }
  }

  const fallback = window.__LL_I18N__?.en?.endingsBuilder;
  if (fallback) {
    console.warn('Falling back to embedded English i18n strings for endings builder.');
    document.documentElement.lang = 'en';
    return fallback;
  }
  return {
    title: 'Endings Builder',
    subtitle: 'Drag the correct ending to the stem.',
    buttons: {
      check: 'Check',
      next: 'Next',
      rule: 'Show rule',
      ruleHide: 'Hide rule',
      report: 'Report error'
    },
    labels: {
      score: 'Score',
      streak: 'Streak',
      strict: 'Strict mode',
      answer: 'Type the full form',
      keypad: 'Latvian letters',
      options: 'Endings',
      dropPlaceholder: 'Drop ending',
      ruleTitle: 'Rule table',
      case: 'Case',
      number: 'Number',
      columns: {
        SG: 'Singular',
        PL: 'Plural',
        SG_M: 'SG masc',
        SG_F: 'SG fem',
        PL_M: 'PL masc',
        PL_F: 'PL fem'
      }
    },
    feedback: {
      correct: 'Correct!',
      incorrect: 'Try again.',
      fallback: 'Accepted without diacritics. Enable strict mode to practise marks.'
    },
    icons: { correct: '✔️', incorrect: '✖️', info: 'ℹ️' },
    announce: { correct: 'Correct ending placed.', incorrect: 'Wrong ending.' },
    explain: { prefix: '⇒' },
    reportTemplate: 'Please describe the issue.' ,
    strictMode: { on: 'Strict mode enabled', off: 'Strict mode disabled' },
    cases: {
      NOM: 'NOM', GEN: 'GEN', DAT: 'DAT', ACC: 'ACC', LOC: 'LOC', VOC: 'VOC'
    }
  };
}
