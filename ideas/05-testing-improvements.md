# Testing Improvements — Latvian_Lang_B1

This document covers test coverage, testing strategy, and quality assurance recommendations.

---

## Current Testing State

### Existing Test Coverage

The project uses **Node.js native test runner** with a good foundation:

```
test/
├── games/
│   ├── conjugation-sprint/
│   ├── endings-builder/
│   └── travel-tracker/
│       └── utils.test.js
├── helpers/
│   └── dom-stubs.js
├── lib/
│   ├── forge.test.js
│   ├── match-flow.test.js
│   ├── match.test.js
│   ├── render.test.js
│   ├── state-ui.test.js
│   └── state.test.js
└── scripts/
```

### Strengths

- ✅ Uses modern Node.js test runner (no external dependencies)
- ✅ Good unit tests for core utilities (`mulberry32`, `shuffle`, `choice`)
- ✅ DOM stubs for canvas and basic elements
- ✅ Tests for deterministic RNG behavior

### Gaps

- ❌ No integration tests
- ❌ No end-to-end tests
- ❌ Limited coverage of game logic
- ❌ No visual regression tests
- ❌ No accessibility tests
- ❌ No coverage reporting

---

## Issue: Limited Test Coverage of Game Logic

**Priority**: High  
**Category**: Testing, Quality Assurance  
**Effort**: Large

### Current State

Only a few game behaviors are tested:

```javascript
// test/lib/match.test.js
test('startMatchRound uses target language entries', () => {
  /* ... */
});
test('auto deck size does not exceed available cards', () => {
  /* ... */
});
test('empty deck is handled gracefully', () => {
  /* ... */
});
```

### Problem

- Many game behaviors untested
- Selection logic not tested
- Scoring logic not tested
- Edge cases not covered
- Regressions could go unnoticed

### Recommendation

Expand test coverage for critical paths:

```javascript
// test/lib/match/selection.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchModel } from '../../../src/lib/match/model.js';

test('selecting a pair correctly marks it solved', () => {
  const model = new MatchModel([
    { key: 'a', lv: 'viens', en: 'one' },
    { key: 'b', lv: 'divi', en: 'two' },
  ]);

  model.select('L', 'a');
  const result = model.select('R', 'a');

  assert.equal(result.type, 'correct');
  assert.ok(model.solved.has('a'));
  assert.equal(model.correct, 1);
});

test('selecting wrong pair does not mark as solved', () => {
  const model = new MatchModel([
    { key: 'a', lv: 'viens', en: 'one' },
    { key: 'b', lv: 'divi', en: 'two' },
  ]);

  model.select('L', 'a');
  const result = model.select('R', 'b');

  assert.equal(result.type, 'incorrect');
  assert.ok(!model.solved.has('a'));
  assert.ok(!model.solved.has('b'));
});

test('reselecting on same side updates selection', () => {
  const model = new MatchModel([
    { key: 'a', lv: 'viens', en: 'one' },
    { key: 'b', lv: 'divi', en: 'two' },
  ]);

  model.select('L', 'a');
  model.select('L', 'b');

  assert.deepEqual(model.selected, { side: 'L', key: 'b' });
});

test('cannot select already solved items', () => {
  const model = new MatchModel([{ key: 'a', lv: 'viens', en: 'one' }]);

  model.select('L', 'a');
  model.select('R', 'a');

  const result = model.select('L', 'a');
  assert.equal(result.type, 'already_solved');
});

test('isComplete returns true when all pairs solved', () => {
  const model = new MatchModel([{ key: 'a', lv: 'viens', en: 'one' }]);

  model.select('L', 'a');
  const result = model.select('R', 'a');

  assert.equal(result.isComplete, true);
});
```

