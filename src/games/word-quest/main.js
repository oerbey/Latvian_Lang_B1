/**
 * Word Quest — RPG-style Latvian Language Learning Adventure
 *
 * Architecture:
 *   Title Screen → World Map → World Nodes → Battle → Result
 *
 * Data sources (all from the existing project):
 *   - data/words.json          → Verb conjugation challenges
 *   - data/lv-en/forge.json    → Prefix challenges
 *   - data/latvian_prefixed_verb_exercise.spec.json → Prefixed nākt meaning matches
 *   - data/maini-vai-mainies/items.json → Reflexive verb challenges
 *   - data/personality/words.json       → Personality trait matching
 *   - data/passive-lab/items.json       → Passive voice challenges
 *
 * State is persisted to localStorage via the project's storage module.
 */

import { loadString, saveString } from '../../lib/storage.js';
import { getCurrentUser, loadCloudProgress, saveCloudProgress } from '../../lib/cloud-progress.js';

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const STORAGE_KEY = 'llb1:word-quest';
const SYNC_STORAGE_KEY = 'llb1:word-quest:sync';
const GAME_ID = 'word-quest';
const SYNC_SAVE_DELAY = 750;
const MAX_SYNC_RETRIES = 5;
const XP_PER_LEVEL = 120;
const BASE_XP = 10;
const MAX_LIVES = 3;
const CHALLENGES_PER_NODE = 3;

// ═══════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════
let state = loadState();
const syncState = {
  status: 'checking',
  user: null,
  cloudRevision: 0,
  pending: loadSyncMeta()?.pending || null,
  canWrite: false,
  ready: false,
  inFlight: false,
  retryCount: 0,
  timer: null,
  retryTimer: null,
};

function defaultState() {
  return {
    schemaVersion: 1,
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    worlds: {},
    totalCorrect: 0,
    totalWrong: 0,
  };
}

