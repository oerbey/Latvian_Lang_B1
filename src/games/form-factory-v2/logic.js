/**
 * Form Factory v2 — pure game logic.
 *
 * Cloze-style practice for Latvian adverbial participles (-dams, -dama,
 * -damies, -damās, plus plural -dami/-damas). Shares the dataset with
 * Form Factory v1 (data/form-factory/items.json) but presents each item
 * as a fill-the-gap sentence with tap-friendly answer chips.
 */
import { sanitizeText } from '../../lib/sanitize.js';
import { shuffle } from '../../lib/utils.js';

export const ENDINGS = ['-dams', '-dama', '-damies', '-damās', '-dami', '-damas'];

const HYPHEN_EDGE_RE = /^[\u2010-\u2015-]+|[\u2010-\u2015-]+$/gu;

const SUBJECT_PROFILES = new Map([
  ['viņš', { gender: 'masculine', number: 'singular' }],
  ['jānis', { gender: 'masculine', number: 'singular' }],
  ['viņa', { gender: 'feminine', number: 'singular' }],
  ['anna', { gender: 'feminine', number: 'singular' }],
  ['viņi', { gender: 'masculine', number: 'plural' }],
  ['viņas', { gender: 'feminine', number: 'plural' }],
]);

export function normalizeAnswer(value) {
  return sanitizeText(value).normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('lv-LV');
}

export function isCorrectAnswer(userAnswer, item) {
  if (!item?.answer) return false;
  return normalizeAnswer(userAnswer) === normalizeAnswer(item.answer);
}

export function getSubjectProfile(subject) {
  return SUBJECT_PROFILES.get(normalizeAnswer(subject)) || null;
}

export function getRequiredEnding(subject, reflexive) {
  const profile = getSubjectProfile(subject);
  if (!profile) return '';
  if (reflexive) return profile.gender === 'feminine' ? '-damās' : '-damies';
  if (profile.number === 'plural') return profile.gender === 'feminine' ? '-damas' : '-dami';
  return profile.gender === 'feminine' ? '-dama' : '-dams';
}

/**
 * Split an example sentence around the answer word so the UI can render
 * a cloze gap. Falls back to nulls when the answer is absent from the
 * example (the UI then shows a plain subject + lemma prompt).
 */
export function makeCloze(item) {
  const example = sanitizeText(item?.example);
  const answer = sanitizeText(item?.answer);
  if (!example || !answer) return { before: null, after: null };
  const index = example.toLocaleLowerCase('lv-LV').indexOf(answer.toLocaleLowerCase('lv-LV'));
  if (index === -1) return { before: null, after: null };
  return {
    before: example.slice(0, index).trimEnd(),
    after: example.slice(index + answer.length).trimStart(),
  };
}

function buildAnswerFromParts(stemHint, ending) {
  const stem = sanitizeText(stemHint).replace(HYPHEN_EDGE_RE, '');
  const suffix = sanitizeText(ending).replace(HYPHEN_EDGE_RE, '');
  return `${stem}${suffix}`;
}

/** Assemble up to four unique answer options (correct answer always included). */
export function buildOptions(item, rng = Math.random) {
  if (!isUsableItem(item)) return [];
  const fallback = ENDINGS.map((ending) => buildAnswerFromParts(item.stemHint, ending));
  const seen = new Set();
  const unique = [];
  [item.answer, ...(item.distractors || []), ...fallback].forEach((candidate) => {
    const normalized = normalizeAnswer(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(sanitizeText(candidate));
  });
  return shuffle(unique.slice(0, 4), rng);
}

export function normalizeItems(payload) {
  const source = Array.isArray(payload)
    ? payload
    : [
        ...(Array.isArray(payload?.items) ? payload.items : []),
        ...(Array.isArray(payload?.extensionItems) ? payload.extensionItems : []),
      ];
  return source.filter(isUsableItem).map((item) => ({
    id: sanitizeText(item.id),
    level: Number.isFinite(item.level) ? item.level : 1,
    lemma: sanitizeText(item.lemma),
    translation: sanitizeText(item.translation),
    reflexive: item.reflexive === true,
    stemHint: sanitizeText(item.stemHint),
    subject: sanitizeText(item.subject),
    answer: sanitizeText(item.answer),
    distractors: (item.distractors || []).map(sanitizeText).filter(Boolean),
    example: sanitizeText(item.example),
    explanation: sanitizeText(item.explanation),
  }));
}

/**
 * Build a shuffled deck for one round.
 * levelFilter: 'all' | 'core' (levels 1–3) | 'plural' (level 4 extension items).
 */
export function createDeck(items, { levelFilter = 'all', size = 10 } = {}, rng = Math.random) {
  const usable = Array.isArray(items) ? items.filter(isUsableItem) : [];
  const filtered = usable.filter((item) => {
    if (levelFilter === 'core') return item.level <= 3;
    if (levelFilter === 'plural') return item.level >= 4;
    return true;
  });
  if (!filtered.length) return [];
  return shuffle(filtered, rng).slice(0, Math.max(1, Math.min(size, filtered.length)));
}

export function calculateAccuracy(correct, answered) {
  if (!answered) return 0;
  return Math.round((correct / answered) * 100);
}

/** Latvian feedback line explaining why the required ending applies. */
export function buildExplanation(item, correct) {
  const ending = getRequiredEnding(item.subject, item.reflexive) || endingFromAnswer(item);
  const verbType = item.reflexive ? 'atgriezenisks' : 'neatgriezenisks';
  const profile = getSubjectProfile(item.subject);
  const genderText = profile
    ? `${profile.gender === 'feminine' ? 'sieviešu' : 'vīriešu'} dzimte, ${
        profile.number === 'plural' ? 'daudzskaitlis' : 'vienskaitlis'
      }`
    : 'subjekta forma';
  const head = correct ? 'Pareizi!' : `Pareizā atbilde: ${item.answer}.`;
  return `${head} ${capitalize(item.subject)} — ${genderText}; ${verbType} darbības vārds → ${ending}.`;
}

function endingFromAnswer(item) {
  const answer = normalizeAnswer(item?.answer);
  return ENDINGS.find((ending) => answer.endsWith(normalizeAnswer(ending))) || '';
}

function capitalize(value) {
  const text = sanitizeText(value);
  return text ? text.charAt(0).toLocaleUpperCase('lv-LV') + text.slice(1) : '';
}

function isUsableItem(item) {
  return Boolean(
    item &&
    typeof item === 'object' &&
    sanitizeText(item.id) &&
    sanitizeText(item.lemma) &&
    sanitizeText(item.stemHint) &&
    sanitizeText(item.subject) &&
    sanitizeText(item.answer) &&
    Array.isArray(item.distractors),
  );
}
