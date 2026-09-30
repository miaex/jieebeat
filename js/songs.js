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
/* Chart du pack [[ms,lane],...] -> format interne (temps de jeu = audioStart + temps audio). Format natif : renvoyé tel quel. */
function toChart(raw,song){
 if(raw.notes.length&&!Array.isArray(raw.notes[0]))return raw;
 const ab=2.5,off=(raw.offsetMs||0)/1000,bpm=raw.bpm||song.bpm,dur=(raw.durationMs||song.durationMs)/1000;
 const notes=raw.notes.map(n=>({time:+(ab+n[0]/1000+off).toFixed(3),lane:n[1],type:'TAP',duration:0}));
 const step=.1,E=new Float32Array(Math.ceil(dur/step)+40);
 raw.notes.forEach(n=>{const i=Math.floor(n[0]/1000/step);for(let k=-15;k<=15;k++){const j=i+k;if(j>=0&&j<E.length)E[j]+=1-Math.abs(k)/16}});
 let mx=0;for(const v of E)if(v>mx)mx=v;mx=mx||1;
 const energy=Array.from(E,v=>+Math.min(1,v/mx).toFixed(2));
 /* sections déduites de la densité de notes, par blocs de 8 mesures */
 const blk=240/bpm*8,nb=Math.max(1,Math.round(dur/blk)),w=dur/nb,dens=new Array(nb).fill(0);
 raw.notes.forEach(n=>{dens[Math.min(nb-1,Math.floor(n[0]/1000/w))]++});
 const sd=[...dens].sort((a,b)=>a-b),lo=sd[Math.floor(nb*.25)],hi=sd[Math.floor(nb*.75)],secs=[];
 dens.forEach((v,i)=>{const nm=i===0?'INTRO':i===nb-1?'FINAL':v>=hi?'CHORUS':v<=lo?'BREAK':'VERSE';
  if(!secs.length||secs[secs.length-1][0]!==nm)secs.push([nm,i===0?0:+(ab+i*w).toFixed(2)])});
 return{version:1,bpm,eighth:30/bpm,length:+(ab+dur).toFixed(3),audioStart:ab,beatOffset:(raw.firstBeatMs||0)/1000,energy,energyStep:step,sections:secs,notes};
}
async function prepareSong(song){
 Aud.ensure();store.setAudioContext(Aud.ctx);
 const {chart,buffer}=await store.load(song.id);
 song.chart=toChart(chart,song);song._buf=buffer;
}
