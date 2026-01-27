import { assetUrl } from '../../lib/paths.js';

function formatScore(strings, value) {
  return `${strings.scoreLabel ?? 'Score'}: ${value}`;
}

function formatStreak(strings, value) {
  return `${strings.streakLabel ?? 'Streak'}: ${value}`;
}

export function setFeedback(elements, message = '') {
  if (elements.feedback) elements.feedback.textContent = message;
  if (elements.live) elements.live.textContent = message;
}

export function setHint(elements, message = '') {
  if (elements.hint) elements.hint.textContent = message;
}

export function updateMetrics(elements, strings, score, streak) {
  if (elements.score) elements.score.textContent = formatScore(strings, score);
  if (elements.streak) elements.streak.textContent = formatStreak(strings, streak);
}

export function updateProgress(elements, strings, index, total) {
  if (!elements.progress) return;
  const current = index >= 0 ? Math.min(index + 1, total) : 0;
  elements.progress.textContent = `${current}/${total}`;
  const label = strings.progressLabel ?? 'Task';
  elements.progress.setAttribute('aria-label', `${label} ${current} / ${total}`);
}

export function clearRoleHighlights(rolesGrid) {
  const buttons = rolesGrid ? [...rolesGrid.querySelectorAll('.dd-role')] : [];
  buttons.forEach((btn) => {
    btn.classList.remove('dd-role--correct', 'dd-role--wrong', 'dd-role--hover');
    btn.disabled = false;
    const dutyEl = btn.querySelector('.dd-role__duty');
    if (dutyEl) dutyEl.textContent = '';
  });
}

export function disableRoles(rolesGrid) {
  const buttons = rolesGrid ? [...rolesGrid.querySelectorAll('.dd-role')] : [];
  buttons.forEach((btn) => {
    btn.disabled = true;
    btn.classList.remove('dd-role--hover');
  });
}

export function markRole(rolesGrid, roleId, status, dutyText) {
  if (!rolesGrid) return null;
  const node = rolesGrid.querySelector(`.dd-role[data-role-id="${roleId}"]`);
  if (!node) return null;
  node.classList.remove('dd-role--correct', 'dd-role--wrong', 'dd-role--hover');
  if (status === 'correct') {
    node.classList.add('dd-role--correct');
    const dutyEl = node.querySelector('.dd-role__duty');
    if (dutyEl) dutyEl.textContent = dutyText ?? '';
  } else if (status === 'wrong') {
    node.classList.add('dd-role--wrong');
  }
  return node;
}

export function applyStrings(elements, strings) {
  const merged = {
    ...strings,
    scoreLabel: strings?.score ?? 'Score',
    streakLabel: strings?.streak ?? 'Streak',
    hintLabel: strings?.hint ?? 'Hint',
    correct: strings?.correct ?? 'Correct!',
    wrong: strings?.wrong ?? 'Try again!',
    complete: strings?.level_complete ?? 'Level complete!',
    levelGoal: strings?.level_goal ?? 'Sasniedz 80 punktus!',
    progressLabel: strings?.progress_label ?? 'Uzdevums',
  };
  if (elements.title && strings?.title) elements.title.textContent = strings.title;
  if (elements.instructions && strings?.instructions)
    elements.instructions.textContent = strings.instructions;
  if (elements.start && strings?.start) elements.start.textContent = strings.start;
  if (elements.next && strings?.next) elements.next.textContent = strings.next;
  return merged;
}

export function renderRoles(roles, elements, handlers) {
  if (!elements.rolesGrid) return;
  elements.rolesGrid.replaceChildren();
  roles.forEach((role) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dd-role';
    button.dataset.roleId = role.id;
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-label', `${role.dative} — ${role.label}`);

    const avatarWrapper = document.createElement('span');
    avatarWrapper.className = 'dd-role__avatar';
    const img = document.createElement('img');
    img.src = assetUrl(`assets/img/duty-dispatcher/${role.avatar}.svg`);
    img.alt = role.label;
    avatarWrapper.appendChild(img);

    const dative = document.createElement('span');
    dative.className = 'dd-role__dative';
    dative.textContent = role.dative;

    const duty = document.createElement('span');
    duty.className = 'dd-role__duty';
    duty.textContent = '';

    button.append(avatarWrapper, dative, duty);

    button.addEventListener('click', handlers.handleRoleActivation);
    button.addEventListener('keydown', handlers.handleRoleKeydown);
    button.addEventListener('dragover', handlers.handleDragOver);
    button.addEventListener('dragenter', handlers.handleDragEnter);
    button.addEventListener('dragleave', handlers.handleDragLeave);
    button.addEventListener('drop', handlers.handleDrop);

    elements.rolesGrid.appendChild(button);
  });
}
