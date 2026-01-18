export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function shuffleInPlace(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function shuffle(array, rng = Math.random) {
  const copy = array.slice();
  return shuffleInPlace(copy, rng);
}

export function pickRandom(array, rng = Math.random) {
  if (!array.length) return undefined;
  return array[Math.floor(rng() * array.length)];
}

export function randomInt(min, max, rng = Math.random) {
  if (max < min) return min;
  return Math.floor(rng() * (max - min + 1)) + min;
}
