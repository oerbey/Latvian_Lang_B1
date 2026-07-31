import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySentenceSurgeryTranslations,
  formatString,
  getFocusLabel,
  getString,
  getTopicLabel,
  loadSentenceSurgeryStrings,
  resolveDottedKey,
  resolveSupportedLanguage,
} from '../../../src/games/sentence-surgery-passive/i18n.js';

const strings = {
  pageTitle: 'Sentence Surgery test',
  title: 'Repair it',
  settings: {
    open: 'Open settings',
  },
  topics: {
    all: 'All topics',
    real_estate: 'Real estate',
  },
  focus: {
    aux_tense: 'Auxiliary tense',
    other: 'Other grammar form',
  },
  progress: '{completed} of {total}',
};

test('resolves only supported language codes from locale values', () => {
  assert.equal(resolveSupportedLanguage('RU-ru'), 'ru');
  assert.equal(resolveSupportedLanguage('en_US'), 'en');
  assert.equal(resolveSupportedLanguage('de-DE'), 'lv');
  assert.equal(resolveSupportedLanguage('', 'en-GB'), 'en');
  assert.equal(resolveSupportedLanguage(null, 'de'), 'lv');
});

test('resolves namespace-local dotted keys and interpolates replacements', () => {
  assert.equal(resolveDottedKey(strings, 'settings.open'), 'Open settings');
  assert.equal(resolveDottedKey(strings, 'sentenceSurgery.settings.open'), 'Open settings');
  assert.equal(resolveDottedKey(strings, 'settings.missing', 'Fallback'), 'Fallback');
  assert.equal(getString(strings, 'progress', '', { completed: 0, total: 52 }), '0 of 52');
  assert.equal(
    formatString('Repair {answer}; {missing}', { answer: 'tiek' }),
    'Repair tiek; {missing}',
  );
});

test('labels known topics and focus types with readable unknown fallbacks', () => {
  assert.equal(getTopicLabel(strings, 'real_estate'), 'Real estate');
  assert.equal(getTopicLabel(strings), 'All topics');
  assert.equal(getTopicLabel(strings, 'new_context'), 'New context');
  assert.equal(getFocusLabel(strings, 'aux_tense'), 'Auxiliary tense');
  assert.equal(getFocusLabel(strings, 'word_order'), 'Other grammar form');
});

test('applies text and attributes only within the requested root', () => {
  document.body.innerHTML = `
    <p id="outside" data-i18n-key="title">Outside</p>
    <main id="exercise">
      <h1 data-i18n-key="title">Old title</h1>
      <button data-i18n-key="settings.open" data-i18n-attr="aria-label">Menu</button>
      <span data-i18n-key="progress">Old progress</span>
    </main>
  `;
  const root = document.getElementById('exercise');

  const language = applySentenceSurgeryTranslations(strings, 'en-GB', root, {
    completed: 3,
    total: 52,
  });

  assert.equal(language, 'en');
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.title, 'Sentence Surgery test');
  assert.equal(root.querySelector('h1').textContent, 'Repair it');
  assert.equal(root.querySelector('button').getAttribute('aria-label'), 'Open settings');
  assert.equal(root.querySelector('button').textContent, 'Menu');
  assert.equal(root.querySelector('span').textContent, '3 of 52');
  assert.equal(document.getElementById('outside').textContent, 'Outside');
});

test('loads the namespace from the first available language fallback', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/i18n/ru.json')) {
      return { ok: false, status: 503 };
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return { sentenceSurgery: { title: 'Teikumu ķirurģija' } };
      },
    };
  };

  const result = await loadSentenceSurgeryStrings('ru-RU', {
    fetchImpl,
    warnings: { warn() {} },
  });

  assert.deepEqual(result, {
    strings: { title: 'Teikumu ķirurģija' },
    lang: 'lv',
  });
  assert.equal(requests.length, 2);
  assert.ok(requests[0].url.endsWith('/i18n/ru.json'));
  assert.ok(requests[1].url.endsWith('/i18n/lv.json'));
  assert.deepEqual(requests[0].options, { cache: 'no-store' });
});

test('rejects after every translation candidate fails', async () => {
  const fetchImpl = async () => ({ ok: false, status: 500 });
  await assert.rejects(
    loadSentenceSurgeryStrings('lv', { fetchImpl, warnings: { warn() {} } }),
    /could not be loaded/u,
  );
});
