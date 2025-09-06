/****************************************************
 * B1 LV→EN Canvas Game
 * Modes:
 *  - MATCH RUSH (pair LV→EN)
 *  - PREFIX FORGE (add the correct prefix based on an EN clue)
 *
 * Architecture notes (important for future edits):
 *  - Everything is rendered to a single <canvas> (no DOM list items).
 *  - Clickable areas are tracked manually in an array (simple AABB hit-test).
 *  - A deterministic-ish RNG (mulberry32) makes shuffles stable per session.
 *  - Results live in-memory and can be exported to CSV.
 *  - NEW: Match Rush now supports VERTICAL SCROLL inside the canvas, with
 *         mouse wheel + keyboard (↑/↓, PgUp/PgDn, Home/End) + a visual bar.
 ****************************************************/

/* =====================
   DATA: vocabulary & prefix hints (LV→EN)
   ===================== */
let DATA = null;

/* =====================
   GLOBAL STATE & helpers
   ===================== */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// RESPONSIVE CANVAS SCALING
let scale = 1;
let canvasOffsetX = 0;
let canvasOffsetY = 0;

function updateCanvasScale() {
  const containerWidth = canvas.parentElement.offsetWidth;

  // Calculate scale based on container width vs canvas native width
  scale = Math.min(1, containerWidth / 980);

  // Update canvas display size while keeping internal resolution
  const displayWidth = 980 * scale;
  const displayHeight = 560 * scale;

  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  // Handle high DPI displays - reset transform each call to avoid cumulative scaling
  const dpr = window.devicePixelRatio || 1;
  const scaledDpr = (dpr > 1 && scale < 1) ? Math.min(dpr, 2) : 1;

  // Resize internal canvas resolution and reset transform
  canvas.width = 980 * scaledDpr;
  canvas.height = 560 * scaledDpr;
  ctx.setTransform(scaledDpr, 0, 0, scaledDpr, 0, 0);

  // Update constants used in drawing
  W = 980;
  H = 560;

  // Store offsets for coordinate conversion
  const newRect = canvas.getBoundingClientRect();
  canvasOffsetX = newRect.left;
  canvasOffsetY = newRect.top;
}

// Convert screen coordinates to canvas coordinates
function getCanvasCoordinates(clientX, clientY) {
  return {
    x: (clientX - canvasOffsetX) / scale,
    y: (clientY - canvasOffsetY) / scale
  };
}
const MODES = { MATCH:'MATCH', FORGE:'FORGE' };
let mode = MODES.MATCH;                  // current game mode
let difficulty = 'practice';             // 'practice' | 'challenge'
let deckSizeMode = 'auto';              // 'auto' (fit screen) | 'full' (all items, scroll)
let roundIndex = 0;                      // advances each round
let rng = mulberry32(Date.now() >>> 0);  // seeded rng for shuffle

let matchState = null; // state object for MATCH mode
let forgeState = null; // state object for FORGE mode

let results = []; // history of rounds; exported to CSV

// Minimal help popup text (LV for the learners, UI text kept concise)
let showHelp = false;
const HELP_TEXT = [
  "▶ MATCH RUSH — Klikšķini pāri: vispirms LV vārds, tad tā EN nozīme.",
  "Kļūdas praksē rāda īsu skaidrojumu (piem., -ties = refleksīvs).",
  "Challenge režīmā ir taimeris un sirdis.",
  "",
  "📏 Deck Size — Pārslēdz starp 'fit screen' (bez ritināšanas)",
  "un 'full deck' (ar ritināšanu, vairāk vārdu).",
  "",
  "▶ PREFIX FORGE — Pievieno pareizo priedēkli pie verbu saknes",
  "(piem., __mainīt → izmainīt) pēc dotās EN nozīmes.",
  "",
  "Īsceļi: [1] Match, [2] Forge, [H] help, [R] restart, [D] deck size."
].join("\n");

/* ---------- Utility: RNG & small helpers ---------- */
function mulberry32(a){
  // Tiny deterministic RNG; good enough for UI shuffles
  return function(){
    a|=0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a>>>15, 1 | a);
    t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  }
}
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=(rng()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }
function choice(arr){ return arr[(rng()*arr.length)|0]; }
function now(){ return performance.now(); }

