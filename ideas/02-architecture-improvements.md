# Architecture Improvements — Latvian_Lang_B1

This document covers architectural improvements, design patterns, and structural refactoring recommendations.

---

## Issue: No Shared Game Engine/Base Class

**Priority**: High  
**Category**: Architecture, Code Reuse  
**Effort**: Large

### Current State

Each game implements its own:

- State management
- Rendering loop
- Event handling
- Score tracking
- Progress persistence
- i18n loading

```javascript
// travel-tracker/index.js
const state = {
  levels: [],
  levelIndex: 0,
  routeIndex: 0,
  score: 0,
  streak: 0,
  started: false,
  // ...
};

// duty-dispatcher/index.js
const state = {
  strings: {},
  roles: [],
  tasks: [],
  score: 0,
  streak: 0,
  started: false,
  // ...
};

// endings-builder/index.js
let state = {
  current: null,
  solved: false,
  attempts: 0,
  correct: 0,
  streak: 0,
  // ...
};
```

### Problem

- Repeated boilerplate code in each game
- Inconsistent behavior across games
- Bug fixes must be applied to multiple files
- New games require copying and modifying existing code

### Recommendation

Create a shared game engine base:

```javascript
// src/lib/game-engine/base-game.js
export class BaseGame {
  constructor(options) {
    this.name = options.name;
    this.storageKey = `llb1:${options.name}:progress`;
    this.strings = {};
    this.state = {
      score: 0,
      streak: 0,
      started: false,
      currentIndex: 0,
      items: [],
    };
    this.selectors = {};
  }

  async init() {
    await this.loadStrings();
    this.loadProgress();
    this.bindEvents();
    this.render();
  }

  async loadStrings(lang = document.documentElement.lang || 'lv') {
    const langOrder = [lang, 'en'];
    for (const code of langOrder) {
      try {
        const res = await fetch(`i18n/${this.name}.${code}.json`);
        if (res.ok) {
          this.strings = await res.json();
          return;
        }
      } catch (e) {
        /* try next */
      }
    }
    this.strings = this.defaultStrings();
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        this.state.score = saved.score ?? 0;
        this.state.streak = saved.streak ?? 0;
      }
    } catch (e) {
      console.warn(`Failed to load progress for ${this.name}`, e);
    }
  }

  saveProgress() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          score: this.state.score,
          streak: this.state.streak,
          lastPlayed: new Date().toISOString(),
        }),
      );
    } catch (e) {
      console.warn(`Failed to save progress for ${this.name}`, e);
    }
  }

  awardPoints(correct, points = 10) {
    if (correct) {
      this.state.score += points;
      this.state.streak += 1;
      if (this.state.streak % 5 === 0) {
        this.state.score += 10; // Streak bonus
      }
    } else {
      this.state.streak = 0;
    }
    this.saveProgress();
    this.updateScoreDisplay();
  }

  // Abstract methods to be implemented by subclasses
  defaultStrings() {
    throw new Error('Implement defaultStrings()');
  }
  bindEvents() {
    throw new Error('Implement bindEvents()');
  }
  render() {
    throw new Error('Implement render()');
  }
  updateScoreDisplay() {
    throw new Error('Implement updateScoreDisplay()');
  }
}
```

**Usage:**

```javascript
// src/games/duty-dispatcher/game.js
import { BaseGame } from '../../lib/game-engine/base-game.js';

export class DutyDispatcherGame extends BaseGame {
  constructor() {
    super({ name: 'duty-dispatcher' });
    this.roles = [];
    this.tasks = [];
  }

  async init() {
    await super.init();
    await this.loadData();
    this.start();
  }

  defaultStrings() {
    return { title: 'Duty Dispatcher', scoreLabel: 'Score' };
  }

  // ... game-specific implementation
}
```

### Impact

- ~50% reduction in boilerplate code per game
- Consistent behavior and UX across all games
- Single place to fix common bugs
- Faster development of new games
- Easier testing with shared test utilities

---

## Issue: Tight Coupling Between Rendering and Logic

**Priority**: High  
**Category**: Architecture, Separation of Concerns  
**Effort**: Large

### Current State

Game logic and rendering are intertwined:

```javascript
// src/lib/match.js - drawMatch() mixes rendering with state management
function drawColumn(items, x, side) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    // Rendering
    roundedRect(x, y, boxW, boxH, 12, color, border);
    drawText(it.txt, x + 16, y + boxH / 2 + 7, {
      /* ... */
    });

    // Event handling and state management
    const handler = () => handleSelection(side, it, y + boxH / 2);
    clickables.push({ x, y, w: boxW, h: boxH, onClick: handler });

    // Accessibility DOM manipulation
    const li = document.createElement('li');
    btn.addEventListener('click', () => handleSelection(side, it));
    li.appendChild(btn);
    srList.appendChild(li);
  }
}
```

### Problem

- Cannot test logic without rendering
- Cannot reuse logic for different render targets
- Changes to UI require modifying logic code
- Difficult to add alternative render modes (e.g., text-only for accessibility)

### Recommendation

