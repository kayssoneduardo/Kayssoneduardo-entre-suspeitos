(function(){
'use strict';
const app=document.getElementById('app');
const topbar=document.getElementById('topbar');
const KEY_CFG='es2_config';
const KEY_USED='es2_used_v1';
const BANK=window.ES_WORD_BANK;
const categories=Object.keys(BANK);
const counts=ES.validateBank(BANK);
const defaultCfg={names:['Jogador 1','Jogador 2','Jogador 3','Jogador 4'],impostors:1,
 categories:[...categories],clue:'both',know:false,difficulty:'Misturado',theme:'shadow',music:false,effects:true};
let cfg=loadConfig(),used=loadHistory(),game=null,page='splash',splashTimer=null;
function read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}}
function saveKey(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function loadConfig(){
 const old=read('es_config'),saved=read(KEY_CFG),c={...defaultCfg,...(old||{}),...(saved||{})};
 if(!Array.isArray(c.names))c.names=[...defaultCfg.names];
 c.names=c.names.slice(0,30).map((s,i)=>String(s??'Jogador '+(i+1)).slice(0,28));
 while(c.names.length<3)c.names.push('Jogador '+(c.names.length+1));
 if(!Array.isArray(c.categories))c.categories=[...categories];
 c.categories=c.categories.filter(x=>categories.includes(x));
 if(!['Fácil','Médio','Difícil','Misturado'].includes(c.difficulty))c.difficulty='Misturado';
 if(!['both','category','hint','none'].includes(c.clue))c.clue='both';
 c.impostors=Math.min(ES.maxImpostors(c.names.length),Math.max(1,Number(c.impostors)||1));
 c.theme=c.theme==='night'?'night':'shadow';c.music=!!c.music;c.effects=c.effects!==false;c.know=!!c.know;
 return c;
}
function loadHistory(){let h=read(KEY_USED);return new Set(Array.isArray(h)?h.filter(x=>typeof x==='string'):[]);}
function save(){saveKey(KEY_CFG,cfg);}
function saveUsed(){saveKey(KEY_USED,Array.from(used));}
function esc(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function theme(){document.body.dataset.theme=cfg.theme;}
function sound(name){ESAudio.effect(name,cfg.effects);}
function ambient(){ESAudio.music(cfg.music);}
function setTop(label,onBack){
 if(!onBack){topbar.hidden=true;topbar.innerHTML='';return;}
 topbar.hidden=false;
 topbar.innerHTML=`<button type="button" class="back" id="back">← Voltar</button><strong>${esc(label)}</strong><span style="width:70px"></span>`;
 document.getElementById('back').onclick=()=>{sound('tap');onBack();};
}
function button(id,content,cls=''){return `<button type="button" class="btn ${cls}" id="${id}">${content}</button>`;}
function title(mark=false){return `<section class="brand"><div class="brand-mark" aria-hidden="true">◈</div><div class="eyebrow">O SEGREDO ESTÁ ENTRE NÓS</div><h1>ENTRE<br>SUSPEITOS</h1>${mark?'<p>Em quem você confia?</p>':''}</section>`;}
function renderSplash(){
 page='splash';theme();setTop();const phrase=ES.selectOpening();
 app.innerHTML=`<section class="splash">${title()}<div class="splash-phrase">“${esc(phrase.text)}”</div><div class="loadingbar"><span></span></div><button class="back" id="skip">Pular abertura</button></section>`;
 if(phrase.tier==='special'&&cfg.effects){ /* Mobile requires user gesture before sounds can begin. */ }
 document.getElementById('skip').onclick=()=>{clearTimeout(splashTimer);ESAudio.activate();ambient();sound('tap');renderMenu();};
 splashTimer=setTimeout(()=>renderMenu(),2300);
}
function openOnline(destination){ESAudio.activate();sound('tap');if(window.ESOnline)window.ESOnline.open({app,topbar,back:renderMenu,sound,bank:BANK,destination:typeof destination==='string'?destination:null});else renderFuture('Jogar online','O componente online não foi carregado.');}
function renderMenu(){
 page='menu';setTop();theme();
 app.innerHTML=`${title(true)}<section class="narrow">
 ${button('offline','◈ &nbsp; JOGAR OFFLINE<span class="subtitle">Um celular, vários suspeitos</span>','secondary')}
 ${button('online','◎ &nbsp; JOGAR ONLINE<span class="subtitle">Salas · Amigos · Voz (em testes)</span>')}
 ${button('howto','? &nbsp; COMO JOGAR','ghost')}
 <div class="tiles">
  <button class="tile" id="profile"><span class="tile-icon">♟</span>Meu perfil</button>
  <button class="tile" id="ranking"><span class="tile-icon">♛</span>Ranking</button>
  <button class="tile" id="friends"><span class="tile-icon">♧</span>Amigos</button>
  <button class="tile" id="settings"><span class="tile-icon">⚙</span>Configurações</button>
 </div>
 <p class="center small muted" style="margin-top:19px">${counts.total.toLocaleString('pt-BR')} palavras · ${categories.length} categorias · sem internet</p>
 </section>`;
 document.getElementById('offline').onclick=()=>{ESAudio.activate();ambient();sound('tap');renderSetup();};
 document.getElementById('online').onclick=openOnline;
 document.getElementById('howto').onclick=()=>{sound('tap');renderHowTo();};
 document.getElementById('profile').onclick=()=>openOnline('profile');
 document.getElementById('ranking').onclick=()=>openOnline('ranking');
 document.getElementById('friends').onclick=()=>openOnline('friends');
 document.getElementById('settings').onclick=()=>{sound('tap');renderSettings();};
}
function renderHowTo(){
 page='howto';setTop('Como jogar',renderMenu);
 app.innerHTML=`<section class="card"><h2>O segredo está entre nós</h2>
 <p class="subtext">Todos os jogadores comuns recebem a mesma palavra. O impostor não recebe a palavra: ele precisa se misturar, ouvir as pistas e tentar não ser descoberto.</p>
 <h3>Modo offline</h3><p class="subtext">Cadastre os nomes, escolha as categorias e o número de impostores. Passe o celular de mão em mão. Cada jogador segura a carta para ver seu papel e solta o dedo para escondê-lo. Depois, conversem e revelem os impostores quando decidirem.</p>
 <h3>Dicas para impostores</h3><p class="subtext">O anfitrião decide se o impostor vê categoria, dica, as duas ou nenhuma. Com mais de um impostor, também é possível escolher se eles se conhecem.</p>
 <h3>Modo online</h3><p class="subtext">Com um servidor configurado, os participantes entram em salas com pelo menos 3 jogadores prontos, visualizam a carta por 30 segundos e seguem diretamente para uma votação secreta sem limite de tempo. A votação encerra quando todos os participantes que continuam na sala votam. Empates pela última vaga favorecem quem conseguiu escapar.</p>
 <p class="notice">Não diga a palavra secreta em voz alta e nunca mostre sua carta aos outros. As partidas públicas são as únicas que concedem XP e pontos no ranking online.</p>
 ${button('backHow','VOLTAR AO MENU','secondary')}</section>`;
 document.getElementById('backHow').onclick=renderMenu;
}
function renderFuture(name,desc){page='future';setTop(name,renderMenu);app.innerHTML=`<section class="card center"><div class="brand-mark" aria-hidden="true">◈</div><span class="pill red">EM DESENVOLVIMENTO</span><h2 style="margin-top:12px">${esc(name)}</h2><p class="subtext">${esc(desc)}</p>${button('return','Voltar ao menu','secondary')}</section>`;document.getElementById('return').onclick=renderMenu;}
function renderSettings(){
 page='settings';setTop('Configurações',renderMenu);
 app.innerHTML=`<section class="card"><h2>Visual e som</h2><p class="subtext">Escolha o tema e ajuste o áudio deste aparelho.</p>
 <div class="field"><label for="theme">Tema do aplicativo</label><select id="theme"><option value="shadow">Sombra — preto e vermelho</option><option value="night">Noturno — azul e roxo</option></select></div>
 <div class="check"><input class="switch" type="checkbox" id="music"><label for="music">Música ambiente de suspense</label></div>
 <div class="check"><input class="switch" type="checkbox" id="effects"><label for="effects">Efeitos sonoros do jogo</label></div>
 <div class="notice">A trilha é original e gerada pelo aplicativo. O som é opcional e funciona sem internet. Por segurança, as informações secretas só aparecem enquanto você mantém o dedo na carta.</div></section>
 <section class="card"><h3>Conteúdo offline</h3><div class="round-overview"><span class="pill">${categories.length} categorias</span><span class="pill">${counts.total.toLocaleString('pt-BR')} palavras</span><span class="pill">3 dificuldades</span></div><p class="small muted">As palavras e as preferências ficam armazenadas no aparelho. A cada rodada, o sistema evita repetir as respostas ainda disponíveis.</p></section>`;
 document.getElementById('theme').value=cfg.theme;
 document.getElementById('music').checked=cfg.music;
 document.getElementById('effects').checked=cfg.effects;
 document.getElementById('theme').onchange=e=>{cfg.theme=e.target.value;theme();save();sound('tap');};
 document.getElementById('music').onchange=e=>{cfg.music=e.target.checked;save();ambient();};
 document.getElementById('effects').onchange=e=>{cfg.effects=e.target.checked;save();sound('tap');};
}
function renderSetup(){
 page='setup';game=null;setTop('Preparar partida',renderMenu);
 app.innerHTML=`<section class="card"><h2>Quem vai jogar?</h2><p class="subtext">Passe um único celular de mão em mão. Ninguém precisa criar conta.</p>
 <div class="field"><label>Quantidade de jogadores</label><div class="row"><button class="btn secondary counter" id="minus" aria-label="Diminuir jogadores">−</button><input class="counter-number" id="playerCount" type="number" min="3" max="30" value="${cfg.names.length}" aria-label="Quantidade de jogadores"><button class="btn secondary counter" id="plus" aria-label="Aumentar jogadores">+</button></div></div>
 <div class="field"><label>Nomes dos jogadores (na ordem da roda)</label><div id="players"></div></div>
 <div class="field"><label for="impostors">Quantidade de impostores</label><select id="impostors"></select></div></section>
 <section class="card"><h2>Regras da rodada</h2>
 <div class="field"><label for="difficulty">Dificuldade</label><select id="difficulty"><option>Fácil</option><option>Médio</option><option>Difícil</option><option>Misturado</option></select></div>
 <div class="field"><label for="clue">Informação dada ao impostor</label><select id="clue"><option value="both">Categoria e dica</option><option value="category">Apenas categoria</option><option value="hint">Apenas dica</option><option value="none">Sem categoria ou dica</option></select></div>
 <div class="check"><input type="checkbox" id="know" class="switch"><label for="know">Impostores conhecem os parceiros</label></div>
 <p class="subtext">No modo offline, não há cronômetro ou votação automática. Vocês decidem verbalmente.</p></section>
 <section class="card"><div class="section-header"><h2>Categorias</h2><span class="pill">${counts.total.toLocaleString('pt-BR')} palavras</span></div>
 <p class="subtext">Escolha uma ou mais categorias. A categoria Pessoas de Loreto é uma coleção local especial; nas demais categorias, o banco mantém pelo menos 100 palavras.</p>
 <div class="row"><button class="btn secondary" id="all">Todas</button><button class="btn ghost" id="none">Limpar</button></div>
 <div class="catGrid" id="catGrid"></div></section>
 <p id="error" class="error" role="alert"></p>
 ${button('start','SORTEAR E COMEÇAR')}`;
 drawPlayers();drawImpostors();drawCategories();
 document.getElementById('difficulty').value=cfg.difficulty;
 document.getElementById('clue').value=cfg.clue;
 document.getElementById('know').checked=cfg.know;
 document.getElementById('minus').onclick=()=>resize(cfg.names.length-1);
 document.getElementById('plus').onclick=()=>resize(cfg.names.length+1);
 document.getElementById('playerCount').onchange=e=>resize(Number(e.target.value));
 document.getElementById('impostors').onchange=e=>{cfg.impostors=Number(e.target.value);save();};
 document.getElementById('difficulty').onchange=e=>{cfg.difficulty=e.target.value;save();};
 document.getElementById('clue').onchange=e=>{cfg.clue=e.target.value;save();};
 document.getElementById('know').onchange=e=>{cfg.know=e.target.checked;save();};
 document.getElementById('all').onclick=()=>{cfg.categories=[...categories];save();drawCategories();sound('tap');};
 document.getElementById('none').onclick=()=>{cfg.categories=[];save();drawCategories();sound('tap');};
 document.getElementById('start').onclick=startGame;
}
function drawPlayers(){
 document.getElementById('players').innerHTML=cfg.names.map((n,i)=>`<div class="player"><span class="index">${i+1}</span><input type="text" data-player="${i}" maxlength="28" aria-label="Nome do jogador ${i+1}" value="${esc(n)}"></div>`).join('');
 document.querySelectorAll('[data-player]').forEach(el=>el.oninput=e=>{cfg.names[+e.target.dataset.player]=e.target.value;save();});
}
function drawImpostors(){
 const max=ES.maxImpostors(cfg.names.length);cfg.impostors=Math.max(1,Math.min(cfg.impostors,max));
 const imp=document.getElementById('impostors');imp.innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1} ${i===0?'impostor':'impostores'}</option>`).join('');imp.value=cfg.impostors;
}
function drawCategories(){
 document.getElementById('catGrid').innerHTML=categories.map((c,i)=>`<div class="check"><input type="checkbox" data-cat="${i}" id="c${i}" ${cfg.categories.includes(c)?'checked':''}><label for="c${i}">${esc(c)}</label><span class="count">${BANK[c].length}</span></div>`).join('');
 document.querySelectorAll('[data-cat]').forEach(el=>el.onchange=e=>{const cat=categories[+e.target.dataset.cat];cfg.categories=e.target.checked?[...cfg.categories.filter(x=>x!==cat),cat]:cfg.categories.filter(x=>x!==cat);save();});
}
function resize(n){
 n=Math.max(3,Math.min(30,Number.isFinite(n)?Math.round(n):3));
 cfg.names=Array.from({length:n},(_,i)=>cfg.names[i]??('Jogador '+(i+1)));
 cfg.impostors=Math.min(cfg.impostors,ES.maxImpostors(n));save();renderSetup();
}
function startGame(){
 const err=document.getElementById('error');
 const names=cfg.names.map(x=>x.trim());
 if(names.some(x=>!x)){err.textContent='Preencha o nome de todos os jogadores.';return;}
 if(new Set(names.map(x=>x.toLocaleLowerCase('pt-BR'))).size!==names.length){err.textContent='Os jogadores precisam ter nomes diferentes.';return;}
 if(!cfg.categories.length){err.textContent='Selecione pelo menos uma categoria.';return;}
 if(cfg.impostors<1||cfg.impostors>ES.maxImpostors(names.length)){err.textContent='Quantidade de impostores inválida.';return;}
 try{
  const word=ES.selectWord(BANK,cfg.categories,cfg.difficulty,used);
  saveUsed();
  const imps=ES.shuffle([...names.keys()]).slice(0,cfg.impostors);
  game={names,word,imps,index:0,finished:false,settings:{clue:cfg.clue,know:cfg.know}};
  save();sound('tap');renderReveal();
 }catch(ex){err.textContent=ex.message||'Não foi possível iniciar a partida.';}
}
function guardBack(){if(window.confirm('Sair da rodada atual? A palavra e os papéis serão descartados.')){game=null;renderMenu();}}
function renderReveal(){
 page='reveal';if(!game){renderSetup();return;}
 const i=game.index;
 if(i>=game.names.length){renderDiscussion();return;}
 const imp=game.imps.includes(i);
 setTop('Papéis secretos',guardBack);
 app.innerHTML=`<section class="rolehead center"><span class="pill red">JOGADOR ${i+1} DE ${game.names.length}</span><h2>${esc(game.names[i])}</h2><p class="subtext">Segure a carta com o dedo para ver seu papel. Solte para esconder.</p></section>
 <div id="card" class="card-reveal" role="button" tabindex="0" aria-label="Mantenha pressionado para ver seu papel secreto">
 <div id="cardContent"><div class="icon">◈</div><div class="secret-label">CARTA SELADA</div><div class="hold-hint">MANTENHA PRESSIONADO PARA REVELAR</div></div></div>
 <div class="notice center">Ao soltar o dedo, a carta se fecha sozinha. Confira que a informação está oculta antes de passar o celular.</div>
 ${button('next',i===game.names.length-1?'Iniciar discussão →':'Próximo jogador →','secondary')}`;
 const card=document.getElementById('card'),content=document.getElementById('cardContent');
 let showing=false;
 function show(){if(showing)return;showing=true;card.classList.add('revealed');card.classList.add('pulse-reveal');setTimeout(()=>card.classList.remove('pulse-reveal'),620);
  const partners=game.imps.filter(n=>n!==i).map(n=>game.names[n]);
  if(imp){
    content.innerHTML=`<div class="secret-label">SUA IDENTIDADE</div><div class="secret-name impostor">IMPOSTOR</div>`+
    (['both','category'].includes(game.settings.clue)?`<div class="secret-detail"><b>Categoria:</b> ${esc(game.word.c)}</div>`:'')+
    (game.word.c!=='Pessoas de Loreto'&&game.word.h&&['both','hint'].includes(game.settings.clue)?`<div class="secret-detail"><b>Dica:</b> ${esc(game.word.h)}</div>`:'')+
    (game.settings.know&&partners.length?`<div class="secret-detail"><b>Parceiros:</b> ${esc(partners.join(', '))}</div>`:'')+
    '<div class="secret-info">Não revele seu papel!</div>';
    sound('impostor');
  }else{
    content.innerHTML=`<div class="secret-label">SUA PALAVRA</div><div class="secret-name">${esc(game.word.w)}</div><div class="secret-detail">Categoria: ${esc(game.word.c)}</div><div class="secret-info">Dê pistas sem dizer a palavra!</div>`;
    sound('reveal');
  }
 }
 function hide(){if(!showing)return;showing=false;card.classList.remove('revealed');card.classList.remove('pulse-reveal');content.innerHTML='<div class="icon">◈</div><div class="secret-label">CARTA SELADA</div><div class="hold-hint">MANTENHA PRESSIONADO PARA REVELAR</div>';}
 card.addEventListener('pointerdown',e=>{e.preventDefault();try{card.setPointerCapture(e.pointerId);}catch{}show();});
 for(const eventName of ['pointerup','pointercancel','lostpointercapture','pointerleave'])card.addEventListener(eventName,hide);
 card.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('blur',hide,{once:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();},{once:true});
 card.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();show();}});
 card.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();hide();}});
 document.getElementById('next').onclick=()=>{hide();game.index++;sound('tap');if(game.index>=game.names.length)renderDiscussion();else renderReveal();};
}
function renderDiscussion(){
 page='discussion';setTop('Discussão',guardBack);
 app.innerHTML=`<section class="card center" style="margin-top:28px"><div class="brand-mark" aria-hidden="true">◈</div><div class="eyebrow">TODOS RECEBERAM SUAS CARTAS</div><h2>Hora das pistas!</h2><p class="subtext">Sigam a ordem em que estão sentados. Um de cada vez dá uma pista sobre a palavra.</p>
 <div class="round-overview"><span class="pill">${game.names.length} jogadores</span><span class="pill red">${game.imps.length} ${game.imps.length===1?'impostor':'impostores'}</span><span class="pill good">Tempo livre</span></div>
 <p class="subtext">Conversem, discutam e decidam verbalmente os suspeitos. No offline, não há votação pelo aplicativo.</p>
 ${button('finish','REVELAR IMPOSTOR'+(game.imps.length>1?'ES':''))}
 ${button('again','Sortear outra rodada sem revelar','secondary')}
 </section>`;
 document.getElementById('finish').onclick=()=>{if(confirm('Todos concordaram em revelar a palavra e os impostores?')){sound('finish');renderResult();}};
 document.getElementById('again').onclick=()=>{if(confirm('Descartar esta rodada sem revelar e sortear outra palavra?')){game=null;renderSetup();}};
}
function renderResult(){
 page='result';game.finished=true;setTop('Resultado',renderMenu);
 app.innerHTML=`<section class="card center" style="margin-top:20px"><div class="eyebrow">O MISTÉRIO TERMINOU</div><h2>Segredos revelados</h2><div class="card-reveal revealed" style="min-height:175px;touch-action:auto;cursor:default"><div><div class="secret-label">A PALAVRA ERA</div><div class="result-word">${esc(game.word.w)}</div><p class="subtext">${esc(game.word.c)} · ${esc(game.word.d)}</p></div></div>
 <div class="eyebrow">${game.imps.length===1?'O IMPOSTOR ERA':'OS IMPOSTORES ERAM'}</div>
 ${game.imps.map(i=>`<div class="result-name">${esc(game.names[i])}</div>`).join('')}
 <div class="divider"></div>
 ${button('again','JOGAR NOVAMENTE')}
 ${button('edit','Alterar configurações','secondary')}
 ${button('home','Voltar ao menu','ghost')}
 </section>`;
 document.getElementById('again').onclick=()=>{sound('tap');game=null;renderSetup();document.getElementById('start').click();};
 document.getElementById('edit').onclick=()=>{game=null;renderSetup();};
 document.getElementById('home').onclick=()=>{game=null;renderMenu();};
}
window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')ESAudio.stop();else if(cfg.music)ESAudio.music(true);});
window.addEventListener('beforeunload',()=>{save();saveUsed();});
renderSplash();
})();
