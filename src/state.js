export function mulberry32(a){
  return function(){
    a|=0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a>>>15, 1 | a);
    t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296;
  }
}
export const MODES = { MATCH:'MATCH', FORGE:'FORGE' };
export const state = {
  mode: MODES.MATCH,
  difficulty: 'practice',
  deckSizeMode: 'auto',
  roundIndex: 0,
  rng: mulberry32(Date.now() >>> 0),
  matchState: null,
  forgeState: null,
  results: [],
  showHelp: false,
  DATA: null
};
export function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=(state.rng()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }
export function choice(arr){ return arr[(state.rng()*arr.length)|0]; }
export function now(){ return performance.now(); }
export const HELP_TEXT = [
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
export function setStatus(s){ document.getElementById('status').textContent = s || ''; }
export let clickables = [];
export function hitAt(x,y){ for(const c of clickables){ if(x>=c.x && x<=c.x+c.w && y>=c.y && y<=c.y+c.h) return c; } return null; }
export function resetClicks(){ clickables.length=0; }
let redraw=()=>{};
export function setRedraw(fn){ redraw = fn; }
export function triggerRedraw(){ redraw(); }
