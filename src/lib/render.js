import { getState } from './state.js';
import { mustId } from './dom.js';

const canvas = mustId('canvas');
const ctx = canvas.getContext('2d');
export { canvas, ctx };

export let W = canvas.width,
  H = canvas.height;
export let scale = 1;
let canvasOffsetX = 0,
  canvasOffsetY = 0;
let baseH = 560;

/**
 * Set logical canvas height and recompute scale (for game-specific layouts).
 * @param {number} h
 */
export function setCanvasHeight(h) {
  baseH = h;
  updateCanvasScale();
}

/**
 * Recompute canvas scale and physical dimensions.
 * Maintains fixed logical size (980 x baseH) with DPR-aware scaling.
 * Cap effective DPR when downscaled to limit overdraw on high-density screens.
 */
export function updateCanvasScale() {
  const containerWidth = canvas.parentElement.offsetWidth;
  // Keep a fixed logical canvas (980 x baseH) and scale only display pixels.
  scale = Math.min(1, containerWidth / 980);
  const displayWidth = 980 * scale;
  const displayHeight = baseH * scale;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  const dpr = window.devicePixelRatio || 1;
  // Cap effective DPR while downscaled to limit overdraw cost on high-density screens.
  const scaledDpr = dpr > 1 && scale < 1 ? Math.min(dpr, 2) : 1;
  canvas.width = 980 * scaledDpr;
  canvas.height = baseH * scaledDpr;
  ctx.setTransform(scaledDpr, 0, 0, scaledDpr, 0, 0);
  W = 980;
  H = baseH;
  const newRect = canvas.getBoundingClientRect();
  canvasOffsetX = newRect.left;
  canvasOffsetY = newRect.top;
}

/**
 * Convert client-space click coordinates to logical canvas coordinates.
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{x: number, y: number}}
 */
export function getCanvasCoordinates(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  canvasOffsetX = rect.left;
  canvasOffsetY = rect.top;
  return {
    x: (clientX - canvasOffsetX) / scale,
    y: (clientY - canvasOffsetY) / scale,
  };
}

/**
 * Clear canvas to transparent.
 */
export function clear() {
  ctx.clearRect(0, 0, W, H);
}

/**
 * Draw rounded rectangle with optional fill and stroke.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r - Corner radius
 * @param {string} [fillStyle]
 * @param {string} [border]
 */
export function roundedRect(x, y, w, h, r, fillStyle, border) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (border) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Draw text with scaled font size and mobile-aware sizing.
 * Scales up text on mobile and when canvas is downscaled to maintain readability.
 * @param {string} txt
 * @param {number} x
 * @param {number} y
 * @param {object} [opts]
 * @param {string} [opts.align='left']
 * @param {string} [opts.base='alphabetic']
 * @param {number} [opts.font=16]
 * @param {string} [opts.color='#e9eef5']
 */
export function drawText(txt, x, y, opts = {}) {
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.base || 'alphabetic';
  const baseFontSize = parseInt(opts.font) || 16;
  const isMobile = scale < 0.7;
  const minSize = isMobile ? 14 : 12;
  const scaleFactor = isMobile ? Math.min(2, 0.9 / scale) : Math.min(1.3, scale + 0.3);
  const scaledSize = Math.max(minSize, baseFontSize * scaleFactor);
  const defaultFontStack = '"Source Sans 3", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const fontFamily = opts.font
    ? opts.font.replace(/\d+px/, scaledSize + 'px')
    : `${scaledSize}px ${defaultFontStack}`;
  ctx.font = fontFamily;
  ctx.fillStyle = opts.color || '#e9eef5';
  // The Canvas 2D API doesn't expose text rendering hints; use CSS
  // (e.g., canvas.style.textRendering) if optimization is needed.
  ctx.fillText(txt, x, y);
}

let themeCache = { key: null, values: null };

/**
 * Read theme CSS variables from document root; cached by theme key.
 * @returns {object}
 */
