/**
 * @file travel-tracker/events.js
 * Event binding for the Travel Tracker game.
 *
 * Wires Check, Start, Next, and Restart buttons plus
 * keyboard (Enter) and input events to their handler callbacks.
 */

import { attachButtonBehavior } from './ui.js';

export function bindEvents({
  selectors,
  state,
  handleCheck,
  handleStart,
  handleRestart,
  advanceRoute,
  syncChoiceSelection,
  updateControls,
}) {
  attachButtonBehavior(selectors.check, handleCheck);
  attachButtonBehavior(selectors.start, handleStart);
  attachButtonBehavior(selectors.next, () => {
    if (!state.routeCompleted) return;
    advanceRoute();
  });
  attachButtonBehavior(selectors.restart, handleRestart);
  if (selectors.input) {
    selectors.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleCheck();
      }
    });
    selectors.input.addEventListener('input', () => {
      syncChoiceSelection(selectors.input.value ?? '');
      updateControls();
    });
  }
}
