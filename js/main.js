'use strict';
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
initNav();
Promise.all([loadSongs(),loadChallenges(),loadCollection()]).then(()=>{renderHome();show('home')});
