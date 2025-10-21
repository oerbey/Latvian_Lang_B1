// theme.js — Bootstrap 5.3 color-modes toggle (persists to localStorage)
(() => {
  const html = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const stored = localStorage.getItem('bs-theme');
  const prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const prefersDark = prefersDarkQuery.matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  setTheme(initial);

  function setTheme(t, persist = true) {
    html.setAttribute('data-bs-theme', t);
    if (persist) {
      localStorage.setItem('bs-theme', t);
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
      if (localStorage.getItem('bs-theme')) return;
      setTheme(event.matches ? 'dark' : 'light', false);
    });
  } catch (err) {
    // older browsers may not support addEventListener on matchMedia
    if (prefersDarkQuery.addListener) {
      prefersDarkQuery.addListener(event => {
        if (localStorage.getItem('bs-theme')) return;
        setTheme(event.matches ? 'dark' : 'light', false);
      });
    }
  }
})();
