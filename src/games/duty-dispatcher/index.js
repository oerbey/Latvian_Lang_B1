const ROLES_PATH = 'data/duty-dispatcher/roles.json';
const TASKS_PATH = 'data/duty-dispatcher/tasks.json';
const STORAGE_KEY = 'llb1:duty-dispatcher:progress';
const GAME_NAME = 'duty-dispatcher';

const selectors = {
  title: document.getElementById('ddTitle'),
  instructions: document.getElementById('ddInstructions'),
  scenario: document.getElementById('ddScenario'),
  dutyCard: document.getElementById('ddDutyCard'),
  rolesGrid: document.getElementById('ddRoles'),
  feedback: document.getElementById('ddFeedback'),
  hint: document.getElementById('ddHint'),
  score: document.getElementById('ddScore'),
  streak: document.getElementById('ddStreak'),
  start: document.getElementById('ddStart'),
  next: document.getElementById('ddNext'),
  live: document.getElementById('ddLive'),
  progress: document.getElementById('ddProgress'),
};

const state = {
  strings: {},
  roles: [],
  tasks: [],
  order: [],
  index: -1,
  score: 0,
  streak: 0,
  potential: 10,
  attempts: 0,
  readyForNext: false,
  started: false,
};

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function asset(path) {
  return new URL(path, document.baseURI).href;
}

function loadJSON(path) {
  return fetch(path, { cache: 'no-store' }).then(res => {
    if (!res.ok) {
      throw new Error(`Failed to load ${path}: ${res.status}`);
    }
    return res.json();
  });
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
    };
  } catch (err) {
    console.warn('Unable to read stored progress', err);
    return null;
  }
}

function persistProgress() {
  try {
    const data = {
      xp: state.score,
      streak: state.streak,
      lastPlayedISO: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    console.warn('Analytics dispatch failed', err);
  }
}

function setFeedback(message = '') {
  if (selectors.feedback) selectors.feedback.textContent = message;
  if (selectors.live) selectors.live.textContent = message;
}

function setHint(message = '') {
  if (selectors.hint) selectors.hint.textContent = message;
}

function formatScore(value) {
  return `${state.strings.scoreLabel ?? 'Score'}: ${value}`;
}

function formatStreak(value) {
  return `${state.strings.streakLabel ?? 'Streak'}: ${value}`;
}

function updateMetrics() {
  if (selectors.score) selectors.score.textContent = formatScore(state.score);
  if (selectors.streak) selectors.streak.textContent = formatStreak(state.streak);
}

function updateProgress() {
  if (!selectors.progress) return;
  const total = state.order.length;
  const current = state.index >= 0 ? Math.min(state.index + 1, total) : 0;
  selectors.progress.textContent = `${current}/${total}`;
  const label = state.strings.progressLabel ?? 'Task';
  selectors.progress.setAttribute('aria-label', `${label} ${current} / ${total}`);
}

function clearRoleHighlights() {
  const buttons = selectors.rolesGrid ? [...selectors.rolesGrid.querySelectorAll('.dd-role')] : [];
  buttons.forEach(btn => {
    btn.classList.remove('dd-role--correct', 'dd-role--wrong', 'dd-role--hover');
    btn.disabled = false;
    const dutyEl = btn.querySelector('.dd-role__duty');
    if (dutyEl) dutyEl.textContent = '';
  });
}

function disableRoles() {
  const buttons = selectors.rolesGrid ? [...selectors.rolesGrid.querySelectorAll('.dd-role')] : [];
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.classList.remove('dd-role--hover');
  });
}

function markRole(roleId, status, dutyText) {
  if (!selectors.rolesGrid) return null;
  const node = selectors.rolesGrid.querySelector(`.dd-role[data-role-id="${roleId}"]`);
  if (!node) return null;
  node.classList.remove('dd-role--correct', 'dd-role--wrong', 'dd-role--hover');
  if (status === 'correct') {
    node.classList.add('dd-role--correct');
    const dutyEl = node.querySelector('.dd-role__duty');
    if (dutyEl) dutyEl.textContent = dutyText ?? '';
  } else if (status === 'wrong') {
    node.classList.add('dd-role--wrong');
  }
  return node;
}

