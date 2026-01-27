# Dependency Updates — Latvian_Lang_B1

This document covers dependency management, updates, and security considerations.

---

## Current Dependency State

### External CDN Dependencies

The project loads dependencies from CDNs:

```html
<!-- week1.html -->
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
  rel="stylesheet"
/>
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.13.1/font/bootstrap-icons.min.css"
  rel="stylesheet"
/>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
```

### Development Dependencies (Present)

The repository includes a `package.json` in the root, so development tooling can be tracked via npm.
Typical dev tools for this kind of project include:

- Node.js native test runner (`node --test`)
- ESLint / Prettier (already configured via repo dotfiles)
- Python (for build scripts)

---

## Issue: package.json Could Be Standardized/Extended

**Priority**: High  
**Category**: Dependencies, Project Management  
**Effort**: Small

### Current State

The repository already contains a `package.json` in the root. However, the scripts/devDependencies may not yet cover common workflows (lint, format checks, coverage, offline build, etc.).

### Problem

- Contributors may not have a single, predictable command set (`npm test`, `npm run lint`, etc.)
- CI/CD is harder to standardize without consistent scripts
- Tooling can drift over time without a clear “source of truth”

### Recommendation

Review the existing `package.json` and ensure it includes a minimal but complete toolchain.

Example `package.json` (scripts + devDependencies) shape:

```json
{
  "name": "latvian-lang-b1",
  "version": "1.0.0",
  "description": "Interactive games for learning Latvian at B1 level",
  "type": "module",
  "main": "app.js",
  "scripts": {
    "start": "npx http-server . -p 3000 -c-1",
    "test": "node --test test/**/*.test.js",
    "test:watch": "node --test --watch test/**/*.test.js",
    "test:coverage": "c8 --reporter=html --reporter=text node --test",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix",
    "format": "prettier --write \"**/*.{js,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{js,json,css,md}\"",
    "build:offline": "python scripts/build_week1_offline.py",
    "docs": "jsdoc -c jsdoc.config.json",
    "prepare": "husky install"
  },
  "keywords": ["latvian", "language-learning", "educational", "games", "vocabulary"],
  "author": "Latvian B1 Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/oerbey/Latvian_Lang_B1"
  },
  "bugs": {
    "url": "https://github.com/oerbey/Latvian_Lang_B1/issues"
  },
  "homepage": "https://oerbey.github.io/Latvian_Lang_B1/",
  "engines": {
    "node": ">=18.0.0"
  },
  "devDependencies": {
    "c8": "^8.0.0",
    "eslint": "^8.57.0",
    "husky": "^9.0.0",
    "jsdoc": "^4.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.2.0"
  },
  "lint-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

### Impact

- Professional project setup
- Easy script running
- Dependency tracking
- CI/CD integration

---

## Issue: CDN Dependencies Without Version Lock

**Priority**: Medium  
**Category**: Dependencies, Stability  
**Effort**: Small

### Current State

Bootstrap is pinned to a specific version (5.3.8), which is good:

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" />
```

However, Bootstrap Icons uses a different CDN:

```html
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-icons/1.13.1/font/bootstrap-icons.min.css"
/>
```

### Problem

- Two different CDN providers
- Potential for CDN-specific issues
- No fallback if CDN is down
- Version 1.13.1 for Bootstrap Icons (check for updates)

### Recommendation

1. Standardize on one CDN:

```html
<!-- Use jsDelivr for both -->
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
  rel="stylesheet"
  integrity="sha384-..."
  crossorigin="anonymous"
/>

<link
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
  rel="stylesheet"
  integrity="sha384-..."
  crossorigin="anonymous"
/>

<script
  src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

2. Add local fallback (optional):

```html
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
  rel="stylesheet"
  onerror="this.onerror=null;this.href='assets/vendor/bootstrap.min.css';"
/>
```

3. Create dependency tracking file:

```json
// dependencies.json
{
  "cdnDependencies": {
    "bootstrap": {
      "version": "5.3.8",
      "cdn": "jsdelivr",
      "files": ["dist/css/bootstrap.min.css", "dist/js/bootstrap.bundle.min.js"],
      "integrity": {
        "css": "sha384-...",
        "js": "sha384-..."
      }
    },
    "bootstrap-icons": {
      "version": "1.13.1",
      "cdn": "jsdelivr",
      "files": ["font/bootstrap-icons.min.css"],
      "integrity": {
        "css": "sha384-..."
      }
    }
  },
  "lastUpdated": "2026-01-18"
}
```

### Impact

- Consistent CDN usage
- Version tracking
- Easier updates
- Fallback capability

---

## Issue: No Dependency Security Scanning

**Priority**: Medium  
**Category**: Dependencies, Security  
**Effort**: Small

### Current State

No automated security scanning for dependencies.

### Problem

- Vulnerable dependencies might go unnoticed
- CDN resources not verified
- No alerts for security issues

### Recommendation

1. Add npm audit to CI (package.json exists, so wire it into CI):

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=high
```

2. Add Dependabot configuration:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
    groups:
      development:
        patterns:
          - '*'
        update-types:
          - 'minor'
          - 'patch'
