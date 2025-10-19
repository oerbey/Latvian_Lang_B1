import { mountGameShell } from './game-shell.js';
import { mountDnD } from './dnd.js';
import { getEnding, getTable } from './endings-resolver.js';
import { norm, equalsLoose } from './norm.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

async function loadItems() {
  const url = new URL('../data/endings-items.json', import.meta.url).href;
  const fallback = typeof window !== 'undefined' ? window.__ENDINGS_ITEMS__ : undefined;

  // When opened from the filesystem (file:// protocol) the browser blocks
  // module imports/fetches, so prefer the embedded fallback data.
  if (typeof window !== 'undefined' && window.location?.protocol === 'file:' && fallback) {
    return clone(fallback);
  }

  try {
    const mod = await import(url, { assert: { type: 'json' } });
    return mod.default;
  } catch (err) {
    if (fallback) {
      console.warn('Using embedded endings item fallback.', err);
      return clone(fallback);
    }
    throw err;
  }
}

const ITEMS = await loadItems();

const PROGRESS_KEY = 'eb-progress-v1';
const STRICT_KEY = 'eb-strict-v1';
const LETTERS = ['ā', 'ē', 'ī', 'ū', 'č', 'ģ', 'ķ', 'ļ', 'ņ', 'š', 'ž'];

const root = document.querySelector('.eb-wrapper');
if (!root) {
  throw new Error('Endings Builder root missing');
}

const board = root.querySelector('#ebBoard');
const pool = root.querySelector('#ebOptions');
const feedbackEl = root.querySelector('.eb-feedback');
const explainEl = root.querySelector('[data-eb-explain]');
const headingEl = root.querySelector('[data-eb-heading]');
const subtitleEl = root.querySelector('[data-eb-subtitle]');
const answerInput = root.querySelector('.eb-answer');
const keypadEl = root.querySelector('.eb-keypad');

let strings = await loadStrings();
applyStrings();

const progress = loadProgress();
const rounds = buildRounds();

let state = {
  current: null,
  solved: false,
  attempts: 0,
  correct: 0,
  streak: 0,
  lastAttemptKey: null
};

const shell = mountGameShell({
  root,
  strings,
  onCheck: () => checkTyped(),
  onNext: () => nextRound(),
  onToggleRule: () => toggleRule(),
  onStrictChange: val => setStrict(val)
});

let strict = loadStrict();
shell.setStrict(strict);
shell.setScore({ attempts: state.attempts, correct: state.correct, streak: state.streak });

setupKeypad();
answerInput.addEventListener('input', () => {
  state.lastAttemptKey = null;
});

nextRound();

