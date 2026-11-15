/* Entre Suspeitos V7.7 — interface only; gameplay authority remains on Supabase.
   No role, vote, XP, title ownership, or ranking changes in client code. */
(function(){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readySummary(players){
 const active=(players||[]).filter(p=>p.active);
 const ready=active.filter(p=>p.ready).length;
 const pct=active.length?Math.round(ready/active.length*100):0;
 return '<div class="es77-ready-summary" role="status"><div><b>'+ready+'/'+active.length+'</b> jogadores prontos</div>'+
 '<progress aria-label="Jogadores prontos" value="'+ready+'" max="'+Math.max(1,active.length)+'"></progress>'+
 '<small>'+pct+'% preparados para começar</small></div>';
}
function seasonPanel(data){
 if(!data||!Array.isArray(data.players))return '<section class="card"><h3>Temporada</h3><p class="small muted">Classificação sazonal ainda indisponível. O ranking histórico continua funcionando.</p></section>';
 const start=new Date(data.starts_at),end=new Date(data.ends_at);
 const date=v=>Number.isFinite(v.getTime())?v.toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
 const rows=data.players.slice(0,50);
 const entry=p=>'<div class="es77-season-player"><b class="es77-position">'+Number(p.position||0)+'º</b>'+
 '<span><strong>'+esc(p.nickname)+'</strong><small>'+Number(p.wins||0)+' vitórias em '+Number(p.games||0)+' partidas</small></span>'+
 '<b class="es77-points">'+Number(p.points||0)+' pts</b></div>';
 return '<section class="card es77-season-card"><span class="eyebrow">TEMPORADA ATUAL · UTC</span><h2>Classificação sazonal</h2>'+
 '<p class="small muted">'+date(start)+' a '+date(end)+' (fim exclusivo) · apenas partidas públicas concluídas com voto.</p>'+
 '<p class="small muted">Vitória +25 · derrota −25. A temporada não zera nem altera o ranking histórico.</p>'+
 (rows.length?rows.map(entry).join(''):'<p>Sem partidas válidas nesta temporada.</p>')+'</section>';
}
function weeklyPanel(missions,challenges=[]){
 const weekly=(missions||[]).filter(m=>String(m.period||'').toLowerCase().includes('seman'));
 const defined=Array.isArray(challenges)?challenges:[];
 if(!weekly.length&&!defined.length)return '';
 let html='<section class="es77-weekly"><h3>Desafios da semana</h3>'+
 '<p class="small muted">Progresso validado pelo servidor. Recompensas apenas uma vez por semana. Não alteram pontos de ranking.</p>';
 for(const m of defined){
  const progress=Math.min(Math.max(0,Number(m.progress)||0),Math.max(1,Number(m.target)||1));
  const target=Math.max(1,Number(m.target)||1),claimed=!!m.claimed;
  html+='<div class="es77-challenge"><strong>'+esc(m.title)+'</strong><p class="small muted">'+esc(m.description)+'</p>'+
   '<div class="es77-weekly-row"><span>'+progress+'/'+target+'</span><b>+'+Number(m.reward_xp||0)+' XP</b></div>'+
   '<progress max="'+target+'" value="'+progress+'"></progress>'+
   (claimed?'<span class="pill good">Resgatado</span>':progress>=target?
    '<button class="back" data-week-claim="'+esc(m.code)+'">Resgatar recompensa</button>':'<span class="small muted">Em andamento</span>')+'</div>';
 }
 if(weekly.length)html+='<p class="small muted">Missões semanais tradicionais continuam disponíveis abaixo.</p>';
 return html+'</section>';
}

function achievement(title){
 if(!title||typeof document==='undefined'||!document.body)return;
 if(window.ESMotion&&!window.ESMotion.enabled())return;
 const modal=document.createElement('aside');modal.className='es77-achievement';
 const tag=document.createElement('span');tag.textContent='✦ NOVA CONQUISTA ✦';
 const name=document.createElement('strong');name.textContent=String(title.name||'Título desbloqueado');
 const detail=document.createElement('small');detail.textContent='Raridade: '+String(title.rarity||'comum');
 const close=document.createElement('button');close.type='button';close.textContent='Fechar';close.onclick=()=>modal.remove();
 modal.append(tag,name,detail,close);document.body.appendChild(modal);
 window.setTimeout(()=>modal.remove(),4300);
}
function rememberAchievements(userId,titles){
 if(!userId||!Array.isArray(titles)||!window.localStorage)return null;
 const key='es77_titles_seen_'+String(userId);
 const codes=titles.map(t=>t.code).filter(c=>typeof c==='string');
 let previous;
 try{const saved=window.localStorage.getItem(key);previous=saved?JSON.parse(saved):null;
  window.localStorage.setItem(key,JSON.stringify(codes));
 }catch{return null;}
 if(!Array.isArray(previous))return null; // First visit establishes baseline; no false alerts.
 return titles.find(t=>!previous.includes(t.code))||null;
}
function inviteAlert(count){
 if(!Number.isFinite(count)||count<=0)return '';
 return '<p class="es77-invite-alert" role="status">✉ '+count+' convite'+(count===1?' pendente':'s pendentes')+' de amigos · abra Convites de amigos.</p>';
}
function sealedVote(){
 if(typeof document==='undefined'||!document.body)return;
 if(window.ESMotion&&!window.ESMotion.enabled())return;
 const layer=document.createElement('div');layer.className='es77-vote-seal';
 const sigil=document.createElement('span');sigil.textContent='◈';
 const label=document.createElement('strong');label.textContent='VOTO REGISTRADO';
 const tip=document.createElement('small');tip.textContent='Seu voto permanece secreto';
 layer.append(sigil,label,tip);document.body.appendChild(layer);
 window.setTimeout(()=>layer.remove(),1050);
}
window.ESV77=Object.freeze({readySummary,seasonPanel,weeklyPanel,achievement,rememberAchievements,inviteAlert,sealedVote});
})();
