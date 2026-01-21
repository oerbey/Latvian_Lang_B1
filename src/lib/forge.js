import { getState, shuffle, choice, now, resetClicks, clickables, setStatus, triggerRedraw, updateState } from './state.js';
import { $id } from './dom.js';
import { W, H, scale, roundedRect, drawText, clear, confetti, ctx } from './render.js';

export const ALL_PREFIXES = ["iz","pār","no","sa","ap","ie","pie","uz","at","aiz","pa"];

export function startForgeRound() {
  const state = getState();
  const allForge = state.DATA?.forge || [];
  const pool = allForge.filter(e => {
    if (!(e.games && e.games.includes('forge'))) return false;
    return Boolean(e.translations?.[state.targetLang] ?? e.translations?.en);
  });
  if (!pool.length) {
    setStatus('No forge entries available.');
    updateState(state => {
      state.forgeState = null;
    });
    clear();
    resetClicks();
    triggerRedraw();
    return;
  }
  const pick = pool[state.roundIndex % pool.length];
  const clue = pick.translations?.[state.targetLang] ?? pick.translations?.en;
  const opts = new Set([pick.correct]);
  while (opts.size < 5) opts.add(choice(ALL_PREFIXES));
  const options = shuffle(Array.from(opts));
  updateState(state => {
    state.forgeState = { base: pick.base, clue, correct: pick.correct, options, chosen: null, start: now(), correctCount: 0, total: 1, detail: [] };
  });
  triggerRedraw();
}

export function drawForge() {
  const state = getState();
  const fs = state.forgeState;
  if (!fs) return;
  clear();
  resetClicks();
  const sr = $id('sr-game-state');
  const srList = sr ? document.createElement('ul') : null;
  if (sr) {
    sr.replaceChildren();
    const srHeader = document.createElement('p');
    srHeader.textContent = `${state.targetLang.toUpperCase()}: ${fs.clue}. Root: ${fs.base}`;
    sr.appendChild(srHeader);
    sr.appendChild(srList);
  }
  drawText("PREFIX FORGE — pievieno pareizo priedēkli", 28, 40, { font: 'bold 22px system-ui' });
  drawText(`${state.targetLang.toUpperCase()}: ${fs.clue}`, 28, 78, { font: '16px system-ui', color: '#a8b3c7' });
  drawText(`_____${fs.base}`, 28, 120, { font: 'bold 30px system-ui' });
  drawText("Priedēkļu īsās nozīmes (tap for hint):", 28, 160, { font: '14px system-ui', color: '#9fb3ff' });
  let nx = 28, ny = 182; const hintRowMax = W - 200;
  ALL_PREFIXES.forEach(p => {
    const label = p + "-"; const w = ctx.measureText(label).width + 20;
    roundedRect(nx, ny, w, 32, 10, '#22314a', '#3f5675');
    drawText(label, nx + 10, ny + 22, { font: '16px system-ui' });
    const hint = state.DATA.notes['prefix:' + p] || '—';
    clickables.push({ x: nx, y: ny, w: w, h: 32, onClick: () => setStatus(`Hint: ${p}- → ${hint}`) });
    nx += w + 10; if (nx > hintRowMax) { nx = 28; ny += 36; }
  });
  const isMobile = scale < 0.7;
  const oy = ny + 50;
  const bw = isMobile ? Math.min(110, (W - 80) / 5) : 140;
  const bh = isMobile ? 64 : 60;
  let ox = 28;
  const gap = isMobile ? 8 : 12;
  function handleChoice(p, y) {
    const ok = p === fs.correct; const formed = p + fs.base;
    updateState(state => {
      const forgeState = state.forgeState;
      if (!forgeState) return;
      forgeState.detail.push({ type: 'forge', formed, ok, clue: forgeState.clue });
      state.results.push({ mode: 'FORGE', ts: new Date().toISOString(), correct: ok ? 1 : 0, total: 1, time: (((now() - forgeState.start) | 0) / 1000), details: [...forgeState.detail] });
      state.roundIndex += 1;
    });
    if (ok) { setStatus(`Pareizi: ${formed}`); confetti((y !== undefined ? y : H / 2)); }
    else { setStatus(`Nē: ${formed}. Pareizi: ${fs.correct + fs.base}`); }
    startForgeRound();
  }
  fs.options.forEach(p => {
    roundedRect(ox, oy, bw, bh, 12, '#2a2f3a', '#445066');
    drawText(p + '-', ox + bw / 2, oy + bh / 2 + 8, { font: 'bold 24px system-ui', align: 'center' });
    const handler = () => handleChoice(p, oy + bh / 2);
    clickables.push({ x: ox, y: oy, w: bw, h: bh, onClick: handler });
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.textContent = p + '-';
    btn.addEventListener('click', () => handleChoice(p));
    li.appendChild(btn);
    if (srList) {
      srList.appendChild(li);
    }
    ox += bw + gap;
  });
}
