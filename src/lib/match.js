import { getState, shuffle, now, triggerRedraw, updateState } from './state.js';
import { clickables, resetClicks } from './clickables.js';
import { setStatus } from './status.js';
import {
  W,
  H,
  scale,
  roundedRect,
  drawText,
  drawBadge,
  clear,
  confetti,
  setCanvasHeight,
  getCanvasTheme,
} from './render.js';
import { $id } from './dom.js';
import { announceLive } from './aria.js';

function buildMatchDeck(state) {
  return state.DATA.units.flatMap((u) =>
    u.entries
      .filter((e) => e.games && e.games.includes('match') && e.translations[state.targetLang])
      .map((e) => ({ ...e, unit: u.name })),
  );
}

function updateMatchState(mutator) {
  updateState((state) => {
    if (!state.matchState) return;
    mutator(state.matchState, state);
  });
}

export function startMatchRound() {
  const state = getState();
  const deck = buildMatchDeck(state);
  let maxItems;
  if (state.deckSizeMode === 'auto') {
    const isMobile = scale < 0.7;
    const availableHeight = H - 140;
    const boxH = isMobile ? 80 : 46;
    const gap = isMobile ? 16 : 14;
    const maxItemsOnScreen = Math.floor(availableHeight / (boxH + gap));
    maxItems = Math.min(deck.length, Math.max(5, maxItemsOnScreen));
  } else {
    maxItems = Math.min(15, deck.length);
  }
  if (maxItems === 0) {
    setStatus('No items to match.');
    updateState((state) => {
      state.matchState = null;
    });
    clear();
    resetClicks();
    return;
  }
  const picks = shuffle(deck.slice()).slice(0, maxItems);
  const left = picks.map((p) => ({ txt: p.translations.lv, key: p.translations.lv, meta: p }));
  const right = picks.map((p) => ({
    txt: p.translations[state.targetLang],
    key: p.translations.lv,
    meta: p,
  }));
  const isMobile = scale < 0.7;
  const boxH = isMobile ? 80 : 56;
  const gap = isMobile ? 16 : 14;
  const contentH = maxItems * (boxH + gap) - gap;
  const neededH = Math.max(560, 100 + contentH + 40);
  setCanvasHeight(neededH);
  shuffle(right);
  updateState((state) => {
    state.matchState = {
      left,
      right,
      selected: null,
      solved: new Set(),
      correct: 0,
      total: maxItems,
      start: now(),
      lives: state.difficulty === 'challenge' ? 3 : Infinity,
      feedback: null,
      errors: 0,
      detail: [],
      scrollY: 0,
      contentH: contentH,
      viewTop: 100,
      viewBottom: H - 40,
    };
  });
  triggerRedraw();
}

