import { formatDateTime, formatNumber } from '../../lib/i18n-format.js';

const SCENE_META = {
  virtuve: { label: 'Virtuve', emoji: '🍲', color: '#fb923c' },
  pirts: { label: 'Pirts', emoji: '🪵', color: '#fb7185' },
  klēts: { label: 'Klēts', emoji: '🌾', color: '#22c55e' },
  kūts: { label: 'Kūts', emoji: '🐄', color: '#ca8a04' },
  telts: { label: 'Telts', emoji: '⛺', color: '#38bdf8' },
  viesistaba: { label: 'Viesistaba', emoji: '🛋️', color: '#a855f7' },
  koridors: { label: 'Koridors', emoji: '🚪', color: '#64748b' },
  karte: { label: 'Karte', emoji: '🗺️', color: '#0ea5e9' },
  pagalms: { label: 'Pagalms', emoji: '🏡', color: '#4ade80' },
  parks: { label: 'Parks', emoji: '🌳', color: '#22c55e' },
  pludmale: { label: 'Pludmale', emoji: '🏖️', color: '#f97316' },
};

function formatLastPlayed(value) {
  return formatDateTime(value);
}

function getSceneMeta(scene) {
  if (scene && Object.prototype.hasOwnProperty.call(SCENE_META, scene)) {
    return SCENE_META[scene];
  }
  if (!scene) {
    return { label: 'Scene', emoji: '🏠', color: 'var(--accent)' };
  }
  const capitalized = scene.charAt(0).toUpperCase() + scene.slice(1);
  return { label: capitalized, emoji: '🏠', color: 'var(--accent)' };
}

export function applyTranslations(strings, lang) {
  document.title = strings.title || document.title;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n-key]').forEach(node => {
    const key = node.dataset.i18nKey;
    if (!key) return;
    const value = strings[key];
    if (!value) return;
    if (node.tagName.toLowerCase() === 'input') {
      node.setAttribute('placeholder', value);
    } else {
      node.textContent = value;
    }
  });
}

export function applySceneTheme(card, emojiEl, labelEl, planImage, scene) {
  if (!card) return;
  const theme = getSceneMeta(scene);
  card.style.setProperty('--scene-color', theme.color);
  if (emojiEl) emojiEl.textContent = theme.emoji;
  if (labelEl) labelEl.textContent = theme.label;
  if (planImage && scene && scene !== planImage.dataset.scene) {
    planImage.dataset.scene = scene;
    planImage.alt = `House floor plan — ${theme.label}`;
  }
}

export function updateScoreboard(nodes, progress) {
  if (nodes.scoreValue) nodes.scoreValue.textContent = formatNumber(progress.xp ?? 0);
  if (nodes.streakValue) nodes.streakValue.textContent = formatNumber(progress.streak ?? 0);
  if (nodes.lastPlayedValue) nodes.lastPlayedValue.textContent = formatLastPlayed(progress.lastPlayedISO);
}

export function updateLiveRegion(nodes, message) {
  if (!nodes.liveRegion) return;
  nodes.liveRegion.textContent = message;
}

export function setMcqProgress(nodes, index, target) {
  if (!nodes.mcqProgress) return;
  const visible = Math.min(index + 1, target);
  nodes.mcqProgress.textContent = `${formatNumber(visible)}/${formatNumber(target)}`;
}

export function setTypeProgress(nodes, index, target) {
  if (!nodes.typeProgress) return;
  const visible = Math.min(index + 1, target);
  nodes.typeProgress.textContent = `${formatNumber(visible)}/${formatNumber(target)}`;
}

export function updateLevelStatus(nodes, mcqIndex, typeIndex, mcqTarget, typeTarget) {
  const finished = mcqIndex >= mcqTarget && typeIndex >= typeTarget;
  if (!nodes.levelStatus) return;
  nodes.levelStatus.classList.toggle('visually-hidden', !finished);
}
