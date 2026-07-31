import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  collectSentenceSurgeryNodes,
  focusNext,
  markChoiceWrong,
  markRoundCorrect,
  renderProgress,
  renderRound,
  showFeedback,
} from '../../../src/games/sentence-surgery-passive/ui.js';

const html = readFileSync(
  new URL('../../../sentence-surgery-passive.html', import.meta.url),
  'utf8',
);
const parsedBody = html.match(/<body[^>]*>([\s\S]*)<\/body>/iu)?.[1] || '';

const strings = {
  'aria.repairSlot': ({ word }) => `Repair ${word}`,
  'choices.choiceAria': ({ wrong, choice }) => `Replace ${wrong} with ${choice}`,
  'choices.incorrect': () => 'Incorrect',
  'choices.correct': () => 'Correct',
  'header.progressValue': ({ completed, total }) => `${completed} of ${total}`,
  'round.eyebrow': ({ current, total }) => `Review ${current} of ${total}`,
  'aria.progress': ({ completed, total }) => `${completed} of ${total} completed`,
};

function t(key, replacements = {}) {
  return strings[key]?.(replacements) || key;
}

function mountRound() {
  document.body.innerHTML = parsedBody;
  const nodes = collectSentenceSurgeryNodes();
  const round = {
    topic: 'library',
    error: { type: 'participle_agreement' },
    repairIndex: 2,
    prefixTokens: ['Grāmata', 'tiek'],
    brokenToken: 'lasīts',
    suffixTokens: ['.'],
    choices: ['lasīta', 'lasīti', 'lasītas'],
  };
  renderRound(nodes, round, {
    topicLabel: 'Library',
    focusLabel: 'Participle agreement',
    t,
  });
  return { nodes, round };
}

test('renders one prose sentence with one inline repair slot and localized choices', () => {
  const { nodes } = mountRound();

  assert.equal(nodes.sentence.textContent, 'Grāmata tiek lasīts.');
  assert.equal(nodes.sentence.querySelectorAll('[data-repair-slot]').length, 1);
  assert.equal(nodes.sentence.querySelectorAll('button').length, 0);
  assert.equal(nodes.choices.querySelectorAll('button').length, 3);
  assert.equal(
    nodes.sentence.querySelector('[data-repair-slot]').getAttribute('aria-label'),
    'Repair lasīts',
  );
  assert.equal(
    nodes.choices.querySelector('button').getAttribute('aria-label'),
    'Replace lasīts with lasīta',
  );
  assert.equal(nodes.translation.hidden, true);
  assert.equal(document.querySelectorAll('[aria-live]').length, 1);
});

test('keeps translation hidden until feedback for an attempted answer', () => {
  const { nodes } = mountRound();

  assert.equal(nodes.translation.hidden, true);
  showFeedback(nodes, {
    tone: 'error',
    title: 'Try again',
    body: 'Check agreement.',
    translation: 'Translation: The book is being read.',
    announcement: 'Incorrect. Try again.',
  });

  assert.equal(nodes.translation.hidden, false);
  assert.equal(nodes.translation.lang, 'en');
  assert.match(nodes.translation.textContent, /The book is being read/u);
});

test('wrong-answer focus survives progress rendering and success moves focus to Next', () => {
  const { nodes } = mountRound();
  const [wrongButton, correctButton] = nodes.choices.querySelectorAll('button');

  markChoiceWrong(nodes, wrongButton, t);
  renderProgress(
    nodes,
    {
      completed: 0,
      total: 52,
      attempts: 1,
      correct: 0,
      streak: 0,
      roundNumber: 1,
      roundTotal: 52,
      reviewMode: false,
    },
    t,
  );
  assert.equal(document.activeElement, correctButton);
  assert.equal(wrongButton.dataset.state, 'wrong');

  markRoundCorrect(nodes, correctButton.dataset.choice, t);
  showFeedback(nodes, {
    tone: 'success',
    title: 'Correct',
    body: 'Agreement restored.',
    showNext: true,
  });
  focusNext(nodes);

  assert.equal(nodes.next.hidden, false);
  assert.equal(document.activeElement, nodes.next);
  assert.equal(correctButton.dataset.state, 'correct');
});
