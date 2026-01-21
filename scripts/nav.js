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

  const navItems = NAV_ITEMS
    .map(item => `<li class="nav-item"><a class="nav-link" href="${item.href}">${item.label}</a></li>`)
    .join('');

  nav.innerHTML = `
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2" href="index.html">
        <i class="bi bi-translate"></i> Latvian B1
      </a>

      <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNav"
              aria-controls="offcanvasNav" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasNav" aria-labelledby="offcanvasNavLabel">
        <div class="offcanvas-header">
          <h5 class="offcanvas-title" id="offcanvasNavLabel">Menu</h5>
          <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body align-items-lg-center">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            ${navItems}
          </ul>

          <div class="d-flex gap-2">
            <button id="themeToggle" class="btn btn-outline-secondary" type="button" aria-label="Toggle color mode">
              <i class="bi bi-moon-stars-fill d-none" id="iconDark"></i>
              <i class="bi bi-sun-fill" id="iconLight"></i>
            </button>
            <a class="btn btn-primary" href="https://github.com/oerbey/Latvian_Lang_B1" target="_blank" rel="noopener">
              <i class="bi bi-github"></i> <span class="ms-1 d-none d-sm-inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  const current = getCurrentPage();
  nav.querySelectorAll('.nav-link').forEach(link => {
    const href = normalizeHref(link.getAttribute('href'));
    if (href === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

function renderFooter() {
  const footer = document.querySelector('[data-site-footer]');
  if (!footer) return;

  const links = NAV_ITEMS
    .map((item, index) => {
      const spacing = index < NAV_ITEMS.length - 1 ? 'me-3' : '';
      const classes = ['link-secondary', spacing].filter(Boolean).join(' ');
      return `<a class="${classes}" href="${item.href}">${item.label}</a>`;
    })
    .join('');

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
