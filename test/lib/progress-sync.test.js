import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressSync } from '../../src/lib/progress-sync.js';

const gameId = 'word-quest';
const owner = `extid:${'a'.repeat(64)}`;
const other = `extid:${'b'.repeat(64)}`;
const snapshot = (xp) => ({ xp });
const item = (xp, revision, userId = owner) => ({ gameId, userId, revision, data: snapshot(xp) });
const missing = { status: 'missing' };
const loaded = (...args) => ({ status: 'ok', item: item(...args) });
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function setup(t, overrides = {}) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const make = (options = {}) => {
    const waiting = new Map();
    const sync = createProgressSync(gameId, {
      storage,
      saveDelay: 0,
      retryDelays: [],
      load: async () => missing,
      save: async () => assert.fail('Unexpected save'),
      ...overrides,
      ...options,
      onChange(view) {
        waiting.get(view.status)?.resolve(view);
        waiting.delete(view.status);
      },
    });
    t.after(sync.dispose);
    return {
      sync,
      until(status) {
        if (sync.view()?.status === status) return Promise.resolve(sync.view());
        const notification = deferred();
        waiting.set(status, notification);
        return notification.promise;
      },
    };
  };
  return { ...make(), make, storage, values };
}

test('guest progress stays separate from two verified owners and never queues a cloud write', async (t) => {
  const { sync, make } = setup(t);
  await sync.setSession(null);
  assert.equal(sync.saveLocal(snapshot(11)), true);
  assert.equal(sync.view().pending, false);
  await sync.setSession(owner);
  assert.equal(sync.view().data.xp, 0);
  sync.setOnline(false);
  sync.saveLocal(snapshot(22));
  await sync.setSession(other);
  assert.equal(sync.view().data.xp, 0);
  sync.saveLocal(snapshot(33));
  const { sync: reopened } = make();
  reopened.setOnline(false);
  await reopened.setSession(owner);
  assert.equal(reopened.view().data.xp, 22);
  await reopened.setSession(other);
  assert.equal(reopened.view().data.xp, 33);
  await reopened.setSession(null);
  assert.equal(reopened.view().data.xp, 11);
  await reopened.setSession('guest');
  assert.equal(reopened.view().status, 'storage-error');
});

test('offline edits survive refresh and resume against their last acknowledged revision', async (t) => {
  const writes = [];
  const { sync, make } = setup(t, {
    load: async () => loaded(10, 4),
    save: async (id, data, revision, options) => {
      writes.push([id, data.xp, revision, options.userId]);
      return { status: 'saved', item: item(data.xp, revision + 1) };
    },
  });
  await sync.setSession(owner);
  sync.setOnline(false);
  sync.saveLocal(snapshot(20));
  sync.dispose();
  const restored = make();
  restored.sync.setOnline(false);
  await restored.sync.setSession(owner);
  assert.equal(restored.sync.view().pending, true);
  assert.equal(restored.sync.view().data.xp, 20);
  assert.deepEqual(writes, []);
  await restored.sync.setOnline(true);
  await restored.until('saved');
  assert.deepEqual(writes, [[gameId, 20, 4, owner]]);
  assert.equal(restored.sync.view().pending, false);
});

test('a newer local edit survives acknowledgement of an in-flight save', async (t) => {
  const first = deferred();
  const writes = [];
  const { sync, until } = setup(t, {
    save: async (_id, data, revision) => {
      writes.push([data.xp, revision]);
      if (revision === 0) return first.promise;
      return { status: 'saved', item: item(data.xp, revision + 1) };
    },
  });
  await sync.setSession(owner);
  sync.saveLocal(snapshot(1));
  await until('syncing');
  sync.saveLocal(snapshot(2));
  first.resolve({ status: 'saved', item: item(1, 1) });
  await until('saved');
  assert.deepEqual(writes, [
    [1, 0],
    [2, 1],
  ]);
  assert.equal(sync.view().data.xp, 2);
});

test('conflicts require a current explicit choice even when the write response omits cloud data', async (t) => {
  for (const choice of ['cloud', 'local']) {
    let remote = loaded(5, 1);
    const writes = [];
    const { sync, until } = setup(t, {
      load: async () => remote,
      save: async (_id, data, revision) => {
        writes.push([data.xp, revision]);
        if (revision === 1) {
          remote = loaded(15, 2);
          return { status: 'conflict' };
        }
        return { status: 'saved', item: item(data.xp, 3) };
      },
    });
    await sync.setSession(owner);
    sync.saveLocal(snapshot(10));
    const { conflict } = await until('conflict');
    assert.equal(conflict.data.xp, 15);
    assert.deepEqual(writes, [[10, 1]]);
    assert.equal(sync.resolveConflict(choice, conflict.id + 1), false);
    assert.equal(sync.saveLocal(snapshot(99)), false);
    assert.equal(sync.resolveConflict(choice, conflict.id), true);
    await until('saved');
    assert.equal(sync.view().data.xp, choice === 'cloud' ? 15 : 10);
    assert.deepEqual(
      writes,
      choice === 'cloud'
        ? [[10, 1]]
        : [
            [10, 1],
            [10, 2],
          ],
    );
  }
});

