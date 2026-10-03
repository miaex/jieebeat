'use strict';
/* ===== SUCCÈS (data/achievements.json) + statistiques ===== */
let ACH=[];
async function loadAchievements(){try{ACH=await (await fetch('data/achievements.json')).json()}catch(e){ACH=[]}}
function totalStars(){return Object.values(S.jieebeat.songs).reduce((a,r)=>a+(r.stars||0),0)}
function chaptersDone(){return chapterList().filter(c=>c.songs.every(s=>((S.jieebeat.songs[s.id]||{}).stars||0)>=1)).length}
function checkAchievements(){
 const st=S.jieebeat.stats,got=[];
 const val={cleared:st.cleared,notes:st.notes,combo:st.bestCombo,streak:S.jieebeat.streak.count,totalStars:totalStars(),chapters:chaptersDone(),
  stars5:Object.values(S.jieebeat.songs).filter(r=>r.stars>=5).length,
  tierDone:[1,2,3,4,5].filter(t=>tierDone(t)).pop()||0,modWins:st.modWins||0,holds:st.holds||0,perfects:st.perfects||0};
 for(const a of ACH){if(S.core.achievements.includes(a.id))continue;
  if((val[a.type]||0)>=a.target){S.core.achievements.push(a.id);S.core.currency.jieeCoins+=a.coins||0;got.push(a)}}
 return got;
}
function collectionExtras(){
 const st=S.jieebeat.stats,box=(l,v)=>`<div class="stat"><span>${l}</span><b>${v}</b></div>`;
 return `<h2 style="margin-top:22px">${T('stats')}</h2><div class="grid">${box(T('played'),st.played)}${box(T('cleared'),st.cleared)}${box(T('notes'),st.notes)}${box(T('combo'),st.bestCombo)}${box(T('tstars'),totalStars())}${box(T('ptime'),Math.round(st.playMs/60000))}</div>
  <h2>${T('ach')} ${S.core.achievements.length}/${ACH.length}</h2>`+ACH.map(a=>{const d=S.core.achievements.includes(a.id);
  return `<div class="card ${d?'':'lock'}"><div><b>${d?'🏆':'🔒'} ${a[lang]}</b><small>${a.d[lang]}</small></div><small>+${a.coins} ◆</small></div>`}).join('');
}
