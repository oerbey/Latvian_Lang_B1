import { state, shuffle, choice, now, resetClicks, clickables, setStatus, triggerRedraw } from './state.js';
import { W, H, scale, roundedRect, drawText, clear, confetti, ctx } from './render.js';

export const ALL_PREFIXES = ["iz","pār","no","sa","ap","ie","pie","uz","at","aiz","pa"];

export function startForgeRound(){
  const pool = state.DATA.forge.slice();
  const pick = pool[(state.roundIndex)%pool.length];
  const opts = new Set([pick.correct]);
  while(opts.size<5) opts.add(choice(ALL_PREFIXES));
  const options = shuffle(Array.from(opts));
  state.forgeState = { base: pick.base, en: pick.en, correct: pick.correct, options, chosen:null, start:now(), correctCount:0, total:1, detail:[] };
  triggerRedraw();
}

export function drawForge(){
  const fs = state.forgeState;
  clear(); resetClicks();
  drawText("PREFIX FORGE — pievieno pareizo priedēkli", 28, 40, {font:'bold 22px system-ui'});
  drawText("EN: "+fs.en, 28, 78, {font:'16px system-ui', color:'#a8b3c7'});
  drawText(`_____${fs.base}`, 28, 120, {font:'bold 30px system-ui'});
  drawText("Priedēkļu īsās nozīmes (tap for hint):", 28, 160, {font:'14px system-ui', color:'#9fb3ff'});
  let nx=28, ny=182; const hintRowMax = W-200;
  ALL_PREFIXES.forEach(p=>{
    const label = p+"-"; const w=ctx.measureText(label).width+20;
    roundedRect(nx,ny,w,32,10,'#22314a','#3f5675');
    drawText(label, nx+10, ny+22, {font:'16px system-ui'});
    const hint = state.DATA.notes['prefix:'+p] || '—';
    clickables.push({x:nx,y:ny,w:w,h:32,onClick:()=>setStatus(`Hint: ${p}- → ${hint}`)});
    nx += w + 10; if(nx>hintRowMax){ nx=28; ny+=36; }
  });
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
      state.results.push({mode:'FORGE', ts:new Date().toISOString(), correct: ok?1:0, total:1, time:(((now()-fs.start)|0)/1000), details:[...fs.detail]});
      state.roundIndex++; startForgeRound();
    }});
    ox += bw + gap;
  });
}
