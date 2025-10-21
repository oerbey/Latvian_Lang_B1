# iPhone Mobile Development Quick Reference

**Quick guide for maintaining iPhone compatibility in Travel Tracker**

---

## Critical Rules

### 1. Touch Targets
✅ **DO**: Minimum 44pt (≈50px on iPhone)
```css
button {
  min-height: 50px;
  min-width: 44px;
}
```

❌ **DON'T**: Buttons smaller than 44pt
```css
button {
  min-height: 30px; /* Too small! */
}
```

### 2. Input Font Size
✅ **DO**: Use 16px minimum to prevent zoom
```css
input {
  font-size: 1rem; /* 16px */
}
```

❌ **DON'T**: Font smaller than 16px
```css
input {
  font-size: 14px; /* Triggers zoom! */
}
```

### 3. Safe Area Insets
✅ **DO**: Always use env() with fallback
```css
.panel {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
}
```

❌ **DON'T**: Ignore safe areas
```css
.panel {
  padding-bottom: 1rem; /* Content hidden on notched iPhones */
}
```

### 4. Touch Action
✅ **DO**: Prevent double-tap zoom
```css
button {
  touch-action: manipulation;
}
```

❌ **DON'T**: Allow default touch behavior
```css
button {
  /* No touch-action = 300ms delay */
}
```

### 5. WebKit Prefixes
✅ **DO**: Add -webkit- prefixes for transforms
```css
.element {
  -webkit-transform: translateY(10px);
  transform: translateY(10px);
}
```

❌ **DON'T**: Forget WebKit prefixes
```css
.element {
  transform: translateY(10px); /* May not work on older iOS */
}
```

---

## iPhone Breakpoints

```css
/* Standard breakpoints for iPhone compatibility */

/* iPhone 14 Pro Max, 15 Plus (430px) */
@media (max-width: 430px) { }

/* iPhone 14, 13, 12 standard (390px) */
@media (max-width: 390px) { }

/* iPhone SE, 13 mini (375px) */
@media (max-width: 375px) { }

/* Ultra-narrow devices (360px) */
@media (max-width: 360px) { }

/* Landscape (height-based) */
@media (max-height: 500px) and (orientation: landscape) { }
```

---

## Performance Checklist

- [ ] Use `translate3d()` instead of `translate()` for animations
- [ ] Add `contain: layout style paint;` for isolated sections
- [ ] Minimize `backdrop-filter` usage (performance-intensive)
- [ ] Use `touch-action: manipulation` on interactive elements
- [ ] Set `-webkit-tap-highlight-color` to reduce visual lag
- [ ] Avoid fixed positioning when possible (causes repaints)

---

## Common iPhone Issues & Fixes

### Issue: Content hidden behind notch
```css
/* Fix with safe-area-inset */
padding-top: calc(1rem + env(safe-area-inset-top, 0px));
```

### Issue: Input zooms page on focus
```css
/* Fix with 16px minimum font-size */
input { font-size: 1rem; }
```

### Issue: Scroll not smooth
```css
/* Fix with overflow properties */
overflow-y: auto;
-webkit-overflow-scrolling: touch;
overscroll-behavior-y: contain;
```

### Issue: Buttons have tap delay
```css
/* Fix with touch-action */
button { touch-action: manipulation; }
```

### Issue: Animations janky
```css
/* Fix with hardware acceleration */
transform: translate3d(0, 0, 0);
-webkit-transform: translate3d(0, 0, 0);
```

---

## Testing Workflow

1. **Browser DevTools**: Test using iPhone simulators
   - Chrome: Toggle device toolbar (Cmd+Shift+M / Ctrl+Shift+M)
   - Set device to iPhone 13 Pro, 14 Pro Max, SE

2. **Real Device Testing**: Always test on actual iPhone
   - Connect iPhone via USB
   - Enable Web Inspector: Settings → Safari → Advanced
   - Safari → Develop → [Your iPhone] → [Page]

3. **Orientation Testing**: Test both portrait and landscape
   - Rotate device/simulator
   - Check layout doesn't break
   - Verify landscape-specific styles apply

4. **Safe Area Testing**: Use iPhone with notch
   - iPhone 12 or newer recommended
   - Check content not hidden by notch/home indicator

5. **Touch Target Testing**: Use "Show Touch Indicators"
   - Settings → Accessibility → Touch → AssistiveTouch
   - Enable "Always Show Menu"
   - Verify 44pt minimum

---

## Code Review Checklist

When reviewing mobile CSS changes:

- [ ] All buttons ≥44pt touch target?
- [ ] Input fields use `font-size: 1rem` or larger?
- [ ] Safe area insets included where needed?
- [ ] WebKit prefixes added for transforms/transitions?
- [ ] `touch-action: manipulation` on interactive elements?
- [ ] Tested on iPhone breakpoints (430px, 390px, 375px)?
- [ ] Landscape orientation considered?
- [ ] Performance impact minimal (no unnecessary repaints)?
- [ ] Dark mode works correctly?
- [ ] No horizontal overflow on narrow screens?

---

## Resources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [WebKit Blog - iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [MDN: env() function](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- [CSS Tricks: Safe Area Insets](https://css-tricks.com/the-notch-and-css/)

---

## Emergency Fixes

### Quick fix for layout breaking on iPhone:
```css
@media (max-width: 430px) {
  .problematic-element {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
}
```

### Quick fix for touch issues:
```css
button, a, input {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  min-height: 44px;
  min-width: 44px;
}
```

### Quick fix for notch issues:
```css
body {
  padding: env(safe-area-inset-top, 0px) 
          env(safe-area-inset-right, 0px) 
          env(safe-area-inset-bottom, 0px) 
          env(safe-area-inset-left, 0px);
}
```

---

**Keep this guide handy when making mobile-related changes!**
