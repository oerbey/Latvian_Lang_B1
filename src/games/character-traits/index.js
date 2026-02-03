import { loadPersonalityWords } from '../../lib/personality-data.js';
import { mustId } from '../../lib/dom.js';
import { shuffle } from '../../lib/utils.js';
import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { showReward } from '../../lib/reward.js';

const QUESTIONS_PER_ROUND = 10;
const AUTO_ADVANCE_MS = 1400;
const MODE_GROUPS = 'groups';
const MODE_TRANSLATE = 'translate';
const GAME_ID = 'character-traits';

const els = {
  year: mustId('year'),
  modeButtons: {
    [MODE_GROUPS]: mustId('mode-groups'),
    [MODE_TRANSLATE]: mustId('mode-translate'),
  },
  modeLabel: mustId('mode-label'),
  lastResult: mustId('last-result'),
  groupStats: mustId('group-stats'),
  liveRegion: mustId('live-region'),
  questionArea: mustId('question-area'),
  questionText: mustId('question-text'),
  questionProgress: mustId('question-progress'),
  choices: mustId('choices'),
  feedback: mustId('feedback'),
  feedbackText: mustId('feedback-text'),
  translationLine: mustId('translation-line'),
  summaryArea: mustId('summary-area'),
  summaryScore: mustId('summary-score'),
  summaryVerdict: mustId('summary-verdict'),
  mistakesList: mustId('mistakes-list'),
  scoreBadge: mustId('score'),
  counterBadge: mustId('counter'),
  nextBtn: mustId('next-btn'),
  restartBtn: mustId('restart-btn'),
};

