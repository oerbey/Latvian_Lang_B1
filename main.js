import { canvas, updateCanvasScale, getCanvasCoordinates, renderConfetti, roundedRect, drawText, W, H, scale } from './src/render.js';
import { state, MODES, setStatus, hitAt, resetClicks, clickables, setRedraw, HELP_TEXT, triggerRedraw } from './src/state.js';
import { startMatchRound, drawMatch } from './src/match.js';
import { startForgeRound, drawForge } from './src/forge.js';

function drawHelp(){
  const isMobile = scale < 0.7;
  const pad = isMobile ? 12 : 16;
  const w = isMobile ? Math.min(W - 40, 400) : 520;
  const h = isMobile ? Math.min(H - 40, 250) : 220;
  const x = W/2 - w/2;
  const y = H/2 - h/2;
  roundedRect(x,y,w,h,14,'#151821','#3a4252');
  drawText("Palīdzība", x+pad, y+28, {font:'bold 18px system-ui', color:'#9dd4ff'});
  const helpLines = HELP_TEXT.split('\n');
  const fontSize = isMobile ? 12 : 14;
  const lineHeight = isMobile ? 16 : 20;
  helpLines.forEach((line,i)=> {
    const yPos = y + 52 + i * lineHeight;
    if(yPos < y + h - 40) {
      drawText(line, x+pad, yPos, {font:`${fontSize}px system-ui`, color:'#d5dbe6'});
    }
  });
  const bw = isMobile ? 60 : 74;
  const bh = isMobile ? 32 : 28;
  const bx = x + w - bw - 16;
  const by = y + h - bh - 14;
  roundedRect(bx,by,bw,bh,10,'#334','#556');
  drawText("Aizvērt", bx + (isMobile ? 8 : 12), by + (isMobile ? 22 : 20), {font:`${isMobile ? 12 : 14}px system-ui`});
  clickables.push({x:bx,y:by,w:bw,h:bh,onClick:()=>{ state.showHelp=false; triggerRedraw(); }});
}

function draw(){
  if(state.mode===MODES.MATCH) drawMatch(); else drawForge();
  if(renderConfetti()) requestAnimationFrame(draw);
  if(state.showHelp) drawHelp();
}
setRedraw(draw);

function setupEventListeners(){
  document.getElementById('mode-match').addEventListener('click', ()=>{ state.mode=MODES.MATCH; state.roundIndex=0; startMatchRound(); });
  document.getElementById('mode-forge').addEventListener('click', ()=>{ state.mode=MODES.FORGE; state.roundIndex=0; startForgeRound(); });
  document.getElementById('btn-practice').addEventListener('click', ()=>{ state.difficulty='practice'; setStatus("Practice režīms"); });
  document.getElementById('btn-challenge').addEventListener('click', ()=>{ state.difficulty='challenge'; setStatus("Challenge režīms (Match = ♥♥♥)"); });
  document.getElementById('btn-prev').addEventListener('click', ()=>{ state.roundIndex=Math.max(0,state.roundIndex-1); state.mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  document.getElementById('btn-next').addEventListener('click', ()=>{ state.roundIndex++; state.mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  document.getElementById('btn-deck-size').addEventListener('click', ()=>{
    state.deckSizeMode = state.deckSizeMode === 'auto' ? 'full' : 'auto';
    const btn = document.getElementById('btn-deck-size');
    btn.textContent = state.deckSizeMode === 'auto' ? '📏' : '📜';
    btn.title = state.deckSizeMode === 'auto' ? 'Switch to full deck (scrollable)' : 'Switch to fit screen (no scroll)';
    setStatus(state.deckSizeMode === 'auto' ? 'Fit to screen mode' : 'Full deck mode (scrollable)');
    if(state.mode === MODES.MATCH) startMatchRound();
  });
  document.getElementById('btn-help').addEventListener('click', ()=>{ state.showHelp=!state.showHelp; triggerRedraw(); });
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  canvas.addEventListener('mousemove', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    canvas.style.cursor = hitAt(coords.x, coords.y) ? 'pointer' : 'default';
  });
  canvas.addEventListener('click', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const t = hitAt(coords.x, coords.y);
    if(t && t.onClick) t.onClick(t);
  });
  let touchStartY = null;
  let touchStartTime = 0;
  canvas.addEventListener('touchstart', e=>{
    const t=e.touches[0];
    const coords = getCanvasCoordinates(t.clientX, t.clientY);
    touchStartY = t.clientY; touchStartTime = Date.now();
    const hit = hitAt(coords.x, coords.y);
    if(hit && hit.onClick){ hit.onClick(hit); e.preventDefault(); }
  });
  canvas.addEventListener('touchmove', e=>{ e.preventDefault(); });
  canvas.addEventListener('touchend', e=>{
    const dt = Date.now()-touchStartTime;
    if(dt<200){ const t=e.changedTouches[0]; const coords=getCanvasCoordinates(t.clientX,t.clientY); const hit=hitAt(coords.x,coords.y); if(hit&&hit.onClick) hit.onClick(hit); }
  });
  window.addEventListener('resize', ()=>{ updateCanvasScale(); triggerRedraw(); });
  document.addEventListener('keydown', e=>{
    if(e.key==='1'){ state.mode=MODES.MATCH; startMatchRound(); }
    if(e.key==='2'){ state.mode=MODES.FORGE; startForgeRound(); }
    if(e.key==='h' || e.key==='H'){ state.showHelp=!state.showHelp; triggerRedraw(); }
    if(e.key==='r' || e.key==='R'){ state.mode===MODES.MATCH?startMatchRound():startForgeRound(); }
    if(e.key==='d' || e.key==='D'){
      state.deckSizeMode = state.deckSizeMode === 'auto' ? 'full' : 'auto';
      const btn = document.getElementById('btn-deck-size');
      btn.textContent = state.deckSizeMode === 'auto' ? '📏' : '📜';
      setStatus(state.deckSizeMode === 'auto' ? 'Fit to screen mode' : 'Full deck mode (scrollable)');
      if(state.mode===MODES.MATCH) startMatchRound();
    }
  });
}

function exportCSV(){
  const rows = [["mode","timestamp","correct","total","time_s","detail"].join(",")];
  for(const r of state.results){ const d = JSON.stringify(r.details).replaceAll('"','""'); rows.push([r.mode,r.ts,r.correct,r.total,r.time,`"${d}"`].join(",")); }
  const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download="b1_game_results.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

setStatus("Gatavs. Izvēlies režīmu.");
const loadingOverlay = document.getElementById('loading');
const canvasElement = canvas;
loadingOverlay.classList.add('visible');
canvasElement.classList.add('loading');

function initializeGame(){
  updateCanvasScale();
  startMatchRound();
  loadingOverlay.classList.remove('visible');
  canvasElement.classList.remove('loading');
}

async function loadVocabulary(){
  const res = await fetch('data/vocabulary.json');
  if(!res.ok) throw new Error('Network response was not ok');
  state.DATA = await res.json();
}

async function startInit(){
  setupEventListeners();
  try { await loadVocabulary(); } catch(e){ canvasElement.classList.remove('loading'); return; }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(()=>{ setTimeout(initializeGame,50); });
  } else {
    setTimeout(initializeGame,150);
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', startInit);
} else { startInit(); }

export { startInit, exportCSV };