/* ---------- Canvas layout constants ---------- */
let W = canvas.width, H = canvas.height;
function clear(){ ctx.clearRect(0,0,W,H); }

/* ---------- Drawing primitives (rounded rect, text, badge) ---------- */
function roundedRect(x,y,w,h,r,fillStyle,border){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  if(fillStyle){ ctx.fillStyle=fillStyle; ctx.fill(); }
  if(border){ ctx.strokeStyle=border; ctx.lineWidth=2; ctx.stroke(); }
}
function drawText(txt,x,y,opts={}){
  ctx.textAlign = opts.align||'left';
  ctx.textBaseline = opts.base||'alphabetic';
  
  // Scale font size for mobile readability
  const baseFontSize = parseInt(opts.font) || 16;
  const isMobile = scale < 0.7;
  const minSize = isMobile ? 11 : 12;
  const scaleFactor = isMobile ? 1.1 : Math.min(1, scale + 0.3);
  const scaledSize = Math.max(minSize, baseFontSize * scaleFactor);
  
  const fontFamily = opts.font ? opts.font.replace(/\d+px/, scaledSize + 'px') : `${scaledSize}px system-ui`;
  
  ctx.font = fontFamily;
  ctx.fillStyle = opts.color||'#e9eef5';
  
  // Better text rendering for high DPI
  ctx.textRenderingOptimization = 'optimizeSpeed';
  ctx.fillText(txt,x,y);
}
function drawBadge(txt,x,y,color){
  ctx.font='12px system-ui';
  const pad=6; const w=ctx.measureText(txt).width+pad*2;
  roundedRect(x,y-14,w,18,9,color); drawText(txt,x+pad,y+2,{font:'12px system-ui',color:'#fff'});
}

/* ---------- Hit testing registry ---------- */
let clickables = []; // items: {x,y,w,h,onClick,tag,data}

function hitAt(x,y){ for(const c of clickables){ if(x>=c.x && x<=c.x+c.w && y>=c.y && y<=c.y+c.h) return c; } return null; }
function resetClicks(){ clickables.length=0; }

/* ---------- Status text (top-right) ---------- */
function setStatus(s){ document.getElementById('status').textContent = s || ''; }

/****************************************************
 * EVENT LISTENER SETUP
 ****************************************************/
