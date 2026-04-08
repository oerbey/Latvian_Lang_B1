/**
 * safeHtml.js — Controlled innerHTML helper.
 * ============================================
 * Provides a single, auditable call-site for innerHTML assignment.
 * ONLY used for trusted, developer-controlled markup (SVGs, i18n strings).
 * User-generated or network-fetched content must NEVER pass through this.
 */

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
