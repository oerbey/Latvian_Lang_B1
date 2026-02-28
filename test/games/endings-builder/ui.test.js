import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRoundBrief,
  formatGramLabel,
  resolveGramColumnKey,
} from '../../../src/games/endings-builder/ui.js';

const strings = {
  cases: {
    NOM: 'Nominative',
    GEN: 'Genitive',
  },
  labels: {
    columns: {
      SG: 'Singular',
      SG_F: 'SG fem',
    },
  },
  round: {
    eyebrow: 'Round {round}',
    targetTemplate: 'Build the {gram} form.',
    wordTemplate: 'Word: {lemma} ({meaning})',
  },
};

test('resolveGramColumnKey handles nouns and adjectives', () => {
  assert.equal(resolveGramColumnKey({ case: 'GEN', number: 'SG' }), 'SG');
  assert.equal(resolveGramColumnKey({ case: 'NOM', number: 'SG', gender: 'F' }), 'SG_F');
});

test('formatGramLabel localizes case and number labels', () => {
  const nounLabel = formatGramLabel({ case: 'GEN', number: 'SG' }, strings);
  const adjectiveLabel = formatGramLabel({ case: 'NOM', number: 'SG', gender: 'F' }, strings);

  assert.equal(nounLabel, 'Genitive · Singular');
  assert.equal(adjectiveLabel, 'Nominative · SG fem');
});

test('buildRoundBrief composes target and bilingual lexeme metadata', () => {
  const round = {
    item: {
      stem: 'skolotāj',
      translation: { lv: 'skolotājs', en: 'teacher' },
    },
    gram: { case: 'GEN', number: 'SG' },
  };
  const brief = buildRoundBrief({ round, state: { roundNumber: 3 }, strings });

  assert.equal(brief.eyebrow, 'Round 3');
  assert.equal(brief.title, 'Build the Genitive · Singular form.');
  assert.equal(brief.meta, 'Word: skolotājs (teacher)');
});
