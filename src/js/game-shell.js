function button(label, opts = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = opts.className || 'btn btn-primary';
  btn.textContent = label;
  if (opts.title) btn.title = opts.title;
  if (opts.ariaLabel) btn.setAttribute('aria-label', opts.ariaLabel);
  return btn;
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable;
}

export function mountGameShell({
  root,
  strings,
  onCheck,
  onNext,
  onToggleRule,
  onStrictChange
}) {
  const shellHost = root.querySelector('[data-game-shell]') || root;
  shellHost.innerHTML = '';

  const shell = document.createElement('section');
  shell.className = 'eb-shell';

  const score = document.createElement('div');
  score.className = 'eb-shell__score';
  const scoreHits = document.createElement('span');
  const scoreStreak = document.createElement('span');
  scoreHits.dataset.value = 'hits';
  scoreStreak.dataset.value = 'streak';
  score.append(scoreHits, scoreStreak);

  const controls = document.createElement('div');
  controls.className = 'eb-shell__controls';

  const checkBtn = button(strings.buttons.check, {
    className: 'btn btn-success'
  });
  const nextBtn = button(strings.buttons.next, {
    className: 'btn btn-outline-primary'
  });
  const ruleBtn = button(strings.buttons.rule, {
    className: 'btn btn-outline-secondary'
  });

  const strictWrap = document.createElement('label');
  strictWrap.className = 'eb-shell__toggle form-check form-switch mb-0';
  strictWrap.innerHTML = `
    <input type="checkbox" class="form-check-input" role="switch" />
    <span class="form-check-label">${strings.labels.strict}</span>
  `;
  const strictInput = strictWrap.querySelector('input');

  const reportBtn = button(strings.buttons.report, {
    className: 'btn btn-outline-danger'
  });

  controls.append(checkBtn, nextBtn, ruleBtn, strictWrap, reportBtn);
  shell.append(score, controls);
  shellHost.append(shell);

  const live = document.createElement('div');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  root.append(live);

  const updateScore = ({ attempts = 0, correct = 0, streak = 0 }) => {
    scoreHits.innerHTML = `${strings.labels.score}: <strong>${correct}/${attempts}</strong>`;
    scoreStreak.innerHTML = `${strings.labels.streak}: <strong>${streak}</strong>`;
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

  document.addEventListener('keydown', e => {
    if (isTypingTarget(e.target)) return;
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
    announce(msg) {
      live.textContent = msg;
    },
    setRuleActive(active) {
      ruleBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    },
    setRuleLabel(label) {
      ruleBtn.textContent = label;
    },
    disableCheck(disabled) {
      checkBtn.disabled = disabled;
    },
    disableNext(disabled) {
      nextBtn.disabled = disabled;
    },
    getStrict: () => strictInput.checked
  };
}
