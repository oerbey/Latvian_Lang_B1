import { mountDnD } from './dnd.js';
import { getTable } from './endings-resolver.js';
import { createIcon, updateIcon } from '../../lib/icon.js';

function interpolate(template, values) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

export function resolveGramColumnKey(gram) {
  if (!gram) return '';
  if (gram.gender) return `${gram.number}_${gram.gender}`;
  return gram.number;
}

export function formatGramLabel(gram, strings) {
  const caseLabel = strings.cases?.[gram.case] || gram.case;
  const columnKey = resolveGramColumnKey(gram);
  const numberLabel = strings.labels.columns?.[columnKey] || columnKey;
  return `${caseLabel} · ${numberLabel}`;
}

export function buildRoundBrief({ round, state, strings }) {
  const gramLabel = formatGramLabel(round.gram, strings);
  const lemma =
    round.item.translation?.lv ||
    round.item.translation?.en ||
    round.item.display ||
    `${round.item.stem}-`;
  const meaning = round.item.translation?.en || round.item.translation?.lv || '';

  return {
    eyebrow: interpolate(strings.round?.eyebrow || 'Round {round}', {
      round: `${state?.roundNumber || 1}`,
    }),
    title: interpolate(strings.round?.targetTemplate || 'Build the {gram} form.', {
      gram: gramLabel,
    }),
    meta: interpolate(strings.round?.wordTemplate || 'Word: {lemma} ({meaning})', {
      lemma,
      meaning,
    }).trim(),
    gramLabel,
  };
}

export function applyStrings({ elements, strings }) {
  const {
    headingEl,
    subtitleEl,
    controlsHeadingEl,
    boardHeadingEl,
    buildZoneTitleEl,
    optionsZoneTitleEl,
    pickHelpEl,
    roundBriefEl,
    feedbackEl,
    answerInput,
    answerHelpEl,
    keypadEl,
    pool,
  } = elements;

  headingEl.textContent = strings.title;
  subtitleEl.textContent = strings.subtitle;
  if (controlsHeadingEl)
    controlsHeadingEl.textContent = strings.sections?.controls || 'Round controls';
  if (boardHeadingEl) boardHeadingEl.textContent = strings.sections?.workspace || 'Build workspace';
  if (buildZoneTitleEl)
    buildZoneTitleEl.textContent = strings.sections?.buildZone || 'Build the form';
  if (optionsZoneTitleEl)
    optionsZoneTitleEl.textContent =
      strings.sections?.endingZone || strings.labels.options || 'Endings';
  if (pickHelpEl)
    pickHelpEl.textContent =
      strings.labels.pickHelp || 'Tip: click an ending to place it instantly, or drag it.';

  if (roundBriefEl) {
    roundBriefEl.textContent = strings.round?.loading || 'Loading round...';
  }

  feedbackEl.setAttribute('aria-label', strings.subtitle);
  answerInput.setAttribute('aria-label', strings.labels.answer);
  answerInput.setAttribute(
    'placeholder',
    strings.labels.answerPlaceholder || strings.labels.answer,
  );
  if (answerHelpEl)
    answerHelpEl.textContent =
      strings.labels.answerHelp || 'Type the full form, then press Enter or Check.';
  keypadEl.setAttribute('aria-label', strings.labels.keypad);
  pool.setAttribute('aria-label', strings.labels.options || 'Endings');
}

export function setFeedback(feedbackEl, icon, text) {
  if (!feedbackEl) return;
  let iconEl = feedbackEl.querySelector('.eb-feedback__icon');
  if (!iconEl || iconEl.tagName.toLowerCase() !== 'img') {
    const created = createIcon({
      name: icon || 'info',
      size: 20,
      alt: '',
      className: 'eb-feedback__icon',
    });
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
  letters.forEach((ch) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = ch;
    btn.dataset.ch = ch;
    btn.addEventListener('click', () => onInsert(ch));
    keypadEl.append(btn);
  });
}

function renderRoundBrief({ round, state, strings, roundBriefEl }) {
  if (!roundBriefEl) return;
  const brief = buildRoundBrief({ round, state, strings });
  roundBriefEl.replaceChildren();

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eb-round-brief__eyebrow';
  eyebrow.textContent = brief.eyebrow;

  const title = document.createElement('p');
  title.className = 'eb-round-brief__title';
  title.textContent = brief.title;

  const meta = document.createElement('p');
  meta.className = 'eb-round-brief__meta';
  meta.textContent = brief.meta;

  roundBriefEl.append(eyebrow, title, meta);
}

export function renderRound({ round, state, elements, strings, buildOptions, onDrop }) {
  const { board, pool, roundBriefEl } = elements;
  board.replaceChildren();
  pool.replaceChildren();

  renderRoundBrief({ round, state, strings, roundBriefEl });

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
  slot.setAttribute(
    'aria-label',
    `${strings.labels.dropPlaceholder}: ${formatGramLabel(round.gram, strings)}`,
  );

  board.append(stemEl, slot);

  const options = buildOptions(round);
  options.forEach((text) => {
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
    },
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
  columnKeys.forEach((key) => {
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
    columnKeys.forEach((key) => {
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
  Object.values(tableData).forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return [...keys];
}