export function getCanvasTheme() {
  const root = document.documentElement;
  const key = root.getAttribute('data-bs-theme') || 'light';
  // Theme values are cached per key to avoid repeated computed-style reads every frame.
  if (themeCache.key === key && themeCache.values) return themeCache.values;
  const styles = getComputedStyle(root);
  const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
  const values = {
    text: read('--text', '#1d1a16'),
    muted: read('--muted', '#5d5a54'),
    surface: read('--surface', '#ffffff'),
    surfaceSubtle: read('--surface-subtle', '#f1ece3'),
    surfaceStrong: read('--surface-subtle-strong', '#e6dfd3'),
    border: read('--border', '#d8d0c4'),
    borderSoft: read('--border-soft', '#e2dbcf'),
    accent: read('--accent', '#2d4b73'),
    accentContrast: read('--accent-contrast', '#fdfbf7'),
    success: read('--feedback-success', '#1b6b5c'),
    error: read('--feedback-error', '#a23a32'),
  };
  themeCache = { key, values };
  return values;
}

/**
 * Draw badge label with dynamic size and centered alignment.
 * @param {string} txt
 * @param {number} x
 * @param {number} y
 * @param {string} color
 */
export function drawBadge(txt, x, y, color) {
  ctx.font = '12px system-ui';
  const pad = 6;
  const w = ctx.measureText(txt).width + pad * 2;
  roundedRect(x, y - 14, w, 18, 9, color);
  drawText(txt, x + pad, y + 2, { font: '12px system-ui', color: '#fff' });
}

let bursts = [];
let confettiFrameId = null;
let confettiRenderer = null;

/**
 * Register custom confetti renderer (allows custom animation logic).
 * @param {(void) => void} renderer
 */
export function setConfettiRenderer(renderer) {
  confettiRenderer = typeof renderer === 'function' ? renderer : null;
}

/**
 * Queue a single RAF to animate all active confetti bursts.
 * Prevents multiple RAF registrations even with concurrent burst creation.
 */
function scheduleConfettiFrame() {
  if (typeof requestAnimationFrame !== 'function') return;
  if (confettiFrameId !== null) return;
  // Use a single RAF loop even when multiple confetti bursts are queued.
  confettiFrameId = requestAnimationFrame(stepConfetti);
}

/**
 * Animate one frame of all active confetti bursts; removes when life <= 0.
 * Delegates to custom renderer if registered, otherwise uses `renderConfetti`.
 */
function stepConfetti() {
  confettiFrameId = null;
  if (!bursts.length) return;
  if (confettiRenderer) {
    confettiRenderer();
  } else {
    renderConfetti();
  }
  if (bursts.length && typeof requestAnimationFrame === 'function') {
    confettiFrameId = requestAnimationFrame(stepConfetti);
  }
}

/**
 * Create a burst of confetti particles at center-screen with random spread.
 * @param {number} y - Vertical spawn offset
 */
export function confetti(y) {
  const state = getState();
  for (let i = 0; i < 14; i += 1) {
    bursts.push({
      x: W / 2 + (state.rng() * 160 - 80),
      y: y + (state.rng() * 20 - 10),
      vx: state.rng() * 2 - 1,
      vy: -2 - state.rng() * 2,
      life: 60,
    });
  }
  scheduleConfettiFrame();
}

/**
 * Animate and render confetti particles (gravity, collision with bounds, fade out).
 * Updates particle life and removes dead particles; returns true if any remain.
 * @returns {boolean}
 */
export function renderConfetti() {
  if (!bursts.length) return false;
  let writeIndex = 0;
  for (let i = 0; i < bursts.length; i += 1) {
    const b = bursts[i];
    b.x += b.vx;
    b.y += b.vy;
    b.vy += 0.06;
    b.life -= 1;
    if (b.life > 0) {
      bursts[writeIndex] = b;
      writeIndex += 1;
    }
  }
  bursts.length = writeIndex;
  ctx.save();
  for (let i = 0; i < bursts.length; i += 1) {
    const b = bursts[i];
    ctx.globalAlpha = Math.max(0, b.life / 60);
    roundedRect(b.x, b.y, 6, 6, 2, `hsl(${(b.x + b.y) % 360}deg 60% 60%)`);
  }
  ctx.restore();
  return bursts.length > 0;
}
