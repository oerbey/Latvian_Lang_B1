const STORAGE_KEY = 'llb1:travel-tracker:progress';
const MAP_PATH = 'assets/img/travel-tracker/latvia.svg';
const DATA_PATH = 'data/travel-tracker/routes.json';
const BUS_ANIMATION_MS = 1100;

const selectors = {
  mapInner: document.getElementById('tt-map-inner'),
  bus: document.getElementById('tt-bus'),
  routeLayer: document.getElementById('tt-route'),
  gap: document.getElementById('tt-gap'),
  hint: document.getElementById('tt-hint'),
  feedback: document.getElementById('tt-feedback'),
  input: document.getElementById('tt-input'),
  check: document.getElementById('tt-check'),
  next: document.getElementById('tt-next'),
  start: document.getElementById('tt-start'),
  choices: document.getElementById('tt-choices'),
  score: document.getElementById('tt-score'),
  streak: document.getElementById('tt-streak'),
  level: document.getElementById('tt-level'),
  routeMeta: document.getElementById('tt-route-meta'),
  liveRegion: document.getElementById('tt-live'),
};

const state = {
  levels: [],
  levelIndex: 0,
  routeIndex: 0,
  score: 0,
  streak: 0,
  started: false,
  routeCompleted: false,
  inputLocked: true,
};

let strings = {};
let overlaySvg = null;
let viewBox = { width: 800, height: 500 };
let cityCoords = new Map();
let animationId = null;

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

