/* Entre Suspeitos V7.6 — character entrance sequence. Purely visual, no game mechanics. */
(function(){
'use strict';
const STYLES={
 comum:{label:'ENTRADA DISCRETA',title:'Uma nova presença',duration:1400,style:'common'},
 epico:{label:'ENTRADA ÉPICA',title:'Das sombras, uma presença',duration:2200,style:'epic'},
 lenda:{label:'ENTRADA LENDÁRIA',title:'O mistério tem um nome',duration:3400,style:'legend'}
};
let live=null,timer=null;
function clean(){if(timer)clearTimeout(timer);timer=null;if(live){live.remove();live=null;}}
function rarityFromFrame(frame){
 const r=window.ESCosmetics?.frameRarity(frame)||'comum';
 return r==='lenda'?'lenda':r==='epico'?'epico':'comum';
}
function play(opts={}){
 clean();
 if(window.ESMotion && !window.ESMotion.enabled())return false;
 if(typeof document==='undefined'||!document.body)return false;
 const rarity=['comum','epico','lenda'].includes(opts.rarity)?opts.rarity:rarityFromFrame(opts.frame);
 const cfg=STYLES[rarity],duration=cfg.duration;
 const root=document.createElement('div');live=root;
 root.className='es-entrance-overlay es-entrance-'+cfg.style;
 root.setAttribute('role','presentation');
 root.style.setProperty('--es-entry-duration',duration+'ms');
 const nick=String(opts.nickname||'Jogador').slice(0,28);
 // Never interpolate untrusted names as HTML. No hidden role/word anywhere.
 const shade=document.createElement('div');shade.className='es-entrance-shade';
 const shards=document.createElement('div');shards.className='es-entrance-shards';
 for(let i=0;i<12;i++){const e=document.createElement('i');e.style.setProperty('--n',String(i));shards.appendChild(e);}
 const sigil=document.createElement('div');sigil.className='es-entrance-sigil';sigil.textContent='◈';
 const figure=document.createElement('div');figure.className='es-entrance-figure';
 const hood=document.createElement('div');hood.className='es-entrance-hood';
 const mask=document.createElement('div');mask.className='es-entrance-mask';mask.textContent='◈';
 figure.append(hood,mask);
 const words=document.createElement('div');words.className='es-entrance-words';
 const eyebrow=document.createElement('small');eyebrow.textContent=cfg.label;
 const title=document.createElement('strong');title.textContent=nick;
 const sub=document.createElement('span');sub.textContent=cfg.title;
 words.append(eyebrow,title,sub);
 const skip=document.createElement('button');skip.className='es-entrance-skip';skip.type='button';skip.textContent='Pular ✕';skip.onclick=clean;
 if(rarity==='lenda'){
  const portal=document.createElement('div');portal.className='es-entrance-legend-portal';
  const wings=document.createElement('div');wings.className='es-entrance-legend-wings';
  const flash=document.createElement('div');flash.className='es-entrance-legend-flash';
  const shockwave=document.createElement('div');shockwave.className='es-entrance-legend-shockwave';
  const crown=document.createElement('div');crown.className='es-entrance-legend-crown';crown.textContent='♛';
  // Decorative layers only. Never includes the hidden role or word.
  root.append(shade,portal,wings,flash,shards,shockwave,sigil,figure,crown,words,skip);
 }else root.append(shade,shards,sigil,figure,words,skip);
 root.addEventListener('click',e=>{if(e.target===root)clean();});
 document.body.appendChild(root);
 timer=setTimeout(clean,duration+250);
 return true;
}
window.ESEntrance=Object.freeze({play,clean,rarityFromFrame,STYLES});
})();
