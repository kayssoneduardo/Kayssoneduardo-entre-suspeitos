/* Entre Suspeitos: cliente online beta, sem CDN e sem chaves privadas incorporadas.
   O banco é Supabase/PostgREST, com RPCs SECURITY DEFINER e RLS. */
(function(){
'use strict';
const PREFIX='es3_', MIN=3, MAX=10;
const CATEGORIES=Object.keys(window.ES_WORD_BANK||{});
const COMPILED_CLOUD=window.ES_SERVER_CONFIG||{url:'',key:''};
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
function xpProgress(value){
 const xp=Math.max(0,Math.floor(Number(value)||0));
 const level=1+Math.floor(Math.sqrt(xp/100));
 const floor=100*(level-1)**2,next=100*level**2;
 return {xp,level,next,remaining:next-xp,earned:xp-floor,needed:next-floor,percent:Math.floor((xp-floor)/(next-floor)*100)};
}
function rankedPlayers(players){
 const sorted=[...players].sort((a,b)=>b.ranking_points-a.ranking_points||b.online_wins-a.online_wins);
 let position=0;
 return sorted.map((p,i)=>{if(i===0||p.ranking_points!==sorted[i-1].ranking_points||p.online_wins!==sorted[i-1].online_wins)position=i+1;return {...p,position};});
}
function avatarSrc(cloud,path){if(!cloud||!path||!/^[-0-9a-f]{36}\/avatar\.jpg$/i.test(path))return null;return cloud.url+'/storage/v1/object/public/es-avatars/'+path+'?v='+Date.now().toString().slice(0,-4);}

const btn=(id,txt,cls='')=>`<button type="button" class="btn ${cls}" id="${id}">${txt}</button>`;
const save=(k,v)=>{try{localStorage.setItem(PREFIX+k,JSON.stringify(v));}catch{}};
const load=k=>{try{return JSON.parse(localStorage.getItem(PREFIX+k));}catch{return null;}};
function etext(msg){return ESC(msg instanceof Error?msg.message:msg);}
function prettyError(e){
 const code=String(e?.code||'').toLowerCase();
 const t=String(e?.message||e||'Erro desconhecido');
 if(e?.status===429||code==='over_email_send_rate_limit'||t.toLowerCase().includes('email rate limit'))
  return 'O servidor atingiu o limite de envio de e-mails. O cadastro NÃO foi concluído. Aguarde a liberação do serviço ou a configuração de um provedor de e-mail para o jogo. Não tente repetidamente.';
 if(code==='unexpected_failure' && /confirmation|email|smtp|authentication failed/i.test(t) || /error sending confirmation email|535 5\.7\.8/i.test(t))
  return 'O servidor de e-mail do Entre Suspeitos está com falha de autenticação SMTP. O cadastro não foi concluído. A administração precisa corrigir a senha SMTP; tente novamente após a correção.';
 if(code==='email_address_not_authorized')return 'O servidor de e-mail do jogo ainda não permite enviar mensagens para este endereço. Configure o SMTP antes de continuar.';
 if(code==='invalid_credentials'||t.includes('Invalid login credentials'))
  return 'E-mail ou senha incorretos, ou conta ainda não criada. Confira o cadastro antes de tentar novamente.';
 if(code==='email_not_confirmed'||t.includes('Email not confirmed'))
  return 'Confirme seu e-mail antes de entrar. Se o link não abrir, use a opção de colar o link recebido.';
 if(code==='user_already_exists'||t.includes('User already registered'))return 'Este e-mail já está cadastrado. Entre ou recupere sua senha.';
 if(code==='over_request_rate_limit')return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
 if(t.includes('Failed to fetch'))return 'Falha de conexão com o servidor. Verifique a internet.';
 return t;
}
function seconds(end){return Math.max(0,Math.ceil((new Date(end).getTime()-Date.now())/1000));}
function countdown(end){const s=seconds(end);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function pill(s){return `<span class="pill">${ESC(s)}</span>`;}
const input=(id,label,type='text',value='',extra='')=>`<div class="field"><label for="${id}">${ESC(label)}</label><input id="${id}" type="${type}" value="${ESC(value)}" ${extra}></div>`;
class Cloud{
 constructor(url,key){this.url=url.replace(/\/+$/,'');this.key=key;this.session=load('session');}
 async request(path,method='GET',data=null,auth=true){
  if(auth)await this.refreshIfNeeded();
  const headers={'apikey':this.key,'Content-Type':'application/json','Accept':'application/json'};
  if(auth&&this.session?.access_token)headers.Authorization='Bearer '+this.session.access_token;
  let response;
  try{response=await fetch(this.url+path,{method,headers,body:data===null?undefined:JSON.stringify(data),cache:'no-store'});}catch{throw new Error('Falha de conexão. Verifique sua internet e o endereço do Supabase.');}
  let json;const text=await response.text();try{json=text?JSON.parse(text):null;}catch{json=text;}
  if(!response.ok){const e=new Error(json?.message||json?.msg||json?.error_description||json?.error||('Erro '+response.status));e.status=response.status;e.code=json?.code||json?.error_code||'';throw e;}
  return json;
 }
 async refreshIfNeeded(){
  if(!this.session?.refresh_token)return;
  if(Date.now()<(this.session.expires_at||0)*1000-120000)return;
  // Chamamos o endpoint de refresh diretamente para evitar recursão.
  const res=await fetch(this.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:this.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:this.session.refresh_token})});
  const data=await res.json();if(!res.ok){this.session=null;save('session',null);throw new Error('Sessão expirada. Entre novamente.');}
  this.setSession(data);
 }
 setSession(data){this.session={...data,expires_at:data.expires_at||(Math.floor(Date.now()/1000)+data.expires_in)};save('session',this.session);}
 async signIn(email,password){const r=await this.request('/auth/v1/token?grant_type=password','POST',{email,password},false);this.setSession(r);return r;}
 async signUp(email,password,nickname){const redir=window.location.origin+window.location.pathname;return this.request('/auth/v1/signup?redirect_to='+encodeURIComponent(redir),'POST',{email,password,data:{nickname}},false);}
 async recover(email){const redir=window.location.origin+window.location.pathname;return this.request('/auth/v1/recover?redirect_to='+encodeURIComponent(redir),'POST',{email},false);}
 async verifyEmailLink(value){
  let uri;
  try{uri=new URL(value.trim());}catch{throw new Error('Cole o endereço completo recebido no e-mail.');}
  const site=new URL(this.url);
  if(uri.origin!==site.origin||uri.pathname!=='/auth/v1/verify')
    throw new Error('O endereço precisa ser um link original do Supabase Entre Suspeitos.');
  const token=uri.searchParams.get('token_hash')||uri.searchParams.get('token');
  const rawType=uri.searchParams.get('type');
  const type=rawType==='email'?'signup':rawType;
  if(!token||!['signup','recovery'].includes(type))
    throw new Error('Link incompleto ou não suportado. Solicite um novo e-mail.');
  const result=await this.request('/auth/v1/verify','POST',{token_hash:token,type},false);
  if(result?.access_token)this.setSession(result);
  return {type,loggedIn:!!result?.access_token};
 }
 async completeFromUrl(){
  const params=new URLSearchParams(window.location.hash.replace(/^#/,''));
  const problem=params.get('error_description')||params.get('error');
  if(problem){window.history.replaceState(null,'',window.location.pathname);throw new Error(decodeURIComponent(problem));}
  const access=params.get('access_token'),refresh=params.get('refresh_token');
  if(!access||!refresh)return null;
  const expires=Math.max(30,Number(params.get('expires_in'))||3600);
  this.setSession({access_token:access,refresh_token:refresh,expires_in:expires,token_type:'bearer'});
  try{
    const user=await this.request('/auth/v1/user');
    this.setSession({...this.session,user});
  }catch(err){this.session=null;save('session',null);throw err;}
  window.history.replaceState(null,'',window.location.pathname);
  return params.get('type')==='recovery'?'recovery':'confirmed';
 }
 async signOut(){try{await this.request('/auth/v1/logout','POST',{});}catch{}this.session=null;save('session',null);}
 async rpc(name,p={}){return this.request('/rest/v1/rpc/'+name,'POST',p);}
 async uploadAvatar(blob){
  await this.refreshIfNeeded();
  if(!this.session?.access_token)throw new Error('Entre na conta para enviar a foto.');
  if(blob.size>1048576)throw new Error('A foto deve ter até 1 MB.');
  const path=this.userId+'/avatar.jpg';
  const r=await fetch(this.url+'/storage/v1/object/es-avatars/'+path,{
    method:'POST',headers:{apikey:this.key,Authorization:'Bearer '+this.session.access_token,
     'Content-Type':'image/jpeg','x-upsert':'true','Cache-Control':'max-age=60'},body:blob
  });
  if(!r.ok){const data=await r.json().catch(()=>null);throw new Error(data?.message||'Não foi possível enviar a foto.');}
  await this.rpc('es_set_avatar',{p_path:path});
 }
 get userId(){return this.session?.user?.id||null;}
}
class Voice{
 constructor(cloud,room,id){this.cloud=cloud;this.room=room;this.id=id;this.stream=null;this.connections=new Map();this.lastSignal=0;this.audio=new Map();this.running=false;this.poll=null;this.error='';}
 async start(players){
  if(!navigator.mediaDevices?.getUserMedia||typeof RTCPeerConnection==='undefined')throw new Error('Este navegador não disponibiliza recursos de áudio WebRTC.');
  try{this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});}
  catch{throw new Error('Não foi possível acessar o microfone. Verifique a permissão de microfone do Safari, Chrome ou navegador utilizado.');}
  this.running=true;await this.update(players);
  this.poll=setInterval(()=>this.readSignals().catch(e=>{this.error=prettyError(e);}),1400);
 }
 async signal(to,kind,payload){if(!this.running)return;try{await this.cloud.rpc('es_signal_send',{p_room:this.room,p_to:to,p_kind:kind,p_payload:payload});}catch(e){this.error=prettyError(e);}}
 createPeer(id){
  if(this.connections.has(id))return this.connections.get(id);
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
  const entry={pc,queued:[],offered:false};this.connections.set(id,entry);
  this.stream?.getTracks().forEach(track=>pc.addTrack(track,this.stream));
  pc.onicecandidate=e=>{if(e.candidate)this.signal(id,'ice',e.candidate.toJSON());};
  pc.ontrack=e=>{
   let audio=this.audio.get(id);
   if(!audio){audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;audio.dataset.peer=id;audio.style.display='none';document.body.appendChild(audio);this.audio.set(id,audio);}
   audio.srcObject=e.streams[0];audio.play().catch(()=>{this.error='Toque em Ativar voz novamente para liberar áudio.';});
  };
  return entry;
 }
 async update(players){
  if(!this.running)return;
  const peers=players.filter(p=>p.active&&p.id!==this.id).map(p=>p.id);
  for(const id of [...this.connections.keys()])if(!peers.includes(id)){this.connections.get(id).pc.close();this.connections.delete(id);this.audio.get(id)?.remove();this.audio.delete(id);}
  for(const id of peers){const entry=this.createPeer(id);if(this.id<id&&!entry.offered){
   entry.offered=true;try{const offer=await entry.pc.createOffer();await entry.pc.setLocalDescription(offer);await this.signal(id,'offer',{type:offer.type,sdp:offer.sdp});}catch(e){this.error=prettyError(e);entry.offered=false;}
  }}
 }
 async readSignals(){
  if(!this.running)return;
  const msgs=await this.cloud.rpc('es_signal_poll',{p_room:this.room,p_after:this.lastSignal});
  for(const s of msgs||[]){this.lastSignal=Math.max(this.lastSignal,Number(s.id));const e=this.createPeer(s.from_id);
   try{
    if(s.kind==='offer'){
     await e.pc.setRemoteDescription(new RTCSessionDescription(s.payload));
     const a=await e.pc.createAnswer();await e.pc.setLocalDescription(a);await this.signal(s.from_id,'answer',{type:a.type,sdp:a.sdp});
    }else if(s.kind==='answer')await e.pc.setRemoteDescription(new RTCSessionDescription(s.payload));
    else if(s.kind==='ice'){
     if(e.pc.remoteDescription)await e.pc.addIceCandidate(new RTCIceCandidate(s.payload));
     else e.queued.push(s.payload);
    }
    if(e.pc.remoteDescription){for(const c of e.queued.splice(0))await e.pc.addIceCandidate(new RTCIceCandidate(c));}
   }catch(err){this.error=prettyError(err);}
  }
 }
 close(){this.running=false;if(this.poll)clearInterval(this.poll);this.poll=null;for(const e of this.connections.values())e.pc.close();this.connections.clear();for(const a of this.audio.values())a.remove();this.audio.clear();this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;}
}
class OnlineUI{
 constructor(){this.cloud=null;this.app=null;this.topbar=null;this.back=null;this.sound=null;this.bank=null;
  this.roomId=null;this.room=null;this.refreshTimer=null;this.tickTimer=null;this.refreshing=false;this.voice=null;this.connectionFailures=0;this.nextRefreshAt=0;this.lastPhase='';this.lastFingerprint='';this.view='';this.currentPage='';}
 open({app,topbar,back,sound,bank,destination}){const invite=new URLSearchParams(window.location.search).get('room');if(invite&&/^[a-z0-9]{6}$/i.test(invite))this.pendingJoinCode=invite.toUpperCase();this.pendingDestination=destination;this.app=app;this.topbar=topbar;this.back=back;this.sound=sound;this.bank=bank;
  const config=(COMPILED_CLOUD.url&&COMPILED_CLOUD.key)?COMPILED_CLOUD:load('cloud');if(config?.url&&config?.key){this.cloud=new Cloud(config.url,config.key);this.cloud.session=load('session');this.cloud.completeFromUrl().then(kind=>{if(kind==='recovery'){this.login();this.showRecoveryForm();}else this.home();}).catch(e=>{this.login();this.error(e);});}
  else this.setup();
 }
 header(title){this.topbar.hidden=false;this.topbar.innerHTML=`<button class="back" id="onlineBack">← Voltar</button><strong>${ESC(title)}</strong><span style="width:65px"></span>`;
  $('onlineBack').onclick=()=>{if(['signup','recover','reset'].includes(this.currentPage))this.login();else if(['room','create','join','public','login','setup','home'].includes(this.currentPage))this.homeOrMenu();else this.home();};}
 homeOrMenu(){if(this.roomId){if(confirm('Sair da sala? Após o início, não votar será considerado derrota.'))this.leave();}
  else{this.destroy();this.back();}}
 destroy(){this.stopLoop();this.voice?.close();this.voice=null;this.roomId=null;this.room=null;this.lastPhase='';this.lastFingerprint='';}
 stopLoop(){if(this.refreshTimer)clearInterval(this.refreshTimer);if(this.tickTimer)clearInterval(this.tickTimer);this.refreshTimer=null;this.tickTimer=null;}
 error(e){const msg=prettyError(e);let box=$('onlineError');if(box){box.textContent=msg;box.hidden=false;}else alert(msg);}
 connectionFailed(e){this.connectionFailures++;this.nextRefreshAt=Date.now()+Math.min(30000,1500*2**Math.min(this.connectionFailures-1,5));const box=$('onlineError');if(box){box.textContent='Conexão interrompida. Tentando recuperar a sala automaticamente. '+prettyError(e);box.hidden=false;box.dataset.connectionError='1';}}
 connectionRestored(){if(!this.connectionFailures)return;this.connectionFailures=0;this.nextRefreshAt=0;const box=$('onlineError');if(box?.dataset.connectionError==='1'){box.textContent='';box.hidden=true;delete box.dataset.connectionError;}}
 note(text){const el=$('onlineInfo');if(el)el.textContent=text;else alert(text);}
 setup(){this.currentPage='setup';this.header('Ativar modo online');const c=(COMPILED_CLOUD.url&&COMPILED_CLOUD.key)?COMPILED_CLOUD:(load('cloud')||{});
  this.app.innerHTML=`<section class="card"><h2>Conectar servidor</h2><p class="subtext">O offline funciona sem internet. Para jogar online é necessário conectar um projeto Supabase configurado com o banco do Entre Suspeitos.</p>
  ${input('cloudUrl','URL do projeto Supabase','url',c.url||'','placeholder="https://seu-projeto.supabase.co"')}
  ${input('cloudKey','Chave pública (anon / publishable)','text',c.key||'','autocomplete="off"')}
  ${btn('cloudSave','Conectar servidor')}
  <p class="notice">Não coloque a chave <b>service_role</b> aqui. Ela é secreta. Use apenas a chave pública de acesso.</p>
  <p id="onlineError" class="error"></p></section>`;
  $('cloudSave').onclick=()=>{const url=$('cloudUrl').value.trim(),key=$('cloudKey').value.trim();
   if(!/^https:\/\/[^\s]+\.supabase\.co$/.test(url)||key.length<20)return this.error('Informe uma URL Supabase e uma chave pública válidas.');
   save('cloud',{url,key});this.cloud=new Cloud(url,key);this.home();};
 }
 home(){this.stopLoop();this.roomId=null;this.room=null;this.voice?.close();this.voice=null;
  if(!this.cloud){this.setup();return;}
  if(!this.cloud.userId){this.login();return;}
  const destination=this.pendingDestination;this.pendingDestination=null;
  if(destination==='profile')return this.profile();
  if(destination==='ranking')return this.ranking();
  if(destination==='friends')return this.friends();
   if(destination==='missions')return this.progressHub();
   if(destination==='stats')return this.statsPage();
   if(this.pendingJoinCode){const code=this.pendingJoinCode;this.pendingJoinCode=null;const u=new URL(window.location.href);u.searchParams.delete('room');window.history.replaceState(null,'',u.pathname+u.search+u.hash);return this.joinCode(code);}
  this.currentPage='home';this.header('Jogar online');
  this.app.innerHTML=`<section class="card center online-hub"><div class="hub-emblem" aria-hidden="true">?</div><div class="eyebrow">ENTRE SUSPEITOS ONLINE</div><h2>O segredo não conhece distância.</h2><p class="subtext">Salas públicas e privadas, voz, votação secreta e ranking.</p>
  ${load('lastRoom')?btn('resumeOn','RETOMAR ÚLTIMA SALA','secondary'):''}
  <div class="hub-primary">${btn('public','▣ &nbsp; Buscar salas públicas')}${btn('create','＋ &nbsp; Criar sala')}</div><div class="hub-divider">ENTRAR COM OPÇÕES</div><div class="hub-secondary">${btn('join','‹ › &nbsp; Entrar com código','secondary')}${btn('invitesOn','♧ &nbsp; Convites de amigos','secondary')}</div>
  <div class="tiles"><button class="tile" id="profileOn">♟ Meu perfil</button><button class="tile" id="rankingOn">♛ Ranking</button><button class="tile" id="friendsOn">♧ Amigos</button><button class="tile" id="missionsOn">✦ Missões e eventos</button><button class="tile" id="statsOn">▤ Estatísticas</button><button class="tile" id="feedbackOn">✉ Sugestões e denúncias</button></div>
  ${btn('adminOn','Painel administrativo','secondary')}${btn('serverOn','Configurar servidor','secondary')}${btn('logout','Sair da conta','ghost')}
  <p class="small muted">Online em testes: é necessário internet e servidor ativo. O chat por voz depende da permissão de microfone e da rede de cada participante.</p></section>`;
  if($('resumeOn'))$('resumeOn').onclick=async()=>{try{this.enterRoom(await this.cloud.rpc('es_rejoin',{p_room:load('lastRoom')}));}catch(e){this.error(e);}};
  $('invitesOn').onclick=()=>this.invites();
  $('public').onclick=()=>this.publicRooms();$('create').onclick=()=>this.createRoom();$('join').onclick=()=>this.joinCode();
  $('profileOn').onclick=()=>this.profile();$('rankingOn').onclick=()=>this.ranking();$('friendsOn').onclick=()=>this.friends();$('missionsOn').onclick=()=>this.progressHub();$('statsOn').onclick=()=>this.statsPage();
  $('feedbackOn').onclick=()=>this.feedback();$('adminOn').onclick=()=>this.admin();
  $('serverOn').onclick=()=>{this.cloud.session=null;save('session',null);this.setup();};
  $('logout').onclick=async()=>{try{await this.cloud.signOut();this.login();}catch(e){this.error(e);}};
 }
 async authAction(fn){
  if(this.authBusy)return;
  this.authBusy=true;
  for(const id of ['loginOn','signupOn','recoverOn','signupSubmitOn','recoverSubmitOn','checkEmailLinkOn']){
   const el=$(id);if(el)el.disabled=true;
  }
  try{await fn();}catch(e){this.error(e);}
  finally{
   this.authBusy=false;
   for(const id of ['loginOn','signupOn','recoverOn','signupSubmitOn','recoverSubmitOn','checkEmailLinkOn']){
    const el=$(id);if(el)el.disabled=false;
   }
  }
 }
 showRecoveryForm(){
  this.currentPage='reset';
  this.header('Definir nova senha');
  this.app.innerHTML='<section class="card"><h2>Recuperar sua conta</h2><p class="subtext">Link confirmado. Digite uma senha nova com pelo menos 8 caracteres.</p>'+
    '<div class="field"><label for="newPassOn">Nova senha</label><input id="newPassOn" type="password" minlength="8" autocomplete="new-password"></div>'+
    '<div class="field"><label for="confirmPassOn">Confirmar senha</label><input id="confirmPassOn" type="password" minlength="8" autocomplete="new-password"></div>'+
    '<button class="btn" type="button" id="saveNewPassOn">SALVAR NOVA SENHA</button><p id="onlineError" class="error"></p></section>';
  $('saveNewPassOn').onclick=async()=>{
    const pwd=$('newPassOn').value;
    if(pwd.length<8)return this.error('A senha deve conter pelo menos 8 caracteres.');
    if(pwd!==$('confirmPassOn').value)return this.error('As senhas não conferem.');
    const button=$('saveNewPassOn');button.disabled=true;
    try{await this.cloud.request('/auth/v1/user','PUT',{password:pwd});this.home();}
    catch(e){this.error(e);}
    finally{if(button.isConnected)button.disabled=false;}
  };
 }

