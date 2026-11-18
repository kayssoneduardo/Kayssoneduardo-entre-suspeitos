/* Entre Suspeitos V8.2 — unique, deterministic costume specification for EACH real title.
 * The title rarity controls animation budget only, never outfit colours.
 * All colour, symbols, garments, weapons and heraldry derive from the TITLE.
 * Stylised scalable vector preview: production illustrated assets still pending.
 */
(function(){
'use strict';
const FOLD=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','>':'&gt;',"'":'&#39;'}[c]));
const TIERS=Object.freeze({comum:'comum',incomum:'incomum',raro:'epico',epico:'epico',lenda:'lenda',mistico:'mistico'});
const EFFECTS=Object.freeze({comum:0,incomum:0,epico:1,lenda:2,mistico:3});
const THEMES=[
 {id:'ghost',rx:/fantasma|invisivel|intocavel|ausencia/,symbol:'♧',motif:'Fantasmagoria',palette:['#aec6d2','#647e99','#d9eaf0']},
 {id:'masks',rx:/mascar|disfarc|alibi|blefe|engan|duas faces/,symbol:'◈',motif:'Máscaras',palette:['#665875','#ad8698','#dac5ce']},
 {id:'mist',rx:/nevoa|bruma|eco|sussurr|vulto/,symbol:'≋',motif:'Névoa',palette:['#568996','#91baba','#c9e0d5']},
 {id:'royal',rx:/coroa|rei|rainha|imperador|soberan|trono|veredito/,symbol:'♛',motif:'Realeza',palette:['#5c3c3a','#b88364','#efd5a2']},
 {id:'oracle',rx:/oraculo|profeci|etern|estrela|farol/,symbol:'✦',motif:'Oráculo',palette:['#525d91','#a5a0c8','#ddd7e9']},
 {id:'abyss',rx:/abismo|destino|impossivel|elo/,symbol:'◇',motif:'Abismo',palette:['#34485a','#4a928b','#d7b6d8']},
 {id:'eye',rx:/olhar|olho|lince|aguia|visao/,symbol:'◉',motif:'Visão',palette:['#334d65','#829fb9','#cbdfe6']},
 {id:'detective',rx:/detetive|lupa|investig|pista|evidencia|analista|vigia/,symbol:'⌕',motif:'Investigação',palette:['#536451','#a9ad77','#d8caa3']},
 {id:'shadow',rx:/sombra|penumbra|ocult|noturn/,symbol:'☽',motif:'Sombras',palette:['#282e44','#686c87','#b2b8c5']},
 {id:'blade',rx:/lamina|navalha|aco|implacavel|inquisidor|guardiao/,symbol:'⚔',motif:'Lâminas',palette:['#574848','#a99d90','#dad4ca']},
 {id:'truth',rx:/verdade|justica|testemunha/,symbol:'✧',motif:'Verdade',palette:['#354d40','#7da69c','#d9d9bc']},
 {id:'lore',rx:/arquivo|memoria|bibliotec|cronista|palavra/,symbol:'▤',motif:'Memórias',palette:['#62503a','#b69a71','#dcd0ab']},
 {id:'silence',rx:/silencio|nome|ultimo/,symbol:'☾',motif:'Silêncio',palette:['#504d69','#ada4bf','#e2d9d8']}
];
const SPECIAL={
 'fantasma absoluto':{theme:'ghost',colors:['#bbcbd3','#68839d','#d5eef3'],weapon:'spirit',cloak:'mist',sigil:'♧'},
 'verdade silenciosa':{theme:'truth',colors:['#294b44','#a6bcb6','#f0ece1'],weapon:'staff',cloak:'split',sigil:'✧'},
 'ultimo habitante da nevoa':{theme:'mist',colors:['#547e80','#accdca','#dce8df'],weapon:'staff',cloak:'mist',sigil:'≋'},
 'rei das mil mascaras':{theme:'masks',colors:['#3b354f','#987c92','#e0d5c9'],weapon:'mask',cloak:'split',sigil:'◈'},
 'coroa do ultimo veredito':{theme:'royal',colors:['#542b39','#b5886b','#f3dec6'],weapon:'sword',cloak:'royal',sigil:'♛'},
 'oraculo da verdade':{theme:'oracle',colors:['#32455b','#a4c1b8','#eff0e1'],weapon:'staff',cloak:'royal',sigil:'✦'},
 'equilibrio do abismo':{theme:'abyss',colors:['#27475b','#728e8e','#b5e0d4'],weapon:'staff',cloak:'split',sigil:'◇'},
 'duas faces do destino':{theme:'masks',colors:['#2e4056','#b8a88c','#d7b4be'],weapon:'mask',cloak:'split',sigil:'◑'},
 'destino improvavel':{theme:'abyss',colors:['#344a64','#94bda2','#f1d29b'],weapon:'staff',cloak:'split',sigil:'◇'},
 'eco invisivel':{theme:'ghost',colors:['#4e727f','#9cb7c1','#dbe9e2'],weapon:'spirit',cloak:'mist',sigil:'≋'},
 'o impossivel aconteceu':{theme:'abyss',colors:['#364d65','#bda373','#f0d5b0'],weapon:'staff',cloak:'royal',sigil:'✦'},
 'o nome que ninguem acusou':{theme:'silence',colors:['#3b5064','#acb9a1','#e6ded1'],weapon:'dagger',cloak:'split',sigil:'☾'},
 'primeiro elo':{theme:'abyss',colors:['#35656c','#b7a57f','#e2daca'],weapon:'staff',cloak:'split',sigil:'◇'},
 'testemunha intocavel':{theme:'truth',colors:['#4d6d64','#c3ad91','#eee5d8'],weapon:'shield',cloak:'royal',sigil:'✧'},
 'coroa dos quinhentos':{theme:'royal',colors:['#57516d','#b99852','#e8d9b3'],weapon:'sword',cloak:'royal',sigil:'♛'},
 'bibliotecario das mil faces':{theme:'lore',colors:['#595047','#b2a38d','#e8d8bd'],weapon:'book',cloak:'split',sigil:'▤'},
 'primeiro rei do blefe':{theme:'masks',colors:['#4a3b51','#a78574','#e6d6c3'],weapon:'mask',cloak:'royal',sigil:'♛'},
 'imperador da mesa':{theme:'royal',colors:['#494357','#a79b82','#e8d3b2'],weapon:'sword',cloak:'royal',sigil:'♛'},
 'soberano do engano':{theme:'masks',colors:['#57415e','#aa8c98','#e3d7d5'],weapon:'mask',cloak:'split',sigil:'◈'}
};
const HASH=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return h>>>0};
function adjust(hex,amount){const vals=[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+amount)));return '#'+vals.map(v=>v.toString(16).padStart(2,'0')).join('')};
function describe(title,rarity,gender,code){
 const name=String(title||'Viajante do Mistério'),key=FOLD(name),seed=HASH(String(code||key));
 const theme=THEMES.find(t=>t.rx.test(key))||{id:'wanderer',symbol:'✺',motif:'Andarilho',palette:['#575046','#a79e8e','#d5c2a5']};
 const custom=SPECIAL[key]||{};
 const t=TIERS[rarity]||'comum',effects=EFFECTS[t];
 const colors=custom.colors||theme.palette.map((c,i)=>adjust(c,((seed>>>(i*7))%29)-14));
 const sigil=custom.sigil||theme.symbol;
 const weapons=['sword','staff','dagger','shield','spear','book','mask','spirit'];
 const weapon=custom.weapon||weapons[(seed>>>5)%weapons.length];
 const cloak=custom.cloak||['split','short','royal','mist'][(seed>>>11)%4];
 const helm=['hood','open','visor','circlet','plume'][(seed>>>16)%5];
 const armor=['leather','scale','cloth','plate','brigandine'][(seed>>>22)%5];
 const variation=seed%24;
 return Object.freeze({name,code:String(code||key),tier:t,rarity:String(rarity||'comum'),gender:gender==='f'?'f':'m',
  theme:custom.theme||theme.id,motif:theme.motif,symbol:sigil,
  colors,accent:colors[2],weapon,cloak,helm,armor,variation,effects,seed,
  skinId:'skin_'+String(code||key).replace(/[^a-zA-Z0-9_]+/g,'_')+'_'+(gender==='f'?'f':'m')});
}
function playerTitle(player,knownTitles){
 const t=(Array.isArray(knownTitles)?knownTitles:[]).find(x=>x.code===player?.title);
 return describe(t?.name||'Viajante do Mistério',t?.rarity||'comum',player?.gender,t?.code);
}
function shape(s){
 const id='es81g'+s.seed+'_'+s.gender;
 const [dark,base,light]=s.colors;
 const waist=s.gender==='f'?49:43,shoulder=s.gender==='f'?37:29;
 const cloak=s.cloak==='mist'?'M42 77 Q24 116 13 205 Q49 218 79 204 Q115 220 143 208 L122 79Z':s.cloak==='short'?'M46 73L17 161L64 159L88 170L145 163L113 73Z':s.cloak==='royal'?'M40 69Q8 100 14 216L78 196L146 214Q145 108 119 70Z':'M43 72L11 197L61 179L79 200L146 193L120 72Z';
 const helm=s.helm==='hood'?'<path d="M61 40Q81 6 100 40L112 72L49 72Z" fill="'+dark+'" stroke="'+light+'" stroke-width="2"/>':s.helm==='circlet'?'<path d="M57 44L106 44L110 35L94 39L80 31L65 40L54 34Z" fill="'+light+'"/>':s.helm==='plume'?'<path d="M82 33Q71 12 90 2Q114 20 92 39Z" fill="'+light+'"/>':'';
 const weapon=s.weapon==='staff'?'<path d="M135 62L143 205" stroke="'+light+'" stroke-width="7"/><circle cx="134" cy="53" r="13" fill="'+base+'" stroke="'+light+'" stroke-width="4"/>':
 s.weapon==='mask'?'<path d="M124 81L157 76L147 113L130 113Z" fill="'+light+'" stroke="'+dark+'" stroke-width="3"/><path d="M129 88h22" stroke="'+dark+'" stroke-width="4"/>':
 s.weapon==='shield'?'<path d="M119 94Q144 77 162 93L152 159L136 178L120 156Z" fill="'+dark+'" stroke="'+light+'" stroke-width="5"/><text x="138" y="131" font-size="24" fill="'+light+'" text-anchor="middle">'+ESC(s.symbol)+'</text>':
 s.weapon==='book'?'<path d="M123 93L158 93L154 136L120 134Z" fill="'+dark+'" stroke="'+light+'" stroke-width="3"/><path d="M138 95v38" stroke="'+light+'"/>':
 s.weapon==='spirit'?'<path d="M134 65Q149 107 135 144Q118 171 141 205" fill="none" stroke="'+light+'" stroke-width="7" opacity=".7"/>':
 '<path d="M138 44L142 190" stroke="'+light+'" stroke-width="'+(s.weapon==='dagger'?4:8)+'"/><path d="M128 91L152 91" stroke="'+dark+'" stroke-width="6"/>';
 const runes=['◈','◇','✦','☽','✧','⊕','⟡','⌘'];
 const heraldry=Array.from({length:4},(_,i)=>{
  const symbol=runes[(s.seed>>>(i*6))&7],x=62+i*12;
  return '<text x="'+x+'" y="161" fill="'+light+'" opacity=".78" font-size="7" text-anchor="middle">'+symbol+'</text>';
 }).join('');
 const texture=Array.from({length:4},(_,i)=>{
  const x=60+i*13,y=114+((s.seed>>>(i*4))&7);
  return '<path d="M'+x+' '+y+'l3 4l-3 4l-3 -4Z" fill="'+light+'" opacity=".3"/>';
 }).join('');
 const armored=s.armor==='plate'?'<path d="M49 92L111 92L101 153L61 153Z" fill="'+light+'" opacity=".2"/>':
 s.armor==='scale'?Array.from({length:4},(_,i)=>'<path d="M53 '+(105+i*13)+'Q80 '+(115+i*13)+' 106 '+(105+i*13)+'" stroke="'+light+'" stroke-width="2" fill="none"/>').join(''):'';
 const coat=waist===49?'M50 93L114 93L100 166L58 166Z':'M45 91L117 91L104 171L56 171Z';
 const sleeve=shoulder===37?'M50 94L24 103L21 153L44 151L59 112Z':'M47 91L19 96L18 155L42 151L57 111Z';
 return '<svg class="es81-costume-svg" viewBox="0 0 165 226" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
 '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+light+'"/><stop offset=".52" stop-color="'+base+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs>'+
 '<ellipse cx="80" cy="218" rx="52" ry="7" fill="#000" opacity=".32"/>'+
 '<path class="es81-cloak" d="'+cloak+'" fill="'+dark+'" stroke="'+base+'" stroke-width="3"/>'+
 '<path d="M62 157L53 214L72 217L81 172L92 216L114 214L101 157Z" fill="'+dark+'" stroke="'+light+'" stroke-width="3"/>'+
 '<path d="'+sleeve+'" fill="'+base+'" stroke="'+light+'" stroke-width="3"/>'+
 '<path d="M110 93L139 100L146 152L121 154L104 112Z" fill="'+base+'" stroke="'+light+'" stroke-width="3"/>'+
 '<path d="'+coat+'" fill="url(#'+id+')" stroke="'+light+'" stroke-width="4"/>'+armored+
 '<path d="M45 98L27 115L53 127L61 107M118 99L137 115L112 128L101 107" fill="'+dark+'" stroke="'+light+'" stroke-width="3"/>'+
 texture+heraldry+
 '<path d="M57 148L103 148L110 157L51 158Z" fill="'+dark+'" stroke="'+light+'" stroke-width="3"/>'+
 '<path d="M59 49Q60 19 81 21Q103 21 103 47L103 73L59 73Z" fill="'+base+'" stroke="'+light+'" stroke-width="3"/>'+
 '<path d="M65 50L99 50L96 64L66 64Z" fill="'+dark+'" stroke="'+light+'" stroke-width="2"/>'+
 '<path d="M73 56L92 56" stroke="'+light+'" stroke-width="2"/>'+helm+
 '<path d="M68 77L95 77L109 94L55 94Z" fill="'+dark+'" stroke="'+light+'" stroke-width="3"/>'+
 '<text x="81" y="134" fill="'+light+'" font-size="25" text-anchor="middle" font-weight="bold">'+ESC(s.symbol)+'</text>'+weapon+
 '<path d="M55 177L43 183L41 192L59 193M102 177L117 184L119 193L98 193" fill="'+light+'" opacity=".66"/>'+
 '</svg>';
}
function figure(profile,catalog){
 const s=profile?.name&&profile?.tier?profile:playerTitle(profile,catalog);
 return '<span class="es81-character es81-tier-'+s.tier+' es81-type-'+s.theme+' es81-gender-'+s.gender+
 '" data-skin-code="'+ESC(s.skinId)+'" data-variation="'+s.variation+
 '" data-effect-count="'+s.effects+'" style="--es81-skin-light:'+s.colors[2]+';--es81-skin-base:'+s.colors[1]+';--es81-skin-dark:'+s.colors[0]+'">'+
 '<span class="es81-motion es81-motion-1" aria-hidden="true"></span>'+
 '<span class="es81-motion es81-motion-2" aria-hidden="true"></span>'+
 '<span class="es81-motion es81-motion-3" aria-hidden="true"></span>'+shape(s)+'</span>';
}
function emblem(profile,catalog){const s=playerTitle(profile,catalog);return '<span class="es81-skin es81-skin-'+s.tier+' es81-theme-'+s.theme+
 '" data-skin-code="'+ESC(s.skinId)+'" data-gender="'+s.gender+'" data-variation="'+s.variation+
 '" style="--es81-accent:'+s.accent+'" aria-hidden="true"><span class="es81-skin-symbol">'+ESC(s.symbol)+'</span></span>'}
function sorted(players){
 const arr=[...(Array.isArray(players)?players:[])];const scored=arr.some(p=>typeof p.room_points==='number'&&Number.isFinite(p.room_points));
 if(!scored)return arr;
 return arr.sort((a,b)=>(Number(b.room_points)||0)-(Number(a.room_points)||0)||String(a.id).localeCompare(String(b.id)));
}
window.ESTitleSkinsV81=Object.freeze({describe,playerTitle,figure,emblem,sorted,fold:FOLD,tiers:TIERS,effects:EFFECTS});
})();