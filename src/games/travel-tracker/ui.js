import { seededShuffle } from './utils.js';
import { sanitizeText } from '../../lib/sanitize.js';
import { formatNumber, formatPlural } from '../../lib/i18n-format.js';
import { getCurrentLevel, getCurrentRoute, getProgressPosition } from './state.js';

export function normalizeAnswer(str) {
  return sanitizeText(str).toLocaleLowerCase('lv-LV');
}

export function attachButtonBehavior(node, handler) {
  if (!node || typeof handler !== 'function') return;
  const invoke = event => {
    if (node.disabled) return;
    handler(event);
  };
  node.addEventListener('click', invoke);

  const isButtonConstructor = typeof HTMLButtonElement !== 'undefined';
  const isAnchorConstructor = typeof HTMLAnchorElement !== 'undefined';
  const isNativeButton =
    (isButtonConstructor && node instanceof HTMLButtonElement) ||
    (isAnchorConstructor && node instanceof HTMLAnchorElement && node.hasAttribute('href'));

  if (!isNativeButton) {
    node.addEventListener('keydown', event => {
      if (node.disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        invoke(event);
      }
    });
  }
}

export function createUI({
  selectors,
  state,
  getStrings,
  getViewBox,
  getOverlaySvg,
  getCityCoords,
  getAnimationId,
  setAnimationId,
  busAnimationMs,
}) {
  function updateProgressIndicator() {
    if (!selectors.progress) return;
    const strings = getStrings();
    const { current, total } = getProgressPosition(state);
    if (!total) {
      selectors.progress.textContent = strings.progressIdle ?? '';
      selectors.progress.setAttribute('aria-label', strings.progressIdle ?? '');
      return;
    }
    const locale = document.documentElement?.lang || 'lv';
    const rawLabel = strings.progressLabel;
    const label = typeof rawLabel === 'object'
      ? formatPlural(locale, current, rawLabel, 'Question')
      : (rawLabel ?? 'Question');
    selectors.progress.replaceChildren();
    const labelNode = document.createElement('span');
    labelNode.textContent = `${label} `;
    const strong = document.createElement('strong');
    strong.textContent = `${formatNumber(current, locale)}/${formatNumber(total, locale)}`;
    selectors.progress.append(labelNode, strong);
    const ofSegment = strings.progressOf
      ? `${strings.progressOf} ${formatNumber(total, locale)}`
      : `${formatNumber(total, locale)}`;
    selectors.progress.setAttribute(
      'aria-label',
      `${label} ${formatNumber(current, locale)} ${ofSegment}`.trim(),
    );
  }

  function hasInputValue() {
    if (!selectors.input) return false;
    return normalizeAnswer(selectors.input.value) !== '';
  }

  function applyStrings() {
    const strings = getStrings();
    const title = document.querySelector('[data-i18n-key="title"]');
    if (title && strings.title) title.textContent = strings.title;

    document.querySelectorAll('[data-i18n-key="instructions"]').forEach(node => {
      if (strings.instructions) node.textContent = strings.instructions;
    });

    const prompt = document.querySelector('[data-i18n-key="prompt"]');
    if (prompt && strings.prompt) prompt.textContent = strings.prompt;

    const hintLabel = document.querySelector('[data-i18n-key="hint"]');
    if (hintLabel && strings.hint) hintLabel.textContent = strings.hint;

    const scoreLabel = selectors.score?.querySelector('[data-i18n-key="score"]');
    if (scoreLabel && strings.score) scoreLabel.textContent = strings.score;

    const streakLabel = selectors.streak?.querySelector('[data-i18n-key="streak"]');
    if (streakLabel && strings.streak) streakLabel.textContent = strings.streak;

    selectors.check.textContent = strings.check ?? selectors.check.textContent;
    selectors.next.textContent = strings.next ?? selectors.next.textContent;
    selectors.start.textContent = state.started ? strings.restart : (strings.start ?? selectors.start.textContent);
    if (selectors.restart) {
      selectors.restart.textContent = strings.restartShort ?? strings.restart ?? selectors.restart.textContent;
    }
    updateProgressIndicator();
  }

  function moveBusTo(point) {
    if (!point) return;
    const viewBox = getViewBox();
    const { x, y } = point;
    selectors.bus.style.left = `${(x / viewBox.width) * 100}%`;
    selectors.bus.style.top = `${(y / viewBox.height) * 100}%`;
    selectors.bus.classList.remove('travel-map__bus--hidden');
  }

  function cancelAnimation() {
    const active = getAnimationId();
    if (active) {
      cancelAnimationFrame(active);
      setAnimationId(null);
    }
  }

  function animateBus(from, to, onComplete) {
    cancelAnimation();
    const start = performance.now();
    const step = now => {
      const elapsed = Math.min(1, (now - start) / busAnimationMs);
      const eased = elapsed < 0.5 ? 2 * elapsed * elapsed : -1 + (4 - 2 * elapsed) * elapsed;
      const x = from.x + (to.x - from.x) * eased;
      const y = from.y + (to.y - from.y) * eased;
      moveBusTo({ x, y });
      if (elapsed < 1) {
        setAnimationId(requestAnimationFrame(step));
      } else {
        setAnimationId(null);
        if (onComplete) onComplete();
      }
    };
    setAnimationId(requestAnimationFrame(step));
  }

  function drawRouteLine(from, to, { completed } = { completed: false }) {
    const overlaySvg = getOverlaySvg();
    if (!overlaySvg) return;
    overlaySvg.replaceChildren();
    if (!from || !to) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);
    line.setAttribute('stroke', completed ? '#0f766e' : '#2563eb');
    line.setAttribute('stroke-width', completed ? '6' : '4');
    line.setAttribute('stroke-linecap', 'round');
    if (!completed) {
      line.setAttribute('stroke-dasharray', '10 10');
    }
    overlaySvg.appendChild(line);
  }

  function updateScoreboard() {
    const strings = getStrings();
    const locale = document.documentElement?.lang || 'lv';
    const scoreValue = selectors.score.querySelector('strong');
    const streakValue = selectors.streak.querySelector('strong');
    if (scoreValue) scoreValue.textContent = formatNumber(state.score, locale);
    if (streakValue) streakValue.textContent = formatNumber(state.streak, locale);
    const levelBadge = selectors.level;
    const level = getCurrentLevel(state);
    if (levelBadge) {
      if (level) {
        levelBadge.replaceChildren();
        const levelLabel = document.createElement('span');
        levelLabel.textContent = `${strings.level} `;
        const levelStrong = document.createElement('strong');
        levelStrong.textContent = `${state.levelIndex + 1}/${state.levels.length}`;
        levelBadge.append(levelLabel, levelStrong);
      } else {
        levelBadge.textContent = `${strings.level ?? 'Level'} —`;
      }
    }
    updateProgressIndicator();
  }

  function updateRouteMeta() {
    const strings = getStrings();
    const level = getCurrentLevel(state);
    const route = getCurrentRoute(state);
    if (!level || !route) {
      selectors.routeMeta.textContent = strings.noRoute ?? '—';
      return;
    }
    selectors.routeMeta.textContent = `${level.title} • ${route.from} → ${route.to}`;
  }

  function updateLive(message) {
    if (!message) {
      selectors.liveRegion.textContent = '';
      selectors.feedback.removeAttribute('aria-label');
      return;
    }
    selectors.liveRegion.textContent = message;
    selectors.feedback.setAttribute('aria-label', message);
  }

  function clearFeedback() {
    selectors.feedback.textContent = '';
    selectors.feedback.classList.remove('is-correct', 'is-wrong');
    updateLive('');
  }

  function setHint(text) {
    const strings = getStrings();
    selectors.hint.textContent = text ?? strings.noHint ?? '—';
  }

  function syncChoiceSelection(value = '') {
    if (!selectors.choices) return;
    const normalized = normalizeAnswer(value);
    selectors.choices.querySelectorAll('.tt-choice').forEach(btn => {
      const btnValue = normalizeAnswer(btn.dataset.value ?? '');
      const isActive = normalized !== '' && btnValue === normalized;
      btn.classList.toggle('is-selected', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function updateChoices(route) {
    selectors.choices.replaceChildren();
    if (!route) return;
    const options = new Set([...(route.answers ?? []), ...(route.distractors ?? [])]);
    if (options.size === 0) return;
    const optionList = seededShuffle([...options]);
    optionList.forEach((option, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn tt-choice';
      btn.dataset.value = option;
      btn.setAttribute('data-choice-index', idx.toString());
      btn.textContent = option;
      btn.setAttribute('aria-pressed', 'false');
      attachButtonBehavior(btn, () => {
        selectors.input.value = option;
        selectors.input.focus();
        selectors.input.dispatchEvent(new Event('input', { bubbles: true }));
        syncChoiceSelection(option);
      });
      selectors.choices.appendChild(btn);
    });
  }

  function updateControls() {
    const strings = getStrings();
    const hasValue = hasInputValue();
    if (selectors.input) {
      selectors.input.disabled = !state.started || state.inputLocked;
    }
    if (selectors.check) {
      selectors.check.disabled = !state.started || state.inputLocked || !hasValue;
    }
    if (selectors.next) {
      selectors.next.disabled = !state.started || !state.routeCompleted;
    }
    if (selectors.start) {
      selectors.start.textContent = state.started ? strings.restart : strings.start;
    }
    if (selectors.restart) {
      selectors.restart.disabled = state.totalRoutes === 0;
    }
  }

  return {
    applyStrings,
    animateBus,
    cancelAnimation,
    clearFeedback,
    drawRouteLine,
    hasInputValue,
    moveBusTo,
    setHint,
    syncChoiceSelection,
    updateChoices,
    updateControls,
    updateLive,
    updateProgressIndicator,
    updateRouteMeta,
    updateScoreboard,
  };
}
