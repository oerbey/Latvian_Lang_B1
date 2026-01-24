export function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}