function loadState() {
  try {
    const raw = loadString(STORAGE_KEY, null);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch {
    /* ignore */
  }
  return defaultState();
}

function normalizeState(value) {
  const base = defaultState();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;

  const next = { ...base, ...value, schemaVersion: 1 };
  for (const field of ['xp', 'level', 'streak', 'bestStreak', 'totalCorrect', 'totalWrong']) {
    if (!Number.isFinite(next[field]) || next[field] < 0) next[field] = base[field];
  }
  for (const field of ['level', 'streak', 'bestStreak', 'totalCorrect', 'totalWrong']) {
    next[field] = Math.floor(next[field]);
  }
  next.worlds =
    value.worlds && typeof value.worlds === 'object' && !Array.isArray(value.worlds)
      ? value.worlds
      : {};
  return next;
}

function loadSyncMeta() {
  try {
    const raw = loadString(SYNC_STORAGE_KEY, null);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persistSyncMeta() {
  saveString(
    SYNC_STORAGE_KEY,
    JSON.stringify({
      cloudRevision: syncState.cloudRevision,
      pending: syncState.pending,
      status: syncState.status,
    }),
  );
}

function saveState({ queueCloud = true } = {}) {
  state = normalizeState(state);
  const serialized = JSON.stringify(state);
  const savedLocally = saveString(STORAGE_KEY, serialized);
  if (!savedLocally) return;

  if (queueCloud) queueCloudSave(JSON.parse(serialized));
}

function updateSyncUi(status = syncState.status, message = '') {
  syncState.status = status;
  const statusEl = $id('wq-sync-status');
  if (statusEl) statusEl.textContent = message;

  const authLabel = $id('wq-auth-label');
  const loginLink = $id('wq-login-link');
  const logoutLink = $id('wq-logout-link');
  if (authLabel) {
    authLabel.textContent = syncState.user
      ? `Signed in as ${syncState.user.userDetails || 'learner'}`
      : 'Playing locally';
  }
  if (loginLink) loginLink.hidden = Boolean(syncState.user) || status === 'unavailable';
  if (logoutLink) logoutLink.hidden = !syncState.user;
}

function setGameReady(ready) {
  const playButton = $id('wq-btn-play');
  if (playButton) playButton.disabled = !ready;
}

function hasProgress(value) {
  return (
    value.level > 1 ||
    value.xp > 0 ||
    value.streak > 0 ||
    value.bestStreak > 0 ||
    value.totalCorrect > 0 ||
    value.totalWrong > 0 ||
    Object.keys(value.worlds || {}).length > 0
  );
}

function sameState(left, right) {
  return JSON.stringify(normalizeState(left)) === JSON.stringify(normalizeState(right));
}

function describeProgress(value) {
  const completed = Object.values(value.worlds || {}).reduce(
    (total, world) => total + (Array.isArray(world?.completed) ? world.completed.length : 0),
    0,
  );
  return `Level ${value.level}, ${value.xp} XP, ${completed} completed nodes`;
}

function promptProgressChoice(localState, cloudState) {
  const modal = $id('wq-sync-modal');
  if (!modal) return Promise.resolve('cloud');

  $id('wq-sync-local-summary').textContent = describeProgress(localState);
  $id('wq-sync-cloud-summary').textContent = describeProgress(cloudState);
  show(modal);

  return new Promise((resolve) => {
    const finish = (choice) => {
      hide(modal);
      localButton.onclick = null;
      cloudButton.onclick = null;
      resolve(choice);
    };
    const localButton = $id('wq-sync-use-local');
    const cloudButton = $id('wq-sync-use-cloud');
    localButton.onclick = () => finish('local');
    cloudButton.onclick = () => finish('cloud');
  });
}

function queueCloudSave(payload) {
  if (!syncState.user || !syncState.ready || !syncState.canWrite) {
    if (syncState.user) {
      syncState.pending = payload;
      persistSyncMeta();
    }
    return;
  }

  syncState.pending = payload;
  syncState.retryCount = 0;
  persistSyncMeta();
  if (syncState.timer) clearTimeout(syncState.timer);
  syncState.timer = setTimeout(() => void flushCloudSave(), SYNC_SAVE_DELAY);
  updateSyncUi('pending', 'Changes waiting to sync…');
}

function scheduleCloudRetry() {
  if (syncState.retryTimer) clearTimeout(syncState.retryTimer);
  if (syncState.retryCount >= MAX_SYNC_RETRIES) {
    updateSyncUi('retry-pending', 'Cloud unavailable. Your local progress is safe; retry pending.');
    persistSyncMeta();
    return;
  }
  const delay = 2 ** syncState.retryCount * 1000;
  syncState.retryCount++;
  syncState.retryTimer = setTimeout(() => void flushCloudSave(), delay);
  updateSyncUi('retrying', 'Cloud unavailable. Retrying…');
}

async function handleCloudConflict(localPayload, cloudItem) {
  let current = cloudItem;
  if (!current) {
    const loaded = await loadCloudProgress(GAME_ID);
    if (loaded.status !== 'ok') {
      scheduleCloudRetry();
      return;
    }
    current = loaded.item;
  }

  const choice = await promptProgressChoice(localPayload, current.data);
  if (choice === 'cloud') {
    syncState.cloudRevision = Number.isInteger(current.revision) ? current.revision : 0;
    syncState.pending = null;
    state = normalizeState(current.data);
    saveState({ queueCloud: false });
    updateSyncUi('saved', 'Cloud progress restored.');
    persistSyncMeta();
    renderTitleScreen();
    return;
  }

  syncState.cloudRevision = Number.isInteger(current.revision) ? current.revision : 0;
  syncState.pending = normalizeState(localPayload);
  syncState.retryCount = 0;
  persistSyncMeta();
  updateSyncUi('pending', 'Your local progress will replace the cloud copy.');
  void flushCloudSave();
}

async function flushCloudSave() {
  if (syncState.inFlight || !syncState.user || !syncState.canWrite || !syncState.pending) return;

  const payload = syncState.pending;
  syncState.pending = null;
  syncState.inFlight = true;
  persistSyncMeta();
  updateSyncUi('syncing', 'Saving to cloud…');

  const result = await saveCloudProgress(GAME_ID, payload, syncState.cloudRevision);
  syncState.inFlight = false;

  if (result.status === 'saved') {
    syncState.cloudRevision = Number.isInteger(result.item?.revision)
      ? result.item.revision
      : syncState.cloudRevision + 1;
    syncState.retryCount = 0;
    updateSyncUi('saved', 'Saved to cloud.');
    persistSyncMeta();
    if (syncState.pending) void flushCloudSave();
    return;
  }

  if (result.status === 'conflict') {
    syncState.pending = payload;
    persistSyncMeta();
    await handleCloudConflict(payload, result.item);
    return;
  }

  if (result.status === 'unauthenticated') {
    syncState.user = null;
    syncState.canWrite = false;
    syncState.pending = null;
    updateSyncUi('anonymous', 'Your progress remains saved on this device.');
    persistSyncMeta();
    return;
  }

  syncState.pending = payload;
  persistSyncMeta();
  scheduleCloudRetry();
}

async function initializeCloudSync() {
  updateSyncUi('checking', 'Checking sign-in…');
  const auth = await getCurrentUser();

  if (auth.status !== 'authenticated') {
    syncState.user = null;
    syncState.canWrite = false;
    syncState.pending = null;
    syncState.ready = true;
    updateSyncUi(
      auth.status === 'unavailable' ? 'unavailable' : 'anonymous',
      auth.status === 'unavailable'
        ? 'Cloud sign-in is unavailable here. Progress is local-only.'
        : 'Sign in to sync progress across devices.',
    );
    setGameReady(true);
    return;
  }

  syncState.user = auth.user;
  updateSyncUi('checking', 'Loading cloud progress…');
  const remote = await loadCloudProgress(GAME_ID);
  if (remote.status === 'unavailable' || remote.status === 'unauthenticated') {
    syncState.ready = true;
    syncState.canWrite = false;
    updateSyncUi('unavailable', 'Cloud progress is unavailable; playing locally for now.');
    setGameReady(true);
    return;
  }

  syncState.ready = true;
  syncState.canWrite = true;
  const localState = normalizeState(state);
  if (remote.status === 'ok') {
    syncState.cloudRevision = Number.isInteger(remote.item.revision) ? remote.item.revision : 0;
    const cloudState = normalizeState(remote.item.data);
    if (!sameState(localState, cloudState)) {
      const choice = await promptProgressChoice(localState, cloudState);
      if (choice === 'cloud') {
        state = cloudState;
        syncState.pending = null;
        saveState({ queueCloud: false });
      } else {
        syncState.pending = localState;
      }
    }
  } else {
    syncState.cloudRevision = 0;
    syncState.pending = hasProgress(localState) ? localState : null;
  }

  persistSyncMeta();
  updateSyncUi(
    'saved',
    syncState.pending ? 'Local progress is ready to sync.' : 'Cloud sync ready.',
  );
  setGameReady(true);
  if (syncState.pending) void flushCloudSave();
}

function addXP(amount) {
  state.xp += amount;
  while (state.xp >= state.level * XP_PER_LEVEL) {
    state.xp -= state.level * XP_PER_LEVEL;
    state.level++;
  }
  saveState();
}

function xpProgress() {
  return (state.xp / (state.level * XP_PER_LEVEL)) * 100;
}

// ═══════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════
const dataCache = {};

async function loadJSON(path) {
  if (dataCache[path]) return dataCache[path];
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to load ${path}`);
  const data = await resp.json();
  dataCache[path] = data;
  return data;
}

// ═══════════════════════════════════════════
//  WORLD DEFINITIONS
// ═══════════════════════════════════════════
const WORLDS = [
  {
    id: 'verbs',
    emoji: '⚔️',
    name: 'Verb Battleground',
    desc: 'Match Latvian verbs with their English translations in rapid battles.',
    tags: ['Verbs', 'B Level Core'],
    accent: '#5eead4',
    glow: 'rgba(94, 234, 212, 0.3)',
    dataPath: 'data/words.json',
    nodeCount: 10,
    buildChallenges: buildVerbChallenges,
  },
  {
    id: 'prefixes',
    emoji: '🔮',
    name: 'Prefix Forge',
    desc: 'Choose the correct prefix to forge the right verb meaning.',
    tags: ['Prefixes', 'Word Building'],
    accent: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.3)',
    dataPath: 'data/lv-en/forge.json',
    nodeCount: 8,
    buildChallenges: buildPrefixChallenges,
  },
  {
    id: 'prefixed-coming',
    emoji: '🧭',
    name: 'Coming Verb Quest',
    desc: 'Match pienākt, nonākt, nākt, sanākt, pārnākt, atnākt, and pienākties by logic.',
    tags: ['Nākt verbs', 'Meaning match'],
    accent: '#7dcbb5',
    glow: 'rgba(125, 203, 181, 0.3)',
    dataPath: 'data/latvian_prefixed_verb_exercise.spec.json',
    nodeCount: 7,
    buildChallenges: buildPrefixedComingChallenges,
  },
  {
    id: 'reflexive',
    emoji: '🪞',
    name: 'Mirror Chamber',
    desc: 'Decide: reflexive or non-reflexive? The mirror knows!',
    tags: ['Reflexive', '-ies'],
    accent: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.3)',
    dataPath: 'data/maini-vai-mainies/items.json',
    nodeCount: 8,
    buildChallenges: buildReflexiveChallenges,
  },
  {
    id: 'personality',
    emoji: '🎭',
    name: 'Trait Temple',
    desc: 'Sort character traits — optimist or pessimist? Match the meaning!',
    tags: ['Personality', 'Vocab'],
    accent: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.3)',
    dataPath: 'data/personality/words.json',
    nodeCount: 8,
    buildChallenges: buildPersonalityChallenges,
  },
  {
    id: 'passive',
    emoji: '🧪',
    name: 'Passive Lab',
    desc: 'Transform active sentences into the passive voice.',
    tags: ['Passive Voice', 'Grammar'],
    accent: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.3)',
    dataPath: 'data/passive-lab/items.json',
    nodeCount: 8,
    buildChallenges: buildPassiveChallenges,
  },
];

// ═══════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n) {
  return shuffle(arr).slice(0, n);
}

//function $(sel) { return document.querySelector(sel); } Not used function. Commented for testing
function $$(sel) {
  return document.querySelectorAll(sel);
}
function $id(id) {
  return document.getElementById(id);
}

function show(el) {
  el.hidden = false;
}
function hide(el) {
  el.hidden = true;
}

function showScreen(screenId) {
  $$('.wq-screen').forEach((s) => (s.hidden = true));
  const screen = $id(screenId);
  if (screen) {
    screen.hidden = false;
    // re-trigger animation
    screen.style.animation = 'none';
    screen.offsetHeight; // reflow
    screen.style.animation = '';
  }
}

// ═══════════════════════════════════════════
//  CHALLENGE BUILDERS
// ═══════════════════════════════════════════

/** Verb challenges: "What does X mean?" with 4 MC options */
function buildVerbChallenges(data, count) {
  const verbs = Array.isArray(data) ? data.filter((w) => w.en && w.lv) : [];
  if (verbs.length < 4) return [];
  const selected = pick(verbs, count);
  return selected.map((verb) => {
    const wrongPool = verbs.filter((v) => v.lv !== verb.lv);
    const wrongs = pick(wrongPool, 3).map((w) => w.en.split(',')[0].trim());
    const correctAnswer = verb.en.split(',')[0].trim();
    const options = shuffle([correctAnswer, ...wrongs]);
    return {
      type: 'verb',
      word: verb.lv,
      prompt: `What does <strong>${verb.lv}</strong> mean?`,
      hint: verb.conj ? `Present 1s: ${verb.conj.present?.['1s'] || '—'}` : '',
      options,
      correct: correctAnswer,
      explain: verb.en,
    };
  });
}

/** Prefix challenges: "Choose the prefix for [base] meaning [en]" */
function buildPrefixChallenges(data, count) {
  const entries = data?.entries || [];
  if (entries.length < 4) return [];
  const allPrefixes = [...new Set(entries.map((e) => e.correct))];
  const selected = pick(entries, count);
  return selected.map((entry) => {
    const wrongs = pick(
      allPrefixes.filter((p) => p !== entry.correct),
      3,
    );
    const options = shuffle([entry.correct, ...wrongs]);
    return {
      type: 'prefix',
      word: entry.base,
      prompt: `Add the prefix to <strong>${entry.base}</strong>:<br/><span
        class="wq-prompt-hint">${entry.translations.en}</span>`,
      hint: `__ + ${entry.base}`,
      options,
      correct: entry.correct,
      explain: `${entry.correct}${entry.base} = ${entry.translations.en}`,
    };
  });
}

/** Prefixed nākt challenges: match each verb to its core meaning and logic. */
function buildPrefixedComingChallenges(data, count) {
  const words = Array.isArray(data?.target_words) ? data.target_words : [];
  const usable = words.filter((entry) => entry.lemma && entry.meaning_en);
  if (usable.length < 4) return [];
  const selected = pick(usable, count);
  return selected.map((entry) => {
    const wrongPool = usable.filter((word) => word.lemma !== entry.lemma);
    const wrongs = pick(wrongPool, 3).map((word) => word.meaning_en);
    const options = shuffle([entry.meaning_en, ...wrongs]);
    return {
      type: 'meaning',
      word: entry.lemma,
      prompt: `Match the Latvian verb:<br/><strong>${entry.lemma}</strong>`,
      hint: entry.example_lv ? `Example: ${entry.example_lv}` : '',
      options,
      correct: entry.meaning_en,
      explain: entry.example_lv
        ? `${entry.lemma} = ${entry.meaning_en}. ${entry.example_lv}`
        : `${entry.lemma} = ${entry.meaning_en}`,
    };
  });
}

/** Reflexive challenges: "maina or mainās?" fill-in-the-blank */
function buildReflexiveChallenges(data, count) {
  const items = Array.isArray(data) ? data : [];
  if (items.length < 2) return [];
  const selected = pick(items, count);
  return selected.map((item) => {
    const options = shuffle([...item.choices]);
    return {
      type: 'reflexive',
      word: item.choices.join(' / '),
      prompt: item.sentence.replace('____', '<strong>____</strong>'),
      hint: item.hint || '',
      options,
      correct: item.answer,
      explain: item.explain || `Answer: ${item.answer}`,
    };
  });
}

/** Personality challenges: "Optimist or Pessimist?" */
function buildPersonalityChallenges(data, count) {
  const words = Array.isArray(data) ? data.filter((w) => w.group) : [];
  if (words.length < 4) return [];
  const selected = pick(words, count);
  return selected.map((word) => {
    // Build a "match meaning" challenge
    const wrongPool = words.filter((w) => w.id !== word.id);
    const wrongs = pick(wrongPool, 3).map((w) => w.en);
    const options = shuffle([word.en, ...wrongs]);
    const traitEmoji = word.group === 'optimists' ? '😊' : '😔';
    const traitLabel = word.group === 'optimists' ? 'optimist trait' : 'pessimist trait';
    return {
      type: 'personality',
      word: word.lv,
      prompt: `What does <strong>${word.lv}</strong> mean?<br/><span
        class="wq-prompt-hint">${traitEmoji} ${traitLabel}</span>`,
      hint: word.notes || '',
      options,
      correct: word.en,
      explain: `${word.lv} (${word.group}) = ${word.en}`,
    };
  });
}

/** Passive voice challenges: pick correct passive form */
function buildPassiveChallenges(data, count) {
  const items = Array.isArray(data) ? data : [];
  if (items.length < 4) return [];
  const selected = pick(items, count);
  const tenses = ['present', 'past', 'future'];
  return selected.map((item) => {
    const tense = tenses[Math.floor(Math.random() * tenses.length)];
    const correctForm = item.expected[tense];
    // Generate plausible wrong answers by mixing tenses and other items
    const wrongFromOther = pick(
      items.filter((i) => i.id !== item.id),
      2,
    ).map((i) => i.expected[tense]);
    const wrongTense = tenses.find((t) => t !== tense);
    const wrongFromSame = item.expected[wrongTense];
    const wrongs = shuffle([...wrongFromOther, wrongFromSame]).slice(0, 3);
    const options = shuffle([correctForm, ...wrongs]);
    return {
      type: 'passive',
      word: item.verb,
      prompt: `Active: <strong>${item.active}</strong><br/><span
        class="wq-prompt-hint">Form the <em>${tense}</em> passive:</span>`,
      hint: item.hint || '',
      options,
      correct: correctForm,
      explain: item.explain || correctForm,
    };
  });
}

// ═══════════════════════════════════════════
//  SCREENS
// ═══════════════════════════════════════════

// ─── Title Screen ───
function renderTitleScreen() {
  const statsEl = $id('wq-title-stats');
  if (state.level > 1 || state.xp > 0 || state.totalCorrect > 0) {
    show(statsEl);
    $id('wq-title-level').textContent = state.level;
    $id('wq-title-xp').textContent = state.xp;
    $id('wq-title-streak').textContent = state.bestStreak;
    $id('wq-btn-play').innerHTML = '<span class="wq-btn-icon">▶</span> Continue Quest';
  }
}

// ─── World Map ───
function renderWorldMap() {
  showScreen('wq-map-screen');
  updatePlayerBar();

  const grid = $id('wq-map-grid');
  grid.innerHTML = '';

  WORLDS.forEach((world, idx) => {
    const ws = state.worlds[world.id] || { completed: [], current: 0 };
    const completedCount = ws.completed?.length || 0;
    const progress = Math.round((completedCount / world.nodeCount) * 100);

    const card = document.createElement('div');
    card.className = 'wq-world-card';
    card.style.setProperty('--wq-card-accent', world.accent);
    card.style.setProperty('--wq-card-glow', world.glow);
    card.style.animationDelay = `${idx * 80}ms`;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Enter ${world.name}`);

    const completionText =
      completedCount === world.nodeCount
        ? '✓ Completed'
        : completedCount > 0
          ? 'Continue'
          : 'Enter';

    card.innerHTML = `
      <div class="wq-world-emoji">${world.emoji}</div>
      <h3 class="wq-world-name">${world.name}</h3>
      <p class="wq-world-desc">${world.desc}</p>
      <div class="wq-world-meta">
        ${world.tags.map((t) => `<span class="wq-world-tag">${t}</span>`).join('')}
      </div>
      <div class="wq-world-card-bar-wrap">
        <div class="wq-world-card-bar" style="width:${progress}%"></div>
      </div>
      <button class="wq-btn wq-btn--primary wq-btn--sm
        wq-world-card-play">
        ${completionText}
      </button>
    `;

    const handler = () => renderWorldNodes(world);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
    grid.appendChild(card);
  });
}