```javascript
// test/lib/forge/prefix.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ForgeModel } from '../../../src/lib/forge/model.js';

test('correct prefix selection awards points', () => {
  const model = new ForgeModel({
    base: 'mainīt',
    correct: 'iz',
    clue: 'to change (completely)',
  });

  const result = model.select('iz');

  assert.equal(result.correct, true);
  assert.equal(result.formed, 'izmainīt');
});

test('incorrect prefix provides feedback', () => {
  const model = new ForgeModel({
    base: 'mainīt',
    correct: 'iz',
    clue: 'to change (completely)',
  });

  const result = model.select('pār');

  assert.equal(result.correct, false);
  assert.equal(result.expected, 'izmainīt');
  assert.equal(result.actual, 'pārmainīt');
});
```

### Impact

- 80%+ coverage of critical paths
- Confidence in refactoring
- Regression prevention
- Documentation of expected behavior

---

## Issue: No Integration Tests

**Priority**: High  
**Category**: Testing, Integration  
**Effort**: Medium

### Current State

No tests for component interactions or data flow.

### Problem

- Unit tests pass but components don't work together
- Data loading → processing → rendering chain untested
- State updates → UI updates chain untested

### Recommendation

Add integration tests:

```javascript
// test/integration/game-flow.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/integration-setup.js';

test('complete match game flow', async () => {
  const { game, state, events } = await setupTestEnvironment({
    game: 'match',
    data: {
      units: [
        {
          name: 'test',
          entries: [
            { translations: { lv: 'a', en: 'A' }, games: ['match'] },
            { translations: { lv: 'b', en: 'B' }, games: ['match'] },
          ],
        },
      ],
    },
  });

  // Start game
  game.startRound();
  assert.equal(state.matchState.total, 2);
  assert.equal(events.emitted.length, 1);
  assert.equal(events.emitted[0].type, 'round_start');

  // Make correct selection
  game.handleSelection('L', 'a');
  game.handleSelection('R', 'a');

  assert.equal(state.matchState.correct, 1);
  assert.ok(events.emitted.some((e) => e.type === 'correct_match'));

  // Complete the game
  game.handleSelection('L', 'b');
  game.handleSelection('R', 'b');

  assert.equal(state.matchState.correct, 2);
  assert.ok(events.emitted.some((e) => e.type === 'round_complete'));
});

test('progress persists across sessions', async () => {
  const mockStorage = new Map();

  // First session
  const { game: game1 } = await setupTestEnvironment({
    game: 'duty-dispatcher',
    storage: mockStorage,
  });

  game1.awardScore(10);
  game1.saveProgress();

  // Second session
  const { game: game2 } = await setupTestEnvironment({
    game: 'duty-dispatcher',
    storage: mockStorage,
  });

  assert.equal(game2.state.score, 10);
});

test('language switching updates all UI elements', async () => {
  const { app, dom } = await setupTestEnvironment({ lang: 'lv' });

  assert.equal(dom.getElementById('title').textContent, 'LV→EN Vārdu Spēles (B1)');

  await app.switchLanguage('en');

  assert.equal(dom.getElementById('title').textContent, 'LV→EN Word Games (B1)');
  assert.equal(document.documentElement.lang, 'en');
});
```

### Impact

- Validates component interactions
- Catches integration bugs early
- Tests real user flows
- Higher confidence in releases

---

## Issue: No End-to-End Tests

**Priority**: Medium  
**Category**: Testing, E2E  
**Effort**: Large

### Current State

No browser-based end-to-end tests.

### Problem

- No testing in real browser environment
- No testing of actual DOM rendering
- No testing of user interactions
- No testing across browsers

### Recommendation

Add Playwright E2E tests:

