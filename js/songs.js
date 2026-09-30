'use strict';
/* ===== SONGS : chargées depuis songs/<id>/metadata.json + chart.json (le moteur ne connaît aucune chanson) ===== */
let SONGS=[];
function validChart(c){return c&&Array.isArray(c.notes)&&c.notes.length>0&&c.notes.every(n=>n.lane>=0&&n.lane<CFG.lanes&&isFinite(n.time))}
async function loadSongs(){
 const out=[];
 try{
  const idx=await (await fetch('songs/index.json')).json();
  for(const id of idx.songs){
   try{const [m,c]=await Promise.all([fetch(`songs/${id}/metadata.json`).then(r=>r.json()),fetch(`songs/${id}/chart.json`).then(r=>r.json())]);
    if(!validChart(c))continue;m.chart=c;m.duration=Math.round(c.length);out.push(m)}catch(e){/* chanson ignorée si données invalides */}}
 }catch(e){}
 SONGS=out;
}
