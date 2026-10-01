'use strict';
/* ===== SONGS : manifeste songs/index.json (SongStore) ; chart chargé + audio décodé à la demande ===== */
let SONGS=[],LEVELS=[],store=null;
function validChart(c){return c&&Array.isArray(c.notes)&&c.notes.length>0&&c.notes.every(n=>n.lane>=0&&n.lane<CFG.lanes&&isFinite(n.time))}
async function loadSongs(){
 store=new SongStore({base:'./'});
 try{
  const list=await store.loadManifest();LEVELS=store.levels||[];
  SONGS=list.map(m=>({...m,category:'JIEE SESSIONS',difficulty:m.level,duration:Math.round(m.durationMs/1000)}));
 }catch(e){SONGS=[]}
}
/* Chart -> format interne. Le temps de jeu 0 = clic de départ : la musique démarre à la position p0 du fichier
   (début rogné, fondu d'entrée), la 1re note tombe ~1 temps plus tard. audioStart = -p0. */
function toChart(raw,song){
 const native=raw.notes.length&&!Array.isArray(raw.notes[0]);
 let notes0,dur,bpm,fb,aOld=0;
 if(native){aOld=raw.audioStart||0;notes0=raw.notes.map(n=>[(n.time-aOld)*1000,n.lane]);dur=raw.length-aOld;bpm=raw.bpm;fb=(raw.beatOffset||0)*1000}
 else{notes0=raw.notes;dur=(raw.durationMs||song.durationMs)/1000;bpm=raw.bpm||song.bpm;fb=raw.firstBeatMs||0}
 const off=native?0:(raw.offsetMs||0)/1000,au=n=>n[0]/1000+off;
 const t1=au(notes0[0]),lead=Math.max(.8,Math.min(1.4,60/bpm*1.5));
 const p0=Math.max(0,t1-lead,Math.min(song.trim||0,t1-.6));
 const goal=Math.min(CFG.goalSec,dur-p0-1);
 /* départ léger qui monte jusqu'à la densité pleine à l'objectif (déterministe) */
 const keep=native?notes0:notes0.filter((n,i)=>{const s=au(n)-p0;if(s>=goal)return true;return ((i*0.6180339887)%1)<0.35+0.65*Math.pow(Math.max(0,s)/goal,1.3)});
 const notes=keep.map(n=>({time:+(au(n)-p0).toFixed(3),lane:n[1],type:'TAP',duration:0}));
 const step=.1;let energy;
 if(native&&raw.energy)energy=raw.energy;
 else{const E=new Float32Array(Math.ceil(dur/step)+40);
  keep.forEach(n=>{const i=Math.floor(au(n)/step);for(let k=-15;k<=15;k++){const j=i+k;if(j>=0&&j<E.length)E[j]+=1-Math.abs(k)/16}});
  let mx=0;for(const v of E)if(v>mx)mx=v;mx=mx||1;energy=Array.from(E,v=>+Math.min(1,v/mx).toFixed(2))}
 let secs;
 if(native&&raw.sections)secs=raw.sections.map(s=>[s[0],s[1]===0?0:+(s[1]-aOld-p0).toFixed(2)]);
 else{const blk=240/bpm*8,nb=Math.max(1,Math.round(dur/blk)),w=dur/nb,dens=new Array(nb).fill(0);
  keep.forEach(n=>{dens[Math.min(nb-1,Math.floor(au(n)/w))]++});
  const sd=[...dens].sort((a,b)=>a-b),lo=sd[Math.floor(nb*.25)],hi=sd[Math.floor(nb*.75)];secs=[];
  dens.forEach((v,i)=>{const nm=i===0?'INTRO':i===nb-1?'FINAL':v>=hi?'CHORUS':v<=lo?'BREAK':'VERSE';
   if(!secs.length||secs[secs.length-1][0]!==nm)secs.push([nm,i===0?0:+(i*w-p0).toFixed(2)])})}
 while(secs.length>1&&secs[1][1]<=0)secs.shift();secs[0][1]=0;
 return{version:1,bpm,eighth:30/bpm,length:+(dur-p0).toFixed(3),audioStart:-p0,beatOffset:fb/1000,energy,energyStep:step,sections:secs,notes};
}
/* Démarrage progressif : on ne décode que la tête (45 s) avant de jouer ; le fichier complet se décode pendant la partie
   et prend le relais par un fondu à 35 s (Aud.handover). Sans tête (morceau court) : comportement classique. */
async function prepareSong(song){
 Aud.ensure();store.setAudioContext(Aud.ctx);
 SONGS.forEach(x=>{if(x!==song){x._buf=null;x._head=null}});store.trim(song.id);
 song._buf=null;song._head=null;
 const full=store.decoded(song.id);
 full.then(b=>{song._buf=b;if(E.run&&E.run.song===song){Aud.handover(song);if(E.run.state==='buffering'){E.run.state='play';Aud.ctx.resume()}}}).catch(()=>{});
 const hp=song.head?store.decodedHead(song.id).catch(()=>null):Promise.resolve(null);
 const [raw,head]=await Promise.all([store.chart(song.id),hp]);
 song.chart=toChart(raw,song);
 if(head){song._head=head;song.headSec=head.duration;song.handoverAt=Math.max(10,head.duration-10)}
 else song._buf=await full;
}