function setupEventListeners(){
  // Control bar (top buttons)
  document.getElementById('mode-match').addEventListener('click', ()=>{ mode=MODES.MATCH; roundIndex=0; startMatchRound(); });
  document.getElementById('mode-forge').addEventListener('click', ()=>{ mode=MODES.FORGE; roundIndex=0; startForgeRound(); });
  document.getElementById('btn-practice').addEventListener('click', ()=>{ difficulty='practice'; setStatus("Practice režīms"); });
  document.getElementById('btn-challenge').addEventListener('click', ()=>{ difficulty='challenge'; setStatus("Challenge režīms (Match = ♥♥♥)"); });
  document.getElementById('btn-prev').addEventListener('click', ()=>{ roundIndex=Math.max(0,roundIndex-1); mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  document.getElementById('btn-next').addEventListener('click', ()=>{ roundIndex++; mode===MODES.MATCH?startMatchRound():startForgeRound(); });
  document.getElementById('btn-deck-size').addEventListener('click', ()=>{
    deckSizeMode = deckSizeMode === 'auto' ? 'full' : 'auto';
    const btn = document.getElementById('btn-deck-size');
    btn.textContent = deckSizeMode === 'auto' ? '📏' : '📜';
    btn.title = deckSizeMode === 'auto' ? 'Switch to full deck (scrollable)' : 'Switch to fit screen (no scroll)';
    setStatus(deckSizeMode === 'auto' ? 'Fit to screen mode' : 'Full deck mode (scrollable)');
    if(mode === MODES.MATCH) startMatchRound();
  });
  document.getElementById('btn-help').addEventListener('click', ()=>{ showHelp=!showHelp; draw(); });
  document.getElementById('btn-export').addEventListener('click', exportCSV);

  // Mouse events with coordinate conversion
  canvas.addEventListener('mousemove', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    canvas.style.cursor = hitAt(coords.x, coords.y) ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', e=>{
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    const t = hitAt(coords.x, coords.y);
    if(t && t.onClick) t.onClick(t);
  });

  // Touch events for mobile with improved iOS/Android compatibility
  let touchStartY = null;
  let touchStartTime = 0;
  let touchMoved = false;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartTime = Date.now();
    touchMoved = false;

    // Handle scroll gesture vs tap
    if(mode === MODES.MATCH && matchState && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;

      // Improved touch detection for iOS
      const checkTap = () => {
        if(touchStartY !== null && !touchMoved) {
          const touch = e.touches[0];
          if(touch) {
            const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
            const t = hitAt(coords.x, coords.y);
            if(t && t.onClick) {
              touchStartY = null;
              t.onClick(t);
            }
          }
        }
      };

      requestAnimationFrame(() => {
        setTimeout(checkTap, 50);
      });
    } else {
      const touch = e.touches[0];
      if(touch) {
        const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
        const t = hitAt(coords.x, coords.y);
        if(t && t.onClick) t.onClick(t);
      }
    }
  }, {passive: false});

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    touchMoved = true;

    if(mode === MODES.MATCH && matchState && deckSizeMode === 'full' && touchStartY !== null && e.touches.length === 1) {
      const touchY = e.touches[0].clientY;
      const deltaY = (touchStartY - touchY) * 1.5;
      touchStartY = touchY;

      const ms = matchState;
      const viewH = ms.viewBottom - ms.viewTop;
      const maxScroll = Math.max(0, ms.contentH - viewH);
      ms.scrollY = Math.max(0, Math.min(maxScroll, ms.scrollY + deltaY));
      draw();
    }
  }, {passive: false});

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const touchDuration = Date.now() - touchStartTime;

    if(!touchMoved && touchDuration < 200) {
      const touch = e.changedTouches[0];
      if(touch) {
        const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
        const t = hitAt(coords.x, coords.y);
        if(t && t.onClick) t.onClick(t);
      }
    }

    touchStartY = null;
    touchMoved = false;
  }, {passive: false});

  // Keyboard & INPUT — includes SCROLLING for Match
  window.addEventListener('keydown', (e)=>{
    if(e.key==='1'){ document.getElementById('mode-match').click(); }
    if(e.key==='2'){ document.getElementById('mode-forge').click(); }
    if(e.key==='h' || e.key==='H'){ document.getElementById('btn-help').click(); }
    if(e.key==='r' || e.key==='R'){ mode===MODES.MATCH?startMatchRound():startForgeRound(); }
    if(e.key==='d' || e.key==='D'){ document.getElementById('btn-deck-size').click(); }

    // Scroll keys active only in MATCH mode when content exceeds viewport
    if(mode===MODES.MATCH && matchState && deckSizeMode === 'full'){
      const ms = matchState; const viewH = ms.viewBottom - ms.viewTop; const maxScroll = Math.max(0, ms.contentH - viewH);
      if(maxScroll > 0) {
        const step = 30; const page = Math.max(120, viewH - 80);
        if(e.key==='ArrowDown'){ ms.scrollY = Math.min(maxScroll, ms.scrollY + step); draw(); }
        if(e.key==='ArrowUp'){   ms.scrollY = Math.max(0,         ms.scrollY - step); draw(); }
        if(e.key==='PageDown'){  ms.scrollY = Math.min(maxScroll, ms.scrollY + page); draw(); }
        if(e.key==='PageUp'){    ms.scrollY = Math.max(0,         ms.scrollY - page); draw(); }
        if(e.key==='End'){       ms.scrollY = maxScroll; draw(); }
        if(e.key==='Home'){      ms.scrollY = 0;         draw(); }
      }
    }
  });

  // Mouse wheel scrolling for MATCH mode (only in full deck mode)
  canvas.addEventListener('wheel', (e)=>{
    if(mode!==MODES.MATCH || !matchState || deckSizeMode !== 'full') return;
    const ms = matchState; const viewH = ms.viewBottom - ms.viewTop; const maxScroll = Math.max(0, ms.contentH - viewH);
    if(maxScroll === 0) return;
    e.preventDefault();
    const delta = Math.sign(e.deltaY) * 40;
    ms.scrollY = Math.max(0, Math.min(maxScroll, ms.scrollY + delta));
    draw();
  }, {passive:false});

  // Window resize handler for responsive canvas
  window.addEventListener('resize', () => {
    updateCanvasScale();
    if (matchState || forgeState) draw();
  });
}

