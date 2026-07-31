/**
 * @file sentence-surgery-passive/data.js
 * Dataset loader and normaliser for Sentence Surgery – Passive.
 *
 * Fetches the sentence dataset JSON, normalises each item
 * (error types, word bank, tokens), and classifies errors
 * (aux_tense, negation, participle_agreement) for UI labels.
 */

import { assetUrl } from '../../lib/paths.js';
import { createPreserveTokenSet, findMismatchIndices, tokenizeSentence } from './tokenize.js';

const DATASET_PATHS = [
  'sentence_surgery_pack/sentence_surgery_passive_dataset.json',
  'data/sentence_surgery_passive_dataset.json',
];

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

function normalizeError(error, itemId) {
  if (!error || typeof error !== 'object') {
    throw new Error(`Item ${itemId} has an invalid declared error`);
  }
  const type = typeof error.type === 'string' ? error.type.trim() : '';
  const wrong = typeof error.wrong === 'string' ? error.wrong.trim() : '';
  const correct = typeof error.correct === 'string' ? error.correct.trim() : '';
  if (!type || !wrong || !correct) {
    throw new Error(`Item ${itemId} error must include non-empty type, wrong, and correct values`);
  }
  return { type, wrong, correct };
}

function participleStem(token = '') {
  const normalized = String(token || '')
    .trim()
    .toLowerCase();
  return normalized.replace(/(tas|ti|ta|ts)$/u, '');
}

function buildParticipleForms(brokenToken, targetToken) {
  const stem = participleStem(targetToken) || participleStem(brokenToken);
  if (!stem) return [];
  return ['ts', 'ta', 'ti', 'tas'].map((ending) => `${stem}${ending}`);
}

function buildReplacementOptions(baseWordBank, brokenToken, targetToken, error) {
  const orderedBank = uniqueTokens(baseWordBank);
  const candidates = new Set();

  [targetToken, error?.correct].forEach((token) => {
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
    buildParticipleForms(brokenToken, targetToken).forEach((token) => candidates.add(token));
  }

  const generated =
    error?.type === 'participle_agreement' ? buildParticipleForms(brokenToken, targetToken) : [];
  const focused = uniqueTokens([
    ...orderedBank.filter((token) => candidates.has(token)),
    ...generated,
  ]).filter((token) => token !== brokenToken);

  return uniqueTokens([...focused, targetToken]).filter((token) => token !== brokenToken);
}

export function normalizeSentenceSurgeryItem(item, index = 0) {
  if (!item || typeof item !== 'object') {
    throw new Error(`Invalid item at index ${index}`);
  }

  const id = typeof item.id === 'string' ? item.id.trim() : '';
  if (!id) {
    throw new Error(`Item at index ${index} is missing a non-empty id`);
  }
  const topic = typeof item.topic === 'string' && item.topic.trim() ? item.topic.trim() : 'general';
  const source = typeof item.source === 'string' ? item.source : '';
  const targetLv = typeof item.target_lv === 'string' ? item.target_lv.trim() : '';
  const brokenLv = typeof item.broken_lv === 'string' ? item.broken_lv.trim() : '';
  const targetEn = typeof item.target_en === 'string' ? item.target_en.trim() : '';

  if (!targetLv || !brokenLv || !targetEn) {
    throw new Error(`Item ${id} must include non-empty target_lv, broken_lv, and target_en`);
  }
  if (!Array.isArray(item.errors) || item.errors.length !== 1) {
    throw new Error(`Item ${id} must declare exactly one error`);
  }
  if (!Array.isArray(item.word_bank)) {
    throw new Error(`Item ${id} must include a word_bank array`);
  }

  const rawWordBank = uniqueTokens(item.word_bank);
  const preserveTokens = createPreserveTokenSet(rawWordBank);
  const error = normalizeError(item.errors[0], id);
  const targetTokens = tokenizeSentence(targetLv, preserveTokens);
  const brokenTokens = tokenizeSentence(brokenLv, preserveTokens);
  const mismatchIndices = findMismatchIndices(brokenTokens, targetTokens);
  if (brokenTokens.length !== targetTokens.length || mismatchIndices.length !== 1) {
    throw new Error(`Item ${id} must contain exactly one token replacement`);
  }
  const primaryEditableIndex = mismatchIndices[0];
  const brokenToken = brokenTokens[primaryEditableIndex];
  const targetToken = targetTokens[primaryEditableIndex];
  if (error.wrong !== brokenToken || error.correct !== targetToken) {
    throw new Error(`Item ${id} declared error does not match the changed sentence tokens`);
  }
  if (!rawWordBank.includes(targetToken)) {
    throw new Error(`Item ${id} word_bank must include the correct target option “${targetToken}”`);
  }
  const choices = buildReplacementOptions(rawWordBank, brokenToken, targetToken, error);
  if (!choices.includes(targetToken)) {
    throw new Error(`Item ${id} could not build a correct target choice`);
  }

  return {
    id,
    topic,
    source,
    targetLv,
    targetEn,
    brokenLv,
    errors: [error],
    editableIndices: [primaryEditableIndex],
    primaryEditableIndex,
    choices,
    wordBank: [...choices],
    preserveTokens,
    targetTokens,
    brokenTokens,
    index,
  };
}

export function normalizeSentenceSurgeryDataset(raw, resolvedPath = '') {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dataset payload is not an object');
  }
  if (!Array.isArray(raw.items)) {
    throw new Error('Dataset is missing an items array');
  }

  const items = raw.items.map((item, index) => normalizeSentenceSurgeryItem(item, index));
  if (!items.length) {
    throw new Error('Dataset contains no items');
  }
  const ids = new Set();
  items.forEach((item) => {
    if (ids.has(item.id)) {
      throw new Error(`Dataset contains duplicate item id ${item.id}`);
    }
    ids.add(item.id);
  });

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
      return normalizeSentenceSurgeryDataset(raw, path);
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
