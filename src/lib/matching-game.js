import { shuffleInPlace } from './utils.js';
import { sanitizeText } from './sanitize.js';
import { showFatalError } from './errors.js';
import { hideLoading, showLoading } from './loading.js';
import { DEFAULT_TEXTS, MODE_ALL, MODE_LOCKED } from './matching-game/constants.js';
import {
  announceStatus,
  clearSelections,
  disablePair,
  getTranslation,
  renderRound,
  speakLV,
} from './matching-game/render.js';
import { readState, writeState } from './matching-game/storage.js';

export function initMatchingGame(options) {
  const {
    elements,
    dataLoader,
    languages = [{ id: 'en', label: 'English' }],
    defaultLanguage = languages[0]?.id || 'en',
    storageKeys,
    defaultConfig = { mode: MODE_ALL, size: 10, prioritizeMistakes: false },
    minCustomSize = 5,
    maxRecentSets = 5,
    priorityTurnsAhead = 3,
    maxPriorityChain = 2,
    onRoundRendered,
    texts = {},
    speakLang = 'lv-LV',
    getItemId = (item) => `${item.lv}|${item[defaultLanguage] || ''}`,
  } = options;

  if (!elements?.lvList || !elements?.trList || !elements?.score || !elements?.help) {
    throw new Error('initMatchingGame: required DOM elements are missing.');
  }
  if (!dataLoader) throw new Error('initMatchingGame: dataLoader is required.');

  const isPlainObject = (value) =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const mergedTexts = {
    ...DEFAULT_TEXTS,
    ...texts,
    lockedNote: { ...DEFAULT_TEXTS.lockedNote, ...(texts.lockedNote || {}) },
  };

  const state = {
    data: [],
    usingFallback: false,
    current: [],
    speakOn: false,
    score: { right: 0, wrong: 0 },
    selections: { lv: null, tr: null },
    currentLang: defaultLanguage,
    itemById: new Map(),
    lockedConfig: {
      ...defaultConfig,
      mode: defaultConfig.mode === MODE_LOCKED ? MODE_LOCKED : MODE_ALL,
    },
    lockedOrder: [],
    lockedCursor: 0,
    lastSliceStart: null,
    recentSets: [],
    stats: {},
    priorityChain: new Map(),
  };

  const els = elements;

  function persistConfig() {
    if (!storageKeys?.config) return;
    writeState(storageKeys.config, state.lockedConfig);
  }

  function persistActiveSet() {
    if (!storageKeys?.activeSet) return;
    if (state.lockedOrder.length) {
      writeState(storageKeys.activeSet, state.lockedOrder);
    } else {
      writeState(storageKeys.activeSet, null);
    }
  }

  function persistCursor() {
    if (!storageKeys?.cursor) return;
    if (state.lockedOrder.length) {
      writeState(storageKeys.cursor, state.lockedCursor);
    } else {
      writeState(storageKeys.cursor, null);
    }
  }

  function persistRecentSets() {
    if (!storageKeys?.recent) return;
    writeState(storageKeys.recent, state.recentSets);
  }

  function persistStats() {
    if (!storageKeys?.stats) return;
    writeState(storageKeys.stats, state.stats);
  }

  function persistSetState() {
    persistActiveSet();
    persistCursor();
  }

  function recordResult(item, wasCorrect) {
    if (!item) return;
    const id = item.id || getItemId(item);
    const entry = state.stats[id] || { correct: 0, incorrect: 0, lastSeen: 0 };
    if (wasCorrect) {
      entry.correct += 1;
      state.priorityChain.delete(id);
    } else {
      entry.incorrect += 1;
      if (state.lockedConfig.mode === MODE_LOCKED && state.lockedConfig.prioritizeMistakes) {
        bumpItemForPriority(id);
      }
    }
    entry.lastSeen = Date.now();
    state.stats[id] = entry;
    persistStats();
  }

  function handleSelect(el) {
    if (el.getAttribute('aria-disabled') === 'true') return;

    const list = el.dataset.list;
    const key = Number(el.dataset.key);

    if (list === 'lv') {
      if (state.selections.lv === key) {
        state.selections.lv = null;
        el.setAttribute('aria-pressed', 'false');
        el.classList.remove('selected');
      } else {
        els.lvList.querySelectorAll(".word-card[aria-pressed='true']").forEach((e) => {
          e.setAttribute('aria-pressed', 'false');
          e.classList.remove('selected');
        });
        state.selections.lv = key;
        el.setAttribute('aria-pressed', 'true');
        el.classList.add('selected');
        speakLV(state, speakLang, state.current[key].lv);
      }
    } else {
      if (state.selections.tr === key) {
        state.selections.tr = null;
        el.setAttribute('aria-pressed', 'false');
        el.classList.remove('selected');
      } else {
        els.trList.querySelectorAll(".word-card[aria-pressed='true']").forEach((e) => {
          e.setAttribute('aria-pressed', 'false');
          e.classList.remove('selected');
        });
        state.selections.tr = key;
        el.setAttribute('aria-pressed', 'true');
        el.classList.add('selected');
      }
    }

    if (state.selections.lv !== null && state.selections.tr !== null) {
      if (state.selections.lv === state.selections.tr) {
        state.score.right += 1;
        announceStatus(els, state.score);
        els.help.textContent = mergedTexts.correct;
        disablePair(state.selections.lv);
        recordResult(state.current[state.selections.lv], true);
      } else {
        state.score.wrong += 1;
        announceStatus(els, state.score);
        const lvWord = state.current[state.selections.lv]?.lv || '';
        const trCandidate = state.current[state.selections.tr]
          ? getTranslation(state.current[state.selections.tr], state.currentLang)
          : '';
        const incorrectText =
          typeof mergedTexts.incorrect === 'function'
            ? mergedTexts.incorrect(lvWord, trCandidate)
            : mergedTexts.incorrect;
        els.help.textContent = incorrectText;
        recordResult(state.current[state.selections.lv], false);
      }
      clearSelections(state, els);
    }
  }

  function onKeyNav(e) {
    const target = e.target.closest('.word-card');
    if (!target) return;

    const list = target.dataset.list;
    const container = list === 'lv' ? els.lvList : els.trList;
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
    const raw = Number(els.countSelect?.value || defaultConfig.size || 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 10;
  }

  function getBoardSize() {
    const requested = getRequestedBoardSize();
    if (state.lockedConfig.mode === MODE_LOCKED && state.lockedOrder.length) {
      return Math.min(requested, state.lockedOrder.length);
    }
    return Math.min(requested, state.data.length || requested);
  }

  function getCurrentPool() {
    return state.data;
  }

  function getLockedChunk(count, options = {}) {
    const len = state.lockedOrder.length;
    if (!len) return { items: [], start: 0, ids: [] };
    const limit = Math.min(count, len);
    const startIndex =
      typeof options.startIndex === 'number'
        ? ((options.startIndex % len) + len) % len
        : state.lockedCursor;
    let idx = startIndex;
    const ids = [];
    for (let i = 0; i < limit; i++) {
      ids.push(state.lockedOrder[idx]);
      idx = (idx + 1) % len;
    }
    if (options.advanceCursor !== false) {
      state.lockedCursor = idx;
      persistCursor();
    }
    const items = ids.map((id) => state.itemById.get(id)).filter(Boolean);
    return { items, ids, start: startIndex };
  }

  function bumpItemForPriority(itemId) {
    if (!state.lockedOrder.length) return;
    const idx = state.lockedOrder.indexOf(itemId);
    if (idx === -1) return;
    const chainCount = state.priorityChain.get(itemId) || 0;
    if (chainCount >= maxPriorityChain || state.lockedOrder.length === 1) return;

    const normalizedCursor = state.lockedOrder.length
      ? (state.lockedCursor % state.lockedOrder.length) + state.lockedOrder.length
      : 0;
    const nextId = state.lockedOrder[normalizedCursor % state.lockedOrder.length] || null;
    const [entry] = state.lockedOrder.splice(idx, 1);
    const boardSize = Math.max(1, getRequestedBoardSize());
    const distance = Math.max(
      1,
      Math.min(state.lockedOrder.length, priorityTurnsAhead * boardSize),
    );
    let insertIdx = normalizedCursor % (state.lockedOrder.length || 1);
    insertIdx = (insertIdx + distance) % (state.lockedOrder.length + 1);
    state.lockedOrder.splice(insertIdx, 0, entry);

    if (nextId) {
      const nextIdx = state.lockedOrder.indexOf(nextId);
      state.lockedCursor = nextIdx === -1 ? 0 : nextIdx;
    } else {
      state.lockedCursor = 0;
    }
    state.priorityChain.set(itemId, chainCount + 1);
    persistSetState();
  }

  function resetPriorityChain() {
    state.priorityChain.clear();
  }

  function syncCustomInputBounds() {
    if (!els.lockedCustomInput) return;
    const poolSize = getCurrentPool().length;
    const max = Math.max(poolSize || minCustomSize, minCustomSize);
    els.lockedCustomInput.max = String(max);
  }

  function updateLockedUI(sliceInfo) {
    syncCustomInputBounds();
    const isLocked = state.lockedConfig.mode === MODE_LOCKED;
    if (els.lockedControls) els.lockedControls.classList.toggle('d-none', !isLocked);
    if (els.btnNewMix) els.btnNewMix.disabled = !isLocked;
    if (els.btnResetLocked) els.btnResetLocked.disabled = !isLocked;
    if (els.prioritizeSwitch) els.prioritizeSwitch.disabled = !isLocked;

    if (!isLocked) {
      if (els.lockedIndicator) els.lockedIndicator.textContent = '';
      if (els.lockedProgress) els.lockedProgress.textContent = '';
      if (els.lockedFeedback) els.lockedFeedback.textContent = '';
      return;
    }

    const poolSize = getCurrentPool().length;
    const desired = state.lockedConfig.size;
    const effectiveTarget = Math.max(minCustomSize, Math.min(desired, poolSize || desired));
    if (els.lockedIndicator) {
      els.lockedIndicator.textContent = state.lockedOrder.length
        ? `Locked set: ${state.lockedOrder.length} items`
        : `Locked set not initialized (target ${effectiveTarget})`;
    }
    if (els.lockedProgress) {
      if (state.lockedOrder.length) {
        const nextIndex =
          ((state.lockedCursor % state.lockedOrder.length) + state.lockedOrder.length) %
          state.lockedOrder.length;
        const showing = sliceInfo?.items?.length || 0;
        els.lockedProgress.textContent = showing
          ? `Showing ${showing} / ${state.lockedOrder.length} • Next item ${nextIndex + 1} / ${state.lockedOrder.length}`
          : `Next item ${nextIndex + 1} / ${state.lockedOrder.length} • Items loop automatically`;
      } else {
        els.lockedProgress.textContent = '';
      }
    }
    if (els.lockedFeedback) {
      let note = '';
      if (poolSize && desired > poolSize) {
        note = mergedTexts.lockedNote.capped(poolSize);
      } else if (state.lockedOrder.length && getRequestedBoardSize() > state.lockedOrder.length) {
        note = mergedTexts.lockedNote.smallSet(state.lockedOrder.length);
      }
      els.lockedFeedback.textContent = note;
    }
  }

  function syncSetSizeControls() {
    if (!els.lockedSizeSelect) return;
    if (state.lockedConfig.size === 10 || state.lockedConfig.size === 20) {
      els.lockedSizeSelect.value = String(state.lockedConfig.size);
      els.lockedCustomInput?.classList.add('d-none');
      if (els.lockedCustomInput) els.lockedCustomInput.value = state.lockedConfig.size;
    } else {
      els.lockedSizeSelect.value = 'custom';
      els.lockedCustomInput?.classList.remove('d-none');
      if (els.lockedCustomInput) els.lockedCustomInput.value = state.lockedConfig.size;
    }
  }

  function sanitizeLockedOrder() {
    state.lockedOrder = state.lockedOrder.filter((id) => state.itemById.has(id));
    if (!state.lockedOrder.length) {
      state.lockedCursor = 0;
      state.lastSliceStart = null;
      persistSetState();
      state.priorityChain.clear();
      return;
    }
    state.lockedCursor =
      ((state.lockedCursor % state.lockedOrder.length) + state.lockedOrder.length) %
      state.lockedOrder.length;
    const idsInSet = new Set(state.lockedOrder);
    state.priorityChain.forEach((_, id) => {
      if (!idsInSet.has(id)) state.priorityChain.delete(id);
    });
    persistSetState();
  }

  function pushRecentSet(setIds) {
    if (!setIds?.length) return;
    state.recentSets.push([...setIds]);
    while (state.recentSets.length > maxRecentSets) state.recentSets.shift();
    persistRecentSets();
  }

  function buildLockedSet(pool, targetSize) {
    if (!targetSize) return [];
    const candidates = shuffleInPlace(pool.slice());
    const recentIdSet = new Set(state.recentSets.flat());
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
    const poolSize = getCurrentPool().length || minCustomSize;
    const raw = Number(sanitizeText(value));
    if (!Number.isFinite(raw) || raw < minCustomSize) return minCustomSize;
    return Math.min(raw, Math.max(poolSize, minCustomSize));
  }

  function handleSetSizeSelection(value) {
    if (!els.lockedSizeSelect) return;
    if (value === 'custom') {
      els.lockedCustomInput?.classList.remove('d-none');
      els.lockedCustomInput?.focus();
      return;
    }
    els.lockedCustomInput?.classList.add('d-none');
    const size = Number(value);
    if (!Number.isFinite(size)) return;
    state.lockedConfig.size = size;
    persistConfig();
    if (state.lockedConfig.mode === MODE_LOCKED) {
      handleNewMix({ quiet: true });
    } else {
      updateLockedUI();
    }
  }

  function handleCustomSizeChange() {
    if (!els.lockedCustomInput) return;
    const clamped = getClampedCustomSize(els.lockedCustomInput.value);
    els.lockedCustomInput.value = clamped;
    state.lockedConfig.size = clamped;
    persistConfig();
    if (state.lockedConfig.mode === MODE_LOCKED) {
      handleNewMix({ quiet: true });
    } else {
      updateLockedUI();
    }
  }

  function handleModeChange(mode) {
    if (mode !== MODE_ALL && mode !== MODE_LOCKED) return;
    if (state.lockedConfig.mode === mode) return;
    state.lockedConfig.mode = mode;
    persistConfig();
    updateLockedUI();
    if (mode === MODE_LOCKED && !state.lockedOrder.length) {
      handleNewMix({ quiet: true, skipRender: true });
    }
    newGame({ initial: true });
  }

  function handleNewMix(options = {}) {
    if (state.lockedConfig.mode !== MODE_LOCKED && !options.force) {
      els.help.textContent = 'Switch to Locked set mode to draw a mix.';
      return;
    }
    const pool = getCurrentPool();
    if (!pool.length) {
      els.help.textContent = 'Dati nav pieejami šim komplektam.';
      return;
    }
    const desired = Math.max(minCustomSize, state.lockedConfig.size || minCustomSize);
    const target = Math.min(desired, pool.length);
    const newSet = buildLockedSet(pool, target);
    state.lockedOrder = newSet;
    state.lockedCursor = 0;
    state.lastSliceStart = null;
    resetPriorityChain();
    pushRecentSet(newSet);
    persistSetState();
    updateLockedUI();
    if (!options.quiet) {
      els.help.textContent = mergedTexts.lockedReady(newSet.length);
    }
    if (!options.skipRender) {
      newGame({ initial: true });
    }
  }

  function handleResetLockedState() {
    if (
      typeof window !== 'undefined' &&
      window.confirm &&
      !window.confirm('Reset locked set and stats?')
    ) {
      return;
    }
    state.lockedOrder = [];
    state.lockedCursor = 0;
    state.lastSliceStart = null;
    state.recentSets = [];
    state.stats = {};
    resetPriorityChain();
    persistSetState();
    persistRecentSets();
    persistStats();
    updateLockedUI();
    els.help.textContent = 'Locked set and stats cleared.';
    if (state.lockedConfig.mode === MODE_LOCKED) {
      newGame({ initial: true });
    }
  }

  function newGame(options = {}) {
    els.help.textContent = '';
    state.score = { right: 0, wrong: 0 };
    announceStatus(els, state.score);
    state.selections = { lv: null, tr: null };

    if (state.lockedConfig.mode === MODE_LOCKED) {
      if (!state.lockedOrder.length) {
        els.help.textContent = mergedTexts.lockedMissing;
        updateLockedUI();
        return;
      }
      const boardSize = Math.max(1, getBoardSize());
      const sliceOptions = {};
      if (options.reuseLastSlice && state.lastSliceStart !== null) {
        sliceOptions.startIndex = state.lastSliceStart;
        sliceOptions.advanceCursor = false;
      }
      const slice = getLockedChunk(boardSize, sliceOptions);
      if (!slice.items.length) {
        els.help.textContent = 'Nav pietiekamu vārdu šim komplektam.';
        return;
      }
      state.lastSliceStart = slice.start;
      state.current = slice.items;
      renderRound({
        elements: els,
        items: state.current,
        currentLang: state.currentLang,
        onRoundRendered,
      });
      updateLockedUI(slice);
      return;
    }

    const pool = getCurrentPool();
    if (!pool.length) {
      els.help.textContent = mergedTexts.dataUnavailable;
      return;
    }
    const sample = [];
    const count = Math.min(getRequestedBoardSize(), pool.length);
    const used = new Set();
    while (sample.length < count) {
      const i = Math.floor(Math.random() * pool.length);
      if (!used.has(i)) {
        used.add(i);
        sample.push(pool[i]);
      }
    }
    state.current = sample;
    renderRound({
      elements: els,
      items: state.current,
      currentLang: state.currentLang,
      onRoundRendered,
    });
    updateLockedUI();
  }

  async function loadData() {
    state.usingFallback = false;
    state.itemById.clear();
    state.data = [];
    const payload = await dataLoader();
    const items = Array.isArray(payload) ? payload : payload?.items || [];
    state.usingFallback = !!payload?.usingFallback;
    items.forEach((item) => {
      const id = getItemId(item);
      const normalized = { ...item, id };
      state.itemById.set(id, normalized);
      state.data.push(normalized);
    });
  }

  function hydrateStoredState() {
    if (storageKeys?.config) {
      const savedConfig = readState(storageKeys.config, {}, isPlainObject);
      if (savedConfig && typeof savedConfig === 'object') {
        state.lockedConfig = {
          ...state.lockedConfig,
          ...savedConfig,
          mode: savedConfig.mode === MODE_LOCKED ? MODE_LOCKED : MODE_ALL,
        };
      }
    }
    if (storageKeys?.activeSet) {
      const savedSet = readState(storageKeys.activeSet, [], Array.isArray);
      state.lockedOrder = Array.isArray(savedSet)
        ? savedSet.filter((id) => state.itemById.has(id))
        : [];
    }
    if (storageKeys?.cursor) {
      const savedCursor = readState(storageKeys.cursor, 0);
      state.lockedCursor = typeof savedCursor === 'number' ? savedCursor : 0;
    }
    sanitizeLockedOrder();
    if (storageKeys?.recent) {
      const savedRecents = readState(storageKeys.recent, [], Array.isArray);
      state.recentSets = Array.isArray(savedRecents)
        ? savedRecents
            .map((set) => (Array.isArray(set) ? set.filter((id) => state.itemById.has(id)) : []))
            .filter((set) => set.length)
        : [];
    }
    if (storageKeys?.stats) state.stats = readState(storageKeys.stats, {}, isPlainObject) || {};
    syncSetSizeControls();
    if (els.prioritizeSwitch)
      els.prioritizeSwitch.checked = !!state.lockedConfig.prioritizeMistakes;
    if (els.modeAll) els.modeAll.checked = state.lockedConfig.mode === MODE_ALL;
    if (els.modeLocked) els.modeLocked.checked = state.lockedConfig.mode === MODE_LOCKED;
    updateLockedUI();
  }

  // Events -------------------------------------------------------
  els.lvList.addEventListener('keydown', onKeyNav);
  els.trList.addEventListener('keydown', onKeyNav);
  els.lvList.addEventListener('click', onClick);
  els.trList.addEventListener('click', onClick);

  els.btnNew?.addEventListener('click', () => {
    newGame();
  });

  els.btnSpeak?.addEventListener('click', () => {
    state.speakOn = !state.speakOn;
    els.btnSpeak.setAttribute('aria-pressed', String(state.speakOn));
    els.btnSpeak.textContent = state.speakOn ? 'Izruna: ieslēgta' : 'Ieslēgt izrunu';
  });

  els.languageSelect?.addEventListener('change', () => {
    state.currentLang = els.languageSelect.value;
    renderRound({
      elements: els,
      items: state.current,
      currentLang: state.currentLang,
      onRoundRendered,
    });
  });

  els.countSelect?.addEventListener('change', () => {
    newGame({ reuseLastSlice: state.lockedConfig.mode === MODE_LOCKED });
  });

  els.modeAll?.addEventListener('change', (e) => {
    if (e.target.checked) handleModeChange(MODE_ALL);
  });

  els.modeLocked?.addEventListener('change', (e) => {
    if (e.target.checked) handleModeChange(MODE_LOCKED);
  });

  els.lockedSizeSelect?.addEventListener('change', (e) => {
    handleSetSizeSelection(e.target.value);
  });

  els.lockedCustomInput?.addEventListener('change', handleCustomSizeChange);

  els.btnNewMix?.addEventListener('click', () => handleNewMix());

  els.btnResetLocked?.addEventListener('click', handleResetLockedState);

  els.prioritizeSwitch?.addEventListener('change', (e) => {
    state.lockedConfig.prioritizeMistakes = !!e.target.checked;
    persistConfig();
  });

  if (els.languageSelect) {
    els.languageSelect.value = state.currentLang;
  }

  // Bootstrap ----------------------------------------------------
  (async () => {
    announceStatus(els, state.score);
    showLoading('Loading game data...');
    try {
      await loadData();
      hydrateStoredState();
      if (state.lockedConfig.mode === MODE_LOCKED && !state.lockedOrder.length) {
        handleNewMix({ quiet: true, skipRender: true });
      }
      await newGame({ initial: true });
      if (state.usingFallback && mergedTexts.fallbackUsed) {
        els.help.textContent = mergedTexts.fallbackUsed;
      }
    } catch (e) {
      console.error(e);
      els.help.textContent = mergedTexts.dataUnavailable;
      const safeError = e instanceof Error ? e : new Error('Failed to load game data.');
      showFatalError(safeError);
    } finally {
      hideLoading();
    }
  })();
}

export const MATCHING_CONSTANTS = { MODE_ALL, MODE_LOCKED };
