'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=(p)=>fs.readFileSync(p,'utf8');
const html=root('web/index.html'),online=root('web/online.js'),motion=root('web/motion.js'),css=root('web/style.css'),sql=root('v7_pending/sql/v75_social_events.sql');
assert(html.indexOf('cosmetics.js')<html.indexOf('motion.js')&&html.indexOf('motion.js')<html.indexOf('online.js'),'Cosmetics -> motion -> online load order');
assert(/(?:7\.(?:5\.0|6\.[012]|7\.0|8\.0|9\.0) RC|8\.3\.0 \(EXECUÇÃO E STATUS DE VOTO)/.test(html),'Approved cinematic release label');
const attrs={};const classSet=new Set();
const document={
 readyState:'complete',hidden:false,
 body:{dataset:attrs,classList:{toggle(k,v){v?classSet.add(k):classSet.delete(k);}}},
 addEventListener(){},
};
const map={handlers:{},matches:false,addEventListener(name,fn){this.handlers[name]=fn;}};
const store=new Map();
const window={matchMedia:()=>map,ESCosmetics:{frameRarity:(c)=>c==='coroa_arcana'?'lenda':'comum',bannerRarity:()=> 'epico'}};
const context={document,window,navigator:{connection:{saveData:false}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
vm.runInNewContext(motion,context,{filename:'motion.js'});
const m=window.ESMotion;
assert.equal(attrs.motion,'on');assert.equal(m.intensity('comum'),0);assert.equal(m.intensity('lenda'),4);
assert.equal(m.resolveFrame('coroa_arcana'),'lenda');assert.equal(m.resolveBanner('ecos_da_nevoa'),'epico');
m.setMode('off');assert.equal(attrs.motion,'off');m.setMode('auto');assert.equal(attrs.motion,'on');
map.matches=true;map.handlers.change();assert.equal(attrs.motion,'off','Auto respects reduced-motion');
map.matches=false;map.handlers.change();assert.equal(attrs.motion,'on');
m.enterPhase('voting');assert.equal(attrs.phase,'voting');
m.enterPhase('unexpected');assert.equal(attrs.phase,'menu');
assert(m.outcome(true).includes('is-win')&&m.outcome(false).includes('is-loss'));
assert(online.includes("this.cloud.rpc('es_v74_stats')"),'History must use authenticated, server-backed stats');
for(const tok of ['historyPage(){','publicProfile(id){','bindPublicProfiles(){','motionSettings(){','es_v75_public_profile','es_v75_event_claim','es_v75_event_claims','data-social','ESMotion?.revealCard','ESMotion?.outcome']){
 assert(online.includes(tok),'Missing V7.5 UI: '+tok);
}
for(const tok of ['.frame-rarity-raro','.frame-rarity-epico','.frame-rarity-lenda','.banner-rarity-lenda','@media(prefers-reduced-motion:reduce)','body.es-v75-paused','es-v75-secret-flip']){
 assert(css.includes(tok),'Motion or accessibility CSS missing: '+tok);
}
assert(!css.includes('body[data-motion=on] .frame-rarity-comum .cosmetic-frame-illustration'),'Common frames must stay static');
for(const tok of ['auth.uid()','grant execute on function public.es_v75_public_profile(uuid) to authenticated','grant execute on function public.es_v75_event_claim(text) to authenticated','alter table public.es_v75_event_claims enable row level security','primary key(user_id,event_code)','on conflict do nothing','update public.es_profiles set xp=xp+60','rm.is_public','res.voted']){
 assert(sql.includes(tok),'DB security/event invariant missing: '+tok);
}
assert(!sql.includes('ranking_points=')&&!sql.includes('update public.es_rooms'),'Event claim must never affect ranking or room');
assert(online.includes('MIN=3')&&online.includes('joined.length>=3'),'Online minimum remains 3');
assert(online.includes('Sem limite de tempo'),'Voting duration unchanged');
assert(online.includes('30 segundos'),'Secret reveal window unchanged');
console.log('PASSOU V7.5: acessibilidade, bateria, raridades, cartas, resultados, social, histórico, eventos, segurança e regras.');
