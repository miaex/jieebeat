'use strict';
/* ===== ENGINE ===== */
const cv=document.getElementById('cv'),g=cv.getContext('2d',{alpha:false});
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const E={run:null,raf:0};
let LANE_COL=['#22e6c7','#7c5cff','#ff4fa3','#ffd166'],THEME_BG='#07060f',THEME_FEVER='#180a2e',FX={particles:1,ring:1,shape:'square',pal:'lane'};
let WARP={a:0,g:1,m:1};/* vitesse de chute : 1x au départ, monte jusqu'à m x à l'objectif (fonction de déformation du temps) */
function P(t){const {a,g,m}=WARP;if(t<=a||m===1)return t;const d=g-a;if(t<=g){const u=(t-a)/d;return t+(m-1)*d*u*u*u/3}return g+(m-1)*d/3+m*(t-g)}

async function startSong(song,modeName='normal',mods=[],tier=TIER){
 if(!song||!Aud.init()){toast(T('err'));return}
 store.stopPreview();show(null);
 if(CUR==='result')history.replaceState({s:'game'},'');else push('game');CUR='game';
 const mode=CFG.modes[modeName]||CFG.modes.normal;
 if(!TIERS[tier-1])tier=1;
 S.jieebeat.lastSong=song.id;Store.save();Aud.rate=mode.rate||1;Aud.setKey(song.key);
 const r=E.run={song,mode,modeName,mods:mods.slice(),tier,state:'loading',score:0,combo:0,maxCombo:0,acc:0,judged:0,counts:{PERFECT:0,GREAT:0,GOOD:0,MISS:0},
  notes:[],ptr:new Map(),parts:[],rings:[],lf:[0,0,0,0],flash:0,label:'',labelT:0,startedAt:0,holdsDone:0,scoreMul:mods.includes('turbo')?CFG.mods.turbo.score:1};
 cancelAnimationFrame(E.raf);E.raf=requestAnimationFrame(loop);
 try{await prepareSong(song,tier)}catch(e){}
 if(E.run!==r)return;
 if(!validChart(song.chart)||!(song._head||song._buf)){toast(T('audioerr'));history.back();return}/* jamais de partie muette */
 const mir=mods.includes('mirror');
 r.notes=song.chart.notes.map(n=>({...n,lane:mir?CFG.lanes-1-n.lane:n.lane,end:n.time+n.duration,state:0}));
 const f=Math.max(0,SONGS.indexOf(song))/Math.max(1,SONGS.length-1),TT=TIERS[tier-1];
 APPROACH=CFG.speedRef/(TT.v0+(TT.v1-TT.v0)*f);/* la chute accélère de morceau en morceau, et de niveau en niveau */
 if(mods.includes('turbo'))APPROACH*=CFG.mods.turbo.approach;
 const dur=song.chart.length;
 r.goalSec=Math.min(CFG.goalSec,Math.max(10,dur-1));r.goalT=r.goalSec;/* temps de jeu : 0 = clic de départ */
 WARP={a:0,g:r.goalT,m:Math.min(TT.r0+(TT.r1-TT.r0)*f,APPROACH/TT.minApp)};
 r.state='ready';
}
function laneOf(x){return Math.max(0,Math.min(CFG.lanes-1,Math.floor(x/W*CFG.lanes)))}
let APPROACH=CFG.approach;/* durée de chute d'une touche, calée sur le BPM de la chanson */
function yOf(t,now){const hy=H*CFG.hitYRatio;return hy-((P(t)-P(now))/APPROACH)*hy}
function mult(r){return Math.min(CFG.multiplierMax,1+Math.floor(r.combo/CFG.multiplierEvery))}
function judge(r,n,dt){
 const w=CFG.windows,a=Math.abs(dt);const q=a<=w.PERFECT?'PERFECT':a<=w.GREAT?'GREAT':'GOOD';
 r.counts[q]++;r.judged++;r.acc+=CFG.accWeight[q];r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);
 r.score+=Math.round(CFG.points[q]*mult(r)*(1+(r.song.level-1)*.25)*(r.scoreMul||1));
 r.label=q;r.labelT=performance.now();Aud.hit(n.lane,q,r.judged,dt);buzz(q==='PERFECT'?8:4);burst(r,n.lane,q);r.flash=1;r.lf[n.lane]=1;
}
function burst(r,lane,q){if(S.tech.reduce)return;const x=(lane+.5)*W/CFG.lanes,y=H*CFG.hitYRatio,fv=r.combo>=CFG.feverCombo,k=Math.round((q==='PERFECT'?10:6)*FX.particles);r.rings.push({x,y,l:1,c:fv?'#fff':LANE_COL[lane],sc:FX.ring});
 for(let i=0;i<k&&r.parts.length<120;i++){const a=Math.random()*6.28,sp=60+Math.random()*160;
  const c=fv?'#fff':FX.pal==='rainbow'?`hsl(${(i*47+r.judged*31)%360},90%,62%)`:FX.pal==='white'?'#fff':LANE_COL[lane];
  r.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-60,l:1,c,sh:FX.shape})}}
