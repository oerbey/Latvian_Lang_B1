export function assetUrl(relativePath) {
  const path = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return new URL(path, document.baseURI).toString();
}
