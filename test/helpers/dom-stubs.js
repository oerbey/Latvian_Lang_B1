export function stubForgeDom() {
  global.document = {
    getElementById: () => ({
      getContext: () => ({}),
      width: 980,
      height: 560,
      style: {},
      parentElement: { offsetWidth: 980 },
      getBoundingClientRect: () => ({ left: 0, top: 0 })
    })
  };
}

export function stubMatchDom() {
  global.window = { devicePixelRatio: 1 };

  const canvasEl = {
    getContext: () => ({
      setTransform() {},
      measureText() { return { width: 0 }; },
      clearRect() {}
    }),
    width: 980,
    height: 560,
    style: {},
    parentElement: { offsetWidth: 980 },
    getBoundingClientRect: () => ({ left: 0, top: 0 })
  };
  const statusEl = { textContent: '' };
  const srEl = { innerHTML: '' };

  global.document = {
    getElementById: (id) => {
      if (id === 'canvas') return canvasEl;
      if (id === 'status') return statusEl;
      if (id === 'sr-game-state') return srEl;
      return canvasEl;
    }
  };

  return { canvasEl, statusEl, srEl };
}
