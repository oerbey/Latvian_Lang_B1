import { createIcon } from '../src/lib/icon.js';

const games = [
  {
    title: 'Darbības Vārdi',
    href: 'darbibas-vards.html',
    icon: 'book',
    desc: 'Pair Latvian verbs with meanings and build recall speed.',
    tag: 'Verbs',
    meta: ['Focus: verbs', '5–8 min', 'B1 core'],
    accent: '#2d4b73',
    art: 'url("assets/previews/verbs_preview.png")',
  },
  {
    title: 'Conjugation Sprint',
    href: 'conjugation-sprint.html',
    icon: 'gamepad',
    desc: 'Rapid-fire conjugation prompts across three tenses.',
    tag: 'Sprint',
    meta: ['Focus: tenses', '6–9 min', 'Speed'],
    accent: '#2b5f6f',
    art: 'url("assets/previews/sprint_preview.png")',
  },
  {
    title: 'Endings Builder',
    href: 'endings-builder.html',
    icon: 'pencil',
    desc: 'Assemble verbs from stems and endings with precision.',
    tag: 'Builder',
    meta: ['Focus: endings', '6–10 min', 'Accuracy'],
    accent: '#6a4b2e',
    art: 'url("assets/previews/endings_preview.png")',
  },
  {
    title: 'Passive Voice Builder',
    href: 'passive-lab.html',
    icon: 'book',
    desc: 'Construct passive forms with tikt + participles.',
    tag: 'Lab',
    meta: ['Focus: passive', '7–10 min', 'Form'],
    accent: '#3a516b',
    art: 'url("assets/previews/passive_preview.png")',
  },
  {
    title: 'Sentence Surgery — Ciešamā kārta',
    href: 'sentence-surgery-passive.html',
    icon: 'pencil',
    desc: 'Repair one-token passive voice errors with an editable word bank.',
    tag: 'Surgery',
    meta: ['Focus: passive', '6–9 min', 'Token repair'],
    accent: '#355a77',
    art: 'url("assets/previews/sentence_surgery_preview.svg")',
  },
  {
    title: 'Kas ir manā mājā?',
    href: 'decl6-detective.html',
    icon: 'home',
    desc: 'Detect 6th-declension forms in a room builder.',
    tag: 'Cases',
    meta: ['Focus: 6th decl.', '6–10 min', 'Detective'],
    accent: '#5d3f2e',
    art: 'url("assets/previews/room_preview.png")',
  },
  {
    title: 'Travel Tracker',
    href: 'travel-tracker.html',
    icon: 'map',
    desc: 'Route the bus by choosing the right prefix.',
    tag: 'Routes',
    meta: ['Focus: prefixes', '6–9 min', 'Flow'],
    accent: '#2f6b5b',
    art: 'url("assets/previews/travel_preview.png")',
  },
  {
    title: 'Maini vai mainies?',
    href: 'maini-vai-mainies.html',
    icon: 'refresh',
    desc: 'Choose reflexive vs. non-reflexive verbs.',
    tag: 'Reflexive',
    meta: ['Focus: -ies', '5–8 min', 'Contrast'],
    accent: '#6a3b42',
    art: 'linear-gradient(135deg, rgba(106, 59, 66, 0.3), rgba(246, 240, 234, 0.95)), radial-gradient(circle at 25% 20%, rgba(106, 59, 66, 0.55), transparent 55%), radial-gradient(circle at 80% 75%, rgba(189, 125, 135, 0.45), transparent 60%)',
  },
  {
    title: 'Kas jādara kam?',
    href: 'duty-dispatcher.html',
    icon: 'user',
    desc: 'Assign duties using the debitive mood.',
    tag: 'Debitive',
    meta: ['Focus: duties', '6–9 min', 'Roles'],
    accent: '#4f4a7a',
    art: 'linear-gradient(135deg, rgba(79, 74, 122, 0.3), rgba(246, 243, 236, 0.95)), radial-gradient(circle at 25% 20%, rgba(79, 74, 122, 0.55), transparent 55%), radial-gradient(circle at 80% 70%, rgba(145, 140, 195, 0.45), transparent 60%)',
  },
  {
    title: 'Rakstura īpašības — pāri',
    href: 'rakstura-ipasibas-match.html',
    icon: 'star',
    desc: 'Savieno rakstura īpašības ar tulkojumiem slēgtā kopā vai pilnajā sarakstā.',
    tag: 'Traits',
    meta: ['Focus: vocab', '5–7 min', 'Match'],
    accent: '#7a5b2b',
    art: 'linear-gradient(135deg, rgba(122, 91, 43, 0.3), rgba(248, 243, 236, 0.95)), radial-gradient(circle at 25% 20%, rgba(122, 91, 43, 0.55), transparent 55%), radial-gradient(circle at 80% 75%, rgba(189, 152, 93, 0.45), transparent 60%)',
  },
  {
    title: 'Rakstura īpašības',
    href: 'character-traits.html',
    icon: 'user',
    desc: 'Iemācies raksturot optimistu un pesimistu un atkārto rakstura īpašības.',
    tag: 'Traits',
    meta: ['Focus: vocab', '6–9 min', 'Describe'],
    accent: '#6b4f2f',
    art: 'linear-gradient(135deg, rgba(107, 79, 47, 0.3), rgba(248, 243, 236, 0.95)), radial-gradient(circle at 25% 20%, rgba(107, 79, 47, 0.55), transparent 55%), radial-gradient(circle at 80% 70%, rgba(176, 140, 89, 0.45), transparent 60%)',
  },
  {
    title: 'Week 1',
    href: 'week1.html',
    icon: 'stats',
    desc: 'Weekly exercises for structured review.',
    tag: 'Review',
    meta: ['Focus: recap', '10–12 min', 'Checklist'],
    accent: '#2f4c68',
    art: 'linear-gradient(135deg, rgba(47, 76, 104, 0.3), rgba(245, 242, 236, 0.95)), radial-gradient(circle at 25% 20%, rgba(47, 76, 104, 0.55), transparent 55%), radial-gradient(circle at 80% 70%, rgba(122, 160, 192, 0.45), transparent 60%)',
  },
];

