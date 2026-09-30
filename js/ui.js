'use strict';
/* ===== UI : accueil par chapitres, fiche morceau, résultat, paramètres ===== */
let SEL=null;
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id));
 cv.style.visibility=(id===null||id==='pause')?'visible':'hidden';bgRun(id!==null&&id!=='pause');updateNav()}
const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
const levelLabel=l=>{const x=LEVELS.find(v=>v.level===l);return x?x[lang]:''};
const chapterName=l=>CFG.chapterNames[l-1]||('LEVEL '+l);
const rec0=id=>S.jieebeat.songs[id]||{best:0,stars:0,bestCombo:0,plays:0,clears:0};
function chapterList(){const m=new Map();SONGS.forEach(s=>{if(!m.has(s.level))m.set(s.level,[]);m.get(s.level).push(s)});
 return [...m.keys()].sort((a,b)=>a-b).map(l=>({level:l,songs:m.get(l)}))}
const chapterStars=l=>SONGS.filter(s=>s.level===l).reduce((a,s)=>a+rec0(s.id).stars,0);
function chapterOpen(l){return S.tech.unlockAll||l<=1||(chapterOpen(l-1)&&chapterStars(l-1)>=CFG.chapterUnlockStars)}
const coverHTML=(s,big)=>s.cover?`<img class="cover${big?' big':''}" loading="lazy" alt="" src="${s.cover}" style="--c:${s.color}">`:`<div class="cover${big?' big':''}" style="--c:${s.color}"><i></i><i></i><i></i><i></i></div>`;

function openSong(id,play){
 SEL=id;push('song');const s=SONGS.find(x=>x.id===id);if(!s)return;
 Aud.ensure();store.setAudioContext(Aud.ctx);store.hover(id);store.decoded(id).catch(()=>{});/* décodage anticipé : lancement quasi instantané */
 if(play){startSong(s);return}
 renderSong();store.playPreview(id,Math.min(1,S.tech.music*.9)).catch(()=>{});
}
function renderSong(){
 const s=SONGS.find(x=>x.id===SEL),el=document.getElementById('sub');if(!s){history.back();return}
 const rec=rec0(s.id);let mode='normal';
 el.innerHTML=`<div style="text-align:center">${coverHTML(s,true)}<h2 style="margin:16px 0 4px">${s.title}</h2><div class="sub" style="margin-bottom:6px">${s.artist||''}</div>
  <div class="sub">${chapterName(s.level)} · ${levelLabel(s.level)} · ${Math.round(s.bpm)} ${T('bpm')} · ${mmss(s.duration)}</div>
  <div class="stars" style="font-size:26px">${stars(rec.stars)}</div><div class="sub">${T(CFG.mastery[Math.max(0,rec.stars-1)])}</div></div>
  <div class="grid"><div class="stat"><span>${T('best')}</span><b>${rec.best}</b></div><div class="stat"><span>${T('combo')}</span><b>${rec.bestCombo}</b></div></div>
  <div class="seg"><button class="on" data-m="normal">${T('normal')}</button><button data-m="practice">${T('trainmode')}</button></div>
  <div class="sp"></div><button class="p" id="go" style="min-height:58px">${T('play')}</button><div style="height:10px"></div><button id="bk2">${T('back')}</button>`;
 show('sub');
 el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;el.querySelectorAll('[data-m]').forEach(x=>x.classList.toggle('on',x===b))});
 document.getElementById('go').onclick=()=>startSong(s,mode);
 document.getElementById('bk2').onclick=()=>history.back();
}
function renderHome(){
 const el=document.getElementById('home'),sk=S.jieebeat.streak,last=SONGS.find(s=>s.id===S.jieebeat.lastSong)||SONGS[0];
 let h=`<h1>JIEEBEAT</h1><div class="sub">🔥 ${sk.count} ${T('streak')} · ◆ ${S.core.currency.jieeCoins} ${T('coins')}</div>`;
 if(last)h+=`<button class="p hero" data-open="${last.id}" data-play="1">▶ ${T('resume')} · ${last.title}</button>`;
 chapterList().forEach(c=>{
  h+=`<div class="chap"><b>${T('chapter')} ${String(c.level).padStart(2,'0')} — ${chapterName(c.level)}</b><small>${levelLabel(c.level)} · ${chapterStars(c.level)}/${c.songs.length*5} ★</small></div>`;
  if(!chapterOpen(c.level)){h+=`<div class="card lock"><div>🔒 ${T('chaplock',{n:CFG.chapterUnlockStars,c:c.level-1})}</div></div>`;return}
  c.songs.forEach(s=>{const r=rec0(s.id);
   h+=`<div class="card" data-open="${s.id}">${coverHTML(s)}<div class="sp"><b>${s.title}</b><small>${s.artist||'—'} · ${mmss(s.duration)}</small><small><span class="stars">${stars(r.stars)}</span>${r.best?' · '+r.best:''}</small></div><span style="color:var(--dim);font-size:22px">›</span></div>`});
 });
 el.innerHTML=h;
 el.querySelectorAll('[data-open]').forEach(c=>c.onclick=()=>openSong(c.dataset.open,!!c.dataset.play));
}