function currentTask() {
  if (state.index < 0 || state.index >= state.order.length) return null;
  return state.order[state.index];
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

function capitalizeDative(word = '') {
  if (!word) return '';
  const [first, ...rest] = word.trim();
  if (first === undefined) return '';
  const upper = typeof first.toLocaleUpperCase === 'function' ? first.toLocaleUpperCase('lv-LV') : first.toUpperCase();
  return upper + rest.join('');
}

function ensureTrailingPeriod(text = '') {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function buildExplain(task) {
  if (task?.explain) return task.explain;
  const recipients = Array.isArray(task?.validRecipients) ? task.validRecipients : [];
  const firstRole = state.roles.find(role => recipients.includes(role.id));
  const name = firstRole?.dative ? capitalizeDative(firstRole.dative) : firstRole?.label;
  const rawCard = (task?.card ?? '').trim();
  const lower = rawCard.toLowerCase();
  const hasAux = lower.startsWith('ir ') || lower.startsWith('bija ') || lower.startsWith('būs ');
  let phrase = rawCard;
  if (!hasAux) {
    const prefix = task?.tense === 'past' ? 'bija' : task?.tense === 'future' ? 'būs' : 'ir';
    phrase = `${prefix} ${rawCard}`.trim();
  }
  if (name) {
    return `${name} ${phrase}`.trim();
  }
  return phrase;
}

function handleCorrect(roleId) {
  const task = currentTask();
  if (!task) return;
  markRole(roleId, 'correct', task.card);
  disableRoles();
  state.readyForNext = true;
  const { earned, bonus } = awardScore();
  const correctMsg = state.strings.correct ?? 'Correct!';
  const bonusMsg = bonus ? ` (+${bonus})` : '';
  const base = `${correctMsg} +${earned}${bonusMsg}`.trim();
  const explain = ensureTrailingPeriod(buildExplain(task));
  const message = explain ? `${base}. ${explain}` : `${base}.`;
  setFeedback(message);
  setHint('');
  if (selectors.next) {
    selectors.next.disabled = false;
    selectors.next.focus({ preventScroll: true });
  }
  if (selectors.dutyCard) {
    selectors.dutyCard.setAttribute('aria-disabled', 'true');
    selectors.dutyCard.draggable = false;
  }
  dispatchAnalytics('correct', { taskId: task.id });
}

function handleWrong(roleId) {
  const task = currentTask();
  if (!task) return;
  state.streak = 0;
  state.attempts += 1;
  state.potential = Math.max(1, state.potential - 3);
  persistProgress();
  updateMetrics();

  const btn = markRole(roleId, 'wrong');
  if (btn) {
    btn.classList.remove('dd-role--hover');
    window.setTimeout(() => {
      btn.classList.remove('dd-role--wrong');
      if (!btn.disabled) {
        btn.focus({ preventScroll: false });
      }
    }, 600);
  }
  const wrongMsg = state.strings.wrong ?? 'Try again!';
  setFeedback(wrongMsg);
  const hintLabel = state.strings.hintLabel ?? 'Hint';
  setHint(task.hint ? `${hintLabel}: ${task.hint}` : '');
  dispatchAnalytics('wrong', { taskId: task.id });
}

function assignDuty(roleId) {
  if (!state.started || state.readyForNext) return;
  const task = currentTask();
  if (!task) return;
  if (!Array.isArray(task.validRecipients)) return;
  if (task.validRecipients.includes(roleId)) {
    handleCorrect(roleId);
  } else {
    handleWrong(roleId);
  }
}

function prepareTask() {
  const task = currentTask();
  if (!task) return;
  state.potential = 10;
  state.attempts = 0;
  state.readyForNext = false;

  if (selectors.scenario) selectors.scenario.textContent = task.s ?? '—';
  if (selectors.dutyCard) {
    selectors.dutyCard.textContent = task.card ?? '—';
    selectors.dutyCard.removeAttribute('aria-disabled');
    selectors.dutyCard.draggable = true;
    selectors.dutyCard.setAttribute('aria-label', task.card ?? '');
  }
  setFeedback('');
  setHint('');
  clearRoleHighlights();
  if (selectors.next) selectors.next.disabled = true;
  updateProgress();
  window.requestAnimationFrame(() => {
    selectors.dutyCard?.focus({ preventScroll: true });
  });
}

function advance() {
  state.index += 1;
  if (state.index >= state.order.length) {
    handleComplete();
    return;
  }
  prepareTask();
}

function handleComplete() {
  state.started = false;
  state.readyForNext = false;
  disableRoles();
  if (selectors.dutyCard) {
    selectors.dutyCard.setAttribute('aria-disabled', 'true');
    selectors.dutyCard.draggable = false;
  }
  const message = state.strings.complete ?? 'Level complete!';
  const goal = state.score >= 80 ? state.strings.levelGoal ?? '' : '';
  const combined = goal ? `${message} ${goal}`.trim() : message;
  setFeedback(ensureTrailingPeriod(combined));
  setHint('');
  if (selectors.next) {
    selectors.next.disabled = true;
  }
  if (selectors.start) {
    selectors.start.disabled = false;
    selectors.start.focus({ preventScroll: true });
  }
  dispatchAnalytics('complete', {});
}

function startSession() {
  if (!state.tasks.length) return;
  state.order = shuffle(state.tasks);
  state.index = -1;
  state.started = true;
  state.readyForNext = false;
  if (selectors.next) selectors.next.disabled = true;
  if (selectors.start) selectors.start.disabled = true;
  dispatchAnalytics('start', {});
  advance();
}

function handleRoleActivation(event) {
  event.preventDefault();
  const roleId = event.currentTarget?.dataset?.roleId;
  if (!roleId) return;
  assignDuty(roleId);
}

function handleRoleKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleRoleActivation(event);
  }
}

