// Use for trusted, static markup only (e.g., bundled SVG or i18n strings).
export function setTrustedHTML(element, html) {
  if (!element) return;
  element.innerHTML = html;
}
