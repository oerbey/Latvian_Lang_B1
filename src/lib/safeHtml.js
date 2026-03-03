/**
 * Set innerHTML for trusted, static markup only (e.g., bundled SVG or i18n strings).
 * Do not use with user input or untrusted sources; escapes responsibility to caller.
 * @param {HTMLElement | null} element
 * @param {string} html - Trusted HTML string only
 */
export function setTrustedHTML(element, html) {
  if (!element) return;
  element.innerHTML = html;
}
