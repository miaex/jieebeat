'use strict';
/* ===== I18N : textes dans i18n/fr.json et i18n/en.json (clé absente -> français -> clé brute) ===== */
let I18N={fr:{},en:{}},lang='fr';
async function loadI18n(){for(const l of ['fr','en']){try{I18N[l]=await (await fetch(`i18n/${l}.json`)).json()}catch(e){}}}
const T=(k,v={})=>String((I18N[lang]&&I18N[lang][k])||(I18N.fr&&I18N.fr[k])||k).replace(/\{(\w+)\}/g,(_,x)=>v[x]);
