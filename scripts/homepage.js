/**
 * homepage.js — Dynamically renders the game-card grid and initialises
 * interactive features on the landing page (index.html).
 * ==================================================================
 *
 * Responsibilities:
 *   • Define the `games` catalogue array (title, URL, icon, description,
 *     tags, accent colour, background art, and category for each game).
 *   • Build game-card DOM elements from the catalogue (buildGameCard).
 *   • Render the cards into the #gamesGrid container (renderGames).
 *   • Set up filter buttons so users can show/hide cards by category (initFilters).
 *   • Connect skill-track cards to the filter bar with smooth scroll (initTrackCards).
 *   • Implement scroll-triggered reveal animations via IntersectionObserver (initReveal).
 *   • Announce filter changes to screen readers via a live region (announceFilter).
 *
 * Adding a new game:
 *   Simply append an object to the `games` array below — it will
 *   automatically appear in the grid and be filterable by its `category`.
 */

/**
 * games — Master catalogue of all available exercises.
 * Each entry drives one card in the Game Library grid.
 *
 * @type {Array<{
 *   title: string,      — Display name shown on the card.
 *   href: string,       — Relative URL to the game's HTML page.
 *   icon: string,       — Emoji shown in the card art area.
 *   desc: string,       — Short description below the title.
 *   tag: string,        — Badge label (e.g. 'Sprint', 'Lab').
 *   meta: string[],     — Chip items (focus area, duration, type).
 *   accent: string,     — CSS colour for the card accent stripe.
 *   art: string,        — CSS background-image value for the card header.
 *   category: string    — Filter key (verbs|conjugation|passive|cases|vocabulary|adventure).
 * }>}
 */
