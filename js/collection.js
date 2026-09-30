'use strict';
/* ===== COLLECTION : thèmes cosmétiques définis dans data/collection.json (aucun effet sur la difficulté) ===== */
let ITEMS=[];
async function loadCollection(){try{ITEMS=await (await fetch('data/collection.json')).json()}catch(e){ITEMS=[]}applyTheme()}
function applyTheme(){const t=ITEMS.find(i=>i.id===S.jieebeat.equipped.theme)||ITEMS[0];if(t){LANE_COL=t.lanes;THEME_BG=t.bg;THEME_FEVER=t.fever}}
function renderCollection(){
 const el=document.getElementById('sub'),own=S.jieebeat.collection,eq=S.jieebeat.equipped.theme;
 el.innerHTML=`<h2>${T('collection')}</h2><div class="sub">◆ ${S.core.currency.jieeCoins} ${T('coins')}</div>`+ITEMS.map(i=>{
  const has=own.includes(i.id),sw=i.lanes.map(c=>`<i style="display:inline-block;width:14px;height:34px;border-radius:4px;margin-right:3px;background:${c}"></i>`).join('');
  return `<div class="card"><div>${sw}<b style="margin-left:8px">${i[lang]}</b></div>${has?(eq===i.id?'<span class="stars">✓</span>':`<button data-e="${i.id}">${T('equip')}</button>`):`<button class="p" data-b="${i.id}">${i.price} ◆</button>`}</div>`}).join('')+
  `<div class="sp"></div><button class="p" id="bk2">${T('back')}</button>`;
 show('sub');
 el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{S.jieebeat.equipped.theme=b.dataset.e;applyTheme();Store.save();renderCollection()});
 el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const it=ITEMS.find(x=>x.id===b.dataset.b);
  if(!it||S.core.currency.jieeCoins<it.price){b.textContent=T('short');return}
  S.core.currency.jieeCoins-=it.price;own.push(it.id);S.jieebeat.equipped.theme=it.id;applyTheme();Store.save();renderCollection()});
 document.getElementById('bk2').onclick=()=>history.back();
}
