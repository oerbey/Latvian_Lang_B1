/**
 * Form Factory v3 — pure adaptive participle-practice logic.
 *
 * Each dataset item moves through a Leitner ladder: ending-rule recognition,
 * contextual cloze recognition, then typed production. All exports stay DOM-free
 * so scheduling and task generation can be tested with a seeded RNG.
 */
import { sanitizeText } from '../../lib/sanitize.js';
import { clamp, shuffle } from '../../lib/utils.js';

export const STAGES = { RULE: 'rule', CLOZE: 'cloze', BUILD: 'build' };

export const STAGE_LABELS = {
  [STAGES.RULE]: 'Likums',
  [STAGES.CLOZE]: 'Teikums',
  [STAGES.BUILD]: 'Būve',
};

export const ENDINGS = ['-damies', '-damās', '-dams', '-dama', '-damas', '-dami'];
export const MAX_BOX = 4;
export const ROUND_SIZE = 10;
export const MAX_NEW_PER_ROUND = 4;

export const DECKS = [
  { id: 'core', label: 'Pamata', description: '1.–3. līmenis ar ikdienas teikumiem.' },
  { id: 'reflexive', label: 'Atgriezeniskie', description: 'Trenē -damies un -damās.' },
  { id: 'all', label: 'Visas formas', description: 'Vienskaitlis un daudzskaitlis.' },
];

const HYPHEN_EDGE_RE = /^[\u2010-\u2015-]+|[\u2010-\u2015-]+$/gu;
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const BOX_INTERVALS_MS = [0, 2 * MINUTE, 8 * MINUTE, DAY, 4 * DAY];
const XP_BY_STAGE = { [STAGES.RULE]: 10, [STAGES.CLOZE]: 15, [STAGES.BUILD]: 20 };

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

