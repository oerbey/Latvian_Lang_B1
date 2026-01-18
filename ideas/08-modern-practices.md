# Modern Practices — Latvian_Lang_B1

This document covers modern JavaScript patterns, web development best practices, and technology updates.

---

## Issue: No TypeScript Adoption

**Priority**: Medium  
**Category**: Modern Practices, Type Safety  
**Effort**: Large  

### Current State

The project uses vanilla JavaScript without type checking:

```javascript
// src/lib/state.js
export const state = {
  mode: MODES.MATCH,
  difficulty: 'practice',
  deckSizeMode: 'auto',
  roundIndex: 0,
  // ... no type definitions
};
```

### Problem

- No compile-time type checking
- Runtime type errors possible
- IDE support limited
- Refactoring more risky

### Recommendation

Adopt TypeScript gradually using JSDoc annotations (no build step required):

```javascript
// src/lib/state.js

/**
 * @typedef {'MATCH' | 'FORGE'} GameMode
 */

/**
 * @typedef {'practice' | 'challenge'} Difficulty
 */

/**
 * @typedef {'auto' | 'full'} DeckSizeMode
 */

/**
 * @typedef {Object} MatchItem
 * @property {string} txt - Display text
 * @property {string} key - Unique identifier (Latvian word)
 * @property {Object} meta - Original entry metadata
 */

/**
 * @typedef {Object} MatchState
 * @property {MatchItem[]} left - Left column items
 * @property {MatchItem[]} right - Right column items
 * @property {{side: 'L'|'R', key: string}|null} selected - Currently selected item
 * @property {Set<string>} solved - Solved item keys
 * @property {number} correct - Correct matches count
 * @property {number} total - Total pairs count
 * @property {number} start - Start timestamp
 * @property {number} lives - Remaining lives (Infinity for practice)
 * @property {string|null} feedback - Current feedback message
 * @property {number} errors - Error count
 * @property {Object[]} detail - Detailed results
 * @property {number} scrollY - Scroll position
 * @property {number} contentH - Content height
 * @property {number} viewTop - Visible area top
 * @property {number} viewBottom - Visible area bottom
 */

/**
 * @typedef {Object} GameState
 * @property {GameMode} mode
 * @property {Difficulty} difficulty
 * @property {DeckSizeMode} deckSizeMode
 * @property {number} roundIndex
 * @property {() => number} rng
 * @property {MatchState|null} matchState
 * @property {ForgeState|null} forgeState
 * @property {GameResult[]} results
 * @property {boolean} showHelp
 * @property {VocabularyData|null} DATA
 * @property {'en'|'ru'} targetLang
 */

/** @type {GameState} */
export const state = {
  mode: 'MATCH',
  difficulty: 'practice',
  // ... IDE now has type information
};
```

Enable type checking with tsconfig:

```json
// jsconfig.json (or tsconfig.json)
{
  "compilerOptions": {
    "checkJs": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "test"]
}
```

### Impact
- Type safety without TypeScript migration
- Better IDE support
- Catch errors early
- Self-documenting code

---

## Issue: No CI/CD Pipeline

**Priority**: High  
**Category**: Modern Practices, DevOps  
**Effort**: Medium  

### Current State

No GitHub Actions or other CI/CD configuration found.

### Problem

- Tests not run automatically
- No automated deployments
- Quality checks manual
- Regressions can be merged

### Recommendation

Create comprehensive GitHub Actions workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check formatting
        run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Build offline bundles
        run: python scripts/build_week1_offline.py
      
      - name: Verify build output
        run: |
          test -f i18n/offline.js
          test -f data/week1.offline.js

  deploy:
    needs: [lint, test, build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Build offline bundles
        run: python scripts/build_week1_offline.py
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Impact
- Automated quality checks
- Consistent deployments
- Faster feedback on PRs
- Professional development workflow

---

## Issue: No Service Worker Update Strategy

**Priority**: Medium  
**Category**: Modern Practices, PWA  
**Effort**: Medium  

### Current State

Service worker registration exists but update handling is minimal:

```javascript
// scripts/page-init.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
```

### Problem

- Users might have stale cached versions
- No notification when update available
- No control over cache invalidation
- Hard refresh required for updates

### Recommendation

Implement proper service worker lifecycle:

```javascript
// sw.js
const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `llb1-${CACHE_VERSION}`;

// IMPORTANT: avoid absolute paths ("/...") on GitHub Pages project sites.
// Keep entries relative (no leading "/") so it works under
// https://<user>.github.io/<repo>/ as well as on localhost.
const STATIC_ASSETS = [
  'index.html',
  'week1.html',
  'app.js',
  'styles.css',
  'i18n/lv.json',
  'i18n/en.json',
  'data/lv-en/units.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('llb1-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

// Send update message to clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

```javascript
// src/lib/sw-updater.js
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Use a relative path so registration works on GitHub Pages project sites.
  navigator.serviceWorker.register('sw.js')
    .then(registration => {
      // Check for updates periodically
      setInterval(() => registration.update(), 60 * 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            showUpdateNotification(() => {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            });
          }
        });
      });
    });

  // Reload when new service worker takes over
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

