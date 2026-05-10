import { mustId } from '../../lib/dom.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { assetUrl } from '../../lib/paths.js';
import { buildTasks, fillBlank, isCorrectChoice, normalizeSimilarWordData } from './logic.js';

const DATA_PATH = 'data/similar-word-groups.json';

const selectors = {
  title: mustId('swgTitle'),
  level: mustId('swgLevel'),
  reference: mustId('swgReference'),
  progress: mustId('swgProgress'),
  group: mustId('swgGroup'),
  score: mustId('swgScore'),
  prompt: mustId('swgPrompt'),
  sentence: mustId('swgSentence'),
  choiceArea: mustId('swgChoiceArea'),
  next: mustId('swgNext'),
  restart: mustId('swgRestart'),
  feedback: mustId('swgFeedback'),
  explanation: mustId('swgExplanation'),
  tags: mustId('swgTags'),
  groupList: mustId('swgGroupList'),
};

const state = {
  payload: null,
  groups: [],
  tasks: [],
  index: 0,
  score: 0,
  attempts: 0,
  answered: false,
  completedIds: new Set(),
};

function currentTask() {
  return state.tasks[state.index] ?? null;
}

function setText(element, value = '') {
  element.textContent = value;
}

function clearElement(element) {
  element.replaceChildren();
}

function createButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function renderTags(task) {
  clearElement(selectors.tags);
  task.tags.forEach((tag) => {
    const pill = document.createElement('span');
    pill.className = 'swg-tag';
    pill.textContent = tag;
    selectors.tags.appendChild(pill);
  });
}

function clearFeedback() {
  setText(selectors.feedback);
  setText(selectors.explanation);
  clearElement(selectors.tags);
}

function updateScore() {
  setText(selectors.score, `Pareizi: ${state.score}`);
}

function updateProgress() {
  setText(selectors.progress, `Uzdevums ${state.index + 1} / ${state.tasks.length}`);
}

function updateGroupList() {
  const doneByGroup = new Map();
  state.tasks.forEach((task) => {
    if (state.completedIds.has(task.id)) {
      doneByGroup.set(task.groupId, (doneByGroup.get(task.groupId) ?? 0) + 1);
    }
  });

  Array.from(selectors.groupList.children).forEach((row) => {
    const groupId = row.dataset.groupId;
    const group = state.groups.find((item) => item.id === groupId);
    const done = doneByGroup.get(groupId) ?? 0;
    const isCurrent = currentTask()?.groupId === groupId;
    row.classList.toggle('is-current', isCurrent);
    row.classList.toggle('is-done', Boolean(group && done >= group.entries.length));
    const count = row.querySelector('.swg-group-count');
    if (count && group) {
      count.textContent = `${done}/${group.entries.length}`;
    }
  });
}

function setAnswered(answered) {
  const isLast = state.index >= state.tasks.length - 1;
  state.answered = answered;
  selectors.next.disabled = !answered || isLast;
  selectors.next.textContent = answered && isLast ? 'Pabeigts' : 'Nākamais';
}

function disableChoices() {
  selectors.choiceArea.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
}

function completeTask(task, correct) {
  if (!state.answered) {
    if (correct) {
      state.score += 1;
      updateScore();
    }
    state.completedIds.add(task.id);
  }
  setAnswered(true);
  updateGroupList();
}

function showCorrect(task) {
  setText(selectors.feedback, 'Pareizi!');
  setText(
    selectors.explanation,
    `${fillBlank(task.sentenceLv, task.answer)} ${task.explanationEn}`,
  );
  renderTags(task);
}

function showWrong(task) {
  setText(selectors.feedback, 'Mēģini vēlreiz.');
  setText(selectors.explanation, `Pavediens: ${task.groupFocus}.`);
  renderTags(task);
}

function revealAnswer(task) {
  setText(selectors.feedback, 'Atbilde atklāta.');
  setText(selectors.explanation, `${task.answer}: ${task.explanationEn}`);
  renderTags(task);
}

function revealCorrectChoice(task) {
  selectors.choiceArea.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-correct', button.dataset.answer === task.answer);
  });
}

