import { mustId, on } from '../../lib/dom.js';
import { shuffle } from '../../lib/utils.js';
import { loadItems, loadTranslations } from './data.js';
import { readProgress, persistProgress } from './progress.js';
import {
  applySceneTheme,
  applyTranslations,
  setMcqProgress,
  setTypeProgress,
  updateLevelStatus,
  updateLiveRegion,
  updateScoreboard,
} from './ui.js';

(() => {
  const STORAGE_KEY = 'llb1:decl6-detective:progress';
  const DATA_PATH = 'data/decl6-detective/items.json';
  const MCQ_TARGET = 5;
  const TYPE_TARGET = 3;

  const DEFAULT_STRINGS = {
    title: 'What’s in my house? — 6th Declension Detective',
    start: 'Start',
    mode_mcq: 'Detective Cards',
    mode_typein: 'Room Builder',
    check: 'Check',
    next: 'Next',
    score: 'Score',
    streak: 'Streak',
    hint: 'Hint',
    correct: 'Correct!',
    wrong: 'Try again!',
    level_complete: 'Level complete!',
    instructions_mcq: 'Choose the correct 6th-declension form.',
    instructions_typein: 'Type the missing form (supports Latvian diacritics).',
  };

  const nodes = {
    mcqCard: mustId('decl6-mcq-card'),
    mcqPrompt: mustId('decl6-mcq-prompt'),
    mcqCase: mustId('decl6-mcq-case'),
    mcqHint: mustId('decl6-mcq-hint'),
    mcqOptions: mustId('decl6-mcq-options'),
    mcqExplain: mustId('decl6-mcq-explain'),
    mcqNext: mustId('decl6-mcq-next'),
    mcqProgress: mustId('decl6-mcq-progress'),
    mcqSceneEmoji: mustId('decl6-mcq-scene-emoji'),
    mcqSceneName: mustId('decl6-mcq-scene-name'),
    typeCard: mustId('decl6-builder-card'),
    typePrompt: mustId('decl6-type-prompt'),
    typeCase: mustId('decl6-type-case'),
    typeHint: mustId('decl6-type-hint'),
    typeInput: mustId('decl6-type-input'),
    typeCheck: mustId('decl6-type-check'),
    typeExplain: mustId('decl6-type-explain'),
    typeNext: mustId('decl6-type-next'),
    typeProgress: mustId('decl6-type-progress'),
    typeSceneEmoji: mustId('decl6-type-scene-emoji'),
    typeSceneName: mustId('decl6-type-scene-name'),
    planImage: mustId('decl6-plan'),
    liveRegion: mustId('decl6-live-region'),
    scoreValue: mustId('decl6-score'),
    streakValue: mustId('decl6-streak'),
    lastPlayedValue: mustId('decl6-last'),
    restart: mustId('decl6-restart'),
    levelStatus: mustId('decl6-level-status'),
  };

  let strings = { ...DEFAULT_STRINGS };
  let currentLang = 'lv';
  let items = [];
  let mcqQueue = [];
  let typeQueue = [];
  let mcqIndex = 0;
  let typeIndex = 0;
  let mcqAttempt = 0;
  let typeAttempt = 0;
  let currentMcqItem = null;
  let currentTypeItem = null;
  let mcqSolved = false;
  let typeSolved = false;
  let xp = 0;
  let streak = 0;
  let progress = { xp: 0, streak: 0, lastPlayedISO: null };

  function normalizeAnswer(value = '') {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function saveProgress(touchLastPlayed = false) {
    progress = persistProgress(
      STORAGE_KEY,
      { xp, streak, lastPlayedISO: progress.lastPlayedISO },
      touchLastPlayed,
    );
    updateScoreboard(nodes, progress);
  }

  function prepareQueue(target) {
    const queue = [];
    let pool = shuffle(items);
    let cursor = 0;
    while (queue.length < target) {
      if (cursor >= pool.length) {
        pool = shuffle(items);
        cursor = 0;
      }
      queue.push(pool[cursor]);
      cursor += 1;
    }
    return queue;
  }

  function finalizeMcqSection() {
    currentMcqItem = null;
    mcqSolved = false;
    nodes.mcqPrompt.textContent = strings.level_complete;
    nodes.mcqCase.textContent = '';
    nodes.mcqHint.textContent = '';
    nodes.mcqExplain.classList.add('visually-hidden');
    nodes.mcqExplain.textContent = '';
    nodes.mcqOptions.replaceChildren();
    nodes.mcqNext.disabled = true;
    setMcqProgress(nodes, mcqIndex, MCQ_TARGET);
    updateLevelStatus(nodes, mcqIndex, typeIndex, MCQ_TARGET, TYPE_TARGET);
  }

  function loadMcqItem() {
    if (!nodes.mcqPrompt) return;
    if (mcqIndex >= MCQ_TARGET) {
      finalizeMcqSection();
      return;
    }
    currentMcqItem = mcqQueue[mcqIndex];
    mcqAttempt = 0;
    mcqSolved = false;
    nodes.mcqPrompt.textContent = currentMcqItem.prompt;
    nodes.mcqCase.textContent = currentMcqItem.case;
    nodes.mcqHint.textContent = currentMcqItem.hint ?? '—';
    nodes.mcqExplain.classList.add('visually-hidden');
    nodes.mcqExplain.textContent = currentMcqItem.explain ?? '';
    nodes.mcqNext.disabled = true;
    applySceneTheme(nodes.mcqCard, nodes.mcqSceneEmoji, nodes.mcqSceneName, null, currentMcqItem.scene);
    nodes.mcqOptions.replaceChildren();
    const options = shuffle(currentMcqItem.options ?? []);
    options.forEach(optionText => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'decl6-option';
      button.dataset.value = optionText;
      button.textContent = optionText;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.addEventListener('click', handleMcqChoice);
      nodes.mcqOptions.appendChild(button);
    });
    setMcqProgress(nodes, mcqIndex, MCQ_TARGET);
  }

  function handleMcqChoice(event) {
    if (!currentMcqItem || mcqSolved) return;
    const button = event.currentTarget;
    const selection = button.dataset.value;
    mcqAttempt += 1;
    const isCorrect = selection === currentMcqItem.answer;
    if (isCorrect) {
      mcqSolved = true;
      button.classList.add('correct');
      button.setAttribute('aria-checked', 'true');
      nodes.mcqOptions.querySelectorAll('button').forEach(choice => {
        choice.disabled = true;
        if (choice !== button) choice.setAttribute('aria-checked', 'false');
      });
      let reward = Math.max(1, 5 - (mcqAttempt - 1));
      xp += reward;
      streak += 1;
      let bonus = 0;
      if (streak > 0 && streak % 5 === 0) {
        bonus = 10;
        xp += bonus;
      }
      const explanation = currentMcqItem.explain ?? '';
      nodes.mcqExplain.textContent = explanation;
      nodes.mcqExplain.classList.remove('visually-hidden');
      nodes.mcqNext.disabled = false;
      saveProgress(true);
      let message = `${strings.correct} ${explanation}`.trim();
      if (bonus) {
        message = `${message} +${bonus} xp`;
      }
      updateLiveRegion(nodes, message);
      updateLevelStatus(nodes, mcqIndex, typeIndex, MCQ_TARGET, TYPE_TARGET);
    } else {
      button.classList.add('incorrect');
      updateLiveRegion(nodes, strings.wrong);
      streak = 0;
      saveProgress(false);
    }
  }

  function finalizeTypeSection() {
    currentTypeItem = null;
    typeSolved = false;
    nodes.typePrompt.textContent = strings.level_complete;
    nodes.typeCase.textContent = '';
    nodes.typeHint.textContent = '';
    nodes.typeExplain.textContent = '';
    nodes.typeExplain.classList.add('visually-hidden');
    nodes.typeInput.value = '';
    nodes.typeInput.disabled = true;
    nodes.typeCheck.disabled = true;
    nodes.typeNext.disabled = true;
    nodes.typeInput.classList.remove('is-valid', 'is-invalid');
    updateLevelStatus(nodes, mcqIndex, typeIndex, MCQ_TARGET, TYPE_TARGET);
    setTypeProgress(nodes, typeIndex, TYPE_TARGET);
  }

  function loadTypeItem() {
    if (typeIndex >= TYPE_TARGET) {
      finalizeTypeSection();
      return;
    }
    currentTypeItem = typeQueue[typeIndex];
    typeSolved = false;
    typeAttempt = 0;
    nodes.typePrompt.textContent = currentTypeItem.prompt;
    nodes.typeCase.textContent = currentTypeItem.case;
    nodes.typeHint.textContent = currentTypeItem.hint ?? '—';
    nodes.typeExplain.textContent = currentTypeItem.explain ?? '';
    nodes.typeExplain.classList.add('visually-hidden');
    nodes.typeInput.value = '';
    nodes.typeInput.disabled = false;
    nodes.typeInput.classList.remove('is-valid', 'is-invalid');
    nodes.typeCheck.disabled = false;
    nodes.typeNext.disabled = true;
    applySceneTheme(nodes.typeCard, nodes.typeSceneEmoji, nodes.typeSceneName, nodes.planImage, currentTypeItem.scene);
    setTypeProgress(nodes, typeIndex, TYPE_TARGET);
  }

  function handleTypeCheck() {
    if (!currentTypeItem || typeSolved) return;
    const attempt = nodes.typeInput.value;
    if (!attempt.trim()) return;
    typeAttempt += 1;
    const normalized = normalizeAnswer(attempt);
    const normalizedTarget = normalizeAnswer(currentTypeItem.answer);
    if (normalized === normalizedTarget) {
      typeSolved = true;
      nodes.typeInput.classList.remove('is-invalid');
      nodes.typeInput.classList.add('is-valid');
      nodes.typeInput.disabled = true;
      nodes.typeCheck.disabled = true;
      nodes.typeNext.disabled = false;
      nodes.typeExplain.classList.remove('visually-hidden');
      let reward = Math.max(1, 5 - (typeAttempt - 1));
      xp += reward;
      streak += 1;
      let bonus = 0;
      if (streak > 0 && streak % 5 === 0) {
        bonus = 10;
        xp += bonus;
      }
      saveProgress(true);
      let message = `${strings.correct} ${(currentTypeItem.explain ?? '').trim()}`.trim();
      if (bonus) {
        message = `${message} +${bonus} xp`;
      }
      updateLiveRegion(nodes, message);
      updateLevelStatus(nodes, mcqIndex, typeIndex, MCQ_TARGET, TYPE_TARGET);
    } else {
      nodes.typeInput.classList.add('is-invalid');
      updateLiveRegion(nodes, strings.wrong);
      streak = 0;
      saveProgress(false);
    }
  }

  function handleTypeNext() {
    if (!typeSolved) return;
    typeIndex += 1;
    if (typeIndex >= TYPE_TARGET) {
      finalizeTypeSection();
      updateLevelStatus(nodes, mcqIndex, typeIndex, MCQ_TARGET, TYPE_TARGET);
      updateLiveRegion(nodes, strings.level_complete);
      return;
    }
    loadTypeItem();
  }

  function handleMcqNext() {
    if (!mcqSolved) return;
    mcqIndex += 1;
    if (mcqIndex >= MCQ_TARGET) {
      finalizeMcqSection();
      updateLiveRegion(nodes, strings.level_complete);
      return;
    }
    loadMcqItem();
  }

  function attachEventListeners() {
    on(nodes.mcqNext, 'click', handleMcqNext);
    on(nodes.typeCheck, 'click', handleTypeCheck);
    on(nodes.typeNext, 'click', handleTypeNext);
    on(nodes.restart, 'click', () => {
      updateLiveRegion(nodes, '');
      startSession();
    });
    on(nodes.typeInput, 'keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleTypeCheck();
      }
    });
    on(nodes.mcqOptions, 'keydown', event => {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!keys.includes(event.key)) return;
      const buttons = Array.from(nodes.mcqOptions.querySelectorAll('button'));
      if (!buttons.length) return;
      event.preventDefault();
      const currentIndex = buttons.indexOf(document.activeElement);
      if (currentIndex < 0) {
        buttons[0].focus();
        return;
      }
      const delta = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
      const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
    });
  }

  function startSession() {
    mcqQueue = prepareQueue(MCQ_TARGET);
    typeQueue = prepareQueue(TYPE_TARGET);
    mcqIndex = 0;
    typeIndex = 0;
    mcqSolved = false;
    typeSolved = false;
    loadMcqItem();
    loadTypeItem();
    updateLevelStatus(nodes, mcqIndex, typeIndex, MCQ_TARGET, TYPE_TARGET);
  }

  async function init() {
    progress = readProgress(STORAGE_KEY);
    xp = progress.xp ?? 0;
    streak = progress.streak ?? 0;
    updateScoreboard(nodes, progress);
    try {
      const translations = await loadTranslations(DEFAULT_STRINGS);
      strings = translations.strings;
      currentLang = translations.lang;
      applyTranslations(strings, currentLang);
      items = await loadItems(DATA_PATH);
      if (!items.length) throw new Error('No items in decl6 data');
      startSession();
      attachEventListeners();
    } catch (err) {
      console.error(err);
      updateLiveRegion(nodes, 'Unable to load the detective game right now.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
