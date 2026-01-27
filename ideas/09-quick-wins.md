# Quick Wins — Latvian_Lang_B1

This document catalogs low-effort, high-impact improvements that can be implemented quickly.

---

## 🎯 Overview

Quick wins are improvements that:

- Take **less than 1 day** to implement
- Require **minimal risk** of breaking changes
- Provide **immediate value**
- Often involve **small code changes**

---

## Quick Win #1: Add Null Checks for DOM Elements

**Effort**: 30 minutes  
**Impact**: Prevents runtime errors  
**Risk**: None

### Problem

DOM elements are accessed without null checks, causing crashes if HTML structure changes.

### Fix

```javascript
// Before
document.getElementById('title').textContent = 'Hello';

// After
const titleEl = document.getElementById('title');
if (titleEl) titleEl.textContent = 'Hello';

// Or create a utility
function $(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Element #${id} not found`);
  return el;
}

$('title')?.textContent = 'Hello';
```

### Files to Update

- `app.js` - Multiple getElementById calls
- `src/games/*/index.js` - Selector objects

---

## Quick Win #2: Add SRI Hashes to CDN Resources

**Effort**: 15 minutes  
**Impact**: Security hardening  
**Risk**: None

### Problem

External scripts load without integrity verification.

### Fix

```html
<!-- Before -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>

<!-- After -->
<script
  src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
  integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
  crossorigin="anonymous"
></script>
```

### How to Generate

```bash
# Get hash from jsDelivr
curl -s https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Or visit: https://www.srihash.org/

---

## Quick Win #3: Extract Magic Numbers to Constants

**Effort**: 1 hour  
**Impact**: Improved readability and maintainability  
**Risk**: Very low

### Problem

Magic numbers scattered throughout the code.

### Fix

```javascript
// Create: src/lib/constants.js
export const LAYOUT = {
  MOBILE_BREAKPOINT: 0.7,
  MOBILE: {
    BOX_HEIGHT: 80,
    GAP: 16,
    MIN_FONT_SIZE: 14,
  },
  DESKTOP: {
    BOX_HEIGHT: 56,
    GAP: 14,
    MIN_FONT_SIZE: 12,
  },
  CANVAS: {
    WIDTH: 980,
    DEFAULT_HEIGHT: 560,
  },
};

export const GAME = {
  STREAK_BONUS_INTERVAL: 5,
  STREAK_BONUS_POINTS: 10,
  CHALLENGE_LIVES: 3,
};

export const ANIMATION = {
  BUS_MS: 1100,
  CONFETTI_LIFE: 60,
  FEEDBACK_DURATION_MS: 300,
};

// Usage
import { LAYOUT, GAME } from './constants.js';

const boxH = isMobile ? LAYOUT.MOBILE.BOX_HEIGHT : LAYOUT.DESKTOP.BOX_HEIGHT;
if (streak % GAME.STREAK_BONUS_INTERVAL === 0) {
  /* ... */
}
```

---

## Quick Win #4: Audit & Extend package.json

**Effort**: 15 minutes  
**Impact**: Project management, CI/CD readiness  
**Risk**: None

### Fix

The repository already contains a `package.json`. The quick win is to make sure it covers the basics for contributors and CI:

- `npm run start` (local dev server)
- `npm test` (Node test runner)
- `npm run build:offline` (offline bundling script)
- optionally `lint` / `format` / `coverage`

Example minimal scripts section:

```json
{
  "scripts": {
    "start": "npx http-server . -p 3000 -c-1",
    "test": "node --test",
    "test:watch": "node --test --watch",
    "build:offline": "python scripts/build_week1_offline.py"
  }
}
```

---

## Quick Win #5: Add jsconfig.json for Better IDE Support

**Effort**: 5 minutes  
**Impact**: Better IntelliSense and navigation  
**Risk**: None

### Fix

Create `jsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "checkJs": false,
    "baseUrl": ".",
    "paths": {
      "@lib/*": ["src/lib/*"],
      "@games/*": ["src/games/*"]
    }
  },
  "include": ["src/**/*", "app.js", "scripts/**/*"],
  "exclude": ["node_modules", "test"]
}
```

---

## Quick Win #6: Add Resource Preloading Hints

**Effort**: 10 minutes  
**Impact**: Faster page loads  
**Risk**: None

### Fix

Add to `<head>` section of HTML files:

```html
<!-- Preconnect to CDNs -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin />

