(() => {
  const STORAGE_KEY = 'llb1:passive-lab:progress';
  const TENSES = ['present', 'past', 'future'];
  const TENSE_PREFIX = { present: 'tiek', past: 'tika', future: 'tiks' };
  const BASE_POINTS = { builder: 4, typein: 5 };
  const STREAK_INTERVAL = 5;
  const STREAK_BONUS = 10;
  const ENDING_MAP = {
    'm.sg': '-ts',
    'f.sg': '-ta',
    'm.pl': '-ti',
    'f.pl': '-tas',
  };
  const iconPaths = {
    success: 'assets/img/passive-lab/glyph-ok.svg',
    error: 'assets/img/passive-lab/glyph-error.svg',
  };

  const nodes = {
    statusText: document.getElementById('pl-status-text'),
    statusIcon: document.getElementById('pl-status-icon'),
    feedback: document.querySelector('.passive-lab-feedback'),
    activeSentence: document.getElementById('pl-active-sentence'),
    targetLabel: document.getElementById('pl-tense-target-label'),
    patientContainer: document.getElementById('pl-builder-patients'),
    tenseSelect: document.getElementById('pl-tense-select'),
    endingSelect: document.getElementById('pl-ending-select'),
    builderCheck: document.getElementById('pl-builder-check'),
    typeCheck: document.getElementById('pl-type-check'),
    typeInput: document.getElementById('pl-type-input'),
    nextButton: document.getElementById('pl-next'),
    resultPanel: document.querySelector('.passive-lab-result'),
    resultSentence: document.getElementById('pl-result-sentence'),
    itemHint: document.getElementById('pl-item-hint'),
    endingHint: document.getElementById('pl-ending-hint'),
    scoreValue: document.getElementById('pl-score-value'),
    streakValue: document.getElementById('pl-streak-value'),
    lastPlayedValue: document.getElementById('pl-last-played-value'),
    modeButtons: Array.from(document.querySelectorAll('[data-mode]')),
    modePanels: Array.from(document.querySelectorAll('[data-mode-panel]')),
  };

  let i18n = {};
  let currentLang = 'lv';
  let items = [];
  let patientBank = [];
  let builderChoices = [];
  let currentItem = null;
  let currentTense = TENSES[0];
  let builderAttempts = 0;
  let typeAttempts = 0;
  let solved = false;
  let xp = 0;
  let streak = 0;
  let progress = { xp: 0, streak: 0, lastPlayedISO: null };
  let builderSelectedKey = '';

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function getTranslation(key, fallback = '') {
    if (!key) return fallback;
    return key.split('.').reduce((obj, part) => (obj && Object.prototype.hasOwnProperty.call(obj, part) ? obj[part] : undefined), i18n) ?? fallback;
  }

  function formatString(template = '', replacements = {}) {
    return template.replace(/\{([^}]+)\}/g, (_, token) => {
      return Object.prototype.hasOwnProperty.call(replacements, token) ? replacements[token] : '';
    });
  }

  function readProgress() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) return { xp: 0, streak: 0, lastPlayedISO: null };
      const parsed = JSON.parse(serialized);
      return {
        xp: Number.isFinite(parsed?.xp) ? parsed.xp : 0,
        streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
        lastPlayedISO: parsed?.lastPlayedISO ?? null,
      };
    } catch (err) {
      console.warn('Failed to read passive lab progress', err);
      return { xp: 0, streak: 0, lastPlayedISO: null };
    }
  }

  function persistProgress() {
    try {
      progress = {
        xp,
        streak,
        lastPlayedISO: progress.lastPlayedISO ?? null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('Unable to persist passive lab progress', err);
    }
  }

  function updateScoreboard() {
    if (nodes.scoreValue) {
      nodes.scoreValue.textContent = String(xp);
    }
    if (nodes.streakValue) {
      nodes.streakValue.textContent = String(streak);
    }
    if (nodes.lastPlayedValue) {
      nodes.lastPlayedValue.textContent = formatLastPlayed(progress.lastPlayedISO);
    }
  }

  function formatLastPlayed(value) {
    if (!value) return '—';
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) return '—';
    return when.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  }

  function applyTranslations() {
    document.title = i18n.title || document.title;
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n-key]').forEach(node => {
      const key = node.dataset.i18nKey;
      const attr = node.dataset.i18nAttr;
      const value = getTranslation(key);
      if (!value) return;
      if (attr) {
        node.setAttribute(attr, value);
      } else {
        node.textContent = value;
      }
    });
  }

  async function loadTranslations(lang) {
    const candidates = [lang.slice(0, 2), 'lv', 'en'];
    for (const code of candidates) {
      try {
        const response = await fetch(assetUrl(`i18n/passive-lab.${code}.json`), { cache: 'no-store' });
        if (!response.ok) continue;
        const payload = await response.json();
        i18n = payload;
        currentLang = code;
        applyTranslations();
        populateTenseOptions();
        return;
      } catch (err) {
        console.warn('Unable to load passive lab translations for', code, err);
      }
    }
    console.error('Passive lab translations could not be loaded');
  }

  function populateTenseOptions() {
    if (!nodes.tenseSelect) return;
    nodes.tenseSelect.innerHTML = '';
    TENSES.forEach(tense => {
      const opt = document.createElement('option');
      opt.value = tense;
      opt.textContent = getTranslation(`tenseOptions.${tense}`) || tense;
      nodes.tenseSelect.appendChild(opt);
    });
  }

  function buildPatientBank() {
    const seen = new Map();
    items.forEach(item => {
      if (!item?.patient) return;
      const key = patientKey(item.patient);
      if (seen.has(key)) return;
      seen.set(key, {
        ...item.patient,
        form: item.patient.form,
        gender: item.patient.gender,
        number: item.patient.number,
        key,
      });
    });
    patientBank = Array.from(seen.values());
  }

  function patientKey(patient) {
    return `${patient.form}|${patient.gender}.${patient.number}`;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function pickRandom(array) {
    if (!array.length) return null;
    return array[Math.floor(Math.random() * array.length)];
  }

  function createPatientChoices() {
    const targetKey = patientKey(currentItem.patient);
    const targetRecord = patientBank.find(entry => entry.key === targetKey);
    const others = patientBank.filter(entry => entry.key !== targetKey);
    const candidates = [targetRecord, ...shuffle(others).slice(0, 3)].filter(Boolean);
    const normalized = shuffle(candidates);
    return normalized.map(entry => ({
      key: entry.key,
      form: entry.form,
      gender: entry.gender,
      number: entry.number,
      label: `${entry.form} (${getTranslation(`genderLabels.${entry.gender}.${entry.number}`) || `${entry.gender}.${entry.number}`})`,
      isTarget: entry.key === targetKey,
    }));
  }

  function renderPatientChoices() {
    if (!nodes.patientContainer) return;
    nodes.patientContainer.innerHTML = '';
    builderChoices.forEach(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'passive-lab-patient-option';
      button.dataset.choiceKey = choice.key;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = choice.label;
      button.addEventListener('click', () => selectPatient(choice.key));
      nodes.patientContainer.appendChild(button);
    });
    const preferred = builderChoices.find(choice => choice.isTarget)?.key;
    selectPatient(preferred || builderChoices[0]?.key);
  }

  function selectPatient(key) {
    builderSelectedKey = key;
    if (!nodes.patientContainer) return;
    nodes.patientContainer.querySelectorAll('button').forEach(button => {
      const isSelected = button.dataset.choiceKey === key;
      button.setAttribute('aria-pressed', String(Boolean(isSelected)));
      button.classList.toggle('active', isSelected);
    });
  }

  function getEndingForPatient(patient) {
    const mapKey = `${patient.gender}.${patient.number}`;
    return ENDING_MAP[mapKey] || '-ts';
  }

  function updateTargetLabel() {
    if (!nodes.targetLabel) return;
    const tenseLabel = getTranslation(`tenseOptions.${currentTense}`) || currentTense;
    const prefix = TENSE_PREFIX[currentTense] || '';
    nodes.targetLabel.textContent = `${tenseLabel} · ${prefix}`;
  }

  function showResult() {
    if (nodes.resultPanel) {
      nodes.resultPanel.classList.add('is-visible');
    }
    if (nodes.resultSentence) {
      const value = currentItem?.expected?.[currentTense] ?? '—';
      nodes.resultSentence.textContent = value;
    }
  }

  function hideResult() {
    if (nodes.resultPanel) {
      nodes.resultPanel.classList.remove('is-visible');
    }
    if (nodes.resultSentence) {
      nodes.resultSentence.textContent = '—';
    }
  }

  function setStatus(message, state) {
    if (!nodes.statusText || !nodes.feedback || !nodes.statusIcon) return;
    nodes.statusText.textContent = message || '—';
    nodes.feedback.classList.toggle('show', Boolean(state));
    nodes.feedback.classList.toggle('passive-lab-feedback--success', state === 'success');
    nodes.feedback.classList.toggle('passive-lab-feedback--error', state === 'error');
    if (state === 'success' || state === 'error') {
      const path = assetUrl(iconPaths[state]);
      nodes.statusIcon.src = path;
    }
  }

  function handleSuccess(mode) {
    solved = true;
    const attempts = mode === 'typein' ? typeAttempts : builderAttempts;
    const base = BASE_POINTS[mode] ?? BASE_POINTS.typein;
    const points = Math.max(1, base - (attempts - 1));
    xp += points;
    streak += 1;
    const streakBonusTriggered = streak > 0 && streak % STREAK_INTERVAL === 0;
    if (streakBonusTriggered) {
      xp += STREAK_BONUS;
    }
    progress.lastPlayedISO = new Date().toISOString();
    progress = { xp, streak, lastPlayedISO: progress.lastPlayedISO };
    persistProgress();
    updateScoreboard();
    showResult();
    nodes.nextButton.disabled = false;
    nodes.builderCheck.disabled = true;
    nodes.typeCheck.disabled = true;
    if (nodes.typeInput) {
      nodes.typeInput.disabled = true;
    }
    let message = getTranslation('correct') || 'Correct!';
    message += ` +${points} xp`;
    if (streakBonusTriggered) {
      message += ` ${formatString(getTranslation('status.streakBonus') || '', { count: streak })}`;
    }
    setStatus(message, 'success');
  }

  function handleFailure(detail = {}) {
    streak = 0;
    persistProgress();
    updateScoreboard();
    setStatus(getTranslation('wrong') || 'Try again!', 'error');
    if (detail.reason === 'ending' && nodes.endingHint) {
      const ending = getEndingForPatient(currentItem.patient);
      const genderLabel = getTranslation(`genderLabels.${currentItem.patient.gender}.${currentItem.patient.number}`) || `${currentItem.patient.gender}.${currentItem.patient.number}`;
      nodes.endingHint.textContent = formatString(getTranslation('status.builderEndingHint') || 'Correct ending: {ending} ({gender}).', { ending, gender: genderLabel });
    } else if (nodes.endingHint) {
      nodes.endingHint.textContent = '';
    }
    nodes.nextButton.disabled = true;
  }

  function normalizeSentence(value) {
    const trimmed = value.trim().replace(/[.!?]+$/, '');
    return trimmed.replace(/\s+/g, ' ').toLowerCase();
  }

  function classifyAlternates(item) {
    const byTense = { present: [], past: [], future: [] };
    (item.alsoAccept || []).forEach(text => {
      const lower = text.trim().toLowerCase();
      if (lower.startsWith('ir ')) {
        byTense.present.push(text);
      } else if (lower.startsWith('bija ')) {
        byTense.past.push(text);
      } else if (lower.startsWith('būs ')) {
        byTense.future.push(text);
      }
    });
    item.alsoAcceptByTense = byTense;
  }

  function isTypeMatch(answer) {
    const normalized = normalizeSentence(answer);
    const expected = normalizeSentence(currentItem.expected[currentTense] || '');
    if (expected && normalized === expected) {
      return true;
    }
    const alternates = currentItem.alsoAcceptByTense?.[currentTense] || [];
    return alternates.some(text => normalizeSentence(text) === normalized);
  }

  function startRound() {
    if (!items.length) {
      setStatus(getTranslation('status.noTasks') || 'No tasks available', 'error');
      return;
    }
    currentItem = pickRandom(items);
    if (!currentItem) return;
    currentTense = pickRandom(TENSES) || TENSES[0];
    builderAttempts = 0;
    typeAttempts = 0;
    solved = false;
    builderChoices = createPatientChoices();
    renderPatientChoices();
    if (nodes.tenseSelect) {
      nodes.tenseSelect.value = currentTense;
    }
    if (nodes.typeInput) {
      nodes.typeInput.value = '';
      nodes.typeInput.disabled = false;
    }
    if (nodes.endingSelect) {
      nodes.endingSelect.value = getEndingForPatient(currentItem.patient);
    }
    if (nodes.builderCheck) {
      nodes.builderCheck.disabled = false;
    }
    if (nodes.typeCheck) {
      nodes.typeCheck.disabled = false;
    }
    nodes.nextButton.disabled = true;
    if (nodes.activeSentence) {
      nodes.activeSentence.textContent = currentItem.active;
    }
    if (nodes.itemHint) {
      nodes.itemHint.textContent = currentItem.hint || '—';
    }
    if (nodes.endingHint) {
      nodes.endingHint.textContent = '';
    }
    hideResult();
    updateTargetLabel();
    setStatus(getTranslation('status.idle') || '', null);
  }

  function toggleMode(target) {
    modeLoop: for (const panel of nodes.modePanels) {
      const shouldShow = panel.dataset.modePanel === target;
      panel.classList.toggle('is-visible', shouldShow);
    }
    nodes.modeButtons.forEach(button => {
      const isActive = button.dataset.mode === target;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(Boolean(isActive)));
    });
  }

  function handleBuilderSubmit() {
    if (solved || !currentItem) return;
    builderAttempts += 1;
    const selectedTense = nodes.tenseSelect?.value;
    const selectedPatient = builderChoices.find(choice => choice.key === builderSelectedKey);
    const selectedEnding = nodes.endingSelect?.value;
    const endsCorrect = selectedEnding === getEndingForPatient(currentItem.patient);
    const tenseCorrect = selectedTense === currentTense;
    const patientCorrect = selectedPatient?.key === patientKey(currentItem.patient);
    if (patientCorrect && tenseCorrect && endsCorrect) {
      handleSuccess('builder');
      return;
    }
    const reason = !endsCorrect ? 'ending' : !patientCorrect ? 'patient' : !tenseCorrect ? 'tense' : undefined;
    handleFailure({ reason });
  }

  function handleTypeSubmit() {
    if (solved || !currentItem || !nodes.typeInput) return;
    const value = nodes.typeInput.value.trim();
    if (!value) {
      setStatus(getTranslation('wrong') || 'Try again!', 'error');
      return;
    }
    typeAttempts += 1;
    if (isTypeMatch(value)) {
      handleSuccess('typein');
      return;
    }
    handleFailure({ reason: 'typein' });
  }

  async function loadData() {
    try {
      const response = await fetch(assetUrl('data/passive-lab/items.json'), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load items: ${response.status}`);
      }
      const payload = await response.json();
      items = Array.isArray(payload) ? payload : [];
      items.forEach(classifyAlternates);
      buildPatientBank();
      startRound();
    } catch (err) {
      console.error(err);
      setStatus(getTranslation('status.loadError') || 'Failed to load items', 'error');
    }
  }

  function setupListeners() {
    nodes.modeButtons.forEach(button => {
      button.addEventListener('click', () => toggleMode(button.dataset.mode));
    });
    if (nodes.builderCheck) {
      nodes.builderCheck.addEventListener('click', handleBuilderSubmit);
    }
    if (nodes.typeCheck) {
      nodes.typeCheck.addEventListener('click', handleTypeSubmit);
    }
    if (nodes.typeInput) {
      nodes.typeInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          handleTypeSubmit();
        }
      });
    }
    if (nodes.nextButton) {
      nodes.nextButton.addEventListener('click', startRound);
    }
  }

  async function init() {
    progress = readProgress();
    xp = progress.xp;
    streak = progress.streak;
    updateScoreboard();
    await loadTranslations(navigator.language || 'lv');
    toggleMode('builder');
    setupListeners();
    await loadData();
  }

  if (typeof document !== 'undefined') {
    init();
  }
})();
