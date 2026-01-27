import { formatNumber } from '../../lib/i18n-format.js';
import { formatLastPlayed } from './progress.js';
import { updateIcon } from '../../lib/icon.js';

export function updateScoreboard(nodes, progress) {
  if (nodes.scoreValue) {
    nodes.scoreValue.textContent = formatNumber(progress.xp ?? 0);
  }
  if (nodes.streakValue) {
    nodes.streakValue.textContent = formatNumber(progress.streak ?? 0);
  }
  if (nodes.lastPlayedValue) {
    nodes.lastPlayedValue.textContent = formatLastPlayed(progress.lastPlayedISO);
  }
}

export function renderPatientChoices(nodes, choices, onSelect) {
  if (!nodes.patientContainer) return;
  nodes.patientContainer.replaceChildren();
  choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'passive-lab-patient-option';
    button.dataset.choiceKey = choice.key;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = choice.label;
    button.addEventListener('click', () => onSelect(choice.key));
    nodes.patientContainer.appendChild(button);
  });
}

export function updatePatientSelection(nodes, selectedKey) {
  if (!nodes.patientContainer) return;
  nodes.patientContainer.querySelectorAll('button').forEach((button) => {
    const isSelected = button.dataset.choiceKey === selectedKey;
    button.setAttribute('aria-pressed', String(Boolean(isSelected)));
    button.classList.toggle('active', isSelected);
  });
}

export function updateTargetLabel(nodes, tense, tensePrefix, getTranslation) {
  if (!nodes.targetLabel) return;
  const tenseLabel = getTranslation(`tenseOptions.${tense}`) || tense;
  const prefix = tensePrefix[tense] || '';
  nodes.targetLabel.textContent = `${tenseLabel} · ${prefix}`;
}

export function showResult(nodes, sentence) {
  if (nodes.resultPanel) {
    nodes.resultPanel.classList.add('is-visible');
  }
  if (nodes.resultSentence) {
    nodes.resultSentence.textContent = sentence || '—';
  }
}

export function hideResult(nodes) {
  if (nodes.resultPanel) {
    nodes.resultPanel.classList.remove('is-visible');
  }
  if (nodes.resultSentence) {
    nodes.resultSentence.textContent = '—';
  }
}

export function setStatus(nodes, iconNames, message, state) {
  if (!nodes.statusText || !nodes.feedback || !nodes.statusIcon) return;
  nodes.statusText.textContent = message || '—';
  nodes.feedback.classList.toggle('show', Boolean(state));
  nodes.feedback.classList.toggle('passive-lab-feedback--success', state === 'success');
  nodes.feedback.classList.toggle('passive-lab-feedback--error', state === 'error');
  if (state && iconNames[state]) {
    updateIcon(nodes.statusIcon, { name: iconNames[state], size: 20, alt: '' });
  } else {
    updateIcon(nodes.statusIcon, { name: 'info', size: 20, alt: '' });
  }
}
