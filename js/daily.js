'use strict';
/* ===== DÉFIS QUOTIDIENS : pool dans data/challenges.json, 3 défis tirés de façon déterministe selon la date locale ===== */
let CHALLENGES=[];
async function loadChallenges(){try{CHALLENGES=await (await fetch('data/challenges.json')).json()}catch(e){CHALLENGES=[]}}
function dayHash(d){let h=0;for(const c of d)h=(h*31+c.charCodeAt(0))>>>0;return h}
function ensureDaily(){
 const day=Store.today(),dc=S.jieebeat.dailyChallenges;
 if(dc.day===day&&dc.items.length)return dc;
 const pool=CHALLENGES.slice(),items=[];let h=dayHash(day);
 while(items.length<3&&pool.length){h=(h*1103515245+12345)>>>0;items.push({id:pool.splice(h%pool.length,1)[0].id,progress:0,done:false})}
 S.jieebeat.dailyChallenges={day,items};Store.save();return S.jieebeat.dailyChallenges;
}
function reportRun(r,ok,acc){/* appelé en fin de run ; renvoie les coins gagnés */
 let earned=0;
 for(const it of ensureDaily().items){
  if(it.done)continue;const c=CHALLENGES.find(x=>x.id===it.id);if(!c)continue;
  if(c.type==='play')it.progress++;
  else if(c.type==='clear'&&ok)it.progress++;
  else if(c.type==='notes')it.progress+=r.judged;
  else if(c.type==='combo')it.progress=Math.max(it.progress,r.maxCombo);
  else if(c.type==='accuracy'&&ok)it.progress=Math.max(it.progress,Math.round(acc*100));
  if(it.progress>=c.target){it.done=true;earned+=c.coins;S.jieebeat.stats.challengesDone=(S.jieebeat.stats.challengesDone||0)+1}}
 S.core.currency.jieeCoins+=earned;return earned;
}
function renderChallenges(){
 const dc=ensureDaily(),el=document.getElementById('sub');
 el.innerHTML=`<h2>${T('challenges')}</h2><div class="sub">🔥 ${S.jieebeat.streak.count} ${T('streak')} · ◆ ${S.core.currency.jieeCoins}</div>`+
  dc.items.map(it=>{const c=CHALLENGES.find(x=>x.id===it.id);if(!c)return '';
   return `<div class="card"><div><b>${c[lang]}</b><small>${it.done?'✓ ':''}${Math.min(it.progress,c.target)}/${c.target} · +${c.coins} ◆</small></div></div>`}).join('')+
  `<div class="sp"></div><button class="p" id="bk2">${T('back')}</button>`;
 show('sub');document.getElementById('bk2').onclick=()=>history.back();
}
