/**
 * paths.js — Asset URL resolver.
 * ===============================
 * Converts relative asset paths (e.g. 'data/words.json') into absolute
 * URLs using document.baseURI, ensuring correct resolution regardless
 * of deployment path (root vs. subdirectory like GitHub Pages).
 */

/**
 * Resolve relative asset path to absolute URL using document.baseURI.
 * Handles both leading-slash and relative paths (e.g., for subpath hosting).
 * @param {string} relativePath
 * @returns {string}
 */
export function assetUrl(relativePath) {
  const path = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return new URL(path, document.baseURI).toString();
}
