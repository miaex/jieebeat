'use strict';
/* ===== STORE (3 niveaux : core / jieebeat / tech, versionné) ===== */
const MIG={/* MIG[n] convertit la sauvegarde n -> n+1 */1:r=>r,
 2:r=>{if(r.tech&&r.tech.padSounds===false){r.jieebeat=r.jieebeat||{};r.jieebeat.equipped={...(r.jieebeat.equipped||{}),sound:'snd-pluck'}}return r}};
const Store={
 defaults(){return{schemaVersion:CFG.schemaVersion,
  core:{playerId:'local-'+Math.random().toString(36).slice(2,9),nickname:'Player',language:navigator.language&&navigator.language.startsWith('en')?'en':'fr',currency:{jieeCoins:0},achievements:[]},
  jieebeat:{unlocked:[],lastSong:'',songs:{},streak:{count:0,lastDay:''},stats:{played:0,cleared:0,notes:0,bestCombo:0,playMs:0,holds:0,perfects:0,modWins:0},collection:['theme-neon'],equipped:{theme:'theme-neon'},dailyChallenges:{day:'',items:[]}},
  tech:{offsetMs:0,music:.8,sfx:.8,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,vibrate:true,unlockAll:false,seenHow:false,padSounds:true,tier:1,mods:[]}}},
 load(){try{const r=JSON.parse(localStorage.getItem(CFG.storeKey));if(!r||typeof r!=='object')return this.defaults();return this.migrate(r)}catch(e){return this.defaults()}},
 migrate(r){let v=r.schemaVersion||1;while(v<CFG.schemaVersion){if(MIG[v])r=MIG[v](r)||r;v++}const d=this.defaults();/* v1 -> futures migrations ici */
  return{schemaVersion:CFG.schemaVersion,core:{...d.core,...r.core},jieebeat:{...d.jieebeat,...r.jieebeat,stats:{...d.jieebeat.stats,...(r.jieebeat||{}).stats}},tech:{...d.tech,...r.tech}}},
 save(){try{localStorage.setItem(CFG.storeKey,JSON.stringify(S))}catch(e){}if(this.onSave)try{this.onSave(S)}catch(e){}},
 today(){return new Date().toLocaleDateString('sv')/* date locale, fuseau de l'appareil */}
};
let S=Store.load();lang=S.core.language;
