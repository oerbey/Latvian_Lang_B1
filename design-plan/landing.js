/* =========================================================
   Design-Plan — Landing Page Logic (standalone)
   ========================================================= */

const games = [
  {
    title: 'Darbības Vārdi',
    href: 'darbibas-vards.html',
    icon: '📖',
    desc: 'Pair Latvian verbs with meanings and build recall speed.',
    tag: 'Verbs',
    meta: ['Focus: verbs', '5–8 min', 'B1 core'],
    accent: '#2d4b73',
    art: 'linear-gradient(135deg, rgba(45,75,115,0.3), rgba(244,246,250,0.95)), radial-gradient(circle at 25% 20%, rgba(45,75,115,0.5), transparent 55%)',
    category: 'verbs',
  },
  {
    title: 'Conjugation Sprint',
    href: '#',
    icon: '🎮',
    desc: 'Rapid-fire conjugation prompts across three tenses.',
    tag: 'Sprint',
    meta: ['Focus: tenses', '6–9 min', 'Speed'],
    accent: '#2b5f6f',
    art: 'linear-gradient(135deg, rgba(43,95,111,0.3), rgba(244,246,250,0.95)), radial-gradient(circle at 25% 20%, rgba(43,95,111,0.5), transparent 55%)',
    category: 'conjugation',
  },
  {
    title: 'Endings Builder',
    href: '#',
    icon: '✏️',
    desc: 'Assemble verbs from stems and endings with precision.',
    tag: 'Builder',
    meta: ['Focus: endings', '6–10 min', 'Accuracy'],
    accent: '#6a4b2e',
    art: 'linear-gradient(135deg, rgba(106,75,46,0.3), rgba(244,246,250,0.95)), radial-gradient(circle at 25% 20%, rgba(106,75,46,0.5), transparent 55%)',
    category: 'conjugation',
  },
  {
    title: 'Passive Voice Builder',
    href: '#',
    icon: '🔬',
    desc: 'Construct passive forms with tikt + participles.',
    tag: 'Lab',
    meta: ['Focus: passive', '7–10 min', 'Form'],
    accent: '#3a516b',
    art: 'linear-gradient(135deg, rgba(58,81,107,0.3), rgba(244,246,250,0.95)), radial-gradient(circle at 25% 20%, rgba(58,81,107,0.5), transparent 55%)',
    category: 'passive',
  },
  {
    title: 'Sentence Surgery — Ciešamā kārta',
    href: '#',
    icon: '🔧',
    desc: 'Repair one-token passive voice errors with an editable word bank.',
    tag: 'Surgery',
    meta: ['Focus: passive', '6–9 min', 'Token repair'],
    accent: '#355a77',
    art: 'linear-gradient(135deg, rgba(53,90,119,0.3), rgba(244,246,250,0.95))',
    category: 'passive',
  },
  {
    title: '⚔️ Word Quest — RPG Adventure',
    href: '#',
    icon: '⚔️',
    desc: 'Explore 5 worlds of Latvian grammar in an RPG adventure. Battle words, earn XP, level up!',
    tag: 'Adventure',
    meta: ['Focus: all skills', '10–20 min', 'RPG'],
    accent: '#0d9488',
    art: 'linear-gradient(135deg, rgba(94,234,212,0.3), rgba(10,22,40,0.95)), radial-gradient(circle at 25% 20%, rgba(94,234,212,0.5), transparent 55%), radial-gradient(circle at 75% 75%, rgba(251,191,36,0.35), transparent 60%)',
    category: 'adventure',
  },
  {
    title: 'English → Latvian Word Catcher',
    href: '#',
    icon: '🎯',
    desc: 'Catch the Latvian phrase matching each English prompt in a fast canvas arcade round.',
    tag: 'Arcade',
    meta: ['Focus: translation', '4–6 min', 'EN→LV'],
    accent: '#1f567a',
    art: 'linear-gradient(135deg, rgba(31,86,122,0.34), rgba(239,247,252,0.95))',
    category: 'vocabulary',
  },
  {
    title: 'Kas ir manā mājā?',
    href: '#',
    icon: '🏠',
    desc: 'Detect 6th-declension forms in a room builder.',
    tag: 'Cases',
    meta: ['Focus: 6th decl.', '6–10 min', 'Detective'],
    accent: '#5d3f2e',
    art: 'linear-gradient(135deg, rgba(93,63,46,0.3), rgba(244,246,250,0.95)), radial-gradient(circle at 25% 20%, rgba(93,63,46,0.5), transparent 55%)',
    category: 'cases',
  },
  {
    title: 'Travel Tracker',
    href: '#',
    icon: '🗺️',
    desc: 'Route the bus by choosing the right prefix.',
    tag: 'Routes',
    meta: ['Focus: prefixes', '6–9 min', 'Flow'],
    accent: '#2f6b5b',
    art: 'linear-gradient(135deg, rgba(47,107,91,0.3), rgba(244,246,250,0.95)), radial-gradient(circle at 25% 20%, rgba(47,107,91,0.5), transparent 55%)',
    category: 'cases',
  },
  {
    title: 'Maini vai mainies?',
    href: '#',
    icon: '🔄',
    desc: 'Choose reflexive vs. non-reflexive verbs.',
    tag: 'Reflexive',
    meta: ['Focus: -ies', '5–8 min', 'Contrast'],
    accent: '#6a3b42',
    art: 'linear-gradient(135deg, rgba(106,59,66,0.3), rgba(246,240,234,0.95))',
    category: 'verbs',
  },
  {
    title: 'Kas jādara kam?',
    href: '#',
    icon: '👤',
    desc: 'Assign duties using the debitive mood.',
    tag: 'Debitive',
    meta: ['Focus: duties', '6–9 min', 'Roles'],
    accent: '#4f4a7a',
    art: 'linear-gradient(135deg, rgba(79,74,122,0.3), rgba(246,243,236,0.95))',
    category: 'cases',
  },
  {
    title: 'Rakstura īpašības — pāri',
    href: '#',
    icon: '⭐',
    desc: 'Savieno rakstura īpašības ar tulkojumiem slēgtā kopā vai pilnajā sarakstā.',
    tag: 'Traits',
    meta: ['Focus: vocab', '5–7 min', 'Match'],
    accent: '#7a5b2b',
    art: 'linear-gradient(135deg, rgba(122,91,43,0.3), rgba(248,243,236,0.95))',
    category: 'vocabulary',
  },
  {
    title: 'Rakstura īpašības',
    href: '#',
    icon: '👤',
    desc: 'Iemācies raksturot optimistu un pesimistu un atkārto rakstura īpašības.',
    tag: 'Traits',
    meta: ['Focus: vocab', '6–9 min', 'Describe'],
    accent: '#6b4f2f',
    art: 'linear-gradient(135deg, rgba(107,79,47,0.3), rgba(248,243,236,0.95))',
    category: 'vocabulary',
  },
  {
    title: 'Week 1',
    href: '#',
    icon: '📊',
    desc: 'Weekly exercises for structured review.',
    tag: 'Review',
    meta: ['Focus: recap', '10–12 min', 'Checklist'],
    accent: '#2f4c68',
    art: 'linear-gradient(135deg, rgba(47,76,104,0.3), rgba(245,242,236,0.95))',
    category: 'adventure',
  },
];

