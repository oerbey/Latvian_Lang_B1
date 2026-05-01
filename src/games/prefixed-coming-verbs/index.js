import { mustId } from '../../lib/dom.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { assetUrl } from '../../lib/paths.js';
import { formatSentenceFromChunks, matchesExactAnswer, shuffleChunks } from './logic.js';

const SPEC_PATH = 'data/latvian_prefixed_verb_exercise.spec.json';
const ITEMS_PATH = 'data/latvian_prefixed_verb_exercise.items.json';
const COMPLETABLE_TYPES = new Set([
  'multiple_choice_sentence_completion',
  'meaning_match',
  'case_clue',
]);

const typeLabels = {
  multiple_choice_sentence_completion: 'Teikuma papildināšana',
  meaning_match: 'Nozīmes savienošana',
  case_clue: 'Gramatikas pavediens',
  sentence_builder: 'Teikuma veidošana',
};

const selectors = {
  title: mustId('pcvTitle'),
  level: mustId('pcvLevel'),
  verbList: mustId('pcvVerbList'),
  progress: mustId('pcvProgress'),
  type: mustId('pcvType'),
  score: mustId('pcvScore'),
  prompt: mustId('pcvTaskTitle'),
  choiceArea: mustId('pcvChoiceArea'),
  builderArea: mustId('pcvBuilderArea'),
  chunkBank: mustId('pcvChunkBank'),
  selectedChunks: mustId('pcvSelectedChunks'),
  check: mustId('pcvCheck'),
  clear: mustId('pcvClear'),
  next: mustId('pcvNext'),
  restart: mustId('pcvRestart'),
  feedback: mustId('pcvFeedback'),
  explanation: mustId('pcvExplanation'),
  tags: mustId('pcvTags'),
  itemList: mustId('pcvItemList'),
};

const state = {
  spec: null,
  items: [],
  index: 0,
  attempts: 0,
  score: 0,
  answered: false,
  selectedChoice: '',
  selectedChunks: [],
  usedChunkIndexes: new Set(),
  completedIds: new Set(),
};

function currentItem() {
  return state.items[state.index] ?? null;
}

function setText(element, value = '') {
  if (element) {
    element.textContent = value;
  }
}

function createButton(label, className = 'btn btn-outline-primary') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function clearElement(element) {
  element.replaceChildren();
}

function explanationFor(item) {
  return item?.explanation_en ?? '';
}

function renderTags(item) {
  clearElement(selectors.tags);
  const tags = Array.isArray(item?.tag) ? item.tag : [];
  tags.forEach((tag) => {
    const pill = document.createElement('span');
    pill.className = 'pcv-tag';
    pill.textContent = tag;
    selectors.tags.appendChild(pill);
  });
}

function clearFeedback() {
  setText(selectors.feedback);
  setText(selectors.explanation);
  clearElement(selectors.tags);
}

function showCorrect(item) {
  setText(selectors.feedback, 'Pareizi!');
  setText(selectors.explanation, explanationFor(item));
  renderTags(item);
}

function showWrong(item) {
  setText(selectors.feedback, 'Mēģini vēlreiz.');
  setText(selectors.explanation, `Padoms: ${explanationFor(item)}`);
  renderTags(item);
}

function showReveal(item) {
  setText(selectors.feedback, 'Mēģini vēlreiz.');
  setText(selectors.explanation, `Pareizā atbilde: ${item.answer}. ${explanationFor(item)}`);
  renderTags(item);
}

function updateScore() {
  setText(selectors.score, `Pareizi: ${state.score}`);
}

function updateProgress() {
  setText(selectors.progress, `Uzdevums ${state.index + 1} / ${state.items.length}`);
}

function updateItemList() {
  Array.from(selectors.itemList.children).forEach((node, idx) => {
    node.classList.toggle('is-current', idx === state.index);
    const item = state.items[idx];
    node.classList.toggle('is-done', state.completedIds.has(item?.id));
  });
}

