import { mustId } from '../../lib/dom.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { shuffle } from '../../lib/utils.js';
import {
  buildErrorExplanation,
  buildHintText,
  extractTopics,
  getErrorTypeLabel,
  loadSentenceSurgeryDataset,
  toTopicLabel,
} from './data.js';
import { persistProgress, readProgress } from './progress.js';
import { findMismatchIndices, joinTokens } from './tokenize.js';

(() => {
  const MODE_SHUFFLE = 'shuffle';
  const MODE_SEQUENTIAL = 'sequential';
  const ALL_TOPICS = 'all';

  const DEFAULT_PROGRESS = {
    completedItemIds: [],
    totalAttempts: 0,
    correctCount: 0,
    streak: 0,
    updatedAt: null,
  };

  const state = {
    path: '',
    items: [],
    topics: [],
    mode: MODE_SHUFFLE,
    topic: ALL_TOPICS,
    queue: [],
    currentItem: null,
    currentTokens: [],
    editableIndices: new Set(),
    selectedSentenceIndex: null,
    draggedBankToken: '',
    touchDrag: {
      token: '',
      pointerId: null,
      startX: 0,
      startY: 0,
      active: false,
      originButton: null,
    },
    mismatchIndices: [],
    checked: false,
    hintUsed: false,
    translationVisible: false,
    lastItemId: null,
    progress: { ...DEFAULT_PROGRESS },
    completedIds: new Set(),
  };

  const nodes = {
    topicSelect: mustId('sspv-topic'),
    modeSelect: mustId('sspv-mode'),
    progressText: mustId('sspv-progressText'),
    progressFilterText: mustId('sspv-progressFilterText'),
    attemptsValue: mustId('sspv-attemptsValue'),
    correctValue: mustId('sspv-correctValue'),
    streakValue: mustId('sspv-streakValue'),
    accuracyValue: mustId('sspv-accuracyValue'),
    sentencePreview: mustId('sspv-sentencePreview'),
    sentenceTokens: mustId('sspv-sentenceTokens'),
    wordBank: mustId('sspv-wordBank'),
    bankHint: mustId('sspv-bankHint'),
    checkButton: mustId('sspv-check'),
    resetButton: mustId('sspv-reset'),
    nextButton: mustId('sspv-next'),
    hintButton: mustId('sspv-hint'),
    hintText: mustId('sspv-hintText'),
    explanationText: mustId('sspv-explanationText'),
    feedback: mustId('sspv-feedback'),
    topicBadge: mustId('sspv-topicBadge'),
    sourceBadge: mustId('sspv-sourceBadge'),
    itemBadge: mustId('sspv-itemBadge'),
    focusBadge: mustId('sspv-focusBadge'),
    translationToggle: mustId('sspv-translationToggle'),
    translationPanel: mustId('sspv-translationPanel'),
    translationText: mustId('sspv-translationText'),
    resetProgressButton: mustId('sspv-resetProgress'),
    infoModal: document.getElementById('sspvInfoModal'),
  };

  function updateFeedback(message, tone = 'info') {
    nodes.feedback.textContent = message;
    nodes.feedback.dataset.tone = tone;
  }

  function updateProgressUi() {
    const completed = state.completedIds.size;
    const total = state.items.length;
    nodes.progressText.textContent = `${completed} / ${total} pabeigti`;

    const filtered = getFilteredItems();
    const filteredCompleted = filtered.filter((item) => state.completedIds.has(item.id)).length;
    nodes.progressFilterText.textContent = `${filteredCompleted} / ${filtered.length || 0} atlasē`;

    nodes.attemptsValue.textContent = String(state.progress.totalAttempts);
    nodes.correctValue.textContent = String(state.progress.correctCount);
    nodes.streakValue.textContent = String(state.progress.streak);

    const accuracy = state.progress.totalAttempts
      ? Math.round((state.progress.correctCount / state.progress.totalAttempts) * 100)
      : 0;
    nodes.accuracyValue.textContent = `${accuracy}%`;
  }

  function setControlsDisabled(disabled) {
    nodes.checkButton.disabled = disabled;
    nodes.resetButton.disabled = disabled;
    nodes.hintButton.disabled = disabled;
    nodes.translationToggle.disabled = disabled;
  }

  function getFilteredItems() {
    if (state.topic === ALL_TOPICS) {
      return state.items;
    }
    return state.items.filter((item) => item.topic === state.topic);
  }

  function getUnsolvedItems() {
    return getFilteredItems().filter((item) => !state.completedIds.has(item.id));
  }

  function rebuildQueue() {
    const unsolved = getUnsolvedItems();
    if (!unsolved.length) {
      state.queue = [];
      return;
    }

    let queue = state.mode === MODE_SHUFFLE ? shuffle(unsolved) : [...unsolved];
    if (queue.length > 1 && state.lastItemId && queue[0].id === state.lastItemId) {
      const swapIndex = queue.findIndex((entry) => entry.id !== state.lastItemId);
      if (swapIndex > 0) {
        [queue[0], queue[swapIndex]] = [queue[swapIndex], queue[0]];
      }
    }
    state.queue = queue;
  }

  function pullNextItem() {
    if (!state.queue.length) {
      rebuildQueue();
    }

    while (state.queue.length) {
      const item = state.queue.shift();
      if (!item) continue;
      if (state.topic !== ALL_TOPICS && item.topic !== state.topic) continue;
      if (state.completedIds.has(item.id)) continue;
      return item;
    }

    return null;
  }

  function getDefaultSelectionIndex() {
    if (state.currentItem?.editableIndices?.length) {
      return state.currentItem.editableIndices[0];
    }
    return state.currentTokens.length ? 0 : null;
  }

  function getAlternativesForIndex(index) {
    if (
      !state.currentItem ||
      !Number.isInteger(index) ||
      !state.currentTokens.length ||
      !state.editableIndices.has(index)
    ) {
      return [];
    }
    const currentToken = state.currentTokens[index];
    return state.currentItem.wordBank.filter((token) => token !== currentToken);
  }

  function canEditSentenceIndex(index) {
    return state.editableIndices.has(index) && getAlternativesForIndex(index).length > 0;
  }

  function updateBankHint() {
    if (!state.currentItem) {
      nodes.bankHint.textContent = '';
      return;
    }
    if (!Number.isInteger(state.selectedSentenceIndex)) {
      nodes.bankHint.textContent =
        'Izvēlies labojamo vārdu teikumā, pēc tam izvēlies aizvietotāju no saraksta.';
      return;
    }
    const alternativesCount = getAlternativesForIndex(state.selectedSentenceIndex).length;
    if (!alternativesCount) {
      nodes.bankHint.textContent = 'Šim vārdam nav alternatīvu sarakstā. Izvēlies citu vārdu.';
      return;
    }
    nodes.bankHint.textContent = `Alternatīvas šim vārdam: ${alternativesCount}.`;
  }

  function describeExpectedAuxiliary(token = '') {
    const lower = token.toLowerCase();
    if (lower === 'tiek' || lower === 'netiek') return 'tagadne';
    if (lower === 'tika' || lower === 'netika') return 'pagātne';
    if (lower === 'tiks' || lower === 'netiks') return 'nākotne';
    return '';
  }

  function buildFocusLabel(item) {
    if (!item) return 'Labojamais fokuss: —';
    const error = item.errors?.[0];
    if (!error) return 'Labojamais fokuss: teikuma forma';
    const base = `Labojamais fokuss: ${getErrorTypeLabel(error.type)}`;
    if (error.type === 'aux_tense' && error.correct) {
      const tense = describeExpectedAuxiliary(error.correct);
      return tense
        ? `${base} · vajadzīgs ${tense} (${error.correct})`
        : `${base} · ${error.correct}`;
    }
    if (error.correct) {
      return `${base} · pareizā forma: ${error.correct}`;
    }
    return base;
  }

  function syncTranslationUi() {
    if (!state.currentItem) {
      nodes.translationPanel.hidden = false;
      nodes.translationText.textContent = 'English translation: —';
      nodes.translationToggle.hidden = true;
      return;
    }
    const translation = state.currentItem.targetEn || 'Translation unavailable.';
    nodes.translationText.textContent = `English: ${translation}`;
    nodes.translationToggle.hidden = false;
    nodes.translationPanel.hidden = !state.translationVisible;
    nodes.translationToggle.textContent = state.translationVisible
      ? 'Paslēpt tulkojumu'
      : 'Rādīt tulkojumu';
  }

  function clearSentenceDropTargets() {
    nodes.sentenceTokens
      .querySelectorAll('.is-drop-target')
      .forEach((element) => element.classList.remove('is-drop-target'));
  }

  function getEditableSentenceIndexFromPoint(clientX, clientY) {
    const target = document.elementFromPoint(clientX, clientY);
    if (!(target instanceof HTMLElement)) return null;
    const tokenButton = target.closest('.sspv-token--sentence');
    if (!(tokenButton instanceof HTMLElement)) return null;
    const index = Number.parseInt(tokenButton.dataset.sentenceIndex || '', 10);
    if (!Number.isInteger(index) || !canEditSentenceIndex(index)) return null;
    return index;
  }

  function resetTouchDragState() {
    if (state.touchDrag.originButton?.classList) {
      state.touchDrag.originButton.classList.remove('is-dragging');
    }
    clearSentenceDropTargets();
    state.touchDrag = {
      token: '',
      pointerId: null,
      startX: 0,
      startY: 0,
      active: false,
      originButton: null,
    };
  }

  function applyTokenReplacement(index, token, source = 'tap') {
    if (!state.currentItem || !Number.isInteger(index)) {
      return false;
    }
    if (!canEditSentenceIndex(index)) {
      updateFeedback('Šo vārdu nevar mainīt, jo sarakstā nav alternatīvu.', 'info');
      return false;
    }
    if (typeof token !== 'string' || !token) {
      return false;
    }

    state.currentTokens[index] = token;
    state.selectedSentenceIndex = index;
    state.checked = false;
    state.mismatchIndices = [];
    nodes.explanationText.textContent = '';
    updateFeedback(
      source === 'drag'
        ? 'Vārds aizvietots ar drag & drop. Nospied “Pārbaudīt”.'
        : 'Vārds nomainīts. Nospied “Pārbaudīt”.',
      'info',
    );
    renderSentenceTokens();
    renderWordBank();
    return true;
  }

  function renderSentenceTokens() {
    nodes.sentenceTokens.replaceChildren();

    if (!state.currentItem) {
      nodes.sentencePreview.textContent = '—';
      updateBankHint();
      return;
    }

    state.currentTokens.forEach((token, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sspv-token sspv-token--sentence';
      button.dataset.sentenceIndex = String(index);
      button.textContent = token;
      button.setAttribute('aria-pressed', String(state.selectedSentenceIndex === index));
      button.setAttribute('aria-label', `Teikuma tokens ${index + 1}: ${token}`);
      const editable = canEditSentenceIndex(index);
      button.disabled = !editable;
      button.classList.add(editable ? 'is-editable' : 'is-locked');

      if (state.selectedSentenceIndex === index) {
        button.classList.add('is-selected');
      }
      if (state.checked && state.mismatchIndices.includes(index)) {
        button.classList.add('is-mismatch');
      }

      button.addEventListener('click', () => {
        if (!editable) {
          updateFeedback('Šo vārdu nav jēgas mainīt: sarakstā nav alternatīvu.', 'info');
          return;
        }
        state.selectedSentenceIndex = index;
        renderSentenceTokens();
        renderWordBank();
      });

      button.addEventListener('dragover', (event) => {
        if (!editable || !state.draggedBankToken) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        button.classList.add('is-drop-target');
      });

      button.addEventListener('dragleave', () => {
        button.classList.remove('is-drop-target');
      });

      button.addEventListener('drop', (event) => {
        if (!editable) return;
        event.preventDefault();
        button.classList.remove('is-drop-target');
        const tokenFromTransfer =
          event.dataTransfer?.getData('text/plain') || state.draggedBankToken;
        if (!tokenFromTransfer) return;
        applyTokenReplacement(index, tokenFromTransfer, 'drag');
      });

      nodes.sentenceTokens.appendChild(button);
    });

    nodes.sentencePreview.textContent = joinTokens(state.currentTokens);
    updateBankHint();
  }

  function renderWordBank() {
    nodes.wordBank.replaceChildren();

    if (!state.currentItem) {
      updateBankHint();
      return;
    }

    const hasSelection =
      Number.isInteger(state.selectedSentenceIndex) &&
      canEditSentenceIndex(state.selectedSentenceIndex);

    state.currentItem.wordBank.forEach((token, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sspv-token sspv-token--bank';
      button.textContent = token;
      button.disabled = !hasSelection;
      button.draggable = true;
      button.setAttribute('aria-label', `Bankas tokens ${index + 1}: ${token}`);

      if (hasSelection && state.currentTokens[state.selectedSentenceIndex] === token) {
        button.classList.add('is-current');
      }

      button.addEventListener('dragstart', (event) => {
        state.draggedBankToken = token;
        button.classList.add('is-dragging');
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'copy';
          event.dataTransfer.setData('text/plain', token);
        }
      });

      button.addEventListener('dragend', () => {
        state.draggedBankToken = '';
        button.classList.remove('is-dragging');
        clearSentenceDropTargets();
      });

      button.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'touch' || button.disabled) return;
        state.touchDrag = {
          token,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          active: false,
          originButton: button,
        };
        state.draggedBankToken = token;
      });

      button.addEventListener('click', () => {
        if (!hasSelection) {
          updateFeedback('Vispirms izvēlies maināmu vārdu teikumā.', 'info');
          return;
        }
        applyTokenReplacement(state.selectedSentenceIndex, token, 'tap');
      });

      nodes.wordBank.appendChild(button);
    });

    updateBankHint();
  }

  function updateRoundMeta() {
    if (!state.currentItem) {
      nodes.topicBadge.textContent = '—';
      nodes.sourceBadge.textContent = '—';
      nodes.itemBadge.textContent = '—';
      nodes.focusBadge.textContent = 'Labojamais fokuss: —';
      return;
    }

    nodes.topicBadge.textContent = toTopicLabel(state.currentItem.topic);
    nodes.sourceBadge.textContent = state.currentItem.source || '—';
    nodes.itemBadge.textContent = state.currentItem.id;
    nodes.focusBadge.textContent = buildFocusLabel(state.currentItem);
  }

  function resetRoundUi() {
    nodes.nextButton.hidden = true;
    nodes.nextButton.disabled = false;
    nodes.nextButton.classList.remove('sspv-next-ready');
    nodes.checkButton.disabled = false;
    nodes.hintButton.disabled = false;
    state.translationVisible = true;
    syncTranslationUi();
    nodes.hintText.textContent = '';
    nodes.bankHint.textContent = '';
    nodes.explanationText.textContent = '';
  }

  function resetCurrentToBroken() {
    if (!state.currentItem) return;
    state.currentTokens = [...state.currentItem.brokenTokens];
    state.selectedSentenceIndex = getDefaultSelectionIndex();
    state.mismatchIndices = [];
    state.checked = false;
    state.hintUsed = false;
    state.translationVisible = true;
    resetRoundUi();
    updateFeedback('Teikums atjaunots uz sākotnējo kļūdaino versiju.', 'info');
    renderSentenceTokens();
    renderWordBank();
  }

  function persistStateProgress() {
    state.progress.completedItemIds = Array.from(state.completedIds);
    state.progress.updatedAt = new Date().toISOString();
    state.progress = persistProgress(
      state.progress,
      state.items.map((item) => item.id),
    );
    state.completedIds = new Set(state.progress.completedItemIds);
  }

  function loadNextRound() {
    const nextItem = pullNextItem();

    if (!nextItem) {
      state.currentItem = null;
      state.currentTokens = [];
      state.editableIndices = new Set();
      state.selectedSentenceIndex = null;
      state.draggedBankToken = '';
      resetTouchDragState();
      state.checked = false;
      state.mismatchIndices = [];
      setControlsDisabled(true);
      nodes.nextButton.hidden = true;
      nodes.nextButton.disabled = true;
      nodes.nextButton.classList.remove('sspv-next-ready');
      nodes.hintText.textContent = '';
      nodes.bankHint.textContent = '';
      nodes.explanationText.textContent = '';
      state.translationVisible = true;
      syncTranslationUi();
      updateRoundMeta();
      renderSentenceTokens();
      renderWordBank();
      updateFeedback(
        'Atlasē vairs nav neatrisinātu teikumu. Vari nomainīt tematu vai notīrīt progresu.',
        'success',
      );
      return;
    }

    state.currentItem = nextItem;
    state.editableIndices = new Set(nextItem.editableIndices || []);
    state.lastItemId = nextItem.id;
    setControlsDisabled(false);
    resetCurrentToBroken();
    updateRoundMeta();
    updateFeedback(
      'Izvēlies teikuma vārdu un aizvieto to ar vārdu no saraksta (vai izmanto drag & drop).',
      'info',
    );
  }

  function evaluateRound() {
    if (!state.currentItem) return;

    state.progress.totalAttempts += 1;

    const mismatches = findMismatchIndices(state.currentTokens, state.currentItem.targetTokens);
    state.mismatchIndices = mismatches;
    state.checked = true;

    if (mismatches.length === 0) {
      state.progress.correctCount += 1;
      state.progress.streak += 1;
      state.completedIds.add(state.currentItem.id);
      state.queue = state.queue.filter((item) => item.id !== state.currentItem.id);
      persistStateProgress();
      nodes.explanationText.textContent = '';
      updateFeedback('Pareizi! 🎉', 'success');
      nodes.checkButton.disabled = true;
      nodes.nextButton.hidden = false;
      nodes.nextButton.disabled = false;
      nodes.nextButton.classList.add('sspv-next-ready');
    } else {
      state.progress.streak = 0;
      persistStateProgress();
      const explanation = buildErrorExplanation(state.currentItem.errors[0]);
      nodes.explanationText.textContent = explanation;
      updateFeedback('Vēl nav pareizi. Apskati iezīmētos tokenus.', 'error');
      nodes.nextButton.hidden = true;
      nodes.nextButton.classList.remove('sspv-next-ready');
    }

    renderSentenceTokens();
    renderWordBank();
    updateProgressUi();
  }

  function showHint() {
    if (!state.currentItem || state.hintUsed) return;

    nodes.hintText.textContent = buildHintText(state.currentItem.errors[0]);
    state.hintUsed = true;
    nodes.hintButton.disabled = true;
  }

  function toggleTranslation() {
    state.translationVisible = !state.translationVisible;
    syncTranslationUi();
  }

  function populateTopicFilter() {
    nodes.topicSelect.replaceChildren();

    const allOption = document.createElement('option');
    allOption.value = ALL_TOPICS;
    allOption.textContent = 'Visi temati';
    nodes.topicSelect.appendChild(allOption);

    state.topics.forEach((topic) => {
      const option = document.createElement('option');
      option.value = topic;
      option.textContent = toTopicLabel(topic);
      nodes.topicSelect.appendChild(option);
    });

    nodes.topicSelect.value = state.topic;
  }

  function setupEvents() {
    nodes.modeSelect.addEventListener('change', () => {
      const nextMode = nodes.modeSelect.value;
      state.mode = nextMode === MODE_SEQUENTIAL ? MODE_SEQUENTIAL : MODE_SHUFFLE;
      state.queue = [];
      loadNextRound();
      updateProgressUi();
    });

    nodes.topicSelect.addEventListener('change', () => {
      state.topic = nodes.topicSelect.value || ALL_TOPICS;
      state.queue = [];
      loadNextRound();
      updateProgressUi();
    });

    nodes.checkButton.addEventListener('click', evaluateRound);
    nodes.resetButton.addEventListener('click', resetCurrentToBroken);

    nodes.nextButton.addEventListener('click', () => {
      loadNextRound();
      updateProgressUi();
    });

    nodes.hintButton.addEventListener('click', showHint);
    nodes.translationToggle.addEventListener('click', toggleTranslation);

    document.addEventListener(
      'pointermove',
      (event) => {
        const drag = state.touchDrag;
        if (!drag.token || event.pointerId !== drag.pointerId) return;

        const movedDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (!drag.active && movedDistance > 8) {
          drag.active = true;
          drag.originButton?.classList?.add('is-dragging');
          updateFeedback('Velc tokenu uz labojamo vārdu.', 'info');
        }
        if (!drag.active) return;

        if (event.pointerType === 'touch') {
          event.preventDefault();
        }
        clearSentenceDropTargets();
        const dropIndex = getEditableSentenceIndexFromPoint(event.clientX, event.clientY);
        if (!Number.isInteger(dropIndex)) return;
        const targetButton = nodes.sentenceTokens.querySelector(
          `.sspv-token--sentence[data-sentence-index="${dropIndex}"]`,
        );
        targetButton?.classList?.add('is-drop-target');
      },
      { passive: false },
    );

    const handlePointerEnd = (event) => {
      const drag = state.touchDrag;
      if (!drag.token || event.pointerId !== drag.pointerId) return;
      if (drag.active) {
        if (event.pointerType === 'touch') {
          event.preventDefault();
        }
        const dropIndex = getEditableSentenceIndexFromPoint(event.clientX, event.clientY);
        if (Number.isInteger(dropIndex)) {
          applyTokenReplacement(dropIndex, drag.token, 'drag');
        }
      }
      resetTouchDragState();
      state.draggedBankToken = '';
    };

    document.addEventListener('pointerup', handlePointerEnd);
    document.addEventListener('pointercancel', handlePointerEnd);

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return;
      }
      if (document.querySelector('.modal.show')) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'enter' && !nodes.checkButton.disabled) {
        evaluateRound();
        return;
      }
      if (key === 'n' && !nodes.nextButton.hidden && !nodes.nextButton.disabled) {
        loadNextRound();
        updateProgressUi();
        return;
      }
      if (key === 'r' && !nodes.resetButton.disabled) {
        resetCurrentToBroken();
        return;
      }
      if (key === 'h' && !nodes.hintButton.disabled) {
        showHint();
        return;
      }
      if (key === 'i' && nodes.infoModal && window.bootstrap?.Modal) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(nodes.infoModal);
        modal.show();
      }
    });

    nodes.resetProgressButton.addEventListener('click', () => {
      if (!window.confirm('Vai notīrīt visu Sentence Surgery progresu?')) {
        return;
      }
      state.progress = { ...DEFAULT_PROGRESS };
      state.completedIds = new Set();
      state.queue = [];
      persistStateProgress();
      updateProgressUi();
      loadNextRound();
      updateFeedback('Progress notīrīts.', 'info');
    });
  }

  async function init() {
    showLoading('Ielādē Sentence Surgery uzdevumus...');

    try {
      const dataset = await loadSentenceSurgeryDataset();
      state.path = dataset.path;
      state.items = dataset.items;
      state.topics = extractTopics(dataset.items);

      state.progress = readProgress(state.items.map((item) => item.id));
      state.completedIds = new Set(state.progress.completedItemIds);
      persistStateProgress();

      populateTopicFilter();
      setupEvents();
      updateProgressUi();
      loadNextRound();
      updateFeedback(
        'Izvēlies kļūdaino vārdu un aizvieto to ar vārdu no saraksta (vai izmanto drag & drop).',
        'info',
      );
    } catch (error) {
      const safeError = error instanceof Error ? error : new Error('Failed to initialize game');
      showFatalError(safeError);
    } finally {
      hideLoading();
    }
  }

  init();
})();