<!-- Preload critical resources -->
<link rel="preload" href="i18n/lv.json" as="fetch" crossorigin />
<link rel="preload" href="app.js" as="script" />

<!-- Prefetch next likely resources -->
<link rel="prefetch" href="data/lv-en/units.json" />
```

---

## Quick Win #7: Add Basic Error Page

**Effort**: 20 minutes  
**Impact**: Better UX on errors  
**Risk**: None

### Fix

Add error handling UI:

```html
<!-- Add to HTML body -->
<div id="error-screen" hidden class="error-overlay">
  <div class="error-content">
    <h1>😕 Something went wrong</h1>
    <p>The game encountered an error. Please try refreshing the page.</p>
    <button onclick="location.reload()" class="btn btn-primary">Refresh Page</button>
  </div>
</div>
```

```css
/* Add to styles.css */
.error-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.error-content {
  text-align: center;
  color: white;
  padding: 2rem;
}
```

```javascript
// Add to app.js initialization
window.onerror = () => {
  document.getElementById('error-screen')?.removeAttribute('hidden');
  return true;
};
```

---

## Quick Win #8: Consolidate Duplicate Utility Functions

**Effort**: 45 minutes  
**Impact**: Reduced code duplication, easier maintenance  
**Risk**: Low (needs testing)

### Fix

Create `src/lib/utils.js`:

```javascript
/**
 * Create asset URL relative to document base
 */
export function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

/**
 * Deep clone an object
 */
export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Shuffle array in place using Fisher-Yates
 */
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pick random element from array
 */
export function choice(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
```

Update imports in other files:

```javascript
// Before
const deepCopy = (value) => JSON.parse(JSON.stringify(value));

// After
import { clone } from './lib/utils.js';
```

---

## Quick Win #9: Add Loading State to Games

**Effort**: 30 minutes  
**Impact**: Better perceived performance  
**Risk**: None

### Fix

Improve loading indicator:

```html
<!-- Existing loading element -->
<div id="loading" class="loading-overlay">
  <div class="loading-spinner"></div>
  <p class="loading-text">Loading...</p>
  <div class="loading-progress">
    <div class="loading-progress-bar"></div>
  </div>
</div>
```

```css
.loading-progress {
  width: 200px;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 1rem;
}

.loading-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4a9eff, #9b59b6);
  width: 0%;
  transition: width 0.3s ease;
}
```

```javascript
function updateLoadingProgress(percent, message) {
  const bar = document.querySelector('.loading-progress-bar');
  const text = document.querySelector('.loading-text');
  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = message || 'Loading...';
}

// Usage during init
updateLoadingProgress(25, 'Loading translations...');
await loadTranslations();
updateLoadingProgress(50, 'Loading vocabulary...');
await loadVocabulary();
updateLoadingProgress(100, 'Ready!');
```

---

## Quick Win #10: Add Keyboard Shortcut Reference

**Effort**: 20 minutes  
**Impact**: Better discoverability  
**Risk**: None

### Fix

Add visible shortcut hints:

```html
<!-- Add tooltip to buttons -->
<button id="mode-match" title="Match Rush (Press 1)">▶ Match Rush</button>
<button id="mode-forge" title="Prefix Forge (Press 2)">▶ Prefix Forge</button>
<button id="btn-help" title="Help (Press H)">?</button>
```

Update keyboard shortcut display:

```javascript
// Show shortcuts on first visit
if (!localStorage.getItem('llb1:shortcuts-shown')) {
  showShortcutsToast();
  localStorage.setItem('llb1:shortcuts-shown', 'true');
}