/****************************************************
 * MODE: MATCH RUSH (pairs) — NOW WITH SCROLL
 ****************************************************/
function buildMatchDeck(){
  // Flatten all unit entries into a single deck (preserving unit name)
  return DATA.units.flatMap(u=>u.entries.map(e=>({...e, unit:u.name})));
}
function startMatchRound(){
  const deck = buildMatchDeck();
  let maxItems;
  
  if(deckSizeMode === 'auto') {
    // Adaptive deck size based on screen height - no scrolling needed
    const isMobile = scale < 0.7;
    const availableHeight = H - 140; // Header + footer space
    const boxH = isMobile ? 52 : 46;
    const gap = isMobile ? 10 : 14;
    const maxItemsOnScreen = Math.floor(availableHeight / (boxH + gap));
    maxItems = Math.max(5, Math.min(maxItemsOnScreen, deck.length)); // At least 5, max what fits
  } else {
    // Full deck mode - use all items, may require scrolling
    maxItems = Math.min(15, deck.length); // Cap at 15 to avoid performance issues
  }
  
  const picks = shuffle(deck.slice()).slice(0,maxItems);
  const left  = picks.map(p=>({txt:p.lv, key:p.lv, meta:p})); // match by LV string key
  const right = picks.map(p=>({txt:p.en, key:p.lv, meta:p})); // EN tiles carry same key
  shuffle(right);
  matchState = {
    left, right,
    selected:null,
    solved:new Set(),
    correct:0, total:maxItems,
    start:now(),
    lives: difficulty==='challenge'?3:Infinity,
    feedback:null,
    errors:0,
    detail:[],
    // SCROLL fields:
    scrollY: 0,            // current vertical scroll offset (px)
    contentH: 0,           // computed total list height (px)
    viewTop: 100,          // top Y for the scrollable list
    viewBottom: H-40,      // bottom Y limit for the list
  };
  draw();
}
function drawMatch(){
  clear(); resetClicks();

  // Header
  drawText("MATCH RUSH — LV → EN", 28, 40, {font:'bold 22px system-ui'});
  const ms = matchState; const elapsed=((now()-ms.start)/1000)|0;
  drawText(`Correct: ${ms.correct}/${ms.total}  |  Time: ${elapsed}s  |  ${ms.lives===Infinity?'∞':('♥'.repeat(ms.lives))}`, W-20, 40, {align:'right',font:'16px system-ui',color:'#a8b3c7'});
  if(ms.feedback){ drawBadge(ms.feedback, 28, 58, ms.feedback.startsWith('Pareizi')? '#2f9e44' : '#8a2b2b'); }

  // Layout constants for tiles - RESPONSIVE
  const isMobile = scale < 0.7; // Detect smaller screens
  const Lx = isMobile ? 20 : 60;
  const boxW = isMobile ? Math.min(280, (W - 60) / 2) : 360;
  const boxH = isMobile ? 52 : 46;
  const gap = isMobile ? 10 : 14;
  const Rx = isMobile ? W - 20 - boxW : W - 60 - boxW;
  const top=ms.viewTop;                   // scrollable viewport top
  const viewH = ms.viewBottom - ms.viewTop; // viewport height

  // Column headers
  drawText("LV", Lx, top-22, {font:'bold 16px system-ui', color:'#9fb3ff'});
  drawText("EN", Rx, top-22, {font:'bold 16px system-ui', color:'#9fb3ff'});

  // Compute total content height once (both columns have same item count & heights)
  const totalItems = ms.left.length; // equals ms.right.length
  const contentH = totalItems*(boxH+gap) - gap; // last item has no trailing gap
  ms.contentH = contentH;
  const maxScroll = Math.max(0, contentH - viewH);
  if(ms.scrollY>maxScroll) ms.scrollY = maxScroll; // clamp if list shrank

  // Helper: draw one column (only visible items within viewport)
  function drawColumn(items, x, side){
    for(let i=0;i<items.length;i++){
      // y-position with virtual scroll applied
      const y = top + i*(boxH+gap) - ms.scrollY;
      // Skip if outside viewport to avoid painting and clickables we can't see
      if(y>ms.viewBottom || y+boxH<top) continue;

      const it = items[i];
      const solved = ms.solved.has(it.key);
      const sel = ms.selected && ms.selected.side===side && ms.selected.key===it.key;
      const color = solved? '#1e2530' : sel? '#344b7a' : '#222734';
      roundedRect(x,y,boxW,boxH,10,color, solved?'#3a4657':'#445066');
      drawText(it.txt, x+14, y+30, {font:'16px system-ui', color: solved? '#7d8aa0' : '#e9eef5'});

      // Register clickable only for visible items (perf + correctness)
      clickables.push({x,y,w:boxW,h:boxH, tag:`${side}:${i}`, data:it, onClick:()=>{
        if(solved) return;
        if(!ms.selected){ ms.selected={side, key:it.key}; draw(); return; }
        if(ms.selected.side===side){ ms.selected={side, key:it.key}; draw(); return; }
        // Compare keys cross-column
        const key = it.key;
        if(key===ms.selected.key){
          ms.solved.add(key);
          ms.correct++;
          ms.detail.push({type:'pair', lv: side==='L'?it.txt:ms.left.find(x=>x.key===key).txt,
                          en: side==='R'?it.txt:ms.right.find(x=>x.key===key).txt, ok:true});
          ms.feedback = "Pareizi ✓"; // keep LV feedback for learners
          ms.selected = null;
          confetti(y+boxH/2);
        } else {
          ms.errors++; ms.feedback = hintForMismatch(key, ms.selected.key);
          if(ms.lives!==Infinity){ ms.lives--; }
          ms.selected = null;
        }
        // End conditions
        if(ms.correct===ms.total){ endMatchRound(true); return; }
        if(ms.lives===0){ endMatchRound(false); return; }
        draw();
      }});
    }
  }

  // Draw visible tiles for both columns
  drawColumn(ms.left, Lx, 'L');
  drawColumn(ms.right, Rx, 'R');

  // Only draw scrollbar if content actually exceeds viewport
  if(maxScroll > 0){
    const trackX = W-20, trackW = 8; // Slightly wider and more accessible
    const trackY = top, trackH = viewH;
    
    // Track background
    roundedRect(trackX, trackY, trackW, trackH, 4, '#1a202a', '#2a3040');
    
    // Thumb size proportional to viewport/content ratio (min 30px for better touch)
    const thumbH = Math.max(30, (viewH * viewH) / contentH);
    const thumbY = trackY + (ms.scrollY / maxScroll) * (trackH - thumbH);
    roundedRect(trackX, thumbY, trackW, thumbH, 4, '#4a5675', '#5a6785');
    
    // Make scrollbar clickable for page up/down
    clickables.push({x:trackX,y:trackY,w:trackW,h:trackH,onClick:(t)=>{
      const clickY = t.y || trackY;
      const relativeY = clickY - trackY;
      const thumbCenter = (ms.scrollY / maxScroll) * (trackH - thumbH) + thumbH / 2;
      
      if(relativeY < thumbCenter - thumbH/2) {
        // Click above thumb - page up
        ms.scrollY = Math.max(0, ms.scrollY - viewH * 0.8);
      } else if(relativeY > thumbCenter + thumbH/2) {
        // Click below thumb - page down
        ms.scrollY = Math.min(maxScroll, ms.scrollY + viewH * 0.8);
      }
      draw();
    }});
    
    // Add scroll indicators if there's more content
    if(ms.scrollY > 0) {
      // Up arrow indicator
      drawText("↑", W-16, top-5, {font:'12px system-ui', color:'#9fb3ff', align:'center'});
    }
    if(ms.scrollY < maxScroll) {
      // Down arrow indicator
      drawText("↓", W-16, ms.viewBottom+15, {font:'12px system-ui', color:'#9fb3ff', align:'center'});
    }
  }

  if(showHelp) drawHelp();
}

