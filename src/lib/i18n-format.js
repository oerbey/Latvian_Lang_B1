function getDefaultLocale() {
  if (typeof document !== 'undefined' && document.documentElement?.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
}

export function formatNumber(value, locale = getDefaultLocale(), options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value ?? '');
  if (typeof Intl === 'undefined' || !Intl.NumberFormat) return String(number);
  return new Intl.NumberFormat(locale, options).format(number);
}

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

export function formatPlural(locale, count, forms, fallback = '') {
  if (!forms || typeof forms !== 'object') return fallback;
  const number = Number(count);
  const safeCount = Number.isFinite(number) ? number : 0;
  const resolvedLocale = locale || getDefaultLocale();
  const rule = typeof Intl !== 'undefined' && Intl.PluralRules
    ? new Intl.PluralRules(resolvedLocale)
    : { select: () => 'other' };
  const category = rule.select(safeCount);
  return forms[category] ?? forms.other ?? fallback;
}
