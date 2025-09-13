document.getElementById('year').textContent = new Date().getFullYear();

/**
 * Anti-scroll-trap for mobile:
 * - Never cancel vertical swipes.
 * - Allow horizontal gestures (for sliders) to preventDefault.
 * - Runs on every element that can vertically scroll OR that might capture touches.
 */
(function () {
  // Make sure the page itself is allowed to scroll
  document.documentElement.style.overflowY = 'auto';
  document.body.style.overflowY = 'auto';

  // If any ancestor wrongly sets touch-action:none, neutralize it up the chain of likely containers.
  const neutralizeTouchAction = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const ta = getComputedStyle(n).touchAction;
      if (ta && ta.includes('none')) n.style.touchAction = 'auto';
    }
  };

  // Find likely scrollable containers (no hard-coded class names needed)
  const candidates = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return /(auto|scroll)/.test(cs.overflowY) || /(auto|scroll)/.test(cs.overflow);
  });

  // Also include any big/fullscreen fixed elements that might eat touches
  const fullscreenFixed = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.top <= 0 && r.left <= 0 &&
           r.right >= window.innerWidth && r.bottom >= window.innerHeight;
  });

  const targets = [...new Set([...candidates, ...fullscreenFixed])];
  if (targets.length === 0) return;

  targets.forEach(el => {
    // Encourage browsers (esp. iOS Safari) to treat vertical pan as the default
    el.style.webkitOverflowScrolling = 'touch';
    // Let vertical panning through; allow pinch-zoom
    if (!getComputedStyle(el).touchAction || getComputedStyle(el).touchAction === 'auto') {
      el.style.touchAction = 'pan-y pinch-zoom';
    }
    neutralizeTouchAction(el);

    let sx = 0, sy = 0;
    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - sx);
      const dy = Math.abs(t.clientY - sy);

      const isHorizontal = dx > dy;
      // Only suppress default for horizontal gestures (e.g., custom sliders).
      if (isHorizontal) {
        e.preventDefault(); // requires passive:false
      }
      // If the element itself cannot scroll vertically, let the event bubble so the page can scroll.
      // (Do NOT call preventDefault here.)
    }, { passive: false });
  });

  // Safety net: if the focused area still can't scroll and fills the screen exactly,
  // make sure there's ever-so-slight page scroll available to escape the trap.
  const root = document.scrollingElement || document.documentElement;
  if (root.scrollHeight <= root.clientHeight) {
    document.body.style.minHeight = 'calc(100dvh + 1px)';
  }
})();

