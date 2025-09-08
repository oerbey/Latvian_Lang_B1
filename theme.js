// theme.js — Bootstrap 5.3 color-modes toggle (persists to localStorage)
(() => {
  const html = document.documentElement;
  const saved = localStorage.getItem('bs-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  setTheme(initial);

  function setTheme(t) {
    html.setAttribute('data-bs-theme', t);
    localStorage.setItem('bs-theme', t);
    const iconDark = document.getElementById('iconDark');
    const iconLight = document.getElementById('iconLight');
    if (iconDark && iconLight) {
      const dark = t === 'dark';
      iconDark.classList.toggle('d-none', !dark);
      iconLight.classList.toggle('d-none', dark);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeToggle')) {
      setTheme(html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
    }
  });
})();