Implement Model-View-Controller (MVC) or similar pattern:

```javascript
// src/lib/match/model.js - Pure state and logic
export class MatchModel {
  constructor(deck, options = {}) {
    this.deck = deck;
    this.left = [];
    this.right = [];
    this.selected = null;
    this.solved = new Set();
    this.correct = 0;
    this.total = 0;
    this.startTime = null;
  }

  select(side, key) {
    if (this.solved.has(key)) return { type: 'already_solved' };

    if (!this.selected) {
      this.selected = { side, key };
      return { type: 'selected', side, key };
    }

    const previous = this.selected;
    const expected = previous.key;

    if (previous.side === side) {
      this.selected = { side, key };
      return { type: 'reselected', side, key };
    }

    const isMatch = key === expected;
    if (isMatch) {
      this.solved.add(expected);
      this.correct++;
      this.selected = null;
      return {
        type: 'correct',
        key: expected,
        isComplete: this.correct === this.total,
      };
    }

    this.selected = null;
    return { type: 'incorrect', expected, actual: key };
  }
}

// src/lib/match/view.js - Canvas rendering only
export class MatchView {
  constructor(canvas, model) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
  }

  render() {
    this.clear();
    this.drawHeader();
    this.drawColumn(this.model.left, this.config.leftX, 'L');
    this.drawColumn(this.model.right, this.config.rightX, 'R');
    this.drawScrollbar();
  }

  // Pure rendering - no state changes
  drawColumn(items, x, side) {
    for (const item of items) {
      const isSelected = this.model.isSelected(side, item.key);
      const isSolved = this.model.solved.has(item.key);
      this.drawCard(item, x, isSelected, isSolved);
    }
  }
}

// src/lib/match/controller.js - Coordinates model and view
export class MatchController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.bindEvents();
  }

  handleClick(x, y) {
    const hit = this.view.hitTest(x, y);
    if (!hit) return;

    const result = this.model.select(hit.side, hit.key);

    switch (result.type) {
      case 'correct':
        this.playCorrectFeedback();
        if (result.isComplete) this.endRound();
        break;
      case 'incorrect':
        this.playIncorrectFeedback();
        break;
    }

    this.view.render();
  }
}
```

### Impact

- Logic can be unit tested without DOM
- View can be swapped (Canvas, DOM, SVG)
- Clear separation of concerns
- Easier debugging and maintenance

---

## Issue: No Dependency Injection

**Priority**: Medium  
**Category**: Architecture, Testability  
**Effort**: Medium

### Current State

Dependencies are imported directly and hardcoded:

```javascript
// src/lib/match.js
import { state, MODES, shuffle } from './state.js';
import { W, H, scale, roundedRect } from './render.js';

// Directly depends on global state
function buildMatchDeck() {
  return state.DATA.units.flatMap((u) => u.entries || []);
}
```

### Problem

- Cannot substitute mock dependencies for testing
- Modules are tightly coupled
- Difficult to configure behavior at runtime
- Global state creates hidden dependencies

### Recommendation

Use dependency injection pattern:

```javascript
// src/lib/match.js - Accept dependencies as parameters
export function createMatchGame(deps) {
  const { state, renderer, storage, rng } = deps;

  function buildDeck() {
    return state.getData().units.flatMap((u) => u.entries || []);
  }

  function startRound() {
    const deck = buildDeck();
    const picks = shuffle(deck, rng);
    // ...
  }

  return { startRound };
}

// Production usage
import { state } from './state.js';
import * as renderer from './render.js';

const matchGame = createMatchGame({
  state,
  renderer,
  storage: localStorage,
  rng: Math.random,
});

// Test usage
const mockState = { getData: () => testData };
const mockRenderer = { clear: jest.fn(), drawText: jest.fn() };

const testGame = createMatchGame({
  state: mockState,
  renderer: mockRenderer,
  storage: mockStorage,
  rng: () => 0.5, // Deterministic
});
```

### Impact

- Highly testable code
- Swappable implementations
- Explicit dependencies
- Better isolation between modules

---

## Issue: No Configuration Management

**Priority**: Medium  
**Category**: Architecture, Maintainability  
**Effort**: Small

### Current State

Configuration values are scattered:

```javascript
// travel-tracker/index.js
const STORAGE_KEY = 'llb1:travel-tracker:progress';
const MAP_PATH = 'assets/img/travel-tracker/latvia.svg';
const BUS_ANIMATION_MS = 1100;

// duty-dispatcher/index.js
const ROLES_PATH = 'data/duty-dispatcher/roles.json';
const TASKS_PATH = 'data/duty-dispatcher/tasks.json';
const STORAGE_KEY = 'llb1:duty-dispatcher:progress';

// app.js
const database = 'matrix';
```

### Problem

- Configuration scattered across files
- Hard to override for different environments
- No central place to adjust settings
- Difficult to document all configuration options

### Recommendation

Create a centralized configuration module:

