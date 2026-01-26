export function createHandlers({
  state,
  elements,
  shell,
  getStrings,
  getRounds,
  getProgress,
  getStrict,
  saveProgress,
  buildOptions,
  renderRound,
  renderExplanation,
  setFeedback,
  norm,
  equalsLoose,
}) {
  const { answerInput, explainEl, pool } = elements;
  const feedbackIcons = {
    correct: 'check',
    incorrect: 'close',
    info: 'info',
  };

  function bumpProgress(id, correct) {
    const progress = getProgress();
    const curr = progress[id] ?? 0;
    progress[id] = Math.max(0, curr + (correct ? 1 : -1));
    saveProgress();
  }

  function handleResult({ correct, fallback }) {
    const strings = getStrings();
    state.attempts += 1;
    if (correct) {
      state.correct += 1;
      state.streak += 1;
      const icon = fallback ? feedbackIcons.info : feedbackIcons.correct;
      setFeedback(icon, fallback ? strings.feedback.fallback : strings.feedback.correct);
    } else {
      state.streak = 0;
      setFeedback(feedbackIcons.incorrect, strings.feedback.incorrect);
    }
    shell.setScore({ attempts: state.attempts, correct: state.correct, streak: state.streak });
    bumpProgress(state.current.id, correct);
  }

  function renderCurrentRound() {
    const strings = getStrings();
    renderRound({
      round: state.current,
      elements,
      strings,
      buildOptions,
      onDrop: evaluateDrop,
    });
  }

  function nextRound() {
    const rounds = getRounds();
    const strings = getStrings();
    state.current = pickNextRound(rounds);
    state.solved = false;
    state.lastAttemptKey = null;
    shell.disableCheck(false);
    shell.setRuleActive(false);
    shell.setRuleLabel(strings.buttons.rule);
    explainEl.classList.add('visually-hidden');
    explainEl.replaceChildren();
    setFeedback('', '');
    answerInput.value = '';
    answerInput.disabled = false;
    renderCurrentRound();
  }

  function pickNextRound(rounds) {
    const progress = getProgress();
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

  function evaluateDrop(text, slotEl, endingEl) {
    const strings = getStrings();
    if (state.solved) return;
    const attemptKey = `drop:${state.current.id}:${text}`;
    if (attemptKey === state.lastAttemptKey) return;
    state.lastAttemptKey = attemptKey;

    slotEl.replaceChildren(endingEl);
    slotEl.classList.add('has-ending');
    slotEl.dataset.placeholder = '';

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
      renderExplanation({ round: state.current, strings, explainEl, shell });
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
    const strings = getStrings();
    if (state.solved) return;
    const value = norm(answerInput.value.trim());
    if (!value) return;
    const attemptKey = `type:${state.current.id}:${value}`;
    if (attemptKey === state.lastAttemptKey) return;
    state.lastAttemptKey = attemptKey;

    const target = norm(state.current.fullForm);
    let correct = value === target;
    let fallback = false;
    if (!correct && !getStrict() && equalsLoose(answerInput.value.trim(), state.current.fullForm)) {
      correct = true;
      fallback = true;
    }

    handleResult({ correct, fallback, source: 'type' });
    if (correct) {
      answerInput.value = state.current.fullForm;
      answerInput.disabled = true;
      state.solved = true;
      renderExplanation({ round: state.current, strings, explainEl, shell });
      shell.announce(strings.announce.correct);
    } else {
      shell.announce(strings.announce.incorrect);
    }
  }

  function toggleRule() {
    const strings = getStrings();
    const active = !explainEl.classList.contains('visually-hidden');
    if (active) {
      explainEl.classList.add('visually-hidden');
      explainEl.replaceChildren();
      shell.setRuleActive(false);
      shell.setRuleLabel(strings.buttons.rule);
      return;
    }
    renderExplanation({ round: state.current, strings, explainEl, shell });
  }

  return {
    checkTyped,
    evaluateDrop,
    nextRound,
    toggleRule,
  };
}
