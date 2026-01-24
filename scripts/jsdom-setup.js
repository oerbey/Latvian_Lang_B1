import { JSDOM } from 'jsdom';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function setGlobal(name, value) {
  try {
    if (globalThis[name] === undefined) {
      globalThis[name] = value;
      return;
    }
  } catch (_) {
    // ignore
  }
  try {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  } catch (_) {
    // ignore
  }
}

if (!globalThis.document) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.test/',
  });
  setGlobal('window', dom.window);
  setGlobal('document', dom.window.document);
  setGlobal('navigator', dom.window.navigator);
  setGlobal('HTMLElement', dom.window.HTMLElement);
  setGlobal('Node', dom.window.Node);
  setGlobal('DOMException', dom.window.DOMException);
  setGlobal('CustomEvent', dom.window.CustomEvent);
}

if (!globalThis.localStorage) {
  setGlobal('localStorage', createMemoryStorage());
}

if (typeof globalThis.requestAnimationFrame !== 'function') {
  setGlobal('requestAnimationFrame', (cb) => setTimeout(() => cb(Date.now()), 0));
  setGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
}

if (typeof globalThis.fetch !== 'function') {
  setGlobal('fetch', async () => {
    throw new Error('fetch not mocked for tests');
  });
}