// Pedagogical mismatch hinting (reflexive & prefix nudges)
function hintForMismatch(k1,k2){
  const all = DATA.units.flatMap(u=>u.entries.map(e=>e));
  const a = all.find(x=>x.lv===k1) || {}; const b = all.find(x=>x.lv===k2) || {};
  const ref = (e)=>(e.tags||[]).some(t=>t.includes('reflex'));
  if(ref(a)!==ref(b)) return "Padoms: -ties = refleksīvs (paša stāvoklis).";
  function pref(e){ const t=(e.tags||[]).find(t=>t.startsWith('prefix:')); return t? t.split(':')[1] : null; }
  const pa=pref(a), pb=pref(b);
  if(pa||pb){ const note = DATA.notes[`prefix:${pa||pb}`] || "Skaties priedēkļa nozīmi."; return "Priedēklis: " + note; }
  return "Nesakrīt. Pamēģini vēlreiz!";
}

function endMatchRound(success){
  const ms = matchState; const t = ((now()-ms.start)|0)/1000;
  results.push({mode:'MATCH', ts:new Date().toISOString(), correct:ms.correct, total:ms.total, time:t, details:ms.detail});
  setStatus(success?`Match: ${ms.correct}/${ms.total} • ${t}s`:`Beidzās dzīvības • ${ms.correct}/${ms.total}`);
  roundIndex++; // move forward and refresh
  startMatchRound();
}