async function loadStrings() {
  const langFallback = document.documentElement.lang || 'lv';
  const params = new URLSearchParams(location.search);
  const langPref = params.get('lang') || localStorage.getItem('lang') || langFallback;
  const order = [...new Set([langPref, 'en'])];
  const isFile = typeof window !== 'undefined' && window.location?.protocol === 'file:';

  for (const lang of order) {
    let data = null;
    if (!isFile) {
      try {
        const res = await fetch(`i18n/${lang}.json`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn('Failed loading i18n', lang, err);
      }
    }

    if (!data && window.__LL_I18N__ && window.__LL_I18N__[lang]) {
      data = window.__LL_I18N__[lang];
      console.warn('Using embedded i18n fallback for', lang);
    }

    if (data?.endingsBuilder) {
      document.documentElement.lang = lang;
      return data.endingsBuilder;
    }
  }

  const fallback = window.__LL_I18N__?.en?.endingsBuilder;
  if (fallback) {
    console.warn('Falling back to embedded English i18n strings for endings builder.');
    document.documentElement.lang = 'en';
    return fallback;
  }
  return {
    title: 'Endings Builder',
    subtitle: 'Drag the correct ending to the stem.',
    buttons: {
      check: 'Check',
      next: 'Next',
      rule: 'Show rule',
      ruleHide: 'Hide rule',
      report: 'Report error'
    },
    labels: {
      score: 'Score',
      streak: 'Streak',
      strict: 'Strict mode',
      answer: 'Type the full form',
      keypad: 'Latvian letters',
      options: 'Endings',
      dropPlaceholder: 'Drop ending',
      ruleTitle: 'Rule table',
      case: 'Case',
      number: 'Number',
      columns: {
        SG: 'Singular',
        PL: 'Plural',
        SG_M: 'SG masc',
        SG_F: 'SG fem',
        PL_M: 'PL masc',
        PL_F: 'PL fem'
      }
    },
    feedback: {
      correct: 'Correct!',
      incorrect: 'Try again.',
      fallback: 'Accepted without diacritics. Enable strict mode to practise marks.'
    },
    icons: { correct: '✔️', incorrect: '✖️', info: 'ℹ️' },
    announce: { correct: 'Correct ending placed.', incorrect: 'Wrong ending.' },
    explain: { prefix: '⇒' },
    reportTemplate: 'Please describe the issue.' ,
    strictMode: { on: 'Strict mode enabled', off: 'Strict mode disabled' },
    cases: {
      NOM: 'NOM', GEN: 'GEN', DAT: 'DAT', ACC: 'ACC', LOC: 'LOC', VOC: 'VOC'
    }
  };
}

function applyStrings() {
  headingEl.textContent = strings.title;
  subtitleEl.textContent = strings.subtitle;
  feedbackEl.setAttribute('aria-label', strings.subtitle);
  answerInput.setAttribute('aria-label', strings.labels.answer);
  keypadEl.setAttribute('aria-label', strings.labels.keypad);
  pool.setAttribute('aria-label', strings.labels.options || 'Endings');
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function loadStrict() {
  return localStorage.getItem(STRICT_KEY) === '1';
}

function setStrict(value) {
  strict = value;
  localStorage.setItem(STRICT_KEY, value ? '1' : '0');
  shell.announce(value ? strings.strictMode.on : strings.strictMode.off);
}

function buildRounds() {
  const rounds = [];
  for (const item of ITEMS) {
    for (const gram of item.grams) {
      const ending = getEnding({ pos: item.pos, schema: item.schema, gram });
      if (!ending) continue;
      const id = `${item.id}|${gram.case}|${gram.number}${gram.gender ? '|' + gram.gender : ''}`;
      rounds.push({
        id,
        item,
        gram,
        ending,
        fullForm: buildFullForm(item.stem, ending)
      });
    }
  }
  return rounds;
}

function buildFullForm(stem, ending) {
  if (ending === '-!') return stem;
  const suffix = ending.startsWith('-') ? ending.slice(1) : ending;
  return `${stem}${suffix}`;
}

function nextRound() {
  state.current = pickNextRound();
  state.solved = false;
  state.lastAttemptKey = null;
  shell.disableCheck(false);
  shell.setRuleActive(false);
  shell.setRuleLabel(strings.buttons.rule);
  explainEl.classList.add('visually-hidden');
  explainEl.innerHTML = '';
  setFeedback('', '');
  answerInput.value = '';
  answerInput.disabled = false;
  renderRound(state.current);
}

function pickNextRound() {
  if (!rounds.length) throw new Error('No rounds configured');
  const sorted = rounds
    .slice()
    .sort((a, b) => {
      const pa = progress[a.id] ?? 0;
      const pb = progress[b.id] ?? 0;
      if (pa === pb) return Math.random() - 0.5;
      return pa - pb;
    });
  return sorted[0];
}

function renderRound(round) {
  board.innerHTML = '';
  pool.innerHTML = '';
  const stemEl = document.createElement('div');
  stemEl.className = 'eb-stem';
  stemEl.dataset.pos = round.item.pos;
  stemEl.dataset.schema = round.item.schema;
  stemEl.dataset.case = round.gram.case;
  stemEl.dataset.number = round.gram.number;
  if (round.gram.gender) stemEl.dataset.gender = round.gram.gender;
  stemEl.textContent = round.item.display || `${round.item.stem}-`;

  const slot = document.createElement('div');
  slot.className = 'eb-slot';
  slot.dataset.placeholder = strings.labels.dropPlaceholder;
  slot.dataset.role = 'slot';
  slot.setAttribute('aria-label', strings.labels.dropPlaceholder);

  board.append(stemEl, slot);

  const options = buildOptions(round);
  options.forEach(text => {
    const ending = document.createElement('div');
    ending.className = 'eb-ending';
    ending.textContent = text;
    pool.append(ending);
  });

  mountDnD({
    dragSelector: '.eb-ending',
    dropSelector: '.eb-slot',
    onDrop: (endingEl, slotEl) => {
      if (state.solved) return;
      slotEl.replaceChildren(endingEl);
      slotEl.classList.add('has-ending');
      slotEl.dataset.placeholder = '';
      evaluateDrop(endingEl.textContent.trim(), slotEl, endingEl);
    }
  });
}

function buildOptions(round) {
  const values = new Set();
  const table = getTable(round.item.pos, round.item.schema);
  if (table) {
    for (const entry of Object.values(table)) {
      for (const val of Object.values(entry)) {
        if (typeof val === 'string') values.add(val);
      }
    }
  }
  const choices = [...values].filter(v => v != null);
  const correct = round.ending;
  const filtered = choices.filter(v => v !== correct);
  shuffle(filtered);
  const needed = Math.max(0, 3 - filtered.length);
  if (needed > 0) {
    const global = collectGlobalEndings(correct);
    shuffle(global);
    filtered.push(...global.slice(0, needed));
  }
  const picked = [correct, ...filtered.slice(0, 3)];
  shuffle(picked);
  return picked;
}

function collectGlobalEndings(skip) {
  const vals = new Set();
  const tables = ITEMS.map(item => getTable(item.pos, item.schema)).filter(Boolean);
  for (const table of tables) {
    for (const entry of Object.values(table)) {
      for (const val of Object.values(entry)) {
        if (typeof val === 'string' && val !== skip) vals.add(val);
      }
    }
  }
  return [...vals];
}

function evaluateDrop(text, slotEl, endingEl) {
  const attemptKey = `drop:${state.current.id}:${text}`;
  if (attemptKey === state.lastAttemptKey) return;
  state.lastAttemptKey = attemptKey;

  const correct = text === state.current.ending;
  handleResult({
    correct,
    fallback: false,
    source: 'drop'
  });

  if (correct) {
    slotEl.classList.add('is-correct');
    shell.announce(strings.announce.correct);
    answerInput.value = state.current.fullForm;
    answerInput.disabled = true;
    state.solved = true;
    renderExplanation();
  } else {
    slotEl.classList.add('is-wrong');
    shell.announce(strings.announce.incorrect);
    setTimeout(() => {
      slotEl.classList.remove('is-wrong', 'has-ending');
      slotEl.dataset.placeholder = strings.labels.dropPlaceholder;
      pool.append(endingEl);
    }, 600);
  }
}

function checkTyped() {
  if (state.solved) return;
  const value = norm(answerInput.value.trim());
  if (!value) return;
  const attemptKey = `type:${state.current.id}:${value}`;
  if (attemptKey === state.lastAttemptKey) return;
  state.lastAttemptKey = attemptKey;

  const target = norm(state.current.fullForm);
  let correct = value === target;
  let fallback = false;
  if (!correct && !strict && equalsLoose(answerInput.value.trim(), state.current.fullForm)) {
    correct = true;
    fallback = true;
  }

  handleResult({ correct, fallback, source: 'type' });
  if (correct) {
    answerInput.value = state.current.fullForm;
    answerInput.disabled = true;
    state.solved = true;
    renderExplanation();
    shell.announce(strings.announce.correct);
  } else {
    shell.announce(strings.announce.incorrect);
  }
}

function handleResult({ correct, fallback }) {
  state.attempts += 1;
  if (correct) {
    state.correct += 1;
    state.streak += 1;
    const icon = fallback ? strings.icons.info : strings.icons.correct;
    setFeedback(icon, fallback ? strings.feedback.fallback : strings.feedback.correct);
  } else {
    state.streak = 0;
    setFeedback(strings.icons.incorrect, strings.feedback.incorrect);
  }
  shell.setScore({ attempts: state.attempts, correct: state.correct, streak: state.streak });
  bumpProgress(state.current.id, correct);
}

function bumpProgress(id, correct) {
  const curr = progress[id] ?? 0;
  progress[id] = Math.max(0, curr + (correct ? 1 : -1));
  saveProgress();
}

function setFeedback(icon, text) {
  feedbackEl.dataset.icon = icon || '';
  feedbackEl.textContent = text || '';
}

function setupKeypad() {
  keypadEl.innerHTML = '';
  LETTERS.forEach(ch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = ch;
    btn.dataset.ch = ch;
    btn.addEventListener('click', () => insertChar(ch));
    keypadEl.append(btn);
  });
}

function insertChar(ch) {
  if (answerInput.disabled) return;
  const { selectionStart, selectionEnd, value } = answerInput;
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? value.length;
  answerInput.value = `${value.slice(0, start)}${ch}${value.slice(end)}`;
  const caret = start + ch.length;
  answerInput.focus();
  answerInput.setSelectionRange(caret, caret);
}

function toggleRule() {
  const active = !explainEl.classList.contains('visually-hidden');
  if (active) {
    explainEl.classList.add('visually-hidden');
    explainEl.innerHTML = '';
    shell.setRuleActive(false);
    shell.setRuleLabel(strings.buttons.rule);
    return;
  }
  renderExplanation();
}

function renderExplanation() {
  const round = state.current;
  if (!round) return;
  const meta = explain(round);
  const table = buildRuleTable(round);
  const body = document.createElement('div');
  body.innerHTML = `<p>${meta}</p>`;
  if (table) body.append(table);
  explainEl.innerHTML = '';
  explainEl.append(body);
  explainEl.classList.remove('visually-hidden');
  shell.setRuleActive(true);
  shell.setRuleLabel(strings.buttons.ruleHide);
}

function explain(round) {
  const gram = `${round.gram.case}/${round.gram.number}${round.gram.gender ? '/' + round.gram.gender : ''}`;
  return `${strings.explain.prefix} ${round.item.stem} + (${gram}) → ${round.ending} [${round.item.pos}:${round.item.schema}]`;
}

function buildRuleTable(round) {
  const tableData = getTable(round.item.pos, round.item.schema);
  if (!tableData) return null;
  const table = document.createElement('table');
  const header = document.createElement('tr');
  header.innerHTML = `<th>${strings.labels.case}</th>`;
  const columnKeys = collectColumnKeys(tableData);
  columnKeys.forEach(key => {
    const th = document.createElement('th');
    th.textContent = strings.labels.columns?.[key] || key;
    header.append(th);
  });
  const thead = document.createElement('thead');
  thead.append(header);
  table.append(thead);

  const tbody = document.createElement('tbody');
  Object.entries(tableData).forEach(([caseKey, row]) => {
    const tr = document.createElement('tr');
    const caseCell = document.createElement('th');
    caseCell.scope = 'row';
    caseCell.textContent = strings.cases?.[caseKey] || caseKey;
    tr.append(caseCell);
    columnKeys.forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] ?? '–';
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  table.setAttribute('aria-label', strings.labels.ruleTitle);
  return table;
}

function collectColumnKeys(tableData) {
  const keys = new Set();
  Object.values(tableData).forEach(row => {
    Object.keys(row).forEach(key => keys.add(key));
  });
  return [...keys];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
