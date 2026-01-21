import { assetUrl } from '../../lib/paths.js';

export function getTranslation(i18n, key, fallback = '') {
  if (!key) return fallback;
  return key
    .split('.')
    .reduce(
      (obj, part) => (obj && Object.prototype.hasOwnProperty.call(obj, part) ? obj[part] : undefined),
      i18n,
    ) ?? fallback;
}

export function formatString(template = '', replacements = {}) {
  return template.replace(/\{([^}]+)\}/g, (_, token) => {
    return Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : '';
  });
}

export function applyTranslations(i18n, lang) {
  document.title = i18n.title || document.title;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n-key]').forEach(node => {
    const key = node.dataset.i18nKey;
    const attr = node.dataset.i18nAttr;
    const value = getTranslation(i18n, key);
    if (!value) return;
    if (attr) {
      node.setAttribute(attr, value);
    } else {
      node.textContent = value;
    }
  });
}

export function populateTenseOptions(nodes, i18n, tenses) {
  if (!nodes.tenseSelect) return;
  nodes.tenseSelect.replaceChildren();
  tenses.forEach(tense => {
    const opt = document.createElement('option');
    opt.value = tense;
    opt.textContent = getTranslation(i18n, `tenseOptions.${tense}`) || tense;
    nodes.tenseSelect.appendChild(opt);
  });
}

export async function loadTranslations(lang) {
  const candidates = [lang.slice(0, 2), 'lv', 'en'];
  for (const code of candidates) {
    try {
      const url = assetUrl(`i18n/passive-lab.${code}.json`);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.status}`);
      }
      const payload = await response.json();
      return { strings: payload, lang: code };
    } catch (err) {
      console.warn('Unable to load passive lab translations for', code, err);
    }
  }
  console.error('Passive lab translations could not be loaded');
  return { strings: {}, lang: 'lv' };
}
