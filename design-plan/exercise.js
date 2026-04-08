/* =========================================================
   Design-Plan — Exercise Page Logic (standalone)
   Darbības Vārdi matching game demo
   ========================================================= */

// --- Embedded sample word data ---
const WORDS = [
  { lv: 'iet', en: 'to go', ru: 'идти' },
  { lv: 'nākt', en: 'to come', ru: 'приходить' },
  { lv: 'runāt', en: 'to speak', ru: 'говорить' },
  { lv: 'lasīt', en: 'to read', ru: 'читать' },
  { lv: 'rakstīt', en: 'to write', ru: 'писать' },
  { lv: 'dzirdēt', en: 'to hear', ru: 'слышать' },
  { lv: 'redzēt', en: 'to see', ru: 'видеть' },
  { lv: 'ēst', en: 'to eat', ru: 'есть' },
  { lv: 'dzert', en: 'to drink', ru: 'пить' },
  { lv: 'gulēt', en: 'to sleep', ru: 'спать' },
  { lv: 'strādāt', en: 'to work', ru: 'работать' },
  { lv: 'mācīties', en: 'to learn', ru: 'учиться' },
  { lv: 'domāt', en: 'to think', ru: 'думать' },
  { lv: 'zināt', en: 'to know', ru: 'знать' },
  { lv: 'varēt', en: 'to be able', ru: 'мочь' },
  { lv: 'gribēt', en: 'to want', ru: 'хотеть' },
  { lv: 'dot', en: 'to give', ru: 'давать' },
  { lv: 'ņemt', en: 'to take', ru: 'брать' },
  { lv: 'pirkt', en: 'to buy', ru: 'покупать' },
  { lv: 'pārdot', en: 'to sell', ru: 'продавать' },
  { lv: 'atvērt', en: 'to open', ru: 'открывать' },
  { lv: 'aizvērt', en: 'to close', ru: 'закрывать' },
  { lv: 'sākt', en: 'to start', ru: 'начинать' },
  { lv: 'beigt', en: 'to finish', ru: 'заканчивать' },
  { lv: 'braukt', en: 'to drive', ru: 'ехать' },
  { lv: 'lidot', en: 'to fly', ru: 'летать' },
  { lv: 'peldēt', en: 'to swim', ru: 'плавать' },
  { lv: 'dziedāt', en: 'to sing', ru: 'петь' },
  { lv: 'dejot', en: 'to dance', ru: 'танцевать' },
  { lv: 'smieties', en: 'to laugh', ru: 'смеяться' },
  { lv: 'raudāt', en: 'to cry', ru: 'плакать' },
  { lv: 'palīdzēt', en: 'to help', ru: 'помогать' },
  { lv: 'jautāt', en: 'to ask', ru: 'спрашивать' },
  { lv: 'atbildēt', en: 'to answer', ru: 'отвечать' },
  { lv: 'stāstīt', en: 'to tell', ru: 'рассказывать' },
  { lv: 'klausīties', en: 'to listen', ru: 'слушать' },
  { lv: 'skatīties', en: 'to watch', ru: 'смотреть' },
  { lv: 'celt', en: 'to build', ru: 'строить' },
  { lv: 'mainīt', en: 'to change', ru: 'менять' },
  { lv: 'gatavot', en: 'to cook', ru: 'готовить' },
];

// --- Utilities ---
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- State ---
let language = 'en';
let wordCount = 10;
let speakEnabled = false;
let correct = 0;
let wrong = 0;
let selectedLv = null;
let selectedTr = null;
let currentPairs = [];
let matchedIds = new Set();

// --- DOM ---
const listLv = document.getElementById('list-lv');
const listTr = document.getElementById('list-tr');
const scoreEl = document.getElementById('score');
const helpEl = document.getElementById('help');
const btnNew = document.getElementById('btn-new');
const btnSpeak = document.getElementById('btn-speak');
const langSelect = document.getElementById('language-select');
const countSelect = document.getElementById('count-select');

// --- Render ---
function newGame() {
  correct = 0;
  wrong = 0;
  selectedLv = null;
  selectedTr = null;
  matchedIds = new Set();
  currentPairs = shuffle(WORDS).slice(0, wordCount);
  updateScore();
  helpEl.textContent = '';
  renderCards();
}

function renderCards() {
  listLv.innerHTML = '';
  listTr.innerHTML = '';

  const lvOrder = shuffle(currentPairs);
  const trOrder = shuffle(currentPairs);

  lvOrder.forEach((word) => {
    const card = makeCard(word.lv, 'lv', word);
    listLv.appendChild(card);
  });

  trOrder.forEach((word) => {
    const tr = language === 'en' ? word.en : word.ru;
    const card = makeCard(tr, 'tr', word);
    listTr.appendChild(card);
  });
}

