import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOptions,
  buildPromptPool,
  calculateScoreDelta,
  isValidForm,
  normalizePaceMode,
} from '../../../src/games/conjugation-sprint/logic.js';

function buildConj(one, two, three, four, five, six) {
  return {
    '1s': one,
    '2s': two,
    '3s': three,
    '1p': four,
    '2p': five,
    '3p': six,
  };
}

test('isValidForm rejects blanks and placeholder dashes', () => {
  assert.equal(isValidForm('forma'), true);
  assert.equal(isValidForm('  forma  '), true);
  assert.equal(isValidForm(''), false);
  assert.equal(isValidForm('  '), false);
  assert.equal(isValidForm('-'), false);
  assert.equal(isValidForm('–'), false);
  assert.equal(isValidForm('—'), false);
});

test('buildPromptPool excludes invalid forms and honors tense filter', () => {
  const items = [
    {
      lv: 'sāpēt',
      en: 'to ache',
      conj: {
        present: buildConj('—', 'sāp', 'sāp', 'sāp', 'sāp', 'sāp'),
        past: buildConj('—', 'sāpēja', 'sāpēja', 'sāpēja', 'sāpēja', 'sāpēja'),
        future: buildConj('—', 'sāpēs', 'sāpēs', 'sāpēs', 'sāpēs', 'sāpēs'),
      },
    },
    {
      lv: 'iet',
      en: 'to go',
      conj: {
        present: buildConj('eju', 'ej', 'iet', 'ejam', 'ejat', 'iet'),
        past: buildConj('gāju', 'gāji', 'gāja', 'gājām', 'gājāt', 'gāja'),
        future: buildConj('iešu', 'iesi', 'ies', 'iesim', 'iesiet', 'ies'),
      },
    },
  ];

  const presentOnly = buildPromptPool(items, 'present');
  assert.ok(presentOnly.length > 0);
  assert.ok(presentOnly.every((entry) => entry.tense === 'present'));
  assert.ok(!presentOnly.some((entry) => entry.correct === '—'));

  const random = buildPromptPool(items, 'random');
  assert.ok(random.some((entry) => entry.tense === 'past'));
  assert.ok(random.some((entry) => entry.tense === 'future'));
});

test('buildOptions creates four non-empty unique options with fallback distractors', () => {
  const prompt = {
    key: '0:present:1s',
    verbIndex: 0,
    tense: 'present',
    slot: '1s',
    correct: 'eju',
  };

  const pool = [
    prompt,
    { key: '0:present:2s', verbIndex: 0, tense: 'present', slot: '2s', correct: 'ej' },
    { key: '1:present:1s', verbIndex: 1, tense: 'present', slot: '1s', correct: 'skrienu' },
    { key: '2:present:1s', verbIndex: 2, tense: 'present', slot: '1s', correct: 'lasu' },
    { key: '3:present:3s', verbIndex: 3, tense: 'present', slot: '3s', correct: 'redz' },
  ];

  const options = buildOptions(prompt, pool);
  assert.equal(options.length, 4);
  assert.ok(options.includes('eju'));

  const uniqueCount = new Set(options).size;
  assert.equal(uniqueCount, 4);
  assert.ok(options.every((value) => value.trim().length > 0));
});

test('buildOptions returns empty when enough distractors cannot be built', () => {
  const prompt = {
    key: '0:present:1s',
    verbIndex: 0,
    tense: 'present',
    slot: '1s',
    correct: 'vajag',
  };

  const pool = [
    prompt,
    { key: '0:present:2s', verbIndex: 0, tense: 'present', slot: '2s', correct: 'vajag' },
  ];

  assert.deepEqual(buildOptions(prompt, pool), []);
});

test('calculateScoreDelta handles timed and untimed scoring rules', () => {
  assert.equal(calculateScoreDelta({ result: 'correct', paceMode: 'timed', remainingMs: 6000 }), 4);
  assert.equal(calculateScoreDelta({ result: 'correct', paceMode: 'timed', remainingMs: 3000 }), 3);
  assert.equal(calculateScoreDelta({ result: 'correct', paceMode: 'timed', remainingMs: 800 }), 2);
  assert.equal(
    calculateScoreDelta({ result: 'correct', paceMode: 'untimed', remainingMs: 6000 }),
    2,
  );

  assert.equal(calculateScoreDelta({ result: 'wrong', paceMode: 'timed', remainingMs: 1200 }), -1);
  assert.equal(calculateScoreDelta({ result: 'skip', paceMode: 'timed', remainingMs: 1200 }), -1);
  assert.equal(calculateScoreDelta({ result: 'timeout', paceMode: 'timed', remainingMs: 0 }), -1);
  assert.equal(calculateScoreDelta({ result: 'other', paceMode: 'timed', remainingMs: 0 }), 0);

  assert.equal(normalizePaceMode('timed'), 'timed');
  assert.equal(normalizePaceMode('untimed'), 'untimed');
  assert.equal(normalizePaceMode('unexpected'), 'timed');
});
