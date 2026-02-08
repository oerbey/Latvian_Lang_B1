import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../sentence-surgery-passive.html'), 'utf8');

test('sentence surgery page has expected title', () => {
  assert.ok(html.includes('<title>Sentence Surgery — Ciešamā kārta | Latvian B1</title>'));
  assert.ok(/<h1[^>]*>Sentence Surgery — Ciešamā kārta<\/h1>/.test(html));
});

test('sentence surgery page includes required controls', () => {
  const ids = [
    'sspv-mode',
    'sspv-topic',
    'sspv-sentenceTokens',
    'sspv-wordBank',
    'sspv-check',
    'sspv-reset',
    'sspv-next',
    'sspv-hint',
    'sspv-progressText',
  ];

  ids.forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
});
