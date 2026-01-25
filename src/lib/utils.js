/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffleInPlace(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffle(array, rng = Math.random) {
  const copy = array.slice();
  return shuffleInPlace(copy, rng);
}

/**
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng]
 * @returns {T | undefined}
 */
export function pickRandom(array, rng = Math.random) {
  if (!array.length) return undefined;
  return array[Math.floor(rng() * array.length)];
}

/**
 * @param {number} min
 * @param {number} max
 * @param {() => number} [rng]
 * @returns {number}
 */
export function randomInt(min, max, rng = Math.random) {
  if (max < min) return min;
  return Math.floor(rng() * (max - min + 1)) + min;
}
