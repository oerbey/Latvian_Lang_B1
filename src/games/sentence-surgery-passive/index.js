/**
 * Sentence Surgery – Passive focused-repair controller.
 *
 * The controller coordinates pure queue/grading rules, persistence,
 * localisation, and the DOM renderer. Answer buttons grade immediately;
 * incorrect choices remain retryable until the exact target form is chosen.
 */

import { showFatalError } from '../../lib/errors.js';
import { loadAppState, saveAppState } from '../../lib/storage.js';
import { extractTopics, loadSentenceSurgeryDataset } from './data.js';
import {
  applySentenceSurgeryTranslations,
  getFocusLabel,
  getString,
  getTopicLabel,
  loadSentenceSurgeryStrings,
  resolveSupportedLanguage,
} from './i18n.js';
import {
  createReviewQueue,
  createRoundViewModel,
  createUnsolvedQueue,
  filterItemsByTopic,
  gradeChoice,
} from './logic.js';
import {
  applyProgressAttempt,
  createDefaultProgress,
  persistProgress,
  readProgress,
  updateProgressSettings,
} from './progress.js';
import {
  announce,
  collectSentenceSurgeryNodes,
  focusNext,
  focusPrompt,
  getChoiceButtons,
  markChoiceWrong,
  markRoundCorrect,
  populateTopicOptions,
  renderProgress,
  renderRound,
  showCompletion,
  showFeedback,
  syncSettingsControls,
} from './ui.js';

const nodes = collectSentenceSurgeryNodes();

const state = {
  strings: {},
  language: 'lv',
  items: [],
  topics: [],
  validIds: [],
  progress: createDefaultProgress(),
  queue: [],
  queueSize: 0,
  roundNumber: 0,
  reviewMode: false,
  currentItem: null,
  currentRound: null,
  attemptedChoices: new Set(),
  solved: false,
  hintUsed: false,
  complete: false,
  lastItemId: null,
  lastFeedback: '',
};

function t(key, replacements = {}, fallback = key) {
  return getString(state.strings, key, fallback, replacements);
}

function currentSettings() {
  return state.progress.settings || createDefaultProgress().settings;
}

function filteredItems(topic = currentSettings().topic) {
  return filterItemsByTopic(state.items, topic);
}

function completedCount(topic = currentSettings().topic) {
  const completedIds = new Set(state.progress.completedItemIds);
  return filteredItems(topic).filter((item) => completedIds.has(item.id)).length;
}

function persistCurrentProgress() {
  state.progress = persistProgress(state.progress, state.validIds, state.topics);
}

function renderProgressUi() {
  const filtered = filteredItems();
  renderProgress(
    nodes,
    {
      completed: completedCount(),
      total: filtered.length,
      attempts: state.progress.totalAttempts,
      correct: state.progress.correctCount,
      streak: state.progress.streak,
      roundNumber: state.roundNumber,
      roundTotal: state.queueSize,
      reviewMode: state.reviewMode,
    },
    t,
  );
  const streak = nodes.streakValue.closest('.sspv-streak');
  streak?.setAttribute('aria-label', t('aria.streak', { count: state.progress.streak }));
}

function refreshSettingsUi() {
  populateTopicOptions(nodes, state.topics, currentSettings().topic, (topic) =>
    getTopicLabel(state.strings, topic),
  );
  syncSettingsControls(nodes, {
    topic: currentSettings().topic,
    order: currentSettings().order,
    language: state.language,
  });
  renderProgressUi();
}

function getHintText() {
  const type = state.currentRound?.error?.type || 'generic';
  return t(`hints.${type}`, {}, t('hints.generic'));
}

function getExplanationText() {
  const type = state.currentRound?.error?.type || 'generic';
  return t(`feedback.explanations.${type}`, {}, t('feedback.explanations.generic'));
}

function translationText() {
  if (!state.currentRound?.targetEn) return '';
  return `${t('feedback.translationTitle')}: ${state.currentRound.targetEn}`;
}

function renderCurrentRound({ focus = true } = {}) {
  if (!state.currentRound) return;
  renderRound(nodes, state.currentRound, {
    topicLabel: getTopicLabel(state.strings, state.currentRound.topic),
    focusLabel: getFocusLabel(state.strings, state.currentRound.error?.type),
    t,
  });
  nodes.choices.setAttribute(
    'aria-label',
    t('aria.choices', { word: state.currentRound.brokenToken }),
  );
  renderProgressUi();
  state.lastFeedback = t('feedback.ready');
  announce(nodes, t('status.roundLoaded'));
  if (focus) focusPrompt(nodes);
}

function loadNextRound({ focus = true } = {}) {
  const nextItem = state.queue.shift() || null;
  if (!nextItem) {
    showQueueComplete();
    return;
  }

  state.currentItem = nextItem;
  state.currentRound = createRoundViewModel(nextItem);
  state.lastItemId = nextItem.id;
  state.roundNumber += 1;
  state.attemptedChoices = new Set();
  state.solved = false;
  state.hintUsed = false;
  state.complete = false;
  renderCurrentRound({ focus });
}

