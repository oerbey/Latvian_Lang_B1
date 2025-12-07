const COUNT_OPTIONS = [6, 8, 10, 12];
const MODE_ALL = 'all';
const MODE_LOCKED = 'locked';
const STORAGE_KEYS = {
  config: 'ctm_config',
  lockedSet: 'ctm_locked_set',
  cursor: 'ctm_cursor',
  stats: 'ctm_stats',
};
const DEFAULT_CONFIG = {
  mode: MODE_ALL,
  size: 10,
  lockedSize: 15,
  prioritizeMistakes: false,
};
const MIN_CUSTOM_SIZE = 5;
const AUTO_NEXT_MS = 900;

const els = {
  lvList: document.getElementById('list-lv'),
  trList: document.getElementById('list-tr'),
  score: document.getElementById('score'),
  help: document.getElementById('help'),
  countSelect: document.getElementById('count-select'),
  modeAll: document.getElementById('mode-use-all'),
  modeLocked: document.getElementById('mode-locked-set'),
  lockedControls: document.getElementById('locked-controls'),
  lockedSizeSelect: document.getElementById('locked-set-size'),
  lockedCustomInput: document.getElementById('locked-set-custom'),
  btnNewMix: document.getElementById('btn-new-mix'),
  btnResetLocked: document.getElementById('btn-reset-locked'),
  btnNew: document.getElementById('btn-new'),
  btnSpeak: document.getElementById('btn-speak'),
  prioritizeSwitch: document.getElementById('prioritize-mistakes'),
  lockedIndicator: document.getElementById('locked-indicator'),
  lockedProgress: document.getElementById('locked-progress'),
  lockedFeedback: document.getElementById('locked-feedback'),
  groupProgress: document.getElementById('group-progress'),
  year: document.getElementById('year'),
};

const state = {
  data: [],
  stats: {},
  config: { ...DEFAULT_CONFIG },
  lockedOrder: [],
  lockedCursor: 0,
  selections: { lv: null, tr: null },
  score: { right: 0, wrong: 0 },
  speakOn: false,
  pendingTimer: null,
  currentItems: [],
};

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function readState(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeState(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // ignore
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  lines.shift();
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    if (cols.length < 4) continue;
    const [id, lv, en, group] = cols;
    if (!id.trim() || !lv.trim() || !en.trim()) continue;
    rows.push({
      id: id.trim(),
      lv: lv.trim(),
      en: en
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean)
        .join(' / '),
      group: group.trim(),
    });
  }
  return rows;
}

function announceStatus() {
  els.score.textContent = `Pareizi: ${state.score.right} | Nepareizi: ${state.score.wrong}`;
}

function renderGroupProgress(items) {
  if (!els.groupProgress) return;
  const counts = items.reduce(
    (acc, item) => {
      acc[item.group] = (acc[item.group] || 0) + 1;
      return acc;
    },
    { optimists: 0, pesimists: 0, neutral: 0 },
  );
  els.groupProgress.textContent = `Optimisti: ${counts.optimists || 0} • Pesimisti: ${
    counts.pesimists || 0
  } • Neitrāli: ${counts.neutral || 0}`;
}

function cardHTML(text, key, list, group) {
  const id = `${list}-${key}`;
  const badge = list === 'lv' ? `<span class="badge bg-secondary-subtle text-secondary-emphasis ms-2">${group}</span>` : '';
  return `<div class="word-card d-flex justify-content-between align-items-center" role="option" tabindex="0" id="${id}" data-key="${key}" data-list="${list}" aria-pressed="false" aria-disabled="false">
    <span>${text}</span>${badge}
  </div>`;
}

function renderRound(items) {
  els.lvList.innerHTML = '';
  els.trList.innerHTML = '';
  const lv = items.map((it, idx) => ({ key: idx, text: it.lv, group: it.group }));
  const tr = items.map((it, idx) => ({ key: idx, text: it.en }));
  const lvHTML = lv.map((o) => cardHTML(o.text, o.key, 'lv', o.group)).join('');
  const trHTML = shuffleInPlace(tr.slice())
    .map((o) => cardHTML(o.text, o.key, 'tr'))
    .join('');
  els.lvList.innerHTML = lvHTML;
  els.trList.innerHTML = trHTML;
  const first = els.lvList.querySelector('.word-card');
  if (first) first.focus();
  renderGroupProgress(items);
}

