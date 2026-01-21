# State Management Improvements

**Date:** January 20, 2026  
**Category:** State Management

---

## 🔍 Current State Analysis

The application uses multiple state management approaches:
1. **Global mutable object** in `src/lib/state.js` for canvas games
2. **Local closure state** within each game's IIFE
3. **localStorage** for persistence via `src/lib/storage.js`

---

## 🔴 Critical Issues

### 1. Global Mutable State Object
**Location:** `src/lib/state.js:14-26`

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
  targetLang: 'en'
};
```

**Problems:**
- Any module can mutate state directly
- No change tracking or subscriptions
- Testing requires manual state reset
- Race conditions in async operations
- No immutability guarantees

**Recommendation:** Implement a simple state container:

```javascript
// src/lib/state.js (proposed)
function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    getState() { return { ...state }; },
    
    setState(partial) {
      const prev = state;
      state = { ...state, ...partial };
      listeners.forEach(fn => fn(state, prev));
    },
    
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    
    reset() {
      state = { ...initialState };
      listeners.forEach(fn => fn(state, initialState));
    }
  };
}

export const store = createStore(INITIAL_STATE);
```

### 2. Inconsistent State Initialization
**Problem:** Each game initializes its own state pattern differently

**Examples:**
- `travel-tracker`: `const state = { ... }` at module level
- `passive-lab`: Variables scattered at closure level
- `decl6-detective`: Mixed let/const declarations

**Recommendation:** Standardize on a state factory per game:
```javascript
function createGameState() {
  return {
    items: [],
    index: 0,
    score: 0,
    streak: 0,
    // ...
  };
}
let state = createGameState();
```

---

## 🟠 High Priority Issues

### 3. State and DOM Coupling
**Location:** `src/lib/state.js:32`

```javascript
export function setStatus(s){ mustId('status').textContent = s || ''; }
```

**Problem:** State module directly manipulates DOM, violating separation of concerns

**Recommendation:** Use event/callback pattern:
```javascript
// state.js
let statusCallback = () => {};
export function onStatusChange(fn) { statusCallback = fn; }
export function setStatus(s) { statusCallback(s); }

// app.js
onStatusChange(s => mustId('status').textContent = s || '');
```

### 4. Clickables Array as Pseudo-State
**Location:** `src/lib/state.js:33-35`

```javascript
export let clickables = [];
export function hitAt(x,y){ for(const c of clickables){ if(x>=c.x && x<=c.x+c.w && y>=c.y && y<=c.y+c.h) return c; } return null; }
export function resetClicks(){ clickables.length=0; }
```

**Problems:**
- Mutating array in place
- No encapsulation
- Side effects in state module

**Recommendation:** Move to render context:
```javascript
// render.js
let clickableRegions = [];

export function registerClickable(region) {
  clickableRegions.push(region);
}

export function clearClickables() {
  clickableRegions = [];
}

export function findClickableAt(x, y) {
  return clickableRegions.find(c => 
    x >= c.x && x <= c.x + c.w && 
    y >= c.y && y <= c.y + c.h
  );
}
```

---

## 🟡 Medium Priority Issues

### 5. RNG State Management
**Location:** `src/lib/state.js:20`

```javascript
rng: mulberry32(Date.now() >>> 0),
```

**Problem:** RNG is part of global state but should be seedable for testing/replay

**Recommendation:** Make RNG seedable and resettable:
```javascript
export function createRng(seed = Date.now()) {
  return mulberry32(seed >>> 0);
}

// In store
function resetRng(seed) {
  store.setState({ rng: createRng(seed) });
}
```

### 6. Redraw Callback Indirection
**Location:** `src/lib/state.js:36-37`

```javascript
let redraw=()=>{};
export function setRedraw(fn){ redraw = fn; }
export function triggerRedraw(){ redraw(); }
```

**Problem:** Callback pattern creates hidden dependencies and makes flow hard to trace

**Recommendation:** Use explicit render loop or event emitter:
```javascript
// Explicit approach
import { draw } from './render.js';
export function triggerRedraw() { requestAnimationFrame(draw); }
```

---

## 🔧 Proposed State Architecture

### Game State Pattern

```javascript
// src/core/game-state.js
export function createGameState(config) {
  const initialState = {
    phase: 'idle', // idle, playing, paused, complete
    score: 0,
    streak: 0,
    attempts: 0,
    items: [],
    currentIndex: -1,
    ...config.initial,
  };

  let state = { ...initialState };
  const subscribers = new Map();

  function notify(key) {
    subscribers.get(key)?.forEach(fn => fn(state[key], state));
    subscribers.get('*')?.forEach(fn => fn(state));
  }

  return {
    get: (key) => state[key],
    
    set: (key, value) => {
      if (state[key] === value) return;
      state = { ...state, [key]: value };
      notify(key);
    },
    
    update: (partial) => {
      state = { ...state, ...partial };
      Object.keys(partial).forEach(notify);
    },
    
    subscribe: (key, fn) => {
      if (!subscribers.has(key)) subscribers.set(key, new Set());
      subscribers.get(key).add(fn);
      return () => subscribers.get(key).delete(fn);
    },
    
    reset: () => {
      state = { ...initialState };
      notify('*');
    },
    
    snapshot: () => ({ ...state }),
  };
}
```

### Usage Example

```javascript
// games/travel-tracker/state.js
import { createGameState } from '../../core/game-state.js';

export const gameState = createGameState({
  initial: {
    levels: [],
    levelIndex: 0,
    routeIndex: 0,
    seed: 0,
    inputLocked: true,
  }
});

// Subscribe to changes
gameState.subscribe('score', (score) => {
  selectors.score.textContent = `Score: ${score}`;
});
```

---

## 🔄 Migration Path

### Phase 1: Encapsulate Existing State
```javascript
// Minimal change - wrap existing object
const _state = { /* existing properties */ };
export const state = new Proxy(_state, {
  set(target, prop, value) {
    console.log(`State change: ${prop}`, value);
    target[prop] = value;
    return true;
  }
});
```

### Phase 2: Add Subscription Support
Add `subscribe()` method without breaking existing code

### Phase 3: Migrate Games One by One
Update each game to use the new state pattern

### Phase 4: Remove Direct Mutations
Enforce immutability through the API

---

## 📎 Related Documents

- [Architecture Improvements](./02-architecture-improvements.md)
- [Testing Strategy](./08-testing-strategy.md)

