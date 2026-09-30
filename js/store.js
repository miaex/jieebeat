'use strict';
/* ===== STORE (3 niveaux : core / jieebeat / tech, versionné) ===== */
const Store={
 defaults(){return{schemaVersion:CFG.schemaVersion,
  core:{playerId:'local-'+Math.random().toString(36).slice(2,9),nickname:'Player',language:navigator.language&&navigator.language.startsWith('en')?'en':'fr',currency:{jieeCoins:0},achievements:[]},
  jieebeat:{unlocked:['song-001'],songs:{},streak:{count:0,lastDay:''},stats:{played:0,cleared:0,notes:0,bestCombo:0,playMs:0},collection:['theme-neon']},
  tech:{offsetMs:0,music:.8,sfx:.8,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,vibrate:true}}},
 load(){try{const r=JSON.parse(localStorage.getItem(CFG.storeKey));if(!r||typeof r!=='object')return this.defaults();return this.migrate(r)}catch(e){return this.defaults()}},
 migrate(r){const d=this.defaults();/* v1 -> futures migrations ici */
  return{schemaVersion:CFG.schemaVersion,core:{...d.core,...r.core},jieebeat:{...d.jieebeat,...r.jieebeat,stats:{...d.jieebeat.stats,...(r.jieebeat||{}).stats}},tech:{...d.tech,...r.tech}}},
 save(){try{localStorage.setItem(CFG.storeKey,JSON.stringify(S))}catch(e){}},
 today(){return new Date().toLocaleDateString('sv')/* date locale, fuseau de l'appareil */}
};
let S=Store.load();lang=S.core.language;