function speakLV(text) {
  if (!state.speakOn || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'lv-LV';
  window.speechSynthesis.speak(u);
}

function clearSelections() {
  state.selections.lv = null;
  state.selections.tr = null;
  document.querySelectorAll(".word-card[aria-pressed='true']").forEach((el) => {
    el.setAttribute('aria-pressed', 'false');
    el.classList.remove('selected');
  });
}

function disablePair(key) {
  document.querySelectorAll(`.word-card[data-key="${key}"]`).forEach((el) => {
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('tabindex', '-1');
    el.classList.remove('selected');
    el.setAttribute('aria-pressed', 'false');
  });
}

function recordResult(item, wasCorrect) {
  if (!item) return;
  const entry = state.stats[item.id] || { correct: 0, incorrect: 0, lastSeen: 0 };
  if (wasCorrect) {
    entry.correct += 1;
  } else {
    entry.incorrect += 1;
  }
  entry.lastSeen = Date.now();
  state.stats[item.id] = entry;
  writeState(STORAGE_KEYS.stats, state.stats);
}

function handleSelect(el, itemsByIndex) {
  if (el.getAttribute('aria-disabled') === 'true') return;
  const list = el.dataset.list;
  const key = Number(el.dataset.key);
  if (list === 'lv') {
    if (state.selections.lv === key) {
      el.setAttribute('aria-pressed', 'false');
      el.classList.remove('selected');
      state.selections.lv = null;
      return;
    }
    document.querySelectorAll('#list-lv .word-card').forEach((card) => {
      card.setAttribute('aria-pressed', 'false');
      card.classList.remove('selected');
    });
    state.selections.lv = key;
    el.setAttribute('aria-pressed', 'true');
    el.classList.add('selected');
    speakLV(itemsByIndex[key].lv);
  } else {
    if (state.selections.tr === key) {
      el.setAttribute('aria-pressed', 'false');
      el.classList.remove('selected');
      state.selections.tr = null;
      return;
    }
    document.querySelectorAll('#list-tr .word-card').forEach((card) => {
      card.setAttribute('aria-pressed', 'false');
      card.classList.remove('selected');
    });
    state.selections.tr = key;
    el.setAttribute('aria-pressed', 'true');
    el.classList.add('selected');
  }

  if (state.selections.lv !== null && state.selections.tr !== null) {
    const isMatch = state.selections.lv === state.selections.tr;
    const item = itemsByIndex[state.selections.lv];
    if (isMatch) {
      state.score.right += 1;
      recordResult(item, true);
      disablePair(state.selections.lv);
      els.help.textContent = `Pareizi! ${item.lv} — ${item.en}`;
    } else {
      state.score.wrong += 1;
      recordResult(item, false);
      els.help.textContent = 'Nepareizi, mēģini vēlreiz.';
    }
    announceStatus();
    clearSelections();
    const remaining = document.querySelectorAll('.word-card[aria-disabled="false"]').length;
    if (!remaining) {
      els.help.textContent = 'Kopa pabeigta! Klikšķini "Jauna spēle", lai turpinātu.';
      state.pendingTimer = setTimeout(startRound, AUTO_NEXT_MS);
    }
  }
}

function pickMistakeIds() {
  const entries = Object.entries(state.stats).filter(([, v]) => v.incorrect > v.correct);
  entries.sort(([, a], [, b]) => {
    const diffB = b.incorrect - b.correct;
    const diffA = a.incorrect - a.correct;
    if (diffB !== diffA) return diffB - diffA;
    return (b.lastSeen || 0) - (a.lastSeen || 0);
  });
  return entries.map(([id]) => id);
}

function buildLockedOrder() {
  const size = state.config.lockedSize;
  const prioritized = state.config.prioritizeMistakes ? pickMistakeIds() : [];
  const remaining = state.data.map((d) => d.id).filter((id) => !prioritized.includes(id));
  shuffleInPlace(remaining);
  const combined = [...prioritized, ...remaining].slice(0, size);
  state.lockedOrder = combined;
  state.lockedCursor = 0;
  writeState(STORAGE_KEYS.lockedSet, state.lockedOrder);
  writeState(STORAGE_KEYS.cursor, state.lockedCursor);
}

function nextLockedSlice(size) {
  if (!state.lockedOrder.length) buildLockedOrder();
  const slice = [];
  for (let i = 0; i < size; i += 1) {
    const id = state.lockedOrder[state.lockedCursor];
    slice.push(id);
    state.lockedCursor = (state.lockedCursor + 1) % state.lockedOrder.length;
  }
  writeState(STORAGE_KEYS.cursor, state.lockedCursor);
  return slice;
}

function buildRoundItems() {
  const size = state.config.size;
  if (state.config.mode === MODE_LOCKED) {
    const ids = nextLockedSlice(size);
    return ids
      .map((id) => state.data.find((d) => d.id === id))
      .filter(Boolean)
      .slice(0, size);
  }
  const pool = shuffleInPlace(state.data.slice());
  return pool.slice(0, size);
}

function updateLockedUI() {
  const isLocked = state.config.mode === MODE_LOCKED;
  els.lockedControls.classList.toggle('d-none', !isLocked);
  els.lockedIndicator.textContent = isLocked ? `Slēgts komplekts: ${state.lockedOrder.length || state.config.lockedSize}` : '';
  if (isLocked && state.lockedOrder.length) {
    els.lockedProgress.textContent = `Pozīcija: ${state.lockedCursor + 1} / ${state.lockedOrder.length}`;
  } else {
    els.lockedProgress.textContent = '';
  }
}

function updateConfig(partial) {
  state.config = { ...state.config, ...partial };
  writeState(STORAGE_KEYS.config, state.config);
}

function startRound() {
  if (state.pendingTimer) {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = null;
  }
  const size = Number(els.countSelect.value);
  updateConfig({ size });
  state.score = { right: 0, wrong: 0 };
  clearSelections();
  state.currentItems = buildRoundItems();
  renderRound(state.currentItems);
  attachCardHandlers(state.currentItems);
  updateLockedUI();
  announceStatus();
  els.help.textContent = 'Izvēlies pāri: latviešu vārds + tulkojums.';
}

function toggleSpeak() {
  state.speakOn = !state.speakOn;
  els.btnSpeak.setAttribute('aria-pressed', String(state.speakOn));
  els.btnSpeak.classList.toggle('btn-success', state.speakOn);
  els.btnSpeak.classList.toggle('btn-secondary', !state.speakOn);
}

function initControls() {
  els.countSelect.value = String(state.config.size);
  els.countSelect.addEventListener('change', startRound);
  els.modeAll.checked = state.config.mode === MODE_ALL;
  els.modeLocked.checked = state.config.mode === MODE_LOCKED;
  els.modeAll.addEventListener('change', () => {
    updateConfig({ mode: MODE_ALL });
    updateLockedUI();
    startRound();
  });
  els.modeLocked.addEventListener('change', () => {
    updateConfig({ mode: MODE_LOCKED });
    updateLockedUI();
    startRound();
  });
  const presetSizes = ['10', '15', '20'];
  if (presetSizes.includes(String(state.config.lockedSize))) {
    els.lockedSizeSelect.value = String(state.config.lockedSize);
    els.lockedCustomInput.classList.add('d-none');
  } else {
    els.lockedSizeSelect.value = 'custom';
    els.lockedCustomInput.classList.remove('d-none');
    els.lockedCustomInput.value = state.config.lockedSize;
  }
  els.lockedSizeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      els.lockedCustomInput.classList.remove('d-none');
      els.lockedCustomInput.focus();
      return;
    }
    els.lockedCustomInput.classList.add('d-none');
    const size = Number(val);
    if (size >= MIN_CUSTOM_SIZE) {
      updateConfig({ lockedSize: size });
      buildLockedOrder();
      updateLockedUI();
      startRound();
    }
  });
  els.lockedCustomInput.addEventListener('change', (e) => {
    const val = Number(e.target.value);
    if (Number.isFinite(val) && val >= MIN_CUSTOM_SIZE) {
      updateConfig({ lockedSize: val });
      buildLockedOrder();
      updateLockedUI();
      startRound();
    }
  });
  els.btnNewMix.addEventListener('click', () => {
    buildLockedOrder();
    updateLockedUI();
    startRound();
  });
  els.btnResetLocked.addEventListener('click', () => {
    state.lockedOrder = [];
    state.lockedCursor = 0;
    writeState(STORAGE_KEYS.lockedSet, null);
    writeState(STORAGE_KEYS.cursor, null);
    updateLockedUI();
    startRound();
  });
  els.prioritizeSwitch.checked = state.config.prioritizeMistakes;
  els.prioritizeSwitch.addEventListener('change', (e) => {
    updateConfig({ prioritizeMistakes: e.target.checked });
    if (state.config.mode === MODE_LOCKED) {
      buildLockedOrder();
      updateLockedUI();
      startRound();
    }
  });
  els.btnNew.addEventListener('click', startRound);
  els.btnSpeak.addEventListener('click', toggleSpeak);
}

