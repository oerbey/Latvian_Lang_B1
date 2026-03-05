/**
 * app.js — Main entry point for the Word-Quest / Darbības Vārdi canvas game.
 * ==========================================================================
 * This module bootstraps the "Week 1" interactive vocabulary game which renders
 * onto an HTML5 <canvas>. It supports two game modes:
 *
 *   MATCH — Pair Latvian words with their translations by clicking tiles.
 *   FORGE — Type-in the correct translation with optional hints.
 *
 * Key responsibilities:
 *   • Load and apply i18n translations (Latvian / English / Russian).
 *   • Load vocabulary data from JSON files (or offline bundles).
 *   • Wire up all UI event listeners (buttons, keyboard shortcuts, canvas
 *     mouse/touch/wheel interactions).
 *   • Manage the main render loop (draw → confetti → help overlay).
 *   • Export game results to CSV.
 *
 * Architecture:
 *   - Rendering primitives live in src/lib/render.js (canvas helpers).
 *   - Game state is a central mutable object in src/lib/state.js.
 *   - Each game mode has its own module (src/lib/match.js, src/lib/forge.js).
 *   - Clickable hit-regions are tracked in src/lib/clickables.js.
 */

// --- Rendering helpers (canvas, shapes, confetti) ---
import {
  canvas,
  updateCanvasScale,
  getCanvasCoordinates,
  renderConfetti,
  roundedRect,
  drawText,
  W,
  H,
  scale,
  setConfettiRenderer,
  getCanvasTheme,
} from './src/lib/render.js';

// --- Centralised application state management ---
import {
  getState,
  setState,
  updateState,
  MODES,
  setRedraw,
  HELP_TEXT,
  setHelpText,
  triggerRedraw,
} from './src/lib/state.js';

// --- Hit-testing for clickable canvas regions ---
import { clickables, hitAt } from './src/lib/clickables.js';

// --- Status bar message display ---
import { setStatus, setStatusHandler } from './src/lib/status.js';

// --- Game-mode modules (Match & Forge) ---
import { startMatchRound, drawMatch } from './src/lib/match.js';
import { startForgeRound, drawForge } from './src/lib/forge.js';

// --- DOM utilities & asset paths ---
import { $id, mustId, on } from './src/lib/dom.js';
import { assetUrl } from './src/lib/paths.js';

// --- Global error handling & safe HTML injection ---
import { installGlobalErrorHandlers, showFatalError } from './src/lib/errors.js';
import { setTrustedHTML } from './src/lib/safeHtml.js';

// Install window.onerror and unhandledrejection handlers early.
installGlobalErrorHandlers();

// Connect the status module to the #status DOM element.
setStatusHandler((message) => {
  mustId('status').textContent = message || '';
});

let i18n = {}; // Current translation strings (populated by loadTranslations)
let currentLang = 'lv'; // BCP 47 language tag for the active UI language
let lastHelpFocus = null; // Element that had focus before the help overlay opened

/** Deep copy ensures i18n mutations don't affect fallback data. */
const deepCopy = (value) => JSON.parse(JSON.stringify(value));

/**
 * Load and apply translations for specified language.
 * Falls back to embedded English if fetch fails or language unavailable.
 * Updates document.documentElement.lang and applies i18n to UI elements.
 * @param {string} lang - BCP 47 language tag (e.g., 'lv', 'en')
 * @throws {Error} if no language data found after fallback attempts
 */
