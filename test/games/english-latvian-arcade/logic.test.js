import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRound, normalizeLvEnUnits } from '../../../src/games/english-latvian-arcade/logic.js';

test('normalizeLvEnUnits filters invalid rows and deduplicates EN/LV pairs', () => {
  const payloads = [
    {
      name: 'Unit A',
      entries: [
        { translations: { en: 'to drive in', lv: 'iebraukt' }, tags: ['movement', 'movement'] },
        { translations: { en: 'to drive in', lv: 'iebraukt' } },
        { translations: { en: 'to drive out', lv: 'izbraukt' } },
        { translations: { en: '', lv: 'invalid' } },
      ],
    },
    {
      name: 'Unit B',
      entries: [{ translations: { en: 'to cross', lv: 'pāriet' }, tags: ['prefix:pār'] }],
    },
  ];

  const rows = normalizeLvEnUnits(payloads);
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => row.lv),
    ['iebraukt', 'izbraukt', 'pāriet'],
  );
  assert.deepEqual(rows[0].tags, ['movement']);
  assert.equal(rows[0].id, 'lv-en-1');
});

test('buildRound includes one correct option and unique distractors', () => {
  const entries = [
    { id: '1', en: 'to drive in', lv: 'iebraukt' },
    { id: '2', en: 'to drive out', lv: 'izbraukt' },
    { id: '3', en: 'to cross', lv: 'pāriet' },
    { id: '4', en: 'to climb', lv: 'uzkāpt' },
  ];

  let seed = 7;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const round = buildRound(entries[0], entries, rng, 3);

  assert.equal(round.prompt.en, 'to drive in');
  assert.equal(round.options.length, 3);
  assert.equal(round.options.filter((option) => option.isCorrect).length, 1);

  const lvValues = round.options.map((option) => option.lv);
  assert.equal(new Set(lvValues).size, lvValues.length);
  assert.ok(lvValues.includes('iebraukt'));
});
