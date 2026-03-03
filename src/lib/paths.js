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
