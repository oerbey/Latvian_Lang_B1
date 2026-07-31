/**
 * DOM rendering and focus management for Sentence Surgery – Passive.
 */

import { mustId } from '../../lib/dom.js';

const NO_SPACE_BEFORE = new Set(['.', ',', '?', '!', ';', ':', ')', ']', '}', '»', '”', '"']);
const NO_SPACE_AFTER = new Set(['(', '[', '{', '«', '“', '"']);

const REQUIRED_IDS = [
  'sspv-title',
  'sspv-progressText',
  'sspv-progressBar',
  'sspv-streakValue',
  'sspv-settingsOpen',
  'sspv-settingsDialog',
  'sspv-settingsClose',
  'sspv-topic',
  'sspv-mode',
  'sspv-language',
  'sspv-attemptsValue',
  'sspv-correctValue',
  'sspv-accuracyValue',
  'sspv-completedValue',
  'sspv-reviewCompleted',
  'sspv-resetProgress',
  'sspv-applySettings',
  'sspv-round',
  'sspv-roundText',
  'sspv-topicBadge',
  'sspv-focusBadge',
  'sspv-promptTitle',
  'sspv-sentence',
  'sspv-choices',
  'sspv-hint',
  'sspv-feedback',
  'sspv-feedbackIcon',
  'sspv-feedbackTitle',
  'sspv-feedbackBody',
  'sspv-correction',
  'sspv-translation',
  'sspv-next',
  'sspv-complete',
  'sspv-completeTitle',
  'sspv-completeBody',
  'sspv-practiceAgain',
  'sspv-changeTopic',
  'sspv-live',
];

export function collectSentenceSurgeryNodes() {
  return Object.fromEntries(
    REQUIRED_IDS.map((id) => [
      id.replace(/^sspv-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
      mustId(id),
    ]),
  );
}

function appendSentenceToken(container, token, previousToken, node = null) {
  if (previousToken && !NO_SPACE_BEFORE.has(token) && !NO_SPACE_AFTER.has(previousToken)) {
    container.append(' ');
  }
  container.append(node || document.createTextNode(token));
}

export function renderRound(nodes, round, { topicLabel, focusLabel, t }) {
  nodes.round.hidden = false;
  nodes.complete.hidden = true;
  nodes.round.dataset.state = 'active';
  nodes.round.classList.remove('is-success', 'is-celebrating');
  nodes.topicBadge.textContent = topicLabel;
  nodes.focusBadge.textContent = focusLabel;
  nodes.sentence.replaceChildren();

  const tokens = [...round.prefixTokens, round.brokenToken, ...round.suffixTokens];
  tokens.forEach((token, index) => {
    const isRepairSlot = index === round.repairIndex;
    const slot = isRepairSlot ? document.createElement('mark') : null;
    if (slot) {
      slot.className = 'sspv-repair-slot';
      slot.dataset.repairSlot = 'true';
      slot.textContent = token;
      slot.setAttribute('aria-label', t('aria.repairSlot', { word: token }));
      slot.setAttribute('aria-describedby', 'sspv-choicePrompt');
    }
    appendSentenceToken(nodes.sentence, token, tokens[index - 1] || '', slot);
  });

  nodes.choices.replaceChildren();
  round.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sspv-choice';
    button.dataset.choice = choice;
    button.dataset.state = 'available';
    button.setAttribute(
      'aria-label',
      t('choices.choiceAria', { wrong: round.brokenToken, choice }),
    );

    const key = document.createElement('span');
    key.className = 'sspv-choice__key';
    key.textContent = String(index + 1);
    key.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'sspv-choice__label';
    label.textContent = choice;
    button.append(key, label);
    nodes.choices.appendChild(button);
  });

  nodes.hint.disabled = false;
  nodes.hint.removeAttribute('aria-disabled');
  nodes.next.hidden = true;
  hideFeedback(nodes);
}