export function drawMatch() {
  const state = getState();
  const ms = state.matchState;
  if (!ms) return;
  const theme = getCanvasTheme();
  clear();
  resetClicks();
  const sr = $id('sr-game-state');
  let srList = null;
  if (sr) {
    const srSummary =
      sr.querySelector('[data-llb1-sr-summary="match"]') ?? document.createElement('p');
    srSummary.dataset.llb1SrSummary = 'match';
    srList = document.createElement('ul');
    sr.replaceChildren(srSummary, srList);
    const livesLabel = ms.lives === Infinity ? 'infinite' : String(ms.lives);
    announceLive(
      srSummary,
      `Match rush. Correct ${ms.correct} of ${ms.total}. Lives ${livesLabel}.`,
    );
  }
  const targetLabel = state.targetLang.toUpperCase();
  drawText(`MATCH RUSH — LV → ${targetLabel}`, 28, 40, {
    font: 'bold 22px "Source Serif 4"',
    color: theme.text,
  });
  const elapsed = ((now() - ms.start) / 1000) | 0;
  drawText(
    `Correct: ${ms.correct}/${ms.total}  |  Time: ${elapsed}s  |  ${ms.lives === Infinity ? '∞' : '♥'.repeat(ms.lives)}`,
    W - 20,
    40,
    { align: 'right', font: '16px "Source Sans 3"', color: theme.muted },
  );
  if (ms.feedback) {
    drawBadge(ms.feedback, 28, 58, ms.feedback.startsWith('Pareizi') ? theme.success : theme.error);
  }
  const isMobile = scale < 0.7;
  const sideMargin = isMobile ? 20 : 60;
  const columnGap = isMobile ? 20 : 40;
  const boxW = isMobile ? (W - sideMargin * 2 - columnGap) / 2 : 360;
  const boxH = isMobile ? 80 : 56;
  const gap = isMobile ? 16 : 14;
  const Lx = sideMargin;
  const Rx = Lx + boxW + columnGap;
  const top = ms.viewTop;
  const viewH = ms.viewBottom - ms.viewTop;
  drawText('LV', Lx, top - 22, { font: 'bold 18px "Source Sans 3"', color: theme.accent });
  drawText(targetLabel, Rx, top - 22, {
    font: 'bold 18px "Source Sans 3"',
    color: theme.accent,
  });
  const totalItems = ms.left.length;
  const contentH = totalItems * (boxH + gap) - gap;
  const maxScroll = Math.max(0, contentH - viewH);
  if (ms.contentH !== contentH || ms.scrollY > maxScroll) {
    updateMatchState((matchState) => {
      matchState.contentH = contentH;
      if (matchState.scrollY > maxScroll) matchState.scrollY = maxScroll;
    });
  }

  function handleSelection(side, it, y) {
    let result = null;
    updateMatchState((matchState, rootState) => {
      const solved = matchState.solved.has(it.key);
      if (solved) return;
      if (!matchState.selected) {
        matchState.selected = { side, key: it.key };
        result = { redraw: true };
        return;
      }
      if (matchState.selected.side === side) {
        matchState.selected = { side, key: it.key };
        result = { redraw: true };
        return;
      }
      const key = it.key;
      if (key === matchState.selected.key) {
        matchState.solved.add(key);
        matchState.correct += 1;
        const lv = side === 'L' ? it.txt : matchState.left.find((x) => x.key === key).txt;
        const tgt = side === 'R' ? it.txt : matchState.right.find((x) => x.key === key).txt;
        const detail = { type: 'pair', lv, ok: true };
        detail[rootState.targetLang] = tgt;
        matchState.detail.push(detail);
        matchState.feedback = 'Pareizi ✓';
        matchState.selected = null;
        result = { confettiY: y ?? H / 2 };
      } else {
        matchState.errors += 1;
        matchState.feedback = hintForMismatch(key, matchState.selected.key);
        if (matchState.lives !== Infinity) {
          matchState.lives -= 1;
        }
        matchState.selected = null;
        result = { redraw: true };
      }
      if (matchState.correct === matchState.total) {
        result = { ...(result || {}), end: true, success: true };
      }
      if (matchState.lives === 0) {
        result = { ...(result || {}), end: true, success: false };
      }
    });

    if (!result) return;
    if (result.confettiY !== undefined) {
      confetti(result.confettiY);
    }
    if (result.end) {
      endMatchRound(result.success);
      return;
    }
    triggerRedraw();
  }

  function drawColumn(items, x, side) {
    for (let i = 0; i < items.length; i++) {
      const y = top + i * (boxH + gap) - ms.scrollY;
      if (y > ms.viewBottom || y + boxH < top) continue;
      const it = items[i];
      const solved = ms.solved.has(it.key);
      const sel = ms.selected && ms.selected.side === side && ms.selected.key === it.key;
      const color = solved ? theme.surfaceSubtle : sel ? theme.accent : theme.surface;
      const border = solved ? theme.borderSoft : sel ? theme.accent : theme.border;
      roundedRect(x, y, boxW, boxH, 12, color, border);
      drawText(it.txt, x + 16, y + boxH / 2 + 7, {
        font: '20px "Source Sans 3"',
        color: solved ? theme.muted : sel ? theme.accentContrast : theme.text,
      });
      const handler = () => handleSelection(side, it, y + boxH / 2);
      clickables.push({ x, y, w: boxW, h: boxH, tag: `${side}:${i}`, data: it, onClick: handler });
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = `${side === 'L' ? 'LV' : targetLabel}: ${it.txt}`;
      if (solved) btn.disabled = true;
      btn.addEventListener('click', () => handleSelection(side, it));
      li.appendChild(btn);
      if (srList) {
        srList.appendChild(li);
      }
    }
  }
  drawColumn(ms.left, Lx, 'L');
  drawColumn(ms.right, Rx, 'R');
  if (maxScroll > 0) {
    const trackX = W - 20,
      trackW = 8;
    const trackY = top,
      trackH = viewH;
    roundedRect(trackX, trackY, trackW, trackH, 4, '#1a202a', '#2a3040');
    const thumbH = Math.max(30, (viewH * viewH) / contentH);
    const thumbY = trackY + (ms.scrollY / maxScroll) * (trackH - thumbH);
    roundedRect(trackX, thumbY, trackW, thumbH, 4, '#4a5675', '#5a6785');
    clickables.push({
      x: trackX,
      y: trackY,
      w: trackW,
      h: trackH,
      onClick: ({ y }) => {
        const relativeY = y - trackY;
        const thumbCenter = (ms.scrollY / maxScroll) * (trackH - thumbH) + thumbH / 2;
        updateMatchState((matchState) => {
          if (relativeY < thumbCenter - thumbH / 2) {
            matchState.scrollY = Math.max(0, matchState.scrollY - viewH * 0.8);
          } else if (relativeY > thumbCenter + thumbH / 2) {
            matchState.scrollY = Math.min(maxScroll, matchState.scrollY + viewH * 0.8);
          }
        });
        triggerRedraw();
      },
    });
    if (ms.scrollY > 0) {
      drawText('↑', W - 16, top - 5, { font: '12px system-ui', color: '#9fb3ff', align: 'center' });
    }
    if (ms.scrollY < maxScroll) {
      drawText('↓', W - 16, ms.viewBottom + 15, {
        font: '12px system-ui',
        color: '#9fb3ff',
        align: 'center',
      });
    }
  }
}

