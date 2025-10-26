export function mountDnD({ dragSelector, dropSelector, onDrop }) {
  const drags = [...document.querySelectorAll(dragSelector)];
  const drops = [...document.querySelectorAll(dropSelector)];

  drags.forEach(el => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-grabbed', 'false');
    el.setAttribute('aria-pressed', 'false');
  });
  drops.forEach(el => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-live', 'polite');
  });

  let dragged = null;
  let selected = null;

  function start(el, pointerId) {
    clearSelected();
    dragged = { el, pointerId };
    el.setAttribute('aria-grabbed', 'true');
    el.style.opacity = '0.6';
    const handleWindowPointerUp = e => {
      if (!dragged) return;
      if (pointerId == null || e.pointerId === pointerId) {
        end(el);
      }
    };
    window.addEventListener('pointerup', handleWindowPointerUp, { once: true });
  }

  function end(el) {
    el.setAttribute('aria-grabbed', 'false');
    el.style.opacity = '';
    dragged = null;
  }

  function setSelected(el) {
    if (selected === el) return;
    clearSelected();
    selected = el;
    selected.classList.add('is-selected');
    selected.setAttribute('aria-pressed', 'true');
  }

  function clearSelected() {
    if (!selected) return;
    selected.classList.remove('is-selected');
    selected.setAttribute('aria-pressed', 'false');
    selected = null;
  }

  function dropOnSlot(endingEl, slot) {
    if (!endingEl) return;
    onDrop(endingEl, slot);
    clearSelected();
  }

  drags.forEach(el => {
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      start(el, e.pointerId);
    });

    el.addEventListener('pointerup', e => {
      if (dragged?.el === el) {
        if (dragged.pointerId === e.pointerId || dragged.pointerId == null) {
          end(el);
        }
      }
    });

    el.addEventListener('pointercancel', () => {
      if (dragged?.el === el) {
        end(el);
      }
    });

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (dragged?.el === el) {
          end(el);
        } else {
          start(el, null);
        }
      }
    });

    el.addEventListener('click', () => {
      if (dragged) return;
      if (selected === el) {
        clearSelected();
      } else {
        setSelected(el);
      }
    });
  });

  drops.forEach(slot => {
    slot.addEventListener('pointerup', e => {
      if (dragged) {
        e.preventDefault();
        dropOnSlot(dragged.el, slot);
        end(dragged.el);
        return;
      }
      if (selected) {
        e.preventDefault();
        dropOnSlot(selected, slot);
      }
    });

    slot.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        clearSelected();
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && (dragged || selected)) {
        e.preventDefault();
        if (dragged) {
          dropOnSlot(dragged.el, slot);
          end(dragged.el);
        } else {
          dropOnSlot(selected, slot);
        }
      }
    });

    slot.addEventListener('click', () => {
      if (selected) {
        dropOnSlot(selected, slot);
      }
    });
  });

}