/* ===== FIN DE RUN, SCORES, PROGRESSION ===== */
function starsOf(acc,ok,perfectRun){if(!ok)return 0;let s=1;CFG.stars.forEach((th,i)=>{if(i>0&&acc>=th)s=i+1});if(s===5&&!perfectRun)s=4;return s}
function finish(r,ok){
 if(E.run!==r)return;
 r.state='done';cancelAnimationFrame(E.raf);Aud.stop();
 const ranked=r.mode.ranked!==false,total=r.counts.PERFECT+r.counts.GREAT+r.counts.GOOD,acc=r.judged?r.acc/r.judged:0;
 const stars_=starsOf(acc,ok,r.counts.GOOD===0&&r.counts.GREAT<=r.judged*.05);
 const openBefore=[1,2,3,4,5].map(chapterOpen),rec=rec0(r.song.id),oldStars=rec.stars;
 let newRec=false,newUnlock=null,ach=[];
 if(ranked){
  newRec=r.score>rec.best;
  rec.best=Math.max(rec.best,r.score);rec.bestCombo=Math.max(rec.bestCombo,r.maxCombo);rec.stars=Math.max(rec.stars,stars_);rec.plays++;if(ok)rec.clears++;
  S.jieebeat.songs[r.song.id]=rec;
  const st=S.jieebeat.stats;st.played++;st.notes+=total;st.bestCombo=Math.max(st.bestCombo,r.maxCombo);st.playMs+=Math.round(performance.now()-r.startedAt);
  if(ok){st.cleared++;S.core.currency.jieeCoins+=Math.max(0,stars_-oldStars)*CFG.coinsPerStar+5;
   const nl=[2,3,4,5].find(l=>!openBefore[l-1]&&chapterOpen(l));if(nl)newUnlock={title:chapterName(nl)}}
  const day=Store.today(),sk=S.jieebeat.streak;
  if(sk.lastDay!==day){const y=new Date();y.setDate(y.getDate()-1);sk.count=sk.lastDay===y.toLocaleDateString('sv')?sk.count+1:1;sk.lastDay=day}
  reportRun(r,ok,acc);ach=checkAchievements();Store.save();
 }
 const left=Math.max(0,Math.round((r.song.chart.length-(r.failT||0))/(r.mode.rate||1)));
 const el=document.getElementById('result');
 el.innerHTML=`<h2 style="color:${ok?'var(--b)':'var(--hot)'}">${T(ok?'done':'over')}</h2>
  <div class="sub">${r.song.title}${ranked?'':' · '+T('practice')}</div>
  ${!ok?`<div class="sub">${T('left',{n:left})}</div>`:''}
  <p class="big">${r.score}</p>${newRec?`<div style="color:#ffd166;font-weight:800">${T('newrec')}</div>`:''}
  ${ranked?`<div class="stars" style="font-size:28px;margin:8px 0">${stars(stars_)}</div>`:''}
  <div class="grid"><div class="stat"><span>${T('acc')}</span><b>${(acc*100).toFixed(1)}%</b></div>
  <div class="stat"><span>${T('combo')}</span><b>${r.maxCombo}</b></div>
  ${ranked?`<div class="stat"><span>${T('best')}</span><b>${rec.best}</b></div><div class="stat"><span>${T(CFG.mastery[Math.max(0,rec.stars-1)])}</span><b>${rec.stars}/5 ★</b></div>`:''}</div>
  ${newUnlock?`<div class="card" style="border-color:var(--b)"><b>${T('chapunlocked')}</b><span>${newUnlock.title}</span></div>`:''}
  ${ach.map(a=>`<div class="card" style="border-color:#ffd166"><b>🏆 ${T('achnew')}</b><span>${a[lang]}</span></div>`).join('')}
  <div class="sp"></div><button class="p" id="rt">${T('retry')}</button><div style="height:10px"></div><button id="mn">${T('menu')}</button>`;
 show('result');history.replaceState({s:'result'},'');CUR='result';
 document.getElementById('rt').onclick=()=>startSong(r.song,r.modeName);
 document.getElementById('mn').onclick=()=>history.back();
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
  <label>${T('testmode')}<input type="checkbox" data-c="unlockAll" ${t.unlockAll?'checked':''}></label>
  <label>${T('dlall')}<button id="dl">⬇</button></label>
  <label>${T('lang')}<span><button data-l="fr">FR</button> <button data-l="en">EN</button></span></label>
  <div class="sp"></div><button id="rs">${T('reset')}</button>`;
 el.querySelectorAll('input[type=range]').forEach(i=>i.oninput=()=>{S.tech[i.dataset.k]=+i.value;Store.save()});
 el.querySelectorAll('input[type=checkbox]').forEach(i=>i.onchange=()=>{S.tech[i.dataset.c]=i.checked;Store.save()});
 el.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{S.tech.offsetMs=Math.max(-300,Math.min(300,S.tech.offsetMs+ +b.dataset.o));document.getElementById('ov').textContent=S.tech.offsetMs;Store.save()});
 el.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{lang=b.dataset.l;S.core.language=lang;Store.save();renderSettings();updateNav()});
 document.getElementById('dl').onclick=e=>{const b=e.currentTarget;b.disabled=true;store.downloadAll((n,m)=>{b.textContent=n+'/'+m}).then(()=>{b.textContent='✓'})};
 document.getElementById('rs').onclick=()=>{if(confirm(T('resetq'))){try{localStorage.removeItem(CFG.storeKey)}catch(e){}S=Store.defaults();lang=S.core.language;renderSettings()}};
 document.getElementById('cal').onclick=()=>{push('calib');renderCalib()};
}
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
 calibStop=()=>{done=true;close()};
 document.getElementById('ct').onpointerdown=()=>{
  if(done)return;const p=ctx.currentTime,b=Math.round((p-t0)/iv);if(b<2||b>13)return;/* 2 premières pulsations = échauffement */
  ds.push(p-beats[b]);document.getElementById('cn').textContent=ds.length+'/8';
  if(ds.length>=8){done=true;ds.sort((x,y)=>x-y);const off=Math.max(-300,Math.min(300,Math.round((ds[3]+ds[4])/2*1000)));
   S.tech.offsetMs=off;Store.save();close();
   document.getElementById('cn').textContent=T('calibres',{n:off});
   const ct=document.getElementById('ct');ct.textContent=T('again');ct.onpointerdown=null;ct.onclick=renderCalib}};
 document.getElementById('cb').onclick=()=>history.back();
}
