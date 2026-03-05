/**
 * clickables.js — Canvas hit-region registry for interactive elements.
 * =====================================================================
 * The canvas-based games don't have real DOM buttons, so we maintain a
 * flat array of rectangular "clickable" regions. Each frame clears the
 * list (resetClicks) and game-mode renderers push new entries. On
 * click/tap, hitAt() scans the list to find the first match.
 *
 * Exports:
 *   clickables   — Mutable array of {x, y, w, h, onClick} objects.
 *   hitAt(x, y)  — Returns the first clickable region under the point, or null.
 *   resetClicks()— Empties the clickables array (call at the start of each frame).
 */

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
