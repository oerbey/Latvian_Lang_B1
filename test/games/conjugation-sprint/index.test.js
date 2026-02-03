import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../conjugation-sprint.html'), 'utf8');

test('should load the game environment', () => {
  assert.ok(html.includes('<title>Conjugation Sprint — Latvian B1</title>'));
  assert.ok(/<h1[^>]*>\s*Conjugation Sprint\s*<\/h1>/.test(html));
});

test('should have all necessary elements present', () => {
  const ids = ['qtext', 'meta', 'choices', 'score', 'streak', 'round', 'skip', 'again', 'perstats'];
  ids.forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
});
