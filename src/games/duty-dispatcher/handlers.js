import { shuffle } from '../../lib/utils.js';

export function createHandlers({
  state,
  elements,
  setFeedback,
  setHint,
  updateMetrics,
  updateProgress,
  clearRoleHighlights,
  disableRoles,
  markRole,
  persistProgress,
  dispatchAnalytics,
}) {
  function currentTask() {
    if (state.index < 0 || state.index >= state.order.length) return null;
    return state.order[state.index];
  }

  function awardScore() {
    const earned = Math.max(1, state.potential);
    state.score += earned;
    state.streak += 1;
    let bonus = 0;
    if (state.streak > 0 && state.streak % 5 === 0) {
      state.score += 10;
      bonus = 10;
    }
    persistProgress(state.score, state.streak);
    updateMetrics();
    return { earned, bonus };
  }

  function capitalizeDative(word = '') {
    if (!word) return '';
    const [first, ...rest] = word.trim();
    if (first === undefined) return '';
    const upper = typeof first.toLocaleUpperCase === 'function' ? first.toLocaleUpperCase('lv-LV') : first.toUpperCase();
    return upper + rest.join('');
  }

  function ensureTrailingPeriod(text = '') {
    const trimmed = text.trim();
    if (!trimmed) return '';
    return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  }

  function buildExplain(task) {
    if (task?.explain) return task.explain;
    const recipients = Array.isArray(task?.validRecipients) ? task.validRecipients : [];
    const firstRole = state.roles.find(role => recipients.includes(role.id));
    const name = firstRole?.dative ? capitalizeDative(firstRole.dative) : firstRole?.label;
    const rawCard = (task?.card ?? '').trim();
    const lower = rawCard.toLowerCase();
    const hasAux = lower.startsWith('ir ') || lower.startsWith('bija ') || lower.startsWith('būs ');
    let phrase = rawCard;
    if (!hasAux) {
      const prefix = task?.tense === 'past' ? 'bija' : task?.tense === 'future' ? 'būs' : 'ir';
      phrase = `${prefix} ${rawCard}`.trim();
    }
    if (name) {
      return `${name} ${phrase}`.trim();
    }
    return phrase;
  }

  function handleCorrect(roleId) {
    const task = currentTask();
    if (!task) return;
    markRole(roleId, 'correct', task.card);
    disableRoles();
    state.readyForNext = true;
    const { earned, bonus } = awardScore();
    const correctMsg = state.strings.correct ?? 'Correct!';
    const bonusMsg = bonus ? ` (+${bonus})` : '';
    const base = `${correctMsg} +${earned}${bonusMsg}`.trim();
    const explain = ensureTrailingPeriod(buildExplain(task));
    const message = explain ? `${base}. ${explain}` : `${base}.`;
    setFeedback(message);
    setHint('');
    if (elements.next) {
      elements.next.disabled = false;
      elements.next.focus({ preventScroll: true });
    }
    if (elements.dutyCard) {
      elements.dutyCard.setAttribute('aria-disabled', 'true');
      elements.dutyCard.draggable = false;
    }
    dispatchAnalytics('correct', { taskId: task.id });
  }

  function handleWrong(roleId) {
    const task = currentTask();
    if (!task) return;
    state.streak = 0;
    state.attempts += 1;
    state.potential = Math.max(1, state.potential - 3);
    persistProgress(state.score, state.streak);
    updateMetrics();

    const btn = markRole(roleId, 'wrong');
    if (btn) {
      btn.classList.remove('dd-role--hover');
      window.setTimeout(() => {
        btn.classList.remove('dd-role--wrong');
        if (!btn.disabled) {
          btn.focus({ preventScroll: false });
        }
      }, 600);
    }
    const wrongMsg = state.strings.wrong ?? 'Try again!';
    setFeedback(wrongMsg);
    const hintLabel = state.strings.hintLabel ?? 'Hint';
    setHint(task.hint ? `${hintLabel}: ${task.hint}` : '');
    dispatchAnalytics('wrong', { taskId: task.id });
  }

  function assignDuty(roleId) {
    if (!state.started || state.readyForNext) return;
    const task = currentTask();
    if (!task) return;
    if (!Array.isArray(task.validRecipients)) return;
    if (task.validRecipients.includes(roleId)) {
      handleCorrect(roleId);
    } else {
      handleWrong(roleId);
    }
  }

  function prepareTask() {
    const task = currentTask();
    if (!task) return;
    state.potential = 10;
    state.attempts = 0;
    state.readyForNext = false;

    if (elements.scenario) elements.scenario.textContent = task.s ?? '—';
    if (elements.dutyCard) {
      elements.dutyCard.textContent = task.card ?? '—';
      elements.dutyCard.removeAttribute('aria-disabled');
      elements.dutyCard.draggable = true;
      elements.dutyCard.setAttribute('aria-label', task.card ?? '');
    }
    setFeedback('');
    setHint('');
    clearRoleHighlights();
    if (elements.next) elements.next.disabled = true;
    updateProgress();
    window.requestAnimationFrame(() => {
      elements.dutyCard?.focus({ preventScroll: true });
    });
  }

  function handleComplete() {
    state.started = false;
    state.readyForNext = false;
    disableRoles();
    if (elements.dutyCard) {
      elements.dutyCard.setAttribute('aria-disabled', 'true');
      elements.dutyCard.draggable = false;
    }
    const message = state.strings.complete ?? 'Level complete!';
    const goal = state.score >= 80 ? state.strings.levelGoal ?? '' : '';
    const combined = goal ? `${message} ${goal}`.trim() : message;
    setFeedback(ensureTrailingPeriod(combined));
    setHint('');
    if (elements.next) {
      elements.next.disabled = true;
    }
    if (elements.start) {
      elements.start.disabled = false;
      elements.start.focus({ preventScroll: true });
    }
    dispatchAnalytics('complete', {});
  }

  function advance() {
    state.index += 1;
    if (state.index >= state.order.length) {
      handleComplete();
      return;
    }
    prepareTask();
  }

  function startSession() {
    if (!state.tasks.length) return;
    state.order = shuffle(state.tasks);
    state.index = -1;
    state.started = true;
    state.readyForNext = false;
    if (elements.next) elements.next.disabled = true;
    if (elements.start) elements.start.disabled = true;
    dispatchAnalytics('start', {});
    advance();
  }

  function handleRoleActivation(event) {
    event.preventDefault();
    const roleId = event.currentTarget?.dataset?.roleId;
    if (!roleId) return;
    assignDuty(roleId);
  }

  function handleRoleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRoleActivation(event);
    }
  }

  function handleDragStart(event) {
    if (!state.started || state.readyForNext) {
      event.preventDefault();
      return;
    }
    event.dataTransfer?.setData('text/plain', 'duty-card');
    event.dataTransfer?.setDragImage?.(event.currentTarget, 20, 20);
  }

  function handleDragOver(event) {
    if (!state.started || state.readyForNext) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(event) {
    if (!state.started || state.readyForNext) return;
    event.preventDefault();
    event.currentTarget?.classList.add('dd-role--hover');
  }

  function handleDragLeave(event) {
    event.currentTarget?.classList.remove('dd-role--hover');
  }

  function handleDrop(event) {
    if (!state.started || state.readyForNext) return;
    event.preventDefault();
    const roleId = event.currentTarget?.dataset?.roleId;
    event.currentTarget?.classList.remove('dd-role--hover');
    if (!roleId) return;
    assignDuty(roleId);
  }

  return {
    startSession,
    advance,
    handleRoleActivation,
    handleRoleKeydown,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
