# Accessibility (a11y) Improvements

**Date:** January 20, 2026  
**Category:** Accessibility / WCAG Compliance

---

## 🔍 Current Accessibility Status

| Feature | Status |
|---------|--------|
| Screen reader support | Partial |
| Keyboard navigation | Partial |
| ARIA labels | Present, inconsistent |
| Color contrast | Untested |
| Focus management | Minimal |
| Skip links | Missing |
| Reduced motion | Partial |

---

## 🟠 High Priority Issues

### 1. Canvas Games Are Not Screen Reader Accessible
**Problem:** Canvas-based games render text/UI as pixels, invisible to assistive technology

**Location:** `app.js`, `src/lib/render.js`

**Current mitigation:** `#sr-game-state` element exists
```javascript
mustId('sr-game-state').setAttribute('aria-label', i18n.labels.gameState);
```

**Issues:**
- State updates may not be announced
- Interactive elements (buttons on canvas) have no ARIA representation

**Recommendation:**
```html
<!-- Add live region for game updates -->
<div id="sr-game-state" aria-live="polite" aria-atomic="true" class="visually-hidden">
  <!-- Dynamically updated with game state -->
</div>
```

```javascript
function announceToScreenReader(message) {
  const sr = mustId('sr-game-state');
  sr.textContent = '';
  // Force re-announcement
  requestAnimationFrame(() => {
    sr.textContent = message;
  });
}

// Use during game events
announceToScreenReader('Correct! Score: 5');
```

For truly accessible canvas games, consider HTML/SVG alternatives:
- Provide toggle for "accessible mode" using HTML elements
- Use `role="img"` with `aria-label` for decorative canvas content

### 2. Missing Skip Links
**Problem:** No way to skip navigation and jump to main content

**Recommendation:**
```html
<body>
  <a href="#main" class="skip-link visually-hidden-focusable">
    Skip to main content
  </a>
  <!-- navbar -->
  <main id="main">
    <!-- content -->
  </main>
</body>
```

```css
.skip-link:focus {
  position: fixed;
  top: 0;
  left: 0;
  background: var(--accent);
  color: var(--accent-contrast);
  padding: 8px 16px;
  z-index: 9999;
}
```

---

## 🟡 Medium Priority Issues

### 3. Focus Management Gaps
**Problem:** Focus not properly managed during:
- Modal/overlay opening
- Game state changes
- Dynamic content loading

**Locations:**
- Help overlay in `app.js:91-107`
- Error overlay in `errors.js`

**Recommendation:**
```javascript
function openOverlay(overlayElement) {
  // Store current focus
  const previousFocus = document.activeElement;
  
  // Show overlay
  overlayElement.hidden = false;
  
  // Focus first focusable element
  const focusable = overlayElement.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable?.focus();
  
  // Trap focus
  overlayElement.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOverlay(overlayElement, previousFocus);
    }
  });
}

function closeOverlay(overlayElement, previousFocus) {
  overlayElement.hidden = true;
  previousFocus?.focus();
}
```

### 4. Inconsistent ARIA Labels
**Problem:** Some interactive elements lack proper labeling

**Examples found:**
```javascript
// Good
btnPractice.setAttribute('aria-label', i18n.buttons.practice);

// Missing labels observed in some games
<button id="tt-check">Check</button> // Missing aria-label for icon-only variant
```

**Recommendation:** Audit all buttons and add labels:
```javascript
function setButtonAccessibility(button, label, pressed = null) {
  button.setAttribute('aria-label', label);
  if (pressed !== null) {
    button.setAttribute('aria-pressed', String(pressed));
  }
}
```

### 5. Color Contrast Issues
**Problem:** Some text colors may not meet WCAG 2.1 AA requirements

**Suspect areas:**
- `--muted: #475569` on `--bg: #f4f7fb` (light mode)
- Feedback messages on colored backgrounds
- Disabled button text

**Recommendation:** Audit with contrast checker:
```css
/* Ensure minimum 4.5:1 for normal text, 3:1 for large text */
:root {
  --muted: #4b5563; /* Darker for better contrast */
}

[data-bs-theme="dark"] {
  --muted: #d1d5db; /* Lighter for dark mode */
}
```

### 6. Missing Form Labels
**Problem:** Input fields may lack associated labels

**Location:** Various game input fields

**Current:**
```html
<input id="tt-input" type="text" placeholder="Type answer...">
```

**Recommendation:**
```html
<label for="tt-input" class="visually-hidden">Type your answer</label>
<input id="tt-input" type="text" placeholder="Type answer..." aria-describedby="tt-hint">
<span id="tt-hint">Enter the missing word</span>
```

---

## 🟢 Low Priority Issues

### 7. Reduced Motion Support
**Problem:** Animations may cause issues for users with vestibular disorders

**Current:** Partial support via CSS

**Recommendation:** Add JavaScript check:
```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

function animate(element, options) {
  if (prefersReducedMotion) {
    // Skip animation, apply end state immediately
    Object.assign(element.style, options.endState);
    return Promise.resolve();
  }
  return element.animate(options.keyframes, options.timing).finished;
}
```

```css
@media (prefers-reduced-motion: reduce) {
  .hover-lift {
    transition: none;
  }
  
  /* Disable confetti, use simple color flash instead */
  .confetti-container {
    display: none;
  }
}
```

### 8. Language Attribute Updates
**Problem:** `<html lang>` should update when language changes

**Current:** Updated in `loadTranslations()` ✓

**Verify:** All game pages update `lang` when using different i18n

### 9. Error State Accessibility
**Location:** `src/lib/errors.js`

**Verify:** Error overlay has:
- `role="alertdialog"`
- `aria-modal="true"`
- Focus trapped within
- Escape key closes

---

## 📋 WCAG 2.1 Compliance Checklist

| Criterion | Level | Status | Notes |
|-----------|-------|--------|-------|
| 1.1.1 Non-text Content | A | ⚠️ | Canvas needs alternatives |
| 1.3.1 Info and Relationships | A | ⚠️ | Missing form labels |
| 1.4.3 Contrast (Minimum) | AA | ❓ | Needs audit |
| 1.4.11 Non-text Contrast | AA | ❓ | Needs audit |
| 2.1.1 Keyboard | A | ⚠️ | Canvas games limited |
| 2.1.2 No Keyboard Trap | A | ✅ | Verified |
| 2.4.1 Bypass Blocks | A | ❌ | No skip links |
| 2.4.3 Focus Order | A | ⚠️ | Not always logical |
| 2.4.7 Focus Visible | AA | ✅ | Browser default |
| 3.1.1 Language of Page | A | ✅ | Set dynamically |
| 4.1.2 Name, Role, Value | A | ⚠️ | Inconsistent ARIA |

---

## 🛠️ Testing Tools

| Tool | Purpose |
|------|---------|
| axe DevTools | Automated accessibility audit |
| WAVE | Web accessibility evaluation |
| Contrast Checker | Color contrast verification |
| NVDA/VoiceOver | Screen reader testing |
| Keyboard only | Manual navigation test |

---

## 📎 Related Documents

- [UI/UX Improvements](./04-ui-ux-improvements.md)
- [Quick Wins](./13-quick-wins.md)