function buzz(ms){if(S.tech.vibrate&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}}
function down(e){
 const r=E.run;if(!r||r.state==='over'||r.state==='paused'||r.state==='loading'||r.state==='buffering')return;e.preventDefault();
 if(r.state==='ready'){r.state='play';if(Aud.ctx.resume)Aud.ctx.resume();Aud.schedule(r.song);r.startedAt=performance.now();return}
 if(e.clientX<64&&e.clientY<70){if(pauseGame())history.replaceState({s:'pause'},'');return}/* bouton pause */
 const lane=laneOf(e.clientX),t=Aud.songTime();let best=null;
 const th=H*.17;/* une touche est cliquable sur toute sa hauteur, où qu'elle soit à l'écran */
 for(const n of r.notes){if(n.state!==0||n.lane!==lane)continue;const d=Math.abs(n.time-t),y=yOf(n.time,t);
  if(!(d<=CFG.windows.GOOD||(e.clientY>=y-th&&e.clientY<=y)))continue;
  if(!best||d<Math.abs(best.time-t))best=n}
 try{cv.setPointerCapture(e.pointerId)}catch(_){}
 if(!best){return}/* frappe à vide : sans pénalité */
 judge(r,best,t-best.time);
 if(best.type==='HOLD'){best.state=1;r.ptr.set(e.pointerId,best)}else best.state=2;
}
function up(e){
 const r=E.run;if(!r)return;const n=r.ptr.get(e.pointerId);if(!n)return;
 r.ptr.delete(e.pointerId);if(r.state!=='play')return;
 if(Aud.songTime()<n.end-CFG.holdReleaseTolerance)fail(r,'hold');else n.state=2;
}
cv.addEventListener('pointerdown',down);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('contextmenu',e=>e.preventDefault());

