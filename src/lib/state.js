import { mustId } from './dom.js';
import { MULBERRY32_CONSTANT } from './constants.js';
import { pickRandom, shuffleInPlace } from './utils.js';

export function mulberry32(a){
  return function(){
    a|=0; a = a + MULBERRY32_CONSTANT | 0;
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
  DATA: null,
  targetLang: 'en'
};
export function shuffle(arr){ return shuffleInPlace(arr, state.rng); }
export function choice(arr){ return pickRandom(arr, state.rng); }
export function now(){ return performance.now(); }
export let HELP_TEXT = '';
export function setHelpText(t){ HELP_TEXT = t; }
export function setStatus(s){ mustId('status').textContent = s || ''; }
export let clickables = [];
export function hitAt(x,y){ for(const c of clickables){ if(x>=c.x && x<=c.x+c.w && y>=c.y && y<=c.y+c.h) return c; } return null; }
export function resetClicks(){ clickables.length=0; }
let redraw=()=>{};
export function setRedraw(fn){ redraw = fn; }
export function triggerRedraw(){ redraw(); }