function showShortcutsToast() {
  const toast = document.createElement('div');
  toast.className = 'shortcuts-toast';
  toast.innerHTML = `
    <p><strong>Keyboard shortcuts:</strong></p>
    <p><kbd>1</kbd> Match | <kbd>2</kbd> Forge | <kbd>H</kbd> Help | <kbd>R</kbd> Restart</p>
    <button class="btn btn-sm btn-outline-light">Got it</button>
  `;
  toast.querySelector('button').onclick = () => toast.remove();
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 10000);
}
```

---

## Quick Win #11: Add Meta Tags for SEO/Sharing

**Effort**: 10 minutes  
**Impact**: Better sharing and SEO  
**Risk**: None

### Fix

Add to `<head>`:

```html
<!-- Basic meta -->
<meta
  name="description"
  content="Interactive games for learning Latvian vocabulary at B1 level. Practice matching, prefixes, and declensions."
/>
<meta name="keywords" content="Latvian, language learning, vocabulary, B1, games" />
<meta name="author" content="Latvian B1 Team" />

<!-- Open Graph for social sharing -->
<meta property="og:title" content="Latvian B1 Language Games" />
<meta property="og:description" content="Interactive games for learning Latvian vocabulary" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://oerbey.github.io/Latvian_Lang_B1/" />
<meta property="og:image" content="https://oerbey.github.io/Latvian_Lang_B1/assets/og-image.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Latvian B1 Language Games" />
<meta name="twitter:description" content="Interactive games for learning Latvian vocabulary" />
```

---

## Quick Win #12: Add Console Welcome Message

**Effort**: 5 minutes  
**Impact**: Developer experience, branding  
**Risk**: None

### Fix

```javascript
// Add to app.js start
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
if (isDev) {
  console.log(
    `
%c🇱🇻 Latvian B1 Language Games
%c
Welcome, developer! 
Keyboard shortcuts: 1=Match, 2=Forge, H=Help, R=Restart, D=Deck size

Report issues: https://github.com/oerbey/Latvian_Lang_B1/issues
`,
    'font-size: 24px; font-weight: bold; color: #9b2335;',
    'font-size: 12px; color: #666;',
  );
}
```

---

## Implementation Priority

| Quick Win                      | Time | Impact | Priority        |
| ------------------------------ | ---- | ------ | --------------- |
| #4 Audit & extend package.json | 15m  | High   | 🔴 Do First     |
| #2 SRI Hashes                  | 15m  | High   | 🔴 Do First     |
| #1 Null Checks                 | 30m  | High   | 🔴 Do First     |
| #5 jsconfig.json               | 5m   | Medium | 🟠 Do Soon      |
| #6 Preloading                  | 10m  | Medium | 🟠 Do Soon      |
| #8 Consolidate Utils           | 45m  | Medium | 🟠 Do Soon      |
| #3 Constants                   | 1h   | Medium | 🟡 This Week    |
| #7 Error Page                  | 20m  | Medium | 🟡 This Week    |
| #9 Loading State               | 30m  | Medium | 🟡 This Week    |
| #10 Shortcut Reference         | 20m  | Low    | 🟢 Nice to Have |
| #11 Meta Tags                  | 10m  | Low    | 🟢 Nice to Have |
| #12 Console Message            | 5m   | Low    | 🟢 Nice to Have |

---

## Total Time Estimate

**Critical (Do First)**: ~1 hour  
**Important (Do Soon)**: ~1 hour  
**This Week**: ~2 hours  
**Nice to Have**: ~35 minutes

**Total**: ~4.5 hours for all quick wins

---

## Verification Checklist

After implementing quick wins:

- [ ] All pages load without console errors
- [ ] Tests still pass
- [ ] CDN resources load with SRI verification
- [ ] IDE shows proper IntelliSense
- [ ] Loading states display correctly
- [ ] Error boundary catches thrown errors
- [ ] Keyboard shortcuts work as documented
