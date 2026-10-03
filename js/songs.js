'use strict';
/* ===== SONGS : manifeste songs/index.json (SongStore) ; chart chargé + audio décodé à la demande ===== */
let SONGS=[],LEVELS=[],store=null,RATINGS={},TIERS=[{n:1,v0:CFG.speedStart,v1:CFG.speedLast,r0:CFG.rampStart,r1:CFG.rampLast,minApp:CFG.minApproach,coin:1}];
function validChart(c){return c&&Array.isArray(c.notes)&&c.notes.length>0&&c.notes.every(n=>n.lane>=0&&n.lane<CFG.lanes&&isFinite(n.time))}
async function loadSongs(){
 store=new SongStore({base:'./'});
 try{
  const list=await store.loadManifest();LEVELS=store.levels||[];
  try{const rt=await (await fetch('songs/ratings.json')).json();if(rt.tiers&&rt.tiers.length){TIERS=rt.tiers;RATINGS=rt.r||{}}}catch(e){}
  SONGS=list.map(m=>({...m,category:'JIEE SESSIONS',difficulty:m.level,duration:Math.round(m.durationMs/1000)}));
 }catch(e){SONGS=[]}
}
/* Chart -> format interne. Le temps de jeu 0 = clic de départ : la musique démarre à la position p0 du fichier
   (début rogné, fondu d'entrée), la 1re note tombe ~1 temps plus tard. audioStart = -p0.
   Notes : [ms, colonne, durée ms] ; durée > 0 = appui prolongé (HOLD). */
function toChart(raw,song){
 const notes0=raw.notes,bpm=raw.bpm||song.bpm,dur=(raw.durationMs||song.durationMs)/1000,fb=raw.firstBeatMs||0,off=(raw.offsetMs||0)/1000;
 const au=n=>n[0]/1000+off;
 const t1=au(notes0[0]),lead=Math.max(.8,Math.min(1.4,60/bpm*1.5));
 const p0=Math.max(0,t1-lead,Math.min(song.trim||0,t1-.6));
 const notes=notes0.map(n=>({time:+(au(n)-p0).toFixed(3),lane:n[1],type:n[2]>0?'HOLD':'TAP',duration:(n[2]||0)/1000}));
 const step=.1,E=new Float32Array(Math.ceil(dur/step)+40);
 notes0.forEach(n=>{const i=Math.floor(au(n)/step);for(let k=-15;k<=15;k++){const j=i+k;if(j>=0&&j<E.length)E[j]+=1-Math.abs(k)/16}});
 let mx=0;for(const v of E)if(v>mx)mx=v;mx=mx||1;
 const energy=Array.from(E,v=>+Math.min(1,v/mx).toFixed(2));
 const blk=240/bpm*8,nb=Math.max(1,Math.round(dur/blk)),w=dur/nb,dens=new Array(nb).fill(0),secs=[];
 notes0.forEach(n=>{dens[Math.min(nb-1,Math.floor(au(n)/w))]++});
 const sd=[...dens].sort((a,b)=>a-b),lo=sd[Math.floor(nb*.25)],hi=sd[Math.floor(nb*.75)];
 dens.forEach((v,i)=>{const nm=i===0?'INTRO':i===nb-1?'FINAL':v>=hi?'CHORUS':v<=lo?'BREAK':'VERSE';
  if(!secs.length||secs[secs.length-1][0]!==nm)secs.push([nm,i===0?0:+(i*w-p0).toFixed(2)])});
 while(secs.length>1&&secs[1][1]<=0)secs.shift();secs[0][1]=0;
 return{version:2,bpm,eighth:30/bpm,length:+(dur-p0).toFixed(3),audioStart:-p0,beatOffset:fb/1000,energy,energyStep:step,sections:secs,notes,rating:raw.rating||0};
}
/* Démarrage progressif : on ne décode que la tête (45 s) avant de jouer ; le fichier complet se décode pendant la partie
   et prend le relais par un fondu à 35 s (Aud.handover). Sans tête (morceau court) : comportement classique. */
async function prepareSong(song,tier){
 Aud.ensure();store.setAudioContext(Aud.ctx);
 SONGS.forEach(x=>{if(x!==song){x._buf=null;x._head=null}});store.trim(song.id);
 song._buf=null;song._head=null;song._err=false;
 const full=store.decoded(song.id);
 const attach=b=>{song._buf=b;if(E.run&&E.run.song===song){Aud.handover(song);if(E.run.state==='buffering'){E.run.state='play';Aud.ctx.resume()}}};
 full.then(attach).catch(()=>{setTimeout(()=>store.decoded(song.id).then(attach).catch(()=>{song._err=true}),1500)});/* 2e essai automatique */
 const hp=song.head?store.decodedHead(song.id).catch(()=>null):Promise.resolve(null);
 const [raw,head]=await Promise.all([store.chartTier(song.id,tier),hp]);
 song.chart=toChart(raw,song);
 if(head){song._head=head;song.headSec=head.duration;song.handoverAt=Math.max(10,head.duration-10)}
 else song._buf=await full.catch(()=>store.decoded(song.id));
}
