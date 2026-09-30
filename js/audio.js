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
 schedule(song){/* le morceau démarre à T0 + audioStart : les touches ont le temps de descendre avant la 1re note */
  const c=this.ctx,s=c.createBufferSource();s.buffer=song._buf;s.playbackRate.value=this.rate;s.connect(this.music);
  this.T0=c.currentTime+.12;s.start(this.T0+(song.chart.audioStart||0)/this.rate);this.src=s},
 songTime(){return this.ctx?(this.ctx.currentTime-this.T0)*this.rate-S.tech.offsetMs/1000:0},
 hit(lane,q){if(!this.ctx||!this.sfx)return;const f=[261.6,329.6,392,523.3][lane];this.osc('sine',f*(q==='PERFECT'?2:1),this.ctx.currentTime,.18,.35,this.sfx)},
 miss(){if(this.ctx&&this.sfx)this.osc('sawtooth',140,this.ctx.currentTime,.4,.4,this.sfx,40)},
 win(){if(!this.ctx||!this.sfx)return;const t=this.ctx.currentTime;[523.3,659.3,784,1046.5].forEach((f,i)=>this.osc('triangle',f,t+i*.09,.5,.3,this.sfx))},
 stop(){try{if(this.src)this.src.stop()}catch(e){}this.src=null;try{if(this.music)this.music.disconnect()}catch(e){}}};