function hintForMismatch(k1, k2) {
  const state = getState();
  const all = state.DATA.units.flatMap((u) => u.entries);
  const a = all.find((x) => x.translations.lv === k1) || {};
  const b = all.find((x) => x.translations.lv === k2) || {};
  const ref = (e) => (e.tags || []).some((t) => t.includes('reflex'));
  if (ref(a) !== ref(b)) return 'Padoms: -ties = refleksīvs (paša stāvoklis).';
  function pref(e) {
    const t = (e.tags || []).find((t) => t.startsWith('prefix:'));
    return t ? t.split(':')[1] : null;
  }
  const pa = pref(a),
    pb = pref(b);
  if (pa || pb) {
    const note = state.DATA.notes[`prefix:${pa || pb}`] || 'Skaties priedēkļa nozīmi.';
    return 'Priedēklis: ' + note;
  }
  return 'Nesakrīt. Pamēģini vēlreiz!';
}

function endMatchRound(success) {
  const state = getState();
  const ms = state.matchState;
  if (!ms) return;
  const t = ((now() - ms.start) | 0) / 1000;
  updateState((state) => {
    const matchState = state.matchState;
    if (!matchState) return;
    state.results.push({
      mode: 'MATCH',
      ts: new Date().toISOString(),
      correct: matchState.correct,
      total: matchState.total,
      time: t,
      details: matchState.detail,
    });
    state.roundIndex += 1;
  });
  setStatus(
    success
      ? `Match: ${ms.correct}/${ms.total} • ${t}s`
      : `Beidzās dzīvības • ${ms.correct}/${ms.total}`,
  );
  startMatchRound();
}