const games = [
  {
    title: 'Darbības Vārdi',
    href: 'darbibas-vards.html',
    icon: '📖',
    desc: 'Pair Latvian verbs with meanings and build recall speed.',
    tag: 'Verbs',
    meta: ['Focus: verbs', '5–8 min', 'B1 core'],
    accent: '#2d4b73',
    art: 'url("assets/previews/verbs_preview.png")',
    category: 'verbs',
  },
  {
    title: 'Conjugation Sprint',
    href: 'conjugation-sprint.html',
    icon: '🎮',
    desc: 'Rapid-fire conjugation prompts across three tenses.',
    tag: 'Sprint',
    meta: ['Focus: tenses', '6–9 min', 'Speed'],
    accent: '#2b5f6f',
    art: 'url("assets/previews/sprint_preview.png")',
    category: 'conjugation',
  },
  {
    title: 'Endings Builder',
    href: 'endings-builder.html',
    icon: '✏️',
    desc: 'Assemble verbs from stems and endings with precision.',
    tag: 'Builder',
    meta: ['Focus: endings', '6–10 min', 'Accuracy'],
    accent: '#6a4b2e',
    art: 'url("assets/previews/endings_preview.png")',
    category: 'conjugation',
  },
  {
    title: 'Passive Voice Builder',
    href: 'passive-lab.html',
    icon: '🔬',
    desc: 'Construct passive forms with tikt + participles.',
    tag: 'Lab',
    meta: ['Focus: passive', '7–10 min', 'Form'],
    accent: '#3a516b',
    art: 'url("assets/previews/passive_preview.png")',
    category: 'passive',
  },
  {
    title: 'Sentence Surgery — Ciešamā kārta',
    href: 'sentence-surgery-passive.html',
    icon: '🔧',
    desc: 'Repair one-token passive voice errors with an editable word bank.',
    tag: 'Surgery',
    meta: ['Focus: passive', '6–9 min', 'Token repair'],
    accent: '#355a77',
    art: 'url("assets/previews/surgery_preview.png")',
    category: 'passive',
  },
  {
    title: '⚔️ Word Quest — RPG Adventure',
    href: 'word-quest.html',
    icon: '⚔️',
    desc: 'Explore 5 worlds of Latvian grammar in an RPG adventure. Battle words, earn XP, level up!',
    tag: 'Adventure',
    meta: ['Focus: all skills', '10–20 min', 'RPG'],
    accent: '#0d9488',
    art: 'linear-gradient(135deg, rgba(94, 234, 212, 0.30), rgba(10, 22, 40, 0.95)), radial-gradient(circle at 25% 20%, rgba(94, 234, 212, 0.50), transparent 55%), radial-gradient(circle at 75% 75%, rgba(251, 191, 36, 0.35), transparent 60%)',
    category: 'adventure',
  },
  {
    title: 'English -> Latvian Word Catcher',
    href: 'english-latvian-arcade.html',
    icon: '🎯',
    desc: 'Catch the Latvian phrase matching each English prompt in a fast canvas arcade round.',
    tag: 'Arcade',
    meta: ['Focus: translation', '4–6 min', 'EN->LV'],
    accent: '#1f567a',
    art: 'url("assets/previews/arcade_preview.png")',
    category: 'vocabulary',
  },
  {
    title: 'Kas ir manā mājā?',
    href: 'decl6-detective.html',
    icon: '🏠',
    desc: 'Detect 6th-declension forms in a room builder.',
    tag: 'Cases',
    meta: ['Focus: 6th decl.', '6–10 min', 'Detective'],
    accent: '#5d3f2e',
    art: 'url("assets/previews/room_preview.png")',
    category: 'cases',
  },
  {
    title: 'Travel Tracker',
    href: 'travel-tracker.html',
    icon: '🗺️',
    desc: 'Route the bus by choosing the right prefix.',
    tag: 'Routes',
    meta: ['Focus: prefixes', '6–9 min', 'Flow'],
    accent: '#2f6b5b',
    art: 'url("assets/previews/travel_preview.png")',
    category: 'cases',
  },
  {
    title: 'Maini vai mainies?',
    href: 'maini-vai-mainies.html',
    icon: '🔄',
    desc: 'Choose reflexive vs. non-reflexive verbs.',
    tag: 'Reflexive',
    meta: ['Focus: -ies', '5–8 min', 'Contrast'],
    accent: '#6a3b42',
    art: 'url("assets/previews/reflexive_preview.png")',
    category: 'verbs',
  },
  {
    title: 'Kas jādara kam?',
    href: 'duty-dispatcher.html',
    icon: '👤',
    desc: 'Assign duties using the debitive mood.',
    tag: 'Debitive',
    meta: ['Focus: duties', '6–9 min', 'Roles'],
    accent: '#4f4a7a',
    art: 'url("assets/previews/debitive_preview.png")',
    category: 'cases',
  },
  {
    title: 'Rakstura īpašības — pāri',
    href: 'rakstura-ipasibas-match.html',
    icon: '⭐',
    desc: 'Savieno rakstura īpašības ar tulkojumiem slēgtā kopā vai pilnajā sarakstā.',
    tag: 'Traits',
    meta: ['Focus: vocab', '5–7 min', 'Match'],
    accent: '#7a5b2b',
    art: 'url("assets/previews/traits_match_preview.png")',
    category: 'vocabulary',
  },
  {
    title: 'Rakstura īpašības',
    href: 'character-traits.html',
    icon: '👤',
    desc: 'Iemācies raksturot optimistu un pesimistu un atkārto rakstura īpašības.',
    tag: 'Traits',
    meta: ['Focus: vocab', '6–9 min', 'Describe'],
    accent: '#6b4f2f',
    art: 'url("assets/previews/traits_describe_preview.png")',
    category: 'vocabulary',
  },
  {
    title: 'Week 1',
    href: 'week1.html',
    icon: '📊',
    desc: 'Weekly exercises for structured review.',
    tag: 'Review',
    meta: ['Focus: recap', '10–12 min', 'Checklist'],
    accent: '#2f4c68',
    art: 'url("assets/previews/week1_preview.png")',
    category: 'adventure',
  },
];

