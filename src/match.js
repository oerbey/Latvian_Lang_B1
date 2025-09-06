import { state, MODES, shuffle, choice, now, resetClicks, clickables, setStatus, triggerRedraw } from './state.js';
import { W, H, scale, roundedRect, drawText, drawBadge, clear, confetti } from './render.js';

function buildMatchDeck(){
  return state.DATA.units.flatMap(u=>
    u.entries
     .filter(e=>e.games && e.games.includes('match'))
     .map(e=>({...e, unit:u.name}))
  );
}

export function startMatchRound(){
  const deck = buildMatchDeck();
  let maxItems;
  if(state.deckSizeMode === 'auto'){
    const isMobile = scale < 0.7;
    const availableHeight = H - 140;
    const targetBoxH = isMobile ? 72 : 46; // physical px
    const targetGap = isMobile ? 20 : 14; // physical px
    const maxItemsOnScreen = Math.floor((availableHeight * scale) / (targetBoxH + targetGap));
    maxItems = Math.max(5, Math.min(maxItemsOnScreen, deck.length));
  } else {
    maxItems = Math.min(15, deck.length);
  }
  const picks = shuffle(deck.slice()).slice(0,maxItems);
  const left = picks.map(p=>({txt:p.translations.lv, key:p.translations.lv, meta:p}));
  const right = picks.map(p=>({txt:p.translations.en, key:p.translations.lv, meta:p}));
  shuffle(right);
  state.matchState = {
    left, right,
    selected:null,
    solved:new Set(),
    correct:0, total:maxItems,
    start:now(),
    lives: state.difficulty==='challenge'?3:Infinity,
    feedback:null,
    errors:0,
    detail:[],
    scrollY:0,
    contentH:0,
    viewTop: (scale < 0.7 ? 80/scale : 100),
    viewBottom: H - (scale < 0.7 ? 60/scale : 40)
  };
  triggerRedraw();
}