// ─── World Nodes ───
let currentWorld = null;

function renderWorldNodes(world) {
  currentWorld = world;
  showScreen('wq-world-screen');

  const ws = state.worlds[world.id] || { completed: [], current: 0 };
  state.worlds[world.id] = ws;

  $id('wq-world-title').textContent = `${world.emoji} ${world.name}`;
  const completedCount = ws.completed?.length || 0;
  $id('wq-world-progress-text').textContent = `${completedCount} / ${world.nodeCount}`;
  $id('wq-world-progress-bar').style.width =
    `${Math.round((completedCount / world.nodeCount) * 100)}%`;

  const path = $id('wq-node-path');
  path.innerHTML = '';

  for (let i = 0; i < world.nodeCount; i++) {
    const isCompleted = ws.completed?.includes(i);
    const isCurrent = i === (ws.current || 0) && !isCompleted;
    const isLocked = i > (ws.current || 0) && !isCompleted;

    // connector (not before first)
    if (i > 0) {
      const conn = document.createElement('div');
      const isConnCompleted = ws.completed?.includes(i - 1);
      conn.className = `wq-node-connector ${isConnCompleted ? 'completed' : ''}`;
      path.appendChild(conn);
    }

    const node = document.createElement('div');
    const classNames = [
      'wq-node',
      isCompleted ? 'wq-node--completed' : '',
      isCurrent ? 'wq-node--current' : '',
      isLocked ? 'wq-node--locked' : '',
    ]
      .filter(Boolean)
      .join(' ');
    node.className = classNames;
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', isLocked ? '-1' : '0');
    const ariaText = isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ' (locked)';
    node.setAttribute('aria-label', `Node ${i + 1}${ariaText}`);

    const orbText = isCompleted ? '✓' : i + 1;
    node.innerHTML = `
      <div class="wq-node-orb">${orbText}</div>
      <div class="wq-node-label">Stage ${i + 1}</div>
    `;

    if (!isLocked) {
      const handler = () => startBattle(world, i);
      node.addEventListener('click', handler);
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    }

    path.appendChild(node);
  }
}

