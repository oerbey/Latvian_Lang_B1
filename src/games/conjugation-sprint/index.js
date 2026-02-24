import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { loadWords } from '../../lib/words-data.js';
import { showReward } from '../../lib/reward.js';
import { readGameProgress, writeGameProgress } from '../../lib/storage.js';
import {
  CONJUGATION_SPRINT_CONSTANTS,
  buildOptions,
  buildPromptPool,
  calculateScoreDelta,
  normalizePaceMode,
} from './logic.js';

(() => {
  const { PRONOUNS, SLOT_BY_PRONOUN, TENSES } = CONJUGATION_SPRINT_CONSTANTS;
  const GAME_ID = 'conjugation-sprint';
  const VALID_TENSE_MODES = ['random', ...TENSES];
  const MAX_ROUNDS = 20;
  const ROUND_DURATION_MS = 8000;
  const ADVANCE_DELAY_MS = 760;

  let verbs = [];
  let promptPool = [];
  let promptDeck = [];
  let current = null;

  let score = 0;
  let streak = 0;
  let answeredRounds = 0;
  let lock = false;

  let bestScore = 0;
  let bestStreak = 0;

  let tenseMode = 'random';
  let paceMode = 'timed';

  let roundTimerId = null;
  let remainingMs = ROUND_DURATION_MS;

  const perRight = {};
  const perSeen = {};
  Object.values(SLOT_BY_PRONOUN).forEach((slot) => {
    perRight[slot] = 0;
    perSeen[slot] = 0;
  });

  const qEl = id('qtext');
  const mEl = id('meta');
  const cEl = id('choices');
  const scoreEl = id('score');
  const streakEl = id('streak');
  const roundEl = id('round');
  const timerEl = id('timer');
  const bestEl = id('best');
  const perStatsEl = id('perstats');
  const roundProgressEl = id('roundProgress');
  const roundProgressFillEl = id('roundProgressFill');
  const feedbackEl = id('feedback');
  const againBtn = id('again');
  const skipBtn = id('skip');
  const tenseFilterEl = id('tenseFilter');
  const paceModeEl = id('paceMode');

  if (againBtn) {
    againBtn.onclick = reset;
  }
  if (skipBtn) {
    skipBtn.onclick = () => checkAnswer({ selected: null, reason: 'skip' });
  }

  if (tenseFilterEl) {
    tenseFilterEl.value = tenseMode;
    tenseFilterEl.disabled = true;
    tenseFilterEl.addEventListener('change', (event) => {
      const nextMode = event.target?.value || 'random';
      if (!VALID_TENSE_MODES.includes(nextMode)) return;
      tenseMode = nextMode;
      reset();
    });
  }

  if (paceModeEl) {
    paceModeEl.value = paceMode;
    paceModeEl.disabled = true;
    paceModeEl.addEventListener('change', (event) => {
      paceMode = normalizePaceMode(event.target?.value);
      persistProgress();
      reset();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (isInteractiveTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'r') {
      event.preventDefault();
      reset();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      checkAnswer({ selected: null, reason: 'skip' });
      return;
    }

    if (['1', '2', '3', '4'].includes(event.key) && cEl) {
      const idx = Number(event.key) - 1;
      const buttons = [...cEl.querySelectorAll('button')];
      const button = buttons[idx];
      if (button && !button.disabled) {
        event.preventDefault();
        checkAnswer({ selected: button.textContent || null, button, reason: 'answer' });
      }
    }
  });

  loadStoredProgress();
  updateBestBadge();
  updateTimerBadge();

  (async () => {
    showLoading('Loading game data...');

    try {
      const { items } = await loadWords();
      verbs = Array.isArray(items)
        ? items.filter((entry) => entry?.conj?.present && entry?.conj?.past && entry?.conj?.future)
        : [];
    } catch (err) {
      if (qEl) qEl.textContent = 'Failed to load words data.';
      console.error(err);
      hideLoading();
      const safeError = err instanceof Error ? err : new Error('Failed to load words data.');
      showFatalError(safeError);
      return;
    }

    if (!verbs.length) {
      if (qEl) qEl.textContent = 'No verbs with conjugations found.';
      hideLoading();
      return;
    }

    if (tenseFilterEl) tenseFilterEl.disabled = false;
    if (paceModeEl) {
      paceModeEl.disabled = false;
      paceModeEl.value = paceMode;
    }

    hideLoading();
    reset();
  })();

  function reset() {
    stopRoundTimer();

    score = 0;
    streak = 0;
    answeredRounds = 0;
    lock = false;
    current = null;

    Object.keys(perRight).forEach((slot) => {
      perRight[slot] = 0;
      perSeen[slot] = 0;
    });

    promptPool = buildPromptPool(verbs, tenseMode);
    promptDeck = [];

    if (!promptPool.length) {
      if (qEl) qEl.textContent = 'No valid conjugation prompts found for this mode.';
      if (mEl) mEl.textContent = 'Try a different tense mode.';
      if (cEl) cEl.replaceChildren();
      setFeedback('Unable to start: not enough valid verb forms in this mode.', 'info');
      updateHUD();
      return;
    }

    setFeedback(
      paceMode === 'timed'
        ? 'Timed sprint active. Answer quickly for bonus points.'
        : 'No timer mode active. Focus on accuracy.',
      'info',
    );

    updateHUD();
    nextRound();
  }

  function nextRound() {
    stopRoundTimer();
    lock = false;

    if (answeredRounds >= MAX_ROUNDS) {
      finish();
      return;
    }

    if (!pickPromptWithOptions()) {
      finish('Sprint ended early: could not build enough answer options.');
      return;
    }

    if (roundEl) {
      roundEl.textContent = `round ${answeredRounds + 1}/${MAX_ROUNDS}`;
    }
    if (qEl) {
      qEl.textContent = `${current.lv} — ${current.pronoun} (${current.tense})`;
    }
    if (mEl) {
      mEl.textContent = current.en || ' ';
    }

    renderChoices(current.options);
    updateHUD();
    startRoundTimer();
  }

  function pickPromptWithOptions() {
    if (!promptPool.length) return false;

    const maxAttempts = Math.max(promptPool.length, 1);
    for (let i = 0; i < maxAttempts; i += 1) {
      const candidate = takePromptFromDeck();
      if (!candidate) return false;
      const options = buildOptions(candidate, promptPool);
      if (options.length !== 4) continue;
      current = { ...candidate, options };
      return true;
    }

    return false;
  }

  function takePromptFromDeck() {
    if (!promptDeck.length) {
      refillPromptDeck();
    }
    return promptDeck.pop() || null;
  }

  function refillPromptDeck() {
    const previousKey = current?.key;
    const source = promptPool.filter((prompt) => prompt.key !== previousKey);
    const nextDeck = source.length ? source : promptPool;
    promptDeck = shuffle(nextDeck);
  }

  function renderChoices(options) {
    if (!cEl) return;

    cEl.replaceChildren();
    options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'btn btn-outline-secondary';
      button.textContent = option;
      button.dataset.choiceIndex = String(index + 1);
      button.setAttribute('aria-label', `Choice ${index + 1}: ${option}`);
      button.onclick = () => checkAnswer({ selected: option, button, reason: 'answer' });
      cEl.appendChild(button);
    });
  }

  function checkAnswer({ selected, button = null, reason = 'answer' }) {
    if (lock || !current) return;
    lock = true;

    stopRoundTimer();

    perSeen[current.slot] += 1;

    const buttons = cEl ? [...cEl.querySelectorAll('button')] : [];
    buttons.forEach((node) => {
      node.disabled = true;
    });

    let result = 'wrong';
    if (reason === 'skip') {
      result = 'skip';
    } else if (reason === 'timeout') {
      result = 'timeout';
    } else if (selected === current.correct) {
      result = 'correct';
    }

    const delta = calculateScoreDelta({ result, paceMode, remainingMs });
    score = Math.max(0, score + delta);

    if (result === 'correct') {
      streak += 1;
      perRight[current.slot] += 1;

      if (button) {
        button.classList.remove('btn-outline-secondary');
        button.classList.add('btn-success');
      }

      if (streak > 0 && streak % 5 === 0) {
        showReward({
          title: `Streak ${streak}`,
          detail: 'Keep the momentum.',
          points: 10,
          pointsLabel: 'xp',
          tone: 'success',
        });
      }

      setFeedback(`Correct: ${current.correct} (+${delta})`, 'success');
    } else {
      streak = 0;

      if (button && reason !== 'skip' && reason !== 'timeout') {
        button.classList.remove('btn-outline-secondary');
        button.classList.add('btn-danger');
      }

      if (result === 'skip') {
        setFeedback(`Skipped. Correct: ${current.correct} (${delta})`, 'warning');
      } else if (result === 'timeout') {
        setFeedback(`Time ran out. Correct: ${current.correct} (${delta})`, 'warning');
      } else {
        setFeedback(`Not quite. Correct: ${current.correct} (${delta})`, 'warning');
      }
    }

    const correctButton = buttons.find((node) => node.textContent === current.correct);
    if (correctButton) {
      correctButton.classList.remove('btn-outline-secondary');
      correctButton.classList.add('btn-success');
    }

    answeredRounds += 1;
    syncBestProgress();
    updateHUD();

    window.setTimeout(() => {
      if (answeredRounds >= MAX_ROUNDS) {
        finish();
      } else {
        nextRound();
      }
    }, ADVANCE_DELAY_MS);
  }

  function startRoundTimer() {
    stopRoundTimer();

    remainingMs = ROUND_DURATION_MS;
    updateTimerBadge();

    if (paceMode === 'untimed') {
      return;
    }

    roundTimerId = window.setInterval(() => {
      if (lock) return;

      remainingMs = Math.max(0, remainingMs - 100);
      updateTimerBadge();

      if (remainingMs <= 0) {
        checkAnswer({ selected: null, reason: 'timeout' });
      }
    }, 100);
  }

  function stopRoundTimer() {
    if (!roundTimerId) return;
    window.clearInterval(roundTimerId);
    roundTimerId = null;
  }

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = `score ${score}`;
    if (streakEl) streakEl.textContent = `streak ${streak}`;

    const roundValue = Math.min(answeredRounds + 1, MAX_ROUNDS);
    if (roundEl && answeredRounds >= MAX_ROUNDS) {
      roundEl.textContent = `round ${MAX_ROUNDS}/${MAX_ROUNDS}`;
    } else if (roundEl) {
      roundEl.textContent = `round ${roundValue}/${MAX_ROUNDS}`;
    }

    updateBestBadge();
    updateTimerBadge();

    if (roundProgressFillEl) {
      const pct = Math.max(0, Math.min(100, (answeredRounds / MAX_ROUNDS) * 100));
      roundProgressFillEl.style.width = `${pct}%`;
    }
    if (roundProgressEl) {
      roundProgressEl.setAttribute('aria-valuenow', String(answeredRounds));
      roundProgressEl.setAttribute('aria-valuemax', String(MAX_ROUNDS));
    }

    renderPronounStats();
  }

  function renderPronounStats() {
    if (!perStatsEl) return;

    perStatsEl.replaceChildren();
    PRONOUNS.forEach((pronoun) => {
      const slot = SLOT_BY_PRONOUN[pronoun];
      const seen = perSeen[slot] || 0;
      const right = perRight[slot] || 0;
      const pct = seen ? Math.round((100 * right) / seen) : 0;

      const wrapper = document.createElement('div');
      wrapper.className = 'col';

      const cell = document.createElement('div');
      cell.className = 'cs-perstats__cell';

      const pron = document.createElement('span');
      pron.className = 'cs-perstats__pron';
      pron.textContent = pronoun;

      const ratio = document.createElement('span');
      ratio.className = 'cs-perstats__ratio';
      ratio.textContent = `${right}/${seen}`;

      const pctEl = document.createElement('strong');
      pctEl.className = 'cs-perstats__pct';
      pctEl.textContent = `${pct}%`;

      cell.append(pron, pctEl, ratio);
      wrapper.appendChild(cell);
      perStatsEl.appendChild(wrapper);
    });
  }

  function updateTimerBadge() {
    if (!timerEl) return;

    if (paceMode === 'untimed') {
      timerEl.textContent = 'timer off';
      timerEl.classList.remove('is-warning');
      timerEl.classList.add('is-off');
      return;
    }

    const seconds = (remainingMs / 1000).toFixed(1);
    timerEl.textContent = `timer ${seconds}s`;
    timerEl.classList.remove('is-off');
    timerEl.classList.toggle('is-warning', remainingMs <= 3000);
  }

  function updateBestBadge() {
    if (!bestEl) return;
    bestEl.textContent = `best ${bestScore} · streak ${bestStreak}`;
  }

  function finish(reasonMessage = '') {
    stopRoundTimer();
    lock = true;
    current = null;

    if (qEl) qEl.textContent = 'Sprint complete!';

    const weakest = findWeakestPronoun();
    if (mEl) {
      if (weakest) {
        mEl.textContent = `Weakest slot: ${weakest.pronoun} (${weakest.pct}%). Replay and stabilize this ending.`;
      } else {
        mEl.textContent = 'Replay to reinforce weak pronouns. Aim for 90%+ across all six slots.';
      }
    }

    if (cEl) cEl.replaceChildren();

    if (reasonMessage) {
      setFeedback(reasonMessage, 'warning');
    } else {
      setFeedback(`Final score ${score}. Best ${bestScore}.`, 'success');
    }

    syncBestProgress(true);

    showReward({
      title: 'Sprint complete',
      detail: `Score ${score}`,
      tone: 'accent',
    });

    updateHUD();
  }

  function findWeakestPronoun() {
    const rows = PRONOUNS.map((pronoun) => {
      const slot = SLOT_BY_PRONOUN[pronoun];
      const seen = perSeen[slot] || 0;
      const right = perRight[slot] || 0;
      const pct = seen ? Math.round((100 * right) / seen) : 100;
      return { pronoun, pct, seen };
    }).filter((row) => row.seen > 0);

    if (!rows.length) return null;
    rows.sort((a, b) => a.pct - b.pct);
    return rows[0];
  }

  function setFeedback(message, tone = 'info') {
    if (!feedbackEl) return;
    feedbackEl.hidden = false;
    feedbackEl.textContent = message;
    feedbackEl.classList.remove('is-success', 'is-warning', 'is-info');
    feedbackEl.classList.add(`is-${tone}`);
  }

  function loadStoredProgress() {
    const data = readGameProgress(GAME_ID, {
      bestScore: 0,
      bestStreak: 0,
      lastPlayedISO: null,
      preferredPaceMode: 'timed',
    });

    bestScore = Number.isFinite(data.bestScore) ? Math.max(0, data.bestScore) : 0;
    bestStreak = Number.isFinite(data.bestStreak) ? Math.max(0, data.bestStreak) : 0;
    paceMode = normalizePaceMode(data.preferredPaceMode);

    if (paceModeEl) {
      paceModeEl.value = paceMode;
    }
  }

  function syncBestProgress(force = false) {
    const scoreImproved = score > bestScore;
    const streakImproved = streak > bestStreak;

    if (scoreImproved) bestScore = score;
    if (streakImproved) bestStreak = streak;

    if (scoreImproved || streakImproved || force) {
      persistProgress();
    }
  }

  function persistProgress() {
    writeGameProgress(GAME_ID, {
      bestScore,
      bestStreak,
      lastPlayedISO: new Date().toISOString(),
      preferredPaceMode: paceMode,
    });
  }

  function isInteractiveTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function id(value) {
    return document.getElementById(value);
  }

  function shuffle(values) {
    const arr = [...values];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
})();
