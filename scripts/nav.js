import { NAV_ITEMS } from './nav-config.js';

function getCurrentPage() {
  const path = new URL(window.location.href).pathname;
  const trimmed = path.endsWith('/') ? `${path}index.html` : path;
  const parts = trimmed.split('/').filter(Boolean);
  return parts.pop() || 'index.html';
}

function normalizeHref(href) {
  try {
    const url = new URL(href, document.baseURI);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.pop() || 'index.html';
  } catch {
    return href;
  }
}

function renderNav() {
  const nav = document.querySelector('[data-site-nav]');
  if (!nav) return;

  const current = getCurrentPage();
  nav.className = 'dp-nav';
  nav.setAttribute('role', 'banner');

  const navItems = NAV_ITEMS.map((item) => {
    const href = normalizeHref(item.href);
    const isActive = href === current;
    return `<li><a class="dp-nav__link${isActive ? ' dp-nav__link--active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}>${item.label}</a></li>`;
  }).join('');

  nav.innerHTML = `
    <div class="dp-container dp-nav__inner">
      <a href="index.html" class="dp-nav__brand">
        <img
          class="dp-nav__brand-icon"
          src="assets/icons/latvia-flag.svg"
          alt=""
          aria-hidden="true"
        />
        Latvian B1
      </a>
      <button class="dp-nav__hamburger" id="menu-toggle" aria-label="Toggle navigation" aria-expanded="false">☰</button>
      <ul class="dp-nav__links" id="nav-links">
        ${navItems}
      </ul>
      <div class="dp-nav__actions">
        <button class="dp-theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">🌙</button>
      </div>
    </div>
  `;

  const navLinks = nav.querySelector('#nav-links');
  const menuToggle = nav.querySelector('#menu-toggle');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  syncThemeToggleIcon();
  window.addEventListener('llb1-theme-change', syncThemeToggleIcon);
}

function syncThemeToggleIcon() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.documentElement.getAttribute('data-bs-theme') === 'dark';
  toggle.textContent = isDark ? '☀️' : '🌙';
}

function renderFooter() {
  const footer = document.querySelector('[data-site-footer]');
  if (!footer) return;

  const links = NAV_ITEMS.map((item, index) => {
    const spacing = index < NAV_ITEMS.length - 1 ? 'me-3' : '';
    const classes = ['link-secondary', spacing].filter(Boolean).join(' ');
    return `<a class="${classes}" href="${item.href}">${item.label}</a>`;
  }).join('');

  footer.innerHTML = `
    <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
      <span class="text-secondary">© <span id="year"></span> Latvian B1 Games</span>
      <nav class="small">
        ${links}
      </nav>
    </div>
  `;
}

renderNav();
renderFooter();