// ─── Battle ───
let battleState = null;

async function startBattle(world, nodeIndex) {
  showScreen('wq-battle-screen');

  // Load data
  let data;
  try {
    data = await loadJSON(world.dataPath);
  } catch (err) {
    console.error('Data load error:', err);
    $id('wq-battle-prompt').textContent = 'Failed to load challenge data. Please try again.';
    return;
  }

  const challenges = world.buildChallenges(data, CHALLENGES_PER_NODE);
  if (!challenges || challenges.length === 0) {
    $id('wq-battle-prompt').textContent = 'No challenges available for this node.';
    return;
  }

  battleState = {
    world,
    nodeIndex,
    challenges,
    currentIndex: 0,
    lives: MAX_LIVES,
    streak: 0,
    correctCount: 0,
    wrongCount: 0,
    xpEarned: 0,
    isAnswered: false,
  };

  renderBattleChallenge();
}

function renderBattleChallenge() {
  if (!battleState) return;

  const ch = battleState.challenges[battleState.currentIndex];
  if (!ch) {
    // all challenges done — victory!
    showResult(true);
    return;
  }

  battleState.isAnswered = false;

  // Update header
  updateBattleLives();
  $id('wq-battle-streak').textContent = `🔥 ${battleState.streak}`;
  const mult = battleState.streak >= 5 ? '×3' : battleState.streak >= 3 ? '×2' : '';
  $id('wq-battle-mult').textContent = mult;

  // Enemy
  $id('wq-enemy-word').textContent = ch.word;
  const typeLabel = ch.type.charAt(0).toUpperCase() + ch.type.slice(1) + ' challenge';
  $id('wq-enemy-label').textContent = typeLabel;
  const hpPct =
    ((battleState.challenges.length - battleState.currentIndex) / battleState.challenges.length) *
    100;
  $id('wq-enemy-hp-bar').style.width = `${hpPct}%`;

  const orb = $id('wq-enemy-orb');
  orb.classList.remove('hit', 'heal');

  // Prompt
  $id('wq-battle-prompt').innerHTML = ch.prompt;

  // Choices
  const choicesEl = $id('wq-battle-choices');
  choicesEl.innerHTML = '';
  ch.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'wq-choice-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, btn));
    choicesEl.appendChild(btn);
  });

  // Hide feedback & next button
  hide($id('wq-battle-feedback'));
  hide($id('wq-btn-next-battle'));
}