function makeCard(text, side, word) {
  const el = document.createElement('div');
  el.className = 'dp-word-card';
  el.textContent = text;
  el.setAttribute('role', 'option');
  el.setAttribute('tabindex', '0');
  el.dataset.id = word.lv;
  el.dataset.side = side;

  if (matchedIds.has(word.lv)) {
    el.classList.add('dp-word-card--matched');
    el.setAttribute('aria-disabled', 'true');
    return el;
  }

  el.addEventListener('click', () => handleClick(el, side, word));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(el, side, word);
    }
  });
  return el;
}

function handleClick(el, side, word) {
  if (matchedIds.has(word.lv)) return;

  if (side === 'lv') {
    // Deselect previous lv selection
    if (selectedLv) {
      const prev = listLv.querySelector('.dp-word-card--selected');
      if (prev) prev.classList.remove('dp-word-card--selected');
    }
    selectedLv = word;
    el.classList.add('dp-word-card--selected');

    // Speak the word
    if (speakEnabled && 'speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(word.lv);
      utt.lang = 'lv-LV';
      speechSynthesis.speak(utt);
    }
  } else {
    // Deselect previous tr selection
    if (selectedTr) {
      const prev = listTr.querySelector('.dp-word-card--selected');
      if (prev) prev.classList.remove('dp-word-card--selected');
    }
    selectedTr = word;
    el.classList.add('dp-word-card--selected');
  }

  // Check match if both selected
  if (selectedLv && selectedTr) {
    checkMatch();
  }
}

function checkMatch() {
  const isMatch = selectedLv.lv === selectedTr.lv;

  if (isMatch) {
    correct++;
    matchedIds.add(selectedLv.lv);
    helpEl.textContent = `✓ Pareizi! ${selectedLv.lv} = ${language === 'en' ? selectedLv.en : selectedLv.ru}`;
    helpEl.style.color = 'var(--dp-success)';

    // Mark matched
    listLv.querySelectorAll('.dp-word-card').forEach((c) => {
      if (c.dataset.id === selectedLv.lv) {
        c.classList.remove('dp-word-card--selected');
        c.classList.add('dp-word-card--matched');
        c.setAttribute('aria-disabled', 'true');
      }
    });
    listTr.querySelectorAll('.dp-word-card').forEach((c) => {
      if (c.dataset.id === selectedTr.lv) {
        c.classList.remove('dp-word-card--selected');
        c.classList.add('dp-word-card--matched');
        c.setAttribute('aria-disabled', 'true');
      }
    });

    // Check win
    if (matchedIds.size === currentPairs.length) {
      helpEl.textContent = `🎉 Visi pāri atrasti! Pareizi: ${correct}, Nepareizi: ${wrong}`;
    }
  } else {
    wrong++;
    helpEl.textContent = `✗ Nepareizi. Mēģini vēlreiz!`;
    helpEl.style.color = 'var(--dp-error)';

    // Brief shake animation
    const lvCards = listLv.querySelectorAll('.dp-word-card--selected');
    const trCards = listTr.querySelectorAll('.dp-word-card--selected');
    lvCards.forEach((c) => c.classList.add('dp-word-card--wrong'));
    trCards.forEach((c) => c.classList.add('dp-word-card--wrong'));

    setTimeout(() => {
      lvCards.forEach((c) => {
        c.classList.remove('dp-word-card--selected', 'dp-word-card--wrong');
      });
      trCards.forEach((c) => {
        c.classList.remove('dp-word-card--selected', 'dp-word-card--wrong');
      });
    }, 400);
  }

  selectedLv = null;
  selectedTr = null;
  updateScore();
}

function updateScore() {
  scoreEl.textContent = `Pareizi: ${correct} | Nepareizi: ${wrong}`;
}

// --- Event listeners ---
btnNew.addEventListener('click', newGame);

langSelect.addEventListener('change', (e) => {
  language = e.target.value;
  // Re-render translations without resetting score
  renderCards();
});

countSelect.addEventListener('change', (e) => {
  wordCount = parseInt(e.target.value, 10);
  newGame();
});

btnSpeak.addEventListener('click', () => {
  speakEnabled = !speakEnabled;
  btnSpeak.setAttribute('aria-pressed', String(speakEnabled));
  btnSpeak.textContent = speakEnabled ? '🔊 Izslēgt izrunu' : '🔊 Ieslēgt izrunu';
});

// --- Theme toggle ---
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

// --- Mobile menu ---
function initMenu() {
  const btn = document.getElementById('menu-toggle');
  const links = document.getElementById('nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
}

// --- Init ---
initTheme();
initMenu();
newGame();
