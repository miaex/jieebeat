'use strict';
/* ===== AUDIO (horloge = AudioContext.currentTime) ===== */
const Aud={ctx:null,T0:0,music:null,sfx:null,
 init(){this.stop();const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
  this.ctx=new C({latencyHint:'interactive'});
  this.music=this.ctx.createGain();this.sfx=this.ctx.createGain();
  this.music.gain.value=S.tech.music;this.sfx.gain.value=S.tech.sfx;
  this.music.connect(this.ctx.destination);this.sfx.connect(this.ctx.destination);return true},
 osc(type,f,t,d,vol,dest,f2){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.02)},
 async load(song){/* décode le fichier audio une fois par chanson */
  if(!song.audio||song._buf)return true;
  try{const r=await fetch(`songs/${song.id}/${song.audio}`);song._buf=await this.ctx.decodeAudioData(await r.arrayBuffer());return true}catch(e){return false}},
 schedule(song){
  if(song._buf){this.T0=this.ctx.currentTime+.12;const s=this.ctx.createBufferSource();s.buffer=song._buf;s.connect(this.music);s.start(this.T0+(song.audioStart||0));return}/* musique générée (originale, libre de droits) : kick, hat, basse, arpège */
  const c=this.ctx,e=song.chart.eighth,end=song.chart.length,roots=[55,55,65.4,73.4];
  this.T0=c.currentTime+.12;
  for(let k=0;k*e*2<end;k++){const t=this.T0+k*e*2;const bar=Math.floor(k/4);
   if(k*e*2>=CFG.leadIn-.01){this.osc('sine',150,t,.16,.9,this.music,40);}
   this.osc('square',6000,t+e,.03,.04,this.music);
   if(k%2===0&&k*e*2>=CFG.leadIn-.01){const r=roots[bar%4];this.osc('sawtooth',r*2,t,e*1.8,.16,this.music)}
  }
  for(let i=0;i*e<end;i++){if(i*e>=CFG.leadIn&&i%2===1){const r=roots[Math.floor(i/8)%4];this.osc('triangle',r*8*[1,1.25,1.5,2][i%4],this.T0+i*e,e*.9,.05,this.music)}}},
 songTime(){return this.ctx?this.ctx.currentTime-this.T0-S.tech.offsetMs/1000:0},
 hit(lane,q){if(!this.ctx)return;const f=[261.6,329.6,392,523.3][lane];this.osc('sine',f*(q==='PERFECT'?2:1),this.ctx.currentTime,.18,.35,this.sfx)},
 miss(){if(this.ctx)this.osc('sawtooth',140,this.ctx.currentTime,.4,.4,this.sfx,40)},
 stop(){if(this.ctx){try{this.ctx.close()}catch(e){}}this.ctx=null}};
