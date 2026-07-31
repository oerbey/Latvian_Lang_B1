import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const html = readFileSync(resolve(__dirname, '../../../sentence-surgery-passive.html'), 'utf8');

test('sentence surgery page has expected title', () => {
  assert.ok(html.includes('<title>Sentence Surgery — Ciešamā kārta | Latvian B Level</title>'));
  assert.ok(/<h1[^>]*id="sspv-title"[^>]*>Sentence Surgery<\/h1>/.test(html));
});

test('sentence surgery page includes the focused repair controls', () => {
  const ids = [
    'sspv-mode',
    'sspv-topic',
    'sspv-language',
    'sspv-focusBadge',
    'sspv-sentence',
    'sspv-choices',
    'sspv-feedback',
    'sspv-next',
    'sspv-hint',
    'sspv-progressText',
    'sspv-progressBar',
    'sspv-settingsDialog',
    'sspv-reviewCompleted',
    'sspv-complete',
    'sspv-live',
  ];

  ids.forEach((id) => {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing id ${id}`);
  });
});

test('sentence surgery page has one live region and no legacy drag/token controls', () => {
  assert.equal((html.match(/aria-live=/g) || []).length, 1);
  assert.equal(html.includes('draggable='), false);
  ['sspv-sentenceTokens', 'sspv-wordBank', 'sspv-check', 'sspv-translationToggle'].forEach(
    (legacyId) => assert.equal(html.includes(`id="${legacyId}"`), false),
  );
});