function handleDragStart(event) {
  if (!state.started || state.readyForNext) {
    event.preventDefault();
    return;
  }
  event.dataTransfer?.setData('text/plain', 'duty-card');
  event.dataTransfer?.setDragImage?.(event.currentTarget, 20, 20);
}

function handleDragOver(event) {
  if (!state.started || state.readyForNext) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(event) {
  if (!state.started || state.readyForNext) return;
  event.preventDefault();
  event.currentTarget?.classList.add('dd-role--hover');
}

function handleDragLeave(event) {
  event.currentTarget?.classList.remove('dd-role--hover');
}

function handleDrop(event) {
  if (!state.started || state.readyForNext) return;
  event.preventDefault();
  const roleId = event.currentTarget?.dataset?.roleId;
  event.currentTarget?.classList.remove('dd-role--hover');
  if (!roleId) return;
  assignDuty(roleId);
}

function applyStrings(strings) {
  const merged = {
    ...strings,
    scoreLabel: strings?.score ?? 'Score',
    streakLabel: strings?.streak ?? 'Streak',
    hintLabel: strings?.hint ?? 'Hint',
    correct: strings?.correct ?? 'Correct!',
    wrong: strings?.wrong ?? 'Try again!',
    complete: strings?.level_complete ?? 'Level complete!',
    levelGoal: strings?.level_goal ?? 'Sasniedz 80 punktus!',
    progressLabel: strings?.progress_label ?? 'Uzdevums',
  };
  state.strings = merged;
  if (selectors.title && strings?.title) selectors.title.textContent = strings.title;
  if (selectors.instructions && strings?.instructions) selectors.instructions.textContent = strings.instructions;
  if (selectors.start && strings?.start) selectors.start.textContent = strings.start;
  if (selectors.next && strings?.next) selectors.next.textContent = strings.next;
  updateMetrics();
}

function renderRoles(roles) {
  if (!selectors.rolesGrid) return;
  selectors.rolesGrid.innerHTML = '';
  roles.forEach(role => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dd-role';
    button.dataset.roleId = role.id;
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-label', `${role.dative} — ${role.label}`);

    const avatarWrapper = document.createElement('span');
    avatarWrapper.className = 'dd-role__avatar';
    const img = document.createElement('img');
    img.src = asset(`assets/img/duty-dispatcher/${role.avatar}.svg`);
    img.alt = role.label;
    avatarWrapper.appendChild(img);

    const dative = document.createElement('span');
    dative.className = 'dd-role__dative';
    dative.textContent = role.dative;

    const duty = document.createElement('span');
    duty.className = 'dd-role__duty';
    duty.textContent = '';

    button.append(avatarWrapper, dative, duty);

    button.addEventListener('click', handleRoleActivation);
    button.addEventListener('keydown', handleRoleKeydown);
    button.addEventListener('dragover', handleDragOver);
    button.addEventListener('dragenter', handleDragEnter);
    button.addEventListener('dragleave', handleDragLeave);
    button.addEventListener('drop', handleDrop);

    selectors.rolesGrid.appendChild(button);
  });
}

async function loadStrings() {
  const lang = document.documentElement?.lang?.split('-')?.[0]?.toLowerCase() || 'lv';
  const fallback = lang === 'lv' ? ['lv', 'en'] : [lang, 'lv', 'en'];
  for (const code of fallback) {
    try {
      const data = await loadJSON(`i18n/${GAME_NAME}.${code}.json`);
      if (data) return data;
    } catch {
      // continue
    }
  }
  return {};
}

async function bootstrap() {
  selectors.start.disabled = true;
  selectors.next.disabled = true;
  if (selectors.dutyCard) {
    selectors.dutyCard.addEventListener('dragstart', handleDragStart);
  }
  if (selectors.start) {
    selectors.start.addEventListener('click', () => {
      startSession();
    });
  }
  if (selectors.next) {
    selectors.next.addEventListener('click', () => {
      if (!state.readyForNext) return;
      if (selectors.next) selectors.next.disabled = true;
      advance();
    });
  }

  const strings = await loadStrings();
  applyStrings(strings);

  const stored = readProgress();
  if (stored) {
    state.score = stored.xp ?? 0;
    state.streak = stored.streak ?? 0;
    updateMetrics();
  }

  const [roles, tasks] = await Promise.all([loadJSON(ROLES_PATH), loadJSON(TASKS_PATH)]);
  state.roles = Array.isArray(roles) ? roles : [];
  state.tasks = Array.isArray(tasks) ? tasks : [];
  renderRoles(state.roles);
  const hasTasks = state.tasks.length > 0;
  selectors.start.disabled = !hasTasks;
  if (!hasTasks) {
    setFeedback('Nav pieejamu uzdevumu.');
    return;
  }
  updateProgress();
}

bootstrap().catch(err => {
  console.error('Failed to initialize Duty Dispatcher', err);
  setFeedback('Neizdevās ielādēt datus.');
});
