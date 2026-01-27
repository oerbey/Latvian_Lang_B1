# Platform & Tooling Improvements

**Date:** January 20, 2026  
**Category:** Build System, Frameworks, Developer Experience

---

## 🔍 Current Tooling

| Category      | Current Tool          | Notes                      |
| ------------- | --------------------- | -------------------------- |
| Build         | None (raw ES modules) | No bundling, transpilation |
| Dev Server    | `npx http-server`     | Basic static server        |
| Testing       | Node.js test runner   | Native, no framework       |
| Linting       | ESLint 8.x            | With Prettier config       |
| Formatting    | Prettier 3.x          | Manual invocation          |
| Data Scripts  | Node.js + Python      | Mixed ecosystem            |
| Type Checking | None                  | Pure JavaScript            |
| CI/CD         | GitHub Actions        | Basic test workflow        |

---

## 🟠 High Priority Issues

### 1. Mixed Build Script Languages

**Problem:** Data generation uses both Node.js and Python

**Files:**

- `scripts/xlsx_to_json.mjs` — Node.js
- `scripts/personality_csv_to_json.mjs` — Node.js
- `scripts/build_week1_offline.py` — Python

**Issues:**

- Contributors need both runtimes
- Inconsistent error handling
- Different execution environments

**Recommendation:** Consolidate to Node.js:

```javascript
// scripts/build-all.mjs
import { buildXlsxToJson } from './xlsx_to_json.mjs';
import { buildPersonalityCsv } from './personality_csv_to_json.mjs';
import { buildWeekOffline } from './build_week_offline.mjs'; // Port from Python

await Promise.all([buildXlsxToJson(), buildPersonalityCsv(), buildWeekOffline()]);
```

```json
// package.json
{
  "scripts": {
    "build:data": "node scripts/build-all.mjs"
  }
}
```

### 2. No Pre-commit Hooks

**Problem:** Code quality checks run only in CI

**Recommendation:** Add husky + lint-staged:

```json
// package.json
{
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.json": ["prettier --write"]
  }
}
```

### 3. No Development Mode Features

**Problem:** No hot reload, no source maps, no error overlay

**Current:** Manual page refresh on every change

**Recommendation:** Add Vite for development:

```javascript
// vite.config.js
export default {
  root: '.',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
};
```

```json
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 🟡 Medium Priority Issues

### 4. No Type Checking

**Problem:** Pure JavaScript with no static type analysis

**Options:**

1. **JSDoc + TypeScript check** (lowest friction)
2. **TypeScript migration** (most thorough)
3. **JSDoc + VS Code** (IDE-only)

**Recommendation:** Start with JSDoc + tsconfig:

```json
// jsconfig.json (enhance existing)
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "noImplicitAny": false,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*.js", "app.js", "theme.js"]
}
```

Add JSDoc to core modules:

```javascript
/**
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 * @template T
 */
export function loadJSON(key, fallback) {
  /* ... */
}
```

### 5. Outdated ESLint Configuration

**Location:** `.eslintrc.cjs`

**Problem:** ESLint 8.x, new flat config available

**Recommendation:** Migrate to ESLint 9.x flat config:

```javascript
// eslint.config.js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
```

### 6. Missing npm Scripts

**Current scripts:**

```json
{
  "start": "npx http-server . -p 5173",
  "test": "node --test",
  "test:watch": "node --test --watch",
  "build:data": "node scripts/xlsx_to_json.mjs",
  "build:personality": "node scripts/personality_csv_to_json.mjs",
  "build:offline": "python3 scripts/build_week1_offline.py",
  "lint": "eslint . --ext .js"
}
```

**Missing scripts:**

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "validate": "npm run lint && npm run test && npm run format:check",
    "clean": "rm -rf dist .cache",
    "build:all": "npm run build:data && npm run build:personality",
    "typecheck": "tsc --noEmit",
    "prepare": "husky install"
  }
}
```

---

## 🟢 Low Priority Issues

### 7. No Workspace Documentation Generator

**Problem:** No auto-generated API docs

**Recommendation:** Add typedoc or JSDoc:

```json
{
  "scripts": {
    "docs": "typedoc src/lib --out docs/api"
  }
}
```

### 8. No Bundle Analyzer

**Problem:** Can't visualize dependency sizes

**Recommendation:** Add rollup-plugin-visualizer:

```javascript
// When using Vite
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [visualizer({ open: true })],
};
```

---

## 🛠️ Recommended Tool Upgrades

| Current           | Recommended      | Benefit                      |
| ----------------- | ---------------- | ---------------------------- |
| http-server       | Vite             | HMR, fast builds, modern DX  |
| ESLint 8.x        | ESLint 9.x       | Flat config, better perf     |
| No types          | JSDoc + checkJs  | Type safety, IDE support     |
| Manual formatting | Prettier + husky | Consistent code style        |
| Mixed Node/Python | Node.js only     | Simplified contributor setup |
| No bundling       | esbuild/Vite     | Production optimization      |

---

## 📦 Suggested package.json

```json
{
  "name": "latvian-lang-b1",
  "version": "1.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test",
    "test:watch": "node --test --watch",
    "test:coverage": "node --test --experimental-test-coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint && npm run test",
    "build:data": "node scripts/build-all.mjs",
    "prepare": "husky install"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.3.3",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "xlsx": "^0.18.5"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

## 📈 CI/CD Enhancements

**Current workflow:** Basic test on push/PR

**Enhanced workflow:**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

---

## 📎 Related Documents

- [Testing Strategy](./08-testing-strategy.md)
- [Data Modeling](./05-data-modeling.md)
