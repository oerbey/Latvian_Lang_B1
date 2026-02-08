import { mustId } from '../../lib/dom.js';
import { showFatalError } from '../../lib/errors.js';
import { assetUrl } from '../../lib/paths.js';
import { clamp, shuffle } from '../../lib/utils.js';
import { buildRound, normalizeLvEnUnits } from './logic.js';

const UNIT_INDEX_PATH = 'data/lv-en/units.json';
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const PLAYER_WIDTH = 150;
const PLAYER_HEIGHT = 22;
const PLAYER_Y = CANVAS_HEIGHT - 62;
const PLAYER_SPEED = 430;
const CARD_WIDTH = 260;
const CARD_HEIGHT = 84;
const CARD_BASE_SPEED = 104;
const ROUND_DELAY_SECONDS = 0.52;
const INITIAL_LIVES = 3;
const OPTION_COUNT = 3;
const STEP_MS = 1000 / 60;
const HUD_Y = 20;
const HUD_HEIGHT = 70;
const PLAYFIELD_TOP = HUD_Y + HUD_HEIGHT + 18;
const FLOOR_HEIGHT = 112;
const CARD_MIN_X = 12;
const CARD_MAX_SCALE = 1.04;

const elements = {
  canvas: /** @type {HTMLCanvasElement} */ (mustId('lv-en-arcade-canvas')),
  mode: mustId('arcade-mode'),
  score: mustId('arcade-score'),
  streak: mustId('arcade-streak'),
  lives: mustId('arcade-lives'),
  round: mustId('arcade-round'),
  message: mustId('arcade-message'),
  startButton: /** @type {HTMLButtonElement} */ (mustId('start-btn')),
  restartButton: /** @type {HTMLButtonElement} */ (mustId('restart-btn')),
  leftTouchButton: /** @type {HTMLButtonElement} */ (mustId('arcade-left')),
  rightTouchButton: /** @type {HTMLButtonElement} */ (mustId('arcade-right')),
  liveRegion: mustId('arcade-live'),
  canvasWrap: mustId('arcade-canvas-wrap'),
};

const context = elements.canvas.getContext('2d');
if (!context) {
  throw new Error('2D context is not available for #lv-en-arcade-canvas');
}

const state = {
  mode: 'loading',
  entries:
    /** @type {Array<{id: string, en: string, lv: string, unit: string, tags: string[]}>} */ ([]),
  deck: /** @type {Array<{id: string, en: string, lv: string, unit: string, tags: string[]}>} */ ([]),
  deckCursor: 0,
  prompt: /** @type {{id: string, en: string, lv: string, unit: string, tags: string[]} | null} */ (
    null
  ),
  cards:
    /** @type {Array<{id: string, entryId: string, lv: string, isCorrect: boolean, x: number, y: number, width: number, height: number, speedY: number, driftX: number}>} */ ([]),
  input: {
    left: false,
    right: false,
  },
  touchControl: {
    active: false,
    pointerId: null,
    targetX: null,
  },
  player: {
    x: (CANVAS_WIDTH - PLAYER_WIDTH) / 2,
    y: PLAYER_Y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityX: 0,
  },
  round: 0,
  score: 0,
  streak: 0,
  bestStreak: 0,
  lives: INITIAL_LIVES,
  transitionSeconds: 0,
  message: 'Loading vocabulary...',
  messageTone: 'info',
  isFullscreen: false,
  useExternalClock: false,
  lastTimestamp: 0,
  cardIdCounter: 0,
};

function announce(text) {
  elements.liveRegion.textContent = '';
  requestAnimationFrame(() => {
    elements.liveRegion.textContent = text;
  });
}

function setMessage(text, tone = 'info') {
  state.message = text;
  state.messageTone = tone;
  elements.message.textContent = text;
  elements.message.dataset.tone = tone;
  announce(text);
}

function modeLabel() {
  switch (state.mode) {
    case 'loading':
      return 'Loading';
    case 'menu':
      return 'Ready';
    case 'play':
      return 'Playing';
    case 'transition':
      return 'Next round';
    case 'gameover':
      return 'Game over';
    case 'error':
      return 'Error';
    default:
      return state.mode;
  }
}

