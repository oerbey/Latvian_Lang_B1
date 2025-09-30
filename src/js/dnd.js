export function mountDnD({ dragSelector, dropSelector, onDrop }) {
  const drags = [...document.querySelectorAll(dragSelector)];
  const drops = [...document.querySelectorAll(dropSelector)];

  drags.forEach(el => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-grabbed', 'false');
  });
  drops.forEach(el => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-live', 'polite');
  });

  let dragged = null;

  function start(el, pointerId) {
    dragged = { el, pointerId };
    el.setAttribute('aria-grabbed', 'true');
    el.style.opacity = '0.6';
  }

  function end(el) {
    el.setAttribute('aria-grabbed', 'false');
    el.style.opacity = '';
    dragged = null;
  }

  drags.forEach(el => {
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      el.setPointerCapture?.(e.pointerId);
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
  });

  drops.forEach(slot => {
    slot.addEventListener('pointerup', e => {
      if (dragged) {
        e.preventDefault();
        onDrop(dragged.el, slot);
        end(dragged.el);
      }
    });

    slot.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && dragged) {
        e.preventDefault();
        onDrop(dragged.el, slot);
        end(dragged.el);
      }
    });
  });
}
