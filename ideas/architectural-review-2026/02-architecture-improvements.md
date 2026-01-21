# Architecture & Code Organization Improvements

**Date:** January 20, 2026  
**Category:** Architecture

---

## 🔍 Current State Analysis

The project follows a file-per-feature approach with ES modules. While functional, several patterns limit scalability and maintainability.

---

## 🔴 Critical Issues

### 1. Top-Level Await Without Try-Catch
**Location:** Multiple game entry points  
**Files:** 
- `src/games/endings-builder/index.js:44` — `const ITEMS = await loadItems();`
- `src/games/endings-builder/index.js:73` — `let strings = await loadStrings();`

**Problem:** If data loading fails, the entire module fails to initialize with an unhandled rejection.

**Recommendation:**
```javascript
// Wrap in IIFE with error handling
(async function init() {
  try {
    const ITEMS = await loadItems();
    // ... rest of initialization
  } catch (err) {
    showFatalError(err);
  }
})();
```

---

## 🟠 High Priority Issues

### 2. Massive Game Files Without Separation of Concerns
**Locations:**
- `src/games/travel-tracker/index.js` — 790 lines
- `src/games/matching-game.js` — 749 lines
- `src/games/endings-builder/index.js` — 539 lines
- `src/games/duty-dispatcher/index.js` — 510 lines
- `src/games/decl6-detective/index.js` — 504 lines
- `src/games/passive-lab/index.js` — 504 lines

**Problem:** Single files mixing:
- DOM manipulation
- State management
- Business logic
- Event handling
- Rendering

**Recommendation:** Split each game into:
```
games/travel-tracker/
├── index.js           # Entry point, orchestration
├── state.js           # Game-specific state
├── renderer.js        # DOM/Canvas rendering
├── events.js          # Event handlers
├── data-loader.js     # Data fetching and validation
└── styles.css         # Game-specific styles
```

### 3. No Shared Game Abstraction
**Problem:** Every game reimplements:
- Progress loading/saving
- i18n loading
- Analytics dispatch
- Score/streak tracking
- Start/Next button handling

**Recommendation:** Create a `GameBase` class or factory:
```javascript
// src/lib/game-base.js
export function createGame(config) {
  return {
    state: createInitialState(config),
    start() { /* ... */ },
    cleanup() { /* ... */ },
    saveProgress() { /* ... */ },
    loadProgress() { /* ... */ },
    dispatchEvent() { /* ... */ },
  };
}
```

### 4. Inconsistent Module Entry Points
**Problem:** Some games use IIFE wrappers, others don't
- `decl6-detective/index.js` — Wrapped in IIFE
- `passive-lab/index.js` — Wrapped in IIFE
- `travel-tracker/index.js` — No IIFE, uses top-level await
- `endings-builder/index.js` — No IIFE, uses top-level await

**Recommendation:** Standardize on one pattern (prefer async IIFE with error handling)

---

## 🟡 Medium Priority Issues

### 5. Duplicate Function Declarations Shadow Imports
**Location:** `src/games/travel-tracker/index.js:172-177`

```javascript
import { loadJSON, remove, saveJSON } from '../../lib/storage.js';
// ...
async function loadJSON(path) {  // SHADOWS THE IMPORT!
  const url = assetUrl(path);
  // ...
}
```

**Problem:** Local `loadJSON` shadows the imported utility, causing confusion and potential bugs.

**Recommendation:** Rename local function to `fetchJSON` or similar

### 6. Mixed Import Patterns
**Problem:** Some files use named imports, others use namespace patterns inconsistently

**Current:**
```javascript
import { mustId, on } from '../../lib/dom.js';
import { assetUrl } from '../../lib/paths.js';
import { shuffle } from '../../lib/utils.js';
```

**Recommendation:** Create a barrel export for common utilities:
```javascript
// src/lib/index.js
export * from './dom.js';
export * from './paths.js';
export * from './utils.js';
export * from './storage.js';

// In games:
import { mustId, assetUrl, shuffle, loadJSON } from '../../lib/index.js';
```

### 7. Circular Dependency Risk
**Files:** `state.js` imports from `dom.js`, which could import from `state.js` in future

**Recommendation:** 
- Keep `state.js` pure (no DOM imports)
- Use dependency injection for status updates
- Document module dependency hierarchy

### 8. No Dependency Injection
**Problem:** Modules directly import dependencies, making testing and mocking difficult

**Example:** `storage.js` directly accesses `globalThis.localStorage`

**Recommendation:** Allow injection for testing:
```javascript
export function createStorageAPI(storage = globalThis.localStorage) {
  return {
    loadJSON(key, fallback) { /* ... */ },
    saveJSON(key, value) { /* ... */ },
  };
}

export const storage = createStorageAPI();
```

---

## 🟢 Low Priority Issues

### 9. Utility Function Sprawl
**Problem:** `utils.js` is minimal (27 lines) while complex logic is duplicated in games

**Recommendation:** Expand shared utilities:
```javascript
// src/lib/utils.js additions
export function debounce(fn, delay) { /* ... */ }
export function throttle(fn, delay) { /* ... */ }
export function formatDate(date, locale) { /* ... */ }
export function normalizeAnswer(value) { /* ... */ } // Currently duplicated in 4+ games
```

### 10. Missing Module Documentation
**Problem:** Library modules lack JSDoc or header comments explaining purpose

**Recommendation:** Add module headers:
```javascript
/**
 * @fileoverview DOM utility functions for safe element access
 * @module lib/dom
 */
```

---

## 📐 Proposed Module Hierarchy

```
src/
├── lib/                          # Shared utilities (no side effects)
│   ├── index.js                  # Barrel export
│   ├── dom.js                    # DOM helpers
│   ├── storage.js                # LocalStorage abstraction
│   ├── state.js                  # State management
│   ├── utils.js                  # Pure utilities
│   ├── errors.js                 # Error handling
│   ├── paths.js                  # Asset URL helpers
│   ├── render.js                 # Canvas rendering
│   └── i18n.js                   # NEW: i18n loading abstraction
│
├── core/                         # NEW: Application core
│   ├── game-base.js              # Game factory/base class
│   ├── analytics.js              # Event tracking abstraction
│   └── progress.js               # Progress management
│
└── games/                        # Game implementations
    ├── travel-tracker/
    │   ├── index.js              # Entry point
    │   ├── state.js              # Game state
    │   ├── renderer.js           # Rendering logic
    │   └── handlers.js           # Event handlers
    └── ...
```

---

## 📎 Related Documents

- [State Management](./03-state-management.md)
- [Testing Strategy](./08-testing-strategy.md)

