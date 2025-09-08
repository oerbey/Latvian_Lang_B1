import { canvas, updateCanvasScale, getCanvasCoordinates, renderConfetti, roundedRect, drawText, W, H, scale } from './src/render.js';
import { state, MODES, setStatus, hitAt, resetClicks, clickables, setRedraw, HELP_TEXT, setHelpText, triggerRedraw } from './src/state.js';
import { startMatchRound, drawMatch } from './src/match.js';
import { startForgeRound, drawForge } from './src/forge.js';

let i18n = {};
let currentLang = 'lv';

async function loadTranslations(lang){
  const res = await fetch(`i18n/${lang}.json`);
  i18n = await res.json();
  currentLang = lang;
  document.documentElement.lang = lang;
  applyTranslations();
}

function applyTranslations(){
  document.title = i18n.html.title;
  document.querySelector('.week-badge').textContent = i18n.badge;
  document.getElementById('title').textContent = i18n.gameTitle;
  const btnMatch = document.getElementById('mode-match');
  btnMatch.textContent = i18n.buttons.modeMatch;
  const btnForge = document.getElementById('mode-forge');
  btnForge.textContent = i18n.buttons.modeForge;
  const btnPractice = document.getElementById('btn-practice');
  btnPractice.textContent = i18n.buttons.practice;
  btnPractice.setAttribute('aria-label', i18n.buttons.practice);
  const btnChallenge = document.getElementById('btn-challenge');
  btnChallenge.textContent = i18n.buttons.challenge;
  btnChallenge.setAttribute('aria-label', i18n.buttons.challenge);
  document.getElementById('btn-prev').setAttribute('aria-label', i18n.buttons.prevAria);
  document.getElementById('btn-next').setAttribute('aria-label', i18n.buttons.nextAria);
  const deckBtn = document.getElementById('btn-deck-size');
  deckBtn.setAttribute('aria-label', i18n.buttons.deckSizeAria);
  deckBtn.title = state.deckSizeMode === 'auto' ? i18n.deckSize.titleAuto : i18n.deckSize.titleFull;
  const btnExport = document.getElementById('btn-export');
  btnExport.textContent = i18n.buttons.export;
  btnExport.setAttribute('aria-label', i18n.buttons.exportAria);
  const btnHelp = document.getElementById('btn-help');
  btnHelp.textContent = i18n.buttons.help;
  btnHelp.setAttribute('aria-label', i18n.buttons.helpAria);
  document.getElementById('loading').textContent = i18n.labels.loading;
  document.getElementById('legend').innerHTML = i18n.labels.legend;
  const langSel = document.getElementById('language-select');
  langSel.value = currentLang;
  langSel.setAttribute('aria-label', i18n.labels.languageSelect);
  document.getElementById('ui').setAttribute('aria-label', i18n.labels.controls);
  document.getElementById('sr-game-state').setAttribute('aria-label', i18n.labels.gameState);
  setStatus(i18n.status.ready);
  setHelpText(i18n.help.lines.join('\n'));
  triggerRedraw();
}

function drawHelp(){
  const isMobile = scale < 0.7;
  const pad = isMobile ? 12 : 16;
  const w = isMobile ? Math.min(W - 40, 400) : 520;
  const h = isMobile ? Math.min(H - 40, 250) : 220;
  const x = W/2 - w/2;
  const y = H/2 - h/2;
  roundedRect(x,y,w,h,14,'#151821','#3a4252');
  drawText(i18n.help.title, x+pad, y+28, {font:'bold 18px system-ui', color:'#9dd4ff'});
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
  drawText(i18n.help.close, bx + (isMobile ? 8 : 12), by + (isMobile ? 22 : 20), {font:`${isMobile ? 12 : 14}px system-ui`});
  clickables.push({x:bx,y:by,w:bw,h:bh,onClick:()=>{ state.showHelp=false; triggerRedraw(); }});
}

function draw(){
  if(state.mode===MODES.MATCH){
    if(state.matchState) drawMatch();
  } else {
    if(state.forgeState) drawForge();
  }
  if(renderConfetti()) requestAnimationFrame(draw);
  if(state.showHelp) drawHelp();
}
setRedraw(draw);

function toggleDeckSize(){
  state.deckSizeMode = state.deckSizeMode === 'auto' ? 'full' : 'auto';
  const btn = document.getElementById('btn-deck-size');
  btn.textContent = state.deckSizeMode === 'auto' ? '📏' : '📜';
  btn.title = state.deckSizeMode === 'auto' ? i18n.deckSize.titleAuto : i18n.deckSize.titleFull;
  setStatus(state.deckSizeMode === 'auto' ? i18n.status.fit : i18n.status.full);
  if(state.mode === MODES.MATCH) startMatchRound();
}

