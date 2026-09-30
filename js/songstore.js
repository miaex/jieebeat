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
    const p = (async () => {
      let cache = null;
      try { cache = await caches.open(CACHE_NAME); } catch (_) { /* navigation privée, etc. */ }
      if (cache) {
        const hit = await cache.match(url);
        if (hit) return hit.arrayBuffer();
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
      if (cache) { try { await cache.put(url, res.clone()); } catch (_) {} }
      return res.arrayBuffer();
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
    try { const c = await caches.open(CACHE_NAME); if (await c.match(url)) return; const r = await fetch(url); if (r.ok) await c.put(url, r); } catch (_) {}
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