async function loadTranslations(lang) {
  let resolvedLang = lang;
  let data = null;
  try {
    const url = assetUrl(`i18n/${lang}.json`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status}`);
    }
    data = await res.json();
  } catch (err) {
    console.warn('Failed to fetch translations', lang, err);
  }

  if (!data) {
    if (window.__LL_I18N__?.[lang]) {
      data = window.__LL_I18N__[lang];
    } else if (window.__LL_I18N__?.en) {
      data = window.__LL_I18N__.en;
      resolvedLang = 'en';
      console.warn(`Falling back to embedded English translations for ${lang}.`);
    }
  }

  if (!data) {
    throw new Error('Failed to load translations');
  }

  i18n = deepCopy(data);
  currentLang = resolvedLang;
  document.documentElement.lang = resolvedLang;
  applyTranslations();
}

/**
 * Apply i18n strings to UI elements and update aria-labels.
 * Called after translations load to update all visible text.
 */
function applyTranslations() {
  document.title = i18n.html.title;
  const weekBadge = document.querySelector('.week-badge');
  if (weekBadge) weekBadge.textContent = i18n.badge;
  mustId('title').textContent = i18n.gameTitle;
  const btnMatch = mustId('mode-match');
  btnMatch.textContent = i18n.buttons.modeMatch;
  const btnForge = mustId('mode-forge');
  btnForge.textContent = i18n.buttons.modeForge;
  const btnPractice = mustId('btn-practice');
  btnPractice.textContent = i18n.buttons.practice;
  btnPractice.setAttribute('aria-label', i18n.buttons.practice);
  const btnChallenge = mustId('btn-challenge');
  btnChallenge.textContent = i18n.buttons.challenge;
  btnChallenge.setAttribute('aria-label', i18n.buttons.challenge);
  mustId('btn-prev').setAttribute('aria-label', i18n.buttons.prevAria);
  mustId('btn-next').setAttribute('aria-label', i18n.buttons.nextAria);
  const deckBtn = mustId('btn-deck-size');
  deckBtn.setAttribute('aria-label', i18n.buttons.deckSizeAria);
  const { deckSizeMode } = getState();
  deckBtn.title = deckSizeMode === 'auto' ? i18n.deckSize.titleAuto : i18n.deckSize.titleFull;
  const btnExport = mustId('btn-export');
  btnExport.textContent = i18n.buttons.export;
  btnExport.setAttribute('aria-label', i18n.buttons.exportAria);
  const btnHelp = mustId('btn-help');
  btnHelp.textContent = i18n.buttons.help;
  btnHelp.setAttribute('aria-label', i18n.buttons.helpAria);
  btnHelp.setAttribute('aria-expanded', getState().showHelp ? 'true' : 'false');
  const loadingEl = mustId('loading');
  loadingEl.textContent = i18n.labels.loading;
  setTrustedHTML(mustId('legend'), i18n.labels.legend);
  const langSel = mustId('language-select');
  langSel.value = currentLang;
  langSel.setAttribute('aria-label', i18n.labels.languageSelect);
  mustId('ui').setAttribute('aria-label', i18n.labels.controls);
  mustId('sr-game-state').setAttribute('aria-label', i18n.labels.gameState);
  setStatus(i18n.status.ready);
  setHelpText(i18n.help.lines.join('\n'));
  triggerRedraw();
}

/**
 * Toggle help overlay visibility with focus management.
 * Saves current focus before moving to canvas and restores after closing.
 * @param {boolean} show
 */
function setHelpVisibility(show) {
  updateState((state) => {
    state.showHelp = show;
  });
  const btnHelp = $id('btn-help');
  if (btnHelp) {
    btnHelp.setAttribute('aria-expanded', show ? 'true' : 'false');
  }
  if (show) {
    lastHelpFocus = document.activeElement;
    if (canvas && canvas.focus) {
      canvas.focus();
    }
  } else {
    const restoreTarget = lastHelpFocus;
    lastHelpFocus = null;
    if (restoreTarget && document.contains(restoreTarget)) {
      restoreTarget.focus();
    } else if (btnHelp && btnHelp.focus) {
      btnHelp.focus();
    }
  }
  triggerRedraw();
}

/**
 * Draw help overlay panel with instructions and close button.
 * Responsive layout adjusts padding, width, and font sizes based on mobile detection.
 */
function drawHelp() {
  const theme = getCanvasTheme();
  const isMobile = scale < 0.7;
  const pad = isMobile ? 12 : 16;
  const w = isMobile ? Math.min(W - 40, 400) : 520;
  const h = isMobile ? Math.min(H - 40, 250) : 220;
  const x = W / 2 - w / 2;
  const y = H / 2 - h / 2;
  roundedRect(x, y, w, h, 14, theme.surface, theme.border);
  drawText(i18n.help.title, x + pad, y + 28, {
    font: 'bold 18px "Source Serif 4"',
    color: theme.accent,
  });
  const helpLines = HELP_TEXT.split('\n');
  const fontSize = isMobile ? 12 : 14;
  const lineHeight = isMobile ? 16 : 20;
  helpLines.forEach((line, i) => {
    const yPos = y + 52 + i * lineHeight;
    // Skip lines that would render outside panel bounds.
    if (yPos < y + h - 40) {
      drawText(line, x + pad, yPos, {
        font: `${fontSize}px "Source Sans 3"`,
        color: theme.text,
      });
    }
  });
  const bw = isMobile ? 60 : 74;
  const bh = isMobile ? 32 : 28;
  const bx = x + w - bw - 16;
  const by = y + h - bh - 14;
  roundedRect(bx, by, bw, bh, 10, theme.accent, theme.accent);
  drawText(i18n.help.close, bx + (isMobile ? 8 : 12), by + (isMobile ? 22 : 20), {
    font: `${isMobile ? 12 : 14}px "Source Sans 3"`,
    color: theme.accentContrast,
  });
  clickables.push({
    x: bx,
    y: by,
    w: bw,
    h: bh,
    onClick: () => {
      setHelpVisibility(false);
    },
  });
}

/**
 * Main render loop: draw active game mode, confetti, and help overlay if shown.
 * Confetti renders independently to layer above game content.
 */
function draw() {
  const state = getState();
  if (state.mode === MODES.MATCH) {
    if (state.matchState) drawMatch();
  } else {
    if (state.forgeState) drawForge();
  }
  renderConfetti();
  if (state.showHelp) drawHelp();
}
setRedraw(draw);
setConfettiRenderer(draw);

/**
 * Toggle deck size mode between 'auto' (adaptive to viewport) and 'full' (up to 15 items).
 * Updates button icon and text, restarts match round if active.
 */
function toggleDeckSize() {
  updateState((state) => {
    state.deckSizeMode = state.deckSizeMode === 'auto' ? 'full' : 'auto';
  });
  const state = getState();
  const btn = $id('btn-deck-size');
  if (btn) {
    btn.textContent = state.deckSizeMode === 'auto' ? '📏' : '📜';
    btn.title = state.deckSizeMode === 'auto' ? i18n.deckSize.titleAuto : i18n.deckSize.titleFull;
  }
  setStatus(state.deckSizeMode === 'auto' ? i18n.status.fit : i18n.status.full);
  if (state.mode === MODES.MATCH) startMatchRound();
}

/**
 * Wire up all interactive UI event listeners.
 * Includes: mode buttons, difficulty buttons, navigation (prev/next),
 * deck-size toggle, help, export, language selector, canvas mouse/touch/wheel,
 * window resize, and keyboard shortcuts.
 */
function setupEventListeners() {
  // --- Mode selection: switch between Match and Forge modes ---
  on(mustId('mode-match'), 'click', () => {
    updateState((state) => {
      state.mode = MODES.MATCH;
      state.roundIndex = 0;
    });
    startMatchRound();
  });
  on(mustId('mode-forge'), 'click', () => {
    updateState((state) => {
      state.mode = MODES.FORGE;
      state.roundIndex = 0;
    });
    startForgeRound();
  });
  // --- Difficulty selectors ---
  on(mustId('btn-practice'), 'click', () => {
    updateState((state) => {
      state.difficulty = 'practice';
    });
    setStatus(i18n.status.practice);
  });
  on(mustId('btn-challenge'), 'click', () => {
    updateState((state) => {
      state.difficulty = 'challenge';
    });
    setStatus(i18n.status.challenge);
  });
  // --- Round navigation (previous / next) ---
  on(mustId('btn-prev'), 'click', () => {
    updateState((state) => {
      state.roundIndex = Math.max(0, state.roundIndex - 1);
    });
    const { mode } = getState();
    mode === MODES.MATCH ? startMatchRound() : startForgeRound();
  });
  on(mustId('btn-next'), 'click', () => {
    updateState((state) => {
      state.roundIndex += 1;
    });
    const { mode } = getState();
    mode === MODES.MATCH ? startMatchRound() : startForgeRound();
  });
  // --- Deck size, help, export, language ---
  on(mustId('btn-deck-size'), 'click', toggleDeckSize);
  on(mustId('btn-help'), 'click', () => {
    setHelpVisibility(!getState().showHelp);
  });
  on(mustId('btn-export'), 'click', exportCSV);
  on(mustId('language-select'), 'change', async (e) => {
    const lang = e.target.value;
    try {
      await loadTranslations(lang);
      const target = lang === 'ru' ? 'ru' : 'en';
      await loadVocabulary('lv', target);

      updateState((state) => {
        state.roundIndex = 0;
      });
      const { mode } = getState();
      mode === MODES.MATCH ? startMatchRound() : startForgeRound();
    } catch (err) {
      console.error('Failed to load translations', err);
      alert('Failed to load translations');
      e.target.value = currentLang;
    }
  });
  // --- Canvas pointer events (mouse click & hover cursor) ---
  on(canvas, 'mousemove', (e) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    canvas.style.cursor = hitAt(coords.x, coords.y) ? 'pointer' : 'default';
  });
  on(canvas, 'click', (e) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const t = hitAt(coords.x, coords.y);
    if (t && t.onClick) t.onClick({ x: coords.x, y: coords.y, target: t });
  });
  // --- Touch events (scrolling + tap detection for mobile) ---
  let touchStartY = null;
  let touchStartScrollY = 0;
  let touchStartTime = 0;
  let touchMoved = false;
  on(
    canvas,
    'touchstart',
    (e) => {
      const t = e.touches[0];
      getCanvasCoordinates(t.clientX, t.clientY);
      touchStartY = t.clientY;
      touchStartTime = Date.now();
      const state = getState();
      touchStartScrollY = state.matchState ? state.matchState.scrollY : 0;
      touchMoved = false;
    },
    { passive: true },
  );
  on(
    canvas,
    'touchmove',
    (e) => {
      const t = e.touches[0];
      const dy = t.clientY - touchStartY;
      if (Math.abs(dy) > 5) touchMoved = true;
      const state = getState();
      if (state.mode === MODES.MATCH && state.matchState) {
        const viewH = state.matchState.viewBottom - state.matchState.viewTop;
        const maxScroll = Math.max(0, state.matchState.contentH - viewH);
        updateState((state) => {
          const ms = state.matchState;
          if (!ms) return;
          const viewH = ms.viewBottom - ms.viewTop;
          const maxScroll = Math.max(0, ms.contentH - viewH);
          ms.scrollY = Math.max(0, Math.min(maxScroll, touchStartScrollY - dy));
        });
        triggerRedraw();
        if (maxScroll > 0) {
          e.preventDefault();
        }
      }
    },
    { passive: false },
  );
  on(
    canvas,
    'touchend',
    (e) => {
      const dt = Date.now() - touchStartTime;
      if (dt < 200 && !touchMoved) {
        const t = e.changedTouches[0];
        const coords = getCanvasCoordinates(t.clientX, t.clientY);
        const hit = hitAt(coords.x, coords.y);
        if (hit && hit.onClick) {
          hit.onClick({ x: coords.x, y: coords.y, target: hit });
          e.preventDefault();
        }
      }
    },
    { passive: false },
  );
  // --- Mouse wheel scrolling for the match-mode tile grid ---
  on(
    canvas,
    'wheel',
    (e) => {
      const state = getState();
      if (state.mode !== MODES.MATCH || !state.matchState) return;
      const viewH = state.matchState.viewBottom - state.matchState.viewTop;
      const maxScroll = Math.max(0, state.matchState.contentH - viewH);
      updateState((state) => {
        const ms = state.matchState;
        if (!ms) return;
        const viewH = ms.viewBottom - ms.viewTop;
        const maxScroll = Math.max(0, ms.contentH - viewH);
        ms.scrollY = Math.max(0, Math.min(maxScroll, ms.scrollY + e.deltaY));
      });
      triggerRedraw();
      if (maxScroll > 0) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
  // --- Window resize: recalculate canvas dimensions ---
  on(window, 'resize', () => {
    updateCanvasScale();
    triggerRedraw();
  });

  // --- Keyboard shortcuts: 1=Match, 2=Forge, H=Help, R=Restart, D=Deck ---
  on(document, 'keydown', (e) => {
    if (e.key === '1') {
      updateState((state) => {
        state.mode = MODES.MATCH;
      });
      startMatchRound();
    }
    if (e.key === '2') {
      updateState((state) => {
        state.mode = MODES.FORGE;
      });
      startForgeRound();
    }
    if (e.key === 'h' || e.key === 'H') {
      setHelpVisibility(!getState().showHelp);
    }
    if (e.key === 'r' || e.key === 'R') {
      const { mode } = getState();
      mode === MODES.MATCH ? startMatchRound() : startForgeRound();
    }
    if (e.key === 'd' || e.key === 'D') toggleDeckSize();
  });
}

/**
 * Export accumulated game results as a downloadable CSV file.
 * Columns: mode, timestamp, correct, total, time_s, detail (JSON).
 * Creates a temporary <a> to trigger the browser download dialog.
 */
function exportCSV() {
  const rows = [['mode', 'timestamp', 'correct', 'total', 'time_s', 'detail'].join(',')];
  const state = getState();
  for (const r of state.results) {
    const d = JSON.stringify(r.details).replaceAll('"', '""');
    rows.push([r.mode, r.ts, r.correct, r.total, r.time, `"${d}"`].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'b1_game_results.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Loading overlay: show spinner while data loads, hide when ready ---
const loadingOverlay = $id('loading');
const canvasElement = canvas;
if (loadingOverlay) loadingOverlay.classList.add('visible');
canvasElement.classList.add('loading');

/**
 * Finalise game initialisation: scale the canvas, start the first round,
 * and hide the loading overlay.
 */
function initializeGame() {
  updateCanvasScale();
  startMatchRound();
  if (loadingOverlay) loadingOverlay.classList.remove('visible');
  canvasElement.classList.remove('loading');
}

/**
 * Fetch vocabulary data for a given language pair (e.g. lv→en, lv→ru).
 * Loads a units index, each unit's word list, and a forge entries file.
 * Falls back to offline embedded data (window.__WEEK1_VOCAB__) if fetch fails.
 *
 * @param {string} from - Source language code (default 'lv').
 * @param {string} to   - Target language code (default 'en').
 */
async function loadVocabulary(from = 'lv', to = 'en') {
  const base = `data/${from}-${to}/`;
  try {
    const indexUrl = assetUrl(base + 'units.json');
    const idxRes = await fetch(indexUrl);
    if (!idxRes.ok) throw new Error(`Failed to load ${indexUrl}: ${idxRes.status}`);
    const idx = await idxRes.json();

    const unitPromises = idx.units.map(async (u) => {
      const unitUrl = assetUrl(base + u.file);
      const res = await fetch(unitUrl);
      if (!res.ok) throw new Error(`Failed to load ${unitUrl}: ${res.status}`);
      return res.json();
    });
    const units = await Promise.all(unitPromises);

    const forgeUrl = assetUrl(base + 'forge.json');
    const forgeRes = await fetch(forgeUrl);
    if (!forgeRes.ok) throw new Error(`Failed to load ${forgeUrl}: ${forgeRes.status}`);
    const forgeData = await forgeRes.json();
    setState({
      DATA: { units, forge: forgeData.entries || [], notes: forgeData.notes || {} },
      targetLang: to,
    });
    return;
  } catch (err) {
    console.warn(`Failed to load vocabulary via fetch for ${from}-${to}`, err);
  }

  const offlineKey = `${from}-${to}`;
  const offline = window.__WEEK1_VOCAB__?.[offlineKey];
  if (!offline) {
    throw new Error(`Offline vocabulary for ${offlineKey} not available`);
  }

  const idx = offline.index;
  const units = idx.units
    .map((u) => offline.units[u.file])
    .filter(Boolean)
    .map(deepCopy);
  const forgeData = deepCopy(offline.forge || { entries: [], notes: {} });
  setState({
    DATA: { units, forge: forgeData.entries || [], notes: forgeData.notes || {} },
    targetLang: to,
  });
}

/**
 * Application bootstrap sequence:
 *   1. Load translations for the current language.
 *   2. Set up all UI event listeners.
 *   3. Load vocabulary data (fetch or offline).
 *   4. Wait for web fonts, then start the first game round.
 * Shows a fatal error banner if any step fails.
 */
async function startInit() {
  try {
    await loadTranslations(currentLang);
    setupEventListeners();
  } catch (e) {
    console.error('Failed to initialize UI', e);
    showFatalError(new Error('Something went wrong loading the page. Please refresh.'));
    return;
  }
  try {
    const target = currentLang === 'ru' ? 'ru' : 'en';
    await loadVocabulary('lv', target);
  } catch (e) {
    console.error('Failed to load vocabulary', e);
    showFatalError(new Error(i18n.labels?.loadError || 'Failed to load data'));
    return;
  }
  const startGame = () => {
    try {
      initializeGame();
    } catch (err) {
      console.error('Initialization error', err);
      showFatalError(new Error(i18n.labels?.loadError || 'Failed to load data'));
    }
  };

  if (document.fonts && document.fonts.ready) {
    const ready = Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
    ready.then(() => setTimeout(startGame, 50)).catch(startGame);
  } else {
    setTimeout(startGame, 150);
  }
}

// --- Kick off initialisation when the DOM is ready ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startInit);
} else {
  startInit();
}

export { startInit, exportCSV };
