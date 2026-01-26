import { mountDnD } from './dnd.js';
import { getTable } from './endings-resolver.js';
import { createIcon, updateIcon } from '../../lib/icon.js';

export function applyStrings({ elements, strings }) {
  const { headingEl, subtitleEl, feedbackEl, answerInput, keypadEl, pool } = elements;
  headingEl.textContent = strings.title;
  subtitleEl.textContent = strings.subtitle;
  feedbackEl.setAttribute('aria-label', strings.subtitle);
  answerInput.setAttribute('aria-label', strings.labels.answer);
  keypadEl.setAttribute('aria-label', strings.labels.keypad);
  pool.setAttribute('aria-label', strings.labels.options || 'Endings');
}

export function setFeedback(feedbackEl, icon, text) {
  if (!feedbackEl) return;
  let iconEl = feedbackEl.querySelector('.eb-feedback__icon');
  if (!iconEl || iconEl.tagName.toLowerCase() !== 'img') {
    const created = createIcon({ name: icon || 'info', size: 20, alt: '', className: 'eb-feedback__icon' });
    if (iconEl) {
      iconEl.replaceWith(created);
    } else {
      feedbackEl.prepend(created);
    }
    iconEl = created;
  }
  if (icon) {
    updateIcon(iconEl, { name: icon, size: 20, alt: '' });
    iconEl.hidden = false;
  } else {
    iconEl.hidden = true;
  }

  let textEl = feedbackEl.querySelector('.eb-feedback__text');
  if (!textEl) {
    textEl = document.createElement('span');
    textEl.className = 'eb-feedback__text';
    feedbackEl.append(textEl);
  }
  textEl.textContent = text || '';
}

export function insertChar(answerInput, ch) {
  if (answerInput.disabled) return;
  const { selectionStart, selectionEnd, value } = answerInput;
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? value.length;
  answerInput.value = `${value.slice(0, start)}${ch}${value.slice(end)}`;
  const caret = start + ch.length;
  answerInput.focus();
  answerInput.setSelectionRange(caret, caret);
}

export function setupKeypad({ keypadEl, letters, onInsert }) {
  keypadEl.replaceChildren();
  letters.forEach(ch => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = ch;
    btn.dataset.ch = ch;
    btn.addEventListener('click', () => onInsert(ch));
    keypadEl.append(btn);
  });
}

export function renderRound({ round, elements, strings, buildOptions, onDrop }) {
  const { board, pool } = elements;
  board.replaceChildren();
  pool.replaceChildren();
  const stemEl = document.createElement('div');
  stemEl.className = 'eb-stem';
  stemEl.dataset.pos = round.item.pos;
  stemEl.dataset.schema = round.item.schema;
  stemEl.dataset.case = round.gram.case;
  stemEl.dataset.number = round.gram.number;
  if (round.gram.gender) stemEl.dataset.gender = round.gram.gender;
  stemEl.textContent = round.item.display || `${round.item.stem}-`;

  const slot = document.createElement('div');
  slot.className = 'eb-slot';
  slot.dataset.placeholder = strings.labels.dropPlaceholder;
  slot.dataset.role = 'slot';
  slot.setAttribute('aria-label', strings.labels.dropPlaceholder);

  board.append(stemEl, slot);

  const options = buildOptions(round);
  options.forEach(text => {
    const ending = document.createElement('div');
    ending.className = 'eb-ending';
    ending.textContent = text;
    pool.append(ending);
  });

  mountDnD({
    dragSelector: '.eb-ending',
    dropSelector: '.eb-slot',
    onDrop: (endingEl, slotEl) => {
      onDrop(endingEl.textContent.trim(), slotEl, endingEl);
    }
  });
}

export function renderExplanation({ round, strings, explainEl, shell }) {
  const meta = explain(round, strings);
  const table = buildRuleTable(round, strings);
  const body = document.createElement('div');
  const metaParagraph = document.createElement('p');
  metaParagraph.textContent = meta;
  body.append(metaParagraph);
  if (table) body.append(table);
  explainEl.replaceChildren();
  explainEl.append(body);
  explainEl.classList.remove('visually-hidden');
  shell.setRuleActive(true);
  shell.setRuleLabel(strings.buttons.ruleHide);
}

function explain(round, strings) {
  const gram = `${round.gram.case}/${round.gram.number}${round.gram.gender ? '/' + round.gram.gender : ''}`;
  return `${strings.explain.prefix} ${round.item.stem} + (${gram}) → ${round.ending} [${round.item.pos}:${round.item.schema}]`;
}

function buildRuleTable(round, strings) {
  const tableData = getTable(round.item.pos, round.item.schema);
  if (!tableData) return null;
  const table = document.createElement('table');
  const header = document.createElement('tr');
  const headerCell = document.createElement('th');
  headerCell.textContent = strings.labels.case;
  header.append(headerCell);
  const columnKeys = collectColumnKeys(tableData);
  columnKeys.forEach(key => {
    const th = document.createElement('th');
    th.textContent = strings.labels.columns?.[key] || key;
    header.append(th);
  });
  const thead = document.createElement('thead');
  thead.append(header);
  table.append(thead);

  const tbody = document.createElement('tbody');
  Object.entries(tableData).forEach(([caseKey, row]) => {
    const tr = document.createElement('tr');
    const caseCell = document.createElement('th');
    caseCell.scope = 'row';
    caseCell.textContent = strings.cases?.[caseKey] || caseKey;
    tr.append(caseCell);
    columnKeys.forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] ?? '–';
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  table.setAttribute('aria-label', strings.labels.ruleTitle);
  return table;
}

function collectColumnKeys(tableData) {
  const keys = new Set();
  Object.values(tableData).forEach(row => {
    Object.keys(row).forEach(key => keys.add(key));
  });
  return [...keys];
}