function handleAnswer(chosen, btnEl) {
  if (!battleState || battleState.isAnswered) return;
  battleState.isAnswered = true;

  const ch = battleState.challenges[battleState.currentIndex];
  const isCorrect = chosen === ch.correct;

  // Disable all buttons
  $$('.wq-choice-btn').forEach((btn) => {
    btn.disabled = true;
  });

  // Mark correct/wrong
  $$('.wq-choice-btn').forEach((btn) => {
    if (btn.textContent === ch.correct) btn.classList.add('correct');
    if (btn === btnEl && !isCorrect) btn.classList.add('wrong');
  });

  // Animate enemy
  const orb = $id('wq-enemy-orb');
  if (isCorrect) {
    orb.classList.add('hit');
  } else {
    orb.classList.add('heal');
  }

  // Update state
  if (isCorrect) {
    battleState.streak++;
    battleState.correctCount++;
    state.totalCorrect++;
    const multiplier = battleState.streak >= 5 ? 3 : battleState.streak >= 3 ? 2 : 1;
    const xp = BASE_XP * multiplier;
    battleState.xpEarned += xp;
    state.streak = battleState.streak;
    if (battleState.streak > state.bestStreak) state.bestStreak = battleState.streak;
  } else {
    battleState.lives--;
    battleState.wrongCount++;
    state.totalWrong++;
    battleState.streak = 0;
    state.streak = 0;
    updateBattleLives();
  }

  // Show feedback
  const fb = $id('wq-battle-feedback');
  show(fb);
  $id('wq-feedback-icon').textContent = isCorrect ? '✅' : '❌';
  $id('wq-feedback-text').textContent = isCorrect ? 'Correct!' : 'Wrong!';
  $id('wq-feedback-detail').textContent = ch.explain;

  // Update streak display
  $id('wq-battle-streak').textContent = `🔥 ${battleState.streak}`;
  const mult = battleState.streak >= 5 ? '×3' : battleState.streak >= 3 ? '×2' : '';
  $id('wq-battle-mult').textContent = mult;

  saveState();

  // Check if battle is over
  if (battleState.lives <= 0) {
    setTimeout(() => showResult(false), 1200);
    return;
  }

  // Show next button
  show($id('wq-btn-next-battle'));
}

