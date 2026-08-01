/**
 * Darbības Vārdi V2 — pure game logic.
 *
 * Drives a per-verb Leitner ladder over the shared verb dataset: box 0-1 trains
 * meaning, box 2 trains conjugated forms, box 3+ trains assembling a form from
 * stem + ending. Every export is DOM-free so rounds stay deterministic under a
 * seeded rng.
 */
import { sanitizeText } from '../../lib/sanitize.js';
import { clamp, pickRandom, shuffle } from '../../lib/utils.js';

export const STAGES = { MEANING: 'meaning', FORM: 'form', BUILD: 'build' };

export const STAGE_LABELS = {
  [STAGES.MEANING]: 'Nozīme',
  [STAGES.FORM]: 'Forma',
  [STAGES.BUILD]: 'Būve',
};

export const MAX_BOX = 4;
export const ROUND_SIZE = 10;
export const OPTION_COUNT = 4;

// Without a cap the 300+ unseen verbs would crowd out reviews and the ladder
// would never climb past the meaning stage.
export const MAX_NEW_PER_ROUND = 4;

export const PERSONS = [
  { key: '1s', pronoun: 'es' },
  { key: '2s', pronoun: 'tu' },
  { key: '3s', pronoun: 'viņš / viņa' },
  { key: '1p', pronoun: 'mēs' },
  { key: '2p', pronoun: 'jūs' },
  { key: '3p', pronoun: 'viņi / viņas' },
];

export const TENSES = [
  { key: 'present', label: 'tagadne' },
  { key: 'past', label: 'pagātne' },
  { key: 'future', label: 'nākotne' },
];

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// Leitner intervals per box; box 0 stays due so a miss returns within the same
// session, and the first two steps are short enough that a verb can climb from
// meaning to build in one sitting.
const BOX_INTERVALS_MS = [0, 2 * MINUTE, 8 * MINUTE, DAY, 4 * DAY];

const XP_BY_STAGE = { [STAGES.MEANING]: 10, [STAGES.FORM]: 15, [STAGES.BUILD]: 20 };
const STREAK_BONUS_CAP = 5;

// A shorter stem would make the build stage guessable from the chip alone.
const MIN_STEM_LENGTH = 2;

/**
 * Normalise text for comparison: strips control chars, collapses whitespace,
 * and lowercases with Latvian collation so diacritics stay intact.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeAnswer(value) {
  return sanitizeText(value).normalize('NFC').replace(/\s+/g, ' ').toLocaleLowerCase('lv-LV');
}

/**
 * Convert raw dataset rows into verbs with a cleaned conjugation table.
 * Rows without a Latvian lemma or any translation are dropped; duplicates keep
 * the first occurrence.
 * @param {unknown} items
 * @returns {Array<{id: string, lv: string, en: string, ru: string, conj: object}>}
 */
export function normalizeVerbs(items) {
  const source = Array.isArray(items) ? items : [];
  const seen = new Set();
  const verbs = [];
  source.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const lv = sanitizeText(item.lv);
    const en = sanitizeText(item.en);
    const ru = sanitizeText(item.ru);
    if (!lv || (!en && !ru)) return;
    const id = normalizeAnswer(lv);
    if (seen.has(id)) return;
    seen.add(id);
    verbs.push({ id, lv, en, ru, conj: normalizeConjugation(item.conj) });
  });
  return verbs;
}

function normalizeConjugation(conj) {
  if (!conj || typeof conj !== 'object') return {};
  const table = {};
  TENSES.forEach(({ key }) => {
    const source = conj[key];
    if (!source || typeof source !== 'object') return;
    const forms = {};
    PERSONS.forEach(({ key: person }) => {
      const form = sanitizeText(source[person]);
      if (form) forms[person] = form;
    });
    if (Object.keys(forms).length) table[key] = forms;
  });
  return table;
}

/**
 * Flatten a verb's conjugation table into {tense, person, form} triples.
 * @param {object} verb
 * @returns {Array<{tense: string, person: string, form: string}>}
 */
export function listForms(verb) {
  const table = verb?.conj || {};
  const forms = [];
  TENSES.forEach(({ key: tense }) => {
    const row = table[tense];
    if (!row) return;
    PERSONS.forEach(({ key: person }) => {
      if (row[person]) forms.push({ tense, person, form: row[person] });
    });
  });
  return forms;
}

/**
 * A verb can only host form/build tasks when it offers enough distinct forms
 * to fill an option row without repeats.
 * @param {object} verb
 * @returns {boolean}
 */
