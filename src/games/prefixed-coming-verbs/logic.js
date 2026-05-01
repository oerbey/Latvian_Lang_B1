export function formatSentenceFromChunks(chunks) {
  return chunks
    .join(' ')
    .replace(/\s+([?.!,;:])/g, '$1')
    .trim();
}

export function matchesExactAnswer(value, answer) {
  return value === answer;
}

export function shuffleChunks(chunks, seedText = '') {
  const list = chunks.map((chunk, index) => ({ chunk, index }));
  let seed = 2166136261;
  for (const char of seedText) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  for (let i = list.length - 1; i > 0; i -= 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const j = Math.abs(seed) % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  if (list.length > 1 && list.every((entry, idx) => entry.index === idx)) {
    [list[0], list[1]] = [list[1], list[0]];
  }
  return list;
}
