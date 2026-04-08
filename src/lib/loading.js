/**
 * loading.js — Full-page loading overlay with spinner and message.
 * =================================================================
 * Provides showLoading / hideLoading functions used by game-base.js
 * to display a loading state while data is being fetched. The overlay
 * is created lazily on first use and reused across pages.
 *
 * Key exports:
 *   showLoading(message)  — Show the overlay with an optional message.
 *   hideLoading()         — Hide the overlay and clear the message.
 */
let overlayEl = null;
let messageEl = null;

/**
 * Ensure loading overlay element exists and is mounted to DOM.
 * Reuses server-rendered element if available, otherwise creates on-demand.
 * @returns {HTMLElement | null}
 */
function ensureOverlay() {
  if (typeof document === 'undefined') return null;
  if (overlayEl && overlayEl.isConnected) return overlayEl;

  // Reuse server-rendered/static markup first, otherwise create overlay lazily.
  overlayEl = document.getElementById('llb1-loading-overlay');
  if (overlayEl) {
    messageEl = overlayEl.querySelector('[data-loading-message]');
    return overlayEl;
  }

  overlayEl = document.createElement('div');
  overlayEl.id = 'llb1-loading-overlay';
  overlayEl.className = 'llb1-loading-overlay';
  overlayEl.setAttribute('role', 'status');
  overlayEl.setAttribute('aria-live', 'polite');
  overlayEl.setAttribute('aria-atomic', 'true');
  overlayEl.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'llb1-loading-panel';

  const spinner = document.createElement('div');
  spinner.className = 'llb1-loading-spinner';
  spinner.setAttribute('aria-hidden', 'true');

  messageEl = document.createElement('div');
  messageEl.className = 'llb1-loading-message';
  messageEl.dataset.loadingMessage = 'true';
  messageEl.textContent = 'Loading...';

  panel.appendChild(spinner);
  panel.appendChild(messageEl);
  overlayEl.appendChild(panel);

  if (document.body) {
    document.body.appendChild(overlayEl);
  } else {
    document.documentElement.appendChild(overlayEl);
  }

  return overlayEl;
}

/**
 * Show loading overlay with optional message; sets aria-busy on body.
 * @param {string} [message='Loading...']
 * @returns {boolean}
 */
export function showLoading(message = 'Loading...') {
  const overlay = ensureOverlay();
  if (!overlay) return false;
  if (messageEl) messageEl.textContent = message;
  overlay.hidden = false;
  if (document.body) {
    document.body.setAttribute('aria-busy', 'true');
  }
  return true;
}

/**
 * Hide loading overlay and remove aria-busy attribute from body.
 * @returns {boolean}
 */
export function hideLoading() {
  if (!overlayEl || !overlayEl.isConnected) {
    overlayEl = document.getElementById('llb1-loading-overlay');
  }
  if (!overlayEl) return false;
  overlayEl.hidden = true;
  if (document.body) {
    document.body.removeAttribute('aria-busy');
  }
  return true;
}
