import { mustId } from '../../lib/dom.js';
import { pickRandom, shuffle } from '../../lib/utils.js';
import { createGameBase } from '../../lib/game-base.js';
import { showFatalError } from '../../lib/errors.js';
import {
  applyTranslations,
  formatString,
  getTranslation,
  loadTranslations,
  populateTenseOptions,
} from './i18n.js';
import { buildPatientBank, classifyAlternates, loadItems, patientKey } from './data.js';
import { persistProgress, readProgress } from './progress.js';
import {
  hideResult,
  renderPatientChoices,
  setStatus,
  showResult,
  updatePatientSelection,
  updateScoreboard,
  updateTargetLabel,
} from './ui.js';

(() => {
  const STORAGE_KEY = 'llb1:passive-lab:progress';
  const TENSES = ['present', 'past', 'future'];
  const TENSE_PREFIX = { present: 'tiek', past: 'tika', future: 'tiks' };
  const BASE_POINTS = { builder: 4, typein: 5 };
  const STREAK_INTERVAL = 5;
  const STREAK_BONUS = 10;
  const ENDING_MAP = {
    'm.sg': '-ts',
    'f.sg': '-ta',
    'm.pl': '-ti',
    'f.pl': '-tas',
  };
  const iconPaths = {
    success: 'assets/img/passive-lab/glyph-ok.svg',
    error: 'assets/img/passive-lab/glyph-error.svg',
  };

  const mustSelect = (selector) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Missing required element: ${selector}`);
    return el;
  };

  const nodes = {
    statusText: mustId('pl-status-text'),
    statusIcon: mustId('pl-status-icon'),
    feedback: mustSelect('.passive-lab-feedback'),
    activeSentence: mustId('pl-active-sentence'),
    targetLabel: mustId('pl-tense-target-label'),
    patientContainer: mustId('pl-builder-patients'),
    tenseSelect: mustId('pl-tense-select'),
    endingSelect: mustId('pl-ending-select'),
    builderCheck: mustId('pl-builder-check'),
    typeCheck: mustId('pl-type-check'),
    typeInput: mustId('pl-type-input'),
    nextButton: mustId('pl-next'),
    resultPanel: mustSelect('.passive-lab-result'),
    resultSentence: mustId('pl-result-sentence'),
    itemHint: mustId('pl-item-hint'),
    endingHint: mustId('pl-ending-hint'),
    scoreValue: mustId('pl-score-value'),
    streakValue: mustId('pl-streak-value'),
    lastPlayedValue: mustId('pl-last-played-value'),
    modeButtons: Array.from(document.querySelectorAll('[data-mode]')),
    modePanels: Array.from(document.querySelectorAll('[data-mode-panel]')),
  };

  let i18n = {};
  let currentLang = 'lv';
  let items = [];
  let patientBank = [];
  let builderChoices = [];
  let currentItem = null;
  let currentTense = TENSES[0];
  let builderAttempts = 0;
  let typeAttempts = 0;
  let solved = false;
  let xp = 0;
  let streak = 0;
  let progress = { xp: 0, streak: 0, lastPlayedISO: null };
  let builderSelectedKey = '';

  const t = (key, fallback = '') => getTranslation(i18n, key, fallback);
  const fmt = (template, replacements = {}) => formatString(template, replacements);

  function updateStatus(message, state) {
    setStatus(nodes, iconPaths, message, state);
  }

  function renderResult() {
    const value = currentItem?.expected?.[currentTense] ?? '—';
    showResult(nodes, value);
  }

  function getEndingForPatient(patient) {
    const mapKey = `${patient.gender}.${patient.number}`;
    return ENDING_MAP[mapKey] || '-ts';
  }

  function createPatientChoices() {
    const targetKey = patientKey(currentItem.patient);
    const targetRecord = patientBank.find(entry => entry.key === targetKey);
    const others = patientBank.filter(entry => entry.key !== targetKey);
    const candidates = [targetRecord, ...shuffle(others).slice(0, 3)].filter(Boolean);
    const normalized = shuffle(candidates);
    return normalized.map(entry => ({
      key: entry.key,
      form: entry.form,
      gender: entry.gender,
      number: entry.number,
      label: `${entry.form} (${t(`genderLabels.${entry.gender}.${entry.number}`) || `${entry.gender}.${entry.number}`})`,
      isTarget: entry.key === targetKey,
    }));
  }

  function selectPatient(key) {
    builderSelectedKey = key;
    updatePatientSelection(nodes, key);
  }

  function renderPatientChoicesUi() {
    renderPatientChoices(nodes, builderChoices, selectPatient);
    const preferred = builderChoices.find(choice => choice.isTarget)?.key;
    selectPatient(preferred || builderChoices[0]?.key);
  }

  function updateTargetLabelUi() {
    updateTargetLabel(nodes, currentTense, TENSE_PREFIX, t);
  }

  function handleSuccess(mode) {
    solved = true;
    const attempts = mode === 'typein' ? typeAttempts : builderAttempts;
    const base = BASE_POINTS[mode] ?? BASE_POINTS.typein;
    const points = Math.max(1, base - (attempts - 1));
    xp += points;
    streak += 1;
    const streakBonusTriggered = streak > 0 && streak % STREAK_INTERVAL === 0;
    if (streakBonusTriggered) {
      xp += STREAK_BONUS;
    }
    progress.lastPlayedISO = new Date().toISOString();
    progress = { xp, streak, lastPlayedISO: progress.lastPlayedISO };
    persistProgress(STORAGE_KEY, progress);
    updateScoreboard(nodes, progress);
    renderResult();
    nodes.nextButton.disabled = false;
    nodes.builderCheck.disabled = true;
    nodes.typeCheck.disabled = true;
    if (nodes.typeInput) {
      nodes.typeInput.disabled = true;
    }
    let message = t('correct') || 'Correct!';
    message += ` +${points} xp`;
    if (streakBonusTriggered) {
      message += ` ${fmt(t('status.streakBonus') || '', { count: streak })}`;
    }
    updateStatus(message, 'success');
  }

  function handleFailure(detail = {}) {
    streak = 0;
    progress = { xp, streak, lastPlayedISO: progress.lastPlayedISO };
    persistProgress(STORAGE_KEY, progress);
    updateScoreboard(nodes, progress);
    updateStatus(t('wrong') || 'Try again!', 'error');
    if (detail.reason === 'ending' && nodes.endingHint) {
      const ending = getEndingForPatient(currentItem.patient);
      const genderLabel =
        t(`genderLabels.${currentItem.patient.gender}.${currentItem.patient.number}`) ||
        `${currentItem.patient.gender}.${currentItem.patient.number}`;
      nodes.endingHint.textContent = fmt(
        t('status.builderEndingHint') || 'Correct ending: {ending} ({gender}).',
        { ending, gender: genderLabel },
      );
    } else if (nodes.endingHint) {
      nodes.endingHint.textContent = '';
    }
    nodes.nextButton.disabled = true;
  }

  function normalizeSentence(value) {
    const trimmed = value.trim().replace(/[.!?]+$/, '');
    return trimmed.replace(/\s+/g, ' ').toLowerCase();
  }

  function isTypeMatch(answer) {
    const normalized = normalizeSentence(answer);
    const expected = normalizeSentence(currentItem.expected[currentTense] || '');
    if (expected && normalized === expected) {
      return true;
    }
    const alternates = currentItem.alsoAcceptByTense?.[currentTense] || [];
    return alternates.some(text => normalizeSentence(text) === normalized);
  }

  function startRound() {
    if (!items.length) {
      updateStatus(t('status.noTasks') || 'No tasks available', 'error');
      return;
    }
    currentItem = pickRandom(items);
    if (!currentItem) return;
    currentTense = pickRandom(TENSES) || TENSES[0];
    builderAttempts = 0;
    typeAttempts = 0;
    solved = false;
    builderChoices = createPatientChoices();
    renderPatientChoicesUi();
    if (nodes.tenseSelect) {
      nodes.tenseSelect.value = currentTense;
    }
    if (nodes.typeInput) {
      nodes.typeInput.value = '';
      nodes.typeInput.disabled = false;
    }
    if (nodes.endingSelect) {
      nodes.endingSelect.value = getEndingForPatient(currentItem.patient);
    }
    if (nodes.builderCheck) {
      nodes.builderCheck.disabled = false;
    }
    if (nodes.typeCheck) {
      nodes.typeCheck.disabled = false;
    }
    nodes.nextButton.disabled = true;
    if (nodes.activeSentence) {
      nodes.activeSentence.textContent = currentItem.active;
    }
    if (nodes.itemHint) {
      nodes.itemHint.textContent = currentItem.hint || '—';
    }
    if (nodes.endingHint) {
      nodes.endingHint.textContent = '';
    }
    hideResult(nodes);
    updateTargetLabelUi();
    updateStatus(t('status.idle') || '', null);
  }

  function toggleMode(target) {
    for (const panel of nodes.modePanels) {
      const shouldShow = panel.dataset.modePanel === target;
      panel.classList.toggle('is-visible', shouldShow);
    }
    nodes.modeButtons.forEach(button => {
      const isActive = button.dataset.mode === target;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(Boolean(isActive)));
    });
  }

  function handleBuilderSubmit() {
    if (solved || !currentItem) return;
    builderAttempts += 1;
    const selectedTense = nodes.tenseSelect?.value;
    const selectedPatient = builderChoices.find(choice => choice.key === builderSelectedKey);
    const selectedEnding = nodes.endingSelect?.value;
    const endsCorrect = selectedEnding === getEndingForPatient(currentItem.patient);
    const tenseCorrect = selectedTense === currentTense;
    const patientCorrect = selectedPatient?.key === patientKey(currentItem.patient);
    if (patientCorrect && tenseCorrect && endsCorrect) {
      handleSuccess('builder');
      return;
    }
    const reason = !endsCorrect ? 'ending' : !patientCorrect ? 'patient' : !tenseCorrect ? 'tense' : undefined;
    handleFailure({ reason });
  }

  function handleTypeSubmit() {
    if (solved || !currentItem || !nodes.typeInput) return;
    const value = nodes.typeInput.value.trim();
    if (!value) {
      updateStatus(t('wrong') || 'Try again!', 'error');
      return;
    }
    typeAttempts += 1;
    if (isTypeMatch(value)) {
      handleSuccess('typein');
      return;
    }
    handleFailure({ reason: 'typein' });
  }

  async function loadData() {
    try {
      const payload = await loadItems('data/passive-lab/items.json');
      items = Array.isArray(payload) ? payload : [];
      items.forEach(classifyAlternates);
      patientBank = buildPatientBank(items);
      startRound();
    } catch (err) {
      console.error(err);
      updateStatus(t('status.loadError') || 'Failed to load items', 'error');
    }
  }

  function setupListeners() {
    nodes.modeButtons.forEach(button => {
      button.addEventListener('click', () => toggleMode(button.dataset.mode));
    });
    if (nodes.builderCheck) {
      nodes.builderCheck.addEventListener('click', handleBuilderSubmit);
    }
    if (nodes.typeCheck) {
      nodes.typeCheck.addEventListener('click', handleTypeSubmit);
    }
    if (nodes.typeInput) {
      nodes.typeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleTypeSubmit();
        }
      });
    }
    if (nodes.nextButton) {
      nodes.nextButton.addEventListener('click', startRound);
    }
  }

  async function initUI({ strings }) {
    if (strings) {
      i18n = strings;
      applyTranslations(i18n, currentLang);
      populateTenseOptions(nodes, i18n, TENSES);
    }
    progress = readProgress(STORAGE_KEY);
    xp = progress.xp;
    streak = progress.streak;
    updateScoreboard(nodes, progress);
    toggleMode('builder');
    setupListeners();
  }

  async function loadStrings() {
    const translations = await loadTranslations(navigator.language || 'lv');
    i18n = translations.strings;
    currentLang = translations.lang;
    return i18n;
  }

  if (typeof document !== 'undefined') {
    const game = createGameBase({
      loadStrings,
      loadData,
      initUI,
      onError: (err) => {
        console.error('Failed to initialize Passive Lab', err);
        const safeError = err instanceof Error ? err : new Error('Failed to load Passive Lab.');
        showFatalError(safeError);
      },
    });
    game.init();
  }
})();
