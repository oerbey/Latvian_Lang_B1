(() => {
  const STORAGE_KEY = 'llb1:decl6-detective:progress';
  const DATA_PATH = 'data/decl6-detective/items.json';
  const MCQ_TARGET = 5;
  const TYPE_TARGET = 3;

  const DEFAULT_STRINGS = {
    title: 'What’s in my house? — 6th Declension Detective',
    start: 'Start',
    mode_mcq: 'Detective Cards',
    mode_typein: 'Room Builder',
    check: 'Check',
    next: 'Next',
    score: 'Score',
    streak: 'Streak',
    hint: 'Hint',
    correct: 'Correct!',
    wrong: 'Try again!',
    level_complete: 'Level complete!',
    instructions_mcq: 'Choose the correct 6th-declension form.',
    instructions_typein: 'Type the missing form (supports Latvian diacritics).',
  };

  const SCENE_META = {
    virtuve: { label: 'Virtuve', emoji: '🍲', color: '#fb923c' },
    pirts: { label: 'Pirts', emoji: '🪵', color: '#fb7185' },
    klēts: { label: 'Klēts', emoji: '🌾', color: '#22c55e' },
    kūts: { label: 'Kūts', emoji: '🐄', color: '#ca8a04' },
    telts: { label: 'Telts', emoji: '⛺', color: '#38bdf8' },
    viesistaba: { label: 'Viesistaba', emoji: '🛋️', color: '#a855f7' },
    koridors: { label: 'Koridors', emoji: '🚪', color: '#64748b' },
    karte: { label: 'Karte', emoji: '🗺️', color: '#0ea5e9' },
    pagalms: { label: 'Pagalms', emoji: '🏡', color: '#4ade80' },
    parks: { label: 'Parks', emoji: '🌳', color: '#22c55e' },
    pludmale: { label: 'Pludmale', emoji: '🏖️', color: '#f97316' },
  };

  const nodes = {
    mcqCard: document.getElementById('decl6-mcq-card'),
    mcqPrompt: document.getElementById('decl6-mcq-prompt'),
    mcqCase: document.getElementById('decl6-mcq-case'),
    mcqHint: document.getElementById('decl6-mcq-hint'),
    mcqOptions: document.getElementById('decl6-mcq-options'),
    mcqExplain: document.getElementById('decl6-mcq-explain'),
    mcqNext: document.getElementById('decl6-mcq-next'),
    mcqProgress: document.getElementById('decl6-mcq-progress'),
    mcqSceneEmoji: document.getElementById('decl6-mcq-scene-emoji'),
    mcqSceneName: document.getElementById('decl6-mcq-scene-name'),
    typeCard: document.getElementById('decl6-builder-card'),
    typePrompt: document.getElementById('decl6-type-prompt'),
    typeCase: document.getElementById('decl6-type-case'),
    typeHint: document.getElementById('decl6-type-hint'),
    typeInput: document.getElementById('decl6-type-input'),
    typeCheck: document.getElementById('decl6-type-check'),
    typeExplain: document.getElementById('decl6-type-explain'),
    typeNext: document.getElementById('decl6-type-next'),
    typeProgress: document.getElementById('decl6-type-progress'),
    typeSceneEmoji: document.getElementById('decl6-type-scene-emoji'),
    typeSceneName: document.getElementById('decl6-type-scene-name'),
    planImage: document.getElementById('decl6-plan'),
    liveRegion: document.getElementById('decl6-live-region'),
    scoreValue: document.getElementById('decl6-score'),
    streakValue: document.getElementById('decl6-streak'),
    lastPlayedValue: document.getElementById('decl6-last'),
    restart: document.getElementById('decl6-restart'),
    levelStatus: document.getElementById('decl6-level-status'),
  };

  let strings = { ...DEFAULT_STRINGS };
  let currentLang = 'lv';
  let items = [];
  let mcqQueue = [];
  let typeQueue = [];
  let mcqIndex = 0;
  let typeIndex = 0;
  let mcqAttempt = 0;
  let typeAttempt = 0;
  let currentMcqItem = null;
  let currentTypeItem = null;
  let mcqSolved = false;
  let typeSolved = false;
  let xp = 0;
  let streak = 0;
  let progress = { xp: 0, streak: 0, lastPlayedISO: null };

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function normalizeAnswer(value = '') {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function formatLastPlayed(value) {
    if (!value) return '—';
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) return '—';
    return when.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }

  function readProgress() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { xp: 0, streak: 0, lastPlayedISO: null };
      const parsed = JSON.parse(stored);
      return {
        xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0,
        streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
        lastPlayedISO: parsed?.lastPlayedISO ?? null,
      };
    } catch (err) {
      console.warn('Failed to read decl6 progress', err);
      return { xp: 0, streak: 0, lastPlayedISO: null };
    }
  }

  function persistProgress(touchLastPlayed = false) {
    const payload = {
      xp,
      streak,
      lastPlayedISO: touchLastPlayed ? new Date().toISOString() : progress.lastPlayedISO,
    };
    progress = payload;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Unable to persist decl6 progress', err);
    }
    updateScoreboard();
  }

  function updateScoreboard() {
    if (nodes.scoreValue) nodes.scoreValue.textContent = String(xp);
    if (nodes.streakValue) nodes.streakValue.textContent = String(streak);
    if (nodes.lastPlayedValue) nodes.lastPlayedValue.textContent = formatLastPlayed(progress.lastPlayedISO);
  }

  function applyTranslations() {
    document.title = strings.title || document.title;
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n-key]').forEach(node => {
      const key = node.dataset.i18nKey;
      if (!key) return;
      const value = strings[key];
      if (!value) return;
      if (node.tagName.toLowerCase() === 'input') {
        node.setAttribute('placeholder', value);
      } else {
        node.textContent = value;
      }
    });
  }

  function getSceneMeta(scene) {
    if (scene && Object.prototype.hasOwnProperty.call(SCENE_META, scene)) {
      return SCENE_META[scene];
    }
    if (!scene) {
      return { label: 'Scene', emoji: '🏠', color: 'var(--accent)' };
    }
    const capitalized = scene.charAt(0).toUpperCase() + scene.slice(1);
    return { label: capitalized, emoji: '🏠', color: 'var(--accent)' };
  }

  function applySceneTheme(card, emojiEl, labelEl, scene) {
    if (!card) return;
    const theme = getSceneMeta(scene);
    card.style.setProperty('--scene-color', theme.color);
    if (emojiEl) emojiEl.textContent = theme.emoji;
    if (labelEl) labelEl.textContent = theme.label;
    if (card === nodes.typeCard && nodes.planImage && scene && scene !== nodes.planImage.dataset.scene) {
      nodes.planImage.dataset.scene = scene;
      nodes.planImage.alt = `House floor plan — ${theme.label}`;
    }
  }

  function updateLiveRegion(message) {
    if (!nodes.liveRegion) return;
    nodes.liveRegion.textContent = message;
  }

  function prepareQueue(target) {
    const queue = [];
    let pool = shuffle(items);
    let cursor = 0;
    while (queue.length < target) {
      if (cursor >= pool.length) {
        pool = shuffle(items);
        cursor = 0;
      }
      queue.push(pool[cursor]);
      cursor += 1;
    }
    return queue;
  }

  function setMcqProgress() {
    if (!nodes.mcqProgress) return;
    const visible = Math.min(mcqIndex + 1, MCQ_TARGET);
    nodes.mcqProgress.textContent = `${visible}/${MCQ_TARGET}`;
  }

  function setTypeProgress() {
    if (!nodes.typeProgress) return;
    const visible = Math.min(typeIndex + 1, TYPE_TARGET);
    nodes.typeProgress.textContent = `${visible}/${TYPE_TARGET}`;
  }

  function finalizeMcqSection() {
    currentMcqItem = null;
    mcqSolved = false;
    nodes.mcqPrompt.textContent = strings.level_complete;
    nodes.mcqCase.textContent = '';
    nodes.mcqHint.textContent = '';
    nodes.mcqExplain.classList.add('visually-hidden');
    nodes.mcqExplain.textContent = '';
    nodes.mcqOptions.innerHTML = '';
    nodes.mcqNext.disabled = true;
    setMcqProgress();
    updateLevelStatus();
  }

  function loadMcqItem() {
    if (!nodes.mcqPrompt) return;
    if (mcqIndex >= MCQ_TARGET) {
      finalizeMcqSection();
      return;
    }
    currentMcqItem = mcqQueue[mcqIndex];
    mcqAttempt = 0;
    mcqSolved = false;
    nodes.mcqPrompt.textContent = currentMcqItem.prompt;
    nodes.mcqCase.textContent = currentMcqItem.case;
    nodes.mcqHint.textContent = currentMcqItem.hint ?? '—';
    nodes.mcqExplain.classList.add('visually-hidden');
    nodes.mcqExplain.textContent = currentMcqItem.explain ?? '';
    nodes.mcqNext.disabled = true;
    applySceneTheme(nodes.mcqCard, nodes.mcqSceneEmoji, nodes.mcqSceneName, currentMcqItem.scene);
    nodes.mcqOptions.innerHTML = '';
    const options = shuffle(currentMcqItem.options ?? []);
    options.forEach(optionText => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'decl6-option';
      button.dataset.value = optionText;
      button.textContent = optionText;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.addEventListener('click', handleMcqChoice);
      nodes.mcqOptions.appendChild(button);
    });
    setMcqProgress();
  }

  function handleMcqChoice(event) {
    if (!currentMcqItem || mcqSolved) return;
    const button = event.currentTarget;
    const selection = button.dataset.value;
    mcqAttempt += 1;
    const isCorrect = selection === currentMcqItem.answer;
    if (isCorrect) {
      mcqSolved = true;
      button.classList.add('correct');
      button.setAttribute('aria-checked', 'true');
      nodes.mcqOptions.querySelectorAll('button').forEach(choice => {
        choice.disabled = true;
        if (choice !== button) choice.setAttribute('aria-checked', 'false');
      });
      let reward = Math.max(1, 5 - (mcqAttempt - 1));
      xp += reward;
      streak += 1;
      let bonus = 0;
      if (streak > 0 && streak % 5 === 0) {
        bonus = 10;
        xp += bonus;
      }
      const explanation = currentMcqItem.explain ?? '';
      nodes.mcqExplain.textContent = explanation;
      nodes.mcqExplain.classList.remove('visually-hidden');
      nodes.mcqNext.disabled = false;
      persistProgress(true);
      let message = `${strings.correct} ${explanation}`.trim();
      if (bonus) {
        message = `${message} +${bonus} xp`;
      }
      updateLiveRegion(message);
      updateLevelStatus();
    } else {
      button.classList.add('incorrect');
      updateLiveRegion(strings.wrong);
      streak = 0;
      persistProgress(false);
    }
  }

  function finalizeTypeSection() {
    currentTypeItem = null;
    typeSolved = false;
    nodes.typePrompt.textContent = strings.level_complete;
    nodes.typeCase.textContent = '';
    nodes.typeHint.textContent = '';
    nodes.typeExplain.textContent = '';
    nodes.typeExplain.classList.add('visually-hidden');
    nodes.typeInput.value = '';
    nodes.typeInput.disabled = true;
    nodes.typeCheck.disabled = true;
    nodes.typeNext.disabled = true;
    nodes.typeInput.classList.remove('is-valid', 'is-invalid');
    updateLevelStatus();
    setTypeProgress();
  }

  function loadTypeItem() {
    if (typeIndex >= TYPE_TARGET) {
      finalizeTypeSection();
      return;
    }
    currentTypeItem = typeQueue[typeIndex];
    typeSolved = false;
    typeAttempt = 0;
    nodes.typePrompt.textContent = currentTypeItem.prompt;
    nodes.typeCase.textContent = currentTypeItem.case;
    nodes.typeHint.textContent = currentTypeItem.hint ?? '—';
    nodes.typeExplain.textContent = currentTypeItem.explain ?? '';
    nodes.typeExplain.classList.add('visually-hidden');
    nodes.typeInput.value = '';
    nodes.typeInput.disabled = false;
    nodes.typeInput.classList.remove('is-valid', 'is-invalid');
    nodes.typeCheck.disabled = false;
    nodes.typeNext.disabled = true;
    applySceneTheme(nodes.typeCard, nodes.typeSceneEmoji, nodes.typeSceneName, currentTypeItem.scene);
    setTypeProgress();
  }

  function handleTypeCheck() {
    if (!currentTypeItem || typeSolved) return;
    const attempt = nodes.typeInput.value;
    if (!attempt.trim()) return;
    typeAttempt += 1;
    const normalized = normalizeAnswer(attempt);
    const normalizedTarget = normalizeAnswer(currentTypeItem.answer);
    if (normalized === normalizedTarget) {
      typeSolved = true;
      nodes.typeInput.classList.remove('is-invalid');
      nodes.typeInput.classList.add('is-valid');
      nodes.typeInput.disabled = true;
      nodes.typeCheck.disabled = true;
      nodes.typeNext.disabled = false;
      nodes.typeExplain.classList.remove('visually-hidden');
      let reward = Math.max(1, 5 - (typeAttempt - 1));
      xp += reward;
      streak += 1;
      let bonus = 0;
      if (streak > 0 && streak % 5 === 0) {
        bonus = 10;
        xp += bonus;
      }
      persistProgress(true);
      let message = `${strings.correct} ${(currentTypeItem.explain ?? '').trim()}`.trim();
      if (bonus) {
        message = `${message} +${bonus} xp`;
      }
      updateLiveRegion(message);
      updateLevelStatus();
    } else {
      nodes.typeInput.classList.add('is-invalid');
      updateLiveRegion(strings.wrong);
      streak = 0;
      persistProgress(false);
    }
  }

  function handleTypeNext() {
    if (!typeSolved) return;
    typeIndex += 1;
    if (typeIndex >= TYPE_TARGET) {
      finalizeTypeSection();
      updateLevelStatus();
      updateLiveRegion(strings.level_complete);
      return;
    }
    loadTypeItem();
  }

  function handleMcqNext() {
    if (!mcqSolved) return;
    mcqIndex += 1;
    if (mcqIndex >= MCQ_TARGET) {
      finalizeMcqSection();
      updateLiveRegion(strings.level_complete);
      return;
    }
    loadMcqItem();
  }

  function updateLevelStatus() {
    const finished = mcqIndex >= MCQ_TARGET && typeIndex >= TYPE_TARGET;
    if (!nodes.levelStatus) return;
    nodes.levelStatus.classList.toggle('visually-hidden', !finished);
  }

  function attachEventListeners() {
    if (nodes.mcqNext) {
      nodes.mcqNext.addEventListener('click', handleMcqNext);
    }
    if (nodes.typeCheck) {
      nodes.typeCheck.addEventListener('click', handleTypeCheck);
    }
    if (nodes.typeNext) {
      nodes.typeNext.addEventListener('click', handleTypeNext);
    }
    if (nodes.restart) {
      nodes.restart.addEventListener('click', () => {
        updateLiveRegion('');
        startSession();
      });
    }
    if (nodes.typeInput) {
      nodes.typeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleTypeCheck();
        }
      });
    }
    if (nodes.mcqOptions) {
      nodes.mcqOptions.addEventListener('keydown', event => {
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!keys.includes(event.key)) return;
        const buttons = Array.from(nodes.mcqOptions.querySelectorAll('button'));
        if (!buttons.length) return;
        event.preventDefault();
        const currentIndex = buttons.indexOf(document.activeElement);
        if (currentIndex < 0) {
          buttons[0].focus();
          return;
        }
        const delta = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
        const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
      });
    }
  }

  function startSession() {
    mcqQueue = prepareQueue(MCQ_TARGET);
    typeQueue = prepareQueue(TYPE_TARGET);
    mcqIndex = 0;
    typeIndex = 0;
    mcqSolved = false;
    typeSolved = false;
    loadMcqItem();
    loadTypeItem();
    updateLevelStatus();
  }

  async function loadTranslations() {
    const candidates = [navigator.language?.slice(0, 2), 'lv', 'en'].filter(Boolean);
    for (const code of candidates) {
      try {
        const response = await fetch(assetUrl(`i18n/decl6-detective.${code}.json`), { cache: 'no-store' });
        if (!response.ok) continue;
        const payload = await response.json();
        strings = { ...DEFAULT_STRINGS, ...payload };
        currentLang = code;
        applyTranslations();
        return;
      } catch (err) {
        console.warn('Unable to load decl6 translations for', code, err);
      }
    }
    strings = { ...DEFAULT_STRINGS };
    applyTranslations();
  }

  async function loadData() {
    const response = await fetch(assetUrl(DATA_PATH), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load ${DATA_PATH}`);
    }
    return response.json();
  }

  async function init() {
    progress = readProgress();
    xp = progress.xp ?? 0;
    streak = progress.streak ?? 0;
    updateScoreboard();
    try {
      await loadTranslations();
      items = await loadData();
      if (!items.length) throw new Error('No items in decl6 data');
      startSession();
      attachEventListeners();
    } catch (err) {
      console.error(err);
      updateLiveRegion('Unable to load the detective game right now.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
