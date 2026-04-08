/**
 * icon.js — SVG icon loader and <data-icon> upgrader.
 * =====================================================
 * Replaces placeholder elements with [data-icon] attributes with inline
 * SVG icons fetched from the assets/icons directory. Supports theme-aware
 * (duotone-light / duotone-dark) icon variants and automatic re-upgrade
 * on theme changes.
 *
 * Key exports:
 *   upgradeIcons()      — Scan DOM for [data-icon] elements and load SVGs.
 *   upgradeIcon(el)     — Upgrade a single element.
 *
 * The icon map includes common UI icons (book, gamepad, etc.) as well
 * as a theme-dependent lookup for Phosphor duotone icons.
 */
import { assetUrl } from './paths.js';

const ICON_ROOT = 'assets/icons';
const FALLBACK_ICON = `${ICON_ROOT}/duotone-light/info.svg`;
const DEFAULT_SIZE = 24;
let observerAttached = false;

/**
 * Normalize icon name: trim, strip .svg extension if present.
 * @param {unknown} value
 * @returns {string}
 */
const normalizeName = (value) => {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return trimmed.endsWith('.svg') ? trimmed.slice(0, -4) : trimmed;
};

/**
 * Parse size value; returns DEFAULT_SIZE if invalid.
 * @param {unknown} value
 * @returns {number}
 */
const toSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_SIZE;
};

/**
 * Read theme from data attributes; defaults to 'light'.
 * @returns {string}
 */
const getTheme = () => {
  if (typeof document === 'undefined') return 'light';
  const root = document.documentElement;
  const theme = root?.getAttribute('data-bs-theme') || root?.getAttribute('data-theme');
  return theme === 'dark' ? 'dark' : 'light';
};

// Map simple icon names to static assets (used by all themes).
const ICON_MAP = {
  book: `${ICON_ROOT}/book.svg`,
  gamepad: `${ICON_ROOT}/gamepad.svg`,
  pencil: `${ICON_ROOT}/pencil.svg`,
  home: `${ICON_ROOT}/home.svg`,
  map: `${ICON_ROOT}/map.svg`,
  refresh: `${ICON_ROOT}/refresh.svg`,
  user: `${ICON_ROOT}/user.svg`,
  star: `${ICON_ROOT}/star.svg`,
  stats: `${ICON_ROOT}/stats.svg`,
  check: `${ICON_ROOT}/check.svg`,
};

/**
 * Resolve icon path from hardcoded map or theme-specific duotone folder.
 * Falls back to info.svg if name not found.
 * @param {string} name
 * @returns {string}
 */
const resolveIconPath = (name) => {
  const normalized = normalizeName(name);
  if (!normalized) return assetUrl(FALLBACK_ICON);

  if (ICON_MAP[normalized]) {
    return assetUrl(ICON_MAP[normalized]);
  }

  // Unknown icons are resolved from theme-specific duotone folders.
  const folder = getTheme() === 'dark' ? 'duotone-dark' : 'duotone-light';
  return assetUrl(`${ICON_ROOT}/${folder}/${normalized}.svg`);
};

/**
 * Bind error handler to fallback to info.svg on load failure.
 * Idempotent—prevents duplicate handlers via data attribute flag.
 * @param {HTMLImageElement} img
 */
const ensureFallbackHandler = (img) => {
  if (img.dataset.iconFallbackBound === 'true') return;
  img.dataset.iconFallbackBound = 'true';
  img.addEventListener('error', () => {
    if (img.src.endsWith('/info.svg')) return;
    img.src = assetUrl(FALLBACK_ICON);
  });
};

/**
 * Apply alt text and aria-hidden attribute to image.
 * Empty alt string marks image as decorative to screen readers.
 * @param {HTMLImageElement} img
 * @param {string | undefined} alt
 */
const applyAlt = (img, alt) => {
  if (alt === undefined) return;
  img.alt = alt;
  if (alt === '') {
    img.setAttribute('aria-hidden', 'true');
  } else {
    img.removeAttribute('aria-hidden');
  }
};

