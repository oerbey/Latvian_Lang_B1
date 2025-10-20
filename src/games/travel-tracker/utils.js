const MAX_UINT32 = 0xffffffff;

function toUint32(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >>> 0;
  }
  if (typeof value === 'string') {
    return stringToSeed(value);
  }
  return 0;
}

export function createSeededRng(seed) {
  let state = toUint32(seed) || 0x6d2b79f5;
  return function rng() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / (MAX_UINT32 + 1);
  };
}

export function seededShuffle(input, rng = Math.random) {
  if (!Array.isArray(input)) {
    return [];
  }
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const random = rng();
    const j = Math.floor(random * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function stringToSeed(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

