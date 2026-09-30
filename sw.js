/* Service Worker : cache-first. Incrémenter VERSION à chaque mise à jour pour renouveler le cache. */
const VERSION='jieebeat-v3';
const ASSETS=["./", "index.html", "manifest.webmanifest", "css/style.css", "js/config.js", "js/i18n.js", "js/store.js", "js/songs.js", "js/audio.js", "js/engine.js", "js/ui.js", "js/daily.js", "js/collection.js", "js/main.js", "data/challenges.json", "data/collection.json", "icons/icon-192.png", "icons/icon-512.png", "songs/index.json", "songs/song-001/metadata.json", "songs/song-001/chart.json", "songs/song-002/metadata.json", "songs/song-002/chart.json"];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match('index.html'))));
});
