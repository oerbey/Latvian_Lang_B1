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
      answerInput: mustQuery('.eb-answer'),
      keypadEl: mustQuery('.eb-keypad'),
    };

    strings = await loadStrings();
    applyStrings({ elements, strings });

    progress = loadProgress();
    rounds = buildRounds(items);

    state = {
      current: null,
      solved: false,
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

    handlers.nextRound();
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
  shell.announce(value ? strings.strictMode.on : strings.strictMode.off);
}

init();
