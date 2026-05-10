import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildTasks,
  fillBlank,
  isCorrectChoice,
  normalizeSimilarWordData,
} from '../../../src/games/similar-word-groups/logic.js';

const payload = JSON.parse(
  readFileSync(new URL('../../../data/similar-word-groups.json', import.meta.url), 'utf8'),
);

describe('similar-word-groups logic', () => {
  it('normalizes the supplied word groups without dropping duplicate words', () => {
    const groups = normalizeSimilarWordData(payload);
    const tasks = buildTasks(groups);

    assert.equal(groups.length, 11);
    assert.equal(tasks.length, 33);
    assert.equal(tasks.filter((task) => task.answer === 'nepieciešama').length, 2);
    assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
  });

  it('builds tasks with group-local choices and the correct answer included', () => {
    const groups = normalizeSimilarWordData(payload);
    const tasks = buildTasks(groups);

    assert.ok(
      tasks.every((task) => task.choices.length === 3 && task.choices.includes(task.answer)),
    );
    assert.deepEqual(tasks[0].choices, ['atzīmēta', 'piezīmēta', 'pārzīmēta']);
    assert.equal(tasks[0].meaningEn, 'marked, noted');
  });

  it('fills sentence blanks and evaluates exact choices', () => {
    const groups = normalizeSimilarWordData(payload);
    const [task] = buildTasks(groups);

    assert.equal(fillBlank(task.sentenceLv, task.answer), 'Šī kļūda ir atzīmēta pārskatā.');
    assert.equal(isCorrectChoice('atzīmēta', task), true);
    assert.equal(isCorrectChoice('piezīmēta', task), false);
  });
});
