/**
 * aria.js — Screen-reader live-region announcement helper.
 * =========================================================
 * Provides a single function to safely push messages to an aria-live
 * region, with deduplication to avoid redundant announcements.
 *
 * Exports:
 *   announceLive(node, message) — Set text content on a live region element.
 */

/**
 * Announce text to screen readers via live region; dedupes repeated messages.
 * Clears and re-renders text to ensure screen reader re-announcement on updates.
 * @param {HTMLElement | null} node
 * @param {string | null} message
 */
export function announceLive(node, message) {
  if (!node) return;
  const next = String(message ?? '');
  // Skip if message hasn't changed (avoid redundant announcements).
  if (node.dataset.lastMessage === next) return;
  node.dataset.lastMessage = next;
  // Clear and rebuild to force screen reader re-announcement.
  node.textContent = '';
  const commit = () => {
    node.textContent = next;
  };
  // Use rAF for smooth timing; fallback to setTimeout in SSR/Worker contexts.
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(commit);
  } else {
    setTimeout(commit, 0);
  }
}
