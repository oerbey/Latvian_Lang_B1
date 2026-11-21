import { getCurrentUser, onAuthChange } from '../../lib/email-auth.js';
import { createProgressSync } from '../../lib/progress-sync.js';
import { darbibasVardsProgress as adapter } from '../../lib/progress/darbibas-vards.js';
import { readLegacyMatchingProgress } from './legacy-progress.js';

const statuses = {
  local: 'Guest progress stays on this device. Sign in to save account progress across devices.',
  checking: 'Loading progress…',
  ready: 'Cloud sync is ready.',
  pending: 'Changes waiting to sync…',
  syncing: 'Saving to cloud…',
  saved: 'Saved to cloud.',
  conflict: 'Choose which progress to keep.',
  offline: 'Offline. Progress is saved on this device.',
  retrying: 'Cloud unavailable. Retrying…',
  reauth: 'Sign in again to sync progress.',
  unavailable: 'Cloud progress is unavailable. Progress is saved on this device.',
  'storage-error': 'Progress could not be saved or loaded on this device.',
  'local-conflict': 'Progress changed in another tab. Reload to continue.',
};

function describe(summary) {
  const accuracy = summary.accuracy === null ? '—' : `${summary.accuracy}%`;
  const attempts = summary.attempts === 1 ? 'attempt' : 'attempts';
  const words = summary.wordsPractised === 1 ? 'word' : 'words';
  return `${summary.attempts} ${attempts} · ${accuracy} accuracy · ${summary.wordsPractised} ${words} practised`;
}

/** Keep account transitions and conflict UI outside the shared matching engine. */
export function createMatchingAccountProgress() {
  const shell = document.querySelector('.dp-ex-shell');
  const status = document.getElementById('dv-sync-status');
  const summary = document.getElementById('dv-learning-summary');
  const coverage = document.getElementById('dv-coverage');
  const dialog = document.getElementById('dv-sync-dialog');
  const buttons = Array.from(dialog.querySelectorAll('button[data-progress-choice]'));
  let game;
  let itemIds;
  let lastView;
  let appliedView;
  let authGeneration = 0;
  let checkingAuth = true;
  let authStatus = 'anonymous';
  let savingLocally = false;

  const sync = createProgressSync('darbibas-vards', {
    onChange(view) {
      lastView = view;
      render();
    },
    readLegacy: readLegacyMatchingProgress,
  });

  function showSummary(data) {
    const metrics = adapter.summarize(data, { itemIds });
    summary.textContent = describe(metrics);
    coverage.textContent = `Vocabulary coverage: ${metrics.coverage.practised} of ${metrics.coverage.total} words`;
  }

  function render() {
    if (!lastView) return;
    const view = lastView;
    shell.inert = !game || checkingAuth || view.status === 'checking' || Boolean(view.conflict);
    shell.hidden = checkingAuth || view.status === 'checking';
    const displayStatus =
      view.status === 'offline' && ['reauth', 'unavailable'].includes(authStatus)
        ? authStatus
        : view.status;
    status.textContent = checkingAuth ? 'Checking sign-in…' : statuses[displayStatus];
    if (displayStatus === 'reauth' && authStatus === 'authenticated') {
      window.dispatchEvent(new Event('llb1:auth-required'));
    }
    if (!game) return;

    if (!checkingAuth && view.status !== 'checking') {
      const data = JSON.stringify(view.data);
      const changed = appliedView?.userId !== view.userId || appliedView?.data !== data;
      if (changed && !savingLocally) {
        const restored = adapter.normalize(view.data, { itemIds });
        game.restoreProgress(restored);
        showSummary(restored);
      }
      appliedView = { userId: view.userId, data };
    }
    if (view.conflict && !checkingAuth) {
      document.getElementById('dv-conflict-local').textContent = describe(
        adapter.summarize(view.data),
      );
      document.getElementById('dv-conflict-cloud').textContent = describe(
        adapter.summarize(view.conflict.data),
      );
      for (const button of buttons) button.disabled = view.status !== 'conflict';
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
  }

  async function connect() {
    const generation = ++authGeneration;
    checkingAuth = true;
    void sync.setOnline(false);
    shell.inert = true;
    status.textContent = 'Checking sign-in…';
    const auth = await getCurrentUser();
    if (generation !== authGeneration) return;
    authStatus = auth.status;
    checkingAuth = false;
    await sync.setSession(auth.user?.userId ?? null, {
      online: auth.status === 'authenticated' && navigator.onLine,
    });
  }

  dialog.addEventListener('cancel', (event) => event.preventDefault());
  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (lastView?.conflict)
        sync.resolveConflict(button.dataset.progressChoice, lastView.conflict.id);
    });
  }
  onAuthChange(({ reason }) => {
    if (reason === 'refresh') {
      void connect();
      return;
    }
    authGeneration++;
    checkingAuth = reason !== 'signed-out';
    authStatus = 'anonymous';
    void sync.setSession(null, { online: false });
    if (!['signing-in', 'signed-out'].includes(reason)) void connect();
  });
  window.addEventListener('online', () => void connect());
  window.addEventListener('offline', () => void sync.setOnline(false));
  void connect();

  return {
    attach(engine) {
      game = engine;
      itemIds = engine.itemIds();
      render();
    },
    save(data) {
      savingLocally = true;
      try {
        sync.saveLocal(data);
        showSummary(data);
      } finally {
        savingLocally = false;
      }
    },
    renderText() {
      const board = game?.snapshot();
      return JSON.stringify({
        syncStatus: lastView?.status,
        currentBoard: board?.currentBoard,
        settings: board?.settings,
        lockedSet: board?.lockedSet,
        metrics: board ? adapter.summarize(board, { itemIds }) : null,
      });
    },
  };
}