function updateBattleLives() {
  if (!battleState) return;
  const hearts = $$('#wq-battle-lives .wq-heart');
  hearts.forEach((h, i) => {
    if (i < battleState.lives) {
      h.className = 'wq-heart active';
    } else {
      h.className = 'wq-heart lost';
    }
  });
}

function nextChallenge() {
  if (!battleState) return;
  battleState.currentIndex++;
  if (battleState.currentIndex >= battleState.challenges.length) {
    showResult(true);
  } else {
    renderBattleChallenge();
  }
}

// ─── Result Screen ───
function showResult(victory) {
  showScreen('wq-result-screen');

  if (victory) {
    // Mark node complete
    const ws = state.worlds[battleState.world.id] || { completed: [], current: 0 };
    if (!ws.completed) ws.completed = [];
    if (!ws.completed.includes(battleState.nodeIndex)) {
      ws.completed.push(battleState.nodeIndex);
    }
    // Advance current
    if (ws.current === battleState.nodeIndex) {
      ws.current = Math.min(battleState.nodeIndex + 1, battleState.world.nodeCount - 1);
    }
    state.worlds[battleState.world.id] = ws;
    addXP(battleState.xpEarned);

    $id('wq-result-icon').textContent = '🏆';
    $id('wq-result-title').textContent = 'Victory!';
    $id('wq-result-sub').textContent = 'You defeated this challenge and earned XP!';

    // Confetti
    spawnConfetti();
  } else {
    $id('wq-result-icon').textContent = '💀';
    $id('wq-result-title').textContent = 'Defeated…';
    $id('wq-result-sub').textContent = 'The words were too strong this time. Try again!';
  }

  $id('wq-result-stats').innerHTML = `
    <div class="wq-result-stat">
      <span class="wq-result-stat-val">${battleState.correctCount}</span>
      <span class="wq-result-stat-label">Correct</span>
    </div>
    <div class="wq-result-stat">
      <span class="wq-result-stat-val">${battleState.wrongCount}</span>
      <span class="wq-result-stat-label">Wrong</span>
    </div>
    <div class="wq-result-stat">
      <span class="wq-result-stat-val">+${battleState.xpEarned}</span>
      <span class="wq-result-stat-label">XP earned</span>
    </div>
    <div class="wq-result-stat">
      <span class="wq-result-stat-val">${state.level}</span>
      <span class="wq-result-stat-label">Level</span>
    </div>
  `;

  saveState();
}

