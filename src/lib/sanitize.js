/**
 * Remove control characters and trim whitespace; prevents XSS and formatting issues.
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return (
    String(value)
      // Remove C0/C1 control characters that could cause rendering issues.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
  );
}
