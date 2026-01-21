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
    selectors.input.addEventListener('keydown', event => {
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