function spawnConfetti() {
  const container = document.createElement('div');
  container.className = 'wq-confetti-container';
  document.body.appendChild(container);

  const colors = ['#5eead4', '#fbbf24', '#f472b6', '#a78bfa', '#38bdf8', '#34d399'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'wq-confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${-10 - Math.random() * 20}px`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration = `${2 + Math.random() * 1.5}s`;
    piece.style.width = `${6 + Math.random() * 8}px`;
    piece.style.height = `${6 + Math.random() * 8}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 4000);
}

// ─── Player Bar ───
function updatePlayerBar() {
  $id('wq-player-level').textContent = `Lv. ${state.level}`;
  const xpLabel = `${state.xp} / ${state.level * XP_PER_LEVEL} XP`;
  $id('wq-player-xp').textContent = xpLabel;
  $id('wq-xp-bar').style.width = `${xpProgress()}%`;
}

// ═══════════════════════════════════════════
//  EVENT WIRING
// ═══════════════════════════════════════════
function init() {
  setGameReady(false);
  renderTitleScreen();

  // Title → Map
  $id('wq-btn-play').addEventListener('click', () => renderWorldMap());

  // How to play
  $id('wq-btn-how').addEventListener('click', () => show($id('wq-how-modal')));
  const howModal = $id('wq-how-modal');
  howModal.querySelector('.wq-modal-close').addEventListener('click', () => hide(howModal));
  howModal.querySelector('.wq-how-close-btn').addEventListener('click', () => hide(howModal));
  howModal.querySelector('.wq-modal-backdrop').addEventListener('click', () => hide(howModal));

  window.addEventListener('online', () => {
    if (syncState.user) void initializeCloudSync();
  });
  window.addEventListener('offline', () => {
    if (syncState.user) updateSyncUi('offline', 'Offline. Local progress is safe.');
  });

  // Map ← Back
  $id('wq-btn-back-title').addEventListener('click', () => {
    showScreen('wq-title-screen');
    renderTitleScreen();
  });

  // World ← Back
  $id('wq-btn-back-map').addEventListener('click', () => renderWorldMap());

  // Battle: next
  $id('wq-btn-next-battle').addEventListener('click', () => nextChallenge());

  // Battle: retreat
  $id('wq-btn-exit-battle').addEventListener('click', () => {
    if (currentWorld) renderWorldNodes(currentWorld);
    else renderWorldMap();
  });

  // Result: retry
  $id('wq-btn-retry').addEventListener('click', () => {
    if (battleState) startBattle(battleState.world, battleState.nodeIndex);
  });

  // Result: back to world
  $id('wq-btn-to-world').addEventListener('click', () => {
    if (currentWorld) renderWorldNodes(currentWorld);
    else renderWorldMap();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const howModal = $id('wq-how-modal');
      if (!howModal.hidden) {
        hide(howModal);
        return;
      }
    }
    // Number keys for quick answer in battle
    if (battleState && !battleState.isAnswered && !$id('wq-battle-screen').hidden) {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        const btns = $$('.wq-choice-btn');
        if (btns[num - 1]) btns[num - 1].click();
      }
    }
    // Enter for next challenge
    if (e.key === 'Enter' && battleState?.isAnswered && !$id('wq-btn-next-battle').hidden) {
      nextChallenge();
    }
  });

  void initializeCloudSync();
}

function visibleScreenId() {
  const visible = Array.from($$('.wq-screen')).find((screen) => !screen.hidden);
  return visible?.id || null;
}

function renderGameToText() {
  const challenge = battleState?.challenges?.[battleState.currentIndex] || null;
  const payload = {
    mode: visibleScreenId(),
    level: state.level,
    xp: state.xp,
    worlds: WORLDS.map((world) => {
      const ws = state.worlds[world.id] || { completed: [], current: 0 };
      return {
        id: world.id,
        name: world.name,
        nodes: world.nodeCount,
        completed: ws.completed?.length || 0,
        current: ws.current || 0,
      };
    }),
    currentWorld: currentWorld
      ? {
          id: currentWorld.id,
          name: currentWorld.name,
        }
      : null,
    battle: battleState
      ? {
          worldId: battleState.world.id,
          nodeIndex: battleState.nodeIndex,
          challengeIndex: battleState.currentIndex,
          lives: battleState.lives,
          streak: battleState.streak,
          isAnswered: battleState.isAnswered,
          challenge: challenge
            ? {
                type: challenge.type,
                word: challenge.word,
                options: challenge.options,
                correct: challenge.correct,
              }
            : null,
        }
      : null,
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = () => renderGameToText();

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
