'use strict';
/* Mise à jour : si une nouvelle version du service worker prend la main, on propose de recharger (jamais en pleine partie). */
if('serviceWorker' in navigator){
 const had=!!navigator.serviceWorker.controller;
 addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)toast(T('update'),()=>{if(!E.run||E.run.state==='done')location.reload()})});
}
let lastErr=0;/* pas d'erreur JS brute pour le joueur */
addEventListener('error',()=>{if(Date.now()-lastErr>5000){lastErr=Date.now();toast(T('oops'))}});
initNav();
Promise.all([loadI18n(),loadSongs(),loadChallenges(),loadCollection(),loadAchievements()]).then(()=>{
 renderHome();show('home');
 store.prefetchIdle(SONGS.slice(0,5).map(s=>s.id),SONGS.slice(0,12).map(s=>s.id));/* têtes des 12 premiers morceaux + audio des 5 premiers, en arrière-plan */
 if(!S.tech.seenHow){S.tech.seenHow=true;Store.save();push('how');renderHow()}/* premier lancement : Comment jouer */
});
/* Contrat avec le futur hub JIEE PLAY : le hub peut injecter le profil et être prévenu à chaque sauvegarde */
window.JIEEBEAT.configure=o=>{if(o.player){S.core.playerId=o.player.id||S.core.playerId;S.core.nickname=o.player.nickname||S.core.nickname}
 if(o.language){lang=o.language;S.core.language=lang}if(o.onSave)Store.onSave=o.onSave;Store.save()};