function setAnswered(answered) {
  state.answered = answered;
  selectors.next.disabled = !answered || state.index >= state.items.length - 1;
  if (answered && state.index >= state.items.length - 1) {
    selectors.next.textContent = 'Pabeigts';
  } else {
    selectors.next.textContent = 'Nākamais';
  }
}

function completeItem(item, correct) {
  if (!state.answered) {
    if (correct) {
      state.score += 1;
      updateScore();
    }
    state.completedIds.add(item.id);
  }
  setAnswered(true);
  updateItemList();
}

function disableChoices() {
  selectors.choiceArea.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
  selectors.chunkBank.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
  selectors.check.disabled = true;
}

function handleResult(isCorrect) {
  const item = currentItem();
  if (!item || state.answered) return;

  if (isCorrect) {
    showCorrect(item);
    completeItem(item, true);
    disableChoices();
    return;
  }

  state.attempts += 1;
  if (state.attempts >= 2) {
    showReveal(item);
    completeItem(item, false);
    revealCorrectChoice(item);
    disableChoices();
    return;
  }

  showWrong(item);
}

function revealCorrectChoice(item) {
  selectors.choiceArea.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-correct', button.dataset.answer === item.answer);
  });
}

function handleChoice(button, item) {
  if (state.answered) return;
  state.selectedChoice = button.dataset.answer ?? '';
  selectors.choiceArea.querySelectorAll('button').forEach((choiceButton) => {
    choiceButton.classList.toggle('is-selected', choiceButton === button);
    choiceButton.classList.remove('is-wrong');
  });

  const correct = state.selectedChoice === item.answer;
  if (!correct) {
    button.classList.add('is-wrong');
  }
  handleResult(correct);
}

function renderChoices(item) {
  clearElement(selectors.choiceArea);
  selectors.choiceArea.hidden = false;
  selectors.builderArea.hidden = true;
  selectors.check.hidden = true;
  selectors.clear.hidden = true;

  item.choices.forEach((choice) => {
    const button = createButton(choice, 'pcv-choice');
    button.dataset.answer = choice;
    button.addEventListener('click', () => handleChoice(button, item));
    selectors.choiceArea.appendChild(button);
  });
}

function renderSelectedChunks() {
  clearElement(selectors.selectedChunks);
  const sentence = formatSentenceFromChunks(state.selectedChunks.map((entry) => entry.chunk));
  if (!state.selectedChunks.length) {
    const empty = document.createElement('span');
    empty.className = 'pcv-selected__placeholder';
    empty.textContent = 'Klikšķini vārdus secībā.';
    selectors.selectedChunks.appendChild(empty);
    selectors.check.disabled = true;
    return;
  }

  state.selectedChunks.forEach((entry) => {
    const button = createButton(entry.chunk, 'pcv-selected__chunk');
    button.addEventListener('click', () => removeSelectedChunk(entry.bankIndex));
    selectors.selectedChunks.appendChild(button);
  });

  const preview = document.createElement('span');
  preview.className = 'pcv-selected__sentence';
  preview.textContent = sentence;
  selectors.selectedChunks.appendChild(preview);
  selectors.check.disabled = false;
}

function selectChunk(entry, button) {
  if (state.answered || state.usedChunkIndexes.has(entry.index)) return;
  state.usedChunkIndexes.add(entry.index);
  state.selectedChunks.push({ chunk: entry.chunk, bankIndex: entry.index });
  button.disabled = true;
  renderSelectedChunks();
}

function removeSelectedChunk(bankIndex) {
  if (state.answered) return;
  state.usedChunkIndexes.delete(bankIndex);
  state.selectedChunks = state.selectedChunks.filter((entry) => entry.bankIndex !== bankIndex);
  const button = selectors.chunkBank.querySelector(`[data-bank-index="${bankIndex}"]`);
  if (button) button.disabled = false;
  renderSelectedChunks();
}

