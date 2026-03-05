/**
 * game-base.js — Reusable game lifecycle helper.
 * ================================================
 * Provides a standardised init → loadStrings → loadData → initUI → mount
 * pipeline that each standalone game page can adopt. Handles errors and
 * exposes a destroy() method for cleanup.
 *
 * Usage:
 *   const game = createGameBase({ loadStrings, loadData, initUI, mount, teardown, onError });
 *   await game.init();
 *   // later: game.destroy();
 */

/**
 * Minimal game lifecycle helper to standardize init/cleanup flows.
 */
export function createGameBase(options = {}) {
  const {
    loadStrings = null,
    loadData = null,
    initUI = null,
    mount = null,
    teardown = null,
    onError = null,
  } = options;

  let started = false;
  let cleanupFn = typeof teardown === 'function' ? teardown : null;

  async function init() {
    try {
      const strings = typeof loadStrings === 'function' ? await loadStrings() : null;
      const data = typeof loadData === 'function' ? await loadData() : null;

      if (typeof initUI === 'function') {
        await initUI({ strings, data });
      }

      if (typeof mount === 'function') {
        cleanupFn = (await mount({ strings, data })) || cleanupFn;
      }

      started = true;
      return { strings, data };
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err);
      } else {
        throw err;
      }
      return null;
    }
  }

  function destroy() {
    if (!started) return;
    if (typeof cleanupFn === 'function') {
      cleanupFn();
    }
    started = false;
  }

  return {
    init,
    destroy,
    get started() {
      return started;
    },
  };
}
