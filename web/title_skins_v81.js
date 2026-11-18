/* Entre Suspeitos V8.1 - title-derived skins, draft only. No external APIs.
 * Every unlocked title receives a deterministic named design; nothing is randomized
 * at render time. Male and female variants share gameplay and rarity.
 */
(function(){
'use strict';
const FOLD=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TIERS=Object.freeze({comum:'comum',incomum:'incomum',raro:'epico',epico:'epico',lenda:'lenda',mistico:'mistico'});
const ORDERS={comum:0,incomum:1,epico:2,lenda:3,mistico:4};
const THEME=[
 {id:'masks',rx:/mascar|disfarc|alibi|blefe|engan|duas faces/,symbol:'◈',label:'Máscaras do engano',artefact:'máscara ritual',palette:'#bf91b2'},
 {id:'mist',rx:/nevoa|bruma|eco|sussurr|vulto/,symbol:'≋',label:'Mantos da névoa',artefact:'manto vaporoso',palette:'#8ec7db'},
 {id:'ghost',rx:/fantasma|invisivel|intocavel|ausencia/,symbol:'♧',label:'Aparição espectral',artefact:'véu espectral',palette:'#bfc3e9'},
 {id:'royal',rx:/coroa|rei|rainha|imperador|soberan|trono|veredito/,symbol:'♛',label:'Monarca do tribunal',artefact:'coroa cerimonial',palette:'#eac06d'},
 {id:'oracle',rx:/oraculo|profeci|etern|estrela|farol/,symbol:'✦',label:'Profecia luminosa',artefact:'orbe do destino',palette:'#c5baf2'},
 {id:'abyss',rx:/abismo|destino|impossivel|elo/,symbol:'◇',label:'Guardiã(o) do abismo',artefact:'runas do vazio',palette:'#b566db'},
 {id:'detective',rx:/detetive|lupa|investig|pista|evidencia|analista|vigia/,symbol:'⌕',label:'Investigador arcano',artefact:'lupa encantada',palette:'#84c9a9'},
 {id:'shadow',rx:/sombra|penumbra|ocult|noturn/,symbol:'☽',label:'Sentinela das sombras',artefact:'lâminas sombrias',palette:'#9290dc'},
 {id:'blade',rx:/lamina|navalha|aco|implacavel|inquisidor|guardiao/,symbol:'⚔',label:'Espada do julgamento',artefact:'lâmina ornamentada',palette:'#d2a2a3'},
 {id:'eye',rx:/olhar|olho|lince|aguia|visao/,symbol:'◉',label:'Observador vigilante',artefact:'viseira do olho',palette:'#a2badd'},
 {id:'truth',rx:/verdade|justica|testemunha/,symbol:'✧',label:'Arauto da verdade',artefact:'selo da justiça',palette:'#95d8a4'},
 {id:'lore',rx:/arquivo|memoria|bibliotec|cronista|palavra/,symbol:'▤',label:'Cronista dos segredos',artefact:'pergaminho ancestral',palette:'#cdb38c'},
 {id:'silence',rx:/silencio|nome|ultimo/,symbol:'☾',label:'Véu do silêncio',artefact:'círculo silencioso',palette:'#b5a4d2'}
];
function describe(title,rarity,gender){
 const normalized=FOLD(title);
 const tier=TIERS[rarity]||'comum';
 const theme=THEME.find(t=>t.rx.test(normalized))||{id:'wanderer',symbol:'✺',label:'Viajante do mistério',artefact:'broche de vigia',palette:'#aeb0b4'};
 const g=gender==='f'?'f':'m';
 // The seed decorates the same theme without changing the rarity or affecting scoring.
 let seed=2166136261;
 for(const c of normalized)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 const variation=seed%7;
 return Object.freeze({name:String(title||'Sem título'),tier,theme:theme.id,symbol:theme.symbol,archetype:theme.label,
  artefact:theme.artefact,accent:tier==='mistico'?'#ff214f':tier==='lenda'?'#f1c56b':theme.palette,
  gender:g,variation,armor:Math.min(5,ORDERS[tier]+1),skinId:'title_'+FOLD(title).replace(/[^a-z0-9]+/g,'_')+'_'+g});
}
function playerTitle(profile,knownTitles){
 const row=Array.isArray(knownTitles)?knownTitles.find(t=>t.code===profile?.title):null;
 return row?describe(row.name,row.rarity,profile?.gender):describe('Viajante do Mistério','comum',profile?.gender);
}
function emblem(profile,catalog){
 const s=playerTitle(profile,catalog);
 return '<span class="es81-skin es81-skin-'+s.tier+' es81-theme-'+s.theme+
 '" data-skin-code="'+ESC(s.skinId)+'" data-gender="'+s.gender+'" data-variation="'+s.variation+
 '" style="--es81-accent:'+s.accent+'" aria-hidden="true">'+
 '<span class="es81-skin-ring"></span><span class="es81-skin-symbol">'+ESC(s.symbol)+'</span></span>';
}
function sorted(players){
 // Room rank points are delivered by a protected, read-only backend RPC.
 // Without the RPC, retain original order; never improvise scores.
 const arr=[...(Array.isArray(players)?players:[])];
 const hasPoints=arr.some(p=>Number.isFinite(Number(p.room_points)));
 if(!hasPoints)return arr;
 return arr.sort((a,b)=>{
  const as=Number.isFinite(Number(a.room_points))?Number(a.room_points):0;
  const bs=Number.isFinite(Number(b.room_points))?Number(b.room_points):0;
  return bs-as || String(a.id).localeCompare(String(b.id));
 });
}
window.ESTitleSkinsV81=Object.freeze({describe,playerTitle,emblem,sorted,fold:FOLD,tiers:TIERS});
})();
