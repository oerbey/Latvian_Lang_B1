import { mustId } from '../../lib/dom.js';

const DATA_PATH = 'data/maini-vai-mainies/items.json';
const STORAGE_KEY = 'llb1:maini-vai-mainies:progress';
const GAME_NAME = 'maini-vai-mainies';
const AVATARS = {
  neutral: 'assets/img/maini-vai-mainies/avatars/avatar-neutral.svg',
  happy: 'assets/img/maini-vai-mainies/avatars/avatar-happy.svg',
  thinking: 'assets/img/maini-vai-mainies/avatars/avatar-thinking.svg',
};

const selectors = {
  title: mustId('mvmTitle'),
  instructions: mustId('mvmInstructions'),
  sentence: mustId('mvmSentence'),
  choiceA: mustId('mvmChoiceA'),
  choiceB: mustId('mvmChoiceB'),
  buttons: Array.from(document.querySelectorAll('.mvm-choice')),
  feedback: mustId('mvmFeedback'),
  hint: mustId('mvmHint'),
  score: mustId('mvmScore'),
  streak: mustId('mvmStreak'),
  start: mustId('mvmStart'),
  next: mustId('mvmNext'),
  live: mustId('mvmLive'),
  avatar: mustId('mvmAvatar'),
};

const state = {
  items: [],
  order: [],
  index: -1,
  score: 0,
  streak: 0,
  attempts: 0,
  potential: 5,
  readyForNext: false,
  started: false,
  strings: {},
};

function normalizeAnswer(value) {
  return (value ?? '').trim().toLowerCase();
}

function asset(path) {
  return new URL(path, document.baseURI).href;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function readProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const xp = Number(parsed.xp);
    const streak = Number(parsed.streak);
    return {
      xp: Number.isFinite(xp) ? xp : 0,
      streak: Number.isFinite(streak) ? streak : 0,
      lastPlayedISO: typeof parsed.lastPlayedISO === 'string' ? parsed.lastPlayedISO : null,
    };
  } catch (err) {
    console.warn('Unable to read progress', err);
    return null;
  }
}

function persistProgress() {
  try {
    const payload = {
      xp: state.score,
      streak: state.streak,
      lastPlayedISO: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Unable to persist progress', err);
  }
}

function dispatchAnalytics(event, meta = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent('llb1:track', {
        detail: {
          game: GAME_NAME,
          event,
          meta,
        },
      }),
    );
  } catch (err) {
    console.warn('Event dispatch failed', err);
  }
}

function setAvatar(mode) {
  const key = AVATARS[mode] ? mode : 'neutral';
  if (selectors.avatar) {
    selectors.avatar.src = asset(AVATARS[key]);
  }
}

function setFeedback(message = '') {
  if (selectors.feedback) {
    selectors.feedback.textContent = message;
  }
  if (selectors.live) {
    selectors.live.textContent = message;
  }
}

function setHint(message = '') {
  if (selectors.hint) {
    selectors.hint.textContent = message;
  }
}

function formatScore(value) {
  return `${state.strings.scoreLabel ?? 'Score'}: ${value}`;
}

function formatStreak(value) {
  return `${state.strings.streakLabel ?? 'Streak'}: ${value}`;
}

function updateMetrics() {
  if (selectors.score) {
    selectors.score.textContent = formatScore(state.score);
  }
  if (selectors.streak) {
    selectors.streak.textContent = formatStreak(state.streak);
  }
}

function setButtonsDisabled(disabled) {
  selectors.buttons.forEach(btn => {
    btn.disabled = disabled;
  });
}

function highlightSelection(button, correct) {
  selectors.buttons.forEach(btn => {
    btn.classList.remove('btn-success', 'btn-danger');
    btn.classList.add('btn-outline-primary');
  });
  if (!button) return;
  button.classList.remove('btn-outline-primary');
  button.classList.add(correct ? 'btn-success' : 'btn-danger');
}

function currentItem() {
  if (state.index < 0 || state.index >= state.order.length) return null;
  return state.order[state.index];
}

function prepareNextItem() {
  const item = currentItem();
  if (!item) return;
  if (selectors.sentence) selectors.sentence.textContent = item.sentence ?? '';
  selectors.buttons.forEach((btn, idx) => {
    const choice = item.choices?.[idx] ?? '';
    btn.textContent = choice;
    btn.setAttribute('aria-label', choice);
  });
  state.attempts = 0;
  state.potential = 5;
  state.readyForNext = false;
  setButtonsDisabled(false);
  selectors.buttons.forEach(btn => {
    btn.classList.remove('btn-success', 'btn-danger');
    btn.classList.add('btn-outline-primary');
  });
  if (selectors.next) {
    selectors.next.disabled = true;
  }
  setAvatar('neutral');
  setFeedback('');
  setHint('');
  window.requestAnimationFrame(() => {
    selectors.buttons[0]?.focus();
  });
}

function awardScore() {
  const earned = Math.max(1, state.potential);
  state.score += earned;
  state.streak += 1;
  let bonus = 0;
  if (state.streak > 0 && state.streak % 5 === 0) {
    state.score += 10;
    bonus = 10;
  }
  persistProgress();
  updateMetrics();
  return { earned, bonus };
}

