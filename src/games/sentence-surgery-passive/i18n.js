/**
 * Localisation helpers for the Sentence Surgery repair game.
 *
 * The locale JSON files expose a `sentenceSurgery` namespace. Keys passed to
 * these helpers are relative to that namespace so the exercise can translate
 * only its own semantic shell without affecting other games on the page.
 */

import { assetUrl } from '../../lib/paths.js';

export const SENTENCE_SURGERY_NAMESPACE = 'sentenceSurgery';
export const DEFAULT_LANGUAGE = 'lv';
export const SUPPORTED_LANGUAGES = Object.freeze(['lv', 'en', 'ru']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function localKey(key) {
  const value = typeof key === 'string' ? key.trim() : '';
  const namespacePrefix = `${SENTENCE_SURGERY_NAMESPACE}.`;
  return value.startsWith(namespacePrefix) ? value.slice(namespacePrefix.length) : value;
}

/**
 * Resolve a BCP 47-style language value to a supported two-letter code.
 * Unknown or empty values use the supplied fallback, then Latvian.
 */
export function resolveSupportedLanguage(language, fallback = DEFAULT_LANGUAGE) {
  const normalize = (value) =>
    typeof value === 'string' ? value.trim().toLowerCase().split(/[-_]/u)[0] : '';
  const requested = normalize(language);
  if (SUPPORTED_LANGUAGES.includes(requested)) return requested;
  const fallbackCode = normalize(fallback);
  return SUPPORTED_LANGUAGES.includes(fallbackCode) ? fallbackCode : DEFAULT_LANGUAGE;
}

export const resolveLanguage = resolveSupportedLanguage;

/** Resolve a dotted key inside a Sentence Surgery namespace object. */
export function resolveDottedKey(strings, key, fallback = '') {
  const path = localKey(key);
  if (!path || !isPlainObject(strings)) return fallback;

  const value = path.split('.').reduce((current, segment) => {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    return current[segment];
  }, strings);

  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

/** Replace `{token}` placeholders while leaving unmatched placeholders visible. */
export function formatString(template = '', replacements = {}) {
  return String(template).replace(/\{([^{}]+)\}/gu, (placeholder, token) => {
    if (!Object.prototype.hasOwnProperty.call(replacements, token)) return placeholder;
    const replacement = replacements[token];
    return replacement === null || replacement === undefined ? '' : String(replacement);
  });
}

/** Resolve and interpolate a string from the namespace. */
export function getString(strings, key, fallback = '', replacements = {}) {
  return formatString(resolveDottedKey(strings, key, fallback), replacements);
}

export const getTranslation = getString;

function translationNodes(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  const nodes = Array.from(root.querySelectorAll('[data-i18n-key]'));
  if (typeof root.matches === 'function' && root.matches('[data-i18n-key]')) {
    nodes.unshift(root);
  }
  return nodes;
}

/**
 * Apply namespace-local keys beneath `root`.
 *
 * `data-i18n-attr="aria-label"` writes the translated value to an attribute;
 * without it, textContent is updated. Dynamic placeholders can be supplied in
 * `replacements` and are shared by every translated node in this pass.
 */
export function applySentenceSurgeryTranslations(
  strings,
  language,
  root = document,
  replacements = {},
) {
  const lang = resolveSupportedLanguage(language);
  const documentNode = root?.nodeType === 9 ? root : root?.ownerDocument;

  if (documentNode?.documentElement) {
    documentNode.documentElement.lang = lang;
  }
  const pageTitle = getString(strings, 'pageTitle');
  if (pageTitle && documentNode) {
    documentNode.title = pageTitle;
  }

  translationNodes(root).forEach((node) => {
    const key = node.dataset?.i18nKey;
    const value = getString(strings, key, '', replacements);
    if (!value) return;
    const attribute = node.dataset?.i18nAttr?.trim();
    if (attribute) {
      node.setAttribute(attribute, value);
    } else {
      node.textContent = value;
    }
  });

  return lang;
}

function readableIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/gu, ' ')
    .replace(/^\p{L}/u, (character) => character.toLocaleUpperCase());
}

/** Return a localised dataset topic label, with a readable unknown-topic fallback. */
export function getTopicLabel(strings, topic = 'all') {
  const id = typeof topic === 'string' && topic.trim() ? topic.trim() : 'all';
  return getString(strings, `topics.${id}`, readableIdentifier(id));
}

/** Return a localised grammar-focus label, with a readable unknown-type fallback. */
export function getFocusLabel(strings, type = 'other') {
  const id = typeof type === 'string' && type.trim() ? type.trim() : 'other';
  const direct = resolveDottedKey(strings, `focus.${id}`);
  if (direct) return direct;
  const fallback = resolveDottedKey(strings, 'focus.other', readableIdentifier(id));
  return formatString(fallback, { type: readableIdentifier(id) });
}

/**
 * Load the Sentence Surgery namespace, falling back through Latvian and English.
 * Throws only after every candidate has failed, allowing the UI to show its
 * localised fatal-loading state instead of silently rendering empty controls.
 */
export async function loadSentenceSurgeryStrings(language, options = {}) {
  const requested = resolveSupportedLanguage(language);
  const candidates = Array.from(new Set([requested, DEFAULT_LANGUAGE, 'en']));
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const warnings = options.warnings || console;
  let lastError = null;

  if (typeof fetchImpl !== 'function') {
    throw new Error('Sentence Surgery translations cannot be loaded because fetch is unavailable.');
  }

  for (const code of candidates) {
    try {
      const url = assetUrl(`i18n/${code}.json`);
      const response = await fetchImpl(url, { cache: 'no-store' });
      if (!response?.ok) {
        throw new Error(`Failed to load ${url}: ${response?.status ?? 'unknown status'}`);
      }
      const payload = await response.json();
      const strings = payload?.[SENTENCE_SURGERY_NAMESPACE];
      if (!isPlainObject(strings)) {
        throw new Error(`Missing ${SENTENCE_SURGERY_NAMESPACE} strings in ${url}`);
      }
      return { strings, lang: code };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      warnings?.warn?.(`Unable to load Sentence Surgery translations for ${code}.`, lastError);
    }
  }

  throw new Error('Sentence Surgery translations could not be loaded.', { cause: lastError });
}

export const loadTranslations = loadSentenceSurgeryStrings;
