import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  MAX_BOX,
  STAGES,
  applyResult,
  buildAssembleTask,
  buildExplanation,
  buildFormTask,
  buildMeaningTask,
  buildRound,
  buildStems,
  buildTask,
  calculateAccuracy,
  computeDailyStreak,
  describeDeck,
  hasConjugation,
  isCorrectAssembly,
  isCorrectChoice,
  normalizeRecords,
  normalizeVerbs,
  stageForBox,
  stageForVerb,
  xpForAnswer,
} from '../../../src/games/darbibas-vardi-v2/logic.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../darbibas-vardi-v2.html'), 'utf8');
const homepageScript = readFileSync(resolve(__dirname, '../../../scripts/homepage.js'), 'utf8');
const navConfig = readFileSync(resolve(__dirname, '../../../scripts/nav-config.js'), 'utf8');
const serviceWorker = readFileSync(resolve(__dirname, '../../../sw.js'), 'utf8');

function seededRng(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const RAW_VERBS = [
  {
    lv: 'abonēt',
    en: 'to subscribe',
    ru: 'подписываться',
    conj: {
      present: {
        '1s': 'abonēju',
        '2s': 'abonē',
        '3s': 'abonē',
        '1p': 'abonējam',
        '2p': 'abonējat',
        '3p': 'abonē',
      },
      past: {
        '1s': 'abonēju',
        '2s': 'abonēji',
        '3s': 'abonēja',
        '1p': 'abonējām',
        '2p': 'abonējāt',
        '3p': 'abonēja',
      },
      future: {
        '1s': 'abonēšu',
        '2s': 'abonēsi',
        '3s': 'abonēs',
        '1p': 'abonēsim',
        '2p': 'abonēsiet',
        '3p': 'abonēs',
      },
    },
  },
  {
    lv: 'iet',
    en: 'to go',
    ru: 'идти',
    conj: {
      present: { '1s': 'eju', '2s': 'ej', '3s': 'iet', '1p': 'ejam', '2p': 'ejat', '3p': 'iet' },
      past: {
        '1s': 'gāju',
        '2s': 'gāji',
        '3s': 'gāja',
        '1p': 'gājām',
        '2p': 'gājāt',
        '3p': 'gāja',
      },
      future: {
        '1s': 'iešu',
        '2s': 'iesi',
        '3s': 'ies',
        '1p': 'iesim',
        '2p': 'iesiet',
        '3p': 'ies',
      },
    },
  },
  { lv: 'lasīt', en: 'to read', ru: 'читать' },
  { lv: 'rakstīt', en: 'to write', ru: 'писать' },
  { lv: 'runāt', en: 'to speak', ru: 'говорить' },
];

const verbs = normalizeVerbs(RAW_VERBS);
const abonet = verbs[0];
const iet = verbs[1];
const lasit = verbs[2];

test('darbibas vardi v2 page exposes the elements the game wires up', () => {
  assert.ok(html.includes('<title>Darbības Vārdi V2 — Latvian B Level</title>'));
  [
    'dv2-error',
    'dv2-live',
    'dv2-xp',
    'dv2-daily-streak',
    'dv2-best-streak',
    'dv2-due-count',
    'dv2-learning-count',
    'dv2-mastered-count',
    'dv2-fresh-count',
    'dv2-mastery-bar',
    'dv2-deck-note',
    'dv2-speech-toggle',
    'dv2-haptics-toggle',
    'dv2-start',
    'dv2-reset',
    'dv2-quit',
    'dv2-stage-label',
    'dv2-progress',
    'dv2-progress-bar',
    'dv2-progress-text',
    'dv2-round-xp',
    'dv2-streak',
    'dv2-card',
    'dv2-prompt-label',
    'dv2-prompt',
    'dv2-speak',
    'dv2-context',
    'dv2-pronoun',
    'dv2-tense',
    'dv2-options',
    'dv2-builder',
    'dv2-build-stem',
    'dv2-build-ending',
    'dv2-stem-options',
    'dv2-ending-options',
    'dv2-check',
    'dv2-feedback',
    'dv2-feedback-title',
    'dv2-feedback-text',
    'dv2-next',
    'dv2-summary-accuracy',
    'dv2-summary-score',
    'dv2-summary-xp',
    'dv2-summary-streak',
    'dv2-summary-mastered',
    'dv2-review',
    'dv2-replay',
    'dv2-home',
  ].forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
  ['data-screen="start"', 'data-screen="play"', 'data-screen="summary"'].forEach((marker) => {
    assert.ok(html.includes(marker), `missing ${marker}`);
  });
  assert.ok(html.includes('data-language="en"'));
  assert.ok(html.includes('data-language="ru"'));
});

test('darbibas vardi v2 is registered in navigation, homepage, and offline cache', () => {
  assert.ok(navConfig.includes("{ href: 'darbibas-vardi-v2.html', label: 'Darbības Vārdi V2' }"));
  assert.ok(homepageScript.includes("title: 'Darbības Vārdi V2'"));
  assert.ok(homepageScript.includes("href: 'darbibas-vardi-v2.html'"));
  [
    './darbibas-vardi-v2.html',
    './src/games/darbibas-vardi-v2/index.js',
    './src/games/darbibas-vardi-v2/logic.js',
    './src/games/darbibas-vardi-v2/styles.css',
    './src/lib/words-data.js',
  ].forEach((asset) => {
    assert.ok(serviceWorker.includes(`'${asset}'`), `missing cached asset ${asset}`);
  });
});

test('normalizeVerbs keeps usable rows and drops the rest', () => {
  const normalized = normalizeVerbs([
    ...RAW_VERBS,
    { lv: 'abonēt', en: 'duplicate' },
    { lv: '', en: 'no lemma' },
    { lv: 'nezināms' },
    null,
  ]);
  assert.equal(normalized.length, RAW_VERBS.length);
  assert.equal(normalized[0].id, 'abonēt');
  assert.equal(normalized[0].conj.present['1s'], 'abonēju');
  assert.deepEqual(normalized[2].conj, {});
});

test('conjugation availability gates the form and build stages', () => {
  assert.equal(hasConjugation(abonet), true);
  assert.equal(hasConjugation(lasit), false);
  assert.equal(stageForBox(0), STAGES.MEANING);
  assert.equal(stageForBox(1), STAGES.MEANING);
  assert.equal(stageForBox(2), STAGES.FORM);
  assert.equal(stageForBox(4), STAGES.BUILD);
  assert.equal(stageForVerb(abonet, { box: 3 }), STAGES.BUILD);
  assert.equal(stageForVerb(lasit, { box: 3 }), STAGES.MEANING);
  assert.equal(stageForVerb(abonet, undefined), STAGES.MEANING);
});

test('applyResult promotes on success and resets the box on a miss', () => {
  const now = 1_000_000;
  const first = applyResult(undefined, true, now);
  assert.equal(first.box, 1);
  assert.equal(first.seen, 1);
  assert.equal(first.correct, 1);
  assert.ok(first.dueAt > now);

  const second = applyResult(first, false, now);
  assert.equal(second.box, 0);
  assert.equal(second.wrong, 1);
  assert.equal(second.dueAt, now, 'box 0 stays due so misses return in the same session');

  let record = { box: MAX_BOX, dueAt: 0, seen: 9, correct: 9, wrong: 0 };
  record = applyResult(record, true, now);
  assert.equal(record.box, MAX_BOX, 'box is capped');
});

test('normalizeRecords repairs corrupt persisted data', () => {
  const records = normalizeRecords({
    good: { box: 2, dueAt: 500, seen: 3, correct: 2, wrong: 1 },
    clamped: { box: 99, dueAt: -5, seen: 'x', correct: null, wrong: 1.9 },
    broken: 'nope',
  });
  assert.deepEqual(records.good, { box: 2, dueAt: 500, seen: 3, correct: 2, wrong: 1 });
  assert.deepEqual(records.clamped, { box: MAX_BOX, dueAt: 0, seen: 0, correct: 0, wrong: 1 });
  assert.equal('broken' in records, false);
  assert.deepEqual(normalizeRecords(null), {});
});

test('buildRound orders due verbs first, then weak, then unseen', () => {
  const now = 10_000;
  const records = {
    abonēt: { box: 1, dueAt: now - 100, seen: 4, correct: 3, wrong: 1 },
    iet: { box: 1, dueAt: now - 900, seen: 2, correct: 1, wrong: 1 },
    lasīt: { box: 1, dueAt: now + 5_000, seen: 5, correct: 1, wrong: 4 },
    rakstīt: { box: 3, dueAt: now + 9_000, seen: 6, correct: 6, wrong: 0 },
  };
  const round = buildRound(verbs, records, { size: 5, now, rng: seededRng(7) });
  assert.deepEqual(
    round.map((verb) => verb.id),
    ['iet', 'abonēt', 'lasīt', 'rakstīt', 'runāt'],
  );
});

test('buildRound still fills a round when nothing is scheduled', () => {
  const now = 10_000;
  const records = {};
  verbs.forEach((verb) => {
    records[verb.id] = { box: 2, dueAt: now + 60_000, seen: 3, correct: 3, wrong: 0 };
  });
  const round = buildRound(verbs, records, { size: 3, now, rng: seededRng(3) });
  assert.equal(round.length, 3);
  assert.deepEqual(buildRound([], records, { now }), []);
});

test('buildRound leads with reviews and caps how many unseen verbs join', () => {
  const now = 10_000;
  const records = {
    abonēt: { box: 1, dueAt: now + 60_000, seen: 1, correct: 1, wrong: 0 },
    iet: { box: 3, dueAt: now + 90_000, seen: 4, correct: 4, wrong: 0 },
    lasīt: { box: 1, dueAt: now + 120_000, seen: 1, correct: 1, wrong: 0 },
  };
  const round = buildRound(verbs, records, { size: 3, now, maxNew: 1, rng: seededRng(9) });
  assert.equal(round.length, 3);
  assert.equal(round.filter((verb) => !records[verb.id]).length, 1, 'one new verb per round');
  assert.deepEqual(
    round.slice(0, 2).map((verb) => verb.id),
    ['iet', 'abonēt'],
    'reviews come first, most advanced leading so higher stages get airtime',
  );

  // The cap relaxes when there is nothing left to review.
  const emptyDeck = buildRound(verbs, {}, { size: 4, now, maxNew: 1, rng: seededRng(9) });
  assert.equal(emptyDeck.length, 4);
});

test('describeDeck counts fresh, learning, due, and mastered verbs', () => {
  const now = 10_000;
  const summary = describeDeck(
    verbs,
    {
      abonēt: { box: MAX_BOX, dueAt: now + 10, seen: 8, correct: 8, wrong: 0 },
      iet: { box: 1, dueAt: now - 10, seen: 2, correct: 1, wrong: 1 },
    },
    now,
  );
  assert.deepEqual(summary, { total: 5, fresh: 3, learning: 1, due: 1, mastered: 1 });
});

test('buildMeaningTask fills four unique options that include the answer', () => {
  const rng = seededRng(11);
  const task = buildMeaningTask(abonet, verbs, { language: 'en', direction: 'lv-to-tr', rng });
  assert.equal(task.stage, STAGES.MEANING);
  assert.equal(task.prompt, 'abonēt');
  assert.equal(task.answer, 'to subscribe');
  assert.equal(task.options.length, 4);
  assert.equal(new Set(task.options).size, 4);
  assert.ok(task.options.includes(task.answer));
  assert.equal(task.speakText, 'abonēt');

  const reversed = buildMeaningTask(abonet, verbs, { language: 'ru', direction: 'tr-to-lv', rng });
  assert.equal(reversed.prompt, 'подписываться');
  assert.equal(reversed.answer, 'abonēt');
  assert.ok(reversed.options.includes('abonēt'));
});

test('buildMeaningTask returns null when the pool cannot fill the options', () => {
  assert.equal(buildMeaningTask(abonet, [abonet], { rng: seededRng(2) }), null);
});

test('buildFormTask uses the verb own forms as near-miss distractors', () => {
  const task = buildFormTask(abonet, { tense: 'past', person: '1s', rng: seededRng(5) });
  assert.equal(task.stage, STAGES.FORM);
  assert.equal(task.answer, 'abonēju');
  assert.equal(task.pronoun, 'es');
  assert.equal(task.tenseLabel, 'pagātne');
  assert.equal(task.options.length, 4);
  assert.equal(new Set(task.options).size, 4);
  assert.ok(task.options.includes('abonēju'));

  const ownForms = new Set(
    ['present', 'past', 'future'].flatMap((tense) => Object.values(abonet.conj[tense])),
  );
  task.options.forEach((option) => assert.ok(ownForms.has(option), `${option} is not a verb form`));
});

test('buildStems splits every tense so each person keeps a non-empty ending', () => {
  const stems = buildStems(abonet);
  assert.deepEqual(Object.keys(stems).sort(), ['future', 'past', 'present']);
  Object.entries(stems).forEach(([tense, stem]) => {
    assert.ok(stem.length >= 2, `${tense} stem is too short`);
    Object.values(abonet.conj[tense]).forEach((form) => {
      assert.ok(form.startsWith(stem), `${form} does not start with ${stem}`);
      assert.ok(form.length > stem.length, `${form} would have an empty ending`);
    });
  });

  // "iet" has no shared present prefix, so that tense is skipped entirely.
  assert.deepEqual(Object.keys(buildStems(iet)).sort(), ['future', 'past']);
  assert.deepEqual(buildStems(lasit), {});
});

test('buildAssembleTask produces parts that rebuild the answer', () => {
  const task = buildAssembleTask(abonet, { tense: 'past', person: '1p', rng: seededRng(13) });
  assert.equal(task.stage, STAGES.BUILD);
  assert.equal(task.answer, 'abonējām');
  assert.equal(`${task.stem}${task.ending}`, task.answer);
  assert.ok(task.stemOptions.includes(task.stem));
  assert.ok(task.endingOptions.includes(task.ending));
  assert.equal(new Set(task.endingOptions).size, task.endingOptions.length);
  assert.ok(isCorrectAssembly(task.stem, task.ending, task));
  assert.equal(isCorrectAssembly(task.stem, 'xx', task), false);

  assert.equal(buildAssembleTask(lasit, { rng: seededRng(1) }), null);
});

test('buildTask steps down the ladder when a stage is impossible', () => {
  const build = buildTask(abonet, verbs, { stage: STAGES.BUILD, rng: seededRng(21) });
  assert.equal(build.stage, STAGES.BUILD);
  assert.equal(build.lv, 'abonēt');
  assert.equal(build.translation, 'to subscribe');

  const fallback = buildTask(lasit, verbs, { stage: STAGES.BUILD, rng: seededRng(21) });
  assert.equal(fallback.stage, STAGES.MEANING);

  const russian = buildTask(lasit, verbs, {
    stage: STAGES.MEANING,
    language: 'ru',
    rng: seededRng(4),
  });
  assert.equal(russian.translation, 'читать');
});

test('isCorrectChoice ignores case and stray whitespace', () => {
  const task = { answer: 'abonēju' };
  assert.equal(isCorrectChoice('  AbonĒju ', task), true);
  assert.equal(isCorrectChoice('abonēji', task), false);
  assert.equal(isCorrectChoice('abonēju', null), false);
});

test('scoring helpers stay within expected bounds', () => {
  assert.equal(calculateAccuracy(0, 0), 0);
  assert.equal(calculateAccuracy(3, 4), 75);
  assert.equal(xpForAnswer(STAGES.MEANING, 0), 10);
  assert.equal(xpForAnswer(STAGES.FORM, 2), 19);
  assert.equal(xpForAnswer(STAGES.BUILD, 99), 30, 'streak bonus is capped');
  assert.equal(xpForAnswer('unknown', 0), 10);
});

test('computeDailyStreak grows on consecutive days and resets after a gap', () => {
  // Midday timestamps keep the local-calendar comparison stable in any timezone.
  const today = Date.parse('2026-03-10T12:00:00Z');
  assert.equal(computeDailyStreak('', 0, today), 1);
  assert.equal(computeDailyStreak('2026-03-10T12:00:00Z', 4, today), 4);
  assert.equal(computeDailyStreak('2026-03-09T12:00:00Z', 4, today), 5);
  assert.equal(computeDailyStreak('2026-03-01T12:00:00Z', 4, today), 1);
  assert.equal(computeDailyStreak('not-a-date', 4, today), 1);
});

test('buildExplanation names the answer and its grammatical context', () => {
  const meaning = buildTask(lasit, verbs, { stage: STAGES.MEANING, rng: seededRng(6) });
  // The pair itself is the explanation, whichever direction was asked.
  assert.equal(buildExplanation(meaning, true), 'lasīt — to read.');
  assert.equal(buildExplanation(meaning, false), 'lasīt — to read.');

  const form = buildTask(abonet, verbs, { stage: STAGES.FORM, rng: seededRng(2) });
  assert.ok(buildExplanation(form, false).startsWith(`Pareizā atbilde: ${form.answer}.`));

  const build = buildTask(abonet, verbs, { stage: STAGES.BUILD, rng: seededRng(9) });
  const text = buildExplanation(build, false);
  assert.ok(text.includes(build.stem));
  assert.ok(text.includes(build.ending));
  assert.equal(buildExplanation(null, true), '');
});
