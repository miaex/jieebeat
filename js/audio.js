'use strict';
/* ===== AUDIO : horloge = AudioContext.currentTime. Un contexte unique réutilisé. Les sons des touches sont synthétisés
   par le code (kits), accordés sur la tonalité du morceau quand le kit est mélodique. ===== */
const Aud={ctx:null,T0:0,music:null,sfx:null,src:null,rate:1,rootHz:261.63,minor:false,kickHz:65.4,
 ensure(){
  if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;this.ctx=new C({latencyHint:'interactive'})}
  if(this.ctx.state==='suspended')this.ctx.resume();return true},
 init(){
  if(!this.ensure())return false;this.stop();
  this.music=this.ctx.createGain();this.sfx=this.ctx.createGain();
  this.music.gain.value=S.tech.music;this.sfx.gain.value=S.tech.sfx;
  this.music.connect(this.ctx.destination);this.sfx.connect(this.ctx.destination);return true},
 setKey(k){/* tonalité du morceau : racine mélodique (octave 3-4) et fréquence de grosse caisse accordée (≈ 40-80 Hz) */
  const pc=k&&k.pc!==undefined?k.pc:0;let f=261.63*Math.pow(2,pc/12);if(f>370)f/=2;this.rootHz=f;this.minor=!!(k&&k.minor);
  let kk=f;while(kk>80)kk/=2;while(kk<40)kk*=2;this.kickHz=kk},
 osc(type,f,t,d,vol,dest,f2){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.02)},
 tone(type,f,t,att,dec,vol,f2){/* note avec attaque douce (pas de clic) */
  const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dec);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.exponentialRampToValueAtTime(.001,t+att+dec);
  o.connect(g);g.connect(this.sfx);o.start(t);o.stop(t+att+dec+.03)},
 fm(f,ratio,idx,t,dec,vol){/* cloche FM : porteuse f, modulateur f*ratio */
  const c=this.ctx,car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),g=c.createGain();
  car.frequency.value=f;mod.frequency.value=f*ratio;mg.gain.setValueAtTime(f*idx,t);mg.gain.exponentialRampToValueAtTime(f*.05,t+dec);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.003);g.gain.exponentialRampToValueAtTime(.001,t+dec);
  mod.connect(mg);mg.connect(car.frequency);car.connect(g);g.connect(this.sfx);car.start(t);mod.start(t);car.stop(t+dec+.03);mod.stop(t+dec+.03)},
 pitch(lane,up){/* note de la gamme pentatonique de la tonalité du morceau, une par colonne */
  const off=(this.minor?[0,3,7,12]:[0,4,7,12])[lane];return this.rootHz*Math.pow(2,(off+(up?12:0))/12)},
 schedule(song){/* temps de jeu 0 = maintenant ; la musique démarre à la position p0 du fichier avec un court fondu d'entrée */
  const c=this.ctx,r=this.rate,aS=song.chart.audioStart||0,p0=Math.max(0,-aS);
  this.T0=c.currentTime+.12;this.aS=aS;this.handed=false;this.src2=null;
  this.hg=c.createGain();this.hg.connect(this.music);
  const s=c.createBufferSource();s.buffer=song._head||song._buf;s.playbackRate.value=r;s.connect(this.hg);
  if(p0>0){this.hg.gain.setValueAtTime(0,this.T0);this.hg.gain.linearRampToValueAtTime(1,this.T0+.15);s.start(this.T0,p0)}
  else s.start(this.T0+Math.max(0,aS)/r);
  this.src=s;
  if(!song._head)this.handed=true;else if(song._buf)this.handover(song)},
 handover(song){/* fondu de 0,25 s de la tête vers le fichier complet, à la même position audio (appelable à tout moment) */
  if(this.handed||!this.ctx||!this.src||!song._head||!song._buf)return;this.handed=true;
  const c=this.ctx,r=this.rate,hp=song.handoverAt,F=.25,when=this.T0+(this.aS+hp)/r,now=c.currentTime,t0=Math.max(now,when),off=hp+Math.max(0,now-when)*r;
  const fg=c.createGain();fg.gain.setValueAtTime(0,t0);fg.gain.linearRampToValueAtTime(1,t0+F);fg.connect(this.music);
  this.hg.gain.setValueAtTime(1,t0);this.hg.gain.linearRampToValueAtTime(0,t0+F);
  const s=c.createBufferSource();s.buffer=song._buf;s.playbackRate.value=r;s.connect(fg);s.start(t0,off);this.src2=s;
  try{this.src.stop(t0+F+.05)}catch(e){}
  setTimeout(()=>{song._head=null;store.dropHead(song.id)},15000)},
 songTime(){return this.ctx?(this.ctx.currentTime-this.T0)*this.rate-S.tech.offsetMs/1000:0},
 noise(){if(!this._nb){const c=this.ctx,n=(c.sampleRate*.6)|0,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);let x=12345;
   for(let i=0;i<n;i++){x=(x*1664525+1013904223)>>>0;d[i]=(x/4294967296)*2-1}this._nb=b}return this._nb},
 nz(t,dur,vol,type,freq,q,off,att){/* éclat de bruit filtré (base des percussions) */
  const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),a=att||.003;
  s.buffer=this.noise();f.type=type;f.frequency.value=freq;f.Q.value=q||.7;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(this.sfx);s.start(t,off||0,dur+.02)},
 /* ---------- kits : chaque fonction joue le son de la colonne `lane` à l'instant t (v = vélocité selon la précision) ---------- */
 kits:{
  drumpad(lane,v,idx,t){/* grosse caisse accordée sur la tonalité, caisse claire, shaker/charley, clap/rim */
   v*=.62;const sfx=this.sfx;
   if(lane===0){this.osc('sine',150,t,.26,.95*v,sfx,this.kickHz);this.nz(t,.025,.22*v,'lowpass',1500,.7)}
   else if(lane===1){this.nz(t,.18,.55*v,'bandpass',1900,.6);this.osc('triangle',215,t,.12,.32*v,sfx,150)}
   else if(lane===2){if(idx%2===0)this.nz(t,.08,.3*v,'highpass',6500,.7,.1,.014);else this.nz(t,.045,.26*v,'highpass',8500,.7,.3,.002)}
   else if(idx%2===0){[0,.011,.022].forEach((d,i)=>this.nz(t+d,.02,.4*v,'bandpass',1500,1.2,.05*i));this.nz(t+.03,.13,.3*v,'bandpass',1400,.9,.2)}
   else{this.osc('square',830,t,.045,.16*v,sfx);this.nz(t,.035,.28*v,'bandpass',3300,1,.4)}},
  pluck(lane,v,idx,t,q){/* son simple amélioré, dans la gamme du morceau */
   const c=this.ctx,f=this.pitch(lane,q==='PERFECT'),o=c.createOscillator(),o2=c.createOscillator(),og=c.createGain(),g=c.createGain(),lp=c.createBiquadFilter();
   o.type='triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*2;og.gain.value=.35;
   lp.type='lowpass';lp.frequency.setValueAtTime(5200,t);lp.frequency.exponentialRampToValueAtTime(900,t+.25);
   g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.34*v,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.32);
   o.connect(lp);o2.connect(og);og.connect(lp);lp.connect(g);g.connect(this.sfx);o.start(t);o2.start(t);o.stop(t+.35);o2.stop(t+.35);
   if(q==='PERFECT')this.osc('sine',f*3,t,.12,.08*v,this.sfx)},
  electro(lane,v,idx,t,q){/* 808 : sub kick long, clap, charley ouvert/fermé, laser */
   v*=.6;const sfx=this.sfx;
   if(lane===0){this.osc('sine',this.kickHz*3.2,t,.5,1.05*v,sfx,this.kickHz);this.nz(t,.012,.3*v,'highpass',2500,.7)}
   else if(lane===1){[0,.012,.026].forEach((d,i)=>this.nz(t+d,.025,.45*v,'bandpass',1250,1.1,.04*i));this.nz(t+.034,.2,.38*v,'bandpass',1100,.8,.2)}
   else if(lane===2){if(idx%4===3)this.nz(t,.26,.3*v,'highpass',7500,.7,.1,.004);else this.nz(t,.04,.3*v,'highpass',9000,.7,.3,.002)}
   else{this.osc('sawtooth',2400,t,.17,.22*v,sfx,280);this.osc('sine',1300,t,.1,.14*v,sfx,500);if(q==='PERFECT')this.osc('sine',4200,t+.03,.1,.07*v,sfx)}},
  chip(lane,v,idx,t,q){/* 8-bit : tout en ondes carrées, arpège dans la tonalité, « pièce » sur PERFECT */
   v*=.5;const sfx=this.sfx,r=this.rootHz;
   if(lane===0)this.osc('square',230,t,.15,.55*v,sfx,this.kickHz*1.2);
   else if(lane===1){this.nz(t,.11,.5*v,'lowpass',5200,.5);this.osc('square',190,t,.05,.2*v,sfx,120)}
   else if(lane===2)this.nz(t,.035,.35*v,'highpass',9500,.6,.2,.001);
   else{const k=[1,this.minor?1.19:1.26,1.5];k.forEach((m,i)=>this.osc('square',r*2*m,t+i*.035,.06,.22*v,sfx));
    if(q==='PERFECT'){this.osc('square',r*4,t+.12,.07,.16*v,sfx);this.osc('square',r*6,t+.19,.25,.16*v,sfx)}}},
  tribal(lane,v,idx,t,q){/* percussions à main : djembé grave, claque, caxixi, claves */
   v*=.62;const sfx=this.sfx;
   if(lane===0){this.osc('sine',118,t,.34,1.0*v,sfx,this.kickHz*1.4);this.nz(t,.12,.3*v,'lowpass',520,.7)}
   else if(lane===1){this.nz(t,.09,.55*v,'bandpass',2600,1.3);this.osc('triangle',330,t,.07,.25*v,sfx,250)}
   else if(lane===2){this.nz(t,.1,.26*v,'highpass',5200,.7,.1,.02);this.nz(t+.05,.09,.2*v,'highpass',5600,.7,.4,.015)}
   else{this.osc('sine',2350,t,.07,.3*v,sfx);this.osc('sine',1700,t,.1,.2*v,sfx);this.nz(t,.02,.2*v,'bandpass',3500,1,.2);if(q==='PERFECT')this.osc('sine',3100,t+.04,.07,.12*v,sfx)}},
  marimba(lane,v,idx,t,q){/* lames de bois : fondamentale + harmonique 4, dans la gamme du morceau */
   const f=this.pitch(lane,q==='PERFECT');v*=.7;
   this.tone('sine',f,t,.002,.55,.5*v);this.tone('sine',f*4,t,.001,.09,.16*v);this.nz(t,.012,.12*v,'bandpass',f*2,2,.3);if(q==='PERFECT')this.tone('sine',f*2,t,.002,.3,.12*v)},
  glass(lane,v,idx,t,q){/* cloches de verre FM, longues et brillantes */
   const f=this.pitch(lane,true);v*=.6;this.fm(f,3.5,2.2,t,.95,.26*v);this.fm(f*1.5,2.01,1.1,t+.012,.6,.1*v);if(q==='PERFECT')this.tone('sine',f*4,t,.002,.6,.08*v)},
  steel(lane,v,idx,t,q){/* steel drum : trois partiels, léger glissé d'attaque */
   const f=this.pitch(lane,q!=='PERFECT');v*=.7;this.tone('sine',f*1.025,t,.002,.7,.4*v,f);this.tone('sine',f*2,t,.002,.45,.22*v);this.tone('sine',f*2.99,t,.002,.25,.1*v)},
  bass(lane,v,idx,t,q){/* basse profonde, rim, charley, cloche */
   v*=.62;const sfx=this.sfx,r=this.rootHz/2;
   if(lane===0){this.osc('sine',this.kickHz*2.4,t,.4,1.0*v,sfx,this.kickHz);this.tone('sawtooth',this.kickHz*2,t,.005,.28,.18*v)}
   else if(lane===1){this.osc('sine',this.kickHz*3.6,t,.38,.85*v,sfx,this.kickHz*1.5);this.nz(t,.03,.3*v,'bandpass',3300,1,.4)}
   else if(lane===2)this.nz(t,.05,.3*v,'highpass',8800,.7,.3,.002);
   else{this.fm(this.pitch(3,true),2.76,1.6,t,.8,.24*v);if(q==='PERFECT')this.tone('sine',this.pitch(3,true)*2,t,.002,.4,.08*v)}},
  nebula(lane,v,idx,t,q){/* nappes douces qui s'ouvrent, souffle filtré, étincelles sur PERFECT */
   const f=this.pitch(lane,false);v*=.6;
   this.tone('sine',f,t,.03,.9,.34*v);this.tone('triangle',f*1.004,t,.03,.7,.14*v);this.tone('sine',f*2,t,.05,.6,.08*v);
   this.nz(t,.5,.12*v,'bandpass',1400+lane*500,1.2,.1,.09);
   if(q==='PERFECT')[4,5,6].forEach((m,i)=>this.tone('sine',f*m,t+.05+i*.05,.002,.18,.05*v))}
 },
 hit(lane,q,idx,dt){/* un tap légèrement en avance est calé pile sur le temps de la note : le son tombe sur le rythme */
  if(!this.ctx||!this.sfx)return;
  let t=this.ctx.currentTime;if(dt<0&&dt>-.08)t+=-dt/this.rate;
  const v=q==='PERFECT'?1:q==='GREAT'?.85:.65,k=this.kits[COS.kit]||this.kits.drumpad;
  try{k.call(this,lane,v,idx||0,t,q)}catch(e){}},
 previewKit(kit){/* aperçu d'un kit : petit motif sur les 4 colonnes */
  if(!this.ensure())return;if(!this.sfx)this.init();
  const old=COS.kit;COS.kit=kit;[0,1,2,3,2,1,0,3].forEach((l,i)=>setTimeout(()=>this.hit(l,i%4===3?'PERFECT':'GREAT',i,0),i*190));setTimeout(()=>{COS.kit=old},8*190+50)},
 miss(){if(this.ctx&&this.sfx)this.osc('sawtooth',140,this.ctx.currentTime,.4,.4,this.sfx,40)},
 win(){if(!this.ctx||!this.sfx)return;const t=this.ctx.currentTime;[523.3,659.3,784,1046.5].forEach((f,i)=>this.osc('triangle',f,t+i*.09,.5,.3,this.sfx))},
 stop(){try{if(this.src)this.src.stop()}catch(e){}try{if(this.src2)this.src2.stop()}catch(e){}this.src=null;this.src2=null;try{if(this.music)this.music.disconnect()}catch(e){}}};
