(() => {
  const LV_BOX = document.getElementById('list-lv');
  const TR_BOX = document.getElementById('list-tr');
  const SCORE = document.getElementById('score');
  const BTN_NEW = document.getElementById('btn-new');
  const BTN_SPEAK = document.getElementById('btn-speak');
  const HELP = document.getElementById('help');
  const LANG_SEL = document.getElementById('language-select');
  const COUNT_SEL = document.getElementById('count-select');

  const STUDY_MODE_USE_ALL = document.getElementById('mode-use-all');
  const STUDY_MODE_LOCKED = document.getElementById('mode-locked-set');
  const LOCKED_CONTROLS = document.getElementById('locked-controls');
  const LOCKED_SIZE_SELECT = document.getElementById('locked-set-size');
  const LOCKED_CUSTOM_INPUT = document.getElementById('locked-set-custom');
  const BTN_NEW_MIX = document.getElementById('btn-new-mix');
  const BTN_RESET_LOCKED = document.getElementById('btn-reset-locked');
  const PRIORITIZE_SWITCH = document.getElementById('prioritize-mistakes');
  const LOCKED_INDICATOR = document.getElementById('locked-indicator');
  const LOCKED_PROGRESS = document.getElementById('locked-progress');
  const LOCKED_FEEDBACK = document.getElementById('locked-feedback');

  const MODE_ALL = 'all';
  const MODE_LOCKED = 'locked';
  const STORAGE_KEYS = {
    config: 'dv_config',
    activeSet: 'dv_activeSet',
    cursor: 'dv_cursor',
    recent: 'dv_recentSets',
    stats: 'dv_stats',
  };
  const DEFAULT_CONFIG = {
    mode: MODE_ALL,
    size: 10,
    prioritizeMistakes: false,
  };
  const MIN_CUSTOM_SIZE = 5;
  const MAX_RECENT_SETS = 5;
  const PRIORITY_TURNS_AHEAD = 3;
  const MAX_PRIORITY_CHAIN = 2;

  const storage = (() => {
    try {
      const probe = '__dv_storage_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    } catch {
      return null;
    }
  })();

  let data = [];
  let usingEmbeddedData = false;
  let current = [];
  let speakOn = false;
  let score = { right: 0, wrong: 0 };
  let sel = { lv: null, tr: null };
  let currentLang = 'eng';
  const itemById = new Map();

  let lockedConfig = { ...DEFAULT_CONFIG };
  let lockedOrder = [];
  let lockedCursor = 0;
  let lastSliceStart = null;
  let recentSets = [];
  let stats = {};
  const priorityChain = new Map();

  LANG_SEL && (LANG_SEL.value = currentLang);

  // Utils --------------------------------------------------------
  const rand = (n) => Math.floor(Math.random() * n);
  const makeStableId = (item) => `${item.lv}|${item.eng}`;

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function readState(key, fallback) {
    if (!storage) return fallback;
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeState(key, value) {
    if (!storage) return;
    try {
      if (value === null || value === undefined) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // ignore quota / private mode errors
    }
  }

  function persistConfig() {
    writeState(STORAGE_KEYS.config, lockedConfig);
  }

  function persistActiveSet() {
    if (lockedOrder.length) {
      writeState(STORAGE_KEYS.activeSet, lockedOrder);
    } else {
      writeState(STORAGE_KEYS.activeSet, null);
    }
  }

  function persistCursor() {
    if (lockedOrder.length) {
      writeState(STORAGE_KEYS.cursor, lockedCursor);
    } else {
      writeState(STORAGE_KEYS.cursor, null);
    }
  }

  function persistRecentSets() {
    writeState(STORAGE_KEYS.recent, recentSets);
  }

  function persistStats() {
    writeState(STORAGE_KEYS.stats, stats);
  }

  function persistSetState() {
    persistActiveSet();
    persistCursor();
  }

  function announceStatus() {
    SCORE.textContent = `Pareizi: ${score.right} | Nepareizi: ${score.wrong}`;
  }

  function cardHTML(text, key, list) {
    const id = `${list}-${key}`;
    return `<div class="word-card" role="option" tabindex="0" id="${id}" data-key="${key}" data-list="${list}" aria-pressed="false" aria-disabled="false">${text}</div>`;
  }

  function renderRound(items) {
    LV_BOX.innerHTML = '';
    TR_BOX.innerHTML = '';

    const lv = items.map((it, idx) => ({ key: idx, text: it.lv }));
    const tr = items.map((it, idx) => ({ key: idx, text: it[currentLang] }));

    const lvHTML = lv.map((o) => cardHTML(o.text, o.key, 'lv')).join('');
    const trHTML = shuffleInPlace(tr.slice()).map((o) => cardHTML(o.text, o.key, 'tr')).join('');

    LV_BOX.innerHTML = lvHTML;
    TR_BOX.innerHTML = trHTML;

    const first = LV_BOX.querySelector('.word-card');
    if (first) first.focus();
  }

  function speakLV(text) {
    if (!speakOn || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'lv-LV';
    window.speechSynthesis.speak(u);
  }

  function clearSelections() {
    sel.lv = null;
    sel.tr = null;
    LV_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach((el) => {
      el.setAttribute('aria-pressed', 'false');
      el.classList.remove('selected');
    });
    TR_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach((el) => {
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
    const id = item.id || makeStableId(item);
    const entry = stats[id] || { correct: 0, incorrect: 0, lastSeen: 0 };
    if (wasCorrect) {
      entry.correct += 1;
      priorityChain.delete(id);
    } else {
      entry.incorrect += 1;
      if (lockedConfig.mode === MODE_LOCKED && lockedConfig.prioritizeMistakes) {
        bumpItemForPriority(id);
      }
    }
    entry.lastSeen = Date.now();
    stats[id] = entry;
    persistStats();
  }

  function handleSelect(el) {
    if (el.getAttribute('aria-disabled') === 'true') return;

    const list = el.dataset.list;
    const key = Number(el.dataset.key);

    if (list === 'lv') {
      if (sel.lv === key) {
        sel.lv = null;
        el.setAttribute('aria-pressed', 'false');
        el.classList.remove('selected');
      } else {
        LV_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach((e) => {
          e.setAttribute('aria-pressed', 'false');
          e.classList.remove('selected');
        });
        sel.lv = key;
        el.setAttribute('aria-pressed', 'true');
        el.classList.add('selected');
        speakLV(current[key].lv);
      }
    } else {
      if (sel.tr === key) {
        sel.tr = null;
        el.setAttribute('aria-pressed', 'false');
        el.classList.remove('selected');
      } else {
        TR_BOX.querySelectorAll(".word-card[aria-pressed='true']").forEach((e) => {
          e.setAttribute('aria-pressed', 'false');
          e.classList.remove('selected');
        });
        sel.tr = key;
        el.setAttribute('aria-pressed', 'true');
        el.classList.add('selected');
      }
    }

    if (sel.lv !== null && sel.tr !== null) {
      if (sel.lv === sel.tr) {
        score.right++;
        announceStatus();
        HELP.textContent = 'Labi! Pareizs pāris.';
        disablePair(sel.lv);
        recordResult(current[sel.lv], true);
      } else {
        score.wrong++;
        announceStatus();
        const lvWord = current[sel.lv]?.lv || '';
        const trCandidate = current[sel.tr]?.[currentLang] || '';
        HELP.textContent = `Nē. “${lvWord}” nav “${trCandidate}”. Pamēģini vēlreiz.`;
        recordResult(current[sel.lv], false);
      }
      clearSelections();
    }
  }

  function onKeyNav(e) {
    const target = e.target.closest('.word-card');
    if (!target) return;

    const list = target.dataset.list;
    const container = list === 'lv' ? LV_BOX : TR_BOX;
    const options = Array.from(container.querySelectorAll('.word-card[aria-disabled="false"]'));
    const idx = options.indexOf(target);

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = options[idx + 1] || options[0];
      next?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = options[idx - 1] || options[options.length - 1];
      prev?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(target);
    }
  }

  function onClick(e) {
    const card = e.target.closest('.word-card');
    if (card) handleSelect(card);
  }

  function getRequestedBoardSize() {
    const raw = Number(COUNT_SEL?.value || 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  }

  function getBoardSize() {
    const requested = getRequestedBoardSize();
    if (lockedConfig.mode === MODE_LOCKED && lockedOrder.length) {
      return Math.min(requested, lockedOrder.length);
    }
    return Math.min(requested, data.length || requested);
  }

  function getCurrentPool() {
    return data;
  }

  function getLockedChunk(count, options = {}) {
    const len = lockedOrder.length;
    if (!len) return { items: [], start: 0, ids: [] };
    const limit = Math.min(count, len);
    const startIndex = typeof options.startIndex === 'number' ? ((options.startIndex % len) + len) % len : lockedCursor;
    let idx = startIndex;
    const ids = [];
    for (let i = 0; i < limit; i++) {
      ids.push(lockedOrder[idx]);
      idx = (idx + 1) % len;
    }
    if (options.advanceCursor !== false) {
      lockedCursor = idx;
      persistCursor();
    }
    const items = ids.map((id) => itemById.get(id)).filter(Boolean);
    return { items, ids, start: startIndex };
  }

  function bumpItemForPriority(itemId) {
    if (!lockedOrder.length) return;
    const idx = lockedOrder.indexOf(itemId);
    if (idx === -1) return;
    const chainCount = priorityChain.get(itemId) || 0;
    if (chainCount >= MAX_PRIORITY_CHAIN || lockedOrder.length === 1) return;

    const normalizedCursor = lockedOrder.length ? (lockedCursor % lockedOrder.length + lockedOrder.length) % lockedOrder.length : 0;
    const nextId = lockedOrder[normalizedCursor] || null;
    const [entry] = lockedOrder.splice(idx, 1);
    const boardSize = Math.max(1, getRequestedBoardSize());
    const distance = Math.max(1, Math.min(lockedOrder.length, PRIORITY_TURNS_AHEAD * boardSize));
    let insertIdx = normalizedCursor;
    insertIdx = (insertIdx + distance) % (lockedOrder.length + 1);
    lockedOrder.splice(insertIdx, 0, entry);

    if (nextId) {
      const nextIdx = lockedOrder.indexOf(nextId);
      lockedCursor = nextIdx === -1 ? 0 : nextIdx;
    } else {
      lockedCursor = 0;
    }
    priorityChain.set(itemId, chainCount + 1);
    persistSetState();
  }

  function resetPriorityChain() {
    priorityChain.clear();
  }

  function syncCustomInputBounds() {
    if (!LOCKED_CUSTOM_INPUT) return;
    const poolSize = getCurrentPool().length;
    const max = Math.max(poolSize || MIN_CUSTOM_SIZE, MIN_CUSTOM_SIZE);
    LOCKED_CUSTOM_INPUT.max = String(max);
  }

  function updateLockedUI(sliceInfo) {
    syncCustomInputBounds();
    const isLocked = lockedConfig.mode === MODE_LOCKED;
    if (LOCKED_CONTROLS) LOCKED_CONTROLS.classList.toggle('d-none', !isLocked);
    if (BTN_NEW_MIX) BTN_NEW_MIX.disabled = !isLocked;
    if (BTN_RESET_LOCKED) BTN_RESET_LOCKED.disabled = !isLocked;
    if (PRIORITIZE_SWITCH) PRIORITIZE_SWITCH.disabled = !isLocked;

    if (!isLocked) {
      if (LOCKED_INDICATOR) LOCKED_INDICATOR.textContent = '';
      if (LOCKED_PROGRESS) LOCKED_PROGRESS.textContent = '';
      if (LOCKED_FEEDBACK) LOCKED_FEEDBACK.textContent = '';
      return;
    }

    const poolSize = getCurrentPool().length;
    const desired = lockedConfig.size;
    const effectiveTarget = Math.max(MIN_CUSTOM_SIZE, Math.min(desired, poolSize || desired));
    if (LOCKED_INDICATOR) {
      LOCKED_INDICATOR.textContent = lockedOrder.length
        ? `Locked set: ${lockedOrder.length} items`
        : `Locked set not initialized (target ${effectiveTarget})`;
    }
    if (LOCKED_PROGRESS) {
      if (lockedOrder.length) {
        const nextIndex = ((lockedCursor % lockedOrder.length) + lockedOrder.length) % lockedOrder.length;
        const showing = sliceInfo?.items?.length || 0;
        LOCKED_PROGRESS.textContent = showing
          ? `Showing ${showing} / ${lockedOrder.length} • Next item ${(nextIndex + 1)} / ${lockedOrder.length}`
          : `Next item ${(nextIndex + 1)} / ${lockedOrder.length} • Items loop automatically`;
      } else {
        LOCKED_PROGRESS.textContent = '';
      }
    }
    if (LOCKED_FEEDBACK) {
      let note = '';
      if (poolSize && desired > poolSize) {
        note = `Only ${poolSize} verbs available, so the set is capped at ${poolSize}.`;
      } else if (lockedOrder.length && getRequestedBoardSize() > lockedOrder.length) {
        note = `Board shows all ${lockedOrder.length} verbs because the set is smaller than the board size.`;
      }
      LOCKED_FEEDBACK.textContent = note;
    }
  }

  function syncSetSizeControls() {
    if (!LOCKED_SIZE_SELECT) return;
    if (lockedConfig.size === 10 || lockedConfig.size === 20) {
      LOCKED_SIZE_SELECT.value = String(lockedConfig.size);
      LOCKED_CUSTOM_INPUT?.classList.add('d-none');
      if (LOCKED_CUSTOM_INPUT) LOCKED_CUSTOM_INPUT.value = lockedConfig.size;
    } else {
      LOCKED_SIZE_SELECT.value = 'custom';
      LOCKED_CUSTOM_INPUT?.classList.remove('d-none');
      if (LOCKED_CUSTOM_INPUT) LOCKED_CUSTOM_INPUT.value = lockedConfig.size;
    }
  }

  function sanitizeLockedOrder() {
    lockedOrder = lockedOrder.filter((id) => itemById.has(id));
    if (!lockedOrder.length) {
      lockedCursor = 0;
      lastSliceStart = null;
      persistSetState();
      priorityChain.clear();
      return;
    }
    lockedCursor = ((lockedCursor % lockedOrder.length) + lockedOrder.length) % lockedOrder.length;
    const idsInSet = new Set(lockedOrder);
    priorityChain.forEach((_, id) => {
      if (!idsInSet.has(id)) priorityChain.delete(id);
    });
    persistSetState();
  }

  function pushRecentSet(setIds) {
    if (!setIds?.length) return;
    recentSets.push([...setIds]);
    while (recentSets.length > MAX_RECENT_SETS) recentSets.shift();
    persistRecentSets();
  }

  function buildLockedSet(pool, targetSize) {
    if (!targetSize) return [];
    const candidates = shuffleInPlace(pool.slice());
    const recentIdSet = new Set(recentSets.flat());
    const preferred = [];
    const fallback = [];
    candidates.forEach((item) => {
      if (recentIdSet.has(item.id)) {
        fallback.push(item);
      } else {
        preferred.push(item);
      }
    });
    const ordered = [...preferred, ...fallback].slice(0, targetSize);
    return ordered.map((item) => item.id);
  }

  function getClampedCustomSize(value) {
    const poolSize = getCurrentPool().length || MIN_CUSTOM_SIZE;
    const raw = Number(value);
    if (!Number.isFinite(raw) || raw < MIN_CUSTOM_SIZE) return MIN_CUSTOM_SIZE;
    return Math.min(raw, Math.max(poolSize, MIN_CUSTOM_SIZE));
  }

  function handleSetSizeSelection(value) {
    if (!LOCKED_SIZE_SELECT) return;
    if (value === 'custom') {
      LOCKED_CUSTOM_INPUT?.classList.remove('d-none');
      LOCKED_CUSTOM_INPUT?.focus();
      return;
    }
    LOCKED_CUSTOM_INPUT?.classList.add('d-none');
    const size = Number(value);
    if (!Number.isFinite(size)) return;
    lockedConfig.size = size;
    persistConfig();
    if (lockedConfig.mode === MODE_LOCKED) {
      handleNewMix({ quiet: true });
    } else {
      updateLockedUI();
    }
  }

  function handleCustomSizeChange() {
    if (!LOCKED_CUSTOM_INPUT) return;
    const clamped = getClampedCustomSize(LOCKED_CUSTOM_INPUT.value);
    LOCKED_CUSTOM_INPUT.value = clamped;
    lockedConfig.size = clamped;
    persistConfig();
    if (lockedConfig.mode === MODE_LOCKED) {
      handleNewMix({ quiet: true });
    } else {
      updateLockedUI();
    }
  }

  function handleModeChange(mode) {
    if (mode !== MODE_ALL && mode !== MODE_LOCKED) return;
    if (lockedConfig.mode === mode) return;
    lockedConfig.mode = mode;
    persistConfig();
    updateLockedUI();
    if (mode === MODE_LOCKED && !lockedOrder.length) {
      handleNewMix({ quiet: true, skipRender: true });
    }
    newGame({ initial: true });
  }

  function handleNewMix(options = {}) {
    if (lockedConfig.mode !== MODE_LOCKED && !options.force) {
      HELP.textContent = 'Switch to Locked set mode to draw a mix.';
      return;
    }
    const pool = getCurrentPool();
    if (!pool.length) {
      HELP.textContent = 'Dati nav pieejami šim komplektam.';
      return;
    }
    const desired = Math.max(MIN_CUSTOM_SIZE, lockedConfig.size || MIN_CUSTOM_SIZE);
    const target = Math.min(desired, pool.length);
    const newSet = buildLockedSet(pool, target);
    lockedOrder = newSet;
    lockedCursor = 0;
    lastSliceStart = null;
    resetPriorityChain();
    pushRecentSet(newSet);
    persistSetState();
    updateLockedUI();
    if (!options.quiet) {
      HELP.textContent = `Locked set ready: ${newSet.length} items.`;
    }
    if (!options.skipRender) {
      newGame({ initial: true });
    }
  }

  function handleResetLockedState() {
    if (typeof window !== 'undefined' && window.confirm && !window.confirm('Reset locked set and stats?')) {
      return;
    }
    lockedOrder = [];
    lockedCursor = 0;
    lastSliceStart = null;
    recentSets = [];
    stats = {};
    resetPriorityChain();
    persistSetState();
    persistRecentSets();
    persistStats();
    updateLockedUI();
    HELP.textContent = 'Locked set and stats cleared.';
    if (lockedConfig.mode === MODE_LOCKED) {
      newGame({ initial: true });
    }
  }

  function newGame(options = {}) {
    HELP.textContent = '';
    score = { right: 0, wrong: 0 };
    announceStatus();
    sel = { lv: null, tr: null };

    if (lockedConfig.mode === MODE_LOCKED) {
      if (!lockedOrder.length) {
        HELP.textContent = 'Create a locked set via “New mix”.';
        updateLockedUI();
        return;
      }
      const boardSize = Math.max(1, getBoardSize());
      const sliceOptions = {};
      if (options.reuseLastSlice && lastSliceStart !== null) {
        sliceOptions.startIndex = lastSliceStart;
        sliceOptions.advanceCursor = false;
      }
      const slice = getLockedChunk(boardSize, sliceOptions);
      if (!slice.items.length) {
        HELP.textContent = 'Nav pietiekamu vārdu šim komplektam.';
        return;
      }
      lastSliceStart = slice.start;
      current = slice.items;
      renderRound(current);
      updateLockedUI(slice);
      return;
    }

    const pool = getCurrentPool();
    if (!pool.length) {
      HELP.textContent = 'Dati nav pieejami bezsaistē. Mēģini vēlreiz ar internetu.';
      return;
    }
    const sample = [];
    const COUNT = Math.min(getRequestedBoardSize(), pool.length);
    const used = new Set();
    while (sample.length < COUNT) {
      const i = rand(pool.length);
      if (!used.has(i)) {
        used.add(i);
        sample.push(pool[i]);
      }
    }
    current = sample;
    renderRound(current);
    updateLockedUI();
  }

  async function loadData() {
    usingEmbeddedData = false;
    try {
      const res = await fetch('data/words.json', { cache: 'force-cache' });
      if (!res.ok) throw new Error('Neizdevās ielādēt datus.');
      data = await res.json();
    } catch (err) {
      if (Array.isArray(window.__LATVIAN_WORDS__)) {
        console.warn('words.json fetch failed; using embedded fallback dataset.', err);
        data = window.__LATVIAN_WORDS__;
        usingEmbeddedData = true;
      } else {
        throw err;
      }
    }
    data.forEach((item) => {
      const id = makeStableId(item);
      item.id = id;
      itemById.set(id, item);
    });
  }

  function hydrateStoredState() {
    const savedConfig = readState(STORAGE_KEYS.config, null);
    if (savedConfig && typeof savedConfig === 'object') {
      lockedConfig = {
        ...lockedConfig,
        ...savedConfig,
        mode: savedConfig.mode === MODE_LOCKED ? MODE_LOCKED : MODE_ALL,
      };
    }
    const savedSet = readState(STORAGE_KEYS.activeSet, null);
    lockedOrder = Array.isArray(savedSet) ? savedSet.filter((id) => itemById.has(id)) : [];
    const savedCursor = readState(STORAGE_KEYS.cursor, 0);
    lockedCursor = typeof savedCursor === 'number' ? savedCursor : 0;
    sanitizeLockedOrder();
    const savedRecents = readState(STORAGE_KEYS.recent, []);
    recentSets = Array.isArray(savedRecents)
      ? savedRecents
          .map((set) => (Array.isArray(set) ? set.filter((id) => itemById.has(id)) : []))
          .filter((set) => set.length)
      : [];
    stats = readState(STORAGE_KEYS.stats, {}) || {};
    syncSetSizeControls();
    if (PRIORITIZE_SWITCH) PRIORITIZE_SWITCH.checked = !!lockedConfig.prioritizeMistakes;
    if (STUDY_MODE_USE_ALL) STUDY_MODE_USE_ALL.checked = lockedConfig.mode === MODE_ALL;
    if (STUDY_MODE_LOCKED) STUDY_MODE_LOCKED.checked = lockedConfig.mode === MODE_LOCKED;
    updateLockedUI();
  }

  // Events -------------------------------------------------------
  LV_BOX.addEventListener('keydown', onKeyNav);
  TR_BOX.addEventListener('keydown', onKeyNav);
  LV_BOX.addEventListener('click', onClick);
  TR_BOX.addEventListener('click', onClick);

  BTN_NEW.addEventListener('click', () => {
    newGame();
  });

  BTN_SPEAK?.addEventListener('click', () => {
    speakOn = !speakOn;
    BTN_SPEAK.setAttribute('aria-pressed', String(speakOn));
    BTN_SPEAK.textContent = speakOn ? 'Izruna: ieslēgta' : 'Ieslēgt izrunu';
  });

  LANG_SEL?.addEventListener('change', () => {
    currentLang = LANG_SEL.value;
    renderRound(current);
  });

  COUNT_SEL?.addEventListener('change', () => {
    newGame({ reuseLastSlice: lockedConfig.mode === MODE_LOCKED });
  });

  STUDY_MODE_USE_ALL?.addEventListener('change', (e) => {
    if (e.target.checked) handleModeChange(MODE_ALL);
  });

  STUDY_MODE_LOCKED?.addEventListener('change', (e) => {
    if (e.target.checked) handleModeChange(MODE_LOCKED);
  });

  LOCKED_SIZE_SELECT?.addEventListener('change', (e) => {
    handleSetSizeSelection(e.target.value);
  });

  LOCKED_CUSTOM_INPUT?.addEventListener('change', handleCustomSizeChange);

  BTN_NEW_MIX?.addEventListener('click', () => handleNewMix());

  BTN_RESET_LOCKED?.addEventListener('click', handleResetLockedState);

  PRIORITIZE_SWITCH?.addEventListener('change', (e) => {
    lockedConfig.prioritizeMistakes = !!e.target.checked;
    persistConfig();
  });

  // Bootstrap ----------------------------------------------------
  (async () => {
    announceStatus();
    try {
      await loadData();
      hydrateStoredState();
      if (lockedConfig.mode === MODE_LOCKED && !lockedOrder.length) {
        handleNewMix({ quiet: true, skipRender: true });
      }
      await newGame({ initial: true });
      if (usingEmbeddedData) {
        HELP.textContent = 'Dati ielādēti no iebūvētās kopijas. Atver lapu caur serveri, lai redzētu jaunāko sarakstu.';
      }
    } catch (e) {
      console.error(e);
      HELP.textContent = 'Dati nav pieejami bezsaistē. Mēģini vēlreiz ar internetu.';
    }
  })();
})();