```javascript
// tests/e2e/match-game.spec.js
import { test, expect } from '@playwright/test';

test.describe('Match Rush Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/week1.html');
    await page.waitForSelector('#canvas:not(.loading)');
  });

  test('starts in match mode by default', async ({ page }) => {
    const status = await page.textContent('#status');
    expect(status).toContain('Ready');
  });

  test('can switch to forge mode', async ({ page }) => {
    await page.click('#mode-forge');

    // Canvas should show PREFIX FORGE title
    const canvas = page.locator('#canvas');
    // Use visual comparison or accessibility tree
    await expect(canvas).toBeVisible();
  });

  test('clicking a word selects it', async ({ page }) => {
    // Click on canvas at approximate word location
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();

    // Click first left column item
    await page.mouse.click(box.x + 100, box.y + 150);

    // Verify selection via accessibility or visual change
    // This depends on implementation
  });

  test('matching correct pair shows success feedback', async ({ page }) => {
    // This would require knowing exact coordinates or
    // using accessibility features
    // Better approach: Add data-testid attributes
    // or use the SR (screen reader) list for clicking
  });

  test('help modal opens and closes', async ({ page }) => {
    await page.click('#btn-help');

    // Wait for help overlay to be drawn
    await page.waitForTimeout(100);

    // Press keyboard shortcut to close
    await page.keyboard.press('h');
  });

  test('keyboard shortcuts work', async ({ page }) => {
    // Press 1 for Match mode
    await page.keyboard.press('1');

    // Press 2 for Forge mode
    await page.keyboard.press('2');

    // Press H for help
    await page.keyboard.press('h');

    // Press H again to close
    await page.keyboard.press('h');
  });
});

// tests/e2e/travel-tracker.spec.js
test.describe('Travel Tracker', () => {
  test('shows map and start button', async ({ page }) => {
    await page.goto('/travel-tracker.html');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#tt-map-inner')).toBeVisible();
    await expect(page.locator('#tt-start')).toBeVisible();
  });

  test('can start a game', async ({ page }) => {
    await page.goto('/travel-tracker.html');
    await page.click('#tt-start');

    await expect(page.locator('#tt-input')).toBeVisible();
    await expect(page.locator('#tt-gap')).toBeVisible();
  });

  test('correct answer advances to next route', async ({ page }) => {
    await page.goto('/travel-tracker.html');
    await page.click('#tt-start');

    // Type answer
    await page.fill('#tt-input', 'uz');
    await page.click('#checkBtn');

    // Check for feedback
    const feedback = await page.textContent('#tt-feedback');
    expect(feedback).toBeTruthy();
  });
});
```

**Playwright configuration:**

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx http-server . -p 3000',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],
});
```

### Impact

- Tests in real browser environment
- Cross-browser testing
- Visual regression detection
- Higher confidence in releases

---

## Issue: No Accessibility Tests

**Priority**: Medium  
**Category**: Testing, Accessibility  
**Effort**: Small

### Current State

Accessibility features exist but aren't tested:

```javascript
// Screen reader support exists
const sr = document.getElementById('sr-game-state');
sr.innerHTML = '';
```

### Problem

- Accessibility features might break without notice
- No validation of ARIA attributes
- No keyboard navigation testing
- WCAG compliance not verified

### Recommendation

Add accessibility tests:

```javascript
// test/accessibility/a11y.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { axe, toHaveNoViolations } from 'jest-axe';
import { JSDOM } from 'jsdom';

test('week1.html has no accessibility violations', async () => {
  const html = await readFile('week1.html', 'utf-8');
  const dom = new JSDOM(html);

  const results = await axe(dom.window.document);

  // Filter to critical and serious violations only
  const significant = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );

  assert.equal(
    significant.length,
    0,
    `Found ${significant.length} accessibility violations: ` +
      significant.map((v) => v.description).join(', '),
  );
});