export function hasConjugation(verb) {
  const unique = new Set(listForms(verb).map((entry) => normalizeAnswer(entry.form)));
  return unique.size >= OPTION_COUNT;
}

/**
 * @param {object} verb
 * @param {'en' | 'ru'} language
 * @returns {string}
 */
export function getTranslation(verb, language = 'en') {
  if (!verb) return '';
  return language === 'ru' ? verb.ru || verb.en : verb.en || verb.ru;
}

export function pronounFor(person) {
  return PERSONS.find((entry) => entry.key === person)?.pronoun || '';
}

export function tenseLabel(tense) {
  return TENSES.find((entry) => entry.key === tense)?.label || '';
}

export function createRecord() {
  return { box: 0, dueAt: 0, seen: 0, correct: 0, wrong: 0 };
}

/**
 * Coerce persisted mastery data back into a trusted shape; unknown or corrupt
 * entries collapse to zeroed counters rather than throwing.
 * @param {unknown} raw
 * @returns {Record<string, object>} Mastery records keyed by verb id.
 */
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

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

/**
 * Move a verb up or down the Leitner ladder and reschedule it.
 * @param {object | undefined} record
 * @param {boolean} wasCorrect
 * @param {number} now
 */
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
  if (box <= 1) return STAGES.MEANING;
  if (box === 2) return STAGES.FORM;
  return STAGES.BUILD;
}

/**
 * Verbs shipped without a usable conjugation table stay on the meaning stage
 * no matter how high their box climbs.
 */
export function stageForVerb(verb, record) {
  const stage = stageForBox(record?.box ?? 0);
  if (stage === STAGES.MEANING) return stage;
  return hasConjugation(verb) ? stage : STAGES.MEANING;
}

/**
 * Order a round as reviews first, then a capped slice of unseen verbs. The cap
 * keeps the 300+ new words from burying reviews; the top-up keeps the round full
 * when either pool runs short.
 * @param {Array<object>} verbs
 * @param {Record<string, object>} records
 * @param {{size?: number, now?: number, maxNew?: number, rng?: () => number}} [options]
 * @returns {Array<object>}
 */