```javascript
// src/config/index.js
const defaultConfig = {
  app: {
    version: '1.0.0',
    environment: 'production',
    debug: false,
  },
  storage: {
    prefix: 'llb1',
    version: 'v1',
  },
  games: {
    matchRush: {
      maxItems: 15,
      animationDuration: 300,
    },
    travelTracker: {
      mapPath: 'assets/img/travel-tracker/latvia.svg',
      busAnimationMs: 1100,
    },
    dutyDispatcher: {
      rolesPath: 'data/duty-dispatcher/roles.json',
      tasksPath: 'data/duty-dispatcher/tasks.json',
      maxScore: 10,
    },
  },
  i18n: {
    defaultLang: 'lv',
    supportedLangs: ['lv', 'en', 'ru'],
  },
  rendering: {
    mobile: {
      breakpointScale: 0.7,
      boxHeight: 80,
      gap: 16,
    },
    desktop: {
      boxHeight: 56,
      gap: 14,
    },
  },
};

let config = { ...defaultConfig };

export function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj?.[key], config);
}

export function setConfig(overrides) {
  config = deepMerge(config, overrides);
}

export function getStorageKey(game) {
  return `${config.storage.prefix}:${game}:progress`;
}
```

### Impact

- Single source of truth for configuration
- Easy to adjust settings
- Environment-specific overrides
- Self-documenting configuration

---

## Issue: No Module Bundling Strategy

**Priority**: Medium  
**Category**: Architecture, Performance  
**Effort**: Medium

### Current State

The project uses native ES modules with direct script imports:

```html
<script type="module" src="app.js"></script>
<script src="theme.js"></script>
<script src="scripts/page-init.js" defer></script>
```

### Problem

- Many HTTP requests for individual modules
- No tree shaking or dead code elimination
- No minification in production
- Larger combined file size

### Recommendation

Add a simple build step with esbuild or Rollup:

```javascript
// build.js
import * as esbuild from 'esbuild';

const isDev = process.argv.includes('--dev');

await esbuild.build({
  entryPoints: [
    'app.js',
    'src/games/travel-tracker/index.js',
    'src/games/duty-dispatcher/index.js',
    'src/games/endings-builder/index.js',
  ],
  bundle: true,
  minify: !isDev,
  sourcemap: true,
  outdir: 'dist',
  format: 'esm',
  splitting: true, // Code splitting for shared chunks
  target: ['es2020'],
});
```

For browser-only dev toggles without relying on Node env vars:

```javascript
const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
```

**Package.json scripts:**

```json
{
  "scripts": {
    "build": "node build.js",
    "dev": "node build.js --watch",
    "preview": "npx http-server dist"
  }
}
```

### Impact

- ~60% reduction in bundle size
- Faster page loads
- Dead code elimination
- Professional build pipeline

---

## Issue: Folder Structure Could Be Improved

**Priority**: Low  
**Category**: Architecture, Organization  
**Effort**: Medium

### Current State

Current structure has some inconsistencies:

```
├── app.js                    # Root level JS
├── src/
│   ├── lib/                  # Shared libraries
│   │   ├── match.js          # Game logic mixed with rendering
│   │   └── ...
│   └── games/                # Individual games
│       ├── travel-tracker/
│       │   ├── index.js
│       │   ├── styles.css
│       │   └── utils.js
│       └── ...
├── data/                     # JSON data files
├── i18n/                     # Translations
├── assets/                   # Duplicate of root assets?
├── docs/                     # Documentation
├── test/                     # Tests
└── scripts/                  # Build scripts
```

### Recommendation

Reorganize for clarity:

```
├── src/
│   ├── core/                 # Core framework
│   │   ├── game-engine/      # Base game classes
│   │   ├── state/            # State management
│   │   ├── render/           # Rendering utilities
│   │   ├── storage/          # localStorage helpers
│   │   └── utils/            # Shared utilities
│   │
│   ├── games/                # Game implementations
│   │   ├── match-rush/
│   │   │   ├── model.js
│   │   │   ├── view.js
│   │   │   ├── controller.js
│   │   │   └── styles.css
│   │   └── ...
│   │
│   └── pages/                # Page-specific scripts
│       ├── week1.js
│       └── ...
│
├── public/                   # Static assets (copied as-is)
│   ├── assets/
│   ├── data/
│   └── i18n/
│
├── tests/                    # Test files (mirroring src/)
│   ├── core/
│   └── games/
│
├── docs/                     # Documentation
├── scripts/                  # Build/dev scripts
└── dist/                     # Build output (gitignored)
```

### Impact

- Clear separation between framework and games
- Easier navigation for new developers
- Scalable structure for growth
- Better tooling integration

---

## Summary Table

| Issue                         | Priority | Effort | Category               |
| ----------------------------- | -------- | ------ | ---------------------- |
| No Shared Game Engine         | High     | Large  | Code Reuse             |
| Tight Coupling (Render/Logic) | High     | Large  | Separation of Concerns |
| No Dependency Injection       | Medium   | Medium | Testability            |
| No Configuration Management   | Medium   | Small  | Maintainability        |
| No Module Bundling            | Medium   | Medium | Performance            |
| Folder Structure              | Low      | Medium | Organization           |
