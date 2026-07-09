/**
 * Form Factory v3 — pure game logic.
 *
 * Builds mobile-friendly cloze rounds from the shared Form Factory dataset
 * while keeping deck filtering and answer evaluation testable.
 */
import { sanitizeText } from '../../lib/sanitize.js';
import { shuffle } from '../../lib/utils.js';

export const ENDINGS = ['-damies', '-damās', '-dams', '-dama', '-damas', '-dami'];

export const DECKS = [
  {
    id: 'core',
    label: 'Pamata',
    description: '1.-3. līmenis ar ikdienas teikumiem.',
  },
  {
    id: 'reflexive',
    label: 'Atgriezeniskie',
    description: 'Trene -damies un -damās formas.',
  },
  {
    id: 'all',
    label: 'Visas formas',
    description: 'Jaukts raunds ar vienskaitli un daudzskaitli.',
  },
];

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
  return Boolean(item?.answer && normalizeAnswer(userAnswer) === normalizeAnswer(item.answer));
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

export function getAnswerEnding(answer) {
  const normalized = normalizeAnswer(answer);
  return ENDINGS.find((ending) =>
    normalized.endsWith(normalizeAnswer(ending).replace(HYPHEN_EDGE_RE, '')),
  );
}

export function getDeckInfo(deckId) {
  return DECKS.find((deck) => deck.id === deckId) || DECKS[DECKS.length - 1];
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

export function filterItemsByDeck(items, deckId) {
  const usable = Array.isArray(items) ? items.filter(isUsableItem) : [];
  if (deckId === 'core') return usable.filter((item) => item.level <= 3);
  if (deckId === 'reflexive') return usable.filter((item) => item.reflexive);
  return usable;
}

export function countDeckItems(items, deckId) {
  return filterItemsByDeck(items, deckId).length;
}

export function createDeck(items, { deckId = 'all', size = 12 } = {}, rng = Math.random) {
  const filtered = filterItemsByDeck(items, deckId);
  if (!filtered.length) return [];
  return shuffle(filtered, rng).slice(0, Math.max(1, Math.min(size, filtered.length)));
}

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

export function calculateAccuracy(correct, answered) {
  if (!answered) return 0;
  return Math.round((correct / answered) * 100);
}

export function buildExplanation(item, correct) {
  const ending =
    getRequiredEnding(item.subject, item.reflexive) || getAnswerEnding(item.answer) || '';
  const profile = getSubjectProfile(item.subject);
  const subjectText = capitalize(item.subject);
  const numberText = profile?.number === 'plural' ? 'daudzskaitlis' : 'vienskaitlis';
  const genderText = profile?.gender === 'feminine' ? 'sieviešu dzimte' : 'vīriešu dzimte';
  const verbText = item.reflexive
    ? 'atgriezenisks darbības vārds'
    : 'neatgriezenisks darbības vārds';
  const head = correct ? 'Pareizi!' : `Pareizā atbilde: ${item.answer}.`;
  return `${head} ${subjectText} prasa ${genderText}, ${numberText}; ${verbText} dod galotni ${ending}.`;
}

export function buildStemGap(item) {
  const stem = sanitizeText(item?.stemHint).replace(HYPHEN_EDGE_RE, '');
  return stem ? `${stem}___` : '___';
}

function buildAnswerFromParts(stemHint, ending) {
  const stem = sanitizeText(stemHint).replace(HYPHEN_EDGE_RE, '');
  const suffix = sanitizeText(ending).replace(HYPHEN_EDGE_RE, '');
  return `${stem}${suffix}`;
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
