export function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
}

export function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function accuracy(correct, attempts) {
  return attempts > 0 ? Math.round((correct / attempts) * 100) : null;
}

export function uniqueIds(ids, allowed = null) {
  return [...new Set(ids)].filter((id) => !allowed || allowed.has(id));
}

export function validateJsonObject(data, maxBytes) {
  if (!isPlainObject(data)) return 'data must be an object';
  try {
    if (new TextEncoder().encode(JSON.stringify(data)).length > maxBytes) {
      return `data exceeds ${maxBytes} bytes`;
    }
  } catch {
    return 'data must be JSON serializable';
  }
  return null;
}

export function assertValid(error) {
  if (error) throw new TypeError(error);
}