export function buildRound(verbs, records = {}, options = {}) {
  const {
    size = ROUND_SIZE,
    now = Date.now(),
    maxNew = MAX_NEW_PER_ROUND,
    rng = Math.random,
  } = options;
  const pool = Array.isArray(verbs) ? verbs : [];
  if (!pool.length) return [];

  const due = [];
  const weak = [];
  const fresh = [];
  const resting = [];
  pool.forEach((verb) => {
    const record = records[verb.id];
    if (!record || !record.seen) fresh.push(verb);
    else if (record.dueAt <= now) due.push(verb);
    else if (record.wrong > record.correct) weak.push(verb);
    else resting.push(verb);
  });

  due.sort((a, b) => compareSchedule(records[a.id], records[b.id]));
  weak.sort((a, b) => weakness(records[b.id]) - weakness(records[a.id]));
  // Fillers are not due yet, so lead with the most advanced ones: that is where
  // the form and build stages live.
  resting.sort((a, b) => compareMastery(records[a.id], records[b.id]));

  const reviews = [...due, ...weak, ...resting];
  const shuffledFresh = shuffle(fresh, rng);
  const newCount = Math.min(Math.max(maxNew, 0), size, shuffledFresh.length);
  const reviewCount = Math.max(size - newCount, 0);
  const ordered = [...reviews.slice(0, reviewCount), ...shuffledFresh.slice(0, newCount)];
  ordered.push(...reviews.slice(reviewCount), ...shuffledFresh.slice(newCount));
  return ordered.slice(0, Math.max(1, size));
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

/**
 * Summarise deck health for the start screen.
 * @param {Array<object>} verbs
 * @param {Record<string, object>} records
 * @param {number} now
 */
export function describeDeck(verbs, records = {}, now = Date.now()) {
  const summary = { total: 0, fresh: 0, learning: 0, due: 0, mastered: 0 };
  (Array.isArray(verbs) ? verbs : []).forEach((verb) => {
    summary.total += 1;
    const record = records[verb.id];
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

/**
 * Pick a meaning task in either direction; returns null when the pool is too
 * small to fill unique options.
 */
export function buildMeaningTask(verb, pool, options = {}) {
  const { language = 'en', direction, rng = Math.random } = options;
  const translation = getTranslation(verb, language);
  if (!verb?.lv || !translation) return null;

  const mode = direction || (rng() < 0.5 ? 'lv-to-tr' : 'tr-to-lv');
  const toLatvian = mode === 'tr-to-lv';
  const answer = toLatvian ? verb.lv : translation;
  const candidates = (Array.isArray(pool) ? pool : []).filter((entry) => entry.id !== verb.id);
  const distractors = collectUnique(
    shuffle(candidates, rng).map((entry) =>
      toLatvian ? entry.lv : getTranslation(entry, language),
    ),
    answer,
    OPTION_COUNT - 1,
  );
  if (distractors.length < OPTION_COUNT - 1) return null;

  return {
    stage: STAGES.MEANING,
    verbId: verb.id,
    direction: mode,
    promptLabel: toLatvian ? 'Kurš darbības vārds tas ir?' : 'Ko nozīmē šis darbības vārds?',
    prompt: toLatvian ? translation : verb.lv,
    pronoun: '',
    tenseLabel: '',
    answer,
    options: shuffle([answer, ...distractors], rng),
    speakText: verb.lv,
  };
}

/**
 * Ask for one person+tense form and fill the option row with the verb's own
 * near-miss forms, so the choice cannot be solved by elimination.
 */
export function buildFormTask(verb, options = {}) {
  const { tense, person, rng = Math.random } = options;
  const forms = listForms(verb);
  if (!forms.length) return null;

  const scoped = forms.filter(
    (entry) => (!tense || entry.tense === tense) && (!person || entry.person === person),
  );
  const target = pickRandom(scoped.length ? scoped : forms, rng);
  if (!target) return null;

  const sameTense = forms.filter(
    (entry) => entry.tense === target.tense && entry.person !== target.person,
  );
  const otherTenses = forms.filter((entry) => entry.tense !== target.tense);
  const distractors = collectUnique(
    [...shuffle(sameTense, rng), ...shuffle(otherTenses, rng)].map((entry) => entry.form),
    target.form,
    OPTION_COUNT - 1,
  );
  if (distractors.length < OPTION_COUNT - 1) return null;

  return {
    stage: STAGES.FORM,
    verbId: verb.id,
    tense: target.tense,
    person: target.person,
    promptLabel: 'Izvēlies pareizo formu',
    prompt: verb.lv,
    pronoun: pronounFor(target.person),
    tenseLabel: tenseLabel(target.tense),
    answer: target.form,
    options: shuffle([target.form, ...distractors], rng),
    speakText: target.form,
  };
}

/**
 * Derive one stem per tense by trimming the tense's longest common prefix until
 * every person in that tense keeps a non-empty ending.
 * @param {object} verb
 * @returns {Record<string, string>}
 */
export function buildStems(verb) {
  const stems = {};
  TENSES.forEach(({ key }) => {
    const forms = Object.values(verb?.conj?.[key] || {});
    if (forms.length < 2) return;
    const prefix = longestCommonPrefix(forms);
    const shortest = forms.reduce((min, form) => Math.min(min, form.length), Infinity);
    const stem = prefix.slice(0, Math.min(prefix.length, shortest - 1));
    if (stem.length >= MIN_STEM_LENGTH) stems[key] = stem;
  });
  return stems;
}

function longestCommonPrefix(values) {
  if (!values.length) return '';
  return values.reduce((prefix, value) => {
    let index = 0;
    while (index < prefix.length && index < value.length && prefix[index] === value[index]) {
      index += 1;
    }
    return prefix.slice(0, index);
  });
}

/**
 * Build a two-chip assembly task (stem + ending). Tenses are tried in turn and
 * null is returned when no tense yields a splittable form.
 */
export function buildAssembleTask(verb, options = {}) {
  const { tense, person, rng = Math.random } = options;
  const stems = buildStems(verb);
  const available = Object.keys(stems);
  if (!available.length) return null;

  const order = tense && stems[tense] ? [tense] : shuffle(available, rng);
  for (const tenseKey of order) {
    const task = assembleForTense(verb, tenseKey, stems, person, rng);
    if (task) return task;
  }
  return null;
}

function assembleForTense(verb, tenseKey, stems, person, rng) {
  const stem = stems[tenseKey];
  const forms = verb.conj[tenseKey];
  const persons = PERSONS.map((entry) => entry.key).filter(
    (key) => forms[key] && forms[key].startsWith(stem) && forms[key].length > stem.length,
  );
  if (!persons.length) return null;

  const scoped = person && persons.includes(person) ? [person] : persons;
  const targetPerson = pickRandom(scoped, rng);
  const answer = forms[targetPerson];
  const ending = answer.slice(stem.length);

  const endingOptions = collectUnique(
    persons.filter((key) => key !== targetPerson).map((key) => forms[key].slice(stem.length)),
    ending,
    OPTION_COUNT - 1,
  );
  if (!endingOptions.length) return null;

  const stemOptions = collectUnique(
    Object.entries(stems)
      .filter(([key]) => key !== tenseKey)
      .map(([, value]) => value),
    stem,
    2,
  );

  return {
    stage: STAGES.BUILD,
    verbId: verb.id,
    tense: tenseKey,
    person: targetPerson,
    promptLabel: 'Saliec formu no daļām',
    prompt: verb.lv,
    pronoun: pronounFor(targetPerson),
    tenseLabel: tenseLabel(tenseKey),
    answer,
    stem,
    ending,
    stemOptions: shuffle([stem, ...stemOptions], rng),
    endingOptions: shuffle([ending, ...endingOptions], rng),
    speakText: answer,
  };
}

const FALLBACK_CHAIN = {
  [STAGES.MEANING]: [STAGES.MEANING],
  [STAGES.FORM]: [STAGES.FORM, STAGES.MEANING],
  [STAGES.BUILD]: [STAGES.BUILD, STAGES.FORM, STAGES.MEANING],
};

/**
 * Build the task for a verb at its current stage, stepping down the ladder when
 * the dataset cannot support the requested stage.
 */
export function buildTask(verb, pool, options = {}) {
  const { stage = STAGES.MEANING, language = 'en', rng = Math.random } = options;
  const chain = FALLBACK_CHAIN[stage] || FALLBACK_CHAIN[STAGES.MEANING];
  for (const step of chain) {
    let task = null;
    if (step === STAGES.BUILD) task = buildAssembleTask(verb, { rng });
    else if (step === STAGES.FORM) task = buildFormTask(verb, { rng });
    else task = buildMeaningTask(verb, pool, { language, rng });
    if (task) return { ...task, lv: verb.lv, translation: getTranslation(verb, language) };
  }
  return null;
}

export function isCorrectChoice(value, task) {
  return Boolean(task) && normalizeAnswer(value) === normalizeAnswer(task.answer);
}

export function isCorrectAssembly(stem, ending, task) {
  return Boolean(task) && normalizeAnswer(`${stem}${ending}`) === normalizeAnswer(task.answer);
}

export function calculateAccuracy(correct, answered) {
  if (!answered) return 0;
  return Math.round((correct / answered) * 100);
}

/**
 * Harder stages pay more, and a running streak adds a capped bonus.
 */
export function xpForAnswer(stage, streak = 0) {
  const base = XP_BY_STAGE[stage] || XP_BY_STAGE[STAGES.MEANING];
  return base + clamp(Math.floor(streak), 0, STREAK_BONUS_CAP) * 2;
}

/**
 * Continue the daily streak on consecutive local calendar days, keep it on a
 * repeat visit, and reset to 1 after any gap.
 */
export function computeDailyStreak(lastPlayedISO, currentStreak = 0, now = Date.now()) {
  const today = toDayNumber(now);
  const last = lastPlayedISO ? toDayNumber(Date.parse(lastPlayedISO)) : NaN;
  const streak = Math.max(1, Math.floor(currentStreak) || 0);
  if (!Number.isFinite(last)) return 1;
  if (last === today) return streak;
  if (today - last === 1) return streak + 1;
  return 1;
}

function toDayNumber(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return NaN;
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
}

/**
 * Describe the answer. The correct case stays free of praise because the
 * feedback sheet already carries the verdict in its title.
 */
export function buildExplanation(task, correct) {
  if (!task) return '';
  // A meaning pair already spells the answer out, so it needs no prefix.
  if (task.stage === STAGES.MEANING) {
    return `${task.lv} — ${task.translation}.`;
  }
  const head = correct ? '' : `Pareizā atbilde: ${task.answer}. `;
  const context = `${task.pronoun} · ${task.tenseLabel} — ${task.lv} (${task.translation}).`;
  if (task.stage === STAGES.BUILD) {
    return `${head}${context} Sakne ${task.stem} + galotne ${task.ending}.`;
  }
  return `${head}${context}`;
}

function collectUnique(values, exclude, limit) {
  const seen = new Set([normalizeAnswer(exclude)]);
  const picked = [];
  values.forEach((value) => {
    if (picked.length >= limit) return;
    const text = sanitizeText(value);
    const key = normalizeAnswer(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    picked.push(text);
  });
  return picked;
}
