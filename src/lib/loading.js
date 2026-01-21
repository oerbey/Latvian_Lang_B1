let overlayEl = null;
let messageEl = null;

function ensureOverlay() {
  if (typeof document === 'undefined') return null;
  if (overlayEl && overlayEl.isConnected) return overlayEl;

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