// Using Playwright for interactive a11y testing
// tests/e2e/accessibility.spec.js
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('week1 page is accessible', async ({ page }) => {
    await page.goto('/week1.html');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/week1.html');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement.id);
    expect(first).toBeTruthy();

    await page.keyboard.press('Tab');
    const second = await page.evaluate(() => document.activeElement.id);
    expect(second).not.toEqual(first);
  });

  test('screen reader announcements work', async ({ page }) => {
    await page.goto('/week1.html');

    const liveRegion = page.locator('#sr-game-state');
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
```

### Impact

- Validated accessibility compliance
- Protection against a11y regressions
- Legal compliance (WCAG)
- Better user experience

---

## Issue: No Coverage Reporting

**Priority**: Medium  
**Category**: Testing, Metrics  
**Effort**: Small

### Current State

No code coverage tracking.

### Problem

- Unknown test coverage level
- Can't identify untested code
- No coverage gates in CI
- No visibility into quality

### Recommendation

Add c8 for native Node.js coverage:

```json
// package.json
{
  "scripts": {
    "test": "node --test",
    "test:coverage": "c8 --reporter=html --reporter=text node --test",
    "test:coverage:ci": "c8 --reporter=lcov --reporter=text node --test"
  },
  "devDependencies": {
    "c8": "^8.0.0"
  }
}
```

Create coverage configuration:

```javascript
// c8.config.js
module.exports = {
  all: true,
  include: ['src/**/*.js'],
  exclude: ['src/**/*.test.js', 'test/**/*'],
  branches: 70,
  lines: 80,
  functions: 80,
  statements: 80,
  reporter: ['text', 'lcov', 'html'],
};
```

Add to CI:

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm run test:coverage:ci

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

### Impact

- Visibility into test coverage
- Coverage gates prevent quality degradation
- Identify untested code
- Track coverage trends

---

## Issue: Test Data Duplication

**Priority**: Low  
**Category**: Testing, Maintainability  
**Effort**: Small

### Current State

Test data is defined inline in test files:

```javascript
// test/lib/match.test.js
state.DATA = {
  units: [
    { name: 'u1', entries: [{ translations: { lv: 'braukt', ru: 'ехать' }, games: ['match'] }] },
  ],
};
```

### Problem

- Same data patterns repeated
- Hard to maintain
- Not reflective of real data structure
- Inconsistencies possible

### Recommendation

Create shared test fixtures:

```javascript
// test/fixtures/vocabulary.js
export const minimalDeck = {
  units: [
    {
      name: 'test-unit',
      entries: [
        {
          translations: { lv: 'braukt', en: 'to drive', ru: 'ехать' },
          games: ['match', 'forge'],
          tags: ['movement'],
        },
      ],
    },
  ],
  forge: [
    {
      base: 'mainīt',
      translations: { en: 'to change' },
      correct: 'iz',
      games: ['forge'],
    },
  ],
  notes: {
    'prefix:iz': 'completely, thoroughly',
  },
};

export const largeDeck = {
  units: [
    {
      name: 'movements',
      entries: Array.from({ length: 20 }, (_, i) => ({
        translations: { lv: `word${i}`, en: `translation${i}` },
        games: ['match'],
      })),
    },
  ],
};

export function createTestEntry(overrides = {}) {
  return {
    translations: { lv: 'test', en: 'test', ru: 'тест' },
    games: ['match'],
    tags: [],
    ...overrides,
  };
}
```

### Impact

- Consistent test data
- Easier maintenance
- More realistic testing
- DRY test code

---

## Testing Pyramid Recommendation

```
         /\
        /  \        E2E Tests (Playwright)
       /    \       - 10-15 critical user flows
      /------\      - Cross-browser
     /        \
    /  Integ.  \    Integration Tests
   /   Tests    \   - 20-30 component interactions
  /--------------\  - Data flow tests
 /                \
/    Unit Tests    \ Unit Tests
\                  / - 100+ isolated functions
 \----------------/  - Fast, deterministic
```

| Level       | Count | Focus                             |
| ----------- | ----- | --------------------------------- |
| Unit        | 100+  | Pure functions, models, utilities |
| Integration | 20-30 | Component interactions, data flow |
| E2E         | 10-15 | Critical user journeys            |

---

## Summary Table

| Issue                       | Priority | Effort | Impact                 |
| --------------------------- | -------- | ------ | ---------------------- |
| Limited Game Logic Coverage | High     | Large  | Regression prevention  |
| No Integration Tests        | High     | Medium | Component verification |
| No E2E Tests                | Medium   | Large  | Browser testing        |
| No Accessibility Tests      | Medium   | Small  | WCAG compliance        |
| No Coverage Reporting       | Medium   | Small  | Quality visibility     |
| Test Data Duplication       | Low      | Small  | Maintainability        |
