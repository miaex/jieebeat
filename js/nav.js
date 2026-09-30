'use strict';
/* ===== NAVIGATION : le bouton retour natif fait partie du parcours (History API).
   Un retour = un écran. En jeu : retour = pause, retour encore = menu. Sur l'accueil : rien ne se passe, l'app ne se ferme jamais. ===== */
let CUR='home',calibStop=null,navArmed=false;
function push(name){history.pushState({s:name},'');CUR=name;updateNav()}
const TABS={home:'tabhome',challenges:'tabchal',collection:'tabcol',settings:'tabset'};
function updateNav(){/* barre du bas : visible uniquement sur les écrans de menu */
 const nb=document.getElementById('nav');if(!nb)return;
 nb.style.display=TABS[CUR]?'flex':'none';
 nb.querySelectorAll('button').forEach(b=>{b.classList.toggle('act',b.dataset.t===CUR);b.querySelector('span').textContent=T(TABS[b.dataset.t])});
}
function goTab(t){/* les onglets remplacent l'entrée d'historique : un retour ramène toujours à l'accueil */
 if(t===CUR)return;
 if(t==='home'){history.back();return}
 if(CUR==='home')push(t);else{history.replaceState({s:t},'');CUR=t;updateNav()}
 if(t==='settings'){renderSettings();show('settings')}else if(t==='challenges')renderChallenges();else renderCollection();
}
function quitRun(){cancelAnimationFrame(E.raf);Aud.stop();E.run=null}
function pauseGame(){
 const r=E.run;if(!r||r.state!=='play')return false;
 if(Aud.ctx)Aud.ctx.suspend();r.state='paused';
 const p=document.getElementById('pause');
 p.innerHTML=`<h2>${T('paused')}</h2><button class="p" id="rsm">${T('resume')}</button><div style="height:10px"></div><button id="qt">${T('menu')}</button>`;
 show('pause');CUR='pause';
 document.getElementById('rsm').onclick=()=>{history.replaceState({s:'game'},'');CUR='game';show(null);Aud.ctx.resume().then(()=>{r.state='play'})};
 document.getElementById('qt').onclick=()=>history.back();
 return true;
}
function route(s){
 const r=E.run;if(s!=='song'&&store)store.stopPreview();
 if(r&&r.state==='play'&&s!=='pause'){pauseGame();history.pushState({s:'pause'},'');return}
 if(r)quitRun();
 if(calibStop){calibStop();calibStop=null}
 CUR=(s==='settings'||s==='challenges'||s==='collection'||s==='song')?s:'home';
 if(CUR==='settings'){renderSettings();show('settings')}
 else if(CUR==='song')renderSong();
 else if(CUR==='challenges')renderChallenges();
 else if(CUR==='collection')renderCollection();
 else{renderHome();show('home')}
}
addEventListener('popstate',e=>{
 const s=e.state&&e.state.s;
 if(!s||s==='guard'){history.pushState({s:'home'},'');if(E.run||CUR!=='home')route('home');return}/* on ne sort jamais */
 route(s);
});
function initNav(){
 history.replaceState({s:'guard'},'');
 document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>goTab(b.dataset.t));
 /* Chrome ignore les entrées d'historique créées sans geste utilisateur : on arme au premier toucher */
 addEventListener('pointerup',()=>{if(navArmed)return;navArmed=true;history.pushState({s:'home'},'');Aud.ensure()},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&pauseGame())history.replaceState({s:'pause'},'')});
}