function updateHud() {
  elements.mode.textContent = modeLabel();
  elements.score.textContent = String(state.score);
  elements.streak.textContent = String(state.streak);
  elements.lives.textContent = String(state.lives);
  elements.round.textContent = String(state.round);

  if (state.mode === 'loading') {
    elements.startButton.disabled = true;
    elements.restartButton.disabled = true;
    elements.startButton.textContent = 'Loading...';
  } else if (state.mode === 'menu') {
    elements.startButton.disabled = false;
    elements.restartButton.disabled = true;
    elements.startButton.textContent = 'Start round';
  } else if (state.mode === 'gameover') {
    elements.startButton.disabled = false;
    elements.restartButton.disabled = false;
    elements.startButton.textContent = 'Play again';
  } else if (state.mode === 'error') {
    elements.startButton.disabled = true;
    elements.restartButton.disabled = true;
    elements.startButton.textContent = 'Unavailable';
  } else {
    elements.startButton.disabled = true;
    elements.restartButton.disabled = false;
    elements.startButton.textContent = 'Playing...';
  }
}

async function fetchJson(pathname) {
  const response = await fetch(assetUrl(pathname), { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${pathname}: ${response.status}`);
  }
  return response.json();
}

async function loadVocabulary() {
  const index = await fetchJson(UNIT_INDEX_PATH);
  const units = Array.isArray(index?.units) ? index.units : [];
  if (!units.length) {
    throw new Error('Vocabulary index is empty.');
  }

  const payloads = await Promise.all(
    units.map(async (unit) => {
      const unitFile = typeof unit?.file === 'string' ? unit.file.trim() : '';
      if (!unitFile) return null;
      return fetchJson(`data/lv-en/${unitFile}`);
    }),
  );

  const entries = normalizeLvEnUnits(payloads.filter(Boolean));
  if (entries.length < OPTION_COUNT + 2) {
    throw new Error('Not enough English-Latvian pairs for gameplay.');
  }
  return entries;
}

function nextPrompt() {
  if (!state.entries.length) return null;
  if (!state.deck.length || state.deckCursor >= state.deck.length) {
    state.deck = shuffle(state.entries);
    state.deckCursor = 0;
  }
  const prompt = state.deck[state.deckCursor] || null;
  state.deckCursor += 1;
  return prompt;
}

function makeCards(options) {
  const laneCount = Math.max(options.length, 1);
  const laneSpacing = CANVAS_WIDTH / (laneCount + 1);
  const laneCenters = shuffle(
    Array.from({ length: laneCount }, (_, idx) => laneSpacing * (idx + 1)),
  );
  const spawnTop = PLAYFIELD_TOP - CARD_HEIGHT - 16;

  return options.map((option, idx) => {
    const laneCenter = laneCenters[idx] ?? laneSpacing * (idx + 1);
    const jitter = Math.random() * 96 - 48;
    const staggerY = Math.random() * 96 + idx * 24;
    const speedVariance = Math.random() * 26 - 8;
    const driftX = Math.random() * 48 - 24;

    return {
      id: `card-${state.cardIdCounter++}`,
      entryId: option.entryId,
      lv: option.lv,
      isCorrect: Boolean(option.isCorrect),
      x: clamp(
        laneCenter - CARD_WIDTH / 2 + jitter,
        CARD_MIN_X,
        CANVAS_WIDTH - CARD_WIDTH - CARD_MIN_X,
      ),
      y: spawnTop - staggerY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      speedY: Math.max(84, CARD_BASE_SPEED + state.round * 2.4 + speedVariance),
      driftX,
    };
  });
}

function beginRound() {
  const prompt = nextPrompt();
  if (!prompt) {
    state.mode = 'error';
    setMessage('Could not create a new prompt.', 'error');
    updateHud();
    return;
  }

  const round = buildRound(prompt, state.entries, Math.random, OPTION_COUNT);
  state.prompt = round.prompt;
  state.cards = makeCards(round.options);
  state.mode = 'play';
  updateHud();
}

function queueNextRound(message, tone) {
  if (state.lives <= 0) {
    state.mode = 'gameover';
    state.prompt = null;
    state.cards = [];
    state.player.velocityX = 0;
    setMessage(`${message} Final score: ${state.score}. Press Play again.`, tone);
    updateHud();
    return;
  }

  state.mode = 'transition';
  state.transitionSeconds = ROUND_DELAY_SECONDS;
  state.cards = [];
  setMessage(message, tone);
  updateHud();
}

function resolveCatch(card) {
  if (card.isCorrect) {
    const bonus = Math.min(20, state.streak * 2);
    state.score += 10 + bonus;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.round += 1;
    queueNextRound('Correct! New prompt incoming.', 'success');
    return;
  }

  state.streak = 0;
  state.lives -= 1;
  state.round += 1;
  queueNextRound('Wrong Latvian word. You lost a life.', 'error');
}

function resolveMiss() {
  state.streak = 0;
  state.lives -= 1;
  state.round += 1;
  queueNextRound('Missed the correct word. You lost a life.', 'warning');
}

function startGame() {
  if (!state.entries.length) return;
  state.mode = 'transition';
  state.round = 0;
  state.score = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.lives = INITIAL_LIVES;
  state.cards = [];
  state.prompt = null;
  state.transitionSeconds = 0.2;
  state.player.x = (CANVAS_WIDTH - PLAYER_WIDTH) / 2;
  state.player.velocityX = 0;
  state.touchControl.active = false;
  state.touchControl.pointerId = null;
  state.touchControl.targetX = null;
  state.deck = shuffle(state.entries);
  state.deckCursor = 0;
  setMessage('Catch the matching Latvian translation.', 'info');
  updateHud();
}

function intersects(a, b) {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

function updatePlay(deltaSeconds) {
  if (state.touchControl.active && typeof state.touchControl.targetX === 'number') {
    const desired = clamp(state.touchControl.targetX, 0, CANVAS_WIDTH - state.player.width);
    const delta = desired - state.player.x;
    state.player.velocityX = clamp(delta * 10, -PLAYER_SPEED * 1.25, PLAYER_SPEED * 1.25);
    state.player.x = clamp(
      state.player.x + state.player.velocityX * deltaSeconds,
      0,
      CANVAS_WIDTH - state.player.width,
    );
  } else {
    const direction = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
    state.player.velocityX = direction * PLAYER_SPEED;
    state.player.x = clamp(
      state.player.x + state.player.velocityX * deltaSeconds,
      0,
      CANVAS_WIDTH - state.player.width,
    );
  }

  const playerBox = {
    x: state.player.x,
    y: state.player.y,
    width: state.player.width,
    height: state.player.height,
  };

  for (const card of state.cards) {
    card.y += card.speedY * deltaSeconds;
    const rightEdge = CANVAS_WIDTH - card.width - CARD_MIN_X;
    card.x = clamp(card.x + card.driftX * deltaSeconds, CARD_MIN_X, rightEdge);
    if (card.x <= CARD_MIN_X + 0.5 || card.x >= rightEdge - 0.5) {
      card.driftX *= -1;
    }
  }

  for (const card of state.cards) {
    if (intersects(playerBox, card)) {
      resolveCatch(card);
      return;
    }
  }

  const missedCorrect = state.cards.some(
    (card) => card.isCorrect && card.y > CANVAS_HEIGHT + card.height,
  );
  if (missedCorrect) {
    resolveMiss();
    return;
  }

  state.cards = state.cards.filter((card) => card.y <= CANVAS_HEIGHT + card.height + 16);
}

function update(deltaSeconds) {
  if (state.mode === 'play') {
    updatePlay(deltaSeconds);
    return;
  }

  state.player.velocityX = 0;

  if (state.mode === 'transition') {
    state.transitionSeconds -= deltaSeconds;
    if (state.transitionSeconds <= 0) {
      beginRound();
    }
  }
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTextCenter(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '')
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (current) {
    let clipped = current;
    if (lines.length === maxLines - 1) {
      while (ctx.measureText(`${clipped}...`).width > maxWidth && clipped.length > 1) {
        clipped = clipped.slice(0, -1);
      }
      lines.push(`${clipped}...`);
    } else {
      lines.push(clipped);
    }
  }

  const visibleLines = lines.slice(0, maxLines);
  const startY = y - ((visibleLines.length - 1) * lineHeight) / 2;
  visibleLines.forEach((line, idx) => {
    ctx.fillText(line, x, startY + idx * lineHeight);
  });
}

function drawBackground() {
  const gradient = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#0d2032');
  gradient.addColorStop(1, '#132d45');
  context.fillStyle = gradient;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(180, 222, 255, 0.2)';
  for (let i = 0; i < 7; i += 1) {
    const x = 80 + i * 130;
    const y = PLAYFIELD_TOP - 34 + (i % 2) * 24;
    context.beginPath();
    context.arc(x, y, 20 + (i % 3) * 6, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = '#205071';
  context.fillRect(0, CANVAS_HEIGHT - FLOOR_HEIGHT, CANVAS_WIDTH, FLOOR_HEIGHT);

  context.strokeStyle = 'rgba(137, 191, 229, 0.22)';
  context.lineWidth = 2;
  for (let i = 1; i <= 3; i += 1) {
    const x = (CANVAS_WIDTH / 4) * i;
    context.beginPath();
    context.moveTo(x, PLAYFIELD_TOP - 8);
    context.lineTo(x, CANVAS_HEIGHT - FLOOR_HEIGHT);
    context.stroke();
  }
}

function drawHudOverlay() {
  drawRoundedRect(context, 24, HUD_Y, CANVAS_WIDTH - 48, HUD_HEIGHT, 20);
  context.fillStyle = 'rgba(6, 18, 30, 0.68)';
  context.fill();
  context.strokeStyle = 'rgba(142, 206, 255, 0.45)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#dff2ff';
  context.font = '600 16px "Source Sans 3", sans-serif';
  const prompt = state.prompt?.en || 'Press Start to begin.';
  context.fillText(`EN prompt: ${prompt}`, 42, 48);

  context.fillStyle = '#9ed7ff';
  context.font = '600 14px "Source Sans 3", sans-serif';
  context.fillText(
    `Score ${state.score}  •  Lives ${state.lives}  •  Streak ${state.streak}`,
    42,
    72,
  );
}

function drawCards() {
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (const card of state.cards) {
    const fontSize = card.lv.length > 22 ? 18 : 20;
    drawRoundedRect(context, card.x, card.y, card.width, card.height, 16);
    context.fillStyle = 'rgba(240, 250, 255, 0.95)';
    context.fill();
    context.strokeStyle = 'rgba(37, 82, 121, 0.62)';
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = '#11314a';
    context.font = `700 ${fontSize}px "Source Sans 3", sans-serif`;
    drawTextCenter(
      context,
      card.lv,
      card.x + card.width / 2,
      card.y + card.height / 2,
      card.width - 20,
      fontSize + 2,
      3,
    );
  }

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
}

function drawPlayer() {
  drawRoundedRect(
    context,
    state.player.x,
    state.player.y,
    state.player.width,
    state.player.height,
    12,
  );
  context.fillStyle = '#ffe083';
  context.fill();
  context.strokeStyle = '#b88711';
  context.lineWidth = 2;
  context.stroke();

  drawRoundedRect(
    context,
    state.player.x + 18,
    state.player.y - 16,
    state.player.width - 36,
    16,
    8,
  );
  context.fillStyle = '#f8c547';
  context.fill();
  context.strokeStyle = '#b88711';
  context.stroke();
}

function drawCenterMessage(title, subtitle) {
  drawRoundedRect(context, 170, 168, CANVAS_WIDTH - 340, 214, 24);
  context.fillStyle = 'rgba(5, 16, 30, 0.86)';
  context.fill();
  context.strokeStyle = 'rgba(145, 210, 255, 0.6)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = '#f0f8ff';
  context.textAlign = 'center';
  context.font = '700 40px "Source Serif 4", serif';
  context.fillText(title, CANVAS_WIDTH / 2, 228);

  context.fillStyle = '#b6e0ff';
  context.font = '600 22px "Source Sans 3", sans-serif';
  drawTextCenter(context, subtitle, CANVAS_WIDTH / 2, 286, CANVAS_WIDTH - 430, 30, 3);

  context.fillStyle = '#8bc8ef';
  context.font = '600 16px "Source Sans 3", sans-serif';
  context.fillText(
    'Controls: Left/Right or A/D, drag on touch, F fullscreen, Space to start/restart.',
    CANVAS_WIDTH / 2,
    344,
  );

  context.textAlign = 'left';
}

function render() {
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawBackground();

  if (state.mode === 'play' || state.mode === 'transition') {
    context.save();
    context.beginPath();
    context.rect(0, PLAYFIELD_TOP, CANVAS_WIDTH, CANVAS_HEIGHT - PLAYFIELD_TOP);
    context.clip();

    drawCards();
    drawPlayer();

    if (state.mode === 'transition') {
      context.fillStyle = 'rgba(5, 16, 30, 0.4)';
      context.fillRect(0, PLAYFIELD_TOP, CANVAS_WIDTH, CANVAS_HEIGHT - PLAYFIELD_TOP);

      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.font = '700 34px "Source Serif 4", serif';
      context.fillText('Next prompt...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      context.textAlign = 'left';
    }

    context.restore();
  }

  drawHudOverlay();

  if (state.mode === 'menu' || state.mode === 'loading') {
    drawCenterMessage(
      'Word Catcher',
      `Catch the Latvian phrase that matches the English prompt. ${state.entries.length} prompts loaded.`,
    );
    return;
  }

  if (state.mode === 'gameover') {
    drawCenterMessage(
      'Round Complete',
      `Final score ${state.score}. Best streak ${state.bestStreak}. Press Play again.`,
    );
    return;
  }

  if (state.mode === 'error') {
    drawCenterMessage(
      'Data Error',
      'Could not load vocabulary data. Reload the page to try again.',
    );
  }
}

function resizeCanvasDisplay() {
  const wrapStyles = getComputedStyle(elements.canvasWrap);
  const paddingX =
    Number.parseFloat(wrapStyles.paddingLeft || '0') +
    Number.parseFloat(wrapStyles.paddingRight || '0');

  const wrapWidth = Math.max(
    320,
    Math.floor(
      (state.isFullscreen ? window.innerWidth : elements.canvasWrap.clientWidth) - paddingX,
    ),
  );

  const viewportHeightCap = state.isFullscreen
    ? window.innerHeight - 24
    : Math.max(240, Math.floor(window.innerHeight * 0.58));
  const naturalHeight = Math.floor((wrapWidth * CANVAS_HEIGHT) / CANVAS_WIDTH);
  const wrapHeight = Math.min(naturalHeight, viewportHeightCap);
  const safeHeight = Math.max(220, wrapHeight);
  const scale = Math.min(wrapWidth / CANVAS_WIDTH, safeHeight / CANVAS_HEIGHT, CARD_MAX_SCALE);

  const displayWidth = Math.floor(CANVAS_WIDTH * scale);
  const displayHeight = Math.floor(CANVAS_HEIGHT * scale);

  elements.canvas.style.width = `${displayWidth}px`;
  elements.canvas.style.height = `${displayHeight}px`;
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await elements.canvasWrap.requestFullscreen();
    }
  } catch (error) {
    console.warn('Fullscreen toggle failed', error);
  }
}

function clientXToWorldX(clientX) {
  const rect = elements.canvas.getBoundingClientRect();
  if (!rect.width) return CANVAS_WIDTH / 2;
  const ratioX = (clientX - rect.left) / rect.width;
  return clamp(ratioX * CANVAS_WIDTH, 0, CANVAS_WIDTH);
}

function updateTouchTarget(clientX) {
  const worldX = clientXToWorldX(clientX);
  state.touchControl.targetX = clamp(
    worldX - state.player.width / 2,
    0,
    CANVAS_WIDTH - state.player.width,
  );
  state.player.x = state.touchControl.targetX;
  state.player.velocityX = 0;
}

function beginTouchControl(pointerId, clientX) {
  state.touchControl.active = true;
  state.touchControl.pointerId = pointerId;
  updateTouchTarget(clientX);
}

function endTouchControl(pointerId = null) {
  if (pointerId !== null && state.touchControl.pointerId !== pointerId) {
    return;
  }
  state.touchControl.active = false;
  state.touchControl.pointerId = null;
  state.touchControl.targetX = null;
  state.player.velocityX = 0;
}

function stepWithExternalClock(ms) {
  state.useExternalClock = true;
  const totalMs = Math.max(0, Number.isFinite(ms) ? ms : 0);
  const steps = Math.max(1, Math.round(totalMs / STEP_MS));
  const deltaMs = totalMs > 0 ? totalMs / steps : STEP_MS;
  for (let i = 0; i < steps; i += 1) {
    update(deltaMs / 1000);
  }
  render();
}

function renderGameToText() {
  const payload = {
    mode: state.mode,
    coordinateSystem: 'origin=(0,0) top-left; +x right; +y down; units=pixels',
    canvas: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    },
    prompt: state.prompt
      ? {
          en: state.prompt.en,
          correctLv: state.prompt.lv,
          unit: state.prompt.unit,
        }
      : null,
    score: {
      points: state.score,
      streak: state.streak,
      bestStreak: state.bestStreak,
      lives: state.lives,
      round: state.round,
    },
    player: {
      x: Number(state.player.x.toFixed(2)),
      y: Number(state.player.y.toFixed(2)),
      width: state.player.width,
      height: state.player.height,
      velocityX: Number(state.player.velocityX.toFixed(2)),
    },
    cards: state.cards.map((card) => ({
      id: card.id,
      lv: card.lv,
      isCorrect: card.isCorrect,
      x: Number(card.x.toFixed(2)),
      y: Number(card.y.toFixed(2)),
      width: card.width,
      height: card.height,
      speedY: Number(card.speedY.toFixed(2)),
    })),
    controls: {
      leftPressed: state.input.left,
      rightPressed: state.input.right,
      touchActive: state.touchControl.active,
      touchTargetX:
        typeof state.touchControl.targetX === 'number'
          ? Number(state.touchControl.targetX.toFixed(2))
          : null,
      fullscreen: state.isFullscreen,
    },
    message: state.message,
  };

  return JSON.stringify(payload);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (key === 'arrowleft' || key === 'a') {
    state.input.left = true;
    event.preventDefault();
  }

  if (key === 'arrowright' || key === 'd') {
    state.input.right = true;
    event.preventDefault();
  }

  if (key === ' ' || key === 'spacebar' || key === 'enter') {
    if (state.mode === 'menu' || state.mode === 'gameover') {
      startGame();
    }
    event.preventDefault();
  }

  if (key === 'f') {
    toggleFullscreen();
    event.preventDefault();
  }

  if (
    key === 'r' &&
    (state.mode === 'play' || state.mode === 'transition' || state.mode === 'gameover')
  ) {
    startGame();
    event.preventDefault();
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === 'arrowleft' || key === 'a') {
    state.input.left = false;
  }
  if (key === 'arrowright' || key === 'd') {
    state.input.right = false;
  }
}

function loop(timestamp) {
  if (!state.lastTimestamp) {
    state.lastTimestamp = timestamp;
  }

  const deltaSeconds = Math.min(0.05, (timestamp - state.lastTimestamp) / 1000);
  state.lastTimestamp = timestamp;

  if (!state.useExternalClock) {
    update(deltaSeconds);
  }
  render();
  requestAnimationFrame(loop);
}

function bindEvents() {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  elements.startButton.addEventListener('click', () => {
    if (state.mode === 'menu' || state.mode === 'gameover') {
      startGame();
    }
  });

  elements.restartButton.addEventListener('click', () => {
    if (state.mode === 'play' || state.mode === 'transition' || state.mode === 'gameover') {
      startGame();
    }
  });

  elements.canvas.addEventListener('click', () => {
    if (state.mode === 'menu' || state.mode === 'gameover') {
      startGame();
    }
  });

  elements.canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    if (state.mode === 'menu' || state.mode === 'gameover') {
      startGame();
    }
    beginTouchControl(event.pointerId, event.clientX);
    if (elements.canvas.setPointerCapture) {
      try {
        elements.canvas.setPointerCapture(event.pointerId);
      } catch {
        // Some engines reject capture for synthetic or unsupported pointer ids.
      }
    }
    event.preventDefault();
  });

  elements.canvas.addEventListener('pointermove', (event) => {
    if (!state.touchControl.active || state.touchControl.pointerId !== event.pointerId) return;
    updateTouchTarget(event.clientX);
    event.preventDefault();
  });

  elements.canvas.addEventListener('pointerup', (event) => {
    endTouchControl(event.pointerId);
  });
  elements.canvas.addEventListener('pointercancel', (event) => {
    endTouchControl(event.pointerId);
  });
  elements.canvas.addEventListener('lostpointercapture', (event) => {
    endTouchControl(event.pointerId);
  });

  const bindTouchButton = (button, side) => {
    const setDirection = (isPressed) => {
      if (side === 'left') {
        state.input.left = isPressed;
      } else {
        state.input.right = isPressed;
      }
      if (isPressed) {
        endTouchControl();
      }
    };

    button.addEventListener('pointerdown', (event) => {
      setDirection(true);
      if (button.setPointerCapture) {
        try {
          button.setPointerCapture(event.pointerId);
        } catch {
          // Ignore capture failures on browsers with partial pointer support.
        }
      }
      event.preventDefault();
    });

    const release = () => {
      setDirection(false);
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);
    button.addEventListener('lostpointercapture', release);
  };

  bindTouchButton(elements.leftTouchButton, 'left');
  bindTouchButton(elements.rightTouchButton, 'right');

  if (!('PointerEvent' in window)) {
    const firstTouch = (event) => event.touches?.[0] || event.changedTouches?.[0] || null;

    elements.canvas.addEventListener(
      'touchstart',
      (event) => {
        const touch = firstTouch(event);
        if (!touch) return;
        if (state.mode === 'menu' || state.mode === 'gameover') {
          startGame();
        }
        beginTouchControl(1, touch.clientX);
        event.preventDefault();
      },
      { passive: false },
    );

    elements.canvas.addEventListener(
      'touchmove',
      (event) => {
        if (!state.touchControl.active) return;
        const touch = firstTouch(event);
        if (!touch) return;
        updateTouchTarget(touch.clientX);
        event.preventDefault();
      },
      { passive: false },
    );

    const stopTouch = (event) => {
      endTouchControl();
      event.preventDefault();
    };
    elements.canvas.addEventListener('touchend', stopTouch, { passive: false });
    elements.canvas.addEventListener('touchcancel', stopTouch, { passive: false });

    const bindFallbackTouchButton = (button, side) => {
      const setDirection = (isPressed) => {
        if (side === 'left') {
          state.input.left = isPressed;
        } else {
          state.input.right = isPressed;
        }
      };

      button.addEventListener(
        'touchstart',
        (event) => {
          setDirection(true);
          endTouchControl();
          event.preventDefault();
        },
        { passive: false },
      );

      const release = (event) => {
        setDirection(false);
        event.preventDefault();
      };
      button.addEventListener('touchend', release, { passive: false });
      button.addEventListener('touchcancel', release, { passive: false });
    };

    bindFallbackTouchButton(elements.leftTouchButton, 'left');
    bindFallbackTouchButton(elements.rightTouchButton, 'right');
  }

  window.addEventListener('resize', resizeCanvasDisplay);

  document.addEventListener('fullscreenchange', () => {
    state.isFullscreen = Boolean(document.fullscreenElement);
    resizeCanvasDisplay();
  });
}

async function init() {
  try {
    updateHud();
    resizeCanvasDisplay();
    bindEvents();

    state.entries = await loadVocabulary();
    state.mode = 'menu';
    setMessage(`Loaded ${state.entries.length} English->Latvian pairs. Press Start.`, 'success');
    updateHud();

    window.render_game_to_text = renderGameToText;
    window.advanceTime = (ms) => {
      stepWithExternalClock(ms);
    };

    requestAnimationFrame(loop);
  } catch (error) {
    state.mode = 'error';
    setMessage('Could not load vocabulary. Check console and reload.', 'error');
    updateHud();
    showFatalError(error);
  }
}

init();
