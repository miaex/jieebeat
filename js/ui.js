'use strict';
/* ===== FIN DE RUN, SCORES, PROGRESSION ===== */
function starsOf(acc,ok,perfectRun){if(!ok)return 0;let s=1;CFG.stars.forEach((th,i)=>{if(i>0&&acc>=th)s=i+1});if(s===5&&!perfectRun)s=4;return s}
function finish(r,ok){
 r.state='done';cancelAnimationFrame(E.raf);Aud.stop();
 const total=r.counts.PERFECT+r.counts.GREAT+r.counts.GOOD;const acc=r.judged?r.acc/(r.judged+(ok?0:0)):0;
 const stars=starsOf(acc,ok,r.counts.GOOD===0&&r.counts.GREAT<=r.judged*.05);
 const rec=S.jieebeat.songs[r.song.id]||{best:0,stars:0,bestCombo:0,plays:0,clears:0};
 const newRec=r.score>rec.best,oldStars=rec.stars;
 rec.best=Math.max(rec.best,r.score);rec.bestCombo=Math.max(rec.bestCombo,r.maxCombo);rec.stars=Math.max(rec.stars,stars);rec.plays++;if(ok)rec.clears++;
 S.jieebeat.songs[r.song.id]=rec;
 const st=S.jieebeat.stats;st.played++;st.notes+=total;st.bestCombo=Math.max(st.bestCombo,r.maxCombo);st.playMs+=Math.round(performance.now()-r.startedAt);
 let newUnlock=null;
 if(ok){st.cleared++;S.core.currency.jieeCoins+=Math.max(0,stars-oldStars)*CFG.coinsPerStar+5;
  const nx=SONGS.find(s=>s.requires===r.song.id);if(nx&&!S.jieebeat.unlocked.includes(nx.id)){S.jieebeat.unlocked.push(nx.id);newUnlock=nx}}
 const day=Store.today(),sk=S.jieebeat.streak;
 if(sk.lastDay!==day){const y=new Date();y.setDate(y.getDate()-1);sk.count=sk.lastDay===y.toLocaleDateString('sv')?sk.count+1:1;sk.lastDay=day}
 const bonus=reportRun(r,ok,acc);
 Store.save();
 const left=Math.max(0,Math.round(r.song.chart.length-(r.failT||0)));
 const el=document.getElementById('result');
 el.innerHTML=`<h2 style="color:${ok?'var(--b)':'var(--hot)'}">${T(ok?'done':'over')}</h2>
  <div class="sub">${r.song.title}</div>
  ${!ok?`<div class="sub">${T('left',{n:left})}</div>`:''}
  <p class="big">${r.score}</p>${newRec?`<div style="color:#ffd166;font-weight:800">${T('newrec')}</div>`:''}
  <div class="stars" style="font-size:28px;margin:8px 0">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div>
  <div class="grid"><div class="stat"><span>${T('acc')}</span><b>${(acc*100).toFixed(1)}%</b></div>
  <div class="stat"><span>${T('combo')}</span><b>${r.maxCombo}</b></div>
  <div class="stat"><span>${T('best')}</span><b>${rec.best}</b></div>
  <div class="stat"><span>${T(CFG.mastery[Math.max(0,rec.stars-1)])}</span><b>${rec.stars}/5 ★</b></div></div>
  ${newUnlock?`<div class="card" style="border-color:var(--b)"><b>${T('unlocked')}</b><span>${newUnlock.title}</span></div>`:''}
  <div class="sp"></div>
  <button class="p" id="rt">${T('retry')}</button><div style="height:10px"></div><button id="mn">${T('menu')}</button>`;
 show('result');
 document.getElementById('rt').onclick=()=>startSong(r.song);
 document.getElementById('mn').onclick=()=>{renderHome();show('home')};
}

