export const clickables = [];

export function hitAt(x, y) {
  for (const c of clickables) {
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c;
  }
  return null;
}

export function resetClicks() {
  clickables.length = 0;
}
