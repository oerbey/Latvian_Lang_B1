// theme.js — Bootstrap 5.3 color-modes toggle (persists to localStorage)
import { loadAppState, loadString, saveAppState, saveString } from './src/lib/storage.js';

(() => {
  const html = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let appState = loadAppState();
  const storedPrimary = loadString('dp-theme', null);
  const storedLegacy = loadString('bs-theme', null);
  const stored = appState.theme || storedPrimary || storedLegacy;
  if (!appState.theme && stored) {
    appState = saveAppState({ ...appState, theme: stored === 'dark' ? 'dark' : 'light' });
  }
  const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const prefersDark = prefersDarkQuery.matches;
  const initial = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
  setTheme(initial);

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

  function updateIcons(isDark) {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.textContent = isDark ? '☀️' : '🌙';
  }

  function syncThemeMeta() {
    if (!themeMeta) return;
    const styles = getComputedStyle(html);
    const bg =
      styles.getPropertyValue('--dp-bg').trim() || styles.getPropertyValue('--bg').trim() || '';
    if (bg) {
      themeMeta.setAttribute('content', bg);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#theme-toggle') || e.target.closest('#themeToggle')) {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    }
  });

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
