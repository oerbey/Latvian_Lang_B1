import { assetUrl } from '../../lib/paths.js';
import { createPreserveTokenSet, tokenizeSentence } from './tokenize.js';

const DATASET_PATHS = [
  'sentence_surgery_pack/sentence_surgery_passive_dataset.json',
  'data/sentence_surgery_passive_dataset.json',
];

const ERROR_TYPE_LABELS = {
  aux_tense: 'laiks (tiek/tika/tiks)',
  negation: 'noliegums (netiek/netika)',
  participle_agreement: 'saskaņa (-ts/-ta/-ti/-tas)',
};

const AUXILIARY_FORMS = new Set(['tiek', 'tika', 'tiks', 'netiek', 'netika', 'netiks']);

function uniqueTokens(tokens = []) {
  const seen = new Set();
  const unique = [];
  tokens.forEach((token) => {
    if (typeof token !== 'string') return;
    const value = token.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    unique.push(value);
  });
  return unique;
}

function normalizeError(error = {}) {
  if (!error || typeof error !== 'object') {
    return { type: 'unknown', wrong: '', correct: '' };
  }
  return {
    type: typeof error.type === 'string' && error.type ? error.type : 'unknown',
    wrong: typeof error.wrong === 'string' ? error.wrong : '',
    correct: typeof error.correct === 'string' ? error.correct : '',
  };
}

function findMismatchIndices(leftTokens = [], rightTokens = []) {
  const mismatches = [];
  const maxLength = Math.max(leftTokens.length, rightTokens.length);
  for (let index = 0; index < maxLength; index += 1) {
    if ((leftTokens[index] || '') !== (rightTokens[index] || '')) {
      mismatches.push(index);
    }
  }
  return mismatches;
}

function participleStem(token = '') {
  const normalized = String(token || '')
    .trim()
    .toLowerCase();
  return normalized.replace(/(tas|ti|ta|ts)$/u, '');
}

function buildReplacementOptions(baseWordBank, brokenToken, targetToken, error) {
  const orderedBank = uniqueTokens(baseWordBank);
  const candidates = new Set();

  [brokenToken, targetToken, error?.wrong, error?.correct].forEach((token) => {
    if (typeof token === 'string' && token.trim()) {
      candidates.add(token.trim());
    }
  });

  if (error?.type === 'aux_tense' || error?.type === 'negation') {
    orderedBank.forEach((token) => {
      if (AUXILIARY_FORMS.has(token.trim().toLowerCase())) {
        candidates.add(token);
      }
    });
  }

  if (error?.type === 'participle_agreement') {
    const stems = new Set(
      [participleStem(brokenToken), participleStem(targetToken)].filter(Boolean),
    );
    orderedBank.forEach((token) => {
      if (stems.has(participleStem(token))) {
        candidates.add(token);
      }
    });
  }

  let focused = orderedBank.filter((token) => candidates.has(token));
  if (focused.length < 2) {
    focused = orderedBank.filter((token) => token !== brokenToken).slice(0, 4);
  }

  return uniqueTokens([brokenToken, ...focused, targetToken]);
}

function normalizeItem(item, index) {
  if (!item || typeof item !== 'object') {
    throw new Error(`Invalid item at index ${index}`);
  }

  const id = typeof item.id === 'string' && item.id ? item.id : `item-${index + 1}`;
  const topic = typeof item.topic === 'string' && item.topic ? item.topic : 'general';
  const source = typeof item.source === 'string' ? item.source : '';
  const targetLv = typeof item.target_lv === 'string' ? item.target_lv.trim() : '';
  const brokenLv = typeof item.broken_lv === 'string' ? item.broken_lv.trim() : '';
  const targetEn = typeof item.target_en === 'string' ? item.target_en.trim() : '';

  if (!targetLv || !brokenLv) {
    throw new Error(`Item ${id} is missing target_lv or broken_lv`);
  }

  const rawWordBank = Array.isArray(item.word_bank) ? item.word_bank : [];
  const preserveTokens = createPreserveTokenSet(rawWordBank);
  const normalizedErrors = Array.isArray(item.errors)
    ? item.errors.map((entry) => normalizeError(entry))
    : [];
  const targetTokens = tokenizeSentence(targetLv, preserveTokens);
  const brokenTokens = tokenizeSentence(brokenLv, preserveTokens);
  const mismatchIndices = findMismatchIndices(brokenTokens, targetTokens);
  const fallbackWrongIndex = normalizedErrors[0]?.wrong
    ? brokenTokens.findIndex((token) => token === normalizedErrors[0].wrong)
    : -1;
  const editableIndices = mismatchIndices.length
    ? mismatchIndices
    : fallbackWrongIndex >= 0
      ? [fallbackWrongIndex]
      : [];
  const primaryEditableIndex = editableIndices[0] ?? 0;
  const baseWordBank = uniqueTokens(
    rawWordBank.length ? rawWordBank : targetTokens.concat(brokenTokens),
  );
  const wordBank = buildReplacementOptions(
    baseWordBank,
    brokenTokens[primaryEditableIndex] || '',
    targetTokens[primaryEditableIndex] || '',
    normalizedErrors[0],
  );

  return {
    id,
    topic,
    source,
    targetLv,
    targetEn,
    brokenLv,
    errors: normalizedErrors,
    editableIndices,
    primaryEditableIndex,
    wordBank,
    preserveTokens,
    targetTokens,
    brokenTokens,
    index,
  };
}

function normalizeDataset(raw, resolvedPath) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dataset payload is not an object');
  }
  if (!Array.isArray(raw.items)) {
    throw new Error('Dataset is missing an items array');
  }

  const items = raw.items.map((item, index) => normalizeItem(item, index));
  if (!items.length) {
    throw new Error('Dataset contains no items');
  }

  return {
    meta: raw.meta && typeof raw.meta === 'object' ? raw.meta : {},
    items,
    path: resolvedPath,
  };
}

export async function loadSentenceSurgeryDataset() {
  let lastError = null;

  for (const path of DATASET_PATHS) {
    const url = assetUrl(path);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        lastError = new Error(`Failed to load ${url}: ${response.status}`);
        continue;
      }
      const raw = await response.json();
      return normalizeDataset(raw, path);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load sentence surgery dataset');
}

export function extractTopics(items = []) {
  const topics = new Set();
  items.forEach((item) => {
    if (item?.topic) topics.add(item.topic);
  });
  return Array.from(topics).sort((left, right) => left.localeCompare(right, 'lv'));
}

export function toTopicLabel(topic) {
  if (!topic) return 'Visi temati';
  return topic
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function getErrorTypeLabel(type) {
  return ERROR_TYPE_LABELS[type] || `gramatiskā forma (${type || 'cits'})`;
}

export function buildErrorExplanation(error) {
  if (!error) {
    return 'Kļūda: pārbaudi teikuma formu un pieturzīmes.';
  }
  const label = getErrorTypeLabel(error.type);
  const correct = error.correct ? ` Pareizi: ${error.correct}.` : '';
  return `Kļūda: ${label}.${correct}`;
}

export function buildHintText(error) {
  if (!error) {
    return 'Padoms: salīdzini teikumu ar ciešamās kārtas modeli.';
  }
  const label = getErrorTypeLabel(error.type);
  if (error.correct) {
    return `Padoms: pārbaudi ${label}. Pareizā forma ir “${error.correct}”.`;
  }
  return `Padoms: pārbaudi ${label}.`;
}