 authEnter(ids,buttonId){
  for(const id of ids){
   $(id).addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();$(buttonId).click();}
   });
  }
 }
 login(email='',message=''){
  this.currentPage='login';this.header('Entrar');
  this.app.innerHTML='<section class="card auth-card">'+
   '<div class="auth-intro"><span class="eyebrow">ENTRE SUSPEITOS ONLINE</span><h2>Entrar na conta</h2>'+
   '<p class="subtext">Use sua conta para jogar com os amigos.</p></div>'+
   (message?'<p class="auth-success" id="authNotice" role="status">'+ESC(message)+'</p>':'')+
   input('emailOn','E-mail','email',email,'autocomplete="email" inputmode="email"')+
   input('passwordOn','Senha','password','','autocomplete="current-password"')+
   btn('loginOn','ENTRAR')+
   '<div class="auth-actions"><p class="small muted">Ainda não tem uma conta?</p>'+
   btn('signupOn','CRIAR CONTA','secondary')+
   btn('recoverOn','Esqueci minha senha','ghost')+'</div>'+
   '<p id="onlineError" class="error" role="alert"></p></section>';
  $('loginOn').onclick=()=>this.authAction(async()=>{
   const email=$('emailOn').value.trim().toLowerCase(),pwd=$('passwordOn').value;
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Informe um e-mail válido.');
   if(!pwd)throw new Error('Digite sua senha.');
   await this.cloud.signIn(email,pwd);
   this.home();
  });
  $('signupOn').onclick=()=>this.signup($('emailOn').value.trim());
  $('recoverOn').onclick=()=>this.recover($('emailOn').value.trim());
  this.authEnter(['emailOn','passwordOn'],'loginOn');
 }
 signup(prefilledEmail=''){
  this.currentPage='signup';this.header('Criar conta');
  this.app.innerHTML='<section class="card auth-card">'+
   '<div class="auth-intro"><span class="eyebrow">NOVA CONTA</span><h2>Crie sua conta</h2>'+
   '<p class="subtext">Escolha um apelido, informe seu e-mail e crie uma senha para jogar online.</p></div>'+
   input('signupNickOn','Apelido público','text','','autocomplete="nickname" maxlength="28"')+
   input('signupEmailOn','E-mail','email',prefilledEmail,'autocomplete="email" inputmode="email"')+
   input('signupPassOn','Senha (mínimo 8 caracteres)','password','','autocomplete="new-password" minlength="8"')+
   input('signupConfirmOn','Confirmar senha','password','','autocomplete="new-password" minlength="8"')+
   '<p class="small muted">A confirmação por e-mail pode ser necessária antes do primeiro acesso.</p>'+
   btn('signupSubmitOn','CRIAR MINHA CONTA')+
   btn('signupBackOn','← Voltar para entrar','ghost')+
   '<p id="onlineError" class="error" role="alert"></p></section>';
  $('signupBackOn').onclick=()=>this.login($('signupEmailOn').value.trim());
  $('signupSubmitOn').onclick=()=>this.authAction(async()=>{
   const email=$('signupEmailOn').value.trim().toLowerCase();
   const nick=$('signupNickOn').value.trim(),pwd=$('signupPassOn').value;
   if(nick.length<2||nick.length>28)throw new Error('Escolha um apelido com 2 a 28 caracteres.');
   if(nick.toLowerCase().replace(/\s+/g,'')==='zero')throw new Error('O apelido Zero está reservado.');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Informe um e-mail válido.');
   if(pwd.length<8)throw new Error('Escolha uma senha com pelo menos 8 caracteres.');
   if(pwd!==$('signupConfirmOn').value)throw new Error('As senhas não conferem.');
   const r=await this.cloud.signUp(email,pwd,nick);
   if(r?.access_token){this.cloud.setSession(r);this.home();}
   else this.login(email,'Solicitação de cadastro recebida. Verifique seu e-mail e confirme a conta antes de entrar. Se a mensagem não chegar, confira o spam.');
  });
  this.authEnter(['signupNickOn','signupEmailOn','signupPassOn','signupConfirmOn'],'signupSubmitOn');
 }
 recover(prefilledEmail=''){
  this.currentPage='recover';this.header('Recuperar senha');
  this.app.innerHTML='<section class="card auth-card">'+
   '<div class="auth-intro"><span class="eyebrow">RECUPERAÇÃO</span><h2>Esqueceu sua senha?</h2>'+
   '<p class="subtext">Informe o e-mail da conta. Enviaremos um link para redefinir a senha.</p></div>'+
   input('recoverEmailOn','E-mail cadastrado','email',prefilledEmail,'autocomplete="email" inputmode="email"')+
   btn('recoverSubmitOn','ENVIAR LINK DE RECUPERAÇÃO')+
   btn('recoverBackOn','← Voltar para entrar','ghost')+
   '<p id="onlineError" class="error" role="alert"></p><p id="onlineInfo" class="subtext" role="status"></p></section>'+
   '<section class="card auth-card"><h3>O link do e-mail não abre?</h3>'+
   '<p class="subtext">Copie o endereço original recebido no e-mail e cole abaixo para confirmar a conta ou recuperar o acesso.</p>'+
   '<div class="field"><label for="emailLinkOn">Link original de confirmação ou recuperação</label>'+
   '<textarea id="emailLinkOn" rows="3" autocapitalize="off" spellcheck="false"></textarea></div>'+
   btn('checkEmailLinkOn','VALIDAR LINK DO E-MAIL','secondary')+
   '<p class="small muted">O link é secreto. Nunca compartilhe com outras pessoas.</p></section>';
  $('recoverBackOn').onclick=()=>this.login($('recoverEmailOn').value.trim());
  $('recoverSubmitOn').onclick=()=>this.authAction(async()=>{
   const email=$('recoverEmailOn').value.trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Informe um e-mail válido.');
   await this.cloud.recover(email);
   this.note('Se este endereço estiver cadastrado e o envio estiver funcionando, chegará um link por e-mail. Confira também o spam.');
  });
  $('checkEmailLinkOn').onclick=()=>this.authAction(async()=>{
   const original=$('emailLinkOn').value.trim();
   if(!original)throw new Error('Cole o endereço original do e-mail.');
   const result=await this.cloud.verifyEmailLink(original);
   $('emailLinkOn').value='';
   if(result.type==='recovery'&&result.loggedIn)this.showRecoveryForm();
   else if(result.loggedIn)this.home();
   else this.login($('recoverEmailOn').value.trim(),'Link validado. Tente entrar na sua conta.');
  });
  this.authEnter(['recoverEmailOn'],'recoverSubmitOn');
 }
 async publicRooms(){this.currentPage='public';this.header('Salas públicas');
  this.app.innerHTML=`<section class="card"><h2>Partidas esperando jogadores</h2><p class="subtext">Você pode entrar numa sala com vagas ou criar a sua.</p>
  ${btn('quickOn','Entrada rápida')}${btn('reloadOn','Atualizar lista','secondary')}<div id="publicList"><p>Carregando...</p></div><p id="onlineError" class="error"></p></section>`;
  let rooms=[];try{rooms=await this.cloud.rpc('es_public_rooms');}catch(e){return this.error(e);}
  $('publicList').innerHTML=rooms.length?rooms.map((r,i)=>`<div class="member"><div class="member-info"><strong>${ESC(r.name||'Sala de '+(r.owner_name||'jogador'))}</strong><small>${r.creator_name?'Criada por: '+ESC(r.creator_name):'Anfitrião: '+ESC(r.owner_name||'jogador')}</small><small>${ESC(r.categories?.slice(0,2).join(', ')||'Categorias variadas')}</small><small>${ESC(r.difficulty)} · ${r.impostors} imp. · ${r.players}/${r.max_players} jogadores</small></div><button class="back" data-room="${i}">Entrar</button></div>`).join(''):'<p class="notice">Não há salas públicas abertas agora. Crie uma e convide seus amigos!</p>';
  this.app.querySelectorAll('[data-room]').forEach(b=>b.onclick=async()=>{try{const r=await this.cloud.rpc('es_join',{p_room:rooms[+b.dataset.room].id});this.enterRoom(r);}catch(e){this.error(e);}});
  $('quickOn').onclick=async()=>{const available=rooms.find(r=>r.players<r.max_players);if(!available)return this.note('Não existem salas com vagas. Crie uma sala.');try{this.enterRoom(await this.cloud.rpc('es_join',{p_room:available.id}));}catch(e){this.error(e);}};
  $('reloadOn').onclick=()=>this.publicRooms();
 }
 joinCode(prefill=''){this.currentPage='join';this.header('Entrar em sala');this.app.innerHTML=`<section class="card"><h2>Código da sala</h2>${input('roomCode','Código de 6 caracteres','text',prefill,'maxlength="6" autocapitalize="characters"')}${btn('enterCode','Entrar')}<p id="onlineError" class="error"></p></section>`;
  $('enterCode').onclick=async()=>{try{this.enterRoom(await this.cloud.rpc('es_join_code',{p_code:$('roomCode').value.trim()}));}catch(e){this.error(e);}};
 }
 formRules(c={}){
  const val=c.categories||CATEGORIES, max=c.max||10,imp=c.impostors||2;
  return `<div class="option-grid">${input('maxOn','Máximo de jogadores','number',max,'min="3" max="10"')}${input('impOn','Impostores','number',imp,'min="1" max="4"')}</div>
   <div class="field"><label>Dificuldade</label><select id="difficultyOn">${['Fácil','Médio','Difícil','Misturado'].map(x=>`<option ${c.difficulty===x?'selected':''}>${x}</option>`).join('')}</select></div>
   <div class="field"><label>Dicas para o impostor</label><select id="clueOn">${[['both','Categoria e dica'],['category','Só categoria'],['hint','Só dica'],['none','Nenhuma']].map(x=>`<option value="${x[0]}" ${c.clue===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select></div>
   <label class="check"><input type="checkbox" id="knowOn" ${c.know?'checked':''}> Impostores conhecem seus parceiros</label>
   <h3>Categorias</h3><div class="online-words">${CATEGORIES.map((x,i)=>`<label class="check"><input type="checkbox" data-oc="${i}" ${val.includes(x)?'checked':''}>${ESC(x)}</label>`).join('')}</div>`;
 }
 getRules(){const max=Number($('maxOn').value),imp=Number($('impOn').value),categories=[...this.app.querySelectorAll('[data-oc]:checked')].map(x=>CATEGORIES[Number(x.dataset.oc)]);
  if(max<MIN||max>MAX||imp<1||imp>Math.floor((max-1)/2)||!categories.length)throw new Error('Escolha 3 a 10 jogadores, uma quantidade válida de impostores e pelo menos uma categoria.');
  return {p_max:max,p_impostors:imp,p_categories:categories,p_difficulty:$('difficultyOn').value,p_clue:$('clueOn').value,p_know:$('knowOn').checked};}
 createRoom(){this.currentPage='create';this.header('Criar sala');
  this.app.innerHTML=`<section class="card"><h2>Preparar partida online</h2><p class="subtext">O jogo inicia com pelo menos 3 jogadores prontos. A sala fica aberta até o anfitrião começar.</p>
  ${input('roomNameOn','Nome da sala (opcional)','text','','maxlength="50" placeholder="Ex.: Resenha de Loreto"')}<p class="small muted">De 3 a 50 caracteres. Se deixar vazio, usamos “Sala de seu apelido”.</p>
  <div class="field"><label>Visibilidade</label><select id="publicOn"><option value="true">Pública — aparece na lista</option><option value="false">Privada — somente com código</option></select></div>
  ${this.formRules()}${btn('makeRoom','CRIAR SALA')}<p id="onlineError" class="error"></p></section>`;
  $('makeRoom').onclick=async()=>{try{const p=this.getRules(),name=$('roomNameOn').value.replace(/\s+/g,' ').trim();if(name&&([...name].length<3||[...name].length>50))throw new Error('Use de 3 a 50 caracteres no nome da sala.');this.enterRoom(await this.cloud.rpc('es_create_named',{p_public:$('publicOn').value==='true',p_name:name,...p}));}catch(e){this.error(e);}};
 }
 enterRoom(id){this.stopLoop();this.connectionFailures=0;this.nextRefreshAt=0;save('lastRoom',id);this.roomId=id;this.room=null;this.titleCatalog=null;this.lastFingerprint='';this.lastPhase='';this.currentPage='room';this.header('Sala online');
  this.app.innerHTML='<section class="card"><h2>Entrando na sala...</h2></section>';this.refresh();
  let lastPing=0;
  this.refreshTimer=setInterval(async()=>{
   if(!this.roomId||Date.now()<this.nextRefreshAt)return;
   try{if(Date.now()-lastPing>9000){await this.cloud.rpc('es_touch',{p_room:this.roomId});lastPing=Date.now();}
    await this.refresh();}catch(e){this.connectionFailed(e);}
  },2200);
  this.tickTimer=setInterval(()=>{const c=$('timerOnline');if(c&&this.room?.phaseEnds){const remaining=seconds(this.room.phaseEnds);const reveal=this.room.status==='discussion'&&this.room.revealEnds&&seconds(this.room.revealEnds)>0;c.textContent=countdown(reveal?this.room.revealEnds:this.room.phaseEnds);
   if(this.room.status==='discussion'&&this.showingReveal&&!reveal){this.showingReveal=false;this.renderRoom(this.room);}
   if(remaining===0&&this.room.status==='discussion'&&this.lastPhase==='discussion'&&!this.timerPlayed){this.sound('timer');this.timerPlayed=true;}
  }},300);
 }
 async refresh(){if(!this.roomId||this.refreshing)return;this.refreshing=true;
  try{const [r,catalog]=await Promise.all([this.cloud.rpc('es_room_view',{p_room:this.roomId}),this.titleCatalog?Promise.resolve(this.titleCatalog):this.cloud.rpc('es_title_catalog').catch(()=>null)]);if(!this.roomId)return;
   const titlesChanged=catalog!==this.titleCatalog;this.titleCatalog=catalog;
   this.connectionRestored();this.room=r;if(r.status==='discussion'&&seconds(r.phaseEnds)===0){await this.cloud.rpc('es_begin_vote',{p_room:this.roomId}).catch(()=>{});}
   if(r.status==='voting'){await this.cloud.rpc('es_finalize',{p_room:this.roomId}).catch(()=>{});}
   const sig=JSON.stringify(r);if(sig!==this.lastFingerprint||titlesChanged){
    // Evita apagar uma carta revelada ou um formulário enquanto o usuário interage.
    if((this.app.querySelector('.card-reveal.revealed')&&(!r.revealEnds||seconds(r.revealEnds)>0))||this.app.querySelector('.online-editing'))return;
    this.lastFingerprint=sig;this.renderRoom(r);}
   if(this.voice)this.voice.update(r.players).catch(e=>{this.voice.error=prettyError(e);});
  }catch(e){this.connectionFailed(e);}finally{this.refreshing=false;}
 }
 renderRoom(r){this.header('Sala '+r.code);const me=this.cloud.userId,owner=r.owner===me,joined=r.players.filter(x=>x.active);
  const allReady=joined.length>=3&&joined.every(p=>p.ready),validImps=r.impostors>=1&&r.impostors<=Math.floor((joined.length-1)/2);
  if(r.status!==this.lastPhase){this.timerPlayed=false;if(this.lastPhase&&r.status==='voting')this.sound('timer');if(this.lastPhase&&r.status==='results')this.sound('finish');this.lastPhase=r.status;}
  const head=`<section class="card"><div class="statusbar"><div><span class="eyebrow">${r.public?'SALA PÚBLICA':'SALA PRIVADA'}</span><div class="room-code">${ESC(r.code)}</div></div><span class="pill">${joined.length}/${r.max} jogadores</span></div>
  <h2 class="room-name">${ESC(r.name||'Sala online')}</h2>${r.creatorName?`<p class="small muted">Criada por: ${ESC(r.creatorName)}</p>`:''}
  <div class="round-overview">${pill(r.difficulty)}${pill(r.impostors+' impostor(es)')}${pill(r.categories.length+' categorias')}</div>
  <p class="subtext">${r.clue==='both'?'Impostor: categoria e dica':r.clue==='category'?'Impostor: somente categoria':r.clue==='hint'?'Impostor: somente dica':'Impostor: sem dicas'} · ${r.know?'Impostores se conhecem':'Impostores não se conhecem'}</p>
  ${btn('copyCodeOn','Copiar código da sala','secondary')}${btn('shareLinkOn','Compartilhar convite por link','secondary')}${btn('voiceOn',this.voice?.running?'Desativar microfone':'Ativar voz da sala','secondary')}
  <p id="voiceState" class="small muted">${this.voice?.running?'Microfone conectado (WebRTC)':'Áudio desligado. Toque para entrar na conversa.'}${this.voice?.error?' · '+ESC(this.voice.error):''}</p></section>`;
  const equippedTitle=code=>{const t=this.titleCatalog?.find(t=>t.code===code);if(!t)return '';const rarity=['comum','incomum','raro','lenda','mistico'].includes(t.rarity)?t.rarity:'comum';return `<div class="equipped-title title-${rarity}">${ESC(t.name)}</div>`;};
  const people=`<section class="card"><h3>Participantes</h3>${r.players.map((p,i)=>`<div class="member room-member"><div class="avatar">${avatarSrc(this.cloud,p.avatar)?`<img src="${ESC(avatarSrc(this.cloud,p.avatar))}" alt="">`:ESC(p.nick.charAt(0).toUpperCase())}</div><div class="member-info"><strong>${ESC(p.nick)} ${p.id===r.owner?'♛':''}</strong><small>${!p.active?'Saiu':p.online?'Conectado':'Sem conexão recente'}</small>${equippedTitle(p.title)}</div>${p.id!==me?`<button class="back" data-report="${ESC(p.id)}">Denunciar</button>`:''}${this.voice?.running&&p.id!==me?`<button class="back" data-mute="${ESC(p.id)}">Silenciar</button>`:''}<span class="pill ${(r.status==='voting'?p.voted:p.ready)?'good':''}">${r.status==='lobby'?(p.ready?'PRONTO':'NÃO PRONTO'):r.status==='voting'?(!p.active?'SAIU':p.voted?'JÁ VOTOU':'FALTA VOTAR'):i+1}</span></div>`).join('')}</section>`;
  let phase='';
  if(r.status==='lobby'){
   const myReady=!!r.players.find(p=>p.id===me)?.ready;
   phase=`<section class="card"><h2>Aguardando jogadores</h2><p class="subtext">O anfitrião pode alterar as regras. Qualquer alteração zera o estado “Pronto” de todos.</p>
   ${btn('readyOn',myReady?'Cancelar “Pronto”':'ESTOU PRONTO',myReady?'secondary':'ready-action')}
   ${owner?`${btn('editRules','Alterar regras','secondary')}${btn('inviteFriends','Convidar amigos','secondary')}${btn('startOn','INICIAR PARTIDA')}`:''}
   <p class="small muted">${allReady&&validImps?'Todos prontos: partida liberada.':!validImps?'Reduza o número de impostores para esta quantidade de jogadores.':'Mínimo de 3 participantes, todos prontos.'}</p></section>`;
  }else if(r.status==='discussion'){
   const revealing=!!r.revealEnds&&seconds(r.revealEnds)>0;this.showingReveal=revealing;
   const secret=r.me.impostor?'IMPOSTOR':ESC(r.me.word);
   const info=r.me.impostor?[r.me.category?'Categoria: '+r.me.category:'',r.me.category!=='Pessoas de Loreto'&&r.me.hint?'Dica: '+r.me.hint:'',r.me.partners?.length?'Parceiros: '+r.players.filter(x=>r.me.partners.includes(x.id)).map(x=>x.nick).join(', '):''].filter(Boolean).join(' · '):'Categoria: '+r.me.category;
   const first=r.players.find(p=>p.id===r.starter)?.nick||'Sorteado';
   phase=`<section class="card center"><h2>${revealing?'Veja sua carta':'Abrindo votação'}</h2><div id="timerOnline" class="countdown">${countdown(revealing?r.revealEnds:r.phaseEnds)}</div><p class="subtext">Quem começa: <b>${ESC(first)}</b>. Após os 30 segundos, a votação abre e vocês podem conversar enquanto votam.</p>
   ${revealing?`<div id="onlineSecret" class="card-reveal" tabindex="0"><div id="onlineSecretContent"><span class="secret-label">CARTA SELADA</span><p>Segure para ver sua palavra ou papel.</p></div></div>
   <p id="onlineSecretValue" data-secret="${ESC(secret)}" data-info="${ESC(info)}" hidden></p><p class="notice">Você tem 30 segundos para memorizar sua carta. Solte para ocultar.</p>`:'<p class="notice">Tempo de visualização encerrado. A votação vai começar.</p>'}</section>`;
  }else if(r.status==='voting'){
   const myVote=r.me.voted;
   phase=`<section class="card"><h2>Votação secreta</h2><p class="small muted">${joined.filter(p=>p.voted).length} de ${joined.length} jogadores já votaram.</p><p class="notice">Sem limite de tempo. A votação termina quando todos que continuam na sala votarem.</p>
    <p class="subtext">Escolha ${r.impostors} suspeito(s), sem repetir nomes. Os votos dos outros permanecem secretos.</p>
    ${myVote?'<p class="pill good">Seu voto foi registrado.</p>':`<div id="voteNames">${joined.filter(x=>x.id!==me&&x.online).map(p=>`<label class="check"><input type="checkbox" data-vote="${ESC(p.id)}">${ESC(p.nick)}</label>`).join('')}</div>${btn('submitVote','CONFIRMAR VOTO')}`}
    <p id="onlineError" class="error"></p></section>`;
  }else if(r.status==='results'){
   const impostors=r.players.filter(p=>r.me.impostors?.includes(p.id));
   const mine=(r.results||[]).find(x=>x.user===me);const totalWins=(r.results||[]).filter(x=>x.win).length;
   phase=`<section class="card center v74-reveal"><div class="eyebrow">SEGREDOS REVELADOS</div><h2>Fim da rodada</h2><div class="result-word">${ESC(r.me.word)}</div><p class="subtext">${ESC(r.me.category)}</p>
    <p class="notice">${impostors.length} impostor(es) revelado(s) · ${totalWins} vencedor(es).</p>
    ${mine?`<div class="card ${mine.win?'v74-result-good':'v74-result-bad'}"><h3>${mine.win?'VOCÊ VENCEU!':'VOCÊ PERDEU'}</h3><p>${mine.impostor?'Você foi impostor':'Você foi comum'} · ${mine.votes} voto(s) recebido(s)</p><strong>${r.public?'+'+mine.xp+' XP de partida':'Partida privada · sem XP/ranking'}</strong></div>`:''}
    <h3>Os impostores eram</h3>${impostors.map(p=>`<div class="result-name">${ESC(p.nick)}</div>`).join('')}
    <h3>Resultados individuais</h3>${(r.results||[]).map(x=>`<div class="member ${x.win?'v74-result-good':'v74-result-bad'}"><span class="member-info"><strong>${ESC(r.players.find(p=>p.id===x.user)?.nick||'Jogador')}</strong><small>${x.impostor?'Impostor':'Comum'} · ${x.votes} voto(s) recebido(s)</small></span><span class="pill ${x.win?'good':'red'}">${x.win?'VENCEU':'PERDEU'} ${r.public?`· +${x.xp} XP`:''}</span></div>`).join('')}
    <p class="small muted">Resultados revelados somente após o encerramento da votação.</p>
    ${owner?btn('newRound','NOVA RODADA'):''}</section>`;
  }
  this.currentPage='room';this.app.innerHTML=head+phase+people+btn('leaveOn','Sair da sala','ghost')+`<p id="onlineError" class="error"></p>`;
  this.app.querySelectorAll('[data-report]').forEach(b=>b.onclick=async()=>{const reason=prompt('Descreva o motivo da denúncia (mínimo de 5 caracteres):');if(!reason)return;try{await this.cloud.rpc('es_feedback_send',{p_type:'denuncia',p_body:reason,p_target:b.dataset.report});this.note('Denúncia enviada para análise do administrador.');}catch(e){this.error(e);}});
  this.app.querySelectorAll('[data-mute]').forEach(b=>b.onclick=()=>{const a=this.voice?.audio.get(b.dataset.mute);if(a){a.muted=!a.muted;b.textContent=a.muted?'Ouvir':'Silenciar';}});
  $('leaveOn').onclick=()=>{if(confirm('Quer sair da sala? Se não votar durante a partida, será derrota individual.'))this.leave();};
  $('copyCodeOn').onclick=async()=>{try{if(!navigator.clipboard?.writeText)throw new Error('Cópia automática indisponível.');await navigator.clipboard.writeText(r.code);this.note('Código da sala copiado: '+r.code);}catch(e){this.note('Copie este código e compartilhe com seu amigo: '+r.code);}};
   $('shareLinkOn').onclick=async()=>{const u=new URL(window.location.origin+window.location.pathname);u.searchParams.set('room',r.code);const link=u.toString();try{if(navigator.share)await navigator.share({title:'Entre Suspeitos',text:'Entre na minha sala',url:link});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(link);this.note('Link de convite copiado!');}else this.note('Convide pelo link: '+link);}catch(e){if(e?.name!=='AbortError')this.note('Convide pelo link: '+link);}};
   $('voiceOn').onclick=()=>this.toggleVoice();
  if(r.status==='lobby'){
   $('readyOn').onclick=async()=>this.action('es_ready',{p_room:r.id,p_ready:!r.players.find(p=>p.id===me)?.ready});
   if(owner){$('inviteFriends').onclick=()=>this.inviteFriends();$('editRules').onclick=()=>this.editRules();$('startOn').disabled=!(allReady&&validImps);$('startOn').onclick=()=>this.action('es_start',{p_room:r.id});}
  }else if(r.status==='discussion'&&this.showingReveal){
   const card=$('onlineSecret'),content=$('onlineSecretContent');const val=$('onlineSecretValue');
   const hide=()=>{card.classList.remove('revealed');content.innerHTML='<span class="secret-label">CARTA SELADA</span><p>Segure para ver sua palavra ou papel.</p>';};
   const show=e=>{e.preventDefault();if(e.pointerId!==undefined)try{card.setPointerCapture(e.pointerId);}catch{}card.classList.add('revealed');content.innerHTML=`<div class="secret-label">${r.me.impostor?'SUA IDENTIDADE':'SUA PALAVRA'}</div><div class="secret-name ${r.me.impostor?'impostor':''}">${ESC(val.dataset.secret)}</div><p class="secret-detail">${ESC(val.dataset.info)}</p>`;};
   card.addEventListener('pointerdown',show);['pointerup','pointercancel','pointerleave','lostpointercapture'].forEach(ev=>card.addEventListener(ev,hide));
   card.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key))show(e);});card.addEventListener('keyup',hide);
   document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();},{once:true});
  }else if(r.status==='voting'&&!r.me.voted){$('submitVote').onclick=async()=>{
   const targets=[...this.app.querySelectorAll('[data-vote]:checked')].map(x=>x.dataset.vote);
   if(targets.length!==r.impostors)return this.error('Escolha exatamente '+r.impostors+' suspeito(s).');
   await this.action('es_vote',{p_room:r.id,p_targets:targets});this.sound('vote');};
  }else if(r.status==='results'&&owner){$('newRound').onclick=()=>this.action('es_next',{p_room:r.id});}
 }
 async action(name,p){try{await this.cloud.rpc(name,p);this.lastFingerprint='';await this.refresh();}catch(e){this.error(e);}}
 editRules(){const r=this.room;this.stopLoop();this.header('Alterar regras');this.app.innerHTML=`<section class="card online-editing"><h2>Regras da sala</h2><p class="subtext">Depois de salvar, todos precisarão confirmar “Pronto” novamente.</p>${this.formRules(r)}${btn('saveRules','SALVAR REGRAS')}<p id="onlineError" class="error"></p></section>`;
  $('saveRules').onclick=async()=>{try{const p=this.getRules();await this.cloud.rpc('es_rules',{p_room:r.id,...p});this.enterRoom(r.id);}catch(e){this.error(e);}};}
 async leave(){const room=this.roomId;save('lastRoom',null);this.destroy();try{await this.cloud.rpc('es_leave',{p_room:room});}catch{}this.home();}
 async toggleVoice(){try{if(this.voice?.running){this.voice.close();this.voice=null;}else{
   this.voice=new Voice(this.cloud,this.roomId,this.cloud.userId);await this.voice.start(this.room?.players||[]);
  }this.lastFingerprint='';this.renderRoom(this.room);
 }catch(e){this.voice?.close();this.voice=null;this.error(e);}}

 async progressHub(){
  this.stopLoop();this.currentPage='missions';this.header('Missões e eventos');
  this.app.innerHTML='<section class="card"><h2>Missões e eventos</h2><p>Carregando...</p><p id="onlineError" class="error"></p></section>';
  try{
   const [missions,events,claims]=await Promise.all([this.cloud.rpc('es_v74_missions'),this.cloud.rpc('es_v74_events_list'),this.cloud.rpc('es_v74_claims')]);
   if(this.currentPage!=='missions')return;
   const mission=(m,i)=>{const claimed=claims.some(c=>c.code===m.code&&Date.parse(c.period_end)===Date.parse(m.renews_at));return `<div class="member"><div class="member-info"><strong>${ESC(m.title)}</strong><small>${ESC(m.period)} · ${m.progress}/${m.target} · ${claimed?'Recompensa resgatada':m.complete?'Concluída':'Em andamento'}</small><progress class="mission-progress" value="${m.progress}" max="${m.target}"></progress></div>${m.complete&&!claimed?`<button class="back" data-claim="${i}">Resgatar ${m.code.startsWith('daily')?15:40} XP</button>`:''}</div>`;};
   const event=e=>`<section class="card"><h3>${ESC(e.name)}</h3><p class="subtext">${ESC(e.description)}</p><p>${e.active?'Ativo':'Encerrado ou futuro'} · ${Math.min(e.progress,e.target)}/${e.target}</p><progress class="mission-progress" value="${Math.min(e.progress,e.target)}" max="${e.target}"></progress><p class="small muted">Até ${new Date(e.ends_at).toLocaleDateString('pt-BR')} · Moldura: ${ESC(e.reward_frame||'nenhuma')}</p></section>`;
   this.app.innerHTML=`<section class="card"><h2>Missões diárias e semanais</h2><p class="subtext">Desafios calculados no servidor. Reinício em UTC. Não alteram o ranking.</p>${missions.map(mission).join('')||'<p>Sem missões.</p>'}</section><section class="card"><h2>Eventos temporários</h2></section>${events.map(event).join('')||'<p class="notice">Nenhum evento ativo.</p>'}<p class="small muted">XP de missões soma ao nível, sem alterar o ranking. Molduras de eventos são desbloqueadas por participação.</p><p id="onlineError" class="error"></p><p id="onlineInfo" class="subtext"></p>`;
   this.app.querySelectorAll('[data-claim]').forEach(b=>b.onclick=async()=>{const m=missions[Number(b.dataset.claim)];b.disabled=true;try{const result=await this.cloud.rpc('es_v74_mission_claim',{p_code:m.code});this.note('Recompensa recebida: '+result.xp_awarded+' XP.');await this.progressHub();}catch(e){this.error(e);b.disabled=false;}});
  }catch(e){this.error(e);}
 }
 async statsPage(){
  this.stopLoop();this.currentPage='stats';this.header('Estatísticas avançadas');
  this.app.innerHTML='<section class="card"><h2>Estatísticas</h2><p>Carregando...</p><p id="onlineError" class="error"></p></section>';
  try{
   const d=await this.cloud.rpc('es_v74_stats');if(this.currentPage!=='stats')return;
   const stat=(v,label)=>`<div class="v74-stat"><strong>${v}</strong><small>${label}</small></div>`;
   const rate=(n,d)=>d?(100*n/d).toFixed(1)+'%':'—';
   this.app.innerHTML=`<section class="card"><h2>Seu histórico</h2><div class="v74-stats-grid">${stat(d.games,'Partidas concluídas')}${stat(rate(d.wins,d.games),'Taxa de vitórias')}${stat(d.public_games,'Públicas')}${stat(d.private_games,'Privadas')}${stat(rate(d.impostor_wins,d.impostor_games),'Vitórias impostor')}${stat(rate(d.common_wins,d.common_games),'Vitórias comum')}${stat(d.correct_votes,'Acertos nos votos')}${stat(d.votes_received,'Votos recebidos')}</div></section><section class="card"><h3>Últimas partidas</h3>${(d.recent||[]).map(x=>`<div class="member"><div class="member-info"><strong>${x.win?'Vitória':'Derrota'} · ${x.is_impostor?'Impostor':'Comum'}</strong><small>${x.is_public?'Pública':'Privada'} · ${new Date(x.finished_at).toLocaleString('pt-BR')} · ${x.votes_received} votos</small></div><span class="pill">${x.is_public?'+'+x.xp_earned+' XP':'Privada'}</span></div>`).join('')||'<p>Sem partidas concluídas.</p>'}</section>`;
  }catch(e){this.error(e);}
 }
 async profile(){this.currentPage='profile';this.header('Meu perfil');let p,titles=[],frames=[];try{[p,titles,frames]=await Promise.all([this.cloud.rpc('es_me'),this.cloud.rpc('es_my_titles'),this.cloud.rpc('es_v74_frames')]);}catch(e){return this.error(e);}
  const progress=xpProgress(p.xp);
  this.app.innerHTML=`<section class="card"><h2>Meu perfil</h2>
   <div class="profile-heading"><div class="avatar profile-avatar v74-frame ${['bronze','ouro','nevoa'].includes(p.equipped_frame)?p.equipped_frame:'classica'}">${avatarSrc(this.cloud,p.avatar_url)?`<img src="${ESC(avatarSrc(this.cloud,p.avatar_url))}" alt="Minha foto de perfil">`:ESC((p.nickname||'?').charAt(0).toUpperCase())}</div><div><b>${ESC(p.nickname)}</b><p class="subtext">Sua identidade no Entre Suspeitos.</p></div></div>
   <section class="level-panel" aria-label="Seu nível e experiência"><div class="level-summary"><strong>Nível ${progress.level}</strong><span>${progress.xp.toLocaleString('pt-BR')} XP acumulado</span></div>
   <progress class="xp-progress" value="${progress.earned}" max="${progress.needed}" aria-label="Progresso até o nível ${progress.level+1}"></progress>
   <p>${progress.earned.toLocaleString('pt-BR')} / ${progress.needed.toLocaleString('pt-BR')} XP neste nível · ${progress.percent}%</p>
   <p>Faltam <b>${progress.remaining.toLocaleString('pt-BR')} XP</b> para o nível ${progress.level+1}.</p>
   <small>XP não é gasto: acumula em partidas públicas, aumenta seu nível e libera títulos. Não define sua posição no ranking.</small></section>
   <div class="field"><label for="photoOn">Foto de perfil (opcional, até 1 MB)</label><input type="file" id="photoOn" accept="image/*"></div>${btn('uploadPhoto','Salvar foto de perfil','secondary')}
   ${input('nicknameOn','Apelido','text',p.nickname,'maxlength="28"')}${btn('saveNick','Salvar apelido')}
   <div class="divider"></div><div class="option-grid"><p><b>${p.xp}</b><br>XP público</p><p><b>${p.ranking_points}</b><br>Pontos de ranking</p>
   <p><b>${p.online_wins} / ${p.online_losses}</b><br>Vitórias / derrotas públicas</p>
   <p><b>${p.private_wins} / ${p.private_losses}</b><br>Vitórias / derrotas privadas</p>
   <p><b>${p.impostor_wins} / ${p.impostor_losses}</b><br>Impostor: vitórias / derrotas</p>
   <p><b>${p.common_wins} / ${p.common_losses}</b><br>Comum: vitórias / derrotas</p></div>
   <div class="divider"></div><h3>Molduras do perfil</h3><p class="subtext">Desbloqueadas por vitórias públicas ou eventos; sem vantagens competitivas.</p>
    ${frames.map((x,i)=>`<div class="v74-frame-choice"><span class="v74-frame ${ESC(x.code)}">${ESC(x.name)}</span><button type="button" class="back" data-frame="${i}" ${!x.unlocked||x.equipped?'disabled':''}>${x.equipped?'Equipada':x.unlocked?'Equipar':'Bloqueada'}</button></div>`).join('')}
    ${btn('viewStatsProfile','Ver estatísticas avançadas','secondary')}
    <div class="divider"></div><h3>Meus títulos</h3>
   <p class="subtext">Ganhe títulos em partidas públicas. Selecione um para destacar no seu perfil.</p>
   <div class="title-list">${titles.map((t,i)=>`<div class="member"><div class="member-info"><strong class="title-${ESC(t.rarity)}">${ESC(t.name)}</strong><small>${ESC(t.description)} · ${ESC(t.rarity)}</small></div><button type="button" class="back" data-equip="${i}" ${t.equipped?'disabled':''}>${t.equipped?'Equipado':'Usar'}</button></div>`).join('')||'<p class="notice">Ainda sem títulos. Continue jogando partidas públicas!</p>'}</div>
   <p class="notice">Títulos Místicos permanecem ocultos até a conquista e sujeitos às regras de exclusividade.</p><p id="onlineError" class="error"></p></section>`;
   this.app.querySelectorAll('[data-frame]').forEach(b=>b.onclick=async()=>{try{await this.cloud.rpc('es_v74_equip_frame',{p_frame:frames[+b.dataset.frame].code});this.profile();}catch(e){this.error(e);}});
   $('viewStatsProfile').onclick=()=>this.statsPage();
   this.app.querySelectorAll('[data-equip]').forEach(b=>b.onclick=async()=>{try{await this.cloud.rpc('es_equip_title',{p_title:titles[+b.dataset.equip].code});this.profile();}catch(e){this.error(e);}});
  $('uploadPhoto').onclick=async()=>{try{
    const file=$('photoOn').files?.[0];if(!file)throw new Error('Escolha uma imagem primeiro.');
    if(!file.type.startsWith('image/'))throw new Error('Escolha uma foto válida.');
    if(file.size>8000000)throw new Error('Imagem original muito grande. Use uma de até 8 MB.');
    const bitmap=await createImageBitmap(file);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=480;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#16131d';ctx.fillRect(0,0,480,480);
    const size=Math.min(bitmap.width,bitmap.height),sx=(bitmap.width-size)/2,sy=(bitmap.height-size)/2;
    ctx.drawImage(bitmap,sx,sy,size,size,0,0,480,480);bitmap.close?.();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
    if(!blob)throw new Error('Não foi possível preparar a foto.');
    await this.cloud.uploadAvatar(blob);this.profile();
  }catch(e){this.error(e);}};
  $('saveNick').onclick=async()=>{try{await this.cloud.rpc('es_set_nickname',{p_nick:$('nicknameOn').value});this.profile();}catch(e){this.error(e);}};
 }
 async ranking(){this.currentPage='ranking';this.header('Ranking público');let rank,catalog;try{[rank,catalog]=await Promise.all([this.cloud.rpc('es_leaderboard'),this.cloud.rpc('es_title_catalog')]);}catch(e){return this.error(e);}
  const ranked=rankedPlayers(rank);
  const medals={1:['🥇','Ouro'],2:['🥈','Prata'],3:['🥉','Bronze']};
  const podium=ranked.filter(p=>p.position<=3);
  this.app.innerHTML=`<section class="card"><h2>Ranking público</h2>
   <p class="subtext">Vitória: <b>+25 pontos</b> · Derrota: <b>−25 pontos</b>. Partidas privadas não alteram o ranking. O saldo pode ficar negativo.</p>
   <p class="small muted">Ordem por pontos de ranking; desempate por vitórias públicas. Empate nos dois critérios mantém a mesma posição.</p>
   ${podium.length?`<div class="ranking-podium" aria-label="Pódio atual">${podium.map(p=>`<article class="podium-card podium-${p.position}"><span class="podium-medal" aria-hidden="true">${medals[p.position][0]}</span><small>${p.position}º LUGAR · ${medals[p.position][1]}</small><strong>${ESC(p.nickname)}</strong><b>${p.ranking_points} pontos</b></article>`).join('')}</div><p class="small muted">Medalhas de destaque enquanto o jogador ocupar o pódio. Não concedem XP nem títulos permanentes.</p>`:''}
   <h3>Classificação · até 50 jogadores</h3>
   ${ranked.map(p=>{const title=catalog?.find(t=>t.code===p.equipped_title);return `<div class="member rank-member"><span class="rank-position">${p.position}º</span><div class="avatar">${avatarSrc(this.cloud,p.avatar_url)?`<img src="${ESC(avatarSrc(this.cloud,p.avatar_url))}" alt="">`:ESC((p.nickname||'?').charAt(0))}</div><div class="member-info"><strong>${ESC(p.nickname)}</strong><small>Nível ${xpProgress(p.xp).level} · ${p.online_wins} vitórias</small><small>${p.xp} XP acumulado</small>${title?`<small class="equipped-title title-${ESC(title.rarity)}">${ESC(title.name)}</small>`:''}</div><b class="rank-score">${p.ranking_points}<small>pontos</small></b></div>`;}).join('')||'<p>Sem resultados ainda.</p>'}</section>`;}

 async friends(){this.currentPage='friends';this.header('Amigos');let all=[];try{all=await this.cloud.rpc('es_friend_list');}catch(e){return this.error(e);}
  this.app.innerHTML=`<section class="card"><h2>Adicionar amigos</h2>${input('searchNick','Pesquisar apelido','text','','placeholder="Apelido do jogador"')}${btn('searchFriends','Pesquisar','secondary')}<div id="searchFriendsResult"></div><h3>Minha lista</h3>
   ${all.map((p,i)=>`<div class="member"><div class="member-info"><strong>${ESC(p.nickname)}</strong><small>${p.accepted?'Amigo':'Pedido pendente'}</small></div>${!p.accepted&&p.incoming?`<button class="back" data-accept="${i}">Aceitar</button>`:''}</div>`).join('')||'<p>Você ainda não adicionou amigos.</p>'}
   <p class="subtext">Convites diretos já estão disponíveis pelo botão Convidar amigos na sala. Para entrar por código, use Entrar com código.</p><p id="onlineError" class="error"></p></section>`;
  this.app.querySelectorAll('[data-accept]').forEach(b=>b.onclick=async()=>{try{await this.cloud.rpc('es_friend_accept',{p_from:all[+b.dataset.accept].id});this.friends();}catch(e){this.error(e);}});
  $('searchFriends').onclick=async()=>{try{const r=await this.cloud.rpc('es_find_players',{p_query:$('searchNick').value});
   $('searchFriendsResult').innerHTML=r.map((p,i)=>`<div class="member"><div class="member-info">${ESC(p.nickname)}</div><button class="back" data-add="${i}">Adicionar</button></div>`).join('')||'<p>Ninguém encontrado.</p>';
   this.app.querySelectorAll('[data-add]').forEach(b=>b.onclick=async()=>{try{await this.cloud.rpc('es_friend_send',{p_to:r[+b.dataset.add].id});this.friends();}catch(e){this.error(e);}});
  }catch(e){this.error(e);}};
 }

 async invites(){this.currentPage='invites';this.header('Convites de amigos');let list=[];try{list=await this.cloud.rpc('es_invite_list');}catch(e){return this.error(e);}
  this.app.innerHTML=`<section class="card"><h2>Convites recebidos</h2>${list.map((v,i)=>`<div class="member"><div class="member-info"><strong>${ESC(v.from_nick)}</strong><small>Sala ${ESC(v.code)} · ${v.is_public?'Pública':'Privada'}</small></div><button class="back" data-invite="${i}">Entrar</button></div>`).join('')||'<p>Nenhum convite pendente.</p>'}<p id="onlineError" class="error"></p></section>`;
  this.app.querySelectorAll('[data-invite]').forEach(b=>b.onclick=async()=>{try{this.enterRoom(await this.cloud.rpc('es_invite_accept',{p_invite:list[+b.dataset.invite].id}));}catch(e){this.error(e);}});
 }
 async inviteFriends(){const room=this.roomId;this.stopLoop();this.header('Convidar amigos');let all=[];try{all=await this.cloud.rpc('es_friend_list');}catch(e){return this.error(e);}
  const friends=all.filter(x=>x.accepted);this.app.innerHTML=`<section class="card"><h2>Convites diretos</h2><p class="subtext">Seus amigos receberão o convite na área Convites de amigos.</p>
  ${friends.map((p,i)=>`<div class="member"><div class="member-info">${ESC(p.nickname)}</div><button class="back" data-send="${i}">Convidar</button></div>`).join('')||'<p>Você ainda não tem amigos adicionados.</p>'}
  ${btn('backRoom','Voltar para sala','secondary')}<p id="onlineError" class="error"></p><p id="onlineInfo" class="subtext"></p></section>`;
  this.app.querySelectorAll('[data-send]').forEach(b=>b.onclick=async()=>{try{await this.cloud.rpc('es_invite_send',{p_room:room,p_to:friends[+b.dataset.send].id});this.note('Convite enviado!');}catch(e){this.error(e);}});
  $('backRoom').onclick=()=>this.enterRoom(room);
 }
 feedback(){this.currentPage='feedback';this.header('Ajuda e sugestões');
  this.app.innerHTML=`<section class="card"><h2>Ajude a melhorar o jogo</h2><div class="field"><label>Tipo de mensagem</label><select id="feedbackType">
   <option value="categoria">Sugerir categoria</option><option value="palavra">Sugerir palavra</option><option value="reclamacao">Reclamação</option><option value="denuncia">Denúncia</option></select></div>
   <div class="field"><label>Detalhes</label><textarea id="feedbackBody" rows="5" maxlength="1500" placeholder="Descreva sua sugestão ou denúncia..."></textarea></div>
   ${btn('feedbackSend','Enviar ao administrador')}<p id="onlineError" class="error"></p><p id="onlineInfo" class="subtext"></p></section>`;
  $('feedbackSend').onclick=async()=>{try{await this.cloud.rpc('es_feedback_send',{p_type:$('feedbackType').value,p_body:$('feedbackBody').value,p_target:null});
   $('feedbackBody').value='';this.note('Mensagem recebida. Obrigado!');}catch(e){this.error(e);}};
 }
 async admin(){this.currentPage='admin';this.header('Administração');let data;try{data=await this.cloud.rpc('es_admin_dashboard');}catch(e){
   this.app.innerHTML='<section class="card"><h2>Área administrativa</h2><p>Somente o administrador principal pode acessar este painel.</p></section>';return;}
  this.app.innerHTML=`<section class="card"><h2>Painel administrativo</h2><div class="option-grid"><p><b>${data.contas}</b><br>Contas</p><p><b>${data.jogadoresOnline}</b><br>Jogadores online</p>
   <p><b>${data.salas}</b><br>Salas abertas</p><p><b>${data.partidas}</b><br>Partidas realizadas</p></div>
   <p><b>${data.pendencias}</b> solicitações pendentes</p>${btn('seedWords','Publicar as 1.322 palavras no servidor','secondary')}
   <p class="notice">A publicação envia o banco já existente, sem exibir previamente as palavras.</p><p id="onlineError" class="error"></p><p id="onlineInfo" class="subtext"></p></section>
   <section class="card"><h3>Solicitações e denúncias</h3>${(data.solicitacoes||[]).map((x,i)=>`<div class="member"><div class="member-info"><strong>${ESC(x.type)} — ${ESC(x.status)}</strong><small>${ESC(x.body)}</small></div><button class="back" data-resolve="${i}">Resolver</button>${x.reported_user?`<button class="back" data-suspend="${i}">Suspender</button>`:''}</div>`).join('')||'<p>Não há solicitações.</p>'}</section>`;
  $('seedWords').onclick=async()=>{try{const all=Object.entries(this.bank).flatMap(([category,items])=>items.map(w=>({category,word:w.w,hint:w.h,difficulty:w.d})));
   let total=0;for(let i=0;i<all.length;i+=100){total+=await this.cloud.rpc('es_admin_seed',{p_entries:all.slice(i,i+100)});this.note(`Enviadas ${Math.min(i+100,all.length)} de ${all.length} palavras...`);}
   this.note(`Banco publicado no servidor: ${total} palavras processadas.`);
  }catch(e){this.error(e);}};
  this.app.querySelectorAll('[data-suspend]').forEach(b=>b.onclick=async()=>{const x=data.solicitacoes[+b.dataset.suspend];if(!confirm('Suspender este usuário por 7 dias após análise da denúncia?'))return;try{await this.cloud.rpc('es_admin_sanction',{p_target:x.reported_user,p_days:7,p_reason:x.body});this.note('Suspensão aplicada por 7 dias.');}catch(e){this.error(e);}});
  this.app.querySelectorAll('[data-resolve]').forEach(b=>b.onclick=async()=>{try{await this.cloud.rpc('es_admin_resolve',{p_id:data.solicitacoes[+b.dataset.resolve].id,p_status:'resolvido'});this.admin();}catch(e){this.error(e);}});
 }
}
const online=new OnlineUI();window.ESOnline={open:args=>online.open(args)};
})();
