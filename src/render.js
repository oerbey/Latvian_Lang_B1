import { state } from './state.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
export { canvas, ctx };

export let W = canvas.width, H = canvas.height;
export let scale = 1;
let canvasOffsetX = 0, canvasOffsetY = 0;

export function updateCanvasScale(){
  const containerWidth = canvas.parentElement.offsetWidth;
  const containerHeight = window.innerHeight;
  scale = Math.min(1, containerWidth / 980);
  const displayWidth = containerWidth;
  const displayHeight = containerHeight;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  const dpr = window.devicePixelRatio || 1;
  const scaledDpr = (dpr > 1 && scale < 1) ? Math.min(dpr, 2) : 1;
  canvas.width = displayWidth * scaledDpr;
  canvas.height = displayHeight * scaledDpr;
  ctx.setTransform(scaledDpr * scale, 0, 0, scaledDpr * scale, 0, 0);
  W = 980;
  H = displayHeight / scale;
  const newRect = canvas.getBoundingClientRect();
  canvasOffsetX = newRect.left;
  canvasOffsetY = newRect.top;
}

export function getCanvasCoordinates(clientX, clientY){
  return {
    x:(clientX - canvasOffsetX)/scale,
    y:(clientY - canvasOffsetY)/scale
  };
}

export function clear(){ ctx.clearRect(0,0,W,H); }

export function roundedRect(x,y,w,h,r,fillStyle,border){
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

export function drawText(txt,x,y,opts={}){
  ctx.textAlign = opts.align||'left';
  ctx.textBaseline = opts.base||'alphabetic';
  const baseFontSize = parseInt(opts.font) || 16;
  const isMobile = scale < 0.7;
  const minSize = isMobile ? 14 : 12;
  const scaleFactor = isMobile ? Math.min(2, 0.9/scale) : Math.min(1.3, scale + 0.3);
  const scaledSize = Math.max(minSize, baseFontSize * scaleFactor);
  const fontFamily = opts.font ? opts.font.replace(/\d+px/, scaledSize + 'px') : `${scaledSize}px system-ui`;
  ctx.font = fontFamily;
  ctx.fillStyle = opts.color||'#e9eef5';
  ctx.textRenderingOptimization = 'optimizeSpeed';
  ctx.fillText(txt,x,y);
}

export function drawBadge(txt,x,y,color){
  ctx.font='12px system-ui';
  const pad=6; const w=ctx.measureText(txt).width+pad*2;
  roundedRect(x,y-14,w,18,9,color);
  drawText(txt,x+pad,y+2,{font:'12px system-ui',color:'#fff'});
}

let bursts=[];
export function confetti(y){
  for(let i=0;i<14;i++){
    bursts.push({x:W/2+(state.rng()*160-80), y:y+(state.rng()*20-10), vx:state.rng()*2-1, vy:-2-state.rng()*2, life:60});
  }
}
export function renderConfetti(){
  if(!bursts.length) return false;
  bursts.forEach(b=>{ b.x+=b.vx; b.y+=b.vy; b.vy+=0.06; b.life--; });
  bursts = bursts.filter(b=>b.life>0);
  ctx.save();
  bursts.forEach(b=>{ ctx.globalAlpha=Math.max(0,b.life/60); roundedRect(b.x,b.y,6,6,2,`hsl(${(b.x+b.y)%360}deg 60% 60%)`); });
  ctx.restore();
  return bursts.length>0;
}
