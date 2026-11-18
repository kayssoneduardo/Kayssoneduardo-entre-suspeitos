/* Entre Suspeitos V7.9 — Arena do Julgamento, vista frontal.
 * Somente apresentação: votos são registrados por es_vote no servidor.
 * O palco nunca recebe votos de outros jogadores antes dos resultados.
 */
(function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let activeTitles=[];
 const palette=['violet','amber','teal','rose','blue','silver','emerald','scarlet','indigo','copper'];
 const paint=i=>palette[i%palette.length];
 function fighter(p,i,catalog){
  if(window.ESTitleSkinsV81?.figure && Array.isArray(catalog)&&catalog.length)
   return '<span class="judge-figure judge-figure-v82">'+window.ESTitleSkinsV81.figure(p,catalog)+'</span>';
  const name=String(p.nick||'Jogador'),initial=name.charAt(0).toUpperCase();
  return '<span class="judge-figure judge-color-'+paint(i)+'" aria-hidden="true">'+
   '<span class="judge-shadow"></span><span class="judge-legs"></span>'+
   '<span class="judge-torso"><span class="judge-crest">◈</span></span>'+
   '<span class="judge-arm judge-arm-left"></span><span class="judge-arm judge-arm-right"></span>'+
   '<span class="judge-weapon"></span><span class="judge-helm"><span class="judge-visor">'+esc(initial)+'</span></span>'+
   '</span>';
 }
 function sceneStart(){
  return '<div class="judge-arches" aria-hidden="true"><i></i><i></i><i></i></div>'+
   '<div class="judge-platform" aria-hidden="true"></div><div class="judge-floor" aria-hidden="true"></div>';
 }
 function markup(players,myId,required,alreadyVoted,titleCatalog){
  if(Array.isArray(titleCatalog)&&titleCatalog.length)activeTitles=titleCatalog;
  const roster=(window.ESTitleSkinsV81?.sorted(Array.isArray(players)?players:[])||players||[]).filter(p=>p&&p.active);
  const max=Math.max(1,Math.floor(Number(required)||1));
  let eligible=0;
  const characters=roster.map((p,i)=>{
   const id=String(p.id),name=String(p.nick||'Jogador'),self=id===String(myId);
   const canVote=!alreadyVoted&&!self&&!!p.online;
   if(canVote)eligible++;
   const t=(Array.isArray(titleCatalog)?titleCatalog:[]).find(item=>item.code===p.title);
   const rarity=t&&['comum','incomum','raro','lenda','mistico'].includes(t.rarity)?t.rarity:'comum';
   const title=t?'<span class="judge-title title-'+rarity+'">'+esc(t.name)+'</span>':'';
   const badges=''; // Full body skin already carries costume, symbol and equipment.
   const first=i===0&&Number.isFinite(Number(p.room_points));
   const leader=first?'<span class="es81-room-crown" aria-label="Primeiro lugar da sala">♛</span>':'';
   const body=title+leader+fighter(p,i,titleCatalog)+badges+'<strong class="judge-name">'+esc(name)+'</strong>'+
    '<span class="judge-marker">'+(self?'VOCÊ':!p.online?'SEM CONEXÃO':alreadyVoted?'JOGADOR':'TOQUE PARA ACUSAR')+'</span>'+
    '<span class="judge-target" aria-hidden="true">⚔</span>';
   if(canVote){
    return '<label class="judge-actor judge-selectable es77-vote-choice" data-judgment-player="'+esc(id)+'">'+
      '<input class="judge-checkbox" type="checkbox" data-vote="'+esc(id)+'" aria-label="Votar em '+esc(name)+'">'+body+'</label>';
   }
   return '<div class="judge-actor '+(self?'judge-self ':'')+(!p.online?'judge-disconnected':'')+
    '" data-judgment-player="'+esc(id)+'">'+body+'</div>';
  }).join('');
  return '<div class="judge-panel">'+
   '<div class="judge-heading"><span class="eyebrow">⚔ ARENA DO JULGAMENTO</span>'+
   '<strong>Um voto. Um golpe.</strong><small>Vista frontal · veredito secreto</small></div>'+
   '<div id="judgmentStage" class="judge-stage" data-required="'+max+'">'+sceneStart()+
   '<div class="judge-cast">'+characters+'</div>'+
   '<div class="judge-dais" aria-hidden="true">◈</div></div>'+
   '<div class="judge-controls">'+
   (alreadyVoted?'<p class="judge-selection-status" role="status">Seu voto já foi registrado. Aguardando os outros jogadores.</p>':
    '<p class="judge-selection-status" data-judge-counter role="status" aria-live="polite">0 de '+max+' suspeito(s) escolhido(s)</p>'+
    '<p class="small muted">Toque nos personagens para marcar seus alvos. Os outros jogadores não verão suas escolhas.</p>')+
   (eligible<max&&!alreadyVoted?'<p class="error">Não há suspeitos conectados suficientes para votar agora.</p>':'')+
   '</div></div>';
 }
 function bind(container,required){
  const stage=container?.querySelector?.('#judgmentStage');
  if(!stage||typeof stage.querySelectorAll!=='function')return;
  const inputs=[...stage.querySelectorAll('[data-vote]')];
  const counter=container.querySelector('[data-judge-counter]');
  const button=container.querySelector('#submitVote')||container.querySelector('#demoConfirm')||document.getElementById('submitVote')||document.getElementById('demoConfirm');
  const n=Math.max(1,Math.floor(Number(required)||1));
  const update=()=>{
   const chosen=inputs.filter(x=>x.checked);
   inputs.forEach(x=>x.closest('.judge-actor')?.classList.toggle('judge-selected',x.checked));
   if(counter)counter.textContent=chosen.length+' de '+n+' suspeito(s) escolhido(s)'+(chosen.length===n?' · golpes preparados':'');
   if(button)button.disabled=chosen.length!==n;
   return chosen;
  };
  inputs.forEach(input=>input.addEventListener('change',()=>{
   if(input.checked&&inputs.filter(x=>x.checked).length>n){
    input.checked=false;
    if(counter)counter.textContent='Limite de '+n+' alvo(s). Desmarque um personagem para trocar.';
   }
   update();
  }));
  update();
 }
 function impact(stage,targets){
  if(!stage||!Array.isArray(targets))return Promise.resolve();
  const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced||document.hidden)return Promise.resolve();
  const targetsSet=new Set(targets.map(String));
  const actors=[...stage.querySelectorAll('[data-judgment-player]')].filter(el=>targetsSet.has(el.dataset.judgmentPlayer));
  if(!actors.length)return Promise.resolve();
  actors.forEach((actor,i)=>window.setTimeout(()=>{
    if(!actor.isConnected)return;
    actor.classList.add('judge-impact');
    window.setTimeout(()=>actor.classList.remove('judge-impact'),560);
   },i*250));
  return new Promise(resolve=>window.setTimeout(resolve,Math.min(1500,actors.length*250+490)));
 }
 // The replay consumes only anonymous totals from es_v78_vote_replay.
 function resultMarkup(players,summary){
  const excluded=new Set(summary.eliminated||[]);
  const actors=(Array.isArray(players)?players:[]).map((p,i)=>{
   const id=String(p.id),name=String(p.nick||'Jogador');
   return '<article class="judge-actor es-vote-actor '+(excluded.has(id)?'is-target':'')+
    '" data-player="'+esc(id)+'" data-judgment-player="'+esc(id)+'">'+
    '<span class="es-vote-figure judge-figure-wrap">'+fighter(p,i,activeTitles)+'</span>'+
    '<strong class="judge-name">'+esc(name)+'</strong>'+
    '<small class="es-vote-hit-count" data-count="'+esc(id)+'">0 golpe(s)</small></article>';
  }).join('');
  return '<div class="es-vote-replay es-judgment-result" aria-label="Confronto dos votos anônimos">'+
   '<div class="es-vote-replay-header"><span class="eyebrow">◈ VEREDITO</span>'+
   '<h3>Arena do Julgamento</h3>'+
   '<p class="small muted">Cada golpe equivale a um voto recebido. Quem votou em quem permanece secreto.</p></div>'+
   '<div class="es-vote-arena judge-stage judge-stage-result" aria-label="Golpes recebidos por cada jogador">'+
    sceneStart()+'<div class="judge-cast">'+actors+'</div>'+
   '<span class="es-vote-source judge-dais" aria-hidden="true">◈</span></div>'+
   '<p class="es-vote-announcement" role="status" aria-live="polite">Revelando os golpes anônimos…</p></div>';
 }
 window.ESJudgmentArena=Object.freeze({markup,bind,impact,resultMarkup});
})();