/**
 * Build a single game card DOM element from a catalogue entry.
 * The card contains: art header with icon, badge label, title,
 * description, meta chips, and a "Play" CTA link.
 *
 * @param {Object} game  — Entry from the `games` array.
 * @param {number} index — Position index used for staggered reveal delay.
 * @returns {HTMLDivElement} — Wrapper element ready to append to the grid.
 */
function buildGameCard(game, index) {
  const wrap = document.createElement('div');
  wrap.className = 'dp-game-card-wrap';
  wrap.dataset.category = game.category;

  const link = document.createElement('a');
  link.className = 'dp-game-card';
  link.href = game.href;
  link.style.setProperty('--game-accent', game.accent || 'var(--dp-accent)');
  link.style.setProperty('--delay', `${index * 60}ms`);

  const art = document.createElement('div');
  art.className = 'dp-game-card__art';
  if (game.art) {
    art.style.backgroundImage = game.art;
  }

  const artIconWrap = document.createElement('span');
  artIconWrap.className = 'dp-game-card__art-icon';
  artIconWrap.textContent = game.icon;
  art.appendChild(artIconWrap);

  const label = document.createElement('span');
  label.className = 'dp-game-card__label';
  label.textContent = game.tag || 'B1';

  const title = document.createElement('h3');
  title.className = 'dp-game-card__title';
  title.textContent = game.title;

  const desc = document.createElement('p');
  desc.className = 'dp-game-card__desc';
  desc.textContent = game.desc;

  const meta = document.createElement('div');
  meta.className = 'dp-game-card__meta';
  (game.meta || []).forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'dp-game-card__meta-item';
    chip.textContent = item;
    meta.appendChild(chip);
  });

  const cta = document.createElement('span');
  cta.className = 'dp-game-card__cta';
  cta.textContent = 'Play';

  link.append(art, label, title, desc, meta, cta);
  wrap.appendChild(link);
  return wrap;
}

/**
 * Populate #gamesGrid by creating a card for every entry in the catalogue.
 */
function renderGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  // Catalog is data-driven: adding entries to `games` automatically renders new cards.
  games.forEach((game, i) => {
    grid.appendChild(buildGameCard(game, i));
  });
}

/**
 * Attach click handlers to .dp-filter-btn elements.
 * Clicking a filter button shows only cards whose data-category matches,
 * or all cards when filter is "all". Updates aria-pressed state and
 * announces the result count to screen readers.
 */
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

/**
 * Connect skill-track cards (the large category buttons at the top)
 * to the filter bar. Clicking a track card smooth-scrolls to the
 * #games section and triggers the matching filter button after a short delay.
 */
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

/**
 * Initialise scroll-triggered reveal animations.
 * Uses IntersectionObserver (threshold 8%) to add .dp-reveal--visible
 * when a section scrolls into view, creating a fade-in/slide-up effect.
 * Falls back to immediate visibility for browsers without IO support.
 */
function initReveal() {
  const sections = document.querySelectorAll('.dp-reveal');
  if (!sections.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback for older browsers: reveal content immediately.
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

/**
 * Update the live-region text to announce the active filter and visible count
 * to assistive technology (screen readers).
 *
 * @param {string} filter — The active filter key ('all' or a category name).
 * @param {number} count  — Number of visible cards after filtering.
 */
function announceFilter(filter, count) {
  const live = document.querySelector('.dp-sr-live');
  if (!live) return;
  const label = filter === 'all' ? 'All games' : filter;
  live.textContent = `Showing ${label}: ${count} game${count !== 1 ? 's' : ''}`;
}

// --- Execute on module load ---
renderGames(); // Build the card grid
initFilters(); // Wire up filter buttons
initTrackCards(); // Connect track cards to filters
initReveal(); // Start scroll-reveal observer
