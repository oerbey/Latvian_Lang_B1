import { assetUrl } from './paths.js';

const ICON_ROOT = 'assets/icons';
const FALLBACK_ICON = `${ICON_ROOT}/duotone-light/info.svg`;
const DEFAULT_SIZE = 24;
let observerAttached = false;

const normalizeName = (value) => {
  if (value == null) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  return trimmed.endsWith('.svg') ? trimmed.slice(0, -4) : trimmed;
};

const toSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_SIZE;
};

const getTheme = () => {
  if (typeof document === 'undefined') return 'light';
  const root = document.documentElement;
  const theme = root?.getAttribute('data-bs-theme') || root?.getAttribute('data-theme');
  return theme === 'dark' ? 'dark' : 'light';
};

const resolveIconPath = (name) => {
  const normalized = normalizeName(name);
  if (!normalized) return assetUrl(FALLBACK_ICON);
  const folder = getTheme() === 'dark' ? 'duotone-dark' : 'duotone-light';
  return assetUrl(`${ICON_ROOT}/${folder}/${normalized}.svg`);
};

const ensureFallbackHandler = (img) => {
  if (img.dataset.iconFallbackBound === 'true') return;
  img.dataset.iconFallbackBound = 'true';
  img.addEventListener('error', () => {
    if (img.src.endsWith('/info.svg')) return;
    img.src = assetUrl(FALLBACK_ICON);
  });
};

const applyAlt = (img, alt) => {
  if (alt === undefined) return;
  img.alt = alt;
  if (alt === '') {
    img.setAttribute('aria-hidden', 'true');
  } else {
    img.removeAttribute('aria-hidden');
  }
};

const applySize = (img, size) => {
  const finalSize = toSize(size ?? img.dataset.iconSize);
  img.dataset.iconSize = String(finalSize);
  img.width = finalSize;
  img.height = finalSize;
};

const applySource = (img) => {
  const name = img.dataset.iconName;
  img.src = resolveIconPath(name);
  ensureFallbackHandler(img);
};

export function initIcons() {
  if (observerAttached || typeof document === 'undefined') return;
  observerAttached = true;
  const root = document.documentElement;
  if (!root) return;
  const observer = new MutationObserver(() => {
    refreshIcons();
  });
  observer.observe(root, { attributes: true, attributeFilter: ['data-bs-theme', 'data-theme'] });
}

export function refreshIcons(root = document) {
  if (!root) return;
  root.querySelectorAll('img[data-icon-name]').forEach((img) => {
    applySource(img);
  });
}

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

export function createIcon({ name, size = DEFAULT_SIZE, alt = '', className } = {}) {
  const img = document.createElement('img');
  img.decoding = 'async';
  img.loading = 'lazy';
  updateIcon(img, { name, size, alt, className });
  return img;
}

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
