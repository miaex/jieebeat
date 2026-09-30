'use strict';
/* ===== COLLECTION : thèmes et effets de frappe cosmétiques (data/collection.json) ; aucun impact sur la difficulté ===== */
let ITEMS=[];
async function loadCollection(){try{ITEMS=await (await fetch('data/collection.json')).json()}catch(e){ITEMS=[]}applyTheme()}
const equippedOf=t=>S.jieebeat.equipped[t]||(t==='fx'?'fx-basic':'theme-neon');
const ownedItem=i=>i.price===0||S.jieebeat.collection.includes(i.id);
function applyTheme(){
 const t=ITEMS.find(i=>i.id===equippedOf('theme'))||ITEMS.find(i=>i.type==='theme');
 if(t){LANE_COL=t.lanes;THEME_BG=t.bg;THEME_FEVER=t.fever}
 const f=ITEMS.find(i=>i.id===equippedOf('fx'));if(f)FX={particles:f.particles,ring:f.ring};
}
function renderCollection(){
 const el=document.getElementById('sub');
 const group=(type,title)=>`<div class="chap"><b>${title}</b></div>`+ITEMS.filter(i=>i.type===type).map(i=>{
  const has=ownedItem(i),eq=equippedOf(type)===i.id;
  const sw=type==='theme'?i.lanes.map(c=>`<i style="display:inline-block;width:14px;height:34px;border-radius:4px;margin-right:3px;background:${c}"></i>`).join(''):'✦';
  return `<div class="card"><div>${sw}<b style="margin-left:8px">${i[lang]}</b></div>${has?(eq?'<span class="stars">✓</span>':`<button data-e="${i.id}">${T('equip')}</button>`):`<button class="p" data-b="${i.id}">${i.price} ◆</button>`}</div>`}).join('');
 el.innerHTML=`<h2>${T('collection')}</h2><div class="sub">◆ ${S.core.currency.jieeCoins} ${T('coins')}</div>`+group('theme',T('themes'))+group('fx',T('effects'))+collectionExtras()+`<div class="sp"></div><button class="p" id="bk2">${T('back')}</button>`;
 show('sub');
 const equip=it=>{S.jieebeat.equipped[it.type]=it.id;applyTheme();Store.save();renderCollection()};
 el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>equip(ITEMS.find(x=>x.id===b.dataset.e)));
 el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const it=ITEMS.find(x=>x.id===b.dataset.b);
  if(!it||S.core.currency.jieeCoins<it.price){b.textContent=T('short');return}
  S.core.currency.jieeCoins-=it.price;S.jieebeat.collection.push(it.id);equip(it)});
 document.getElementById('bk2').onclick=()=>history.back();
}