function setupEventListeners(){
  document.getElementById('mode-match').addEventListener('click', ()=>{ state.mode=MODES.MATCH; state.roundIndex=0; startMatchRound(); });
  document.getElementById('mode-forge').addEventListener('click', ()=>{ state.mode=MODES.FORGE; state.roundIndex=0; startForgeRound(); });
  document.getElementById('btn-practice').addEventListener('click', ()=>{ state.difficulty='practice'; setStatus(i18n.status.practice); });
  document.getElementById('btn-challenge').addEventListener('click', ()=>{ state.difficulty='challenge'; setStatus(i18n.status.challenge); });
  document.getElementById('btn-prev').addEventListener('click', ()=>{ state.roundIndex=Math.max(0,state.roundIndex-1); state.mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  document.getElementById('btn-next').addEventListener('click', ()=>{ state.roundIndex++; state.mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  document.getElementById('btn-deck-size').addEventListener('click', toggleDeckSize);
  document.getElementById('btn-help').addEventListener('click', ()=>{ state.showHelp=!state.showHelp; triggerRedraw(); });
  document.getElementById('btn-export').addEventListener('click', exportCSV);
  document.getElementById('language-select').addEventListener('change', async e=>{
    const lang = e.target.value;
    await loadTranslations(lang);
    const target = lang === 'ru' ? 'ru' : 'en';
    await loadVocabulary('lv', target);

    state.roundIndex = 0;
    state.mode===MODES.MATCH?startMatchRound():startForgeRound();
  });
  canvas.addEventListener('mousemove', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    canvas.style.cursor = hitAt(coords.x, coords.y) ? 'pointer' : 'default';
  });
  canvas.addEventListener('click', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const t = hitAt(coords.x, coords.y);
    if(t && t.onClick) t.onClick({ x: coords.x, y: coords.y, target: t });
  });
  let touchStartY = null;
  let touchStartTime = 0;
  canvas.addEventListener('touchstart', e=>{
    const t=e.touches[0];
    const coords = getCanvasCoordinates(t.clientX, t.clientY);
    touchStartY = t.clientY; touchStartTime = Date.now();
    const hit = hitAt(coords.x, coords.y);
    if(hit && hit.onClick){ hit.onClick({ x: coords.x, y: coords.y, target: hit }); e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener('touchmove', e=>{ e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', e=>{
    const dt = Date.now()-touchStartTime;
    if(dt<200){ const t=e.changedTouches[0]; const coords=getCanvasCoordinates(t.clientX,t.clientY); const hit=hitAt(coords.x,coords.y); if(hit&&hit.onClick) hit.onClick({ x: coords.x, y: coords.y, target: hit }); }
  }, { passive: false });
  canvas.addEventListener('wheel', e=>{
    if(state.mode !== MODES.MATCH || !state.matchState) return;
    const ms = state.matchState;
    const viewH = ms.viewBottom - ms.viewTop;
    const maxScroll = Math.max(0, ms.contentH - viewH);
    ms.scrollY = Math.max(0, Math.min(maxScroll, ms.scrollY + e.deltaY));
    triggerRedraw();
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('resize', ()=>{ updateCanvasScale(); triggerRedraw(); });
  document.addEventListener('keydown', e=>{
    if(e.key==='1'){ state.mode=MODES.MATCH; startMatchRound(); }
    if(e.key==='2'){ state.mode=MODES.FORGE; startForgeRound(); }
    if(e.key==='h' || e.key==='H'){ state.showHelp=!state.showHelp; triggerRedraw(); }
    if(e.key==='r' || e.key==='R'){ state.mode===MODES.MATCH?startMatchRound():startForgeRound(); }
    if(e.key==='d' || e.key==='D') toggleDeckSize();
  });
}

function exportCSV(){
  const rows = [["mode","timestamp","correct","total","time_s","detail"].join(",")];
  for(const r of state.results){ const d = JSON.stringify(r.details).replaceAll('"','""'); rows.push([r.mode,r.ts,r.correct,r.total,r.time,`"${d}"`].join(",")); }
  const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download="b1_game_results.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

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

async function loadVocabulary(from='lv', to='en'){
  const base = `data/${from}-${to}/`;
  const idxRes = await fetch(base + 'units.json');
  if(!idxRes.ok) throw new Error('Units index not found');
  const idx = await idxRes.json();

  const unitPromises = idx.units.map(async u => {
    const res = await fetch(base + u.file);
    return res.ok ? await res.json() : null;
  });
  const units = (await Promise.all(unitPromises)).filter(Boolean);

  const forgeRes = await fetch(base + 'forge.json');
  const forgeData = forgeRes.ok ? await forgeRes.json() : {entries:[], notes:{}};
  state.DATA = { units, forge: forgeData.entries || [], notes: forgeData.notes || {} };
  state.targetLang = to;
}

async function startInit(){
  await loadTranslations(currentLang);
  setupEventListeners();
  try {
    const target = currentLang === 'ru' ? 'ru' : 'en';
    await loadVocabulary('lv',target);
  } catch(e){
    console.error('Failed to load vocabulary', e);
    loadingOverlay.textContent = i18n.labels?.loadError || 'Failed to load data';
    canvasElement.classList.remove('loading');
    return;
  }
  const startGame = () => {
    try {
      initializeGame();
    } catch (err) {
      console.error('Initialization error', err);
      loadingOverlay.textContent = i18n.labels?.loadError || 'Failed to load data';
      canvasElement.classList.remove('loading');
    }
  };

  if (document.fonts && document.fonts.ready) {
    const ready = Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);
    ready.then(() => setTimeout(startGame, 50)).catch(startGame);
  } else {
    setTimeout(startGame, 150);
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', startInit);
} else { startInit(); }

export { startInit, exportCSV };
