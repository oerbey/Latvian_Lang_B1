import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPersonalityData } from '../../scripts/personality_csv_to_json.mjs';

test('buildPersonalityData normalizes English and sorts by id', () => {
  const csv = [
    'id,lv,en,group,notes',
    'b,good,free; independent,optimists,adjective',
    ',missing,skip,neutral,should skip',
    'a,old,"worn; used",neutral,"note, with comma"',
  ].join('\n');

  const { items, skipped } = buildPersonalityData(csv);

  assert.equal(skipped.length, 1);
  assert.deepEqual(items, [
    {
      id: 'a',
      lv: 'old',
      eng: 'worn / used',
      group: 'neutral',
      notes: 'note, with comma',
    },
    {
      id: 'b',
      lv: 'good',
      eng: 'free / independent',
      group: 'optimists',
      notes: 'adjective',
    },
  ]);
});