function createCurrentQueue(reviewMode) {
  const createQueue = reviewMode ? createReviewQueue : createUnsolvedQueue;
  return createQueue(state.items, {
    topic: currentSettings().topic,
    order: currentSettings().order,
    completedItemIds: state.progress.completedItemIds,
    lastItemId: state.lastItemId,
  });
}

function startQueue({ review = false, focus = true } = {}) {
  state.reviewMode = review;
  state.queue = createCurrentQueue(review);
  state.queueSize = state.queue.length;
  state.roundNumber = 0;
  state.currentItem = null;
  state.currentRound = null;
  state.complete = false;

  if (!state.queue.length) {
    showQueueComplete();
    return;
  }
  loadNextRound({ focus });
}

function showQueueComplete() {
  state.complete = true;
  state.currentItem = null;
  state.currentRound = null;
  state.solved = false;
  renderProgressUi();

  const total = filteredItems().length;
  const accuracy = state.progress.totalAttempts
    ? Math.round((state.progress.correctCount / state.progress.totalAttempts) * 100)
    : 0;
  const title = state.reviewMode ? t('completion.title') : t('completion.allTitle');
  const summary = t('completion.summary', {
    correct: state.progress.correctCount,
    attempts: state.progress.totalAttempts,
    accuracy,
  });
  const lead = state.reviewMode ? t('completion.body') : t('completion.allBody', { total });

  showCompletion(nodes, {
    title,
    body: `${lead} ${summary}`,
    announcement: t('status.completed'),
  });
  state.lastFeedback = `${title} ${lead}`;
}

function showHint() {
  if (!state.currentRound || state.solved || state.hintUsed) return;
  state.hintUsed = true;
  nodes.hint.disabled = true;
  const body = getHintText();
  showFeedback(nodes, {
    tone: 'info',
    icon: '?',
    title: t('hints.title'),
    body,
    announcement: `${t('hints.title')} ${body}`,
  });
  state.lastFeedback = body;
}

function updateRepairedSlot(choice) {
  const slot = nodes.sentence.querySelector('[data-repair-slot]');
  if (!slot) return;
  slot.textContent = choice;
  slot.classList.add('is-repaired');
  slot.setAttribute('aria-label', `${choice}. ${t('choices.correct')}`);
}

function submitChoice(button) {
  const choice = button.dataset.choice || '';
  if (
    !state.currentItem ||
    !state.currentRound ||
    state.solved ||
    !choice ||
    state.attemptedChoices.has(choice)
  ) {
    return;
  }

  state.attemptedChoices.add(choice);
  const result = gradeChoice(state.currentItem, choice);
  state.progress = applyProgressAttempt(
    state.progress,
    {
      itemId: state.currentItem.id,
      correct: result.correct,
      review: state.reviewMode,
      updatedAt: new Date().toISOString(),
    },
    state.validIds,
    state.topics,
  );
  persistCurrentProgress();

  if (!result.correct) {
    state.hintUsed = true;
    nodes.hint.disabled = true;
    markChoiceWrong(nodes, button, t);
    const body = `${t('feedback.wrongWithChoice', { choice })} ${getHintText()}`;
    showFeedback(nodes, {
      tone: 'error',
      icon: '×',
      title: t('feedback.wrong'),
      body,
      translation: translationText(),
      announcement: `${t('status.wrongAnnouncement')} ${body}`,
    });
    state.lastFeedback = body;
    renderProgressUi();
    return;
  }

  state.solved = true;
  state.currentRound = createRoundViewModel(state.currentItem, { selectedChoice: choice });
  markRoundCorrect(nodes, result.correctChoice, t);
  updateRepairedSlot(result.correctChoice);
  const explanation = `${t('feedback.explanationTitle')}: ${getExplanationText()}`;
  showFeedback(nodes, {
    tone: 'success',
    icon: '✓',
    title: t('feedback.correct'),
    body: explanation,
    correction: `${state.currentRound.brokenToken} → ${result.correctChoice}`,
    translation: translationText(),
    showNext: true,
    announcement: t('feedback.correctWithAnswer', { answer: result.correctChoice }),
  });
  state.lastFeedback = explanation;
  renderProgressUi();
  focusNext(nodes);
}

function dialogIsOpen() {
  return nodes.settingsDialog.hasAttribute('open');
}

function openSettings({ focusTopic = false } = {}) {
  refreshSettingsUi();
  if (!dialogIsOpen()) {
    nodes.settingsDialog.showModal();
  }
  if (focusTopic) nodes.topic.focus();
}

function closeSettings() {
  if (dialogIsOpen()) nodes.settingsDialog.close();
}

async function applyLanguage(language, { persist = false } = {}) {
  const loaded = await loadSentenceSurgeryStrings(language);
  state.strings = loaded.strings;
  state.language = loaded.lang;
  applySentenceSurgeryTranslations(state.strings, state.language, document);
  if (persist) {
    const appState = loadAppState();
    saveAppState({ ...appState, language: state.language });
  }
}