// Tiny confetti burst for positive feedback
let bursts = [];
function confetti(y){ for(let i=0;i<14;i++){ bursts.push({x:W/2+(rng()*160-80), y:y+(rng()*20-10), vx:rng()*2-1, vy:-2-rng()*2, life:60}); } }

/****************************************************
 * MODE: PREFIX FORGE (unchanged mechanics)
 ****************************************************/
const ALL_PREFIXES = ["iz","pār","no","sa","ap","ie","pie","uz","at","aiz","pa"];
function startForgeRound(){
  const pool = DATA.forge.slice();
  const pick = pool[(roundIndex)%pool.length]; // deterministic but varied
  const opts = new Set([pick.correct]);
  while(opts.size<5) opts.add(choice(ALL_PREFIXES));
  const options = shuffle(Array.from(opts));
  forgeState = { base: pick.base, en: pick.en, correct: pick.correct, options, chosen:null, start:now(), correctCount:0, total:1, detail:[] };
  draw();
}
function drawForge(){
  clear(); resetClicks(); const fs = forgeState;
  drawText("PREFIX FORGE — pievieno pareizo priedēkli", 28, 40, {font:'bold 22px system-ui'});
  drawText("EN: "+fs.en, 28, 78, {font:'16px system-ui', color:'#a8b3c7'});
  drawText(`_____${fs.base}`, 28, 120, {font:'bold 30px system-ui'});

  // Hint bar with prefix mini-buttons
  drawText("Priedēkļu īsās nozīmes (tap for hint):", 28, 160, {font:'14px system-ui', color:'#9fb3ff'});
  let nx=28, ny=182; const hintRowMax = W-200;
  ALL_PREFIXES.forEach(p=>{
    const label = p+"-"; const w=ctx.measureText(label).width+20;
    roundedRect(nx,ny,w,32,10,'#22314a','#3f5675');
    drawText(label, nx+10, ny+22, {font:'16px system-ui'});
    const hint = DATA.notes['prefix:'+p] || '—';
    clickables.push({x:nx,y:ny,w:w,h:32,onClick:()=>setStatus(`Hint: ${p}- → ${hint}`)});
    nx += w + 10; if(nx>hintRowMax){ nx=28; ny+=36; }
  });

  // Multiple-choice prefix buttons - RESPONSIVE
  const isMobile = scale < 0.7;
  const oy = ny + 50;
  const bw = isMobile ? Math.min(100, (W - 80) / 5) : 120;
  const bh = isMobile ? 48 : 54;
  let ox = 28;
  const gap = isMobile ? 8 : 12;
  fs.options.forEach(p=>{
    roundedRect(ox,oy,bw,bh,12,'#2a2f3a','#445066');
    drawText(p+'-', ox+16, oy+34, {font:'bold 22px system-ui'});
    clickables.push({x:ox,y:oy,w:bw,h:bh,onClick:()=>{
      const ok = p===fs.correct; const formed = p+fs.base;
      fs.detail.push({type:'forge', formed, ok, clue:fs.en});
      if(ok){ setStatus(`Pareizi: ${formed}`); confetti(oy+bh/2); }
      else { setStatus(`Nē: ${formed}. Pareizi: ${fs.correct+fs.base}`); }
      results.push({mode:'FORGE', ts:new Date().toISOString(), correct: ok?1:0, total:1, time:(((now()-fs.start)|0)/1000), details:[...fs.detail]});
      roundIndex++; startForgeRound();
    }});
    ox += bw + gap;
  });

  if(showHelp) drawHelp();
}

