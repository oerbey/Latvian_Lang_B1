/**
 * @file endings-builder/game-shell.js
 * Reusable game shell UI for Endings Builder.
 *
 * Dynamically builds the game frame: prompt area, answer input,
 * stat cards (round / correct / streak), navigation buttons
 * (Check, Next, Toggle Rule), and a strict-mode checkbox.
 * All callbacks are injected so the shell remains logic-agnostic.
 */

function button(label, opts = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = opts.className || 'eb-primary';
  btn.textContent = label;
  if (opts.title) btn.title = opts.title;
  if (opts.ariaLabel) btn.setAttribute('aria-label', opts.ariaLabel);
  return btn;
}

function statCard(label, key) {
  const wrap = document.createElement('span');
  wrap.className = 'eb-shell__stat';
  wrap.dataset.value = key;

  const labelEl = document.createElement('span');
  labelEl.className = 'eb-shell__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('strong');
  valueEl.className = 'eb-shell__value';
  valueEl.textContent = '0';

  wrap.append(labelEl, valueEl);
  return { wrap, valueEl };
}

function isTypingTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

export function mountGameShell({ root, strings, onCheck, onNext, onToggleRule, onStrictChange }) {
  const shellHost = root.querySelector('[data-game-shell]') || root;
  shellHost.replaceChildren();

  const shell = document.createElement('section');
  shell.className = 'eb-shell';

  const hud = document.createElement('header');
  hud.className = 'eb-hud';

  const quitBtn = button('‹', {
    className: 'eb-icon-button',
    ariaLabel: 'Atgriezties uz sākumu',
  });

  const roundBlock = document.createElement('div');
  roundBlock.className = 'eb-hud__main';
  const roundLine = document.createElement('div');
  roundLine.className = 'eb-hud__line';
  const stageChip = document.createElement('span');
  stageChip.className = 'eb-stage-chip';
  stageChip.textContent = strings.sections?.endingZone || 'Endings';
  const roundValue = document.createElement('strong');
  roundValue.className = 'eb-round-value';
  roundValue.textContent = strings.round?.eyebrow?.replace('{round}', '1') || 'Round 1';
  roundLine.append(stageChip, roundValue);
  const progressTrack = document.createElement('div');
  progressTrack.className = 'eb-progress';
  progressTrack.setAttribute('aria-hidden', 'true');
  progressTrack.append(document.createElement('span'));
  roundBlock.append(roundLine, progressTrack);

  const score = document.createElement('div');
  score.className = 'eb-shell__score';
  const hitsStat = statCard(strings.labels.score, 'hits');
  const streakStat = statCard(strings.labels.streak, 'streak');
  const accuracyStat = statCard(strings.labels.accuracy || 'Accuracy', 'accuracy');
  score.append(hitsStat.wrap, streakStat.wrap, accuracyStat.wrap);
  hud.append(quitBtn, roundBlock, score);

  const controls = document.createElement('div');
  controls.className = 'eb-shell__controls';

  const checkBtn = button(strings.buttons.check, {
    className: 'eb-primary eb-check-button',
  });
  const nextBtn = button(strings.buttons.next, {
    className: 'eb-secondary',
  });
  const ruleBtn = button(strings.buttons.rule, {
    className: 'eb-ghost',
  });

  const strictWrap = document.createElement('label');
  strictWrap.className = 'eb-shell__toggle form-check form-switch mb-0';
  const strictInput = document.createElement('input');
  strictInput.type = 'checkbox';
  strictInput.className = 'form-check-input';
  strictInput.role = 'switch';
  const strictLabel = document.createElement('span');
  strictLabel.className = 'form-check-label';
  strictLabel.textContent = strings.labels.strict;
  strictWrap.append(strictInput, strictLabel);

  const reportBtn = button(strings.buttons.report, {
    className: 'eb-text-button',
  });

  controls.append(checkBtn, nextBtn, ruleBtn, strictWrap, reportBtn);
  shell.append(hud, controls);
  shellHost.append(shell);

  const live = document.createElement('div');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  root.append(live);

  const updateScore = ({ attempts = 0, correct = 0, streak = 0 }) => {
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    hitsStat.valueEl.textContent = `${correct}/${attempts}`;
    streakStat.valueEl.textContent = `${streak}`;
    accuracyStat.valueEl.textContent = `${accuracy}%`;
  };

  checkBtn.addEventListener('click', () => onCheck?.());
  nextBtn.addEventListener('click', () => onNext?.());
  ruleBtn.addEventListener('click', () => onToggleRule?.());
  strictInput.addEventListener('change', () => {
    onStrictChange?.(strictInput.checked);
  });

  reportBtn.addEventListener('click', () => {
    const url = new URL('https://github.com/oerbey/Latvian_Lang_B1/issues/new');
    url.searchParams.set('title', 'Endings Builder feedback');
    url.searchParams.set('body', strings.reportTemplate);
    window.open(url.toString(), '_blank', 'noopener');
  });

  document.addEventListener('keydown', (e) => {
    if (root.dataset.screen !== 'play' || isTypingTarget(e.target)) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onCheck?.();
    }
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      onNext?.();
    }
  });

  return {
    setScore: updateScore,
    setStrict(value) {
      strictInput.checked = value;
    },
    setRound(roundNumber) {
      roundValue.textContent =
        strings.round?.eyebrow?.replace('{round}', `${roundNumber}`) || `Round ${roundNumber}`;
      const progress = progressTrack.firstElementChild;
      if (progress) progress.style.width = `${((Math.max(1, roundNumber) - 1) % 10) * 10 + 10}%`;
    },
    onQuit(callback) {
      quitBtn.addEventListener('click', callback);
    },
    announce(msg) {
      live.textContent = msg;
    },
    setRuleActive(active) {
      ruleBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    },
    setRuleLabel(label) {
      ruleBtn.textContent = label;
    },
    setNextLabel(label) {
      nextBtn.textContent = label;
    },
    disableCheck(disabled) {
      checkBtn.disabled = disabled;
    },
    disableNext(disabled) {
      nextBtn.disabled = disabled;
    },
    getStrict: () => strictInput.checked,
  };
}
