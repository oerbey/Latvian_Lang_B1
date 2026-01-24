import { canvas, updateCanvasScale, getCanvasCoordinates, renderConfetti, roundedRect, drawText, W, H, scale, setConfettiRenderer } from './src/lib/render.js';
import { getState, setState, updateState, MODES, setRedraw, HELP_TEXT, setHelpText, triggerRedraw } from './src/lib/state.js';
import { clickables, hitAt } from './src/lib/clickables.js';
import { setStatus, setStatusHandler } from './src/lib/status.js';
import { startMatchRound, drawMatch } from './src/lib/match.js';
import { startForgeRound, drawForge } from './src/lib/forge.js';
import { $id, mustId, on } from './src/lib/dom.js';
import { assetUrl } from './src/lib/paths.js';
import { installGlobalErrorHandlers, showFatalError } from './src/lib/errors.js';
import { setTrustedHTML } from './src/lib/safeHtml.js';

installGlobalErrorHandlers();
setStatusHandler((message) => {
  mustId('status').textContent = message || '';
});

let i18n = {};
let currentLang = 'lv';
let usingOfflineTranslations = false;
let usingOfflineVocabulary = false;

const deepCopy = (value) => JSON.parse(JSON.stringify(value));

async function loadTranslations(lang){
  usingOfflineTranslations = false;
  let resolvedLang = lang;
  let data = null;
  try {
    const url = assetUrl(`i18n/${lang}.json`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load ${url}: ${res.status}`);
    }
    data = await res.json();
  } catch (err) {
    console.warn('Failed to fetch translations', lang, err);
  }

  if (!data) {
    if (window.__LL_I18N__?.[lang]) {
      data = window.__LL_I18N__[lang];
      usingOfflineTranslations = true;
    } else if (window.__LL_I18N__?.en) {
      data = window.__LL_I18N__.en;
      resolvedLang = 'en';
      usingOfflineTranslations = true;
      console.warn(`Falling back to embedded English translations for ${lang}.`);
    }
  }

  if (!data) {
    throw new Error('Failed to load translations');
  }

  i18n = deepCopy(data);
  currentLang = resolvedLang;
  document.documentElement.lang = resolvedLang;
  applyTranslations();
}

function applyTranslations(){
  document.title = i18n.html.title;
  const weekBadge = document.querySelector('.week-badge');
  if (weekBadge) weekBadge.textContent = i18n.badge;
  mustId('title').textContent = i18n.gameTitle;
  const btnMatch = mustId('mode-match');
  btnMatch.textContent = i18n.buttons.modeMatch;
  const btnForge = mustId('mode-forge');
  btnForge.textContent = i18n.buttons.modeForge;
  const btnPractice = mustId('btn-practice');
  btnPractice.textContent = i18n.buttons.practice;
  btnPractice.setAttribute('aria-label', i18n.buttons.practice);
  const btnChallenge = mustId('btn-challenge');
  btnChallenge.textContent = i18n.buttons.challenge;
  btnChallenge.setAttribute('aria-label', i18n.buttons.challenge);
  mustId('btn-prev').setAttribute('aria-label', i18n.buttons.prevAria);
  mustId('btn-next').setAttribute('aria-label', i18n.buttons.nextAria);
  const deckBtn = mustId('btn-deck-size');
  deckBtn.setAttribute('aria-label', i18n.buttons.deckSizeAria);
  const { deckSizeMode } = getState();
  deckBtn.title = deckSizeMode === 'auto' ? i18n.deckSize.titleAuto : i18n.deckSize.titleFull;
  const btnExport = mustId('btn-export');
  btnExport.textContent = i18n.buttons.export;
  btnExport.setAttribute('aria-label', i18n.buttons.exportAria);
  const btnHelp = mustId('btn-help');
  btnHelp.textContent = i18n.buttons.help;
  btnHelp.setAttribute('aria-label', i18n.buttons.helpAria);
  const loadingEl = mustId('loading');
  loadingEl.textContent = i18n.labels.loading;
  setTrustedHTML(mustId('legend'), i18n.labels.legend);
  const langSel = mustId('language-select');
  langSel.value = currentLang;
  langSel.setAttribute('aria-label', i18n.labels.languageSelect);
  mustId('ui').setAttribute('aria-label', i18n.labels.controls);
  mustId('sr-game-state').setAttribute('aria-label', i18n.labels.gameState);
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
  clickables.push({x:bx,y:by,w:bw,h:bh,onClick:()=>{ updateState(state => { state.showHelp = false; }); triggerRedraw(); }});
}

function draw(){
  const state = getState();
  if(state.mode===MODES.MATCH){
    if(state.matchState) drawMatch();
  } else {
    if(state.forgeState) drawForge();
  }
  renderConfetti();
  if(state.showHelp) drawHelp();
}
setRedraw(draw);
setConfettiRenderer(draw);

function toggleDeckSize(){
  updateState(state => {
    state.deckSizeMode = state.deckSizeMode === 'auto' ? 'full' : 'auto';
  });
  const state = getState();
  const btn = $id('btn-deck-size');
  if (btn) {
    btn.textContent = state.deckSizeMode === 'auto' ? '📏' : '📜';
    btn.title = state.deckSizeMode === 'auto' ? i18n.deckSize.titleAuto : i18n.deckSize.titleFull;
  }
  setStatus(state.deckSizeMode === 'auto' ? i18n.status.fit : i18n.status.full);
  if(state.mode === MODES.MATCH) startMatchRound();
}

function setupEventListeners(){
  on(mustId('mode-match'), 'click', ()=>{ updateState(state => { state.mode = MODES.MATCH; state.roundIndex = 0; }); startMatchRound(); });
  on(mustId('mode-forge'), 'click', ()=>{ updateState(state => { state.mode = MODES.FORGE; state.roundIndex = 0; }); startForgeRound(); });
  on(mustId('btn-practice'), 'click', ()=>{ updateState(state => { state.difficulty = 'practice'; }); setStatus(i18n.status.practice); });
  on(mustId('btn-challenge'), 'click', ()=>{ updateState(state => { state.difficulty = 'challenge'; }); setStatus(i18n.status.challenge); });
  on(mustId('btn-prev'), 'click', ()=>{ updateState(state => { state.roundIndex = Math.max(0, state.roundIndex - 1); }); const { mode } = getState(); mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  on(mustId('btn-next'), 'click', ()=>{ updateState(state => { state.roundIndex += 1; }); const { mode } = getState(); mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  on(mustId('btn-deck-size'), 'click', toggleDeckSize);
  on(mustId('btn-help'), 'click', ()=>{ updateState(state => { state.showHelp = !state.showHelp; }); triggerRedraw(); });
  on(mustId('btn-export'), 'click', exportCSV);
  on(mustId('language-select'), 'change', async e=>{
    const lang = e.target.value;
    try {
      await loadTranslations(lang);
      const target = lang === 'ru' ? 'ru' : 'en';
      await loadVocabulary('lv', target);

      updateState(state => { state.roundIndex = 0; });
      const { mode } = getState();
      mode===MODES.MATCH?startMatchRound():startForgeRound();
    } catch(err) {
      console.error('Failed to load translations', err);
      alert('Failed to load translations');
      e.target.value = currentLang;
    }
  });
  on(canvas, 'mousemove', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    canvas.style.cursor = hitAt(coords.x, coords.y) ? 'pointer' : 'default';
  });
  on(canvas, 'click', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const t = hitAt(coords.x, coords.y);
    if(t && t.onClick) t.onClick({ x: coords.x, y: coords.y, target: t });
  });
  let touchStartY = null;
  let touchStartScrollY = 0;
  let touchStartTime = 0;
  let touchMoved = false;
    on(canvas, 'touchstart', e=>{
      const t=e.touches[0];
      getCanvasCoordinates(t.clientX, t.clientY);
      touchStartY = t.clientY; touchStartTime = Date.now();
      const state = getState();
      touchStartScrollY = state.matchState ? state.matchState.scrollY : 0;
      touchMoved = false;
    }, { passive: true });
    on(canvas, 'touchmove', e=>{
      const t = e.touches[0];
      const dy = t.clientY - touchStartY;
      if(Math.abs(dy) > 5) touchMoved = true;
      const state = getState();
      if(state.mode === MODES.MATCH && state.matchState){
        const viewH = state.matchState.viewBottom - state.matchState.viewTop;
        const maxScroll = Math.max(0, state.matchState.contentH - viewH);
        updateState(state => {
          const ms = state.matchState;
          if (!ms) return;
          const viewH = ms.viewBottom - ms.viewTop;
          const maxScroll = Math.max(0, ms.contentH - viewH);
          ms.scrollY = Math.max(0, Math.min(maxScroll, touchStartScrollY - dy));
        });
        triggerRedraw();
        if (maxScroll > 0) {
          e.preventDefault();
        }
      }
    }, { passive: false });
  on(canvas, 'touchend', e=>{
    const dt = Date.now()-touchStartTime;
    if(dt<200 && !touchMoved){
      const t=e.changedTouches[0];
      const coords=getCanvasCoordinates(t.clientX,t.clientY);
      const hit=hitAt(coords.x,coords.y);
      if(hit&&hit.onClick){ hit.onClick({ x: coords.x, y: coords.y, target: hit }); e.preventDefault(); }
    }
  }, { passive: false });
    on(canvas, 'wheel', e=>{
      const state = getState();
      if(state.mode !== MODES.MATCH || !state.matchState) return;
      const viewH = state.matchState.viewBottom - state.matchState.viewTop;
      const maxScroll = Math.max(0, state.matchState.contentH - viewH);
      updateState(state => {
        const ms = state.matchState;
        if (!ms) return;
        const viewH = ms.viewBottom - ms.viewTop;
        const maxScroll = Math.max(0, ms.contentH - viewH);
        ms.scrollY = Math.max(0, Math.min(maxScroll, ms.scrollY + e.deltaY));
      });
      triggerRedraw();
      if (maxScroll > 0) {
        e.preventDefault();
      }
    }, { passive: false });
  on(window, 'resize', ()=>{ updateCanvasScale(); triggerRedraw(); });
  on(document, 'keydown', e=>{
    if(e.key==='1'){ updateState(state => { state.mode = MODES.MATCH; }); startMatchRound(); }
    if(e.key==='2'){ updateState(state => { state.mode = MODES.FORGE; }); startForgeRound(); }
    if(e.key==='h' || e.key==='H'){ updateState(state => { state.showHelp = !state.showHelp; }); triggerRedraw(); }
    if(e.key==='r' || e.key==='R'){ const { mode } = getState(); mode===MODES.MATCH?startMatchRound():startForgeRound(); }
    if(e.key==='d' || e.key==='D') toggleDeckSize();
  });
}

function exportCSV(){
  const rows = [["mode","timestamp","correct","total","time_s","detail"].join(",")];
  const state = getState();
  for(const r of state.results){ const d = JSON.stringify(r.details).replaceAll('"','""'); rows.push([r.mode,r.ts,r.correct,r.total,r.time,`"${d}"`].join(",")); }
  const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download="b1_game_results.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

const loadingOverlay = $id('loading');
const canvasElement = canvas;
if (loadingOverlay) loadingOverlay.classList.add('visible');
canvasElement.classList.add('loading');

function initializeGame(){
  updateCanvasScale();
  startMatchRound();
  if (loadingOverlay) loadingOverlay.classList.remove('visible');
  canvasElement.classList.remove('loading');
}

async function loadVocabulary(from='lv', to='en'){
  usingOfflineVocabulary = false;
  const base = `data/${from}-${to}/`;
  try {
    const indexUrl = assetUrl(base + 'units.json');
    const idxRes = await fetch(indexUrl);
    if (!idxRes.ok) throw new Error(`Failed to load ${indexUrl}: ${idxRes.status}`);
    const idx = await idxRes.json();

    const unitPromises = idx.units.map(async u => {
      const unitUrl = assetUrl(base + u.file);
      const res = await fetch(unitUrl);
      if (!res.ok) throw new Error(`Failed to load ${unitUrl}: ${res.status}`);
      return res.json();
    });
    const units = await Promise.all(unitPromises);

    const forgeUrl = assetUrl(base + 'forge.json');
    const forgeRes = await fetch(forgeUrl);
    if (!forgeRes.ok) throw new Error(`Failed to load ${forgeUrl}: ${forgeRes.status}`);
    const forgeData = await forgeRes.json();
    setState({ DATA: { units, forge: forgeData.entries || [], notes: forgeData.notes || {} }, targetLang: to });
    return;
  } catch (err) {
    console.warn(`Failed to load vocabulary via fetch for ${from}-${to}`, err);
  }

  const offlineKey = `${from}-${to}`;
  const offline = window.__WEEK1_VOCAB__?.[offlineKey];
  if (!offline) {
    throw new Error(`Offline vocabulary for ${offlineKey} not available`);
  }

  usingOfflineVocabulary = true;
  const idx = offline.index;
  const units = idx.units
    .map(u => offline.units[u.file])
    .filter(Boolean)
    .map(deepCopy);
  const forgeData = deepCopy(offline.forge || { entries: [], notes: {} });
  setState({ DATA: { units, forge: forgeData.entries || [], notes: forgeData.notes || {} }, targetLang: to });
}

async function startInit(){
  try {
    await loadTranslations(currentLang);
    setupEventListeners();
  } catch (e) {
    console.error('Failed to initialize UI', e);
    showFatalError(new Error('Something went wrong loading the page. Please refresh.'));
    return;
  }
  try {
    const target = currentLang === 'ru' ? 'ru' : 'en';
    await loadVocabulary('lv',target);
  } catch(e){
    console.error('Failed to load vocabulary', e);
    showFatalError(new Error(i18n.labels?.loadError || 'Failed to load data'));
    return;
  }
  const startGame = () => {
    try {
      initializeGame();
    } catch (err) {
      console.error('Initialization error', err);
      showFatalError(new Error(i18n.labels?.loadError || 'Failed to load data'));
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
