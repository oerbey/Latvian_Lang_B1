# Code Quality Issues — Latvian_Lang_B1

This document catalogs code quality issues, code smells, and refactoring opportunities identified in the codebase.

---

## Issue: Duplicated Utility Functions Across Modules

**Priority**: High  
**Category**: Code Quality, DRY Principle  
**Effort**: Medium

### Current State

Multiple utility functions are duplicated across different modules:

| Function               | Locations                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `shuffle()`            | `src/lib/state.js`, `src/games/duty-dispatcher/index.js`                                        |
| `assetUrl()`           | `app.js`, `src/games/travel-tracker/index.js`, `src/lib/personality-data.js`                    |
| `clone()`/`deepCopy()` | `app.js`, `src/games/endings-builder/index.js`, `src/games/endings-builder/endings-resolver.js` |
| Seeded RNG             | `src/lib/state.js` (`mulberry32`), `src/games/travel-tracker/utils.js` (`createSeededRng`)      |

### Problem

- Violates DRY (Don't Repeat Yourself) principle
- Changes must be made in multiple places
- Inconsistent implementations may cause subtle bugs
- Increases bundle size unnecessarily

### Recommendation

Create a shared utilities module:

```javascript
// src/lib/utils.js
export function shuffle(arr, rng = Math.random) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

export const clone = (value) => JSON.parse(JSON.stringify(value));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### Impact

- Reduced code duplication by ~40%
- Single source of truth for utility functions
- Easier maintenance and testing
- Smaller bundle size

### References

- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)

---

## Issue: Magic Numbers Throughout Codebase

**Priority**: Medium  
**Category**: Code Quality, Readability  
**Effort**: Small

### Current State

Magic numbers appear in multiple files without explanation:

```javascript
// src/lib/match.js
if (maxItems === 0) {
  /* ... */
}
const boxH = isMobile ? 80 : 56;
const gap = isMobile ? 16 : 14;

// src/lib/state.js
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

// app.js
const minSize = isMobile ? 14 : 12;
const scaleFactor = isMobile ? Math.min(2, 0.9 / scale) : Math.min(1.3, scale + 0.3);
```

### Problem

- Numbers lack semantic meaning
- Difficult to understand intent
- Risk of inconsistent values across the codebase
- Hard to adjust for different screen sizes

### Recommendation

**Before:**

```javascript
const boxH = isMobile ? 80 : 56;
const gap = isMobile ? 16 : 14;
```

**After:**

```javascript
// src/lib/constants.js
export const LAYOUT = {
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
  BREAKPOINT_SCALE: 0.7,
};

// Usage
import { LAYOUT } from './constants.js';
const config = isMobile ? LAYOUT.MOBILE : LAYOUT.DESKTOP;
const boxH = config.BOX_HEIGHT;
```

### Impact

- Improved code readability
- Easier configuration changes
- Consistent values across modules
- Self-documenting code

---

## Issue: Long Functions Exceeding 50 Lines

**Priority**: Medium  
**Category**: Code Quality, Single Responsibility  
**Effort**: Large

### Current State

Several functions exceed recommended length:

| Function                   | File               | Lines           |
| -------------------------- | ------------------ | --------------- |
| `drawMatch()`              | `src/lib/match.js` | ~120 lines      |
| `travel-tracker/index.js`  | Various            | 784 lines total |
| `matching-game.js`         | Multiple functions | 768 lines total |
| `duty-dispatcher/index.js` | Various            | 519 lines total |
| `endings-builder/index.js` | Various            | 534 lines total |

### Problem

- Violates Single Responsibility Principle
- Difficult to test individual behaviors
- Hard to understand and maintain
- High cognitive load for developers

### Recommendation

Extract logical units into smaller functions:

**Before (`drawMatch` excerpt):**

```javascript
export function drawMatch() {
  const ms = state.matchState;
  clear();
  resetClicks();
  // ... 120+ lines of drawing, event handling, and state management
}
```

**After:**

```javascript
// src/lib/match/draw.js
export function drawMatch() {
  const ms = state.matchState;
  clear();
  resetClicks();

  const context = createDrawContext(ms);
  drawHeader(context);
  drawColumns(context);
  drawScrollIndicators(context);
  setupAccessibility(context);
}

function drawHeader({ ms, targetLabel }) {
  drawText(`MATCH RUSH — LV → ${targetLabel}`, 28, 40, { font: 'bold 22px system-ui' });
  drawStatusBar(ms);
  drawFeedback(ms);
}

function drawColumns({ ms, left, right, config }) {
  drawColumn(ms.left, config.leftX, 'L');
  drawColumn(ms.right, config.rightX, 'R');
}
```

### Impact

- Each function has one clear purpose
- Easier to test individual components
- Improved code readability
- Better maintainability

---

## Issue: Inconsistent Error Handling

**Priority**: High  
**Category**: Code Quality, Reliability  
**Effort**: Medium

### Current State

Error handling varies significantly across the codebase:

```javascript
// app.js - catches and logs
try {
  await loadTranslations(lang);
} catch (err) {
  console.error('Failed to load translations', err);
  alert('Failed to load translations');
}

// travel-tracker/index.js - throws
async function loadJSON(path) {
  const res = await fetch(assetUrl(path), { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// endings-builder/index.js - uses fallback silently
try {
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (!raw) return {};
  return JSON.parse(raw);
} catch (_) {
  return {}; // Silent failure
}
```

### Problem

- Inconsistent user experience on errors
- Some errors silently fail
- No centralized error tracking
- Debugging difficult in production

### Recommendation

Create a standardized error handling module:

```javascript
// src/lib/error-handler.js
const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  FATAL: 'fatal',
};

class AppError extends Error {
  constructor(message, { code, severity = ErrorSeverity.ERROR, context = {} } = {}) {
    super(message);
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export function handleError(error, { showUser = true, fallback = null } = {}) {
  console.error('[App Error]', error);

  // Log to analytics if available
  if (window.gtag) {
    gtag('event', 'exception', {
      description: error.message,
      fatal: error.severity === ErrorSeverity.FATAL,
    });
  }

  if (showUser && error.severity !== ErrorSeverity.INFO) {
    showErrorToast(error.message);
  }

  return fallback;
}

export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    handleError(
      new AppError('Failed to parse JSON', {
        severity: ErrorSeverity.WARNING,
        context: { input: str?.substring(0, 100) },
      }),
      { showUser: false },
    );
    return fallback;
  }
}
```

### Impact

- Consistent error handling across the app
- Better debugging experience
- User-friendly error messages
- Optional error tracking integration

---

## Issue: Direct DOM Manipulation Without Null Checks

**Priority**: High  
**Category**: Code Quality, Reliability  
**Effort**: Small

### Current State

Multiple files access DOM elements without checking if they exist:

```javascript
// app.js
document.querySelector('.week-badge').textContent = i18n.badge;
document.getElementById('title').textContent = i18n.gameTitle;

// duty-dispatcher/index.js
const selectors = {
  title: document.getElementById('ddTitle'),
  instructions: document.getElementById('ddInstructions'),
  // ... all accessed without checks later
};
```

### Problem

- Runtime errors if elements are missing
- Difficult to debug in production
- No graceful degradation
- Tests require full DOM setup

### Recommendation

**Before:**

```javascript
document.getElementById('title').textContent = 'Hello';
```

**After:**

```javascript
// Option 1: Null-safe access
const titleEl = document.getElementById('title');
if (titleEl) titleEl.textContent = 'Hello';

// Option 2: Safe selector utility
function safeSelect(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    console.warn(`Element not found: ${selector}`);
  }
  return el;
}

// Option 3: Required element with error
function requireElement(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required element #${id} not found`);
  return el;
}
```

### Impact

- Prevents runtime errors
- Better error messages for debugging
- Graceful degradation when elements missing
- Easier testing with partial DOM

---

## Issue: Mutable State Object

**Priority**: High  
**Category**: Code Quality, Predictability  
**Effort**: Large

### Current State

`src/lib/state.js` exports a mutable state object that is modified directly throughout the codebase:

```javascript
export const state = {
  mode: MODES.MATCH,
  difficulty: 'practice',
  deckSizeMode: 'auto',
  roundIndex: 0,
  rng: mulberry32(Date.now() >>> 0),
  matchState: null,
  forgeState: null,
  results: [],
  showHelp: false,
  DATA: null,
  targetLang: 'en',
};

// Modified directly everywhere
state.mode = MODES.FORGE;
state.roundIndex++;
state.matchState = {
  /* ... */
};
```

### Problem

- No control over state changes
- Difficult to track what changed and when
- Race conditions possible
- Testing requires resetting global state
- No state history or undo capability

### Recommendation

Implement a simple state management pattern:

```javascript
// src/lib/state-manager.js
const listeners = new Set();
let state = {
  mode: 'MATCH',
  difficulty: 'practice',
  // ... other properties
};

export function getState() {
  return { ...state }; // Return copy to prevent direct mutation
}

export function setState(updates) {
  const prevState = { ...state };
  state = { ...state, ...updates };

  const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isDev) {
    console.log('[State Update]', { prev: prevState, next: state, diff: updates });
  }

  listeners.forEach((fn) => fn(state, prevState));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Usage
import { getState, setState, subscribe } from './state-manager.js';

setState({ mode: 'FORGE' });
const unsubscribe = subscribe((state) => redraw());
```

### Impact

- Predictable state changes
- Easy debugging with state logs
- Reactive updates via subscriptions
- Testable state management
- Foundation for undo/redo features

---

## Issue: Inconsistent Code Style

**Priority**: Low  
**Category**: Code Quality, Consistency  
**Effort**: Small

### Current State

Inconsistent formatting observed:

```javascript
// Some files use no spaces in control structures
if (maxItems === 0) {
  /* ... */
}
for (let i = arr.length - 1; i > 0; i--) {
  /* ... */
}

// Others use proper spacing
if (maxItems === 0) {
  /* ... */
}
for (let i = arr.length - 1; i > 0; i--) {
  /* ... */
}

// Variable naming inconsistencies
const ms = state.matchState; // Abbreviated
const shuffledLevels = seededShuffle(baseLevels, rng); // Full name
```

### Problem

- Inconsistent reading experience
- Can indicate varying code quality
- Harder for new contributors
- Review noise for formatting

### Recommendation

1. Add `.prettierrc.json` (if not present in working copy):

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true
}
```

2. Add ESLint configuration:

```json
{
  "extends": ["eslint:recommended"],
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "env": { "browser": true, "node": true },
  "rules": {
    "no-unused-vars": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

3. Add pre-commit hook with husky + lint-staged

### Impact

- Consistent code style
- Automated formatting
- Reduced review friction
- Professional codebase appearance

---

## Summary Table

| Issue                       | Priority | Effort | Category       |
| --------------------------- | -------- | ------ | -------------- |
| Duplicated Utilities        | High     | Medium | DRY            |
| Magic Numbers               | Medium   | Small  | Readability    |
| Long Functions              | Medium   | Large  | SRP            |
| Inconsistent Error Handling | High     | Medium | Reliability    |
| Missing Null Checks         | High     | Small  | Reliability    |
| Mutable State Object        | High     | Large  | Predictability |
| Inconsistent Code Style     | Low      | Small  | Consistency    |