```

3. Monitor CDN dependencies manually or with script:

```javascript
// scripts/check-cdn-versions.js
const DEPS = {
  bootstrap: {
    current: '5.3.8',
    npm: 'bootstrap',
  },
  'bootstrap-icons': {
    current: '1.13.1',
    npm: 'bootstrap-icons',
  },
};

async function checkVersions() {
  for (const [name, info] of Object.entries(DEPS)) {
    const res = await fetch(`https://registry.npmjs.org/${info.npm}/latest`);
    const data = await res.json();
    const latest = data.version;

    if (latest !== info.current) {
      console.log(`⚠️  ${name}: ${info.current} → ${latest}`);
    } else {
      console.log(`✓  ${name}: ${info.current} (up to date)`);
    }
  }
}

checkVersions();
```

### Impact

- Proactive security
- Automated vulnerability detection
- Easier dependency updates
- Security compliance

---

## Issue: Bootstrap Version Analysis

**Priority**: Low  
**Category**: Dependencies, Updates  
**Effort**: Small

### Current State

Using Bootstrap 5.3.8.

### Analysis

| Version | Status     | Notes                                                               |
| ------- | ---------- | ------------------------------------------------------------------- |
| 5.3.8   | ✅ Current | Latest v5.3 patch release (released Aug 2025); v5.4.0 expected next |

### Recommendation

Bootstrap 5.3.8 is a recent stable version. No immediate update needed.

**Things to monitor:**

- Bootstrap 5.4.x releases for new features
- Security advisories for Bootstrap
- Bootstrap 6.x roadmap

**Update strategy:**

```javascript
// Check for updates quarterly
// Test in development before updating production
// Verify no breaking changes to used components
```

---

## Issue: Python Dependencies Not Tracked

**Priority**: Low  
**Category**: Dependencies, Build Tools  
**Effort**: Small

### Current State

Python is used for build scripts:

```python
# scripts/build_week1_offline.py
from __future__ import annotations
import json
from pathlib import Path
```

Only standard library is used (no external dependencies).

### Recommendation

Add `requirements.txt` for documentation even if empty:

```txt
# requirements.txt
# Build scripts use Python 3.8+ standard library only
# No external dependencies required
```

If external packages are added later:

```txt
# requirements.txt
# Core
# (none currently)

# Development/Optional
openpyxl>=3.1.0  # For Excel file handling (if needed)
```

### Impact

- Clear Python requirements
- Easier onboarding
- CI/CD compatibility

---

## Issue: No Lock File for Reproducible Builds

**Priority**: Low  
**Category**: Dependencies, Reproducibility  
**Effort**: Small

### Current State

No `package-lock.json` or similar lock file.

### Problem

- Different versions might be installed on different machines
- Build reproducibility not guaranteed
- "Works on my machine" issues

### Recommendation

When package.json scripts and tooling are standardized:

```bash
# Generate lock file
npm install

# Commit lock file
git add package-lock.json
git commit -m "chore: add package lock file"
```

Add to CI:

```yaml
# Use npm ci instead of npm install
- name: Install dependencies
  run: npm ci # Uses lock file for exact versions
```

### Impact

- Reproducible builds
- Consistent behavior across environments
- Faster CI installs

---

## Dependency Update Checklist

### Quarterly Review

```markdown
## Dependency Update Checklist - Q1 2025

### CDN Dependencies

- [ ] Check Bootstrap version (current: 5.3.8)
- [ ] Check Bootstrap Icons version (current: 1.13.1)
- [ ] Update SRI hashes if versions changed
- [ ] Test all pages after update

### npm Dependencies (when applicable)

- [ ] Run `npm outdated`
- [ ] Run `npm audit`
- [ ] Update patch versions
- [ ] Evaluate minor/major updates
- [ ] Run full test suite

### Python Dependencies

- [ ] Check standard library compatibility
- [ ] Verify Python version support

### Browser Compatibility

- [ ] Verify target browser versions
- [ ] Check for deprecated APIs
- [ ] Test on mobile devices
```

---

## Recommended Dependency Strategy

### Principles

1. **Minimal Dependencies**
   - Use native browser APIs when possible
   - Avoid heavy frameworks
   - Prefer CDN for common libraries

2. **Version Pinning**
   - Always use specific versions
   - Include SRI hashes
   - Document update rationale

3. **Regular Updates**
   - Quarterly security review
   - Test before updating production
   - Maintain changelog of updates

4. **Fallback Strategy**
   - Offline bundles for core functionality
   - Graceful degradation if CDN fails
   - Service worker caching

---

## Summary Table

| Issue                        | Priority | Effort | Impact             |
| ---------------------------- | -------- | ------ | ------------------ |
| package.json standardization | High     | Small  | Project management |
| CDN Version Management       | Medium   | Small  | Stability          |
| No Security Scanning         | Medium   | Small  | Security           |
| Bootstrap Version            | Low      | Small  | Maintenance        |
| Python Dependencies          | Low      | Small  | Documentation      |
| No Lock File                 | Low      | Small  | Reproducibility    |
