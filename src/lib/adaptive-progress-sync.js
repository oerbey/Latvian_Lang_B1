import { getCurrentUser, onAuthChange } from './email-auth.js';
import { createProgressSync } from './progress-sync.js';

const syncMessages = {
  local: 'Viesa progress tiek saglabāts šajā pārlūkā.',
  checking: 'Ielādē progresu…',
  ready: 'Progress tiks saglabāts tavā kontā.',
  pending: 'Izmaiņas gaida sinhronizāciju…',
  syncing: 'Saglabā progresu mākonī…',
  saved: 'Progress saglabāts tavā kontā.',
  offline: 'Progress pieejams šajā pārlūkā.',
  retrying: 'Sinhronizācija nav pieejama. Mēģina vēlreiz…',
  unavailable: 'Mākoņa progress nav pieejams.',
  reauth: 'Pieraksties vēlreiz, lai sinhronizētu progresu.',
  conflict: 'Izvēlies, kuru progresu saglabāt.',
  'storage-error': 'Progress šajā pārlūkā nav pieejams.',
  'local-conflict': 'Progress mainīts citā cilnē. Pārlādē lapu, lai turpinātu.',
};

/** Connect an adaptive game's screen and conflict dialog to its scoped progress store. */
export function connectAdaptiveProgress(
  gameId,
  { status, dialog, compare, getScreen, restore, readLegacy },
) {
  let applied;
  let checking = true;
  let authStatus = 'anonymous';
  let generation = 0;
  let saving = false;

  function setChecking() {
    checking = true;
    getScreen().hidden = true;
    status.textContent = 'Pārbauda pierakstīšanos…';
    if (dialog.open) dialog.close();
  }

  const sync = createProgressSync(gameId, {
    onChange(view) {
      if (checking) return;
      const syncStatus =
        ['offline', 'local'].includes(view.status) && ['unavailable', 'reauth'].includes(authStatus)
          ? authStatus
          : view.status;
      status.textContent = syncMessages[syncStatus];
      if (syncStatus === 'reauth' && authStatus === 'authenticated')
        window.dispatchEvent(new Event('llb1:auth-required'));
      if (view.status === 'checking') {
        getScreen().hidden = true;
        return;
      }
      const data = JSON.stringify(view.data);
      if (!saving && (applied?.owner !== view.userId || applied?.data !== data)) {
        restore(view.data);
      }
      applied = { owner: view.userId, data };
      const screen = getScreen();
      screen.hidden = false;
      screen.inert = ['conflict', 'storage-error', 'local-conflict'].includes(view.status);
      if (view.conflict) {
        compare.textContent = `Šajā pārlūkā ${view.data.xp} XP · Mākonī ${view.conflict.data.xp} XP`;
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) dialog.close();
    },
    readLegacy,
  });
  async function connect() {
    const epoch = ++generation;
    setChecking();
    void sync.setOnline(false);
    const auth = await getCurrentUser();
    if (epoch !== generation) return;
    authStatus = auth.status;
    checking = false;
    await sync.setSession(auth.user?.userId ?? null, {
      online: auth.status === 'authenticated' && navigator.onLine,
    });
  }
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  for (const button of dialog.querySelectorAll('[data-progress-choice]')) {
    button.addEventListener('click', () => {
      const conflict = sync.view()?.conflict;
      if (conflict) sync.resolveConflict(button.dataset.progressChoice, conflict.id);
    });
  }
  onAuthChange(({ reason }) => {
    if (reason === 'signed-out') {
      generation++;
      checking = false;
      authStatus = 'anonymous';
      void sync.setSession(null, { online: false });
    } else if (reason === 'signing-in') {
      generation++;
      setChecking();
      void sync.setSession(null, { online: false });
    } else void connect();
  });
  window.addEventListener('online', () => void connect());
  window.addEventListener('offline', () => void sync.setOnline(false));
  void connect();
  return (snapshot) => {
    saving = true;
    try {
      return sync.saveLocal(snapshot);
    } finally {
      saving = false;
    }
  };
}