function handleCorrect(button) {
  const item = currentItem();
  if (!item) return;
  highlightSelection(button, true);
  setButtonsDisabled(true);
  state.readyForNext = true;
  const { earned, bonus } = awardScore();
  const explainText = item.explain ? ` ${item.explain}` : '';
  const bonusText = bonus ? ` (+${bonus})` : '';
  setFeedback(`${state.strings.correct ?? 'Correct!'} +${earned}${bonusText}.${explainText}`.trim());
  setHint('');
  setAvatar('happy');
  if (selectors.next) {
    selectors.next.disabled = false;
    selectors.next.focus();
  }
  dispatchAnalytics('correct', { itemId: item.id });
}

function handleWrong(button) {
  const item = currentItem();
  if (!item) return;
  state.streak = 0;
  state.attempts += 1;
  state.potential = Math.max(1, state.potential - 2);
  persistProgress();
  updateMetrics();
  highlightSelection(button, false);
  setAvatar('thinking');
  setFeedback(state.strings.wrong ?? 'Try again!');
  const hintLabel = state.strings.hintLabel ?? 'Hint';
  setHint(item.hint ? `${hintLabel}: ${item.hint}` : '');
  window.requestAnimationFrame(() => {
    button?.focus();
  });
  dispatchAnalytics('wrong', { itemId: item.id });
}

function advance() {
  state.index += 1;
  if (state.index >= state.order.length) {
    handleComplete();
    return;
  }
  prepareNextItem();
}

function handleComplete() {
  setButtonsDisabled(true);
  setAvatar('happy');
  setFeedback(state.strings.complete ?? 'Level complete!');
  setHint('');
  if (selectors.next) {
    selectors.next.disabled = true;
  }
  state.started = false;
  dispatchAnalytics('complete', {});
}

function handleChoice(event) {
  const button = event.currentTarget;
  if (!button) return;
  if (!state.started || state.readyForNext) return;
  const idx = Number.parseInt(button.dataset.choice, 10);
  const item = currentItem();
  if (!item) return;
  const choice = item.choices?.[idx] ?? '';
  const correct = normalizeAnswer(choice) === normalizeAnswer(item.answer);
  if (correct) {
    handleCorrect(button);
  } else {
    handleWrong(button);
  }
}

function startSession() {
  if (!state.items.length) return;
  state.order = shuffle(state.items);
  state.index = -1;
  state.started = true;
  state.readyForNext = false;
  dispatchAnalytics('start', {});
  advance();
}

function applyStrings(strings) {
  state.strings = {
    ...strings,
    scoreLabel: strings?.score ?? 'Score',
    streakLabel: strings?.streak ?? 'Streak',
    hintLabel: strings?.hint ?? 'Hint',
    correct: strings?.correct ?? 'Correct!',
    wrong: strings?.wrong ?? 'Try again!',
    complete: strings?.level_complete ?? 'Level complete!',
  };

  if (selectors.title && strings?.title) selectors.title.textContent = strings.title;
  if (selectors.instructions && strings?.instructions) selectors.instructions.textContent = strings.instructions;
  if (selectors.start && strings?.start) selectors.start.textContent = strings.start;
  if (selectors.next && strings?.next) selectors.next.textContent = strings.next;
  updateMetrics();
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function loadStrings() {
  const htmlLang = document.documentElement?.lang?.split('-')?.[0]?.toLowerCase() || 'lv';
  const fallbackOrder = htmlLang === 'lv' ? ['lv', 'en'] : [htmlLang, 'lv', 'en'];
  for (const code of fallbackOrder) {
    try {
      const data = await loadJSON(`i18n/${GAME_NAME}.${code}.json`);
      if (data) return data;
    } catch (err) {
      console.warn(`Missing strings for ${code}`, err);
    }
  }
  return {};
}

async function bootstrap() {
  selectors.start.disabled = true;
  setButtonsDisabled(true);

  selectors.buttons.forEach(btn => btn.addEventListener('click', handleChoice));

  if (selectors.next) {
    selectors.next.addEventListener('click', () => {
      if (!state.started || !state.readyForNext) return;
      advance();
    });
  }

  if (selectors.start) {
    selectors.start.addEventListener('click', () => {
      startSession();
    });
  }

  const strings = await loadStrings();
  applyStrings(strings);

  const progress = readProgress();
  if (progress) {
    state.score = progress.xp ?? 0;
    state.streak = progress.streak ?? 0;
    updateMetrics();
  }

  try {
    const items = await loadJSON(DATA_PATH);
    if (!Array.isArray(items)) {
      throw new Error('Dataset malformed');
    }
    state.items = items;
    selectors.start.disabled = false;
    if (selectors.sentence) selectors.sentence.textContent = '—';
  } catch (err) {
    console.error(err);
    setFeedback('Neizdevās ielādēt datus.');
  }
}

bootstrap().catch(err => {
  console.error('Failed to init game', err);
});
