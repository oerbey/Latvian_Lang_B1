const games = [
  { title: 'Darbības Vārds', href: 'darbibas-vards.html', icon: 'bi-joystick', desc: 'Verb practice game' },
  { title: 'Conjugation Sprint', href: 'conjugation-sprint.html', icon: 'bi-speedometer2', desc: 'Verb conjugation race' },
  { title: 'Endings Builder', href: 'endings-builder.html', icon: 'bi-slash', desc: 'Build verbs from pieces' },
  { title: 'Passive Voice Builder', href: 'passive-lab.html', icon: 'bi-flask', desc: 'Construct passive forms with tikt + participle' },
  { title: 'Kas ir manā mājā?', href: 'decl6-detective.html', icon: 'bi-house-door', desc: 'Detect 6th-declension forms with cards + room builder' },
  { title: 'Travel Tracker', href: 'travel-tracker.html', icon: 'bi-bus-front', desc: 'Follow routes with prefixes' },
  { title: 'Maini vai mainies?', href: 'maini-vai-mainies.html', icon: 'bi-shuffle', desc: 'Reflexive vs. non-reflexive verbs' },
  { title: 'Kas jādara kam?', href: 'duty-dispatcher.html', icon: 'bi-people', desc: 'Assign duties with the debitive' },
  { title: 'Rakstura īpašības — pāri', href: 'rakstura-ipasibas-match.html', icon: 'bi-list-check', desc: 'Savieno rakstura īpašības ar tulkojumiem slēgtā kopā vai pilnajā sarakstā.' },
  { title: 'Rakstura īpašības', href: 'character-traits.html', icon: 'bi-emoji-smile', desc: 'Iemācies raksturot optimistu un pesimistu un atkārto rakstura īpašības.' },
  { title: 'Week 1', href: 'week1.html', icon: 'bi-lightning-charge', desc: 'Weekly exercises' },
];

function buildGameCard(game) {
  const col = document.createElement('div');
  col.className = 'col-12 col-sm-6 col-lg-4';

  const link = document.createElement('a');
  link.className = 'text-reset text-decoration-none';
  link.href = game.href;

  const card = document.createElement('div');
  card.className = 'card h-100 hover-lift';

  const body = document.createElement('div');
  body.className = 'card-body';

  const header = document.createElement('div');
  header.className = 'd-flex align-items-center mb-2';

  const icon = document.createElement('i');
  icon.className = `bi ${game.icon} fs-3 me-2`;

  const title = document.createElement('h2');
  title.className = 'h5 mb-0';
  title.textContent = game.title;

  header.append(icon, title);

  const desc = document.createElement('p');
  desc.className = 'text-secondary mb-3';
  desc.textContent = game.desc;

  const footer = document.createElement('div');
  footer.className = 'd-flex justify-content-between align-items-center';

  const badge = document.createElement('span');
  badge.className = 'badge bg-secondary-subtle text-secondary-emphasis';
  badge.textContent = 'B1';

  const play = document.createElement('span');
  play.className = 'btn btn-primary';
  play.textContent = 'Play';

  footer.append(badge, play);
  body.append(header, desc, footer);
  card.appendChild(body);
  link.appendChild(card);
  col.appendChild(link);
  return col;
}

function renderGames() {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;
  games.forEach((game) => {
    grid.appendChild(buildGameCard(game));
  });
}

renderGames();
