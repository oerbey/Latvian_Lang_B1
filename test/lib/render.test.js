import test from 'node:test';
import assert from 'node:assert/strict';
import { stubMatchDom } from '../helpers/dom-stubs.js';

// Ensure DOM is stubbed before importing render
stubMatchDom();

const render = await import('../../src/lib/render.js');

test('setCanvasHeight adjusts exported H accordingly', () => {
  const { setCanvasHeight } = render;
  // initial H from stub defaults to 560; set to a new value
  setCanvasHeight(720);
  assert.equal(render.H, 720);
});

test('updateCanvasScale computes scale and canvas size', () => {
  const { updateCanvasScale, canvas } = render;
  updateCanvasScale();
  // With parent offsetWidth 980, scale should be 1
  assert.equal(render.scale, 1);
  assert.equal(canvas.style.width, '980px');
});

test('getCanvasCoordinates maps client to canvas coords', () => {
  const { getCanvasCoordinates } = render;
  const { x, y } = getCanvasCoordinates(100, 200);
  assert.equal(x, 100);
  assert.equal(y, 200);
});