const state = {
  mode: MODE_GROUPS,
  allWords: [],
  groupWords: [],
  decks: {
    [MODE_GROUPS]: [],
    [MODE_TRANSLATE]: [],
  },
  deckIndex: {
    [MODE_GROUPS]: 0,
    [MODE_TRANSLATE]: 0,
  },
  questionPool: [],
  questionIndex: 0,
  asked: 0,
  correct: 0,
  mistakes: [],
  locked: false,
  groupStats: {
    optimists: { correct: 0, total: 0 },
    pesimists: { correct: 0, total: 0 },
    neutral: { correct: 0, total: 0 },
  },
  autoAdvanceTimer: null,
  lastResult: loadLastResult(),
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function announce(text) {
  if (!els.liveRegion) return;
  els.liveRegion.textContent = '';
  requestAnimationFrame(() => {
    els.liveRegion.textContent = text;
  });
}

function setActiveModeButton(mode) {
  Object.entries(els.modeButtons).forEach(([key, btn]) => {
    if (!btn) return;
    const isActive = key === mode;
    btn.classList.toggle('active', isActive);
    btn.classList.toggle('btn-primary', isActive);
    btn.classList.toggle('btn-outline-primary', !isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  els.modeLabel.textContent = mode === MODE_GROUPS ? 'Optimists vai pesimists' : 'Latviešu ➜ angļu';
}

function formatOption(enVariants) {
  return enVariants.length ? enVariants.join(' / ') : '';
}

function renderGroupStats() {
  const container = els.groupStats;
  if (!container) return;
  container.replaceChildren();
  const labels = {
    optimists: 'Optimisti',
    pesimists: 'Pesimisti',
    neutral: 'Neitrāli',
  };
  Object.entries(state.groupStats).forEach(([key, val]) => {
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary-subtle text-secondary-emphasis';
    badge.textContent = `${labels[key]}: ${val.correct}/${val.total}`;
    container.appendChild(badge);
  });
}

function renderLastResult() {
  if (!els.lastResult) return;
  const res = state.lastResult;
  if (!res) {
    els.lastResult.textContent = '';
    els.lastResult.classList.add('d-none');
    return;
  }
  els.lastResult.classList.remove('d-none');
  els.lastResult.textContent = `Pēdējais: ${res.correct}/${res.total} (${res.percent}%) ${res.mode === MODE_GROUPS ? 'optimists/pesimists' : 'LV→EN'}`;
}

function setFeedbackNeutral() {
  els.feedback.className = 'alert alert-secondary mt-3';
  els.feedbackText.textContent = 'Izvēlies atbildi un saņem uzreiz skaidrojumu.';
  els.translationLine.textContent = '';
  els.feedback.classList.remove('d-none');
}

function updateScoreBadges() {
  const step = Math.min(state.questionIndex + 1, QUESTIONS_PER_ROUND);
  els.scoreBadge.textContent = `Punkti: ${state.correct} / ${state.asked}`;
  els.counterBadge.textContent = `Jautājums ${step} / ${QUESTIONS_PER_ROUND}`;
  els.questionProgress.textContent = `Jautājums ${step} / ${QUESTIONS_PER_ROUND}`;
}

function resetGroupStats() {
  state.groupStats = {
    optimists: { correct: 0, total: 0 },
    pesimists: { correct: 0, total: 0 },
    neutral: { correct: 0, total: 0 },
  };
}

function updateGroupStats(question, isCorrect) {
  const target = state.groupStats[question.group];
  if (!target) return;
  target.total += 1;
  if (isCorrect) target.correct += 1;
}

function formatQuestionPool(source, mode) {
  if (!source.length) return [];
  const deck = state.decks[mode];
  const deckIdx = state.deckIndex[mode];
  if (!deck.length || deckIdx >= deck.length) {
    state.decks[mode] = shuffle(source);
    state.deckIndex[mode] = 0;
  }
  const pool = [];
  while (pool.length < QUESTIONS_PER_ROUND && state.deckIndex[mode] < state.decks[mode].length) {
    pool.push(state.decks[mode][state.deckIndex[mode]]);
    state.deckIndex[mode] += 1;
  }
  if (pool.length < QUESTIONS_PER_ROUND && source.length) {
    const refill = shuffle(source);
    for (let i = 0; i < refill.length && pool.length < QUESTIONS_PER_ROUND; i += 1) {
      pool.push(refill[i]);
    }
  }
  return pool;
}

function pickDistractors(question) {
  const pool = state.allWords
    .filter((item) => item.id !== question.id)
    .flatMap((item) => item.enVariants);
  const unique = Array.from(new Set(pool.filter((text) => text && text !== question.en)));
  return shuffle(unique).slice(0, 3);
}

function handleOptionClick(value) {
  if (state.locked) return;
  state.locked = true;
  const question = state.questionPool[state.questionIndex];
  const correctValue =
    state.mode === MODE_GROUPS ? question.group : formatOption(question.enVariants);
  const isCorrect =
    state.mode === MODE_GROUPS
      ? value === question.group
      : value.toLowerCase() === correctValue.toLowerCase();
  state.asked += 1;
  if (isCorrect) state.correct += 1;
  updateGroupStats(question, isCorrect);
  if (!isCorrect) {
    state.mistakes.push({
      lv: question.lv,
      en: question.en,
      enVariants: question.enVariants,
      group: question.group,
      selected: value,
      mode: state.mode,
      notes: question.notes,
    });
  }
  updateScoreBadges();
  renderGroupStats();
  showFeedback(isCorrect, question, value, correctValue);
  els.nextBtn.disabled = false;
  els.nextBtn.textContent =
    state.questionIndex >= state.questionPool.length - 1 ? 'Kopsavilkums' : 'Nākamais jautājums';
  scheduleAutoAdvance();
}

function renderChoices(question) {
  els.choices.replaceChildren();
  const buttons = [];
  if (state.mode === MODE_GROUPS) {
    const options = [
      { label: 'Optimists', value: 'optimists' },
      { label: 'Pesimists', value: 'pesimists' },
    ];
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-primary btn-lg text-start';
      btn.dataset.value = opt.value;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => handleOptionClick(opt.value));
      buttons.push(btn);
    });
  } else {
    const distractors = pickDistractors(question);
    const options = shuffle([formatOption(question.enVariants), ...distractors]);
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-primary btn-lg text-start';
      btn.dataset.value = opt;
      btn.textContent = opt;
      btn.addEventListener('click', () => handleOptionClick(opt));
      buttons.push(btn);
    });
  }
  buttons.forEach((btn) => els.choices.appendChild(btn));
}

