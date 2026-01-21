# Quick Wins

**Date:** January 20, 2026  
**Category:** Low-Effort, High-Impact Improvements

---

## 🎯 Selection Criteria

Quick wins are improvements that:
- Can be implemented in < 4 hours
- Require minimal testing
- Have low risk of regressions
- Provide immediate user or developer benefit

---

## 🏃 Ready to Implement

### 1. Fix Duplicate `loadJSON` Declaration
**Effort:** 5 minutes  
**Impact:** Prevents silent bugs  
**Location:** `src/games/travel-tracker/index.js:172-177`

**Change:** Rename local function to avoid shadowing import
```javascript
// Before
async function loadJSON(path) { ... }

// After
async function fetchGameData(path) { ... }
```

---

### 2. Add PWA Icons to Manifest
**Effort:** 30 minutes  
**Impact:** Enables PWA installation  
**Location:** `manifest.json`

**Steps:**
1. Create app icon (512x512 PNG)
2. Use tool to generate all sizes: https://realfavicongenerator.net/
3. Add icons array to `manifest.json`
4. Add Apple touch icon to HTML

---

### 3. Add Skip Link
**Effort:** 15 minutes  
**Impact:** Accessibility improvement  
**Location:** All HTML files

```html
<!-- Add after <body> -->
<a href="#main" class="skip-link visually-hidden-focusable">
  Skip to main content
</a>
```

```css
/* styles.css */
.skip-link:focus {
  position: fixed;
  top: 8px;
  left: 8px;
  background: var(--accent);
  color: var(--accent-contrast);
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 10000;
  text-decoration: none;
}
```

---

### 4. Add Format Script to package.json
**Effort:** 5 minutes  
**Impact:** Consistent code formatting  
**Location:** `package.json`

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

---

### 5. Add Offline Indicator
**Effort:** 20 minutes  
**Impact:** Better UX when offline  
**Location:** `scripts/page-init.js`

```javascript
// Add to page-init.js
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
  document.body.classList.add('offline');
});
```

```css
/* styles.css */
body.offline::before {
  content: 'You are offline';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #f59e0b;
  color: #000;
  text-align: center;
  padding: 4px;
  font-size: 14px;
  z-index: 10000;
}
```

---

### 6. Fix Footer Year Auto-Update
**Effort:** 5 minutes  
**Impact:** Removes hardcoded year  
**Status:** Already implemented ✓

Verify in `index.html:103`:
```javascript
document.getElementById('year').textContent = new Date().getFullYear();
```

---

### 7. Add Basic Console Welcome Message
**Effort:** 10 minutes  
**Impact:** Developer experience  
**Location:** `scripts/page-init.js`

```javascript
if (typeof console !== 'undefined') {
  console.log(
    '%c🇱🇻 Latvian B1 Games',
    'font-size: 20px; font-weight: bold; color: #9e1b34;'
  );
  console.log('Learn more: https://github.com/oerbey/Latvian_Lang_B1');
}
```

---

### 8. Add Service Worker Update Notification
**Effort:** 30 minutes  
**Impact:** Users get latest code  
**Location:** `scripts/page-init.js` (partially exists)

**Verify** the update prompt in `page-init.js:82-100` is working:
```javascript
function showUpdatePrompt(registration) {
  if (!registration?.waiting) return;
  // ... creates banner
}
```

---

### 9. Add Game Loading States
**Effort:** 30 minutes  
**Impact:** Better perceived performance  
**Location:** Each game HTML

```html
<!-- Add to game pages -->
<div id="game-loading" class="loading-overlay" aria-live="polite">
  <div class="spinner-border" role="status">
    <span class="visually-hidden">Loading game...</span>
  </div>
</div>
```

```javascript
// In game init
document.getElementById('game-loading')?.remove();
```

---

### 10. Add noopener to External Links
**Effort:** 10 minutes  
**Impact:** Security improvement  
**Location:** All HTML files

Search for `target="_blank"` and ensure `rel="noopener noreferrer"`:
```html
<a href="https://github.com/..." target="_blank" rel="noopener noreferrer">
```

---

### 11. Add Favicon for Each Theme
**Effort:** 20 minutes  
**Impact:** Better branding  
**Location:** HTML head

```html
<link rel="icon" href="favicon.ico" media="(prefers-color-scheme: light)">
<link rel="icon" href="favicon-dark.ico" media="(prefers-color-scheme: dark)">
```

---

### 12. Enable Test Coverage in CI
**Effort:** 5 minutes  
**Impact:** Visibility into test quality  
**Location:** `.github/workflows/test.yml`

```yaml
- name: Run tests with coverage
  run: npm run test -- --experimental-test-coverage
```

---

### 13. Add .nvmrc Verification
**Effort:** 5 minutes  
**Impact:** Consistent Node version  
**Status:** Already exists ✓

Verify `.nvmrc` contains appropriate version (e.g., `20`).

---

### 14. Document Storage Keys
**Effort:** 15 minutes  
**Impact:** Developer understanding  
**Location:** `src/lib/storage.js` (partially done)

Expand the comment block at lines 6-17 to be comprehensive.

---

## 📋 Implementation Checklist

| # | Quick Win | Effort | Done |
|---|-----------|--------|------|
| 1 | Fix duplicate loadJSON | 5 min | ☐ |
| 2 | Add PWA icons | 30 min | ☐ |
| 3 | Add skip link | 15 min | ☐ |
| 4 | Add format script | 5 min | ☐ |
| 5 | Add offline indicator | 20 min | ☐ |
| 6 | Verify footer year | 5 min | ☐ |
| 7 | Add console welcome | 10 min | ☐ |
| 8 | Verify SW update prompt | 30 min | ☐ |
| 9 | Add loading states | 30 min | ☐ |
| 10 | Add noopener to links | 10 min | ☐ |
| 11 | Add theme favicon | 20 min | ☐ |
| 12 | Enable test coverage | 5 min | ☐ |
| 13 | Verify .nvmrc | 5 min | ☐ |
| 14 | Document storage keys | 15 min | ☐ |

**Total estimated time:** ~3.5 hours

---

## 🚀 Recommended Order

1. **Security first:** #10 (noopener)
2. **Developer experience:** #1, #4, #14
3. **User experience:** #2, #3, #5, #9
4. **Polish:** #7, #11

---

## 📎 Related Documents

- [Executive Summary](./01-executive-summary.md)
- [Platform & Tooling](./07-platform-and-tooling.md)

