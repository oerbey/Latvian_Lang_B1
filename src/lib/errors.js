let hasShown = false;
let handlersInstalled = false;

export function formatError(error) {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack || '',
    };
  }
  if (typeof error === 'string') {
    return { message: error, stack: '' };
  }
  return { message: 'Unknown error', stack: '' };
}

function ensureStyles(doc) {
  if (doc.getElementById('llb1-error-styles')) return;
  const style = doc.createElement('style');
  style.id = 'llb1-error-styles';
  style.textContent = `
    .llb1-error-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 9999;
    }
    .llb1-error-panel {
      max-width: 520px;
      width: 100%;
      background: #ffffff;
      color: #0f172a;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.25);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .llb1-error-panel h1 {
      font-size: 1.25rem;
      margin: 0 0 8px;
    }
    .llb1-error-panel p {
      margin: 0 0 16px;
      color: #334155;
    }
    .llb1-error-panel button {
      background: #0ea5e9;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 10px 18px;
      font-weight: 600;
      cursor: pointer;
    }
    .llb1-error-panel button:hover {
      background: #0284c7;
    }
    .llb1-error-panel details {
      margin-top: 16px;
      font-size: 0.9rem;
    }
    .llb1-error-panel pre {
      background: #f1f5f9;
      padding: 12px;
      border-radius: 8px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
  `;
  doc.head ? doc.head.appendChild(style) : doc.documentElement.appendChild(style);
}

function buildOverlay(doc, info) {
  const overlay = doc.createElement('div');
  overlay.id = 'llb1-error-overlay';
  overlay.className = 'llb1-error-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.setAttribute('aria-atomic', 'true');

  const panel = doc.createElement('div');
  panel.className = 'llb1-error-panel';

  const title = doc.createElement('h1');
  title.textContent = 'Something went wrong.';

  const message = doc.createElement('p');
  message.textContent = 'Please try reloading the page.';

  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = 'Reload';
  button.addEventListener('click', () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  });

  const details = doc.createElement('details');
  const summary = doc.createElement('summary');
  summary.textContent = 'Details';
  const pre = doc.createElement('pre');
  const detailText = [info.message, info.stack].filter(Boolean).join('\n');
  pre.textContent = detailText || 'No details available.';

  details.appendChild(summary);
  details.appendChild(pre);

  panel.appendChild(title);
  panel.appendChild(message);
  panel.appendChild(button);
  panel.appendChild(details);
  overlay.appendChild(panel);
  return overlay;
}

export function showFatalError(error) {
  if (hasShown) return false;
  hasShown = true;

  const info = formatError(error);
  if (typeof console !== 'undefined' && console.error) {
    console.error('Fatal error:', error);
  }
  if (typeof document === 'undefined') return true;
  if (document.getElementById('llb1-error-overlay')) return true;

  ensureStyles(document);
  const overlay = buildOverlay(document, info);
  if (document.body) {
    document.body.appendChild(overlay);
  } else {
    document.documentElement.appendChild(overlay);
  }
  return true;
}

export function installGlobalErrorHandlers() {
  if (handlersInstalled) return;
  if (typeof window === 'undefined') return;
  handlersInstalled = true;

  window.addEventListener('error', (event) => {
    const err = event?.error || event?.message || 'Unknown error';
    showFatalError(err);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason || 'Unhandled promise rejection';
    showFatalError(reason);
  });
}

export function isFatalErrorShown() {
  return hasShown;
}

export function resetFatalErrorState() {
  hasShown = false;
  handlersInstalled = false;
}