export function isCorrectTaskAnswer(userAnswer, task) {
  return Boolean(task?.answer && normalizeAnswer(userAnswer) === normalizeAnswer(task.answer));
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

/** Kept for callers that need a simple non-adaptive shuffled slice. */
export function createDeck(items, { deckId = 'all', size = ROUND_SIZE } = {}, rng = Math.random) {
  const filtered = filterItemsByDeck(items, deckId);
  if (!filtered.length) return [];
  return shuffle(filtered, rng).slice(0, Math.max(1, Math.min(size, filtered.length)));
}

export function createRecord() {
  return { box: 0, dueAt: 0, seen: 0, correct: 0, wrong: 0 };
}

export function normalizeRecords(raw) {
  const records = {};
  if (!raw || typeof raw !== 'object') return records;
  Object.entries(raw).forEach(([id, value]) => {
    if (!id || !value || typeof value !== 'object') return;
    records[id] = {
      box: clamp(toCount(value.box), 0, MAX_BOX),
      dueAt: toCount(value.dueAt),
      seen: toCount(value.seen),
      correct: toCount(value.correct),
      wrong: toCount(value.wrong),
    };
  });
  return records;
}

export function applyResult(record, wasCorrect, now = Date.now()) {
  const base = record ? { ...createRecord(), ...record } : createRecord();
  const box = wasCorrect ? clamp(base.box + 1, 0, MAX_BOX) : 0;
  return {
    box,
    dueAt: now + BOX_INTERVALS_MS[box],
    seen: base.seen + 1,
    correct: base.correct + (wasCorrect ? 1 : 0),
    wrong: base.wrong + (wasCorrect ? 0 : 1),
  };
}

export function stageForBox(box) {
  if (box <= 1) return STAGES.RULE;
  if (box === 2) return STAGES.CLOZE;
  return STAGES.BUILD;
}

export function buildAdaptiveRound(items, records = {}, options = {}) {
  const {
    deckId = 'all',
    size = ROUND_SIZE,
    now = Date.now(),
    maxNew = MAX_NEW_PER_ROUND,
    rng = Math.random,
  } = options;
  const pool = filterItemsByDeck(items, deckId);
  if (!pool.length) return [];

  const due = [];
  const weak = [];
  const fresh = [];
  const resting = [];
  pool.forEach((item) => {
    const record = records[item.id];
    if (!record || !record.seen) fresh.push(item);
    else if (record.dueAt <= now) due.push(item);
    else if (record.wrong > record.correct) weak.push(item);
    else resting.push(item);
  });

  due.sort((a, b) => compareSchedule(records[a.id], records[b.id]));
  weak.sort((a, b) => weakness(records[b.id]) - weakness(records[a.id]));
  resting.sort((a, b) => compareMastery(records[a.id], records[b.id]));

  const reviews = [...due, ...weak, ...resting];
  const shuffledFresh = shuffle(fresh, rng);
  const newCount = Math.min(Math.max(maxNew, 0), size, shuffledFresh.length);
  const reviewCount = Math.max(size - newCount, 0);
  const ordered = [...reviews.slice(0, reviewCount), ...shuffledFresh.slice(0, newCount)];
  ordered.push(...reviews.slice(reviewCount), ...shuffledFresh.slice(newCount));
  return ordered.slice(0, Math.max(1, size));
}

export function describeDeck(items, records = {}, options = {}) {
  const { deckId = 'all', now = Date.now() } = options;
  const summary = { total: 0, fresh: 0, learning: 0, due: 0, mastered: 0 };
  filterItemsByDeck(items, deckId).forEach((item) => {
    summary.total += 1;
    const record = records[item.id];
    if (!record || !record.seen) {
      summary.fresh += 1;
      return;
    }
    if (record.box >= MAX_BOX) summary.mastered += 1;
    else summary.learning += 1;
    if (record.dueAt <= now) summary.due += 1;
  });
  return summary;
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
  return collectOptions([item.answer, ...(item.distractors || []), ...fallback], item.answer, rng);
}

export function buildRuleOptions(item, rng = Math.random) {
  const answer = getRequiredEnding(item?.subject, item?.reflexive) || getAnswerEnding(item?.answer);
  if (!answer) return [];
  const candidates = [answer, ...(item?.distractors || []).map(getAnswerEnding), ...ENDINGS].filter(
    Boolean,
  );
  return collectOptions(candidates, answer, rng);
}

export function buildTask(item, stage, rng = Math.random) {
  if (!isUsableItem(item)) return null;
  const profile = getSubjectProfile(item.subject);
  const typeLabel = item.reflexive ? 'atgriezenisks' : 'neatgriezenisks';
  const common = {
    stage,
    itemId: item.id,
    lemma: item.lemma,
    translation: item.translation,
    subject: item.subject,
    typeLabel,
    gender: profile?.gender || '',
    number: profile?.number || '',
    example: item.example,
  };

  if (stage === STAGES.RULE) {
    const answer = getRequiredEnding(item.subject, item.reflexive) || getAnswerEnding(item.answer);
    const options = buildRuleOptions(item, rng);
    if (!answer || options.length < 4) return null;
    return {
      ...common,
      promptLabel: 'Izvēlies pareizo galotni',
      prompt: item.lemma,
      answer,
      options,
    };
  }

  const cloze = makeCloze(item);
  if (stage === STAGES.CLOZE) {
    const options = buildOptions(item, rng);
    if (options.length < 4) return null;
    return {
      ...common,
      promptLabel: 'Pabeidz teikumu',
      prompt: item.lemma,
      answer: item.answer,
      options,
      cloze,
    };
  }

  return {
    ...common,
    stage: STAGES.BUILD,
    promptLabel: 'Ieraksti pilno formu',
    prompt: item.lemma,
    answer: item.answer,
    stem: sanitizeText(item.stemHint).replace(HYPHEN_EDGE_RE, ''),
    cloze,
  };
}

export function calculateAccuracy(correct, answered) {
  if (!answered) return 0;
  return Math.round((correct / answered) * 100);
}

export function xpForAnswer(stage, streak = 0) {
  const base = XP_BY_STAGE[stage] || XP_BY_STAGE[STAGES.RULE];
  return base + clamp(Math.floor(streak), 0, 5) * 2;
}

export function buildExplanation(item, correct) {
  const ending =
    getRequiredEnding(item.subject, item.reflexive) || getAnswerEnding(item.answer) || '';
  const profile = getSubjectProfile(item.subject);
  const subjectText = capitalize(item.subject);
  const numberText = profile?.number === 'plural' ? 'daudzskaitlis' : 'vienskaitlis';
  const genderText = profile?.gender === 'feminine' ? 'sieviešu dzimte' : 'vīriešu dzimte';
  const verbText = item.reflexive ? 'atgriezenisks' : 'neatgriezenisks';
  const head = correct ? '' : `Pareizā forma: ${item.answer}. `;
  return `${head}${subjectText}: ${genderText}, ${numberText}; ${verbText} darbības vārds → ${ending}.`;
}

export function buildStemGap(item) {
  const stem = sanitizeText(item?.stemHint).replace(HYPHEN_EDGE_RE, '');
  return stem ? `${stem}___` : '___';
}

function collectOptions(candidates, answer, rng) {
  const seen = new Set();
  const unique = [];
  candidates.forEach((candidate) => {
    const text = sanitizeText(candidate);
    const normalized = normalizeAnswer(text);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(text);
  });
  const answerKey = normalizeAnswer(answer);
  const correct = unique.find((candidate) => normalizeAnswer(candidate) === answerKey);
  const distractors = unique.filter((candidate) => normalizeAnswer(candidate) !== answerKey);
  if (!correct || distractors.length < 3) return [];
  return shuffle([correct, ...distractors.slice(0, 3)], rng);
}

function buildAnswerFromParts(stemHint, ending) {
  const stem = sanitizeText(stemHint).replace(HYPHEN_EDGE_RE, '');
  const suffix = sanitizeText(ending).replace(HYPHEN_EDGE_RE, '');
  return `${stem}${suffix}`;
}

function compareSchedule(a, b) {
  return a.dueAt - b.dueAt || a.box - b.box;
}

function compareMastery(a, b) {
  return b.box - a.box || a.dueAt - b.dueAt;
}

function weakness(record) {
  return record.wrong - record.correct;
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
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
