# Documentation Gaps — Latvian_Lang_B1

This document identifies missing documentation and provides recommendations for improvement.

---

## Issue: README Could Be Expanded / Kept Up To Date

**Priority**: High  
**Category**: Documentation, Onboarding  
**Effort**: Small

### Current State

The repository already contains a `README.md` in the root. It provides a good overview, but it can still be improved for faster onboarding and contributor workflow clarity.

### Problem

- New contributors don't know where to start
- Project purpose not immediately clear
- Setup instructions missing
- No contribution guidelines

### Recommendation

Review the existing `README.md` and consider adding/adjusting sections like:

- Local development instructions (static server + common URLs)
- Testing/lint/format commands
- Data/i18n file structure conventions
- “How to add a new game” checklist

Example README structure:

````markdown
# 🇱🇻 Latvian B1 Language Games

Interactive web-based games for learning Latvian at the B1 level.

[![Tests](https://github.com/oerbey/Latvian_Lang_B1/actions/workflows/test.yml/badge.svg)](https://github.com/oerbey/Latvian_Lang_B1/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎮 Games

| Game                   | Description                           | Skills        |
| ---------------------- | ------------------------------------- | ------------- |
| **Match Rush**         | Match Latvian words with translations | Vocabulary    |
| **Prefix Forge**       | Add correct prefixes to verb roots    | Verb prefixes |
| **Endings Builder**    | Complete words with correct endings   | Declensions   |
| **Travel Tracker**     | Geography-based preposition practice  | Prepositions  |
| **Duty Dispatcher**    | Role-based dative case practice       | Dative case   |
| **Conjugation Sprint** | Quick verb conjugation practice       | Verb forms    |

## 🚀 Quick Start

### Play Online

Visit: [https://oerbey.github.io/Latvian_Lang_B1/](https://oerbey.github.io/Latvian_Lang_B1/)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/oerbey/Latvian_Lang_B1.git
cd Latvian_Lang_B1

# Serve with any static server
npx http-server . -p 3000

# Open in browser
open http://localhost:3000/week1.html
```
````

## 🛠️ Development

### Prerequisites

- Node.js 18+ (for tests and build scripts)
- Python 3.8+ (for data generation scripts)

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Generate offline bundles
python scripts/build_week1_offline.py
```

### Project Structure

```
├── app.js                 # Main application entry
├── src/
│   ├── lib/               # Shared libraries
│   └── games/             # Individual game modules
├── data/                  # JSON data files
├── i18n/                  # Translations (LV/EN/RU)
├── assets/                # Images and media
├── docs/                  # Specifications
└── test/                  # Test files
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome for Android)

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Latvian language resources and contributors
- Bootstrap team for the UI framework
- All learners providing feedback

````

### Impact
- Clear project introduction
- Quick onboarding for new contributors
- Professional appearance
- Improved discoverability

---

## Issue: No JSDoc Comments on Functions

**Priority**: High
**Category**: Documentation, Code Quality
**Effort**: Medium

### Current State

Most functions lack documentation:

```javascript
// src/lib/state.js
export function mulberry32(a){
  return function(){
    a|=0; a = a + 0x6D2B79F5 | 0;
    // ... no explanation
  }
}

export function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    // ... no parameters or return documented
  }
  return arr;
}
````

### Problem

- Function purpose unclear
- Parameter expectations unknown
- Return values undocumented
- IDE cannot provide helpful hints
- New developers struggle to understand code

### Recommendation

Add comprehensive JSDoc comments:

```javascript
// src/lib/state.js

/**
 * Creates a seeded pseudo-random number generator using the Mulberry32 algorithm.
 * Produces deterministic sequences for the same seed, useful for reproducible shuffles.
 *
 * @param {number} seed - Initial seed value (will be converted to 32-bit unsigned integer)
 * @returns {function(): number} A function that returns random numbers in [0, 1) range
 * @example
 * const rng = mulberry32(12345);
 * console.log(rng()); // 0.6270739405881613 (deterministic)
 * console.log(rng()); // 0.002735721180215478
 */
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

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm.
 * Uses the global state.rng for randomness to ensure deterministic behavior when seeded.
 *
 * @template T
 * @param {T[]} arr - The array to shuffle (will be modified in-place)
 * @returns {T[]} The same array reference, now shuffled
 * @example
 * const items = ['a', 'b', 'c'];
 * shuffle(items);
 * console.log(items); // e.g., ['c', 'a', 'b']
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (state.rng() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Selects a random element from an array using the global RNG.
 *
 * @template T
 * @param {T[]} arr - Array to select from
 * @returns {T} Randomly selected element
 * @throws {Error} If array is empty (implicit)
 */
export function choice(arr) {
  return arr[(state.rng() * arr.length) | 0];
}

/**
 * Application state modes for game selection.
 * @readonly
 * @enum {string}
 */
export const MODES = {
  /** Vocabulary matching game mode */
  MATCH: 'MATCH',
  /** Prefix building game mode */
  FORGE: 'FORGE',
};

/**
 * Global application state object.
 * @typedef {Object} GameState
 * @property {MODES} mode - Current game mode
 * @property {'practice'|'challenge'} difficulty - Difficulty level
 * @property {'auto'|'full'} deckSizeMode - How many items to show
 * @property {number} roundIndex - Current round number
 * @property {function(): number} rng - Seeded random number generator
 * @property {MatchState|null} matchState - Current match game state
 * @property {ForgeState|null} forgeState - Current forge game state
 * @property {GameResult[]} results - History of completed rounds
 * @property {boolean} showHelp - Whether help overlay is visible
 * @property {VocabularyData|null} DATA - Loaded vocabulary data
 * @property {'en'|'ru'} targetLang - Target language for translations
 */
export const state = {
  /* ... */
};
```

### Impact

- Self-documenting code
- Better IDE intellisense
- Easier onboarding
- Generated API documentation possible

---

## Issue: Missing CONTRIBUTING.md

**Priority**: Medium  
**Category**: Documentation, Community  
**Effort**: Small

### Current State

No contribution guidelines found.

### Problem

- Contributors don't know the process
- Code style expectations unclear
- Testing requirements unknown
- PR process undefined

### Recommendation

Create `CONTRIBUTING.md`:

````markdown
# Contributing to Latvian B1 Games

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 📋 Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all skill levels.

## 🔧 Development Setup

### Prerequisites

- Node.js 18 or later
- Python 3.8 or later
- Git

### Local Setup

```bash
git clone https://github.com/oerbey/Latvian_Lang_B1.git
cd Latvian_Lang_B1
npm install
```
````

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

### Running Locally

```bash
npx http-server . -p 3000
# Open http://localhost:3000/week1.html
```

## 📝 Code Style

### JavaScript

- Use ES Modules (`import`/`export`)
- Use `const` by default, `let` when mutation needed
- Use arrow functions for callbacks
- Add JSDoc comments for public functions

### Naming Conventions

- `camelCase` for variables and functions
- `PascalCase` for classes
- `UPPER_SNAKE_CASE` for constants
- Descriptive names (no single letters except loop counters)

### File Organization

- One main export per file when possible
- Keep files under 300 lines
- Group related functionality in folders

## 🧪 Testing Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve code coverage
- Tests must pass before merge

### Test File Location

- Place tests in `test/` mirroring `src/` structure
- Name test files `*.test.js`

## 📥 Pull Request Process

### Before Submitting

1. Create an issue describing the change (for major changes)
2. Fork the repository
3. Create a feature branch from `main`
4. Make your changes
5. Add/update tests
6. Update documentation if needed
7. Run tests and ensure they pass

### PR Guidelines

- Keep PRs focused and small when possible
- Write clear commit messages
- Reference related issues
- Update CHANGELOG.md for notable changes

### Commit Messages

Follow conventional commits:

```
feat: add new game mode
fix: correct scoring calculation
docs: update README
test: add integration tests
refactor: extract utility functions
```

## 🌐 Translations

### Adding a New Language

1. Copy `i18n/en.json` to `i18n/xx.json`
2. Translate all strings
3. Add language to the selector in HTML files
4. Test thoroughly with the new language

### Translation Guidelines

- Maintain consistent tone
- Consider text length (UI constraints)
- Preserve placeholders (`{variable}`)
- Test in context

## 🐛 Reporting Bugs

### Include in Bug Reports

- Browser and version
- Device (desktop/mobile)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 💡 Feature Requests

We welcome feature ideas! Please:

- Check existing issues first
- Describe the use case
- Explain the expected behavior
- Consider backward compatibility

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

````

### Impact
- Clear expectations for contributors
- Consistent code quality
- Smoother PR process
- Growing community

---

## Issue: No API Documentation

**Priority**: Medium
**Category**: Documentation, Developer Experience
**Effort**: Medium

### Current State

No generated API documentation. Complex functions like the game state machine are undocumented.

### Problem

- Hard to understand module interfaces
- No reference documentation
- Difficult for contributors to learn codebase

### Recommendation

1. Generate documentation from JSDoc:

```json
// package.json
{
  "scripts": {
    "docs": "jsdoc -c jsdoc.config.json",
    "docs:watch": "nodemon --exec 'npm run docs' --watch src"
  },
  "devDependencies": {
    "jsdoc": "^4.0.0",
    "clean-jsdoc-theme": "^4.0.0"
  }
}
````

```javascript
// jsdoc.config.json
{
  "source": {
    "include": ["src"],
    "includePattern": ".+\\.js$"
  },
  "opts": {
    "destination": "./docs/api",
    "recurse": true,
    "template": "node_modules/clean-jsdoc-theme"
  },
  "plugins": ["plugins/markdown"],
  "templates": {
    "cleverLinks": true,
    "monospaceLinks": true
  }
}
```

2. Create manual architecture documentation:

```markdown
# docs/architecture.md

# Architecture Overview

## Core Modules

### State Management (`src/lib/state.js`)

Centralized game state with seeded RNG for reproducibility.

### Rendering (`src/lib/render.js`)

Canvas 2D rendering utilities with responsive scaling.

### Games (`src/games/`)

Individual game implementations, each with:

- `index.js` - Main game logic
- `styles.css` - Game-specific styles
- Optional utility modules

## Data Flow

1. **Initialization**
   - Load translations (i18n)
   - Load vocabulary data
   - Initialize game state

2. **Game Loop**
   - User interaction → Event handler
   - State update → Redraw trigger
   - Canvas render → Display update

3. **Persistence**
   - Progress saved to localStorage
   - Exported as CSV on demand
```

### Impact

- Professional documentation
- Easier onboarding
- Reference for developers
- Self-updating from code

---

## Issue: Missing Game Specifications for Some Games

**Priority**: Low  
**Category**: Documentation, Design  
**Effort**: Medium

### Current State

Some games have specs in `docs/`, others don't:

```
docs/
├── travel-tracker-spec.md ✓
├── duty-dispatcher-spec.md ✓
├── endings-builder-analysis/ ✓
├── maini-vai-mainies-spec.md ✓
├── passive-lab-spec.md ✓
├── decl6-detective-spec.md ✓
└── (missing: match-rush-spec.md, prefix-forge-spec.md)
```

### Problem

- Inconsistent documentation
- New developers don't understand game rules
- Design decisions not captured
- Difficult to verify correct behavior

### Recommendation

Create specs for undocumented games:

````markdown
# docs/match-rush-spec.md

# Match Rush — Game Specification

## Overview

A timed vocabulary matching game where players connect Latvian words with their translations.

## Gameplay

### Modes

- **Practice**: No time limit, unlimited attempts
- **Challenge**: 3 lives, timer active

### Mechanics

1. Left column shows Latvian words
2. Right column shows translations (shuffled)
3. Player clicks one word, then its matching translation
4. Correct pairs disappear
5. Game ends when all pairs matched or lives depleted

### Scoring

- +1 for each correct match
- Streak bonus: +10 every 5 correct in a row
- Challenge mode: penalty for mismatches

### Deck Sizes

- **Auto**: Fits to screen without scrolling
- **Full**: All available words, scrollable

## Data Requirements

### Entry Format

```json
{
  "translations": {
    "lv": "braukt",
    "en": "to drive",
    "ru": "ехать"
  },
  "games": ["match"],
  "tags": ["movement", "prefix:ie"]
}
```
````

### Filtering

- Only entries with `games.includes('match')`
- Only entries with translation in target language

## Hint System

On incorrect match, shows contextual hint:

- Reflexive verb hint if `-ties` mismatch
- Prefix meaning if prefix mismatch
- Generic "try again" otherwise

## Accessibility

- Screen reader list mirrors visual cards
- Buttons disabled when solved
- ARIA live region announces results

## UI States

1. **Ready**: Deck loaded, waiting for selection
2. **Selected**: One item selected, awaiting pair
3. **Feedback**: Showing correct/incorrect result
4. **Complete**: All pairs matched, showing stats

````

### Impact
- Complete game documentation
- Clear expected behavior
- Design reference for future changes
- Testing baseline

---

## Issue: No Changelog

**Priority**: Low
**Category**: Documentation, Releases
**Effort**: Small

### Current State

No CHANGELOG.md file found.

### Problem

- Version history not tracked
- Users don't know what changed
- Breaking changes not documented
- Release notes missing

### Recommendation

Create `CHANGELOG.md`:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Travel Tracker game with map visualization
- Duty Dispatcher for dative case practice
- Offline fallback data bundles

### Changed
- Improved mobile touch handling
- Better error messages for data loading failures

### Fixed
- Scroll not working on some mobile devices
- Canvas not clearing properly on mode switch

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Match Rush vocabulary game
- Prefix Forge verb game
- Endings Builder declension practice
- Multi-language support (LV, EN, RU)
- Progress tracking in localStorage
- CSV export for results
- Offline capability via service worker

### Known Issues
- Some vocabulary entries may have typos
- Mobile Safari requires touch-action CSS tweaks
````

### Impact

- Clear version history
- Release communication
- User-facing documentation
- Breaking change tracking

---

## Issue: Inline Comments Could Be Improved

**Priority**: Low  
**Category**: Documentation, Readability  
**Effort**: Small

### Current State

Some inline comments are cryptic or missing:

```javascript
// app.js
const deepCopy = (value) => JSON.parse(JSON.stringify(value));
// Why not structuredClone?

// src/lib/state.js
a |= 0;
a = (a + 0x6d2b79f5) | 0;
// What does this magic number mean?
```

### Recommendation

Add clarifying comments:

```javascript
// Use JSON parse/stringify for deep cloning
// structuredClone not available in all target browsers (Safari <15.4)
const deepCopy = (value) => JSON.parse(JSON.stringify(value));

// Mulberry32 PRNG algorithm constant
// 0x6D2B79F5 is a mixing constant used by the Mulberry32 PRNG (not golden ratio)
a |= 0;
a = (a + 0x6d2b79f5) | 0;
```

### Impact

- More understandable code
- Preserved knowledge
- Easier maintenance
- Better code reviews

---

## Summary Table

| Issue                | Priority | Effort | Impact              |
| -------------------- | -------- | ------ | ------------------- |
| README improvements  | High     | Small  | Onboarding          |
| No JSDoc Comments    | High     | Medium | Code understanding  |
| No CONTRIBUTING.md   | Medium   | Small  | Community growth    |
| No API Documentation | Medium   | Medium | Developer reference |
| Missing Game Specs   | Low      | Medium | Design clarity      |
| No Changelog         | Low      | Small  | Release tracking    |
| Inline Comments      | Low      | Small  | Code readability    |
