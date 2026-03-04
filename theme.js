/**
 * theme.js — Bootstrap 5.3 color-mode toggle with localStorage persistence.
 * =========================================================================
 * Responsible for applying and persisting the light/dark theme across the app.
 *
 * How it works:
 *   1. On load, reads the saved theme from appState / localStorage keys
 *      'dp-theme' (primary) or 'bs-theme' (legacy fallback).
 *   2. If nothing is stored, uses the OS-level `prefers-color-scheme` media query.
 *   3. Sets `data-theme` and `data-bs-theme` attributes on <html> so both
 *      custom CSS variables and Bootstrap utilities react to the chosen mode.
 *   4. Dispatches a custom `llb1-theme-change` event so other modules
 *      (nav.js, canvas renderers) can synchronise their icons/colours.
 *   5. Listens for OS preference changes and follows them only when the
 *      user has not explicitly chosen a theme.
 *
 * Functions:
 *   setTheme(t, persist) — Apply theme 't' ('light'|'dark'). Optionally persists.
 *   updateIcons(isDark)  — Swap the toggle button emoji (☀️ ↔ 🌙).
 *   syncThemeMeta()      — Update <meta name="theme-color"> from CSS --bg.
 */
import { loadAppState, loadString, saveAppState, saveString } from './src/lib/storage.js';

(() => {
  const html = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  // --- Resolve initial theme from storage hierarchy ---
  let appState = loadAppState();
  const storedPrimary = loadString('dp-theme', null);   // Current key
  const storedLegacy = loadString('bs-theme', null);     // Old key kept for migration
  const stored = appState.theme || storedPrimary || storedLegacy;

  // Migrate legacy storage into appState if needed
  if (!appState.theme && stored) {
    appState = saveAppState({ ...appState, theme: stored === 'dark' ? 'dark' : 'light' });
  }

  // Fall back to OS preference when no explicit choice exists
  const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const prefersDark = prefersDarkQuery.matches;
  const initial = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
  setTheme(initial);

  /**
   * Apply a theme to the document and optionally persist the choice.
   * @param {'light'|'dark'} t — The theme to apply.
   * @param {boolean} persist  — Whether to write to localStorage (default true).
   */
  function setTheme(t, persist = true) {
    html.setAttribute('data-theme', t);
    html.setAttribute('data-bs-theme', t);
    if (persist) {
      saveString('dp-theme', t);
      appState = saveAppState({ ...appState, theme: t });
    }
    updateIcons(t === 'dark');
    syncThemeMeta();
    window.dispatchEvent(new CustomEvent('llb1-theme-change', { detail: { theme: t } }));
  }

  /** Toggle emoji on the theme-toggle button. */
  function updateIcons(isDark) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.textContent = isDark ? '☀️' : '🌙';
  }

  /** Keep <meta name="theme-color"> in sync with the CSS --bg variable. */
  function syncThemeMeta() {
    if (!themeMeta) return;
    const styles = getComputedStyle(html);
    const bg =
      styles.getPropertyValue('--dp-bg').trim() || styles.getPropertyValue('--bg').trim() || '';
    if (bg) {
      themeMeta.setAttribute('content', bg);
    }
  }

  // --- Click handler: toggle theme on #theme-toggle or legacy #themeToggle ---
  document.addEventListener('click', (e) => {
    if (e.target.closest('#theme-toggle') || e.target.closest('#themeToggle')) {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    }
  });

  // --- OS preference change listener ---
  // Only follow system changes when the user hasn't explicitly saved a theme.
  try {
    prefersDarkQuery.addEventListener('change', (event) => {
      if (loadString('dp-theme', null) || appState.theme) return;
      setTheme(event.matches ? 'dark' : 'light', false);
    });
  } catch (err) {
    // older browsers may not support addEventListener on matchMedia
    if (prefersDarkQuery.addListener) {
      prefersDarkQuery.addListener((event) => {
        if (loadString('dp-theme', null) || appState.theme) return;
        setTheme(event.matches ? 'dark' : 'light', false);
      });
    }
  }
})();