function showFeedback(isCorrect, question, selectedValue, correctValue) {
  const rationale =
    state.mode === MODE_GROUPS
      ? question.group === 'optimists'
        ? 'Šī īpašība parasti raksturo optimistu, jo tā meklē labo.'
        : 'Šī īpašība biežāk raksturo pesimistu, jo tā uzsver grūtības.'
      : 'Pārbaudi tulkojumu, lai nostiprinātu vārdu.';
  els.feedback.className = isCorrect ? 'alert alert-success mt-3' : 'alert alert-danger mt-3';
  els.feedbackText.textContent = isCorrect ? 'Pareizi!' : 'Šoreiz nepareizi.';
  const translation = state.mode === MODE_GROUPS ? formatOption(question.enVariants) : correctValue;
  els.translationLine.textContent = `Tulkojums: ${translation}. ${rationale}`;
  const optionButtons = els.choices.querySelectorAll('button');
  optionButtons.forEach((btn) => {
    const value = btn.dataset.value;
    const isCorrectOption =
      state.mode === MODE_GROUPS
        ? value === question.group
        : value.toLowerCase() === correctValue.toLowerCase();
    btn.disabled = true;
    btn.classList.remove('btn-outline-primary');
    if (isCorrectOption) {
      btn.classList.add('btn-success');
    } else if (value === selectedValue) {
      btn.classList.add('btn-danger');
    } else {
      btn.classList.add('btn-outline-secondary');
    }
  });
  els.feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function formatGroupLabel(group) {
  if (group === 'optimists') return 'optimists';
  if (group === 'pesimists') return 'pesimists';
  return 'neitrāls';
}

function showSummary() {
  clearTimeout(state.autoAdvanceTimer);
  state.autoAdvanceTimer = null;
  els.questionArea.classList.add('d-none');
  els.summaryArea.classList.remove('d-none');
  els.feedback.classList.add('d-none');
  const percent = state.asked ? Math.round((state.correct / state.asked) * 100) : 0;
  els.summaryScore.textContent = `Pareizi: ${state.correct} no ${state.asked} (${percent}%)`;
  const verdict =
    percent >= 90
      ? 'Lieliski!'
      : percent >= 60
        ? 'Labi, tu labi pārzini rakstura īpašības.'
        : 'Vajag vēl patrennēties.';
  els.summaryVerdict.textContent = verdict;
  showReward({
    title: verdict,
    detail: `Pareizi ${percent}%`,
    icon: percent >= 90 ? '★' : '✓',
    tone: percent >= 90 ? 'success' : 'accent',
  });
  els.mistakesList.replaceChildren();
  if (!state.mistakes.length) {
    const ok = document.createElement('div');
    ok.className = 'alert alert-success mb-0';
    ok.textContent = 'Nav kļūdu — lieliski!';
    els.mistakesList.appendChild(ok);
  } else {
    state.mistakes.forEach((item) => {
      const groupLabel = formatGroupLabel(item.group);
      const row = document.createElement('div');
      row.className = 'list-group-item';
      const content = document.createElement('div');
      content.className = 'd-flex flex-column gap-1';

      const title = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = item.lv;
      title.append(strong, document.createTextNode(` — ${formatOption(item.enVariants)}`));

      const meta = document.createElement('div');
      meta.className = 'd-flex flex-wrap gap-2 small';
      if (groupLabel) {
        const groupBadge = document.createElement('span');
        groupBadge.className = 'badge bg-secondary-subtle text-secondary-emphasis';
        groupBadge.textContent = `Grupa: ${groupLabel}`;
        meta.append(groupBadge);
      }
      if (item.notes) {
        const noteBadge = document.createElement('span');
        noteBadge.className = 'badge bg-light text-dark border';
        noteBadge.title = item.notes;
        noteBadge.textContent = `Piezīme: ${item.notes}`;
        meta.append(noteBadge);
      }

      const answers = document.createElement('div');
      answers.className = 'd-flex flex-wrap gap-2 small';
      const correctBadge = document.createElement('span');
      correctBadge.className = 'badge bg-success-subtle text-success-emphasis border';
      correctBadge.textContent = `Pareizi: ${state.mode === MODE_GROUPS ? item.group : formatOption(item.enVariants)}`;
      const answerBadge = document.createElement('span');
      answerBadge.className = 'badge bg-danger-subtle text-danger-emphasis border';
      answerBadge.textContent = `Tava atbilde: ${item.selected}`;
      answers.append(correctBadge, answerBadge);

      content.append(title, meta, answers);
      row.append(content);
      els.mistakesList.appendChild(row);
    });
  }
  els.counterBadge.textContent = 'Kopsavilkums';
  els.nextBtn.disabled = true;
  els.summaryArea.focus();
  els.summaryArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  saveLastResult({ mode: state.mode, correct: state.correct, total: state.asked, percent });
}

function renderQuestion() {
  clearTimeout(state.autoAdvanceTimer);
  state.autoAdvanceTimer = null;
  if (!state.questionPool.length) {
    els.questionText.textContent = 'Nav pietiekamu datu. Pārbaudi CSV failu.';
    els.counterBadge.textContent = 'Jautājums 0 / 0';
    els.questionProgress.textContent = 'Jautājums 0 / 0';
    return;
  }
  state.locked = false;
  els.summaryArea.classList.add('d-none');
  els.questionArea.classList.remove('d-none');
  setFeedbackNeutral();
  const question = state.questionPool[state.questionIndex];
  els.questionText.textContent = question.lv;
  renderChoices(question);
  els.nextBtn.disabled = true;
  els.nextBtn.textContent = 'Nākamais jautājums';
  updateScoreBadges();
  renderGroupStats();
  els.questionText.focus();
}

function nextStep() {
  if (!els.summaryArea.classList.contains('d-none')) return;
  if (state.questionIndex >= state.questionPool.length - 1) {
    showSummary();
  } else {
    state.questionIndex += 1;
    renderQuestion();
  }
}

function startRound(mode) {
  state.mode = mode;
  setActiveModeButton(mode);
  state.questionIndex = 0;
  state.asked = 0;
  state.correct = 0;
  state.mistakes = [];
  resetGroupStats();
  state.questionPool = formatQuestionPool(
    mode === MODE_GROUPS ? state.groupWords : state.allWords,
    mode,
  );
  renderQuestion();
  announce('Jauns raunds sākts');
}

function scheduleAutoAdvance() {
  clearTimeout(state.autoAdvanceTimer);
  state.autoAdvanceTimer = setTimeout(() => {
    if (!state.locked) return;
    nextStep();
  }, AUTO_ADVANCE_MS);
}

function saveLastResult(result) {
  state.lastResult = result;
  try {
    const current = readGameProgress(GAME_ID, {});
    writeGameProgress(GAME_ID, { ...current, lastResult: result });
  } catch (err) {
    console.warn('Cannot store result', err);
  }
  renderLastResult();
}

function loadLastResult() {
  try {
    const stored = readGameProgress(GAME_ID, {});
    return isPlainObject(stored?.lastResult) ? stored.lastResult : null;
  } catch (err) {
    return null;
  }
}

async function loadData() {
  showLoading('Loading game data...');
  els.questionText.textContent = 'Ielādē datus…';
  setFeedbackNeutral();
  try {
    const parsed = await loadPersonalityWords();
    state.allWords = parsed;
    state.groupWords = parsed.filter(
      (item) => item.group === 'optimists' || item.group === 'pesimists',
    );
    Object.values(els.modeButtons).forEach((btn) => btn.removeAttribute('disabled'));
    els.year.textContent = new Date().getFullYear();
    renderLastResult();
    announce('Dati ielādēti, vari sākt spēli.');
    startRound(state.mode);
  } catch (err) {
    console.error(err);
    els.questionText.textContent = 'Radās problēma ar datu ielādi.';
    els.feedbackText.textContent = 'Pārbaudi failu data/personality/words.csv un mēģini vēlreiz.';
    const safeError =
      err instanceof Error ? err : new Error('Failed to load character traits data.');
    showFatalError(safeError);
  } finally {
    hideLoading();
  }
}

function init() {
  els.year.textContent = new Date().getFullYear();
  setActiveModeButton(state.mode);
  renderGroupStats();
  renderLastResult();
  els.modeButtons[MODE_GROUPS].addEventListener('click', () => {
    if (!state.allWords.length) return;
    startRound(MODE_GROUPS);
  });
  els.modeButtons[MODE_TRANSLATE].addEventListener('click', () => {
    if (!state.allWords.length) return;
    startRound(MODE_TRANSLATE);
  });
  els.nextBtn.addEventListener('click', nextStep);
  els.restartBtn.addEventListener('click', () => startRound(state.mode));
  loadData();
}

init();
