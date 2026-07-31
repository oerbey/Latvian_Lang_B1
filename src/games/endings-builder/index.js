/**
 * endings-builder/index.js — Verb-endings construction game.
 * ============================================================
 * Players assemble correct verb conjugation forms by typing the ending
 * for a given stem + pronoun + tense prompt. Supports a special-character
 * keypad for Latvian diacritics (ā, ē, ī, ū, č, ģ, ķ, ļ, ņ, š, ž).
 *
 * Architecture:
 *   data.js      — Load items and i18n strings from JSON.
 *   rounds.js    — Build shuffled round queue from items.
 *   ui.js        — Render prompts, keypad, and feedback.
 *   handlers.js  — Process submit/skip/next actions.
 *   progress.js  — Persist per-item mastery scores.
 *   game-shell.js— Shared UI shell wrapper.
 */
import { mountGameShell } from './game-shell.js';
import { norm, equalsLoose } from './norm.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { loadItems, loadStrings } from './data.js';
import { loadProgress, loadStrict, saveProgress, saveStrict } from './progress.js';
import { buildOptions, buildRounds } from './rounds.js';
import {
  applyStrings,
  insertChar,
  renderRound,
  renderExplanation,
  setFeedback,
  setupKeypad,
} from './ui.js';
import { createHandlers } from './handlers.js';

const LETTERS = ['ā', 'ē', 'ī', 'ū', 'č', 'ģ', 'ķ', 'ļ', 'ņ', 'š', 'ž'];

let items = [];
let root = null;
let shell = null;
let strict = false;
let strings = {};
let progress = {};
let rounds = [];
let state = null;
let handlers = null;

function showScreen(name) {
  if (!root) return;
  root.dataset.screen = name;
  root.querySelectorAll('[data-eb-screen]').forEach((screen) => {
    screen.hidden = screen.dataset.ebScreen !== name;
  });
  root.scrollIntoView({ block: 'start' });
}

function updateStartOverview() {
  if (!root) return;
  const scores = Object.values(progress).filter((value) => Number.isFinite(value));
  const practised = scores.filter((value) => value !== 0).length;
  const strong = scores.filter((value) => value >= 3).length;
  const practisedEl = root.querySelector('[data-eb-practised]');
  const strongEl = root.querySelector('[data-eb-strong]');
  const totalEl = root.querySelector('[data-eb-total]');
  if (practisedEl) practisedEl.textContent = `${practised}`;
  if (strongEl) strongEl.textContent = `${strong}`;
  if (totalEl) totalEl.textContent = `${rounds.length}`;
}

function syncStartStrictControl() {
  if (!root) return;
  const control = root.querySelector('[data-eb-strict-start]');
  if (!(control instanceof HTMLButtonElement)) return;
  control.setAttribute('aria-pressed', strict ? 'true' : 'false');
  const label = control.querySelector('.eb-switch__text');
  if (label) label.textContent = strict ? 'Ieslēgts' : 'Izslēgts';
}

function installAutomationHooks(elements) {
  window.render_game_to_text = () =>
    JSON.stringify({
      mode: root?.dataset.screen || 'loading',
      round: state?.roundNumber || 0,
      target: elements.roundBriefEl?.textContent?.trim() || '',
      stem: elements.board?.querySelector('.eb-stem')?.textContent?.trim() || '',
      answer: state?.current?.ending || '',
      fullForm: state?.current?.fullForm || '',
      endings: [...(elements.pool?.querySelectorAll('.eb-ending') || [])].map((option) =>
        option.textContent.trim(),
      ),
      typedAnswer: elements.answerInput?.value || '',
      solved: Boolean(state?.solved),
      score: {
        attempts: state?.attempts || 0,
        correct: state?.correct || 0,
        streak: state?.streak || 0,
      },
      feedback: elements.feedbackEl?.textContent?.trim() || '',
    });
  window.advanceTime = () => {};
}

const mustQuery = (selector) => {
  if (!root) {
    throw new Error('Endings Builder root missing');
  }
  const el = root.querySelector(selector);
  if (!el) {
    throw new Error(`Endings Builder missing element: ${selector}`);
  }
  return el;
};