function attachCardHandlers(items) {
  const itemsByIndex = items.reduce((acc, item, idx) => {
    acc[idx] = item;
    return acc;
  }, {});
  document.querySelectorAll('.word-card').forEach((card) => {
    card.addEventListener('click', () => handleSelect(card, itemsByIndex));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(card, itemsByIndex);
      }
    });
  });
}

function loadStateFromStorage() {
  const savedConfig = readState(STORAGE_KEYS.config, DEFAULT_CONFIG);
  state.config = { ...DEFAULT_CONFIG, ...savedConfig };
  state.stats = readState(STORAGE_KEYS.stats, {});
  state.lockedOrder = readState(STORAGE_KEYS.lockedSet, []);
  state.lockedCursor = readState(STORAGE_KEYS.cursor, 0);
}

async function loadData() {
  els.help.textContent = 'Ielādē datus…';
  try {
    const res = await fetch(assetUrl('data/personality_words.csv'));
    if (!res.ok) throw new Error('Neizdevās ielādēt CSV');
    const csvText = await res.text();
    state.data = parseCsv(csvText);
    if (!state.data.length) throw new Error('Dati nav atrasti.');
    els.help.textContent = 'Dati ielādēti, vari sākt!';
    els.year.textContent = new Date().getFullYear();
    if (state.config.mode === MODE_LOCKED && !state.lockedOrder.length) {
      buildLockedOrder();
    }
    updateLockedUI();
    startRound();
  } catch (err) {
    console.error(err);
    els.help.textContent = 'Radās problēma ar datu ielādi. Pārbaudi CSV failu.';
  }
}

function init() {
  loadStateFromStorage();
  initControls();
  loadData();
}

init();
