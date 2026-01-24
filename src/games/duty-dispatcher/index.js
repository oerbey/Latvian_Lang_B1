import { mustId } from '../../lib/dom.js';
import { showFatalError } from '../../lib/errors.js';
import { hideLoading, showLoading } from '../../lib/loading.js';
import { loadRoles, loadStrings, loadTasks } from './data.js';
import { readProgress, persistProgress } from './progress.js';
import {
  applyStrings,
  clearRoleHighlights,
  disableRoles,
  markRole,
  renderRoles,
  setFeedback,
  setHint,
  updateMetrics,
  updateProgress,
} from './ui.js';
import { createHandlers } from './handlers.js';

const ROLES_PATH = 'data/duty-dispatcher/roles.json';
const TASKS_PATH = 'data/duty-dispatcher/tasks.json';
const GAME_NAME = 'duty-dispatcher';

const elements = {
  title: mustId('ddTitle'),
  instructions: mustId('ddInstructions'),
  scenario: mustId('ddScenario'),
  dutyCard: mustId('ddDutyCard'),
  rolesGrid: mustId('ddRoles'),
  feedback: mustId('ddFeedback'),
  hint: mustId('ddHint'),
  score: mustId('ddScore'),
  streak: mustId('ddStreak'),
  start: mustId('ddStart'),
  next: mustId('ddNext'),
  live: mustId('ddLive'),
  progress: mustId('ddProgress'),
};

const state = {
  strings: {},
  roles: [],
  tasks: [],
  order: [],
  index: -1,
  score: 0,
  streak: 0,
  potential: 10,
  attempts: 0,
  readyForNext: false,
  started: false,
};

function dispatchAnalytics(event, meta = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent('llb1:track', {
        detail: {
          game: GAME_NAME,
          event,
          meta,
        },
      }),
    );
  } catch (err) {
    console.warn('Analytics dispatch failed', err);
  }
}

const handlers = createHandlers({
  state,
  elements,
  setFeedback: message => setFeedback(elements, message),
  setHint: message => setHint(elements, message),
  updateMetrics: () => updateMetrics(elements, state.strings, state.score, state.streak),
  updateProgress: () => updateProgress(elements, state.strings, state.index, state.order.length),
  clearRoleHighlights: () => clearRoleHighlights(elements.rolesGrid),
  disableRoles: () => disableRoles(elements.rolesGrid),
  markRole: (roleId, status, dutyText) => markRole(elements.rolesGrid, roleId, status, dutyText),
  persistProgress: (score, streak) => persistProgress(score, streak),
  dispatchAnalytics,
});

async function bootstrap() {
  showLoading('Loading game data...');
  try {
    elements.start.disabled = true;
    elements.next.disabled = true;
    if (elements.dutyCard) {
      elements.dutyCard.addEventListener('dragstart', handlers.handleDragStart);
    }
    if (elements.start) {
      elements.start.addEventListener('click', () => {
        handlers.startSession();
      });
    }
    if (elements.next) {
      elements.next.addEventListener('click', () => {
        if (!state.readyForNext) return;
        if (elements.next) elements.next.disabled = true;
        handlers.advance();
      });
    }

    const strings = await loadStrings(GAME_NAME);
    state.strings = applyStrings(elements, strings);
    updateMetrics(elements, state.strings, state.score, state.streak);

  const stored = readProgress();
    if (stored) {
      state.score = stored.xp ?? 0;
      state.streak = stored.streak ?? 0;
      updateMetrics(elements, state.strings, state.score, state.streak);
    }

    const [roles, tasks] = await Promise.all([loadRoles(ROLES_PATH), loadTasks(TASKS_PATH)]);
    state.roles = Array.isArray(roles) ? roles : [];
    state.tasks = Array.isArray(tasks) ? tasks : [];
    renderRoles(state.roles, elements, handlers);
    const hasTasks = state.tasks.length > 0;
    elements.start.disabled = !hasTasks;
    if (!hasTasks) {
      setFeedback(elements, 'Nav pieejamu uzdevumu.');
      return;
    }
    updateProgress(elements, state.strings, state.index, state.order.length);
  } catch (err) {
    console.error('Failed to initialize Duty Dispatcher', err);
    setFeedback(elements, 'Neizdevās ielādēt datus.');
    const safeError = err instanceof Error ? err : new Error('Failed to load Duty Dispatcher.');
    showFatalError(safeError);
  } finally {
    hideLoading();
  }
}

bootstrap();
