// theme.js — Bootstrap 5.3 color-modes toggle (persists to localStorage)
import { loadAppState, loadString, saveAppState, saveString } from './src/lib/storage.js';

(() => {
  const html = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let appState = loadAppState();
  const stored = appState.theme || loadString('bs-theme', null);
  if (!appState.theme && stored) {
    appState = saveAppState({ ...appState, theme: stored });
  }
  const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const prefersDark = prefersDarkQuery.matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  setTheme(initial);

  function setTheme(t, persist = true) {
    html.setAttribute('data-bs-theme', t);
    if (persist) {
      saveString('bs-theme', t);
      appState = saveAppState({ ...appState, theme: t });
    }
    updateIcons(t === 'dark');
    syncThemeMeta();
  }

  function updateIcons(isDark) {
    const iconDark = document.getElementById('iconDark');
    const iconLight = document.getElementById('iconLight');
    if (iconDark && iconLight) {
      iconDark.classList.toggle('d-none', !isDark);
      iconLight.classList.toggle('d-none', isDark);
    }
  }

  function syncThemeMeta() {
    if (!themeMeta) return;
    const styles = getComputedStyle(html);
    const bg = styles.getPropertyValue('--bg').trim();
    if (bg) {
      themeMeta.setAttribute('content', bg);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeToggle')) {
      const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    }
  });

  try {
    prefersDarkQuery.addEventListener('change', event => {
      if (loadString('bs-theme', null) || appState.theme) return;
      setTheme(event.matches ? 'dark' : 'light', false);
    });
  } catch (err) {
    // older browsers may not support addEventListener on matchMedia
    if (prefersDarkQuery.addListener) {
      prefersDarkQuery.addListener(event => {
        if (loadString('bs-theme', null) || appState.theme) return;
        setTheme(event.matches ? 'dark' : 'light', false);
      });
    }
  }
})();