test('transient failure rechecks the revision and recognizes a save whose response was lost', async (t) => {
  let remote = missing;
  let writes = 0;
  const { sync, until } = setup(t, {
    retryDelays: [0],
    load: async () => remote,
    save: async (_id, data) => {
      writes++;
      remote = loaded(data.xp, 1);
      return { status: 'unavailable' };
    },
  });
  await sync.setSession(owner);
  sync.saveLocal(snapshot(12));
  await until('saved');
  assert.equal(writes, 1);
  assert.equal(sync.view().pending, false);
});

test('authentication failures retain pending changes until the caller reconnects the owner', async (t) => {
  let writes = 0;
  const { sync, until } = setup(t, {
    retryDelays: [0],
    save: async () => {
      if (++writes === 1) return { status: 'unauthenticated' };
      return { status: 'saved', item: item(7, 1) };
    },
  });
  await sync.setSession(owner);
  sync.saveLocal(snapshot(7));
  await until('reauth');
  assert.equal(sync.view().pending, true);
  assert.equal(writes, 1);
  sync.setOnline(false);
  await sync.setOnline(true);
  await sync.retry();
  assert.equal(sync.view().status, 'reauth');
  assert.equal(writes, 1);
  await sync.setSession(owner);
  await until('saved');
  assert.equal(writes, 2);
});

test('reset queues a revisioned default snapshot and survives refresh before saving', async (t) => {
  const { sync, make } = setup(t, { load: async () => loaded(30, 2) });
  await sync.setSession(owner);
  sync.setOnline(false);
  assert.equal(sync.reset(), true);
  sync.dispose();
  const restored = make({
    save: async (_id, data, revision) => {
      assert.equal(data.xp, 0);
      assert.equal(revision, 2);
      return { status: 'saved', item: item(0, 3) };
    },
  });
  await restored.sync.setSession(owner);
  await restored.until('saved');
  assert.equal(restored.sync.view().data.xp, 0);
});

test('an account switch aborts requests and ignores responses even if the transport finishes later', async (t) => {
  const late = deferred();
  let signal;
  const { sync, until } = setup(t, {
    save: async (_id, _data, _revision, options) => {
      signal = options.signal;
      return late.promise;
    },
  });
  await sync.setSession(owner);
  sync.saveLocal(snapshot(40));
  await until('syncing');
  await sync.setSession(other);
  assert.equal(signal.aborted, true);
  late.resolve({ status: 'saved', item: item(40, 1) });
  await new Promise(setImmediate);
  assert.equal(sync.view().userId, other);
  assert.equal(sync.view().data.xp, 0);
  assert.equal(sync.view().pending, false);
  sync.setOnline(false);
  await sync.setSession(owner);
  assert.equal(sync.view().pending, true);
  assert.equal(sync.view().data.xp, 40);
});

test('a stale tab acknowledgement cannot overwrite another tab’s locally saved edits', async (t) => {
  const late = deferred();
  const { sync, until, make } = setup(t, { save: async () => late.promise });
  await sync.setSession(owner);
  sync.saveLocal(snapshot(10));
  await until('syncing');
  const second = make();
  second.sync.setOnline(false);
  await second.sync.setSession(owner);
  second.sync.saveLocal(snapshot(20));
  late.resolve({ status: 'saved', item: item(10, 1) });
  await until('local-conflict');
  sync.setOnline(false);
  await sync.retry();
  assert.equal(sync.view().data.xp, 20);
  assert.equal(sync.view().pending, true);
});

test('corrupt local data stays intact and failed persistence cannot schedule a cloud write', async (t) => {
  const { sync, values, make } = setup(t);
  await sync.setSession(owner);
  const [key] = values.keys();
  values.set(key, '{broken');
  await sync.setSession(owner);
  assert.equal(sync.view().status, 'storage-error');
  assert.equal(sync.reset(), false);
  assert.equal(values.get(key), '{broken');
  const { sync: blocked } = make({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota exhausted');
      },
    },
  });
  blocked.setOnline(false);
  await blocked.setSession(owner);
  assert.equal(blocked.saveLocal(snapshot(5)), false);
  assert.equal(blocked.view().status, 'storage-error');
  assert.equal(blocked.view().pending, false);
});
