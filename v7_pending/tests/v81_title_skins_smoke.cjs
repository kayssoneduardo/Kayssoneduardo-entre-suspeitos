'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const win={},src=fs.readFileSync('web/title_skins_v81.js','utf8');
vm.runInNewContext(src,{window:win},{filename:'title_skins_v81.js'});
const api=win.ESTitleSkinsV81;
assert(api&&api.describe&&api.emblem&&api.sorted,'Skin theme API exists');
function d(n,r,g){return api.describe(n,r,g);}
assert.equal(d('Rei das Mil Máscaras','lenda','m').theme,'masks');
assert.equal(d('Coroa do Último Veredito','lenda','f').theme,'royal');
assert.equal(d('Fantasma Absoluto','mistico','f').theme,'ghost');
assert.equal(d('Último Habitante da Névoa','mistico','m').theme,'mist');
assert.equal(d('Oráculo da Verdade','lenda','m').theme,'oracle');
assert.equal(d('Olhar Atento','comum','m').theme,'eye');
assert.equal(d('Máscara de Obsidiana','raro','f').tier,'epico');
assert.equal(d('Sombra Invisível','raro','m').theme,'ghost');
assert.equal(d('Rei das Mil Máscaras','lenda','m').skinId,d('Rei das Mil Máscaras','lenda','m').skinId);
assert.notEqual(d('Rei das Mil Máscaras','lenda','m').skinId,d('Rei das Mil Máscaras','lenda','f').skinId);
const markup=api.emblem({title:'coroa',gender:'f'},[{code:'coroa',name:'Coroa do Último Veredito',rarity:'lenda'}]);
assert(markup.includes('es81-theme-royal')&&markup.includes('data-gender="f"'));
assert(api.emblem({title:'x',gender:'m'},[{code:'x',name:'<svg onload=alert(1)>',rarity:'mistico'}]).includes('es81-skin-mistico'));
const ranked=api.sorted([{id:'b',room_points:20},{id:'a',room_points:45},{id:'c',room_points:-25}]);
assert.equal(ranked[0].id,'a');assert.equal(ranked[2].id,'c');
assert.equal(api.sorted([{id:'b'},{id:'a'}])[0].id,'b','No fake ranking without server');
const html=fs.readFileSync('web/index.html','utf8'),client=fs.readFileSync('web/online.js','utf8');
assert(html.indexOf('title_skins_v81.js')<html.indexOf('judgment_arena.js'));
assert(html.includes('title_skins_v81.css'));
assert(client.includes("MAX=30"),'30 players in staged UI');
assert(client.includes('es_v81_room_ranking'), 'Room rankings from server only');
assert(client.includes('es_v81_monthly_ranking'), 'Monthly ranking RPC');
assert(client.includes('ACERTO SOLITÁRIO'), 'Neutral result presentation');
const sql=fs.readFileSync('v7_pending/sql/v81_solo_majority_neutral_DRAFT.sql','utf8');
assert(sql.includes('count(*)::numeric/2'),'Majority threshold is strict');
assert(sql.includes('not exists(select 1 from unnest(rd.impostor_ids) imp'),'Must choose ALL impostors');
assert(sql.includes('not protected_loss'),'Neutral must not count as defeat');
assert(sql.includes('case when protected_loss then 0 else greatest(0,v_xp) end'),'Neutral XP');
const room=fs.readFileSync('v7_pending/sql/v81_room_30_players_DRAFT.sql','utf8');
assert(room.includes('between 3 and 30'));
const monthly=fs.readFileSync('v7_pending/sql/v81_monthly_seasons_DRAFT.sql','utf8');
assert(monthly.includes("America/Fortaleza")&&monthly.includes('es_v81_monthly_podium'));
assert(monthly.includes('on conflict(month_start,position) do nothing'),'Snapshot must be idempotent');

const realTitles=(()=>{
 const w={};vm.runInNewContext(fs.readFileSync('web/title_catalog_v82.js','utf8'),{window:w},{filename:'title_catalog_v82.js'});return w.ESTitleCatalogV82;
})();
assert.equal(realTitles.length,200,'Must have all 200 real title entries');
const signatures=new Set();
for(const t of realTitles){
 const outfit=api.describe(t.name,t.rarity,'m',t.code);
 const partner=api.describe(t.name,t.rarity,'f',t.code);
 assert.notEqual(outfit.skinId,partner.skinId, 'Both genders for '+t.code);
 assert(outfit.colors.length===3&&outfit.weapon&&outfit.armor&&outfit.cloak&&outfit.helm,'Distinct detailed outfit for '+t.code);
 assert(outfit.effects==={comum:0,incomum:0,epico:1,lenda:2,mistico:3}[outfit.tier],'Animation budget for '+t.code);
 signatures.add(outfit.skinId);
 const full=api.figure({title:t.code,gender:'f'},realTitles);
 assert(full.includes('es81-costume-svg')&&full.includes('data-effect-count="'+outfit.effects+'"'));
}
assert.equal(signatures.size,200,'Every real title gets its own skin identity');
assert.notEqual(api.describe('Fantasma Absoluto','mistico','f').colors[2],
 api.describe('Verdade Silenciosa','mistico','f').colors[2], 'Mythic outfit palette is theme-based, not rarity red');
assert.notEqual(api.describe('Rei das Mil Máscaras','lenda','m').colors[2],
 api.describe('Oráculo da Verdade','lenda','m').colors[2], 'Legendary colour is theme-based');
const costumeCss=fs.readFileSync('web/title_skins_v81.css','utf8');
assert(costumeCss.includes('.es81-tier-epico .es81-motion-1'));
assert(costumeCss.includes('.es81-tier-lenda .es81-motion-2'));
assert(costumeCss.includes('.es81-tier-mistico .es81-motion-3'));
assert(costumeCss.includes('.judge-title.title-mistico'));
assert(costumeCss.includes('.judge-name{color:#f6f0ff!important'));
assert(!costumeCss.includes('.es81-skin-mistico{filter:drop-shadow(0 0 12px #ff173f)'));

console.log('PASSOU V8.1: title semantics, gender, exact rare tier mapping, 30-player stage, solo majority and monthly drafts.');