// ---- Build Card ----
function buildGameCard(game, index) {
  const wrap = document.createElement('div');
  wrap.className = 'dp-game-card-wrap';
  wrap.dataset.category = game.category;

  const link = document.createElement('a');
  link.className = 'dp-game-card';
  link.href = game.href;
  link.style.setProperty('--game-accent', game.accent || 'var(--dp-accent)');
  link.style.setProperty('--delay', `${index * 60}ms`);

  // Art area
  const art = document.createElement('div');
  art.className = 'dp-game-card__art';
  if (game.art) {
    art.style.setProperty('--game-art', game.art);
    art.style.backgroundImage = game.art;
  }
  const iconWrap = document.createElement('span');
  iconWrap.className = 'dp-game-card__art-icon';
  iconWrap.textContent = game.icon;
  art.appendChild(iconWrap);

  // Label
  const label = document.createElement('span');
  label.className = 'dp-game-card__label';
  label.textContent = game.tag || 'B1';

  // Title
  const title = document.createElement('h3');
  title.className = 'dp-game-card__title';
  title.textContent = game.title;

  // Desc
  const desc = document.createElement('p');
  desc.className = 'dp-game-card__desc';
  desc.textContent = game.desc;

  // Meta
  const meta = document.createElement('div');
  meta.className = 'dp-game-card__meta';
  (game.meta || []).forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'dp-game-card__meta-item';
    chip.textContent = item;
    meta.appendChild(chip);
  });

  // CTA
  const cta = document.createElement('span');
  cta.className = 'dp-game-card__cta';
  cta.textContent = 'Play';

  link.append(art, label, title, desc, meta, cta);
  wrap.appendChild(link);
  return wrap;
}

// ---- Render ----
function renderGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  games.forEach((game, i) => grid.appendChild(buildGameCard(game, i)));
}

// ---- Filters ----
function initFilters() {
  const btns = document.querySelectorAll('.dp-filter-btn[data-filter]');
  const cards = () => document.querySelectorAll('#gamesGrid .dp-game-card-wrap');
  if (!btns.length) return;

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      btns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');

      let count = 0;
      cards().forEach((card) => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.hidden = !show;
        if (show) count++;
      });
      announceFilter(filter, count);
    });
  });
}

// ---- Track cards → filters ----
function initTrackCards() {
  document.querySelectorAll('.dp-track-card[data-track]').forEach((card) => {
    card.addEventListener('click', () => {
      const section = document.getElementById('games');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
      const btn = document.querySelector(`.dp-filter-btn[data-filter="${card.dataset.track}"]`);
      if (btn) setTimeout(() => btn.click(), 350);
    });
  });
}

// ---- Scroll reveal ----
function initReveal() {
  const sections = document.querySelectorAll('.dp-reveal');
  if (!sections.length) return;

  if (!('IntersectionObserver' in window)) {
    sections.forEach((s) => s.classList.add('dp-reveal--visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('dp-reveal--visible');
          observer.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  sections.forEach((s) => observer.observe(s));
}

// ---- Theme toggle ----
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const stored = localStorage.getItem('dp-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (!stored && prefersDark);
  applyTheme(isDark);

  toggle.addEventListener('click', () => {
    const nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(!nowDark);
    localStorage.setItem('dp-theme', !nowDark ? 'dark' : 'light');
  });
}

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.textContent = dark ? '☀️' : '🌙';
}

// ---- Mobile menu ----
function initMenu() {
  const btn = document.getElementById('menu-toggle');
  const links = document.getElementById('nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

// ---- Announce filter change ----
function announceFilter(filter, count) {
  const live = document.querySelector('.dp-sr-live');
  if (!live) return;
  const label = filter === 'all' ? 'All games' : filter;
  live.textContent = `Showing ${label}: ${count} game${count !== 1 ? 's' : ''}`;
}

// ---- Init ----
renderGames();
initFilters();
initTrackCards();
initReveal();
initTheme();
initMenu();
