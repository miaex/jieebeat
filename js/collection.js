'use strict';
/* ===== BOUTIQUE & COLLECTION : thèmes, effets, touches, traînées, combo, sons, titres (data/collection.json). Purement cosmétique. ===== */
let ITEMS=[],COLCAT='theme',COS={tile:'classic',trail:'none',combo:{color:'#f3efff'},kit:'drumpad'};
const CATS=['theme','fx','tile','trail','combo','sound','title','stats'];
const DEFAULT_EQ={theme:'theme-neon',fx:'fx-basic',tile:'tile-classic',trail:'trail-none',combo:'combo-classic',sound:'snd-drumpad',title:'title-rookie'};
async function loadCollection(){try{ITEMS=await (await fetch('data/collection.json')).json()}catch(e){ITEMS=[]}applyTheme()}
const equippedOf=t=>S.jieebeat.equipped[t]||DEFAULT_EQ[t];
const ownedItem=i=>i.price===0||S.jieebeat.collection.includes(i.id);
const itemOf=t=>ITEMS.find(i=>i.id===equippedOf(t))||ITEMS.find(i=>i.type===t);
function applyTheme(){/* applique tout ce qui est équipé */
 const th=itemOf('theme');if(th){LANE_COL=th.lanes;THEME_BG=th.bg;THEME_FEVER=th.fever}
 const f=itemOf('fx');if(f)FX={particles:f.particles,ring:f.ring,shape:f.shape||'square',pal:f.pal||'lane'};
 const ti=itemOf('tile');COS.tile=ti?ti.style:'classic';
 const tr=itemOf('trail');COS.trail=tr?tr.kind:'none';
 const cb=itemOf('combo');COS.combo=cb||{color:'#f3efff'};
 const sd=itemOf('sound');COS.kit=sd?sd.kit:'drumpad';
}
function itemPreview(i){
 if(i.type==='theme')return i.lanes.map(c=>`<i class="sw" style="background:${c}"></i>`).join('');
 if(i.type==='fx')return '<span class="pv">✦</span>';
 if(i.type==='tile')return `<i class="tl tl-${i.style}"></i>`;
 if(i.type==='trail')return '<span class="pv">☄</span>';
 if(i.type==='combo')return `<span class="pv" style="color:${i.color||'#fff'};text-shadow:0 0 8px ${i.glow||'transparent'};font-weight:800">×128</span>`;
 if(i.type==='sound')return `<button data-p="${i.kit}" aria-label="preview">🔊</button>`;
 return '<span class="pv">♛</span>';
}
function renderCollection(){
 const el=document.getElementById('sub');
 const chips=`<div class="seg wrap">${CATS.map(c=>`<button data-cat="${c}" class="${c===COLCAT?'on':''}">${T('cat_'+c)}</button>`).join('')}</div>`;
 let body='';
 if(COLCAT==='stats')body=collectionExtras();
 else body=ITEMS.filter(i=>i.type===COLCAT).map(i=>{
  const has=ownedItem(i),eq=equippedOf(i.type)===i.id;
  return `<div class="card"><div class="sp" style="display:flex;align-items:center;gap:10px">${itemPreview(i)}<span><b>${i.type==='title'?'« '+i[lang]+' »':i[lang]}</b>${i.tonal?`<small>♪ ${T('tonalnote')}</small>`:''}</span></div>${has?(eq?'<span class="stars">✓</span>':`<button data-e="${i.id}">${T('equip')}</button>`):`<button class="p" data-b="${i.id}">${i.price} ◆</button>`}</div>`}).join('');
 el.innerHTML=`<h2>${T('collection')}</h2><div class="sub">◆ ${S.core.currency.jieeCoins} ${T('coins')}</div>${chips}${body}<div class="sp"></div>`;
 show('sub');
 const equip=it=>{S.jieebeat.equipped[it.type]=it.id;applyTheme();Store.save();renderCollection();if(it.type==='sound')Aud.previewKit(it.kit)};
 el.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{COLCAT=b.dataset.cat;renderCollection()});
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>Aud.previewKit(b.dataset.p));
 el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>equip(ITEMS.find(x=>x.id===b.dataset.e)));
 el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const it=ITEMS.find(x=>x.id===b.dataset.b);
  if(!it||S.core.currency.jieeCoins<it.price){b.textContent=T('short');return}
  S.core.currency.jieeCoins-=it.price;S.jieebeat.collection.push(it.id);equip(it)});
}
