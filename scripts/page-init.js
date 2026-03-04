/**
 * page-init.js — Shared page bootstrapping script loaded on every page.
 * =====================================================================
 *
 * Responsibilities:
 *   1. Install global error handlers (window.onerror, unhandledrejection).
 *   2. Upgrade any data-icon placeholders to inline SVG icons.
 *   3. Set the copyright year in the footer.
 *   4. Replace default favicon with the Latvian flag SVG.
 *   5. Show / hide an "Offline mode" banner based on navigator.onLine.
 *   6. Adjust body padding-top to account for the fixed nav bar height.
 *   7. Apply an anti-scroll-trap workaround for mobile Safari.
 *   8. Register the service worker (sw.js) and prompt for updates.
 */
import { installGlobalErrorHandlers } from '../src/lib/errors.js';
import { upgradeIcons } from '../src/lib/icon.js';

// --- Step 1–2: Global error handling & icon upgrade ---
installGlobalErrorHandlers();
upgradeIcons();

// --- Step 3: Dynamic copyright year ---
const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

/**
 * Step 4: Replace the default favicon(s) with the Latvian flag SVG icon.
 * If no <link rel="icon"> exists, one is created and appended to <head>.
 */
function applyLatvianFlagFavicon() {
  const flagHref = new URL('assets/icons/latvia-flag.svg', document.baseURI).toString();
  const faviconSelectors = ['link[rel="icon"]', 'link[rel="shortcut icon"]'];
  const existing = document.querySelectorAll(faviconSelectors.join(','));

  if (existing.length > 0) {
    existing.forEach((link) => {
      link.setAttribute('href', flagHref);
      link.setAttribute('type', 'image/svg+xml');
      link.removeAttribute('sizes');
    });
    return;
  }

  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.type = 'image/svg+xml';
  icon.href = flagHref;
  document.head.append(icon);
}

applyLatvianFlagFavicon();

// --- Step 5: Offline mode banner ---
const OFFLINE_BANNER_ID = 'llb1-offline';

/** Create the offline banner element if it doesn't already exist. */
function ensureOfflineBanner() {
  const existing = document.getElementById(OFFLINE_BANNER_ID);
  if (existing) return existing;
  if (!document.body && !document.documentElement) return null;
  const banner = document.createElement('div');
  banner.id = OFFLINE_BANNER_ID;
  banner.className = 'llb1-offline';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.textContent = 'Offline mode';
  (document.body || document.documentElement).appendChild(banner);
  return banner;
}

/** Show or hide the offline banner based on navigator.onLine. */
function updateOfflineBanner() {
  const banner = ensureOfflineBanner();
  if (!banner) return;
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  banner.hidden = !isOffline;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateOfflineBanner, { once: true });
} else {
  updateOfflineBanner();
}

window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

// --- Step 6: Nav offset — adjust body padding for the fixed nav bar ---
const nav = document.querySelector('[data-site-nav]');
const main = document.querySelector('main');
const baseBodyPaddingTop = (() => {
  const padding = Number.parseFloat(getComputedStyle(document.body).paddingTop);
  return Number.isFinite(padding) ? padding : 0;
})();

/**
 * Recalculate body padding-top so page content doesn't sit behind
 * the fixed navigation bar. Called on load, resize, and font-ready events.
 */
function updateNavOffset() {
  if (!nav) return;
  const navStyle = getComputedStyle(nav);
  const navIsFixed = navStyle.position === 'fixed';
  if (!navIsFixed) {
    document.body.style.paddingTop = `${baseBodyPaddingTop}px`;
    return;
  }
  const navHeight = nav.getBoundingClientRect().height;
  let mainMarginTop = 0;
  if (main) {
    const mt = Number.parseFloat(getComputedStyle(main).marginTop);
    mainMarginTop = Number.isFinite(mt) ? mt : 0;
  }
  const extraOffset = Math.max(0, navHeight - (baseBodyPaddingTop + mainMarginTop));
  const totalPadding = baseBodyPaddingTop + extraOffset;
  document.body.style.paddingTop = `${totalPadding}px`;
}

