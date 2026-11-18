/* Entre Suspeitos V8.3 — production stage, official secret ballots.
 * 200 independent title concepts / 400 exact SVG assets. No vote identity exposed.
 * The arena is purely presentational: backend es_vote/es_finalize remains source of truth.
 */
(function(){
'use strict';
const ESC=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RARITY={comum:'comum',incomum:'incomum',raro:'epico',lenda:'lenda',mistico:'mistico'};
const EFFECTS={comum:0,incomum:0,epico:1,lenda:2,mistico:3};
const CATALOG=Array.isArray(window.ES83_META)?window.ES83_META:[];
const SKINS=window.ES83_SVGS||{};
const index=new Map(CATALOG.map(x=>[String(x.code),x]));
function officialTitle(code,serverCatalog){
 const real=Array.isArray(serverCatalog)?serverCatalog.find(x=>x.code===code):null;
 if(!real)return null;
 const skin=index.get(String(real.code));
 return skin&&skin.rarity===real.rarity?skin:null;
}
function character(p,serverCatalog){
 const title=officialTitle(p?.title,serverCatalog);
 const code=title?.code||'primeira_rodada';
 const gender=p?.gender==='f'?'f':'m';
 const data=SKINS[code+'_'+gender]||SKINS[code+'_m']||'';
 return {title,code,gender,data,tier:RARITY[title?.rarity]||'comum'};
}
function art(p,catalog){
 const c=character(p,catalog);
 const encoded=/^[A-Za-z0-9+/]+={0,2}$/.test(c.data)?c.data:'';
 return '<span class="es83-model es83-'+c.tier+'" data-title-skin="'+ESC(c.code)+'" data-gender="'+c.gender+'" data-animation-count="'+EFFECTS[c.tier]+'">'+
  '<span class="es83-effect es83-effect-1" aria-hidden="true"></span>'+
  '<span class="es83-effect es83-effect-2" aria-hidden="true"></span>'+
  '<span class="es83-effect es83-effect-3" aria-hidden="true"></span>'+
  (encoded?'<img src="data:image/svg+xml;base64,'+encoded+'" alt="" loading="lazy" decoding="async">':'<span class="es83-fallback" aria-hidden="true">⚔</span>')+
 '</span>';
}
function titleTag(p,catalog){
 const t=officialTitle(p?.title,catalog);
 if(!t)return '';
 return '<span class="judge-title title-'+ESC(t.rarity)+'">'+ESC(t.name)+'</span>';
}
function standing(p){
 return '<span class="es83-vote-status '+(p.voted?'es83-voted':'es83-pending')+
 '" aria-label="'+(p.voted?'Jogador já votou':'Jogador ainda não votou')+'">'+
 (p.voted?'✓ JÁ VOTOU':'○ AGUARDANDO VOTO')+'</span>';
}
function chooseEliminated(ballots,players,slots){
 const tallier=window.ESVoteReplay?.tally;
 if(typeof tallier!=='function')return {eliminated:[],counts:{},shots:[],tied:[]};
 return tallier(ballots,players,slots);
}
// A center execution stage, created only once per completed round. A replay
// never calls points, vote, ranking or reward APIs.
function renderCenter(container,players,summary,catalog,animate=true){
 if(!container)return null;
 const roster=Array.isArray(players)?players:[];
 const sorted=roster.filter(p=>p?.id!=null);
 const eliminated=new Set(summary?.eliminated||[]);
 const casualties=sorted.filter(p=>eliminated.has(String(p.id)));
 const values=Object.entries(summary?.counts||{});
 const gallery=sorted.map(p=>{
  const dead=eliminated.has(String(p.id));
  return '<article class="es83-witness '+(dead?'es83-marked':'')+'" data-actor="'+ESC(p.id)+'">'+
   titleTag(p,catalog)+art(p,catalog)+'<strong>'+ESC(p.nick||'Jogador')+'</strong>'+
   '<small>'+Number(summary?.counts?.[p.id]||0)+' golpe(s)</small></article>';
 }).join('');
 const center=casualties.length
   ?'<div class="es83-condemned" data-condemned="'+ESC(casualties[0].id)+'">'+
       art(casualties[0],catalog)+'<strong>'+ESC(casualties[0].nick||'Jogador')+'</strong>'+
       '<small class="es83-received">'+Number(summary?.counts?.[casualties[0].id]||0)+' golpe(s) recebidos</small>'+
     '</div>'
   :'<div class="es83-safe">⚖ <strong>Ninguém será eliminado</strong><small>Empate decisivo ou ausência de votos</small></div>';
 container.innerHTML='<section class="es83-execution" aria-label="Tribunal do veredito">'+
  '<div class="es83-scene-title"><span>⚖ TRIBUNAL DO VEREDITO</span><h3>Julgamento encerrado</h3>'+
  '<p>Os golpes são anônimos. A identidade de quem votou não é revelada.</p></div>'+
  '<div class="es83-court"><div class="es83-witnesses">'+gallery+'</div>'+
  '<div class="es83-center"><div class="es83-ceremony">◈</div>'+center+
  '<div class="es83-flashes" aria-hidden="true"></div></div></div>'+
  '<p class="es83-announcement" role="status" aria-live="polite">'+
  (casualties.length?'Preparando a sentença…':'Nenhum personagem condenado nesta rodada.')+'</p></section>';
 const root=container.querySelector('.es83-execution');
 if(!root)return summary;
 const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const canAnimate=animate&&!reduced&&!document.hidden&&casualties.length>0&&typeof window.setTimeout==='function';
 const delay=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
 let cancelled=false;const active=()=>!cancelled&&root.isConnected;
 const announcement=root.querySelector('.es83-announcement');
 const condemned=root.querySelector('.es83-condemned');
 const flashes=root.querySelector('.es83-flashes');
 const stop=()=>{cancelled=true;root.classList.remove('es83-playing')};
 const instant=()=>{
  if(!active())return;
  root.classList.add('es83-finished');
  root.classList.remove('es83-playing');
  if(announcement)announcement.textContent=casualties.length
   ?casualties.map(p=>p.nick).join(', ')+' — eliminado(s) após a votação.'
   :'Empate decisivo: ninguém eliminado.';
 };
 container._es83Stop?.();
 container._es83Stop=stop;
 if(!canAnimate){instant();return summary}
 async function play(){
  root.classList.add('es83-playing');
  // Every attack originates from a neutral orbital marker; no voter mapping.
  for(let i=0;i<casualties.length;i++){
   if(!active())return;
   const candidate=casualties[i];
   const spot=root.querySelector('.es83-condemned');
   if(!spot)return;
   spot.innerHTML=art(candidate,catalog)+'<strong>'+ESC(candidate.nick||'Jogador')+
    '</strong><small>'+Number(summary.counts?.[candidate.id]||0)+' golpe(s) recebidos</small>';
   spot.dataset.condemned=String(candidate.id);
   spot.classList.remove('es83-fallen');
   spot.classList.add('es83-enter');
   announcement.textContent='O tribunal chama '+String(candidate.nick||'Jogador')+' ao centro…';
   await delay(850);
   if(!active())return;
   const hits=Math.min(30,Number(summary.counts?.[candidate.id])||0);
   for(let j=0;j<hits;j++){
    if(!active())return;
    const beam=document.createElement('span');beam.className='es83-beam';
    beam.style.setProperty('--angle',(j*137.5)+'deg');
    if(flashes){flashes.appendChild(beam);window.setTimeout(()=>beam.remove(),570)}
    spot.classList.add('es83-struck');
    announcement.textContent='Golpe '+(j+1)+' de '+hits+' contra '+String(candidate.nick||'Jogador')+'!';
    await delay(180);
    spot.classList.remove('es83-struck');
   }
   if(!active())return;
   spot.classList.add('es83-fallen');
   announcement.textContent=String(candidate.nick||'Jogador')+' foi eliminado.';
   await delay(900);
  }
  instant();
 }
 play().catch(()=>{if(active())instant()});
 return summary;
}
window.ES83Arena=Object.freeze({art,titleTag,standing,character,chooseEliminated,renderCenter,rarity:RARITY});
})();