async function loadJSON(path) {
  const res = await fetch(assetUrl(path), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

async function loadText(path) {
  const res = await fetch(assetUrl(path), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.text();
}

async function loadStrings(lang) {
  const langToTry = [lang, 'en'];
  for (const code of langToTry) {
    try {
      const data = await loadJSON(`i18n/travel-tracker.${code}.json`);
      if (data) {
        return { data, lang: code };
      }
    } catch (err) {
      console.warn(`Travel tracker strings unavailable for ${code}`, err);
    }
  }
  throw new Error('Travel tracker strings missing');
}

async function loadMap() {
  const markup = await loadText(MAP_PATH);
  selectors.mapInner.innerHTML = markup;
  const svg = selectors.mapInner.querySelector('svg');
  if (!svg) {
    throw new Error('Latvia SVG missing');
  }
  if (svg.hasAttribute('viewBox')) {
    const [x, y, w, h] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    viewBox = { width: w, height: h };
  } else {
    const w = Number(svg.getAttribute('width') || 800);
    const h = Number(svg.getAttribute('height') || 500);
    viewBox = { width: w, height: h };
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  cityCoords = new Map();
  svg.querySelectorAll('[data-city]').forEach(node => {
    const name = node.getAttribute('data-city');
    const cx = Number(node.getAttribute('cx') || node.getAttribute('x'));
    const cy = Number(node.getAttribute('cy') || node.getAttribute('y'));
    if (name && Number.isFinite(cx) && Number.isFinite(cy)) {
      cityCoords.set(name.trim(), { x: cx, y: cy });
    }
  });
  overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlaySvg.setAttribute('viewBox', `0 0 ${viewBox.width} ${viewBox.height}`);
  overlaySvg.setAttribute('aria-hidden', 'true');
  overlaySvg.setAttribute('focusable', 'false');
  selectors.routeLayer.innerHTML = '';
  selectors.routeLayer.appendChild(overlaySvg);
  selectors.bus.classList.add('travel-map__bus--hidden');
}

function applyStrings() {
  const title = document.querySelector('[data-i18n-key="title"]');
  if (title && strings.title) title.textContent = strings.title;

  document.querySelectorAll('[data-i18n-key="instructions"]').forEach(node => {
    if (strings.instructions) node.textContent = strings.instructions;
  });

  const prompt = document.querySelector('[data-i18n-key="prompt"]');
  if (prompt && strings.prompt) prompt.textContent = strings.prompt;

  const hintLabel = document.querySelector('[data-i18n-key="hint"]');
  if (hintLabel && strings.hint) hintLabel.textContent = strings.hint;

  const scoreLabel = selectors.score?.querySelector('[data-i18n-key="score"]');
  if (scoreLabel && strings.score) scoreLabel.textContent = strings.score;

  const streakLabel = selectors.streak?.querySelector('[data-i18n-key="streak"]');
  if (streakLabel && strings.streak) streakLabel.textContent = strings.streak;

  selectors.check.textContent = strings.check ?? selectors.check.textContent;
  selectors.next.textContent = strings.next ?? selectors.next.textContent;
  selectors.start.textContent = state.started ? strings.restart : (strings.start ?? selectors.start.textContent);
}

function normalizeAnswer(str) {
  return str.trim().toLocaleLowerCase('lv-LV');
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function moveBusTo(point) {
  if (!point) return;
  const { x, y } = point;
  selectors.bus.style.left = `${(x / viewBox.width) * 100}%`;
  selectors.bus.style.top = `${(y / viewBox.height) * 100}%`;
  selectors.bus.classList.remove('travel-map__bus--hidden');
}

function cancelAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function animateBus(from, to, onComplete) {
  cancelAnimation();
  const start = performance.now();
  const step = now => {
    const elapsed = Math.min(1, (now - start) / BUS_ANIMATION_MS);
    const eased = elapsed < 0.5 ? 2 * elapsed * elapsed : -1 + (4 - 2 * elapsed) * elapsed;
    const x = from.x + (to.x - from.x) * eased;
    const y = from.y + (to.y - from.y) * eased;
    moveBusTo({ x, y });
    if (elapsed < 1) {
      animationId = requestAnimationFrame(step);
    } else {
      animationId = null;
      if (onComplete) onComplete();
    }
  };
  animationId = requestAnimationFrame(step);
}

function drawRouteLine(from, to, { completed } = { completed: false }) {
  if (!overlaySvg) return;
  overlaySvg.innerHTML = '';
  if (!from || !to) return;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', from.x);
  line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x);
  line.setAttribute('y2', to.y);
  line.setAttribute('stroke', completed ? '#0f766e' : '#2563eb');
  line.setAttribute('stroke-width', completed ? '6' : '4');
  line.setAttribute('stroke-linecap', 'round');
  if (!completed) {
    line.setAttribute('stroke-dasharray', '10 10');
  }
  overlaySvg.appendChild(line);
}

function updateScoreboard() {
  const scoreValue = selectors.score.querySelector('strong');
  const streakValue = selectors.streak.querySelector('strong');
  if (scoreValue) scoreValue.textContent = state.score.toString();
  if (streakValue) streakValue.textContent = state.streak.toString();
  const levelBadge = selectors.level;
  const level = state.levels[state.levelIndex];
  if (levelBadge && level) {
    levelBadge.innerHTML = `${strings.level} <strong>${state.levelIndex + 1}/${state.levels.length}</strong>`;
  }
}

function getCurrentLevel() {
  return state.levels[state.levelIndex] ?? null;
}

function getCurrentRoute() {
  const level = getCurrentLevel();
  if (!level) return null;
  return level.routes[state.routeIndex] ?? null;
}

function updateRouteMeta() {
  const level = getCurrentLevel();
  const route = getCurrentRoute();
  if (!level || !route) {
    selectors.routeMeta.textContent = '—';
    return;
  }
  selectors.routeMeta.textContent = `${level.title} • ${route.from} → ${route.to}`;
}

function clearFeedback() {
  selectors.feedback.textContent = '';
  selectors.feedback.classList.remove('is-correct', 'is-wrong');
  updateLive('');
}

function setHint(text) {
  selectors.hint.textContent = text ?? '—';
}

function updateChoices(route) {
  selectors.choices.innerHTML = '';
  if (!route) return;
  const options = new Set([...(route.answers ?? []), ...(route.distractors ?? [])]);
  if (options.size === 0) return;
  shuffle([...options]).forEach(option => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary btn-sm text-start';
    btn.dataset.value = option;
    btn.textContent = option;
    btn.addEventListener('click', () => {
      selectors.input.value = option;
      selectors.input.focus();
    });
    selectors.choices.appendChild(btn);
  });
}

function dispatchTrack(event, meta = {}) {
  const detail = { game: 'travel-tracker', event, meta };
  window.dispatchEvent(new CustomEvent('llb1:track', { detail }));
}

function updateControls() {
  selectors.input.disabled = !state.started || state.inputLocked;
  selectors.check.disabled = !state.started || state.inputLocked;
  selectors.next.disabled = !state.started || !state.routeCompleted;
  selectors.start.textContent = state.started ? strings.restart : strings.start;
}

function updateLive(message) {
  if (!message) {
    selectors.liveRegion.textContent = '';
    selectors.feedback.removeAttribute('aria-label');
    return;
  }
  selectors.liveRegion.textContent = message;
  selectors.feedback.setAttribute('aria-label', message);
}

function saveProgress(overrides = {}) {
  const payload = {
    levelIndex: state.levelIndex,
    routeIndex: state.routeIndex,
    score: state.score,
    streak: state.streak,
    started: state.started,
    ...overrides,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to persist travel tracker progress', err);
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return;
    const maxLevel = Math.max(0, state.levels.length - 1);
    if (Number.isInteger(data.levelIndex)) {
      state.levelIndex = Math.min(maxLevel, Math.max(0, data.levelIndex));
    }
    const level = getCurrentLevel();
    const maxRoute = Math.max(0, (level?.routes.length ?? 1) - 1);
    if (Number.isInteger(data.routeIndex)) {
      state.routeIndex = Math.min(maxRoute, Math.max(0, data.routeIndex));
    }
    if (Number.isInteger(data.score)) state.score = data.score;
    if (Number.isInteger(data.streak)) state.streak = data.streak;
    if (typeof data.started === 'boolean') state.started = data.started;
  } catch (err) {
    console.warn('Failed to restore travel tracker progress', err);
  }
}

function resetState() {
  state.levelIndex = 0;
  state.routeIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.routeCompleted = false;
  state.inputLocked = false;
  state.started = true;
  saveProgress();
  dispatchTrack('start', { levelId: getCurrentLevel()?.id ?? null, restart: true });
}

function presentCurrentRoute() {
  const route = getCurrentRoute();
  clearFeedback();
  setHint('—');
  updateChoices(route);
  selectors.input.value = '';
  state.routeCompleted = false;
  state.inputLocked = !state.started;
  updateControls();
  updateScoreboard();
  updateRouteMeta();
  if (!route) return;
  selectors.gap.textContent = route.gap;
  const from = cityCoords.get(route.from);
  const to = cityCoords.get(route.to);
  if (from) {
    moveBusTo(from);
  }
  drawRouteLine(from, to);
}

function computeNextPosition() {
  const level = getCurrentLevel();
  if (!level) return { levelIndex: 0, routeIndex: 0 };
  if (state.routeIndex + 1 < level.routes.length) {
    return { levelIndex: state.levelIndex, routeIndex: state.routeIndex + 1 };
  }
  const nextLevelIndex = (state.levelIndex + 1) % state.levels.length;
  return { levelIndex: nextLevelIndex, routeIndex: 0 };
}

function showCorrect(route) {
  selectors.feedback.textContent = strings.correct;
  selectors.feedback.classList.remove('is-wrong');
  selectors.feedback.classList.add('is-correct');
  updateLive(strings.correct);
  if (route?.explain) {
    setHint(route.explain);
  }
}

function showWrong(route) {
  selectors.feedback.textContent = strings.wrong;
  selectors.feedback.classList.remove('is-correct');
  selectors.feedback.classList.add('is-wrong');
  updateLive(strings.wrong);
  if (route?.hint) {
    setHint(route.hint);
  }
}

function onCorrect(route) {
  state.score += 10;
  state.streak += 1;
  state.routeCompleted = true;
  state.inputLocked = true;
  updateScoreboard();
  showCorrect(route);
  const from = cityCoords.get(route.from);
  const to = cityCoords.get(route.to);
  drawRouteLine(from, to, { completed: true });
  if (from && to) {
    animateBus(from, to, () => {});
  }
  updateControls();
  const nextPos = computeNextPosition();
  saveProgress({
    levelIndex: nextPos.levelIndex,
    routeIndex: nextPos.routeIndex,
    score: state.score,
    streak: state.streak,
    started: state.started,
  });
  dispatchTrack('correct', {
    levelId: getCurrentLevel()?.id ?? null,
    from: route.from,
    to: route.to,
  });
}

function onWrong(route) {
  state.streak = 0;
  updateScoreboard();
  showWrong(route);
  state.routeCompleted = false;
  state.inputLocked = false;
  updateControls();
  saveProgress();
  dispatchTrack('wrong', {
    levelId: getCurrentLevel()?.id ?? null,
    from: route.from,
    to: route.to,
  });
}

function handleCheck() {
  if (!state.started || state.inputLocked) return;
  const route = getCurrentRoute();
  if (!route) return;
  const guess = selectors.input.value;
  if (!guess || normalizeAnswer(guess) === '') {
    selectors.feedback.textContent = strings.enterAnswer;
    updateLive(strings.enterAnswer);
    return;
  }
  const normalizedGuess = normalizeAnswer(guess);
  const isCorrect = (route.answers || []).some(ans => normalizeAnswer(ans) === normalizedGuess);
  if (isCorrect) {
    onCorrect(route);
  } else {
    onWrong(route);
  }
}

function advanceRoute() {
  if (!state.started) return;
  const level = getCurrentLevel();
  if (!level) return;
  const completedLevel = state.routeIndex + 1 >= level.routes.length;
  if (completedLevel) {
    dispatchTrack('levelComplete', {
      levelId: level.id,
      title: level.title,
    });
  }
  if (completedLevel) {
    state.levelIndex = (state.levelIndex + 1) % state.levels.length;
    state.routeIndex = 0;
  } else {
    state.routeIndex += 1;
  }
  state.routeCompleted = false;
  state.inputLocked = false;
  saveProgress();
  presentCurrentRoute();
  if (completedLevel && strings.level_complete) {
    selectors.feedback.textContent = strings.level_complete;
    selectors.feedback.classList.remove('is-correct', 'is-wrong');
    updateLive(strings.level_complete);
  }
  updateControls();
}

function handleStart() {
  if (!state.started) {
    state.started = true;
    state.inputLocked = false;
    updateControls();
    dispatchTrack('start', { levelId: getCurrentLevel()?.id ?? null });
  } else {
    resetState();
  }
  presentCurrentRoute();
  updateControls();
  saveProgress();
}

function bindEvents() {
  selectors.check.addEventListener('click', handleCheck);
  selectors.start.addEventListener('click', handleStart);
  selectors.next.addEventListener('click', () => {
    if (!state.routeCompleted) return;
    advanceRoute();
  });
  selectors.input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCheck();
    }
  });
}

async function init() {
  try {
    const lang = document.documentElement.lang || 'lv';
    const [{ data: loadedStrings }, routes] = await Promise.all([
      loadStrings(lang),
      loadJSON(DATA_PATH),
    ]);
    strings = {
      ...loadedStrings,
      restart: loadedStrings.restart ?? loadedStrings.start,
      level: loadedStrings.level ?? 'Level',
      enterAnswer: loadedStrings.enterAnswer ?? 'Ievadi atbildi.',
    };
    applyStrings();
    selectors.check.textContent = strings.check;
    selectors.next.textContent = strings.next;
    selectors.start.textContent = strings.start;
    document.querySelectorAll('[data-i18n-key="instructions"]').forEach(node => {
      node.textContent = strings.instructions;
    });

    state.levels = routes.levels ?? [];
    await loadMap();
    bindEvents();
    loadProgress();
    state.inputLocked = !state.started;
    presentCurrentRoute();
    updateControls();
    updateScoreboard();
  } catch (err) {
    console.error('Failed to boot Travel Tracker', err);
    selectors.feedback.textContent = 'Failed to load Travel Tracker.';
  }
}

init();
