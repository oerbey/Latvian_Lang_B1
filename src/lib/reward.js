let rewardEl = null;
let hideTimer = null;
let isShowing = false;
const queue = [];
const DEFAULT_ICONS = {
  success: '✓',
  accent: '★',
  error: '!',
  info: '•',
};

function ensureRewardEl() {
  if (rewardEl) return rewardEl;
  const el = document.createElement('div');
  el.id = 'llb1-reward';
  el.className = 'llb1-reward';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;

  const icon = document.createElement('div');
  icon.className = 'llb1-reward__icon';

  const title = document.createElement('div');
  title.className = 'llb1-reward__title';

  const detail = document.createElement('div');
  detail.className = 'llb1-reward__detail';

  const content = document.createElement('div');
  content.className = 'llb1-reward__content';
  content.append(title, detail);

  const points = document.createElement('div');
  points.className = 'llb1-reward__points';

  el.append(icon, content, points);
  document.body.appendChild(el);
  rewardEl = el;
  return el;
}

function formatPoints(points, label) {
  if (typeof points !== 'number' || !Number.isFinite(points)) return '';
  const base = points > 0 ? `+${points}` : `${points}`;
  return label ? `${base} ${label}` : base;
}

function displayReward(reward) {
  const { title, detail = '', tone = 'accent', timeout = 1800, icon, points, pointsLabel } = reward;
  if (!title) return;
  const el = ensureRewardEl();
  const iconEl = el.querySelector('.llb1-reward__icon');
  const titleEl = el.querySelector('.llb1-reward__title');
  const detailEl = el.querySelector('.llb1-reward__detail');
  const pointsEl = el.querySelector('.llb1-reward__points');
  if (iconEl) {
    const fallback = DEFAULT_ICONS[tone] || DEFAULT_ICONS.accent;
    iconEl.textContent = icon || fallback;
  }
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  if (pointsEl) {
    const formatted = formatPoints(points, pointsLabel);
    pointsEl.textContent = formatted;
    pointsEl.hidden = !formatted;
  }
  el.className = `llb1-reward llb1-reward--${tone}`;
  el.classList.toggle('has-detail', Boolean(detail));
  el.classList.toggle('has-points', Boolean(points));
  el.hidden = false;
  requestAnimationFrame(() => {
    el.classList.add('show');
  });

  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  hideTimer = window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => {
      el.hidden = true;
      isShowing = false;
      if (queue.length) {
        isShowing = true;
        displayReward(queue.shift());
      }
    }, 260);
  }, timeout);
}

export function showReward(reward = {}) {
  if (!reward?.title) return;
  if (isShowing) {
    queue.push(reward);
    return;
  }
  isShowing = true;
  displayReward(reward);
}
