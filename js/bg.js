'use strict';
/* ===== DÉCOR ANIMÉ : de grandes touches dérivent lentement derrière les menus (arrêté pendant le jeu) ===== */
const bgc=document.getElementById('bg'),bg=bgc.getContext('2d');
let tiles=[],bw=0,bh=0,bgRaf=0,BG_ON=false;
function bgResize(){const d=Math.min(devicePixelRatio||1,2);bw=innerWidth;bh=innerHeight;bgc.width=bw*d;bgc.height=bh*d;bg.setTransform(d,0,0,d,0,0);
 tiles=[];for(let i=0;i<14;i++)tiles.push({l:i%4,y:Math.random()*bh,h:90+Math.random()*180,v:12+Math.random()*26,a:.08+Math.random()*.12})}
function bgFrame(){
 bg.fillStyle=THEME_BG;bg.fillRect(0,0,bw,bh);const lw=bw/4;
 for(const t of tiles){
  if(!S.tech.reduce)t.y+=t.v/60;
  if(t.y-t.h>bh){t.y=-10;t.l=Math.floor(Math.random()*4)}
  const gr=bg.createLinearGradient(0,t.y-t.h,0,t.y);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,LANE_COL[t.l]);
  bg.globalAlpha=t.a*2.5;bg.fillStyle=gr;bg.fillRect(t.l*lw+10,t.y-t.h,lw-20,t.h)}
 bg.globalAlpha=1;
 if(BG_ON)bgRaf=requestAnimationFrame(bgFrame);
}
function bgRun(on){if(on===BG_ON)return;BG_ON=on;cancelAnimationFrame(bgRaf);if(on)bgFrame()}
addEventListener('resize',bgResize);bgResize();
