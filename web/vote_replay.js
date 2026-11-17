/* Entre Suspeitos V7.8 — replay visual de votos fechados.
 * Os votos são fornecidos exclusivamente pelo RPC protegido após status=results.
 * A animação não decide resultados, XP, empates nem vencedores.
 */
(function(){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function tally(ballots,players,slots){
  const all=Array.isArray(players)?players:[];
  const known=new Set(all.map(p=>String(p.id)));
  const shots=[],counts=new Map(all.map(p=>[String(p.id),0]));
  for(const ballot of Array.isArray(ballots)?ballots:[]){
   const from=String(ballot?.from??'');
   if(!known.has(from)||!Array.isArray(ballot.targets))continue;
   for(const raw of ballot.targets){
    const to=String(raw);
    if(!known.has(to)||to===from)continue;
    shots.push({from,to});
    counts.set(to,(counts.get(to)||0)+1);
   }
  }
  const scored=[...counts].filter(([,votes])=>votes>0).sort((a,b)=>b[1]-a[1]);
  const eliminated=[],tied=[];
  let remaining=Math.max(0,Number(slots)||0);
  for(let i=0;i<scored.length&&remaining>0;){
   const value=scored[i][1],group=[];
   while(i<scored.length&&scored[i][1]===value)group.push(scored[i++][0]);
   if(group.length>remaining){tied.push(...group);break;}
   eliminated.push(...group);remaining-=group.length;
  }
  return {shots,counts:Object.fromEntries(counts),eliminated,tied};
 }
 function build(players,summary){
  const gone=new Set(summary.eliminated);
  return '<div class="es-vote-replay" aria-label="Revelação da votação">'+
   '<div class="es-vote-replay-header"><span class="eyebrow">◈ VEREDITO</span>'+
   '<h3>Disparos da votação</h3><p class="small muted">Os votos só aparecem após o encerramento. Os personagens representam os jogadores.</p></div>'+
   '<div class="es-vote-arena" aria-label="Personagens e disparos">'+
   players.map(p=>{
    const id=String(p.id),nick=String(p.nick||'Jogador');
    return '<article class="es-vote-actor'+(gone.has(id)?' is-target':'')+'" data-player="'+esc(id)+'">'+
     '<div class="es-vote-figure" aria-hidden="true"><span class="es-vote-head">'+esc(nick.charAt(0).toUpperCase())+'</span>'+
     '<span class="es-vote-body"></span><span class="es-vote-arm"></span><span class="es-vote-gun"></span>'+
     '<span class="es-vote-legs"></span></div>'+
     '<strong>'+esc(nick)+'</strong><small class="es-vote-hit-count" data-count="'+esc(id)+'">0 votos</small>'+
     '</article>';
   }).join('')+'</div>'+
   '<p class="es-vote-announcement" role="status" aria-live="polite">Revelando os votos encerrados…</p>'+
   '</div>';
 }
 function mount(container,ballots,players,slots,animate=true){
  if(!container)return null;
  const roster=Array.isArray(players)?players.filter(p=>p&&p.id!=null):[];
  const summary=tally(ballots,roster,slots);
  container.innerHTML=build(roster,summary);
  const root=container.querySelector('.es-vote-replay');
  if(!root)return summary;
  const arena=root.querySelector('.es-vote-arena');
  const actors=new Map([...root.querySelectorAll('[data-player]')].map(a=>[a.dataset.player,a]));
  const text=root.querySelector('.es-vote-announcement');
  const displayCounts=Object.fromEntries(roster.map(p=>[String(p.id),0]));
  const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate=animate&&!reduced&&!(window.ESMotion&&!window.ESMotion.enabled())&&!document.hidden&&summary.shots.length>0;
  const finish=()=>{
   if(!root.isConnected&&typeof root.isConnected==='boolean')return;
   root.classList.remove('is-playing');root.classList.add('is-finished');
   for(const p of roster){
    const id=String(p.id),actor=actors.get(id);
    if(!actor)continue;
    const label=actor.querySelector('.es-vote-hit-count');
    if(label)label.textContent=(summary.counts[id]||0)+' voto(s)';
    actor.classList.toggle('is-eliminated',summary.eliminated.includes(id));
   }
   const name=id=>roster.find(p=>String(p.id)===id)?.nick||'Jogador';
   const eliminated=summary.eliminated.map(name);
   const tie=summary.tied.map(name);
   text.textContent=(eliminated.length?'Eliminados pela votação: '+eliminated.join(', ')+'. ':'Nenhum eliminado nesta votação. ')+
    (tie.length?'Empate sem eliminação: '+tie.join(', ')+'.':'');
  };
  if(!canAnimate){finish();return summary;}
  root.classList.add('is-playing');
  const interval=Math.max(45,Math.min(155,2600/Math.max(1,summary.shots.length)));
  function fire(shot){
   if(!root.isConnected)return;
   const from=actors.get(shot.from),to=actors.get(shot.to);
   if(!from||!to)return;
   const gun=from.querySelector('.es-vote-gun'),head=to.querySelector('.es-vote-head');
   if(gun&&head&&arena&&typeof gun.getBoundingClientRect==='function'){
    const start=gun.getBoundingClientRect(),end=head.getBoundingClientRect(),area=arena.getBoundingClientRect();
    const x=start.left+start.width/2-area.left,y=start.top+start.height/2-area.top;
    const dx=end.left+end.width/2-area.left-x,dy=end.top+end.height/2-area.top-y;
    const beam=document.createElement('span');beam.className='es-vote-beam';beam.setAttribute('aria-hidden','true');
    beam.style.left=x+'px';beam.style.top=y+'px';beam.style.width=Math.hypot(dx,dy)+'px';
    beam.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
    beam.innerHTML='<i></i>';
    arena.appendChild(beam);window.setTimeout(()=>beam.remove(),530);
   }
   from.classList.add('is-firing');to.classList.add('is-hit');
   displayCounts[shot.to]=(displayCounts[shot.to]||0)+1;
   const label=to.querySelector('.es-vote-hit-count');
   if(label)label.textContent=displayCounts[shot.to]+' voto(s)';
   window.setTimeout(()=>{from.classList.remove('is-firing');to.classList.remove('is-hit');},360);
  }
  summary.shots.forEach((shot,i)=>window.setTimeout(()=>fire(shot),Math.round(i*interval)));
  window.setTimeout(finish,Math.round(summary.shots.length*interval+570));
  return summary;
 }
 window.ESVoteReplay=Object.freeze({tally,mount});
})();