async function applySettingsFromDialog({ review = false } = {}) {
  const nextLanguage = resolveSupportedLanguage(nodes.language.value, state.language);
  const nextSettings = {
    topic: nodes.topic.value,
    order: nodes.mode.value,
  };
  state.progress = updateProgressSettings(
    state.progress,
    nextSettings,
    state.validIds,
    state.topics,
  );
  persistCurrentProgress();

  if (nextLanguage !== state.language) {
    document.body.setAttribute('aria-busy', 'true');
    try {
      await applyLanguage(nextLanguage, { persist: true });
    } finally {
      document.body.removeAttribute('aria-busy');
    }
  }

  closeSettings();
  refreshSettingsUi();
  startQueue({ review, focus: true });
}

function resetProgress() {
  const message = `${t('reset.confirmTitle')}\n\n${t('reset.confirmMessage')}`;
  if (!window.confirm(message)) return;

  const settings = { ...currentSettings() };
  state.progress = { ...createDefaultProgress(), settings };
  persistCurrentProgress();
  closeSettings();
  refreshSettingsUi();
  startQueue({ review: false, focus: true });
  announce(nodes, t('reset.success'));
}

function bindEvents() {
  nodes.choices.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-choice]');
    if (!button || button.disabled) return;
    submitChoice(button);
  });
  nodes.hint.addEventListener('click', showHint);
  nodes.next.addEventListener('click', () => loadNextRound({ focus: true }));
  nodes.settingsOpen.addEventListener('click', () => openSettings());
  nodes.settingsClose.addEventListener('click', closeSettings);
  nodes.changeTopic.addEventListener('click', () => openSettings({ focusTopic: true }));
  nodes.practiceAgain.addEventListener('click', () => startQueue({ review: true, focus: true }));
  nodes.reviewCompleted.addEventListener('click', () => {
    if (!nodes.reviewCompleted.disabled) {
      applySettingsFromDialog({ review: true }).catch(handleUnexpectedError);
    }
  });
  nodes.resetProgress.addEventListener('click', resetProgress);
  nodes.topic.addEventListener('change', () => {
    nodes.reviewCompleted.disabled = completedCount(nodes.topic.value) === 0;
  });

  const settingsForm = nodes.applySettings.closest('form');
  settingsForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    applySettingsFromDialog({ review: false }).catch(handleUnexpectedError);
  });
}

function renderGameToText() {
  const filtered = filteredItems();
  const choices = getChoiceButtons(nodes).map((button) => ({
    token: button.dataset.choice || '',
    state: button.dataset.state || 'available',
    disabled: button.disabled,
  }));
  return JSON.stringify({
    mode: state.complete
      ? 'complete'
      : state.solved
        ? 'solved'
        : state.currentRound
          ? 'playing'
          : 'loading',
    reviewMode: state.reviewMode,
    language: state.language,
    topic: currentSettings().topic,
    order: currentSettings().order,
    progress: {
      completed: completedCount(),
      total: filtered.length,
      attempts: state.progress.totalAttempts,
      correct: state.progress.correctCount,
      streak: state.progress.streak,
    },
    round: state.currentRound
      ? {
          id: state.currentRound.itemId,
          number: state.roundNumber,
          total: state.queueSize,
          sentence: state.currentRound.currentSentence,
          brokenSentence: state.currentRound.brokenSentence,
          wrongToken: state.currentRound.brokenToken,
          targetToken: state.currentRound.targetToken,
          choices,
          hintUsed: state.hintUsed,
          translationVisible: !nodes.translation.hidden,
          solved: state.solved,
        }
      : null,
    feedback: state.lastFeedback,
  });
}

function installAutomationHooks() {
  window.render_game_to_text = renderGameToText;
  window.advanceTime = () => renderGameToText();
}

function handleUnexpectedError(error) {
  const safeError = error instanceof Error ? error : new Error(String(error));
  console.error(safeError);
  showFatalError(safeError);
}

async function init() {
  document.body.setAttribute('aria-busy', 'true');
  nodes.live.textContent = 'Ielādē Sentence Surgery…';
  installAutomationHooks();

  try {
    const appState = loadAppState();
    const requestedLanguage = resolveSupportedLanguage(appState.language || navigator.language);
    const [translations, dataset] = await Promise.all([
      loadSentenceSurgeryStrings(requestedLanguage),
      loadSentenceSurgeryDataset(),
    ]);

    state.strings = translations.strings;
    state.language = translations.lang;
    state.items = dataset.items;
    state.topics = extractTopics(state.items);
    state.validIds = state.items.map((item) => item.id);
    state.progress = readProgress(state.validIds, state.topics);

    applySentenceSurgeryTranslations(state.strings, state.language, document);
    bindEvents();
    refreshSettingsUi();
    startQueue({ review: false, focus: false });
  } catch (error) {
    handleUnexpectedError(error);
  } finally {
    document.body.removeAttribute('aria-busy');
  }
}

init();
