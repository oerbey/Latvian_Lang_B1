import { loadCloudProgress, saveCloudProgress } from './cloud-progress.js';
import { getProgressAdapter } from './progress/index.js';
import { openProgressStore } from './progress-store.js';

const authFailures = new Set(['reauth', 'unauthenticated', 'forbidden']);

function sameData(left, right) {
  const serialize = (data) =>
    JSON.stringify(data, (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, value[key]]),
          )
        : value,
    );
  return serialize(left) === serialize(right);
}

/**
 * Synchronize one exercise. Call setSession with a verified owner (null for a guest)
 * and forward connectivity changes through setOnline. onChange receives detached views.
 */
export function createProgressSync(
  gameId,
  {
    storage,
    readLegacy,
    load = loadCloudProgress,
    save = saveCloudProgress,
    onChange = () => {},
    saveDelay = 750,
    retryDelays = [1000, 2000, 4000, 8000, 16000],
  } = {},
) {
  const adapter = getProgressAdapter(gameId);
  if (!adapter) throw new TypeError('Unsupported exercise');

  let scope;
  let run;
  let online = true;
  let conflictId = 0;

  function view() {
    if (!scope) return null;
    const { userId, record, status, conflict } = scope;
    return structuredClone({
      userId,
      status,
      data: record?.data ?? null,
      pending: record?.pending ?? false,
      conflict,
    });
  }

  function publish(current, status) {
    current.status = status;
    onChange(view());
  }

  function stop() {
    const previous = run;
    run = null;
    previous?.controller.abort();
    clearTimeout(previous?.timer);
  }

  function persist(current, record) {
    try {
      const problem = current.store.write(record);
      if (!problem) {
        current.record = record;
        return true;
      }
      stop();
      publish(current, problem);
    } catch {
      stop();
      publish(current, 'storage-error');
    }
    return false;
  }

  function active(operation) {
    return run === operation;
  }

  function schedule(operation, work, delay) {
    if (!active(operation)) return;
    clearTimeout(operation.timer);
    operation.timer = setTimeout(() => {
      if (active(operation)) void work(operation);
    }, delay);
  }

  function failed(operation, status) {
    if (!active(operation)) return;
    const current = operation.scope;
    operation.ready = false;
    if (authFailures.has(status)) {
      current.needsAuth = true;
      publish(current, 'reauth');
    } else if (status === 'unavailable' && operation.retries < retryDelays.length) {
      const delay = retryDelays[operation.retries++];
      publish(current, 'retrying');
      schedule(operation, reconcile, delay);
    } else {
      publish(current, 'unavailable');
    }
  }

  function cloudRecord(operation, item) {
    if (
      item?.userId !== operation.scope.userId ||
      item.gameId !== gameId ||
      !Number.isSafeInteger(item.revision) ||
      item.revision < 1 ||
      !item.data
    )
      throw new TypeError('Invalid cloud progress');
    return { data: adapter.normalize(item.data), revision: item.revision, pending: false };
  }

  function reconcileRecord(operation, remote) {
    const current = operation.scope;
    const local = current.record;
    const matches = sameData(local.data, remote.data);
    if (
      (local.pending || (remote.revision === 0 && local.revision > 0)) &&
      !matches &&
      local.revision !== remote.revision &&
      !(local.revision === null && remote.revision === 0)
    ) {
      current.conflict = { data: remote.data, revision: remote.revision, id: ++conflictId };
      operation.ready = false;
      publish(current, 'conflict');
      return;
    }

    const record =
      local.pending && !matches
        ? { ...local, revision: remote.revision }
        : matches
          ? { ...remote, data: local.data }
          : remote;
    if (!persist(current, record)) return;
    current.conflict = null;
    operation.ready = true;
    publish(current, record.pending ? 'pending' : remote.revision ? 'saved' : 'ready');
    if (record.pending) schedule(operation, flush, saveDelay);
    else operation.retries = 0;
  }

  async function reconcile(operation) {
    if (!active(operation)) return;
    operation.ready = false;
    publish(operation.scope, 'checking');
    if (!active(operation)) return;
    try {
      const response = await load(gameId, operation.options);
      if (!active(operation)) return;
      if (response.status === 'missing') {
        reconcileRecord(operation, { data: adapter.createDefault(), revision: 0, pending: false });
      } else if (response.status === 'ok') {
        reconcileRecord(operation, cloudRecord(operation, response.item));
      } else failed(operation, response.status);
    } catch {
      failed(operation, 'unavailable');
    }
  }

  async function flush(operation) {
    const current = operation.scope;
    const record = current.record;
    if (!operation.ready || operation.saving || !record.pending) return;
    try {
      if (!current.store.isCurrent()) {
        stop();
        publish(current, 'local-conflict');
        return;
      }
    } catch {
      stop();
      publish(current, 'storage-error');
      return;
    }
    operation.saving = true;
    publish(current, 'syncing');
    if (!active(operation)) return;
    let response;
    try {
      response = await save(gameId, record.data, record.revision, operation.options);
    } catch {
      response = { status: 'unavailable' };
    }
    if (!active(operation)) return;
    operation.saving = false;
    if (response.status === 'saved') {
      let acknowledged;
      try {
        acknowledged = cloudRecord(operation, response.item);
        if (
          acknowledged.revision !== record.revision + 1 ||
          !sameData(acknowledged.data, record.data)
        )
          throw new TypeError('Invalid save acknowledgement');
      } catch {
        failed(operation, 'unavailable');
        return;
      }
      const latest = current.record;
      const next = { ...latest, revision: acknowledged.revision, pending: latest !== record };
      if (!persist(current, next)) return;
      operation.retries = 0;
      publish(current, next.pending ? 'pending' : 'saved');
      if (next.pending) schedule(operation, flush, saveDelay);
    } else if (response.status === 'conflict') {
      // A conditional write conflict may omit the current record. Read it before offering a choice.
      if (!response.item) await reconcile(operation);
      else {
        try {
          reconcileRecord(operation, cloudRecord(operation, response.item));
        } catch {
          failed(operation, 'unavailable');
        }
      }
    } else failed(operation, response.status);
  }

  function resume() {
    stop();
    if (!scope?.record || ['local-conflict', 'storage-error'].includes(scope.status)) return;
    if (scope.userId === null || !online) {
      publish(scope, scope.userId === null ? 'local' : 'offline');
      return;
    }
    if (scope.needsAuth) {
      publish(scope, 'reauth');
      return;
    }
    const controller = new AbortController();
    run = {
      scope,
      controller,
      ready: false,
      saving: false,
      retries: 0,
      options: { userId: scope.userId, signal: controller.signal },
    };
    return reconcile(run);
  }

  function setSession(userId, { online: connected = online } = {}) {
    stop();
    online = connected;
    scope = { userId, record: null, conflict: null, status: 'checking' };
    try {
      scope.store = openProgressStore(
        gameId,
        userId,
        storage ?? globalThis.localStorage,
        adapter,
        readLegacy,
      );
      scope.record = scope.store.read();
    } catch {
      publish(scope, 'storage-error');
      return;
    }
    return resume();
  }

  function saveLocal(data) {
    const current = scope;
    if (
      !current?.record ||
      current.conflict ||
      ['local-conflict', 'storage-error'].includes(current.status)
    )
      return false;
    const next = {
      ...current.record,
      data: adapter.normalize(data),
      pending: current.userId !== null,
    };
    if (!persist(current, next)) return false;
    if (run?.ready) {
      const operation = run;
      publish(current, 'pending');
      schedule(operation, flush, saveDelay);
    } else onChange(view());
    return true;
  }

  function resolveConflict(choice, id) {
    if (
      !run ||
      !scope.conflict ||
      scope.conflict.id !== id ||
      scope.status !== 'conflict' ||
      !['local', 'cloud'].includes(choice)
    )
      return false;
    const operation = run;
    const current = scope;
    const { data, revision } = current.conflict;
    const next = { data: choice === 'cloud' ? data : current.record.data, revision };
    if (!persist(current, { ...next, pending: choice === 'local' })) return false;
    current.conflict = null;
    operation.ready = true;
    operation.retries = 0;
    publish(current, choice === 'local' ? 'pending' : revision ? 'saved' : 'ready');
    if (choice === 'local') schedule(operation, flush, saveDelay);
    return true;
  }

  return {
    view,
    setSession,
    saveLocal,
    resolveConflict,
    reset: () => saveLocal(adapter.createDefault()),
    retry: () =>
      scope &&
      (['local-conflict', 'storage-error'].includes(scope.status)
        ? setSession(scope.userId)
        : resume()),
    setOnline(value) {
      if (online === value) return;
      online = value;
      return resume();
    },
    dispose() {
      stop();
      scope = null;
    },
  };
}
