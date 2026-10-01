'use strict';
/* ===== AUDIO : horloge = AudioContext.currentTime. Un contexte unique réutilisé (décodage anticipé possible). ===== */
const Aud={ctx:null,T0:0,music:null,sfx:null,src:null,rate:1,
 ensure(){
  if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;this.ctx=new C({latencyHint:'interactive'})}
  if(this.ctx.state==='suspended')this.ctx.resume();return true},
 init(){
  if(!this.ensure())return false;this.stop();
  this.music=this.ctx.createGain();this.sfx=this.ctx.createGain();
  this.music.gain.value=S.tech.music;this.sfx.gain.value=S.tech.sfx;
  this.music.connect(this.ctx.destination);this.sfx.connect(this.ctx.destination);return true},
 osc(type,f,t,d,vol,dest,f2){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.02)},
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
 pad(lane,v,idx,t){/* drum pad : colonne 0 grosse caisse, 1 caisse claire, 2 shaker/charley, 3 clap/rim (basses -> aigus, comme les colonnes du chart) */
  v*=.62;const sfx=this.sfx;
  if(lane===0){this.osc('sine',150,t,.24,.95*v,sfx,42);this.nz(t,.025,.22*v,'lowpass',1500,.7)}
  else if(lane===1){this.nz(t,.18,.55*v,'bandpass',1900,.6);this.osc('triangle',215,t,.12,.32*v,sfx,150)}
  else if(lane===2){if(idx%2===0)this.nz(t,.08,.3*v,'highpass',6500,.7,.1,.014);else this.nz(t,.045,.26*v,'highpass',8500,.7,.3,.002)}
  else if(idx%2===0){[0,.011,.022].forEach((d,i)=>this.nz(t+d,.02,.4*v,'bandpass',1500,1.2,.05*i));this.nz(t+.03,.13,.3*v,'bandpass',1400,.9,.2)}
  else{this.osc('square',830,t,.045,.16*v,sfx);this.nz(t,.035,.28*v,'bandpass',3300,1,.4)}},
 pluck(lane,q,t){/* son simple amélioré : timbre doux, filtre qui se ferme, étincelle sur PERFECT */
  const c=this.ctx,f=[261.6,329.6,392,523.3][lane]*(q==='PERFECT'?2:1),o=c.createOscillator(),o2=c.createOscillator(),og=c.createGain(),g=c.createGain(),lp=c.createBiquadFilter();
  o.type='triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*2;og.gain.value=.35;
  lp.type='lowpass';lp.frequency.setValueAtTime(5200,t);lp.frequency.exponentialRampToValueAtTime(900,t+.25);
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.34,t+.004);g.gain.exponentialRampToValueAtTime(.001,t+.32);
  o.connect(lp);o2.connect(og);og.connect(lp);lp.connect(g);g.connect(this.sfx);o.start(t);o2.start(t);o.stop(t+.35);o2.stop(t+.35);
  if(q==='PERFECT')this.osc('sine',f*3,t,.12,.08,this.sfx)},
 hit(lane,q,idx,dt){/* un tap légèrement en avance est calé pile sur le temps de la note : la percussion tombe sur le rythme */
  if(!this.ctx||!this.sfx)return;
  let t=this.ctx.currentTime;if(dt<0&&dt>-.08)t+=-dt/this.rate;
  const v=q==='PERFECT'?1:q==='GREAT'?.85:.65;
  if(S.tech.padSounds)this.pad(lane,v,idx||0,t);else this.pluck(lane,q,t)},
 miss(){if(this.ctx&&this.sfx)this.osc('sawtooth',140,this.ctx.currentTime,.4,.4,this.sfx,40)},
 win(){if(!this.ctx||!this.sfx)return;const t=this.ctx.currentTime;[523.3,659.3,784,1046.5].forEach((f,i)=>this.osc('triangle',f,t+i*.09,.5,.3,this.sfx))},
 stop(){try{if(this.src)this.src.stop()}catch(e){}try{if(this.src2)this.src2.stop()}catch(e){}this.src=null;this.src2=null;try{if(this.music)this.music.disconnect()}catch(e){}}};