updateNavOffset();
if (document.fonts?.ready) {
  document.fonts.ready.then(updateNavOffset).catch(() => {});
}
window.addEventListener('resize', updateNavOffset);
if ('ResizeObserver' in window && nav) {
  const observer = new ResizeObserver(updateNavOffset);
  observer.observe(nav);
}

/**
 * Anti-scroll-trap for mobile:
 * - Never cancel vertical swipes.
 * - Allow horizontal gestures (for sliders) to preventDefault.
 * - Runs on every element that can vertically scroll OR that might capture touches.
 */
(function () {
  // Make sure the page itself is allowed to scroll
  document.documentElement.style.overflowY = 'auto';
  document.body.style.overflowY = 'auto';

  // If any ancestor wrongly sets touch-action:none, neutralize it up the chain of likely containers.
  const neutralizeTouchAction = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const ta = getComputedStyle(n).touchAction;
      if (ta && ta.includes('none')) n.style.touchAction = 'auto';
    }
  };

  // Find likely scrollable containers (no hard-coded class names needed)
  const candidates = Array.from(document.querySelectorAll('*')).filter((el) => {
    const cs = getComputedStyle(el);
    return /(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflow);
  });

  // Also include any big/fullscreen fixed elements that might eat touches
  const fullscreenFixed = Array.from(document.querySelectorAll('*')).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return (
      r.top <= 0 && r.left <= 0 && r.right >= window.innerWidth && r.bottom >= window.innerHeight
    );
  });

  const targets = [...new Set([...candidates, ...fullscreenFixed])];
  if (targets.length === 0) return;

  targets.forEach((el) => {
    // Encourage browsers (esp. iOS Safari) to treat vertical pan as the default
    el.style.webkitOverflowScrolling = 'touch';
    // Let vertical panning through; allow pinch-zoom
    if (!getComputedStyle(el).touchAction || getComputedStyle(el).touchAction === 'auto') {
      el.style.touchAction = 'pan-y pinch-zoom';
    }
    neutralizeTouchAction(el);

    let sx = 0,
      sy = 0;
    el.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        sx = t.clientX;
        sy = t.clientY;
      },
      { passive: true },
    );

    el.addEventListener(
      'touchmove',
      (e) => {
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - sx);
        const dy = Math.abs(t.clientY - sy);

        const isHorizontal = dx > dy;
        // Only suppress default for horizontal gestures (e.g., custom sliders).
        if (isHorizontal) {
          e.preventDefault(); // requires passive:false
        }
        // If the element itself cannot scroll vertically, let the event bubble so the page can scroll.
        // (Do NOT call preventDefault here.)
      },
      { passive: false },
    );
  });

  // Safety net: if the focused area still can't scroll and fills the screen exactly,
  // make sure there's ever-so-slight page scroll available to escape the trap.
  const root = document.scrollingElement || document.documentElement;
  if (root.scrollHeight <= root.clientHeight) {
    document.body.style.minHeight = 'calc(100dvh + 1px)';
  }
})();

// --- Step 8: Service Worker registration ---
// Register the service worker after the window has fully loaded
function showUpdatePrompt(registration) {
  if (!registration?.waiting) return;
  if (document.getElementById('llb1-sw-update')) return;

  const banner = document.createElement('div');
  banner.id = 'llb1-sw-update';
  banner.className = 'llb1-sw-update';

  const text = document.createElement('span');
  text.textContent = 'Update available — Reload';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Reload';
  button.addEventListener('click', () => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });

  banner.append(text, button);
  document.body.appendChild(banner);
}

window.addEventListener('load', () => {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('sw.js')
    .then((registration) => {
      if (registration.waiting) {
        showUpdatePrompt(registration);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt(registration);
          }
        });
      });
    })
    .catch(() => {});
});