export function renderProgress(
  nodes,
  { completed, total, attempts, correct, streak, roundNumber, roundTotal, reviewMode },
  t,
) {
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.min(Math.max(0, completed), safeTotal);
  nodes.progressText.textContent = reviewMode
    ? t('round.eyebrow', { current: roundNumber, total: roundTotal })
    : t('header.progressValue', { completed: safeCompleted, total: safeTotal });
  nodes.progressBar.max = Math.max(1, safeTotal);
  nodes.progressBar.value = safeCompleted;
  nodes.progressBar.setAttribute('aria-valuemin', '0');
  nodes.progressBar.setAttribute('aria-valuemax', String(safeTotal));
  nodes.progressBar.setAttribute('aria-valuenow', String(safeCompleted));
  nodes.progressBar.setAttribute(
    'aria-valuetext',
    t('aria.progress', { completed: safeCompleted, total: safeTotal }),
  );
  nodes.streakValue.textContent = String(streak);
  nodes.roundText.textContent = `${roundNumber} / ${roundTotal}`;
  nodes.attemptsValue.textContent = String(attempts);
  nodes.correctValue.textContent = String(correct);
  nodes.accuracyValue.textContent = `${attempts ? Math.round((correct / attempts) * 100) : 0}%`;
  nodes.completedValue.textContent = `${safeCompleted} / ${safeTotal}`;
  nodes.reviewCompleted.disabled = safeCompleted === 0;
}

export function populateTopicOptions(nodes, topics, selectedTopic, getTopicLabel) {
  nodes.topic.replaceChildren();
  ['all', ...topics].forEach((topic) => {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = getTopicLabel(topic);
    nodes.topic.appendChild(option);
  });
  nodes.topic.value = selectedTopic;
}

export function syncSettingsControls(nodes, { topic, order, language }) {
  nodes.topic.value = topic;
  nodes.mode.value = order;
  nodes.language.value = language;
}

export function hideFeedback(nodes) {
  nodes.feedback.hidden = true;
  nodes.feedback.dataset.tone = 'info';
  nodes.feedbackIcon.textContent = '';
  nodes.feedbackTitle.textContent = '';
  nodes.feedbackBody.textContent = '';
  nodes.correction.hidden = true;
  nodes.correction.textContent = '';
  nodes.translation.hidden = true;
  nodes.translation.textContent = '';
}

export function showFeedback(
  nodes,
  {
    tone = 'info',
    icon = 'i',
    title = '',
    body = '',
    correction = '',
    translation = '',
    showNext = false,
    announcement = '',
  },
) {
  nodes.feedback.hidden = false;
  nodes.feedback.dataset.tone = tone;
  nodes.feedbackIcon.textContent = icon;
  nodes.feedbackTitle.textContent = title;
  nodes.feedbackBody.textContent = body;
  nodes.correction.textContent = correction;
  nodes.correction.hidden = !correction;
  nodes.translation.textContent = translation;
  nodes.translation.hidden = !translation;
  nodes.next.hidden = !showNext;
  announce(nodes, announcement || [title, body].filter(Boolean).join(' '));
}

export function markChoiceWrong(nodes, button, t) {
  button.classList.add('is-wrong');
  button.dataset.state = 'wrong';
  button.disabled = true;
  button.setAttribute(
    'aria-label',
    `${button.dataset.choice || button.textContent.trim()}. ${t('choices.incorrect')}`,
  );

  const nextChoice = getChoiceButtons(nodes).find((candidate) => !candidate.disabled);
  nextChoice?.focus({ preventScroll: true });
}

export function markRoundCorrect(nodes, correctChoice, t) {
  getChoiceButtons(nodes).forEach((button) => {
    const isCorrect = button.dataset.choice === correctChoice;
    button.disabled = true;
    if (isCorrect) {
      button.classList.add('is-correct');
      button.dataset.state = 'correct';
      button.setAttribute('aria-label', `${correctChoice}. ${t('choices.correct')}`);
    }
  });
  nodes.hint.disabled = true;
  nodes.round.dataset.state = 'success';
  nodes.round.classList.add('is-success', 'is-celebrating');
}

export function showCompletion(nodes, { title, body, announcement }) {
  nodes.round.hidden = true;
  nodes.complete.hidden = false;
  nodes.completeTitle.textContent = title;
  nodes.completeBody.textContent = body;
  announce(nodes, announcement || `${title} ${body}`);
  nodes.completeTitle.tabIndex = -1;
  nodes.completeTitle.focus({ preventScroll: true });
}

export function announce(nodes, message) {
  nodes.live.textContent = '';
  queueMicrotask(() => {
    nodes.live.textContent = message;
  });
}

export function focusPrompt(nodes) {
  nodes.promptTitle.tabIndex = -1;
  nodes.promptTitle.focus({ preventScroll: true });
}

export function focusNext(nodes) {
  nodes.next.focus({ preventScroll: true });
}

export function getChoiceButtons(nodes) {
  return Array.from(nodes.choices.querySelectorAll('button[data-choice]'));
}
