// Track interactive canvas rectangles for click detection.
export const clickables = [];

/**
 * Find clickable element at coordinates; returns first match (draw order matters).
 * @param {number} x
 * @param {number} y
 * @returns {object | null}
 */
export function hitAt(x, y) {
  for (const c of clickables) {
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c;
  }
  return null;
}

/**
 * Clear all registered clickables (call at start of each frame).
 */
export function resetClicks() {
  clickables.length = 0;
}
