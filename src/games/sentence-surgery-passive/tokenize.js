const PUNCT_OR_SYMBOL = /[\p{P}\p{S}]/u;

const NO_SPACE_BEFORE = new Set(['.', ',', '?', '!', ';', ':', ')', ']', '}', '»', '”', '"']);
const NO_SPACE_AFTER = new Set(['(', '[', '{', '«', '“', '"']);

function isPunctuationChar(char) {
  if (!char) return false;
  return PUNCT_OR_SYMBOL.test(char);
}

function isStandalonePunctuation(token) {
  return typeof token === 'string' && token.length > 0 && /^[\p{P}\p{S}]+$/u.test(token);
}

export function createPreserveTokenSet(wordBank = []) {
  const preserve = new Set();
  wordBank.forEach((token) => {
    if (typeof token !== 'string') return;
    const trimmed = token.trim();
    if (!trimmed) return;
    if (!isStandalonePunctuation(trimmed) && PUNCT_OR_SYMBOL.test(trimmed)) {
      preserve.add(trimmed);
    }
  });
  return preserve;
}

function splitChunk(chunk, preserveTokens) {
  if (!chunk) return [];
  if (preserveTokens.has(chunk)) return [chunk];

  const tokens = [];
  let remaining = chunk;

  while (
    remaining.length > 0 &&
    isPunctuationChar(remaining[0]) &&
    !preserveTokens.has(remaining)
  ) {
    tokens.push(remaining[0]);
    remaining = remaining.slice(1);
  }

  const trailing = [];
  while (
    remaining.length > 0 &&
    isPunctuationChar(remaining.at(-1)) &&
    !preserveTokens.has(remaining)
  ) {
    trailing.unshift(remaining.at(-1));
    remaining = remaining.slice(0, -1);
  }

  if (remaining) {
    tokens.push(remaining);
  }

  return tokens.concat(trailing);
}

export function tokenizeSentence(sentence, preserveTokens = new Set()) {
  if (typeof sentence !== 'string') return [];
  const value = sentence.trim();
  if (!value) return [];

  const tokens = [];
  value.split(/\s+/u).forEach((chunk) => {
    splitChunk(chunk, preserveTokens).forEach((token) => {
      if (token) tokens.push(token);
    });
  });
  return tokens;
}

export function joinTokens(tokens = []) {
  let result = '';
  let previous = '';

  tokens.forEach((token) => {
    if (typeof token !== 'string') return;
    const value = token.trim();
    if (!value) return;

    if (!result) {
      result = value;
      previous = value;
      return;
    }

    if (NO_SPACE_BEFORE.has(value)) {
      result += value;
    } else if (NO_SPACE_AFTER.has(previous)) {
      result += value;
    } else {
      result += ` ${value}`;
    }

    previous = value;
  });

  return result;
}

export function findMismatchIndices(currentTokens = [], targetTokens = []) {
  const mismatches = [];
  const maxLength = Math.max(currentTokens.length, targetTokens.length);
  for (let index = 0; index < maxLength; index += 1) {
    if ((currentTokens[index] || '') !== (targetTokens[index] || '')) {
      mismatches.push(index);
    }
  }
  return mismatches;
}
