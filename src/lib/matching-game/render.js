import { shuffleInPlace } from '../utils.js';

export function announceStatus(elements, score) {
  elements.score.textContent = `Pareizi: ${score.right} | Nepareizi: ${score.wrong}`;
}

export function createCard(text, key, list) {
  const card = document.createElement('div');
  card.className = 'word-card';
  card.role = 'option';
  card.tabIndex = 0;
  card.id = `${list}-${key}`;
  card.dataset.key = String(key);
  card.dataset.list = list;
  card.setAttribute('aria-pressed', 'false');
  card.setAttribute('aria-disabled', 'false');
  card.textContent = text;
  return card;
}

export function getTranslation(item, currentLang) {
  if (!item) return '';
  if (item[currentLang] !== undefined) return item[currentLang];
  if (item.translations && item.translations[currentLang] !== undefined) {
    return item.translations[currentLang];
  }
  return item.eng || item.en || '';
}

export function renderRound({ elements, items, currentLang, onRoundRendered }) {
  elements.lvList.replaceChildren();
  elements.trList.replaceChildren();

  const lv = items.map((it, idx) => ({ key: idx, text: it.lv }));
  const tr = items.map((it, idx) => ({ key: idx, text: getTranslation(it, currentLang) }));

  lv.forEach((o) => {
    elements.lvList.appendChild(createCard(o.text, o.key, 'lv'));
  });
  shuffleInPlace(tr.slice()).forEach((o) => {
    elements.trList.appendChild(createCard(o.text, o.key, 'tr'));
  });

  const first = elements.lvList.querySelector('.word-card');
  if (first) first.focus();
  onRoundRendered?.(items);
}

export function speakLV(state, speakLang, text) {
  if (!state.speakOn || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speakLang;
  window.speechSynthesis.speak(u);
}

export function clearSelections(state, elements) {
  state.selections.lv = null;
  state.selections.tr = null;
  elements.lvList.querySelectorAll(".word-card[aria-pressed='true']").forEach((el) => {
    el.setAttribute('aria-pressed', 'false');
    el.classList.remove('selected');
  });
  elements.trList.querySelectorAll(".word-card[aria-pressed='true']").forEach((el) => {
    el.setAttribute('aria-pressed', 'false');
    el.classList.remove('selected');
  });
}

export function disablePair(key) {
  document.querySelectorAll(`.word-card[data-key="${key}"]`).forEach((el) => {
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('tabindex', '-1');
    el.classList.remove('selected');
    el.setAttribute('aria-pressed', 'false');
  });
}
