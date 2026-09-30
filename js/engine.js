'use strict';
/* ===== ENGINE ===== */
const cv=document.getElementById('cv'),g=cv.getContext('2d',{alpha:false});
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const E={run:null,raf:0};
const LANE_COL=['#22e6c7','#7c5cff','#ff4fa3','#ffd166'];

function startSong(song){
 if(!song||!validChart(song.chart)){alert(T('err'));return}
 if(!Aud.init()){alert(T('err'));return}
 show(null);
 E.run={song,mode:CFG.modes.normal,state:'ready',score:0,combo:0,maxCombo:0,acc:0,judged:0,counts:{PERFECT:0,GREAT:0,GOOD:0,MISS:0},
  notes:song.chart.notes.map(n=>({...n,end:n.time+n.duration,state:0})),ptr:new Map(),parts:[],flash:0,label:'',labelT:0,startedAt:0};
 cancelAnimationFrame(E.raf);E.raf=requestAnimationFrame(loop);
}
function laneOf(x){return Math.max(0,Math.min(CFG.lanes-1,Math.floor(x/W*CFG.lanes)))}
function yOf(t,now){const hy=H*CFG.hitYRatio;return hy-((t-now)/CFG.approach)*hy}
function mult(r){return Math.min(CFG.multiplierMax,1+Math.floor(r.combo/CFG.multiplierEvery))}
function judge(r,n,dt){
 const w=CFG.windows,a=Math.abs(dt);const q=a<=w.PERFECT?'PERFECT':a<=w.GREAT?'GREAT':'GOOD';
 r.counts[q]++;r.judged++;r.acc+=CFG.accWeight[q];r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);
 r.score+=Math.round(CFG.points[q]*mult(r)*(1+(r.song.difficulty-1)*.25));
 r.label=q;r.labelT=performance.now();Aud.hit(n.lane,q);buzz(q==='PERFECT'?8:4);burst(r,n.lane,q);r.flash=1;
}
function burst(r,lane,q){if(S.tech.reduce)return;const x=(lane+.5)*W/CFG.lanes,y=H*CFG.hitYRatio,c=r.combo>=CFG.feverCombo?'#fff':LANE_COL[lane],k=q==='PERFECT'?10:6;
 for(let i=0;i<k&&r.parts.length<80;i++){const a=Math.random()*6.28,s=60+Math.random()*160;r.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,l:1,c})}}
