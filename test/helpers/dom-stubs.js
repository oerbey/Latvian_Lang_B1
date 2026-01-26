function createCtxStub() {
  return {
    setTransform() {},
    measureText(txt = '') {
      return { width: (txt || '').length * 7 };
    },
    clearRect() {},
    beginPath() {},
    moveTo() {},
    arcTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    fillText() {},
    // properties used by draw routines
    lineWidth: 1,
    globalAlpha: 1,
    font: '16px system-ui',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '#000',
    strokeStyle: '#000',
  };
}

export function stubForgeDom() {
  global.window = { devicePixelRatio: 1 };
  const canvasEl = {
    getContext: () => createCtxStub(),
    width: 980,
    height: 560,
    style: {},
    parentElement: { offsetWidth: 980 },
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const statusEl = { textContent: '' };
  const srEl = {
    innerHTML: '',
    dataset: {},
    appendChild() {},
    replaceChildren(...nodes) {
      this.innerHTML = '';
      this._children = nodes;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  global.document = {
    createElement: (tag) => {
      if (tag === 'ul') return { appendChild() {} };
      if (tag === 'li') return { appendChild() {} };
      if (tag === 'button') return { addEventListener() {}, textContent: '' };
      if (tag === 'p') return { textContent: '', dataset: {} };
      return { appendChild() {} };
    },
    getElementById: (id) => {
      if (id === 'canvas') return canvasEl;
      if (id === 'status') return statusEl;
      if (id === 'sr-game-state') return srEl;
      return canvasEl;
    },
  };
  return { canvasEl, statusEl, srEl };
}

export function stubMatchDom() {
  global.window = { devicePixelRatio: 1 };

  const canvasEl = {
    getContext: () => createCtxStub(),
    width: 980,
    height: 560,
    style: {},
    parentElement: { offsetWidth: 980 },
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  };
  const statusEl = { textContent: '' };
  const srEl = {
    innerHTML: '',
    dataset: {},
    appendChild() {},
    replaceChildren(...nodes) {
      this.innerHTML = '';
      this._children = nodes;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };

  global.document = {
    createElement: (tag) => {
      if (tag === 'ul') return { appendChild() {} };
      if (tag === 'li') return { appendChild() {} };
      if (tag === 'button') return { addEventListener() {}, textContent: '' };
      if (tag === 'p') return { textContent: '', dataset: {} };
      return { appendChild() {} };
    },
    getElementById: (id) => {
      if (id === 'canvas') return canvasEl;
      if (id === 'status') return statusEl;
      if (id === 'sr-game-state') return srEl;
      return canvasEl;
    },
  };

  return { canvasEl, statusEl, srEl };
}
/* eslint-env node */