/* ===== UI ===== */
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id))}
function stars(n){return '★'.repeat(n)+'☆'.repeat(5-n)}
function renderHome(){
 const el=document.getElementById('home');const sk=S.jieebeat.streak;
 let cards=SONGS.map(s=>{const un=S.jieebeat.unlocked.includes(s.id),rec=S.jieebeat.songs[s.id]||{best:0,stars:0,bestCombo:0};
  const req=SONGS.find(x=>x.id===s.requires);
  return `<div class="card ${un?'':'lock'}"><div><b>${un?'':'🔒 '}${s.title}</b>
   <small>${s.chapter} · ${s.category} · ${T('diff')} ${s.difficulty}/5 · ${Math.floor(s.duration/60)}:${String(s.duration%60).padStart(2,'0')}</small>
   <small>${un?`<span class="stars">${stars(rec.stars)}</span> ${T(CFG.mastery[Math.max(0,rec.stars-1)])} · ${rec.best} · x${rec.bestCombo}`:T('locked',{s:req?req.title:'?'})}</small></div>
   ${un?`<button class="p" data-id="${s.id}">${T('play')}</button>`:''}</div>`}).join('');
 el.innerHTML=`<div class="row"><h1>JIEEBEAT</h1><button id="gs" aria-label="${T('settings')}">⚙</button></div>
  <div class="sub">🔥 ${sk.count} ${T('streak')} · ◆ ${S.core.currency.jieeCoins} ${T('coins')}</div>
  <div class="row" style="margin-bottom:12px"><button id="hc" style="flex:1">${T('challenges')}</button><button id="hk" style="flex:1">${T('collection')}</button></div>
  <h2>${T('songs')}</h2>${cards}`;
 el.querySelectorAll('button[data-id]').forEach(b=>b.onclick=()=>startSong(SONGS.find(s=>s.id===b.dataset.id)));
 document.getElementById('gs').onclick=()=>{renderSettings();show('settings')};
 document.getElementById('hc').onclick=renderChallenges;
 document.getElementById('hk').onclick=renderCollection;
}
function renderSettings(){
 const el=document.getElementById('settings'),t=S.tech;
 el.innerHTML=`<h2>${T('settings')}</h2>
  <label>${T('music')}<input type="range" min="0" max="1" step=".05" value="${t.music}" data-k="music"></label>
  <label>${T('sfx')}<input type="range" min="0" max="1" step=".05" value="${t.sfx}" data-k="sfx"></label>
  <label>${T('offset')}<span><button data-o="-10">−</button> <b id="ov">${t.offsetMs}</b> <button data-o="10">+</button></span></label>
  <label>${T('calib')}<button id="cal">▶</button></label>
  <label>${T('reduce')}<input type="checkbox" data-c="reduce" ${t.reduce?'checked':''}></label>
  <label>${T('vib')}<input type="checkbox" data-c="vibrate" ${t.vibrate?'checked':''}></label>
  <label>${T('lang')}<span><button data-l="fr">FR</button> <button data-l="en">EN</button></span></label>
  <div class="sp"></div><button id="rs">${T('reset')}</button><div style="height:10px"></div><button class="p" id="bk">${T('back')}</button>`;
 el.querySelectorAll('input[type=range]').forEach(i=>i.oninput=()=>{S.tech[i.dataset.k]=+i.value;Store.save()});
 el.querySelectorAll('input[type=checkbox]').forEach(i=>i.onchange=()=>{S.tech[i.dataset.c]=i.checked;Store.save()});
 el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{S.tech.offsetMs=Math.max(-300,Math.min(300,S.tech.offsetMs+ +b.dataset.o));document.getElementById('ov').textContent=S.tech.offsetMs;Store.save()});
 el.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{lang=b.dataset.l;S.core.language=lang;Store.save();renderSettings()});
 document.getElementById('rs').onclick=()=>{if(confirm(T('resetq'))){try{localStorage.removeItem(CFG.storeKey)}catch(e){}S=Store.defaults();lang=S.core.language;renderSettings()}};
 document.getElementById('bk').onclick=()=>{renderHome();show('home')};
 document.getElementById('cal').onclick=renderCalib;
}
/* pause auto si l'app perd le focus */
document.addEventListener('visibilitychange',()=>{
 const r=E.run;if(!document.hidden||!r||r.state!=='play')return;
 if(Aud.ctx)Aud.ctx.suspend();r.state='paused';
 const p=document.getElementById('pause');p.innerHTML=`<h2>${T('paused')}</h2><button class="p" id="rsm">${T('resume')}</button><div style="height:10px"></div><button id="qt">${T('menu')}</button>`;show('pause');
 document.getElementById('rsm').onclick=()=>{show(null);Aud.ctx.resume().then(()=>{r.state='play'})};
 document.getElementById('qt').onclick=()=>{r.state='done';cancelAnimationFrame(E.raf);Aud.stop();renderHome();show('home')};
});
/* API de module pour le futur hub JIEE PLAY */
window.JIEEBEAT={getGameProgress:()=>S.jieebeat.songs,getStatistics:()=>S.jieebeat.stats,getProfileData:()=>S.core,getAchievements:()=>S.core.achievements};

/* ===== CALIBRATION : 14 pulsations, on mesure l'écart médian entre chaque toucher et la pulsation la plus proche ===== */
function renderCalib(){
 const el=document.getElementById('settings');
 el.innerHTML=`<h2>${T('calib')}</h2><div class="sub">${T('calibmsg')}</div><p class="big" id="cn">0/8</p><div class="sp"></div>
  <button class="p" id="ct" style="min-height:150px;font-size:24px">TAP</button><div style="height:10px"></div><button id="cb">${T('back')}</button>`;
 const C=window.AudioContext||window.webkitAudioContext;if(!C){renderSettings();return}
 const ctx=new C({latencyHint:'interactive'}),t0=ctx.currentTime+.6,iv=.6,beats=[],ds=[];let done=false;
 for(let i=0;i<14;i++){const t=t0+i*iv,o=ctx.createOscillator(),gn=ctx.createGain();o.frequency.value=880;
  gn.gain.setValueAtTime(.5,t);gn.gain.exponentialRampToValueAtTime(.001,t+.08);o.connect(gn);gn.connect(ctx.destination);o.start(t);o.stop(t+.1);beats.push(t)}
 const close=()=>{try{ctx.close()}catch(e){}};
 document.getElementById('ct').onpointerdown=()=>{
  if(done)return;const p=ctx.currentTime,b=Math.round((p-t0)/iv);if(b<2||b>13)return;/* 2 premières pulsations = échauffement */
  ds.push(p-beats[b]);document.getElementById('cn').textContent=ds.length+'/8';
  if(ds.length>=8){done=true;ds.sort((x,y)=>x-y);const off=Math.max(-300,Math.min(300,Math.round((ds[3]+ds[4])/2*1000)));
   S.tech.offsetMs=off;Store.save();close();
   document.getElementById('cn').textContent=T('calibres',{n:off});
   const ct=document.getElementById('ct');ct.textContent=T('again');ct.onpointerdown=null;ct.onclick=renderCalib}};
 document.getElementById('cb').onclick=()=>{done=true;close();renderSettings()};
}
