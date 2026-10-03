'use strict';
// JIEEBEAT — songStore.js : chargement rapide des morceaux (ES module, sans dépendance)
// Stratégie : manifeste léger (index.json) -> previews/covers à la demande -> audio complet préchargé
// dès qu'un morceau est sélectionné -> tout mis en Cache Storage (2e lancement = instantané, hors-ligne OK).
//
// Usage :
//   import { SongStore } from './songStore.js';
//   const store = new SongStore({ base: './', audioContext: ctx });
//   const songs = await store.loadManifest();          // triés par difficulté
//   store.hover(songId);                               // sur sélection dans le menu : précharge chart + audio
//   const { chart, buffer } = await store.load(songId);// au lancement : AudioBuffer prêt + chart.json
//   store.playPreview(songId);                         // extrait de 12 s (après un geste utilisateur)

const CACHE_NAME = 'jieebeat-songs-v1';
// Un fichier audio MP4/M4A commence par « ftyp » ; un JSON par { ou [. Tout le reste (page HTML de secours, fichier tronqué)
// est refusé et jamais gardé en cache : c'est ce qui rendait certains morceaux muets ou bloqués.
const _ftyp = b => !!b && b.byteLength > 12 && String.fromCharCode(...new Uint8Array(b, 4, 4)) === 'ftyp';
const _json = b => { if (!b || b.byteLength < 2) return false; const c = new Uint8Array(b, 0, 1)[0]; return c === 123 || c === 91; };

class SongStore {
  constructor({ base = './', audioContext = null } = {}) {
    this.base = base;
    this.ctx = audioContext;
    this.manifest = null;
    this.byId = new Map();
    this._bytes = new Map();   // url -> Promise<ArrayBuffer>
    this._decoded = new Map(); // id  -> Promise<AudioBuffer>
    this._charts = new Map();  // id  -> Promise<object>
    this._previewSrc = null;
    this._idleQueue = [];
  }

  setAudioContext(ctx) { this.ctx = ctx; }

  async _fetchBytes(url) {
    if (this._bytes.has(url)) return this._bytes.get(url);
    const ok = url.endsWith('.m4a') ? _ftyp : url.endsWith('.json') ? _json : null;
    const p = (async () => {
      let cache = null;
      try { cache = await caches.open(CACHE_NAME); } catch (_) { /* navigation privée, etc. */ }
      if (cache) {
        const hit = await cache.match(url);
        if (hit) { const b = await hit.arrayBuffer(); if (!ok || ok(b)) return b; try { await cache.delete(url); } catch (_) {} }
      }
      for (let k = 0; k < 2; k++) {            // 2 essais : le 2e ignore tout cache HTTP
        let res;
        try { res = await fetch(url, k ? { cache: 'reload' } : undefined); } catch (e) { if (k) throw e; continue; }
        if (!res.ok) { if (k) throw new Error('HTTP ' + res.status + ' ' + url); continue; }
        const b = await res.clone().arrayBuffer();
        if (ok && !ok(b)) continue;
        if (cache) { try { await cache.put(url, res); } catch (_) {} }
        return b;
      }
      throw new Error('Fichier invalide : ' + url);
    })();
    this._bytes.set(url, p);
    p.catch(() => this._bytes.delete(url));
    return p;
  }

  async loadManifest() {
    if (this.manifest) return this.manifest.songs;
    const res = await fetch(this.base + 'songs/index.json', { cache: 'no-cache' });
    this.manifest = await res.json();
    this.manifest.songs.forEach(s => this.byId.set(s.id, s));
    return this.manifest.songs;
  }

  get levels() { return this.manifest ? this.manifest.levels : []; }
  songsOfLevel(level) { return this.manifest.songs.filter(s => s.level === level); }
  coverUrl(id) { const s = this.byId.get(id); return s && s.cover ? this.base + s.cover : null; }

  chart(id) {
    if (!this._charts.has(id)) {
      const s = this.byId.get(id);
      this._charts.set(id, this._fetchBytes(this.base + s.chart).then(b => JSON.parse(new TextDecoder().decode(b))));
    }
    return this._charts.get(id);
  }

  // Chart d'un niveau de difficulté (1 = chart.json, 2..5 = chart.N.json)
  chartTier(id, t) {
    if (!t || t < 2) return this.chart(id);
    const k = id + '#' + t;
    if (!this._charts.has(k)) {
      const s = this.byId.get(id);
      this._charts.set(k, this._fetchBytes(this.base + s.chart.replace(/chart\.json$/, 'chart.' + t + '.json')).then(b => JSON.parse(new TextDecoder().decode(b))));
      this._charts.get(k).catch(() => this._charts.delete(k));
    }
    return this._charts.get(k);
  }

  // Décodage : à appeler idéalement APRÈS un geste utilisateur (AudioContext démarré).
  decoded(id) {
    if (!this._decoded.has(id)) {
      const s = this.byId.get(id);
      const url = this.base + s.audio;
      const p = this._fetchBytes(url).then(b => this.ctx.decodeAudioData(b.slice(0))).finally(() => this._bytes.delete(url));
      this._decoded.set(id, p);
      p.catch(() => this._decoded.delete(id));
    }
    return this._decoded.get(id);
  }

  // Sélection dans le menu : lance le téléchargement en avance (octets + chart), décodage à la demande.
  hover(id) {
    if (navigator.connection && navigator.connection.saveData) return; // respecte le mode économie de données
    const s = this.byId.get(id); if (!s) return;
    this.chart(id).catch(() => {});
    if (s.head) this._fetchBytes(this.base + s.head).catch(() => {});
    this.warm(this.base + s.audio);
  }