function buildGameCard(game, index) {
  const col = document.createElement('div');
  col.className = 'col-12 col-md-6 col-lg-4';

  const link = document.createElement('a');
  link.className = 'game-card';
  link.href = game.href;
  link.style.setProperty('--game-accent', game.accent || 'var(--accent)');
  link.style.setProperty('--delay', `${index * 70}ms`);

  const art = document.createElement('div');
  art.className = 'game-card__art';
  if (game.art) {
    art.style.backgroundImage = game.art;
  }

  const artIconWrap = document.createElement('span');
  artIconWrap.className = 'game-card__art-icon';

  const artIcon = createIcon({ name: game.icon, size: 28, alt: '', className: '' });
  artIconWrap.appendChild(artIcon);
  art.appendChild(artIconWrap);

  const top = document.createElement('div');
  top.className = 'game-card__top';

  const label = document.createElement('span');
  label.className = 'game-card__label';
  label.textContent = game.tag || 'B1';
  const title = document.createElement('h2');
  title.className = 'game-card__title';
  title.textContent = game.title;

  top.append(label);

  const desc = document.createElement('p');
  desc.className = 'game-card__desc';
  desc.textContent = game.desc;

  const meta = document.createElement('div');
  meta.className = 'game-card__meta';
  (game.meta || []).forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'game-card__meta-item';
    chip.textContent = item;
    meta.appendChild(chip);
  });

  const play = document.createElement('span');
  play.className = 'game-card__cta';
  play.textContent = 'Play';

  link.append(art, top, title, desc, meta, play);
  col.appendChild(link);
  return col;
}

function renderGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  games.forEach((game, index) => {
    grid.appendChild(buildGameCard(game, index));
  });
}

renderGames();
