/**
 * Infer locale from document.documentElement.lang or navigator.language.
 * Falls back to 'en' if unavailable.
 * @returns {string}
 */
function getDefaultLocale() {
  if (typeof document !== 'undefined' && document.documentElement?.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

/**
 * Format number with locale-aware grouping (e.g., 1,000 or 1.000 depending on locale).
 * Falls back to string representation if Intl unavailable.
 * @param {number} value
 * @param {string} [locale] - BCP 47 language tag (defaults to document lang)
 * @param {object} [options] - Intl.NumberFormat options
 * @returns {string}
 */
export function formatNumber(value, locale = getDefaultLocale(), options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  if (typeof Intl === 'undefined' || !Intl.NumberFormat) return String(number);
  return new Intl.NumberFormat(locale, options).format(number);
}

/**
 * Format date/time with locale-aware formatting (e.g., "3/21/2025, 2:30 PM" in en-US).
 * Returns '—' for invalid/missing dates; falls back to toLocaleString if Intl unavailable.
 * @param {Date | string | number | null} value
 * @param {string} [locale] - BCP 47 language tag
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDateTime(value, locale = getDefaultLocale(), options = {}) {
  if (!value) return '—';
  const when = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(when.getTime())) return '—';
  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
    return when.toLocaleString();
  }
  const formatOptions = Object.keys(options).length
    ? options
    : { dateStyle: 'short', timeStyle: 'short' };
  return new Intl.DateTimeFormat(locale, formatOptions).format(when);
}

/**
 * Pluralize string based on count using CLDR rules (e.g., "1 item" vs "2 items").
 * Uses Intl.PluralRules if available, otherwise assumes 'other' form only.
 * @param {string} locale - BCP 47 language tag
 * @param {number} count
 * @param {object} forms - Plural forms object (e.g., {one: '1 item', other: '%d items'})
 * @param {string} [fallback=''] - Fallback if forms unavailable
 * @returns {string}
 */
export function formatPlural(locale, count, forms, fallback = '') {
  if (!forms || typeof forms !== 'object') return fallback;
  const number = Number(count);
  const safeCount = Number.isFinite(number) ? number : 0;
  const resolvedLocale = locale || getDefaultLocale();
  const rule =
    typeof Intl !== 'undefined' && Intl.PluralRules
      ? new Intl.PluralRules(resolvedLocale)
      : { select: () => 'other' };
  const category = rule.select(safeCount);
  return forms[category] ?? forms.other ?? fallback;
}