/**
 * Apply width/height attributes based on requested size.
 * Stores size in data attribute for later fallback.
 * @param {HTMLImageElement} img
 * @param {unknown} size
 */
const applySize = (img, size) => {
  const finalSize = toSize(size ?? img.dataset.iconSize);
  img.dataset.iconSize = String(finalSize);
  img.width = finalSize;
  img.height = finalSize;
};

/**
 * Apply resolved icon source path and attach error fallback handler.
 * @param {HTMLImageElement} img
 */
const applySource = (img) => {
  const name = img.dataset.iconName;
  img.src = resolveIconPath(name);
  ensureFallbackHandler(img);
};

/**
 * Initialize icon theme observer (once per page load).
 * Watches root element for theme attribute changes and refreshes icons.
 */
export function initIcons() {
  if (observerAttached || typeof document === 'undefined') return;
  observerAttached = true;
  const root = document.documentElement;
  if (!root) return;
  // Refresh icon sources when theme attributes change.
  const observer = new MutationObserver(() => {
    refreshIcons();
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-bs-theme', 'data-theme'] });
}

/**
 * Refresh all icon images within container (usually document).
 * Useful after dynamic theme changes or DOM updates.
 * @param {Document | HTMLElement} [root=document]
 */
export function refreshIcons(root = document) {
  if (!root) return;
  root.querySelectorAll('img[data-icon-name]').forEach((img) => {
    applySource(img);
  });
}

/**
 * Update existing image element with new icon properties.
 * Initializes theme observer as side effect (safe to call multiple times).
 * @param {HTMLImageElement | null} img
 * @param {object} [options={}]
 * @param {string} [options.name]
 * @param {number | string} [options.size]
 * @param {string} [options.alt]
 * @param {string} [options.className]
 * @returns {HTMLImageElement | null}
 */
export function updateIcon(img, { name, size, alt, className } = {}) {
  if (!img) return null;
  const normalized = normalizeName(name ?? img.dataset.iconName);
  if (normalized) img.dataset.iconName = normalized;
  if (className !== undefined) img.className = className;
  applySize(img, size);
  applyAlt(img, alt);
  applySource(img);
  initIcons();
  return img;
}

/**
 * Create new icon image element with specified properties.
 * Uses async decoding and lazy loading for performance.
 * @param {object} [options={}]
 * @param {string} [options.name]
 * @param {number} [options.size=24]
 * @param {string} [options.alt='']
 * @param {string} [options.className]
 * @returns {HTMLImageElement}
 */
export function createIcon({ name, size = DEFAULT_SIZE, alt = '', className } = {}) {
  const img = document.createElement('img');
  img.decoding = 'async';
  img.loading = 'lazy';
  updateIcon(img, { name, size, alt, className });
  return img;
}

/**
 * Upgrade data-attribute-marked elements to icon images.
 * Replaces placeholders with proper img tags and applies icon styling.
 * Supports [data-icon] and [data-icon-name] attributes (legacy and current).
 * @param {Document | HTMLElement} [root=document]
 */
export function upgradeIcons(root = document) {
  if (!root) return;
  const candidates = root.querySelectorAll('[data-icon], [data-icon-name]');
  candidates.forEach((el) => {
    const name = el.dataset.icon ?? el.dataset.iconName;
    const size = el.dataset.iconSize;
    const alt = el.dataset.iconAlt ?? el.getAttribute('alt') ?? '';
    const className = el.dataset.iconClass ?? el.className;

    if (el.tagName?.toLowerCase() === 'img') {
      updateIcon(el, { name, size, alt, className });
      return;
    }

    const icon = createIcon({ name, size, alt, className });
    if (el.id) icon.id = el.id;
    if (el.getAttribute('aria-hidden') === 'true' && alt === '') {
      icon.setAttribute('aria-hidden', 'true');
    }
    el.replaceWith(icon);
  });
}
