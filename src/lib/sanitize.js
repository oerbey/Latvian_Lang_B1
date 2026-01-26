export function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return (
    String(value)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
  );
}
