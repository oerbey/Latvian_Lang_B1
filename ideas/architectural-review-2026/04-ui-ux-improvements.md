# UI/UX Improvements

**Date:** January 20, 2026  
**Category:** User Interface & User Experience

---

## 🟠 High Priority Issues

### 1. Navigation Inconsistency
**Problem:** Navigation links are hardcoded in every HTML file, leading to:
- Maintenance burden when adding new games
- Inconsistent ordering across pages
- Missing games in some navigation instances

**Locations:**
- `index.html:42-55` — Navbar menu
- `index.html:83-99` — Footer navigation
- Each game HTML repeats this pattern

**Recommendation:** 
- Generate navigation from a single source (JSON config)
- Use web components or JS template for shared navigation
- Consider a simple templating approach during build

### 2. Loading State UX
**Problem:** Games show brief flash of unstyled/empty content before initialization

**Current behavior:**
```javascript
const ITEMS = await loadItems();  // Blocks, no loading indicator
```

**Recommendation:**
```html
<div class="game-loading" aria-live="polite">
  <div class="spinner"></div>
  <p>Loading game...</p>
</div>
```
```javascript
showLoading();
const ITEMS = await loadItems();
hideLoading();
```

### 3. Error Feedback UX
**Problem:** Errors are logged to console but users see nothing or broken UI

**Recommendation:** Create consistent error states:
```html
<div class="game-error" role="alert">
  <h2>Unable to load game</h2>
  <p>Check your connection and try again.</p>
  <button onclick="location.reload()">Retry</button>
</div>
```

### 4. Mobile Touch Targets
**Problem:** Some buttons are too small for reliable touch interaction

**Current:** Minimum 44px defined in CSS but not consistently applied

**Files needing review:**
- `styles.css:108` — `.small` buttons may be undersized
- Game-specific buttons vary in size

**Recommendation:**
- Enforce minimum 48x48px touch targets (Google's recommendation)
- Add visual touch feedback (`:active` states)
- Test on actual mobile devices

---

## 🟡 Medium Priority Issues

### 5. Game Card Information Hierarchy
**Location:** `index.html:115-130` — Game cards on homepage

**Problem:** Cards don't communicate:
- Difficulty level
- Estimated time
- Learning objectives
- Progress status

**Recommendation:**
```html
<div class="card-meta">
  <span class="difficulty">●●○</span>
  <span class="time">~5 min</span>
  <span class="progress">3/10 complete</span>
</div>
```

### 6. Feedback Timing & Animation
**Problem:** Correct/incorrect feedback appears and disappears too quickly

**Recommendation:**
- Extend feedback visibility to 1.5-2 seconds
- Add subtle animation for positive reinforcement
- Use consistent color coding (green success, amber try-again, red error)

### 7. Keyboard Navigation Gaps
**Problem:** Canvas-based games lack full keyboard accessibility

**Locations:**
- `app.js` — Canvas click handling only
- Most game modules rely on mouse/touch

**Recommendation:**
- Add keyboard shortcuts for common actions
- Display keyboard hints (e.g., "Press Enter to check")
- Implement focus trap for modal dialogs

### 8. Progress Visibility
**Problem:** Users can't easily see their overall progress

**Current:** Each game tracks progress independently in localStorage

**Recommendation:**
- Add progress dashboard on homepage
- Show completion percentage per game
- Consider "achievements" or milestone rewards

### 9. Responsive Typography
**Problem:** Some text becomes too small on mobile devices

**Location:** `styles.css:74` — Uses `clamp()` but inconsistently

**Recommendation:**
- Audit all font sizes for mobile readability
- Minimum 16px for body text
- Ensure Latvian diacritics render clearly at all sizes

---

## 🟢 Low Priority Issues

### 10. Theme Toggle Placement
**Problem:** Theme toggle in navbar may not be discoverable

**Recommendation:**
- Add tooltip explaining the toggle
- Consider user preference persistence indicator
- Test contrast in both themes

### 11. Empty States
**Problem:** No guidance when user has completed all items or data fails to load

**Recommendation:**
- Design "All complete!" celebration state
- Suggest next steps or games to try
- Provide reset/replay options

### 12. Gamification Opportunities
**Missing features:**
- Daily streaks across games
- Combined leaderboard (local)
- Achievement badges
- Sound effects (optional, with mute)

---

## 🎨 Visual Design Recommendations

### Color Consistency
**Issue:** Feedback colors vary between games

**Current palette (observed):**
- Success: `#0f766e` (light) / `#34d399` (dark)
- Error: `#b91c1c` (light) / `#f87171` (dark)
- Accent: `#2563eb` (light) / `#60a5fa` (dark)

**Recommendation:** Create CSS custom properties for semantic colors:
```css
:root {
  --color-success: #0f766e;
  --color-error: #b91c1c;
  --color-warning: #d97706;
  --color-info: #0284c7;
}

[data-bs-theme="dark"] {
  --color-success: #34d399;
  --color-error: #f87171;
  --color-warning: #fbbf24;
  --color-info: #38bdf8;
}
```

### Animation Guidelines
**Issue:** Animation usage is inconsistent

**Recommendation:** Standardize on:
- **Micro-interactions:** 150-200ms (button feedback)
- **Transitions:** 200-300ms (state changes)
- **Celebrations:** 500-1000ms (confetti, success)
- Respect `prefers-reduced-motion` media query

### Typography Scale
**Issue:** Font sizes are scattered throughout CSS

**Recommendation:** Establish type scale:
```css
:root {
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}
```

---

## 📱 Mobile-Specific UX Issues

### 13. Scroll Behavior
**Location:** `scripts/page-init.js:12-78`

**Problem:** Complex anti-scroll-trap code suggests underlying scrolling issues

**Recommendation:**
- Simplify scroll handling
- Avoid `overflow: hidden` on body
- Test on iOS Safari, Chrome Android, Samsung Internet

### 14. Orientation Changes
**Problem:** No specific handling for orientation changes

**Recommendation:**
- Detect orientation change events
- Adjust canvas size accordingly
- Preserve game state during rotation

### 15. Safe Area Insets
**Problem:** No handling for iPhone notch or home indicator

**Recommendation:**
```css
body {
  padding: env(safe-area-inset-top) 
           env(safe-area-inset-right) 
           env(safe-area-inset-bottom) 
           env(safe-area-inset-left);
}
```

---

## 📎 Related Documents

- [Accessibility](./10-accessibility.md)
- [Mobile & PWA](./11-mobile-pwa.md)

