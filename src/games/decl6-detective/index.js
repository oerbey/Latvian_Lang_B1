import { mustId, on } from '../../lib/dom.js';
import { shuffle } from '../../lib/utils.js';
import { sanitizeText } from '../../lib/sanitize.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { loadItems } from './data.js';
import { readProgress, persistProgress } from './progress.js';

(() => {
  const DATA_PATH = 'data/decl6-detective/items.json';
  const CANVAS_WIDTH = 960;
  const CANVAS_HEIGHT = 540;
  const ROUND_TARGET = 8;
  const MAX_HEARTS = 3;
  const TOTAL_TIME_MS = 3 * 60 * 1000;
  const MOVE_KEYS = {
    arrowup: { dx: 0, dy: -1 },
    w: { dx: 0, dy: -1 },
    arrowdown: { dx: 0, dy: 1 },
    s: { dx: 0, dy: 1 },
    arrowleft: { dx: -1, dy: 0 },
    a: { dx: -1, dy: 0 },
    arrowright: { dx: 1, dy: 0 },
    d: { dx: 1, dy: 0 },
  };

  const SCENE_GRID = [
    ['virtuve', 'viesistaba', 'koridors', 'karte'],
    ['pirts', 'klēts', 'kūts', 'pagalms'],
    ['telts', 'parks', 'pludmale', null],
  ];

  const SCENE_META = {
    virtuve: { label: 'Virtuve', color: '#f97316' },
    viesistaba: { label: 'Viesistaba', color: '#f59e0b' },
    koridors: { label: 'Koridors', color: '#0ea5e9' },
    karte: { label: 'Karte', color: '#14b8a6' },
    pirts: { label: 'Pirts', color: '#ef4444' },
    klēts: { label: 'Klēts', color: '#84cc16' },
    kūts: { label: 'Kūts', color: '#facc15' },
    pagalms: { label: 'Pagalms', color: '#22c55e' },
    telts: { label: 'Telts', color: '#8b5cf6' },
    parks: { label: 'Parks', color: '#15803d' },
    pludmale: { label: 'Pludmale', color: '#06b6d4' },
  };

  const sceneCoords = new Map();
  const roomRects = [];

  const boardPaddingX = 54;
  const boardPaddingY = 66;
  const roomGap = 18;
  const boardCols = SCENE_GRID[0].length;
  const boardRows = SCENE_GRID.length;
  const roomWidth = (CANVAS_WIDTH - boardPaddingX * 2 - roomGap * (boardCols - 1)) / boardCols;
  const roomHeight = (CANVAS_HEIGHT - boardPaddingY * 2 - roomGap * (boardRows - 1)) / boardRows;

  SCENE_GRID.forEach((row, rowIndex) => {
    row.forEach((scene, colIndex) => {
      if (!scene) return;
      sceneCoords.set(scene, { row: rowIndex, col: colIndex });
      roomRects.push({
        scene,
        row: rowIndex,
        col: colIndex,
        x: boardPaddingX + colIndex * (roomWidth + roomGap),
        y: boardPaddingY + rowIndex * (roomHeight + roomGap),
        w: roomWidth,
        h: roomHeight,
      });
    });
  });

  const firstScene = roomRects[0]?.scene ?? 'virtuve';

  const nodes = {
    boardPanel: mustId('decl6-board-panel'),
    canvas: mustId('decl6-canvas'),
    overlay: mustId('decl6-overlay'),
    overlayTitle: mustId('decl6-overlay-title'),
    overlayBody: mustId('decl6-overlay-body'),
    start: mustId('decl6-start'),
    score: mustId('decl6-score'),
    streak: mustId('decl6-streak'),
    best: mustId('decl6-best'),
    hearts: mustId('decl6-hearts'),
    timer: mustId('decl6-timer'),
    solved: mustId('decl6-solved'),
    xp: mustId('decl6-total-xp'),
    round: mustId('decl6-round'),
    prompt: mustId('decl6-prompt'),
    case: mustId('decl6-case'),
    hint: mustId('decl6-hint'),
    inspect: mustId('decl6-inspect'),
    next: mustId('decl6-next'),
    options: mustId('decl6-options'),
    feedback: mustId('decl6-feedback'),
    restart: mustId('decl6-restart'),
    liveRegion: mustId('decl6-live-region'),
  };

  const ctx = nodes.canvas.getContext('2d');
  nodes.canvas.width = CANVAS_WIDTH;
  nodes.canvas.height = CANVAS_HEIGHT;

  const state = {
    mode: 'loading',
    items: [],
    currentItem: null,
    currentOptions: [],
    disabledOptions: new Set(),
    usedIds: new Set(),
    score: 0,
    streak: 0,
    bestStreak: 0,
    hearts: MAX_HEARTS,
    solved: 0,
    round: 0,
    timeLeftMs: TOTAL_TIME_MS,
    totalXp: 0,
    lastPlayedISO: null,
    selectedScene: firstScene,
    sceneUnlocked: false,
    caseSolved: false,
    feedback: 'Sāc izmeklēšanu, lai saņemtu pirmo pavedienu.',
    lastFrameAt: 0,
    needsUiSync: true,
  };

  function setLiveRegion(message) {
    if (!nodes.liveRegion) return;
    nodes.liveRegion.textContent = message;
  }

  function formatTime(totalMs) {
    const wholeSeconds = Math.max(0, Math.ceil(totalMs / 1000));
    const minutes = Math.floor(wholeSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (wholeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function normalizeAnswer(value = '') {
    return sanitizeText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function saveProgress(touchLastPlayed = false) {
    const persisted = persistProgress(
      {
        xp: state.totalXp,
        streak: state.bestStreak,
        lastPlayedISO: state.lastPlayedISO,
      },
      touchLastPlayed,
    );
    state.lastPlayedISO = persisted.lastPlayedISO;
  }

  function setFeedback(message, announce = false) {
    state.feedback = message;
    state.needsUiSync = true;
    if (announce) setLiveRegion(message);
  }

  function getSceneMeta(scene) {
    if (scene && Object.prototype.hasOwnProperty.call(SCENE_META, scene)) {
      return SCENE_META[scene];
    }
    return { label: scene || 'Nezināma telpa', color: '#64748b' };
  }

  function ensurePlayableOptions(item) {
    const unique = Array.from(new Set([...(item.options || []), item.answer]));
    while (unique.length < 4) {
      unique.push(item.answer);
    }
    const shuffled = shuffle(unique);
    const candidate = shuffled.slice(0, 4);
    if (candidate.includes(item.answer)) return candidate;
    candidate[candidate.length - 1] = item.answer;
    return candidate;
  }

  function pickNextItem() {
    let available = state.items.filter((item) => !state.usedIds.has(item.id));
    if (!available.length) {
      state.usedIds.clear();
      available = state.items.slice();
    }
    const [next] = shuffle(available);
    if (!next) return null;
    state.usedIds.add(next.id);
    return next;
  }

  function enterVictory() {
    state.mode = 'victory';
    state.caseSolved = true;
    setFeedback(
      `Lieta slēgta! Atrisināji ${state.solved}/${ROUND_TARGET} pavedienus ar ${state.score} punktiem.`,
      true,
    );
    saveProgress(true);
    state.needsUiSync = true;
  }

  function enterGameOver(reason) {
    if (state.mode !== 'playing') return;
    state.mode = 'gameover';
    state.caseSolved = true;
    setFeedback(reason, true);
    saveProgress(false);
    state.needsUiSync = true;
  }

  function applyPenalty({ hearts = 1, timeMs = 5000, message }) {
    state.hearts = Math.max(0, state.hearts - hearts);
    state.timeLeftMs = Math.max(0, state.timeLeftMs - timeMs);
    state.streak = 0;
    setFeedback(message, true);
    saveProgress(false);

    if (state.hearts <= 0) {
      enterGameOver('Izmeklēšana pārtraukta: beidzās mēģinājumi.');
      return;
    }

    if (state.timeLeftMs <= 0) {
      enterGameOver('Izmeklēšana pārtraukta: laiks beidzās.');
    }
  }

  function loadNextCase() {
    if (state.solved >= ROUND_TARGET) {
      enterVictory();
      return;
    }

    const item = pickNextItem();
    if (!item) {
      enterGameOver('Nav pieejamu uzdevumu šai sesijai.');
      return;
    }

    state.round = state.solved + 1;
    state.currentItem = item;
    state.currentOptions = ensurePlayableOptions(item);
    state.disabledOptions = new Set();
    state.sceneUnlocked = false;
    state.caseSolved = false;
    state.needsUiSync = true;
    setFeedback('Atrodi pareizo telpu kartē un nospied Enter.', true);
  }

  function startSession() {
    state.mode = 'playing';
    state.score = 0;
    state.streak = 0;
    state.hearts = MAX_HEARTS;
    state.solved = 0;
    state.round = 0;
    state.timeLeftMs = TOTAL_TIME_MS;
    state.selectedScene = firstScene;
    state.usedIds.clear();
    state.caseSolved = false;
    state.sceneUnlocked = false;
    state.disabledOptions = new Set();
    state.lastFrameAt = performance.now();
    loadNextCase();
    state.needsUiSync = true;
  }

  function findRectAtPoint(x, y) {
    return roomRects.find(
      (rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h,
    );
  }

  function moveSelection(dx, dy) {
    const current = sceneCoords.get(state.selectedScene);
    if (!current) return;

    let row = current.row + dy;
    let col = current.col + dx;

    while (row >= 0 && row < boardRows && col >= 0 && col < boardCols) {
      const candidate = SCENE_GRID[row][col];
      if (candidate) {
        state.selectedScene = candidate;
        state.needsUiSync = true;
        return;
      }
      row += dy;
      col += dx;
    }
  }

  function investigateSelectedRoom() {
    if (state.mode !== 'playing' || !state.currentItem || state.caseSolved) return;

    if (state.selectedScene === state.currentItem.scene) {
      if (state.sceneUnlocked) return;
      state.sceneUnlocked = true;
      setFeedback(
        `Pavediens atrasts: ${getSceneMeta(state.currentItem.scene).label}. Izvēlies pareizo formu.`,
        true,
      );
      state.needsUiSync = true;
      return;
    }

    applyPenalty({
      hearts: 1,
      timeMs: 8000,
      message: `Nepareiza telpa: ${getSceneMeta(state.selectedScene).label}. -1 dzīvība, -8s.`,
    });
  }

  function handleOptionPick(option) {
    if (state.mode !== 'playing' || !state.sceneUnlocked || state.caseSolved || !state.currentItem)
      return;
    if (state.disabledOptions.has(option)) return;

    const isCorrect = normalizeAnswer(option) === normalizeAnswer(state.currentItem.answer);
    if (!isCorrect) {
      state.disabledOptions.add(option);
      applyPenalty({ hearts: 1, timeMs: 5000, message: `Nepareizi: “${option}”. Mēģini vēlreiz.` });
      state.needsUiSync = true;
      return;
    }

    const speedBonus = Math.max(0, Math.floor(state.timeLeftMs / 15000));
    const streakBonus = Math.min(state.streak, 5);
    const points = 12 + speedBonus + streakBonus;

    state.score += points;
    state.totalXp += points;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.solved += 1;
    state.caseSolved = true;

    setFeedback(`Lieta atrisināta! Pareizi: ${state.currentItem.answer}. +${points} punkti.`, true);
    saveProgress(true);
    state.needsUiSync = true;
  }

  function toCanvasPoint(event) {
    const rect = nodes.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return { x, y };
  }

  function toggleFullscreen() {
    const root = nodes.boardPanel;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().catch(() => {});
      return;
    }
    document.exitFullscreen?.().catch(() => {});
  }

  function buildOptionButtons() {
    nodes.options.replaceChildren();
    if (!state.currentItem) return;

    state.currentOptions.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'decl6-option';
      button.dataset.option = option;
      button.textContent = `${index + 1}. ${option}`;

      const disabledBecauseMode = state.mode !== 'playing';
      const disabledBecauseProgress = !state.sceneUnlocked || state.caseSolved;
      const disabledBecauseMiss = state.disabledOptions.has(option);
      button.disabled = disabledBecauseMode || disabledBecauseProgress || disabledBecauseMiss;

      if (disabledBecauseMiss) button.classList.add('is-eliminated');
      if (
        state.caseSolved &&
        state.currentItem &&
        normalizeAnswer(option) === normalizeAnswer(state.currentItem.answer)
      ) {
        button.classList.add('is-correct');
      }

      button.addEventListener('click', () => {
        handleOptionPick(option);
      });
      nodes.options.appendChild(button);
    });
  }

  function syncOverlay() {
    if (state.mode === 'playing') {
      nodes.overlay.classList.add('is-hidden');
      return;
    }

    nodes.overlay.classList.remove('is-hidden');

    if (state.mode === 'menu') {
      nodes.overlayTitle.textContent = '6. deklinācijas detektīvs';
      nodes.overlayBody.textContent =
        'Atrodi pareizo telpu ar bultiņām, nospied Enter, un tad izvēlies pareizo formu ar 1-4 taustiņiem.';
      nodes.start.textContent = 'Sākt izmeklēšanu';
      return;
    }

    if (state.mode === 'victory') {
      nodes.overlayTitle.textContent = 'Lieta slēgta';
      nodes.overlayBody.textContent = `Tu pabeidzi ${ROUND_TARGET} lietas ar ${state.score} punktiem.`;
      nodes.start.textContent = 'Spēlēt vēlreiz';
      return;
    }

    if (state.mode === 'gameover') {
      nodes.overlayTitle.textContent = 'Izmeklēšana pārtraukta';
      nodes.overlayBody.textContent = state.feedback;
      nodes.start.textContent = 'Mēģināt vēlreiz';
      return;
    }

    nodes.overlayTitle.textContent = 'Ielādē spēli...';
    nodes.overlayBody.textContent = 'Lūdzu uzgaidi.';
    nodes.start.textContent = 'Sākt';
  }

  function syncHud() {
    nodes.score.textContent = String(state.score);
    nodes.streak.textContent = String(state.streak);
    nodes.best.textContent = String(state.bestStreak);
    nodes.hearts.textContent = String(state.hearts);
    nodes.timer.textContent = formatTime(state.timeLeftMs);
    nodes.solved.textContent = `${state.solved}/${ROUND_TARGET}`;
    nodes.xp.textContent = String(state.totalXp);

    if (state.currentItem) {
      nodes.round.textContent = `Lieta ${state.round} / ${ROUND_TARGET}`;
      nodes.prompt.textContent = state.currentItem.prompt;
      nodes.case.textContent = `Mērķa forma: ${state.currentItem.case}`;
      nodes.hint.textContent = `Padoms: ${state.currentItem.hint ?? '—'}`;
    } else {
      nodes.round.textContent = `Lieta 0 / ${ROUND_TARGET}`;
      nodes.prompt.textContent = 'Gaida pavedienu…';
      nodes.case.textContent = 'Mērķa forma: —';
      nodes.hint.textContent = 'Padoms: —';
    }

    nodes.inspect.disabled = state.mode !== 'playing' || state.caseSolved;
    nodes.next.disabled = state.mode !== 'playing' || !state.caseSolved;
    nodes.next.textContent = state.solved >= ROUND_TARGET ? 'Pabeigt' : 'Nākamā lieta';
    nodes.feedback.textContent = state.feedback;

    buildOptionButtons();
    syncOverlay();
    state.needsUiSync = false;
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#062533');
    gradient.addColorStop(0.55, '#10324a');
    gradient.addColorStop(1, '#0f766e');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(110, 70, 68, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 120, CANVAS_HEIGHT - 80, 84, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRooms(now) {
    roomRects.forEach((room) => {
      const scene = room.scene;
      const sceneMeta = getSceneMeta(scene);
      const isSelected = state.selectedScene === scene;
      const isTarget = state.currentItem?.scene === scene;
      const isUnlockedTarget = isTarget && state.sceneUnlocked;

      ctx.save();
      ctx.fillStyle = sceneMeta.color;
      ctx.globalAlpha = state.mode === 'playing' ? 0.88 : 0.55;
      ctx.fillRect(room.x, room.y, room.w, room.h);

      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.strokeRect(room.x, room.y, room.w, room.h);

      if (isUnlockedTarget) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#22c55e';
        ctx.strokeRect(room.x + 2, room.y + 2, room.w - 4, room.h - 4);
      }

      if (isSelected) {
        const pulse = 0.65 + 0.35 * Math.sin(now / 170);
        ctx.lineWidth = 5;
        ctx.strokeStyle = `rgba(253, 224, 71, ${pulse.toFixed(3)})`;
        ctx.strokeRect(room.x - 2, room.y - 2, room.w + 4, room.h + 4);
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 20px "Nunito Sans", "Avenir Next", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sceneMeta.label, room.x + room.w / 2, room.y + room.h / 2);

      ctx.font = '600 13px "Nunito Sans", "Avenir Next", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(scene.toUpperCase(), room.x + room.w / 2, room.y + room.h / 2 + 24);
      ctx.restore();
    });
  }

  function drawCursor() {
    const selectedRect = roomRects.find((room) => room.scene === state.selectedScene);
    if (!selectedRect) return;

    const cx = selectedRect.x + selectedRect.w / 2;
    const cy = selectedRect.y + selectedRect.h / 2 - 32;

    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.fillStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 12, cy + 12);
    ctx.lineTo(cx + 24, cy + 24);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStatusBanner() {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
    ctx.fillRect(20, 12, CANVAS_WIDTH - 40, 36);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 16px "Nunito Sans", "Avenir Next", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const selectedName = getSceneMeta(state.selectedScene).label;
    const lockStatus =
      state.mode === 'playing'
        ? state.sceneUnlocked
          ? 'forma atbloķēta'
          : 'meklē telpu'
        : state.mode;
    ctx.fillText(
      `Koordinātas: (0,0) augšā pa kreisi | Izvēle: ${selectedName} | Statuss: ${lockStatus}`,
      30,
      30,
    );
    ctx.restore();
  }

  function renderCanvas(now = performance.now()) {
    drawBackground();
    drawRooms(now);
    drawCursor();
    drawStatusBanner();
  }

  function update(ms) {
    if (state.mode !== 'playing') return;
    state.timeLeftMs = Math.max(0, state.timeLeftMs - ms);
    if (state.timeLeftMs <= 0) {
      enterGameOver('Izmeklēšana pārtraukta: laiks beidzās.');
    }
  }

  function loop(now) {
    if (!state.lastFrameAt) state.lastFrameAt = now;
    const dt = Math.min(80, now - state.lastFrameAt);
    state.lastFrameAt = now;
    update(dt);

    if (state.needsUiSync) {
      syncHud();
    } else if (state.mode === 'playing') {
      nodes.timer.textContent = formatTime(state.timeLeftMs);
    }

    renderCanvas(now);
    requestAnimationFrame(loop);
  }

  function renderGameToText() {
    const payload = {
      mode: state.mode,
      coordinateSystem: `origin top-left; +x right; +y down; canvas ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
      canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      stats: {
        score: state.score,
        streak: state.streak,
        bestStreak: state.bestStreak,
        hearts: state.hearts,
        solved: state.solved,
        target: ROUND_TARGET,
        timeLeftMs: Math.round(state.timeLeftMs),
        totalXp: state.totalXp,
      },
      selectedScene: state.selectedScene,
      clue: state.currentItem
        ? {
            id: state.currentItem.id,
            prompt: state.currentItem.prompt,
            case: state.currentItem.case,
            hint: state.currentItem.hint,
            scene: state.currentItem.scene,
            options: state.currentOptions,
            expectedAnswer: state.currentItem.answer,
            sceneUnlocked: state.sceneUnlocked,
            caseSolved: state.caseSolved,
          }
        : null,
      rooms: roomRects.map((room) => ({
        scene: room.scene,
        label: getSceneMeta(room.scene).label,
        x: Math.round(room.x + room.w / 2),
        y: Math.round(room.y + room.h / 2),
        w: Math.round(room.w),
        h: Math.round(room.h),
        selected: room.scene === state.selectedScene,
      })),
      feedback: state.feedback,
    };
    return JSON.stringify(payload);
  }

  function attachEvents() {
    on(nodes.start, 'click', () => {
      startSession();
    });

    on(nodes.restart, 'click', () => {
      startSession();
    });

    on(nodes.inspect, 'click', () => {
      investigateSelectedRoom();
    });

    on(nodes.next, 'click', () => {
      if (state.mode !== 'playing' || !state.caseSolved) return;
      if (state.solved >= ROUND_TARGET) {
        enterVictory();
        return;
      }
      loadNextCase();
    });

    on(nodes.canvas, 'click', (event) => {
      const point = toCanvasPoint(event);
      const room = findRectAtPoint(point.x, point.y);
      if (!room) return;

      if (state.selectedScene === room.scene && state.mode === 'playing' && !state.sceneUnlocked) {
        investigateSelectedRoom();
        return;
      }

      state.selectedScene = room.scene;
      state.needsUiSync = true;
    });

    on(document, 'keydown', (event) => {
      const key = event.key.toLowerCase();

      if (key === 'f') {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (
        (state.mode === 'menu' || state.mode === 'victory' || state.mode === 'gameover') &&
        key === 'enter'
      ) {
        event.preventDefault();
        startSession();
        return;
      }

      if (state.mode !== 'playing') return;

      if (Object.prototype.hasOwnProperty.call(MOVE_KEYS, key)) {
        event.preventDefault();
        const move = MOVE_KEYS[key];
        moveSelection(move.dx, move.dy);
        return;
      }

      if (key === 'enter' || key === ' ') {
        event.preventDefault();
        investigateSelectedRoom();
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        if (state.caseSolved) loadNextCase();
        return;
      }

      if (/^[1-4]$/.test(key)) {
        event.preventDefault();
        const index = Number(key) - 1;
        const option = state.currentOptions[index];
        if (option) handleOptionPick(option);
      }
    });
  }

  async function init() {
    showLoading('Ielādē 6. deklinācijas detektīvu...');

    try {
      const progress = readProgress();
      state.totalXp = progress.xp ?? 0;
      state.bestStreak = progress.streak ?? 0;
      state.lastPlayedISO = progress.lastPlayedISO ?? null;

      const items = await loadItems(DATA_PATH);
      state.items = (Array.isArray(items) ? items : []).filter(
        (item) =>
          sceneCoords.has(item.scene) && typeof item.answer === 'string' && item.answer.trim(),
      );

      if (state.items.length < 4) {
        throw new Error('Not enough playable items for decl6 detective game');
      }

      state.mode = 'menu';
      setFeedback('Sāc izmeklēšanu, lai saņemtu pirmo pavedienu.');
      state.needsUiSync = true;
      attachEvents();
      syncHud();
      renderCanvas();
      requestAnimationFrame(loop);

      window.render_game_to_text = renderGameToText;
      window.advanceTime = (ms) => {
        const numeric = Number(ms);
        const total = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
        const steps = Math.max(1, Math.round(total / (1000 / 60)));
        const dt = total / steps || 1000 / 60;
        for (let index = 0; index < steps; index += 1) {
          update(dt);
        }
        state.needsUiSync = true;
        syncHud();
        renderCanvas();
      };
    } catch (error) {
      console.error(error);
      const safeError = error instanceof Error ? error : new Error('Failed to initialize game');
      showFatalError(safeError);
    } finally {
      hideLoading();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