function showUpdateNotification(onUpdate) {
  const toast = document.createElement('div');
  toast.className = 'update-toast';
  toast.innerHTML = `
    <p>A new version is available!</p>
    <button class="btn btn-primary btn-sm">Update Now</button>
  `;
  
  toast.querySelector('button').addEventListener('click', () => {
    onUpdate();
    toast.remove();
  });
  
  document.body.appendChild(toast);
}
```

### Impact
- Smooth update experience
- No stale content
- Better offline support
- User-friendly update prompts

---

## Issue: No Error Boundary/Crash Reporting

**Priority**: Medium  
**Category**: Modern Practices, Reliability  
**Effort**: Small  

### Current State

Errors can crash the app without recovery:

```javascript
// No global error handling
startInit().catch(console.error);
```

### Problem

- Unhandled errors crash the app
- No visibility into production errors
- Users see blank screens
- No telemetry for debugging

### Recommendation

Implement global error handling:

```javascript
// src/lib/error-boundary.js
const ERROR_REPORT_URL = '/api/errors'; // Or Sentry, LogRocket, etc.

export function setupErrorBoundary() {
  // Catch synchronous errors
  window.onerror = (message, source, lineno, colno, error) => {
    handleError({
      type: 'uncaught',
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    showErrorUI();
    return true; // Prevent default
  };

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    handleError({
      type: 'unhandled_promise',
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    });
    showErrorUI();
    event.preventDefault();
  });
}

function handleError(errorInfo) {
  console.error('[App Error]', errorInfo);

  // Send to analytics (optional)
  if (navigator.sendBeacon && !location.hostname.includes('localhost')) {
    navigator.sendBeacon(ERROR_REPORT_URL, JSON.stringify({
      ...errorInfo,
      url: location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }));
  }
}