function handleChoice(button, task) {
  if (state.answered) return;

  selectors.choiceArea.querySelectorAll('button').forEach((choiceButton) => {
    choiceButton.classList.remove('is-selected');
  });
  button.classList.add('is-selected');

  if (isCorrectChoice(button.dataset.answer, task)) {
    showCorrect(task);
    completeTask(task, true);
    revealCorrectChoice(task);
    disableChoices();
    return;
  }

  state.attempts += 1;
  button.classList.add('is-wrong');
  button.disabled = true;

  if (state.attempts >= 2) {
    revealAnswer(task);
    completeTask(task, false);
    revealCorrectChoice(task);
    disableChoices();
    return;
  }

  showWrong(task);
}

function renderChoices(task) {
  clearElement(selectors.choiceArea);
  task.choices.forEach((choice) => {
    const button = createButton(choice, 'swg-choice');
    button.dataset.answer = choice;
    button.addEventListener('click', () => handleChoice(button, task));
    selectors.choiceArea.appendChild(button);
  });
}

function renderCurrentTask() {
  const task = currentTask();
  if (!task) return;

  state.attempts = 0;
  clearFeedback();
  setAnswered(false);
  updateProgress();
  updateGroupList();
  setText(selectors.group, task.groupTitle);
  setText(selectors.prompt, task.meaningEn);
  setText(selectors.sentence, task.sentenceLv);
  renderChoices(task);
}

function renderReference() {
  clearElement(selectors.reference);
  state.groups.forEach((group) => {
    const card = document.createElement('article');
    card.className = 'swg-reference-card';

    const title = document.createElement('h3');
    title.textContent = group.title;

    const list = document.createElement('dl');
    group.entries.forEach((entry) => {
      const term = document.createElement('dt');
      term.textContent = entry.word;
      const description = document.createElement('dd');
      description.textContent = entry.meaningEn;
      list.append(term, description);
    });

    card.append(title, list);
    selectors.reference.appendChild(card);
  });
}

function renderGroupList() {
  clearElement(selectors.groupList);
  state.groups.forEach((group) => {
    const row = document.createElement('li');
    row.dataset.groupId = group.id;

    const title = document.createElement('span');
    title.className = 'swg-group-title';
    title.textContent = group.title;

    const count = document.createElement('span');
    count.className = 'swg-group-count';
    count.textContent = `0/${group.entries.length}`;

    row.append(title, count);
    selectors.groupList.appendChild(row);
  });
}

function restart() {
  state.index = 0;
  state.score = 0;
  state.attempts = 0;
  state.completedIds.clear();
  updateScore();
  renderCurrentTask();
}

function nextTask() {
  if (!state.answered || state.index >= state.tasks.length - 1) return;
  state.index += 1;
  renderCurrentTask();
}

async function fetchJSON(path) {
  const response = await fetch(assetUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

function renderGameToText() {
  const task = currentTask();
  return JSON.stringify({
    index: state.index,
    score: state.score,
    total: state.tasks.length,
    completed: state.completedIds.size,
    task: task
      ? {
          id: task.id,
          groupId: task.groupId,
          answer: task.answer,
          choices: task.choices,
          meaningEn: task.meaningEn,
        }
      : null,
  });
}

window.render_similar_word_groups_to_text = renderGameToText;

async function bootstrap() {
  showLoading('Ielādē līdzīgo formu treniņu...');
  try {
    selectors.next.addEventListener('click', nextTask);
    selectors.restart.addEventListener('click', restart);

    state.payload = await fetchJSON(DATA_PATH);
    state.groups = normalizeSimilarWordData(state.payload);
    state.tasks = buildTasks(state.groups);

    setText(selectors.title, state.payload.title);
    setText(selectors.level, state.payload.level);
    renderReference();
    renderGroupList();
    updateScore();
    renderCurrentTask();
  } catch (err) {
    const safeError = err instanceof Error ? err : new Error('Neizdevās ielādēt uzdevumu.');
    console.error(safeError);
    showFatalError(safeError);
  } finally {
    hideLoading();
  }
}

bootstrap();
