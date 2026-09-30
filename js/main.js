'use strict';
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
initNav();
Promise.all([loadSongs(),loadChallenges(),loadCollection(),loadAchievements()]).then(()=>{
 renderHome();show('home');
 store.prefetchIdle(SONGS.filter(s=>s.level===1).map(s=>s.id));/* audio du chapitre 1 en arrière-plan */
});
