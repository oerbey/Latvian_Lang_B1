# Testing Strategy Improvements

**Date:** January 20, 2026  
**Category:** Testing & Quality Assurance

---

## 🔍 Current Testing Landscape

| Aspect | Status |
|--------|--------|
| Test Runner | Node.js native (`node --test`) |
| Test Location | `test/` directory mirroring `src/` |
| Coverage | Unknown (no coverage tooling) |
| E2E Tests | None |
| Visual Regression | None |
| CI Integration | GitHub Actions on push/PR |

---

## 🔴 Critical Issues

### 1. No DOM Testing Infrastructure
**Problem:** DOM-dependent code (games, UI) is largely untested

**Current tests:** Only pure utility functions
```
test/lib/
├── dom.test.js      # Minimal
├── errors.test.js
├── forge.test.js
├── match-flow.test.js
├── match.test.js
├── paths.test.js
├── render.test.js
├── state.test.js
├── state-ui.test.js
├── storage.test.js
└── utils.test.js
```

**Missing coverage:**
- All 10+ game modules
- Theme toggle functionality
- Service worker logic
- Canvas rendering output

**Recommendation:** Add JSDOM for unit tests:
```javascript
// test/setup.js
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

globalThis.document = dom.window.document;
globalThis.window = dom.window;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
```

```json
// package.json
{
  "scripts": {
    "test": "node --import ./test/setup.js --test"
  }
}
```

---

## 🟠 High Priority Issues

### 2. No Test Coverage Reporting
**Problem:** Unknown code coverage percentage

**Recommendation:** Enable Node.js experimental coverage:
```json
{
  "scripts": {
    "test:coverage": "node --test --experimental-test-coverage"
  }
}
```

Or use c8 for better reporting:
```json
{
  "scripts": {
    "test:coverage": "c8 node --test"
  },
  "devDependencies": {
    "c8": "^9.0.0"
  }
}
```

**Coverage targets:**
| Module Type | Target |
|-------------|--------|
| Core utilities (`lib/`) | 90%+ |
| Game logic (pure functions) | 80%+ |
| DOM interactions | 60%+ |
| Integration | 50%+ |

### 3. No E2E/Integration Tests
**Problem:** No validation that games work end-to-end

**Recommendation:** Add Playwright for E2E:
```javascript
// tests/e2e/home.spec.js
import { test, expect } from '@playwright/test';

test('homepage loads and shows game cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Latvian');
  const cards = page.locator('.card');
  await expect(cards).toHaveCount.greaterThan(5);
});

test('can navigate to Travel Tracker', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Travel Tracker');
  await expect(page).toHaveURL(/travel-tracker/);
  await expect(page.locator('#tt-start')).toBeVisible();
});
```

```json
// package.json
{
  "scripts": {
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

---

## 🟡 Medium Priority Issues

### 4. Game Module Testing Gaps
**Problem:** No tests for game-specific logic

**Priority games to test:**
1. `travel-tracker` — Route logic, state transitions
2. `endings-builder` — Ending resolution, scoring
3. `matching-game` — Pair matching, statistics

**Example test structure:**
```javascript
// test/games/travel-tracker/state.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

test('prepareLevels shuffles routes deterministically', () => {
  const levels = [{ routes: ['a', 'b', 'c'] }];
  const seed = 12345;
  
  const result1 = prepareLevels(levels, seed);
  const result2 = prepareLevels(levels, seed);
  
  assert.deepEqual(result1, result2, 'Same seed should produce same order');
});

test('computeTotalRoutes counts all routes', () => {
  const levels = [
    { routes: ['a', 'b'] },
    { routes: ['c', 'd', 'e'] },
  ];
  
  assert.equal(computeTotalRoutes(levels), 5);
});
```

### 5. Missing Mock Utilities
**Problem:** No standardized way to mock localStorage, fetch, etc.

**Recommendation:** Create test helpers:
```javascript
// test/helpers/mocks.js
export function createMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
  };
}

export function createMockFetch(responses) {
  return async (url) => {
    const match = responses.find(r => url.includes(r.pattern));
    if (!match) throw new Error(`Unmocked fetch: ${url}`);
    return {
      ok: match.ok ?? true,
      status: match.status ?? 200,
      json: async () => match.json,
      text: async () => match.text ?? JSON.stringify(match.json),
    };
  };
}
```

### 6. Snapshot Testing for Data
**Problem:** Data transformations not validated

**Recommendation:** Add snapshot tests for build outputs:
```javascript
// test/scripts/build-data.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('words.json structure matches schema', () => {
  const words = JSON.parse(readFileSync('data/words.json', 'utf8'));
  
  assert.ok(Array.isArray(words));
  assert.ok(words.length > 100);
  
  // Check first entry structure
  const word = words[0];
  assert.ok('lv' in word);
  assert.ok('eng' in word);
  assert.ok(typeof word.lv === 'string');
});
```

---

## 🟢 Low Priority Issues

### 7. No Visual Regression Tests
**Problem:** UI changes may introduce unintended visual regressions

**Recommendation:** Add Percy or Playwright visual testing:
```javascript
// tests/visual/theme.spec.js
import { test, expect } from '@playwright/test';

test('light theme appearance', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bs-theme', 'light');
  });
  await expect(page).toHaveScreenshot('home-light.png');
});

test('dark theme appearance', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  });
  await expect(page).toHaveScreenshot('home-dark.png');
});
```

### 8. Performance Testing
**Problem:** No automated performance regression detection

**Recommendation:** Add Lighthouse CI:
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:5173/
            http://localhost:5173/travel-tracker.html
          uploadArtifacts: true
```

---

## 📊 Proposed Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  ~10 tests
                    │(Playwright)
                    └────┬────┘
                         │
                ┌────────┴────────┐
                │   Integration   │  ~30 tests
                │  (DOM + State)  │
                └────────┬────────┘
                         │
        ┌────────────────┴────────────────┐
        │          Unit Tests             │  ~100+ tests
        │   (Pure functions, utilities)   │
        └─────────────────────────────────┘
```

---

## 📁 Recommended Test Structure

```
test/
├── setup.js                    # JSDOM setup, global mocks
├── helpers/
│   ├── mocks.js               # Mock factories
│   └── fixtures.js            # Test data
├── lib/
│   ├── dom.test.js
│   ├── storage.test.js
│   └── ...
├── games/
│   ├── travel-tracker/
│   │   ├── state.test.js
│   │   └── utils.test.js
│   ├── endings-builder/
│   │   └── resolver.test.js
│   └── ...
├── scripts/
│   └── build-data.test.js
└── e2e/                       # Playwright tests
    ├── navigation.spec.js
    ├── travel-tracker.spec.js
    └── ...
```

---

## 📎 Related Documents

- [Architecture Improvements](./02-architecture-improvements.md)
- [Platform & Tooling](./07-platform-and-tooling.md)