/* ---------- Help popup drawing ---------- */
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
    if(yPos < y + h - 40) { // Don't draw outside help box
      drawText(line, x+pad, yPos, {font:`${fontSize}px system-ui`, color:'#d5dbe6'});
    }
  });
  
  // Close button
  const bw = isMobile ? 60 : 74;
  const bh = isMobile ? 32 : 28;
  const bx = x + w - bw - 16;
  const by = y + h - bh - 14;
  
  roundedRect(bx,by,bw,bh,10,'#334','#556');
  drawText("Aizvērt", bx + (isMobile ? 8 : 12), by + (isMobile ? 22 : 20), {font:`${isMobile ? 12 : 14}px system-ui`});
  clickables.push({x:bx,y:by,w:bw,h:bh,onClick:()=>{ showHelp=false; draw(); }});
}

/* ---------- Main draw loop & confetti animation ---------- */
function draw(){
  if(mode===MODES.MATCH) drawMatch(); else drawForge();
  // Update confetti and animate if any particles are alive
  if(bursts.length){
    bursts.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.vy+=0.06; b.life--; });
    bursts = bursts.filter(b=>b.life>0);
    ctx.save();
    bursts.forEach(b=>{ ctx.globalAlpha=Math.max(0,b.life/60); roundedRect(b.x,b.y,6,6,2,`hsl(${(b.x+b.y)%360}deg 60% 60%)`); });
    ctx.restore();
    requestAnimationFrame(draw); // keep animating while confetti exists
  }
}

/****************************************************
 * EXPORT RESULTS (CSV)
 ****************************************************/
function exportCSV(){
  const rows = [["mode","timestamp","correct","total","time_s","detail"].join(",")];
  for(const r of results){ const d = JSON.stringify(r.details).replaceAll('"','""'); rows.push([r.mode,r.ts,r.correct,r.total,r.time,`"${d}"`].join(",")); }
  const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download="b1_game_results.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* ---------- INIT ---------- */
setStatus("Gatavs. Izvēlies režīmu.");

// Show loading state
const loadingOverlay = document.getElementById('loading');
const canvasElement = document.getElementById('canvas');
loadingOverlay.classList.add('visible');
canvasElement.classList.add('loading');

// Ensure canvas is properly scaled before first draw
function initializeGame() {
  updateCanvasScale();
  startMatchRound();
  
  // Hide loading state
  loadingOverlay.classList.remove('visible');
  canvasElement.classList.remove('loading');
}

// Initialize when DOM is ready and fonts are loaded
async function loadVocabulary() {
  try {
    const res = await fetch('data/vocabulary.json');
    if (!res.ok) throw new Error('Network response was not ok');
    DATA = await res.json();
  } catch (err) {
    console.error('Failed to load vocabulary:', err);
    loadingOverlay.textContent = 'Failed to load data';
    setStatus('Failed to load data');
    throw err;
  }
}

async function startInit() {
  setupEventListeners();
  try {
    await loadVocabulary();
  } catch (e) {
    canvasElement.classList.remove('loading');
    return;
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      setTimeout(initializeGame, 50); // Small delay to ensure everything is ready
    });
  } else {
    setTimeout(initializeGame, 150);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startInit);
} else {
  startInit();
}

export { startInit, exportCSV };

