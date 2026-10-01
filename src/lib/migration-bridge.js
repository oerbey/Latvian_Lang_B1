export const OLD_DEV_ORIGIN = 'https://red-ocean-014d1e603-dev.westeurope.4.azurestaticapps.net';

/** Mount the temporary old-Dev handoff; token state stays only in this page's memory. */
export function createMigrationBridge({
  root = document,
  origin = location.origin,
  fetchImpl = fetch,
  clipboard = navigator.clipboard,
} = {}) {
  const panel = root.getElementById('wq-migration-panel');
  if (!panel || origin !== OLD_DEV_ORIGIN) return () => {};
  const generate = root.getElementById('wq-migration-generate');
  const copy = root.getElementById('wq-migration-copy');
  const output = root.getElementById('wq-migration-token');
  const tokenLabel = root.getElementById('wq-migration-token-label');
  const message = root.getElementById('wq-migration-status');
  let canGenerate = false;
  let busy = false;
  let generation = 0;
  let expiryTimer;

  function clearToken() {
    clearTimeout(expiryTimer);
    output.value = '';
    output.hidden = true;
    tokenLabel.hidden = true;
    copy.hidden = true;
  }

  generate.addEventListener('click', async () => {
    if (!canGenerate || busy) return;
    busy = true;
    generate.disabled = true;
    clearToken();
    const requestGeneration = ++generation;
    message.textContent = 'Creating a snapshot of your saved cloud progress…';
    try {
      const response = await fetchImpl('/api/migration/start', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (requestGeneration !== generation) return;
      if (!response.ok) {
        message.textContent =
          response.status === 404
            ? 'Migration is not available, or there is no saved cloud progress yet.'
            : 'Could not create the token. Check sign-in and try again.';
        return;
      }
      const expiresAt = Date.parse(result.expiresAt);
      const createdAt = Date.parse(result.createdAt);
      if (
        !/^[A-Za-z0-9_-]{43}$/.test(result.token) ||
        !Number.isFinite(createdAt) ||
        !Number.isFinite(expiresAt) ||
        expiresAt <= Date.now()
      ) {
        throw new Error('Invalid migration response');
      }
      output.value = result.token;
      output.hidden = false;
      tokenLabel.hidden = false;
      copy.hidden = false;
      message.textContent = `Snapshot captured ${new Date(createdAt).toLocaleString()}. Token expires ${new Date(expiresAt).toLocaleTimeString()}.`;
      expiryTimer = setTimeout(() => {
        clearToken();
        message.textContent = 'Token expired. Generate a new token for a fresh snapshot.';
      }, expiresAt - Date.now());
    } catch {
      if (requestGeneration === generation) {
        clearToken();
        message.textContent = 'Could not create the token. Check your connection and try again.';
      }
    } finally {
      busy = false;
      generate.disabled = !canGenerate;
    }
  });

  copy.addEventListener('click', async () => {
    if (!output.value) return;
    try {
      await clipboard.writeText(output.value);
      message.textContent += ' Token copied. Keep it private.';
    } catch {
      output.focus();
      output.select();
      message.textContent += ' Select and copy the token manually.';
    }
  });

  return (authenticated, syncStatus) => {
    panel.hidden = !authenticated;
    canGenerate = authenticated && syncStatus === 'saved';
    generate.disabled = !canGenerate || busy;
    if (!authenticated) {
      generation++;
      clearToken();
      message.textContent = '';
    }
  };
}