function clearBuilder() {
  if (state.answered) return;
  state.selectedChunks = [];
  state.usedChunkIndexes.clear();
  selectors.chunkBank.querySelectorAll('button').forEach((button) => {
    button.disabled = false;
  });
  renderSelectedChunks();
}

function checkBuilderAnswer() {
  const item = currentItem();
  if (!item || state.answered) return;
  const answer = formatSentenceFromChunks(state.selectedChunks.map((entry) => entry.chunk));
  handleResult(matchesExactAnswer(answer, item.answer));
}

function renderBuilder(item) {
  clearElement(selectors.choiceArea);
  clearElement(selectors.chunkBank);
  selectors.choiceArea.hidden = true;
  selectors.builderArea.hidden = false;
  selectors.check.hidden = false;
  selectors.clear.hidden = false;
  selectors.check.disabled = true;
  state.selectedChunks = [];
  state.usedChunkIndexes.clear();

  shuffleChunks(item.chunks, item.id).forEach((entry) => {
    const button = createButton(entry.chunk, 'pcv-chunk');
    button.dataset.bankIndex = String(entry.index);
    button.addEventListener('click', () => selectChunk(entry, button));
    selectors.chunkBank.appendChild(button);
  });
  renderSelectedChunks();
}

function renderCurrentItem() {
  const item = currentItem();
  if (!item) return;
  state.attempts = 0;
  state.selectedChoice = '';
  clearFeedback();
  setAnswered(false);
  updateProgress();
  updateItemList();
  setText(selectors.type, typeLabels[item.type] ?? item.type);
  setText(selectors.prompt, item.prompt_lv);

  if (COMPLETABLE_TYPES.has(item.type)) {
    renderChoices(item);
  } else if (item.type === 'sentence_builder') {
    renderBuilder(item);
  } else {
    throw new Error(`Unsupported item type: ${item.type}`);
  }
}

function renderSpec() {
  if (!state.spec) return;
  setText(selectors.title, state.spec.title);
  setText(selectors.level, state.spec.level);
  clearElement(selectors.verbList);
  (state.spec.target_words ?? []).forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'pcv-verb-card';
    const lemma = document.createElement('h3');
    lemma.textContent = entry.lemma;
    const meaning = document.createElement('p');
    meaning.textContent = entry.meaning_en;
    card.append(lemma, meaning);
    selectors.verbList.appendChild(card);
  });
}

function renderItemList() {
  clearElement(selectors.itemList);
  state.items.forEach((item, idx) => {
    const row = document.createElement('li');
    row.textContent = `${idx + 1}. ${typeLabels[item.type] ?? item.type}`;
    row.dataset.itemId = item.id;
    selectors.itemList.appendChild(row);
  });
}

function restart() {
  state.index = 0;
  state.attempts = 0;
  state.score = 0;
  state.completedIds.clear();
  updateScore();
  renderCurrentItem();
}

function nextItem() {
  if (!state.answered || state.index >= state.items.length - 1) return;
  state.index += 1;
  renderCurrentItem();
}

async function fetchJSON(path) {
  const response = await fetch(assetUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function bootstrap() {
  showLoading('Ielādē uzdevumus...');
  try {
    selectors.next.addEventListener('click', nextItem);
    selectors.restart.addEventListener('click', restart);
    selectors.clear.addEventListener('click', clearBuilder);
    selectors.check.addEventListener('click', checkBuilderAnswer);

    const [spec, itemPayload] = await Promise.all([fetchJSON(SPEC_PATH), fetchJSON(ITEMS_PATH)]);
    if (!Array.isArray(itemPayload?.items)) {
      throw new Error('Exercise items payload is malformed.');
    }
    state.spec = spec;
    state.items = itemPayload.items;
    renderSpec();
    renderItemList();
    updateScore();
    renderCurrentItem();
  } catch (err) {
    const safeError = err instanceof Error ? err : new Error('Neizdevās ielādēt uzdevumus.');
    console.error(safeError);
    showFatalError(safeError);
  } finally {
    hideLoading();
  }
}

bootstrap();