function buzz(ms){if(S.tech.vibrate&&navigator.vibrate)try{navigator.vibrate(ms)}catch(e){}}
function down(e){
 const r=E.run;if(!r||r.state==='over'||r.state==='paused')return;e.preventDefault();
 if(r.state==='ready'){r.state='play';Aud.schedule(r.song);r.startedAt=performance.now();return}
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
 for(const n of r.notes){
  if(n.state===0&&t-n.time>CFG.windows.GOOD){fail(r,'miss');break}
  if(n.state===1&&t>=n.end){n.state=2;r.score+=Math.round(150*mult(r));r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);
   for(const [id,x] of r.ptr)if(x===n)r.ptr.delete(id)}}
 if(r.state==='play'&&t>r.song.chart.length&&r.notes.every(n=>n.state===2)){r.state='over';setTimeout(()=>finish(r,true),500)}
}
function loop(now){
 const r=E.run;if(!r)return;
 if(r.state==='play')update(r);
 draw(r,r.state==='ready'?0:Aud.songTime());
 if(r.state!=='done')E.raf=requestAnimationFrame(loop);
}
function draw(r,t){
 const n=CFG.lanes,lw=W/n,hy=H*CFG.hitYRatio,fever=r.combo>=CFG.feverCombo,reduce=S.tech.reduce;
 g.fillStyle=fever?'#180a2e':'#07060f';g.fillRect(0,0,W,H);
 if(r.flash>0&&!reduce){g.fillStyle=`rgba(124,92,255,${r.flash*.12})`;g.fillRect(0,0,W,H);r.flash=Math.max(0,r.flash-.08)}
 for(let i=0;i<n;i++){const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,LANE_COL[i]+(fever?'40':'18'));g.fillStyle=gr;g.fillRect(i*lw,0,lw,H);
  g.fillStyle='rgba(255,255,255,.07)';g.fillRect(i*lw,0,1,H)}
 g.fillStyle=fever?'#fff':'#a99bff';g.fillRect(0,hy-2,W,4);
 for(const p of r.ptr.values()){g.fillStyle=LANE_COL[p.lane]+'55';g.fillRect(p.lane*lw,hy-30,lw,60)}
 for(const nt of r.notes){
  if(nt.state===2)continue;const y=yOf(nt.time,t);if(y<-200&&nt.type==='TAP')continue;if(y>H+80)continue;
  const x=nt.lane*lw+6,w=lw-12,c=LANE_COL[nt.lane];
  if(nt.type==='HOLD'){const yt=yOf(nt.end,t),yb=Math.min(y,hy);g.fillStyle=c+(nt.state===1?'cc':'55');g.fillRect(x+10,yt,w-20,(nt.state===1?hy:y)-yt);
   if(nt.state===1)continue}
  const th=H*.17;g.fillStyle=c;rr(x,y-th,w,th-3,10);g.fill();g.fillStyle='rgba(255,255,255,.3)';rr(x+5,y-th+5,w-10,12,6);g.fill();
 }
 for(let i=r.parts.length-1;i>=0;i--){const p=r.parts[i];p.x+=p.vx/60;p.y+=p.vy/60;p.vy+=6;p.l-=.04;if(p.l<=0){r.parts.splice(i,1);continue}
  g.globalAlpha=p.l;g.fillStyle=p.c;g.fillRect(p.x-2,p.y-2,4,4)}
 g.globalAlpha=1;
 /* HUD */
 g.textAlign='center';g.fillStyle='#f3efff';g.font='800 28px "Trebuchet MS",sans-serif';g.fillText(String(r.score).padStart(7,'0'),W/2,44+0);
 g.font='700 13px "Trebuchet MS",sans-serif';g.fillStyle='#8d86b3';g.fillText(`${T('mult')} ×${mult(r)}${fever?'  FEVER':''}`,W/2,64);
 const len=r.song.chart.length,pr=Math.max(0,Math.min(1,t/len));g.fillStyle='#221c4d';g.fillRect(16,78,W-32,4);g.fillStyle='#22e6c7';g.fillRect(16,78,(W-32)*pr,4);
 const bar=Math.floor((t-CFG.leadIn)/(r.song.chart.eighth*8));let sec='';for(const s of r.song.sections)if(bar>=s[1])sec=s[0];
 g.fillStyle='#8d86b3';g.textAlign='left';g.fillText(sec,16,100);
 if(r.combo>1){g.textAlign='center';g.fillStyle=fever?'#fff':'#f3efff';g.globalAlpha=.9;g.font=`800 ${Math.min(72,40+r.combo/3)}px "Trebuchet MS",sans-serif`;g.fillText(r.combo,W/2,H*.4);
  g.font='700 13px "Trebuchet MS"';g.fillText('COMBO',W/2,H*.4+22);g.globalAlpha=1}
 if(performance.now()-r.labelT<400){g.textAlign='center';g.font='800 22px "Trebuchet MS"';g.fillStyle=r.label==='PERFECT'?'#22e6c7':r.label==='GREAT'?'#ffd166':'#fff';g.fillText(r.label,W/2,hy-50)}
 if(r.state==='ready'){g.textAlign='center';g.fillStyle='rgba(7,6,15,.6)';g.fillRect(0,H*.4,W,90);g.fillStyle='#fff';g.font='800 26px "Trebuchet MS"';g.fillText(T('tap'),W/2,H*.4+40);g.font='14px "Trebuchet MS"';g.fillStyle='#8d86b3';g.fillText(r.song.title,W/2,H*.4+66)}
}
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
