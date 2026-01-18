export function $id(id) {
  return document.getElementById(id);
}

export function mustId(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element: #${id}`);
  }
  return el;
}

export function on(el, event, handler, options) {
  if (!el || !el.addEventListener) {
    return false;
  }
  el.addEventListener(event, handler, options);
  return true;
}