  // Tête du morceau (45 s) : petit fichier, décodé en une fraction de seconde -> démarrage rapide.
  decodedHead(id) {
    const k = 'h:' + id;
    if (!this._decoded.has(k)) {
      const url = this.base + this.byId.get(id).head;
      const p = this._fetchBytes(url).then(b => this.ctx.decodeAudioData(b.slice(0))).finally(() => this._bytes.delete(url));
      this._decoded.set(k, p); p.catch(() => this._decoded.delete(k));
    }
    return this._decoded.get(k);
  }
  dropHead(id) { this._decoded.delete('h:' + id); }
  // Libère la RAM : ne garde que le morceau courant.
  trim(keepId) { for (const k of [...this._decoded.keys()]) if (k !== keepId && k !== 'h:' + keepId) this._decoded.delete(k); }

  async load(id) {
    const [chart, buffer] = await Promise.all([this.chart(id), this.decoded(id)]);
    this._evictDecoded(id);
    return { chart, buffer };
  }

  // Garde au plus 2 AudioBuffers en RAM (un morceau de 4 min décodé ≈ 85 Mo).
  _evictDecoded(keepId) {
    const keys = [...this._decoded.keys()];
    while (keys.length > 2) {
      const k = keys.shift();
      if (k !== keepId) this._decoded.delete(k);
    }
  }

  // Extrait de 12 s (~90 Ko) lu via <audio> : pas de décodage complet, démarre en quelques dizaines de ms.
  async playPreview(id, volume = 0.8) {
    this.stopPreview();
    const s = this.byId.get(id); if (!s) return;
    if (!s.preview) return;
    const bytes = await this._fetchBytes(this.base + s.preview);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mp4' }));
    const a = new Audio(url); a.volume = volume;
    a.onended = () => URL.revokeObjectURL(url);
    this._previewSrc = { a, url };
    try { await a.play(); } catch (_) { /* refusé sans geste utilisateur */ }
  }
  stopPreview() {
    if (!this._previewSrc) return;
    const { a, url } = this._previewSrc;
    a.pause(); URL.revokeObjectURL(url); this._previewSrc = null;
  }

  // Préchargement en arrière-plan quand le navigateur est inactif : covers + previews d'abord (≈ 100 Ko/morceau),
  // puis l'audio complet du niveau courant. Un seul téléchargement à la fois pour ne pas gêner le jeu.
  // Met une URL dans le Cache Storage sans garder les octets en RAM.
  async warm(url) {
    try {
      const c = await caches.open(CACHE_NAME), isA = url.endsWith('.m4a');
      const hit = await c.match(url);
      if (hit) { const b = await (await hit.blob()).slice(0, 12).arrayBuffer(); if (!isA || _ftyp(b)) return; await c.delete(url); }
      const r = await fetch(url);
      if (!r.ok || /text\/html/.test(r.headers.get('content-type') || '')) return;
      await c.put(url, r);
      if (isA) { const h2 = await c.match(url); const b2 = await (await h2.blob()).slice(0, 12).arrayBuffer(); if (!_ftyp(b2)) await c.delete(url); }
    } catch (_) {}
  }
  // Supprime du cache les entrées invalides (anciennes pages HTML enregistrées à la place d'un audio).
  async purgeBad() {
    let n = 0;
    try {
      const c = await caches.open(CACHE_NAME);
      for (const rq of await c.keys()) {
        const u = rq.url, a = u.endsWith('.m4a'), j = u.endsWith('.json');
        if (!a && !j) continue;
        const r = await c.match(rq); if (!r) continue;
        const b = await (await r.blob()).slice(0, 12).arrayBuffer();
        if (a ? !_ftyp(b) : !_json(b)) { await c.delete(rq); n++; }
      }
    } catch (_) {}
    return n;
  }
  // Vérifie sur le serveur que chaque fichier audio existe et a la bonne taille. Renvoie les ids en défaut.
  async audit(cb) {
    const bad = [], all = this.manifest.songs; let n = 0;
    for (const s of all) {
      let ok = true;
      for (const [u, size] of [[s.audio, s.bytes]].concat(s.head ? [[s.head, 0]] : [])) {
        try {
          const r = await fetch(this.base + u, { method: 'HEAD', cache: 'no-store' });
          if (!r.ok) ok = false;
          else if (size) { const L = +r.headers.get('content-length'); if (L && Math.abs(L - size) > 4096) ok = false; }
        } catch (_) { ok = false; }
      }
      if (!ok) bad.push(s.id);
      if (cb) cb(++n, all.length, bad);
    }
    return bad;
  }
  // Préchargement discret (covers/previews sont déjà précachés par le service worker) : audio des morceaux demandés.
  prefetchIdle(audioIds = [], headIds = []) {
    if (navigator.connection && navigator.connection.saveData) return;
    const hs = headIds.map(id => this.byId.get(id)).filter(s => s && s.head).map(s => this.base + s.head);
    const q = hs.concat(audioIds.map(id => this.byId.get(id)).filter(Boolean).map(s => this.base + s.audio));
    const step = () => { const u = q.shift(); if (!u) return; this.warm(u).finally(() => (window.requestIdleCallback || setTimeout)(step, 200)); };
    (window.requestIdleCallback || setTimeout)(step, 2500);
  }
  async downloadAll(cb) {
    let n = 0; const all = this.manifest.songs;
    for (const s of all) { if (s.head) await this.warm(this.base + s.head); await this.warm(this.base + s.audio); if (cb) cb(++n, all.length); }
  }

  async cachedSize() {
    try {
      const c = await caches.open(CACHE_NAME); const keys = await c.keys(); return keys.length;
    } catch (_) { return 0; }
  }
  async clearCache() { try { await caches.delete(CACHE_NAME); } catch (_) {} }
}