async function init() {
  showLoading('Loading game data...');
  try {
    items = await loadItems();
    root = document.querySelector('.eb-wrapper');
    if (!root) {
      throw new Error('Endings Builder root missing');
    }

    const elements = {
      board: mustQuery('#ebBoard'),
      pool: mustQuery('#ebOptions'),
      feedbackEl: mustQuery('.eb-feedback'),
      explainEl: mustQuery('[data-eb-explain]'),
      headingEl: mustQuery('[data-eb-heading]'),
      subtitleEl: mustQuery('[data-eb-subtitle]'),
      controlsHeadingEl: mustQuery('[data-eb-controls-heading]'),
      boardHeadingEl: mustQuery('[data-eb-board-heading]'),
      buildZoneTitleEl: mustQuery('[data-eb-build-zone-title]'),
      optionsZoneTitleEl: mustQuery('[data-eb-options-zone-title]'),
      pickHelpEl: mustQuery('[data-eb-pick-help]'),
      roundBriefEl: mustQuery('[data-eb-round-brief]'),
      answerInput: mustQuery('.eb-answer'),
      answerHelpEl: mustQuery('[data-eb-answer-help]'),
      keypadEl: mustQuery('.eb-keypad'),
      startButton: mustQuery('[data-eb-start]'),
      startStrictButton: mustQuery('[data-eb-strict-start]'),
    };

    strings = await loadStrings();
    applyStrings({ elements, strings });

    progress = loadProgress();
    rounds = buildRounds(items);

    state = {
      current: null,
      solved: false,
      roundNumber: 0,
      attempts: 0,
      correct: 0,
      streak: 0,
      lastAttemptKey: null,
    };

    shell = mountGameShell({
      root,
      strings,
      onCheck: () => handlers?.checkTyped(),
      onNext: () => handlers?.nextRound(),
      onToggleRule: () => handlers?.toggleRule(),
      onStrictChange: (val) => setStrict(val),
    });

    strict = loadStrict();
    shell.setStrict(strict);
    shell.setScore({ attempts: state.attempts, correct: state.correct, streak: state.streak });
    syncStartStrictControl();
    updateStartOverview();

    handlers = createHandlers({
      state,
      elements,
      shell,
      getStrings: () => strings,
      getRounds: () => rounds,
      getProgress: () => progress,
      getStrict: () => strict,
      saveProgress: () => saveProgress(progress),
      buildOptions: (round) => buildOptions(round, items),
      renderRound: ({
        round,
        elements: roundElements,
        strings: roundStrings,
        buildOptions,
        onDrop,
      }) =>
        renderRound({
          round,
          elements: roundElements,
          strings: roundStrings,
          buildOptions,
          onDrop,
        }),
      renderExplanation: ({ round, strings: roundStrings, explainEl, shell: roundShell }) =>
        renderExplanation({ round, strings: roundStrings, explainEl, shell: roundShell }),
      setFeedback: (icon, text) => setFeedback(elements.feedbackEl, icon, text),
      norm,
      equalsLoose,
    });

    setupKeypad({
      keypadEl: elements.keypadEl,
      letters: LETTERS,
      onInsert: (ch) => insertChar(elements.answerInput, ch),
    });
    elements.answerInput.addEventListener('input', () => {
      state.lastAttemptKey = null;
    });
    elements.answerInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      handlers?.checkTyped();
    });

    handlers.nextRound();
    installAutomationHooks(elements);
    shell.onQuit(() => {
      updateStartOverview();
      showScreen('start');
      elements.startButton.focus();
    });
    elements.startButton.addEventListener('click', () => {
      showScreen('play');
      elements.answerInput.focus();
    });
    elements.startStrictButton.addEventListener('click', () => {
      setStrict(!strict);
      shell.setStrict(strict);
      syncStartStrictControl();
    });
    showScreen('start');
  } catch (err) {
    console.error('Failed to initialize Endings Builder', err);
    const safeError = err instanceof Error ? err : new Error('Failed to load Endings Builder.');
    showFatalError(safeError);
  } finally {
    hideLoading();
  }
}

function setStrict(value) {
  strict = value;
  saveStrict(value);
  syncStartStrictControl();
  shell.announce(value ? strings.strictMode.on : strings.strictMode.off);
}

init();