function fail(r,why){
 if(r.state!=='play')return;Aud.miss();buzz(60);r.counts.MISS++;r.combo=0;
 if(r.mode.failOnMiss){r.state='over';r.failT=Aud.songTime();setTimeout(()=>finish(r,false),650)}
}
function update(r){
 const t=Aud.songTime();
 if(r.song._head&&!r.song._buf&&!Aud.handed&&t-(r.song.chart.audioStart||0)>=r.song.headSec-2){if(r.song._err){toast(T('audioerr'));r.state='over';Aud.stop();setTimeout(()=>history.back(),250);return}r.state='buffering';Aud.ctx.suspend();return}/* fichier complet pas encore prêt : on fige l'horloge */
 if(!r.won&&t>=r.goalT){r.won=true;r.winT=performance.now();Aud.win();buzz(60);if(!S.tech.reduce)r.flash=2}/* objectif atteint : victoire acquise */
 for(const n of r.notes){
  if(n.state===0&&t-n.time>CFG.windows.GOOD){if(r.mode.failOnMiss){fail(r,'miss');break}n.state=3;r.counts.MISS++;r.combo=0;Aud.miss()}
  if(n.state===1&&t>=n.end){n.state=2;r.holdsDone++;r.score+=Math.round(150*mult(r));r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);
   for(const [id,x] of r.ptr)if(x===n)r.ptr.delete(id)}}
 if(r.state==='play'&&t>r.song.chart.length&&r.notes.every(n=>n.state>=2)){r.state='over';setTimeout(()=>finish(r,true),500)}
}
function loop(now){
 const r=E.run;if(!r)return;
 if(r.state==='play')update(r);
 draw(r,(r.state==='ready'||r.state==='loading')?0:Aud.songTime());
 if(r.state!=='done')E.raf=requestAnimationFrame(loop);
}
function draw(r,t){
 if(r.state==='loading'){g.fillStyle=THEME_BG;g.fillRect(0,0,W,H);g.textAlign='center';g.fillStyle='#fff';g.font='700 20px "Trebuchet MS"';g.fillText(T('loading'),W/2,H*.45);g.fillStyle='#8d86b3';g.font='14px "Trebuchet MS"';g.fillText(r.song.title,W/2,H*.45+28);return}
 const n=CFG.lanes,lw=W/n,hy=H*CFG.hitYRatio,fever=r.combo>=CFG.feverCombo,reduce=S.tech.reduce,ab=r.song.chart.audioStart||0,ea=r.song.chart.energy,
  en=ea?(ea[Math.max(0,Math.min(ea.length-1,Math.floor((t-ab)/.1)))]||0):.4;
 if(!reduce){const now=performance.now();if(!r.enT||now-r.enT>500){r.enPrev=r.enCur===undefined?en:r.enCur;r.enCur=en;r.enT=now}
  if(r.enPrev!==undefined&&en-r.enPrev>.28&&now-(r.dropT||0)>4000){r.flash=1.6;r.dropT=now}}
 g.fillStyle=fever?THEME_FEVER:THEME_BG;g.fillRect(0,0,W,H);
 if(r.flash>0&&!reduce){g.fillStyle=`rgba(124,92,255,${r.flash*.12})`;g.fillRect(0,0,W,H);r.flash=Math.max(0,r.flash-.08)}
 for(let i=0;i<n;i++){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,LANE_COL[i]+(fever?'40':'18'));g.globalAlpha=Math.min(1,.55+en*1.1);g.fillStyle=gr;g.fillRect(i*lw,0,lw,H);g.globalAlpha=1;
  g.fillStyle='rgba(255,255,255,.07)';g.fillRect(i*lw,0,1,H)}
 for(let i=0;i<n;i++)if(r.lf[i]>0){const gr=g.createLinearGradient(0,hy-H*.3,0,hy);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,LANE_COL[i]);g.globalAlpha=r.lf[i]*.4;g.fillStyle=gr;g.fillRect(i*lw,hy-H*.3,lw,H*.3);g.globalAlpha=1;r.lf[i]=Math.max(0,r.lf[i]-.07)}
 {const ph=(((t-ab-(r.song.chart.beatOffset||0))/(60/r.song.bpm))%1+1)%1,pl=reduce?0:Math.max(0,1-ph*3);g.fillStyle=fever?'#fff':'#a99bff';g.globalAlpha=.22+pl*.45;g.fillRect(0,hy-6-pl*6,W,12+pl*12);g.globalAlpha=1;g.fillRect(0,hy-2,W,4)}
 for(const p of r.ptr.values()){g.fillStyle=LANE_COL[p.lane]+'55';g.fillRect(p.lane*lw,hy-30,lw,60)}
 const th=H*.17,ghost=r.mods&&r.mods.includes('ghost');
 for(const nt of r.notes){
  if(nt.state>=2)continue;const y=yOf(nt.time,t);if(y<-200&&nt.type==='TAP')continue;if(y>H+80)continue;
  const x=nt.lane*lw+6,w=lw-12,c=LANE_COL[nt.lane];
  const ga=ghost?Math.max(0,Math.min(1,(hy*.62-y)/(hy*.2))):1;if(ghost&&ga<=.02&&nt.state===0)continue;/* variante Fantôme : la touche s'efface avant la ligne */
  g.globalAlpha=ga;
  if(nt.type==='HOLD'){const yt=yOf(nt.end,t);g.fillStyle=c+(nt.state===1?'cc':'66');rr(x+10,yt,w-20,Math.max(4,(nt.state===1?hy:y)-yt),8);g.fill();
   if(nt.state===1){g.globalAlpha=1;continue}}
  if(COS.trail!=='none')drawTrail(COS.trail,x,y-th,w,c,(nt.time*100)|0);
  drawTile(COS.tile,x,y,w,th,c);g.globalAlpha=1;
 }
 for(let i=r.parts.length-1;i>=0;i--){const p=r.parts[i];p.x+=p.vx/60;p.y+=p.vy/60;p.vy+=6;p.l-=.04;if(p.l<=0){r.parts.splice(i,1);continue}
  g.globalAlpha=p.l;g.fillStyle=p.c;g.strokeStyle=p.c;const sh=p.sh;
  if(sh==='circle'){g.beginPath();g.arc(p.x,p.y,3.2,0,6.283);g.fill()}
  else if(sh==='star'){g.fillRect(p.x-1,p.y-4,2,8);g.fillRect(p.x-4,p.y-1,8,2)}
  else if(sh==='line'){g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.05,p.y-p.vy*.05);g.stroke()}
  else if(sh==='petal'){g.beginPath();g.ellipse(p.x,p.y,4,2,p.vx/80,0,6.283);g.fill()}
  else g.fillRect(p.x-2,p.y-2,4,4)}
 g.globalAlpha=1;
 for(let i=r.rings.length-1;i>=0;i--){const o=r.rings[i];o.l-=.07;if(o.l<=0){r.rings.splice(i,1);continue}
  g.globalAlpha=o.l;g.strokeStyle=o.c;g.lineWidth=3;g.beginPath();g.arc(o.x,o.y,14+(1-o.l)*70*(o.sc||1),0,6.283);g.stroke()}
 g.globalAlpha=1;
 g.fillStyle='rgba(255,255,255,.55)';g.fillRect(20,22,5,20);g.fillRect(31,22,5,20);/* bouton pause */
 /* HUD */
 g.textAlign='center';g.fillStyle='#f3efff';g.font='800 28px "Trebuchet MS",sans-serif';g.fillText(String(r.score).padStart(7,'0'),W/2,44+0);
 g.font='700 13px "Trebuchet MS",sans-serif';g.fillStyle='#8d86b3';g.fillText(`${T('mult')} ×${mult(r)}${fever?'  FEVER':''}`,W/2,64);
 const len=r.song.chart.length,pr=Math.max(0,Math.min(1,t/(r.won?len:r.goalSec||1)));g.fillStyle='#221c4d';g.fillRect(16,78,W-32,4);g.fillStyle=r.won?'#ffd166':'#22e6c7';g.fillRect(16,78,(W-32)*pr,4);
 if(r.won){const gx=16+(W-32)*(r.goalSec/len);g.fillStyle='#fff';g.fillRect(gx-1,74,2,12)}
 let sec='';for(const s of (r.song.chart.sections||[]))if(t>=s[1])sec=s[0];
 g.fillStyle='#8d86b3';g.textAlign='left';g.fillText(sec,16,100);
 g.textAlign='right';g.fillStyle=r.won?'#ffd166':'#8d86b3';g.fillText(r.won?T('wonbadge'):T('goalhud')+' '+mmss(Math.round(r.goalSec||0)),W-16,100);g.textAlign='left';
 if(r.combo>1){const cs=COS.combo||{},fs=Math.min(72,40+r.combo/3);g.textAlign='center';g.globalAlpha=.92;g.font=`800 ${fs}px "Trebuchet MS",sans-serif`;
  const col=fever?'#fff':cs.rainbow?`hsl(${(performance.now()/6)%360},90%,65%)`:(cs.color||'#f3efff');
  if(cs.glow&&!reduce){g.shadowColor=cs.glow;g.shadowBlur=14}
  if(cs.glitch&&!reduce&&Math.floor(performance.now()/90)%5===0){g.fillStyle='#00fff0';g.fillText(r.combo,W/2-3,H*.4);g.fillStyle='#ff00e6';g.fillText(r.combo,W/2+3,H*.4+1)}
  g.fillStyle=col;g.fillText(r.combo,W/2,H*.4);g.shadowBlur=0;
  g.font='700 13px "Trebuchet MS"';g.fillText('COMBO',W/2,H*.4+22);g.globalAlpha=1}
 if(r.winT&&performance.now()-r.winT<3800){const a=Math.min(1,(3800-(performance.now()-r.winT))/600);g.globalAlpha=a;g.textAlign='center';g.fillStyle='rgba(7,6,15,.55)';g.fillRect(0,H*.22,W,96);g.fillStyle='#ffd166';g.font='800 40px "Trebuchet MS"';g.fillText(T('winbanner'),W/2,H*.22+46);g.fillStyle='#fff';g.font='700 15px "Trebuchet MS"';g.fillText(T('winsub'),W/2,H*.22+74);g.globalAlpha=1}
 if(performance.now()-r.labelT<400){g.textAlign='center';g.font='800 22px "Trebuchet MS"';g.fillStyle=r.label==='PERFECT'?'#22e6c7':r.label==='GREAT'?'#ffd166':'#fff';g.fillText(r.label,W/2,hy-50)}
 if(r.state==='loading'){g.textAlign='center';g.fillStyle='#fff';g.font='700 20px "Trebuchet MS"';g.fillText(T('loading'),W/2,H*.45)}
 if(r.state==='buffering'){g.textAlign='center';g.fillStyle='rgba(7,6,15,.6)';g.fillRect(0,H*.4,W,70);g.fillStyle='#fff';g.font='800 22px "Trebuchet MS"';g.fillText(T('loading'),W/2,H*.4+42)}
 if(r.state==='ready'){g.textAlign='center';g.fillStyle='rgba(7,6,15,.6)';g.fillRect(0,H*.16,W,90);g.fillStyle='#fff';g.font='800 26px "Trebuchet MS"';g.fillText(T('tap'),W/2,H*.16+40);g.font='14px "Trebuchet MS"';g.fillStyle='#8d86b3';g.fillText(r.song.title,W/2,H*.16+66)}
}
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