export function drawMatch(){
  const ms = state.matchState;
  clear(); resetClicks();
  const sr = document.getElementById('sr-game-state');
  sr.innerHTML = '';
  const srList = document.createElement('ul');
  sr.appendChild(srList);
  drawText("MATCH RUSH — LV → EN", 28/scale, 40/scale, {font:'bold 22px system-ui'});
  const elapsed=((now()-ms.start)/1000)|0;
  const livesText = ms.lives === Infinity ? '∞' : '♥'.repeat(ms.lives);
  drawText(`Correct: ${ms.correct}/${ms.total}  |  Time: ${elapsed}s  |  ${livesText}`, W-20/scale, 40/scale, {align:'right',font:'16px system-ui',color:'#a8b3c7'});
  if(ms.feedback){ drawBadge(ms.feedback, 28/scale, 58/scale, ms.feedback.startsWith('Pareizi')? '#2f9e44' : '#8a2b2b'); }
  const isMobile = scale < 0.7;
  const sideMargin = isMobile ? 16/scale : 60;
  const columnGap = isMobile ? 16/scale : 40;
  const boxW = isMobile ? (W - sideMargin*2 - columnGap) / 2 : 360;
  const boxH = isMobile ? 72/scale : 46;
  const gap = isMobile ? 20/scale : 14;
  const Lx = sideMargin;
  const Rx = Lx + boxW + columnGap;
  const top=ms.viewTop;
  const viewH = ms.viewBottom - ms.viewTop;
  drawText("LV", Lx, top-22/scale, {font:'bold 16px system-ui', color:'#9fb3ff'});
  drawText("EN", Rx, top-22/scale, {font:'bold 16px system-ui', color:'#9fb3ff'});
  const totalItems = ms.left.length;
  const contentH = totalItems*(boxH+gap) - gap;
  ms.contentH = contentH;
  const maxScroll = Math.max(0, contentH - viewH);
  if(ms.scrollY>maxScroll) ms.scrollY = maxScroll;
  function handleSelection(side,it,y){
    const solved = ms.solved.has(it.key);
    if(solved) return;
    if(!ms.selected){ ms.selected={side, key:it.key}; triggerRedraw(); return; }
    if(ms.selected.side===side){ ms.selected={side, key:it.key}; triggerRedraw(); return; }
    const key = it.key;
    if(key===ms.selected.key){
      ms.solved.add(key);
      ms.correct++;
      ms.detail.push({type:'pair', lv: side==='L'?it.txt:ms.left.find(x=>x.key===key).txt,
                      en: side==='R'?it.txt:ms.right.find(x=>x.key===key).txt, ok:true});
      ms.feedback = "Pareizi ✓";
      ms.selected = null;
      confetti((y!==undefined?y:H/2));
    } else {
      ms.errors++; ms.feedback = hintForMismatch(key, ms.selected.key);
      if(ms.lives!==Infinity){ ms.lives--; }
      ms.selected = null;
    }
    if(ms.correct===ms.total){ endMatchRound(true); return; }
    if(ms.lives===0){ endMatchRound(false); return; }
    triggerRedraw();
  }
  function drawColumn(items, x, side){
    for(let i=0;i<items.length;i++){
      const y = top + i*(boxH+gap) - ms.scrollY;
      if(y>ms.viewBottom || y+boxH<top) continue;
      const it = items[i];
      const solved = ms.solved.has(it.key);
      const sel = ms.selected && ms.selected.side===side && ms.selected.key===it.key;
      const color = solved? '#1e2530' : sel? '#344b7a' : '#222734';
      roundedRect(x,y,boxW,boxH,isMobile?10/scale:10,color, solved?'#3a4657':'#445066');
      drawText(it.txt, x+14/scale, y+boxH/2+6/scale, {font:'16px system-ui', color: solved? '#7d8aa0' : '#e9eef5', align:'left'});
      const handler = ()=>handleSelection(side,it,y+boxH/2);
      clickables.push({x,y,w:boxW,h:boxH, tag:`${side}:${i}`, data:it, onClick:handler});
      const li=document.createElement('li');
      const btn=document.createElement('button');
      btn.textContent=`${side==='L'?'LV':'EN'}: ${it.txt}`;
      if(solved) btn.disabled=true;
      btn.addEventListener('click', ()=>handleSelection(side,it));
      li.appendChild(btn); srList.appendChild(li);
    }
  }
  drawColumn(ms.left, Lx, 'L');
  drawColumn(ms.right, Rx, 'R');
  if(maxScroll > 0){
    const trackX = W-20/scale, trackW = 8/scale;
    const trackY = top, trackH = viewH;
    roundedRect(trackX, trackY, trackW, trackH, 4/scale, '#1a202a', '#2a3040');
    const thumbH = Math.max(30/scale, (viewH * viewH) / contentH);
    const thumbY = trackY + (ms.scrollY / maxScroll) * (trackH - thumbH);
    roundedRect(trackX, thumbY, trackW, thumbH, 4/scale, '#4a5675', '#5a6785');
    clickables.push({x:trackX,y:trackY,w:trackW,h:trackH,onClick:(t)=>{
      const clickY = t.y || trackY;
      const relativeY = clickY - trackY;
      const thumbCenter = (ms.scrollY / maxScroll) * (trackH - thumbH) + thumbH / 2;
      if(relativeY < thumbCenter - thumbH/2) {
        ms.scrollY = Math.max(0, ms.scrollY - viewH * 0.8);
      } else if(relativeY > thumbCenter + thumbH/2) {
        ms.scrollY = Math.min(maxScroll, ms.scrollY + viewH * 0.8);
      }
      triggerRedraw();
    }});
    if(ms.scrollY > 0) {
      drawText("↑", W-16/scale, top-5/scale, {font:'12px system-ui', color:'#9fb3ff', align:'center'});
    }
    if(ms.scrollY < maxScroll) {
      drawText("↓", W-16/scale, ms.viewBottom+15/scale, {font:'12px system-ui', color:'#9fb3ff', align:'center'});
    }
  }
}

function hintForMismatch(k1,k2){
  const all = state.DATA.units.flatMap(u=>u.entries);
  const a = all.find(x=>x.translations.lv===k1) || {};
  const b = all.find(x=>x.translations.lv===k2) || {};
  const ref = (e)=>(e.tags||[]).some(t=>t.includes('reflex'));
  if(ref(a)!==ref(b)) return "Padoms: -ties = refleksīvs (paša stāvoklis).";
  function pref(e){ const t=(e.tags||[]).find(t=>t.startsWith('prefix:')); return t? t.split(':')[1] : null; }
  const pa=pref(a), pb=pref(b);
  if(pa||pb){ const note = state.DATA.notes[`prefix:${pa||pb}`] || "Skaties priedēkļa nozīmi."; return "Priedēklis: " + note; }
  return "Nesakrīt. Pamēģini vēlreiz!";
}

function endMatchRound(success){
  const ms = state.matchState; const t = ((now()-ms.start)|0)/1000;
  state.results.push({mode:'MATCH', ts:new Date().toISOString(), correct:ms.correct, total:ms.total, time:t, details:ms.detail});
  setStatus(success?`Match: ${ms.correct}/${ms.total} • ${t}s`:`Beidzās dzīvības • ${ms.correct}/${ms.total}`);
  state.roundIndex++;
  startMatchRound();
}