function showErrorUI() {
  const errorScreen = document.getElementById('error-screen');
  if (errorScreen) {
    errorScreen.hidden = false;
  } else {
    // Create fallback error UI
    document.body.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h1>Something went wrong</h1>
        <p>Please refresh the page to try again.</p>
        <button onclick="location.reload()">Refresh</button>
      </div>
    `;
  }
}
```

### Impact
- Graceful error handling
- Better user experience on errors
- Error visibility for debugging
- Crash analytics

---

## Issue: No Feature Flags

**Priority**: Low  
**Category**: Modern Practices, Feature Management  
**Effort**: Small  

### Current State

No feature flag system. All features are always enabled.

### Problem

- Can't test features in production safely
- Can't gradually roll out changes
- Can't quickly disable broken features
- A/B testing not possible

### Recommendation

Implement simple feature flags:

```javascript
// src/lib/features.js
const DEFAULT_FLAGS = {
  enableNewScoring: false,
  showHints: true,
  enableAudioPronunciation: false,
  darkModeDefault: false,
  experimentalGames: false,
};

let flags = { ...DEFAULT_FLAGS };

export function initFeatureFlags() {
  // Load from localStorage (for overrides)
  try {
    const saved = localStorage.getItem('llb1:feature-flags');
    if (saved) {
      flags = { ...flags, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load feature flags');
  }

  // Load from URL (for testing)
  const params = new URLSearchParams(location.search);
  for (const [key, value] of params) {
    if (key.startsWith('ff_')) {
      const flag = key.slice(3);
      if (flag in flags) {
        flags[flag] = value === 'true';
      }
    }
  }
}

export function isEnabled(flag) {
  return flags[flag] ?? false;
}

export function setFlag(flag, value) {
  flags[flag] = value;
  localStorage.setItem('llb1:feature-flags', JSON.stringify(flags));
}

// Usage
import { isEnabled } from './features.js';

if (isEnabled('enableNewScoring')) {
  applyNewScoringSystem();
}
```

### Impact
- Safe feature rollouts
- Easy feature testing
- Quick kill switch for bugs
- Foundation for A/B testing

---

## Issue: No Structured Logging

**Priority**: Low  
**Category**: Modern Practices, Debugging  
**Effort**: Small  

### Current State

Console logging is scattered and inconsistent:

```javascript
console.log('Connecting to DB...');
console.warn('Failed to fetch translations', lang, err);
console.error('Failed to load translations', err);
```

### Problem

- Hard to filter logs
- No log levels in production
- No structured data
- Debugging harder

### Recommendation

Create a logging utility:

```javascript
// src/lib/logger.js
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

const IS_DEV = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const DEFAULT_LOG_LEVEL = IS_DEV ? LogLevel.DEBUG : LogLevel.WARN;

class Logger {
  constructor(namespace) {
    this.namespace = namespace;
    this.level = DEFAULT_LOG_LEVEL;
  }

  debug(message, data = {}) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message, data = {}) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message, data = {}) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message, data = {}) {
    this.log(LogLevel.ERROR, message, data);
  }

  log(level, message, data) {
    if (level < this.level) return;

    const entry = {
      timestamp: new Date().toISOString(),
      namespace: this.namespace,
      level: Object.keys(LogLevel).find(k => LogLevel[k] === level),
      message,
      ...data,
    };

    const method = level >= LogLevel.ERROR ? 'error' 
                 : level >= LogLevel.WARN ? 'warn'
                 : level >= LogLevel.INFO ? 'info'
                 : 'debug';

    console[method](`[${this.namespace}]`, message, data);
  }
}

export function createLogger(namespace) {
  return new Logger(namespace);
}

// Usage
import { createLogger } from './logger.js';
const log = createLogger('Match');

log.info('Starting round', { deckSize: 15, difficulty: 'practice' });
log.warn('Failed to load', { error: err.message });
```

### Impact
- Consistent logging
- Filterable by namespace
- Structured data
- Production-safe

---

## Issue: Accessibility Could Use ARIA Live Regions Better

**Priority**: Medium  
**Category**: Modern Practices, Accessibility  
**Effort**: Small  

### Current State

ARIA live regions exist but could be improved:

```javascript
// Creates new buttons on every render
const li = document.createElement('li');
const btn = document.createElement('button');
btn.addEventListener('click', () => handleSelection(side, it));
```

### Problem

- Screen reader announcements might be missed
- Dynamic content updates not always announced
- Focus management could be better

### Recommendation

Improve ARIA implementation:

```javascript
// src/lib/a11y.js
export function announce(message, priority = 'polite') {
  const region = document.getElementById('aria-live-region');
  if (!region) return;

  // Clear and set to trigger announcement
  region.textContent = '';
  region.setAttribute('aria-live', priority);
  
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

export function manageFocus(element) {
  if (!element) return;
  
  // Save previous focus
  const previousFocus = document.activeElement;
  
  // Move focus
  element.focus();
  
  // Return function to restore focus
  return () => previousFocus?.focus();
}

// Usage in games
announce('Correct! 5 out of 10 pairs matched.', 'assertive');
announce('Your turn. Select a Latvian word.', 'polite');
```

### Impact
- Better screen reader support
- More accessible games
- WCAG compliance
- Wider audience

---

## Modern JavaScript Features to Adopt

### Already Used ✅
- ES Modules (`import`/`export`)
- Arrow functions
- Template literals
- `const`/`let`
- Destructuring
- Async/await
- Optional chaining (`?.`)
- Nullish coalescing (`??`)

### Consider Adopting
```javascript
// 1. Private class fields
class Game {
  #score = 0;  // Private field
  
  get score() { return this.#score; }
  incrementScore() { this.#score++; }
}

// 2. Top-level await (already used in some files)
const data = await loadData();

// 3. Array.at() for negative indexing
const last = items.at(-1);

// 4. Object.hasOwn() instead of hasOwnProperty
if (Object.hasOwn(obj, 'key')) { /* ... */ }

// 5. structuredClone for deep cloning (Safari 15.4+)
const copy = structuredClone(original);
// Fallback needed for older browsers

// 6. AbortController for cancellable fetches
const controller = new AbortController();
const res = await fetch(url, { signal: controller.signal });
controller.abort(); // Cancel if needed
```

---

## Summary Table

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| No TypeScript/JSDoc Types | Medium | Large | Type safety |
| No CI/CD Pipeline | High | Medium | Automation |
| No SW Update Strategy | Medium | Medium | UX |
| No Error Boundary | Medium | Small | Reliability |
| No Feature Flags | Low | Small | Flexibility |
| No Structured Logging | Low | Small | Debugging |
| ARIA Improvements | Medium | Small | Accessibility |