function hexA(c,a){const n=parseInt(c.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`}
/* styles de touches (y = bord bas, hgt = hauteur) */
function drawTile(st,x,y,w,hgt,c){
 const top=y-hgt,h2=hgt-3;
 if(st==='glass'){g.fillStyle=hexA(c,.28);rr(x,top,w,h2,12);g.fill();g.lineWidth=2;g.strokeStyle=hexA(c,.95);rr(x+1,top+1,w-2,h2-2,11);g.stroke();g.fillStyle='rgba(255,255,255,.22)';rr(x+6,top+6,w-12,h2*.22,8);g.fill();g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+8,y-8,w-16,3)}
 else if(st==='pill'){const r_=Math.min(w/2,hgt/2);g.fillStyle=c;rr(x,top,w,h2,r_);g.fill();g.fillStyle='rgba(255,255,255,.3)';rr(x+w*.18,top+8,w*.64,10,5);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x+w*.25,y-8,w*.5,3)}
 else if(st==='outline'){g.lineWidth=7;g.strokeStyle=hexA(c,.25);rr(x+3,top+3,w-6,h2-6,12);g.stroke();g.lineWidth=2.5;g.strokeStyle=c;rr(x+3,top+3,w-6,h2-6,12);g.stroke();g.fillStyle=hexA(c,.08);g.fill();g.fillStyle=c;g.fillRect(x+8,y-9,w-16,3)}
 else if(st==='pixel'){g.fillStyle=c;g.fillRect(x,top,w,h2);g.fillStyle='rgba(0,0,0,.22)';g.fillRect(x+8,top+8,w-16,h2-16);g.fillStyle='rgba(255,255,255,.55)';g.fillRect(x+8,top+8,w-16,6);g.fillRect(x+8,top+8,6,h2-16);g.fillRect(x+8,y-9,w-16,3)}
 else if(st==='crystal'){const gr=g.createLinearGradient(x,top,x+w,y);gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,c);gr.addColorStop(1,hexA(c,.55));g.fillStyle=gr;rr(x,top,w,h2,14);g.fill();g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(x+w*.15,top+6);g.lineTo(x+w*.55,top+6);g.lineTo(x+w*.25,top+h2*.7);g.lineTo(x+w*.1,top+h2*.7);g.closePath();g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x+8,y-8,w-16,3)}
 else if(st==='gold'){const gr=g.createLinearGradient(0,top,0,y);gr.addColorStop(0,'#fff3b0');gr.addColorStop(.45,'#ffc940');gr.addColorStop(1,'#b8860b');g.fillStyle=gr;rr(x,top,w,h2,8);g.fill();g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=2;rr(x+4,top+4,w-8,h2-8,6);g.stroke();g.fillStyle=hexA(c,.45);g.fillRect(x+w*.4,top+h2*.35,w*.2,h2*.3);g.fillStyle='rgba(255,255,255,.7)';g.fillRect(x+8,y-8,w-16,3)}
 else{g.fillStyle=c;rr(x,top,w,h2,10);g.fill();g.fillStyle='rgba(255,255,255,.3)';rr(x+5,top+5,w-10,12,6);g.fill();g.fillStyle='rgba(255,255,255,.6)';g.fillRect(x+8,y-8,w-16,3)}
}
/* traînées au-dessus des touches */
function drawTrail(kind,x,top,w,c,seed){
 const L=H*.2;
 if(kind==='comet'||kind==='ribbon'){const gr=g.createLinearGradient(0,top,0,top-L);gr.addColorStop(0,hexA(c,.55));gr.addColorStop(1,hexA(c,0));g.fillStyle=gr;
  if(kind==='comet')g.fillRect(x+w*.2,top-L,w*.6,L);else{g.fillRect(x+w*.22,top-L,3,L);g.fillRect(x+w*.78-3,top-L,3,L)}}
 else if(kind==='dots'){for(let i=1;i<=6;i++){g.fillStyle=hexA(c,.6*(1-i/7));g.beginPath();g.arc(x+w/2,top-i*(L/6),4,0,6.283);g.fill()}}
 else if(kind==='spark'){const now=performance.now()/16;for(let i=0;i<5;i++){const d=(seed*37+i*53+now)%L,a=1-d/L;g.fillStyle=hexA(c,a*.9);g.fillRect(x+w*(.15+(((seed*13+i*29)%70)/100)),top-d,3,3)}}
}
