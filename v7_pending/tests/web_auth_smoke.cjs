const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('web/online.js','utf8')
  .replace('const online=new OnlineUI();window.ESOnline={open:args=>online.open(args)};',
  'window.__ES_TEST__={Cloud,OnlineUI,prettyError,xpProgress,rankedPlayers};');
const saved=new Map();
const localStorage={
 getItem:k=>saved.has(k)?saved.get(k):null,
 setItem:(k,v)=>saved.set(k,v),
 removeItem:k=>saved.delete(k),
};
let cleared=false;
const window={
 ES_SERVER_CONFIG:{url:'https://lvnhwfctursuduboovub.supabase.co',key:'public_test'},
 ES_WORD_BANK:{},
 location:{
  origin:'https://kayssoneduardo.github.io',
  pathname:'/Kayssoneduardo-entre-suspeitos/',
  hash:'',
 },
 history:{replaceState:()=>{cleared=true;}},
};
const context={window,localStorage,URL,URLSearchParams,Date,Math,Number,String,Map,Set,Error,JSON,console};
vm.runInNewContext(source,context,{filename:'online.js'});
const {Cloud,OnlineUI,prettyError,xpProgress,rankedPlayers}=window.__ES_TEST__;
for(const [xp,level,remaining] of [[0,1,100],[99,1,1],[100,2,300],[399,2,1],[400,3,500],[900,4,700],[1600,5,900]]){const p=xpProgress(xp);assert.equal(p.level,level);assert.equal(p.remaining,remaining);assert(p.percent>=0&&p.percent<100);}
assert.equal(xpProgress(-1).level,1);
const tied=rankedPlayers([{ranking_points:25,online_wins:2},{ranking_points:50,online_wins:3},{ranking_points:50,online_wins:3},{ranking_points:-25,online_wins:1}]);
assert.equal(tied.map(p=>p.position).join(','),'1,1,3,4');
console.log('PASSOU: limites de nível, progresso de XP, ordem e empates no ranking.');
(async()=>{
  const rate=Error('email rate limit exceeded');
  rate.code='over_email_send_rate_limit';rate.status=429;
  assert.match(prettyError(rate),/limite de envio de e-mails/);
  const invalid=Error('Invalid login credentials');invalid.code='invalid_credentials';
  assert.match(prettyError(invalid),/E-mail ou senha incorretos/);

  const cloud=new Cloud('https://lvnhwfctursuduboovub.supabase.co','public_test');
  let calls=[];
  cloud.request=async(...args)=>{
   calls.push(args);
   if(args[0]==='/auth/v1/user')return {id:'sample-user'};
   return {};
  };
  await cloud.signUp('teste@example.com','seguro123','JogadorTeste');
  await cloud.recover('teste@example.com');
  assert.match(calls[0][0],/signup\?redirect_to=/);
  assert.match(calls[1][0],/recover\?redirect_to=/);
  assert.match(decodeURIComponent(calls[0][0]),/kayssoneduardo.github.io\/Kayssoneduardo-entre-suspeitos\//);

  window.location.hash='#access_token=token-fake&refresh_token=refresh-fake&type=signup&expires_in=3600';
  assert.equal(await cloud.completeFromUrl(),'confirmed');
  assert.equal(cloud.userId,'sample-user');
  assert.equal(cleared,true);

  window.location.hash='#access_token=token-recovery&refresh_token=refresh-recovery&type=recovery&expires_in=3600';
  assert.equal(await cloud.completeFromUrl(),'recovery');

  assert.match(source,/if\(this\.authBusy\)return;/);
  assert.match(source,/showRecoveryForm\(\)/);
  assert.match(source,/checkEmailLinkOn/);

  // Teste do fluxo visual sem navegador real: telas e retornos separados.
  const elements=new Map();
  const addIds=html=>{
   for(const m of html.matchAll(/id="([^"]+)"[^>]*>/g)){
    if(!elements.has(m[1]))elements.set(m[1],{value:'',disabled:false,isConnected:true,
      addEventListener:()=>{},click(){return this.onclick?.();}});
    const el=elements.get(m[1]);
    const value=/value="([^"]*)"/.exec(m[0]);el.value=value?value[1]:'';
   }
  };
  const app={html:'',set innerHTML(v){this.html=v;addIds(v);},get innerHTML(){return this.html;},appendChild:()=>{}};
  const topbar={hidden:false,set innerHTML(v){addIds(v);}};
  context.document={getElementById:id=>elements.get(id)||null};
  const ui=new OnlineUI();ui.app=app;ui.topbar=topbar;
  const signupCalls=[];
  ui.cloud={
   signUp:async(...a)=>{signupCalls.push(a);return {};},
   recover:async()=>{},
   signIn:async()=>{},
   setSession:()=>{}
  };
  ui.login();
  assert.equal(ui.currentPage,'login');
  assert.match(app.html,/Entrar na conta/);
  assert.doesNotMatch(app.html,/Apelido público|Confirmar senha/);
  elements.get('signupOn').onclick();
  assert.equal(ui.currentPage,'signup');
  assert.match(app.html,/Apelido público/);
  assert.match(app.html,/Confirmar senha/);
  assert.doesNotMatch(app.html,/id="loginOn"/);
  elements.get('signupNickOn').value='JogadorNovo';
  elements.get('signupEmailOn').value='novo@example.com';
  elements.get('signupPassOn').value='senhaSegura123';
  elements.get('signupConfirmOn').value='senhaSegura123';
  await elements.get('signupSubmitOn').onclick();
  assert.equal(signupCalls.length,1);
  assert.equal(ui.currentPage,'login');
  assert.match(app.html,/Verifique seu e-mail/);
  assert.match(app.html,/value="novo@example.com"/);
  elements.get('recoverOn').onclick();
  assert.equal(ui.currentPage,'recover');
  assert.match(app.html,/Esqueceu sua senha/);
  assert.match(app.html,/id="checkEmailLinkOn"/);
  assert.doesNotMatch(app.html,/id="signupSubmitOn"/);
  elements.get('recoverBackOn').onclick();
  assert.equal(ui.currentPage,'login');
  // Regression: render the host lobby and exercise its actual start handler.
  app.querySelectorAll=()=>[];
  ui.cloud.userId='host';
  const room={id:'test-room',code:'ABC123',owner:'host',status:'lobby',max:5,
   impostors:1,categories:['Animais'],difficulty:'Fácil',clue:'both',know:false,
   players:['host','guest1','guest2'].map(id=>({id,nick:id,active:true,online:true,ready:true}))};
  let started;
  ui.action=(name,args)=>{started={name,args};};
  ui.renderRoom(room);
  assert.equal(elements.get('startOn').disabled,false);
  elements.get('startOn').onclick();
  assert.equal(started.name,'es_start');assert.equal(started.args.p_room,room.id);
  room.players[1].ready=false;ui.renderRoom(room);
  assert.equal(elements.get('startOn').disabled,true);
  room.players[1].ready=true;room.impostors=2;ui.renderRoom(room);
  assert.equal(elements.get('startOn').disabled,true);
  room.impostors=1;room.players.pop();ui.renderRoom(room);
  assert.equal(elements.get('startOn').disabled,true);
  ui.titleCatalog=[{code:'test-title',name:'Mestre & <Sombras>',rarity:'lenda'}];
  room.players[0].title='test-title';ui.renderRoom(room);
  assert.match(app.html,/equipped-title title-lenda/);
  assert.match(app.html,/Mestre &amp; &lt;Sombras&gt;/);
  assert.doesNotMatch(app.html,/Título equipado/);
  context.document.addEventListener=()=>{};ui.sound=()=>{};
  room.status='discussion';room.me={impostor:false,word:'Gato',category:'Animais'};
  room.phaseEnds=new Date(Date.now()+30000).toISOString();
  room.revealEnds=new Date(Date.now()+30000).toISOString();
  ui.renderRoom(room);assert.match(app.html,/id="onlineSecret"/);
  room.revealEnds=new Date(Date.now()-1000).toISOString();
  ui.renderRoom(room);assert.doesNotMatch(app.html,/id="onlineSecret"/);
  assert.match(app.html,/Tempo de visualização encerrado/);
  assert.doesNotMatch(app.html,/Discussão por voz|Conversem antes da votação/);
  room.status='voting';room.phaseEnds=null;room.me={voted:false};
  ui.renderRoom(room);assert.doesNotMatch(app.html,/id="timerOnline"/);
  assert.match(app.html,/Sem limite de tempo/);
  room.players[0].voted=true;room.players[1].voted=false;ui.renderRoom(room);
  assert.match(app.html,/JÁ VOTOU/);assert.match(app.html,/FALTA VOTAR/);
  assert.match(app.html,/1 de 2 jogadores já votaram/);
  ui.cloud.rpc=async name=>name==='es_me'?{nickname:'Teste',xp:400,ranking_points:-25}:name==='es_leaderboard'?[{nickname:'Teste',xp:400,ranking_points:-25,online_wins:2}]:[];
  await ui.profile();assert.match(app.html,/Nível 3/);assert.match(app.html,/500 XP/);assert.match(app.html,/<progress/);
  await ui.ranking();assert.match(app.html,/1º LUGAR/);assert.match(app.html,/−25 pontos/);assert.match(app.html,/Nível 3/);
  ui.stopLoop=()=>{};ui.pendingDestination='profile';
  let profileOpened=false;ui.profile=()=>{profileOpened=true;};
  ui.home();assert.equal(profileOpened,true);assert.equal(ui.pendingDestination,null);
  for(const destination of ['ranking','friends']){let opened=false;ui[destination]=()=>{opened=true;};ui.pendingDestination=destination;ui.home();assert.equal(opened,true);assert.equal(ui.pendingDestination,null);}
  console.log('PASSOU: atalhos diretos para perfil, ranking e amigos.');
  console.log('PASSOU: carta por 30 segundos e votação sem cronômetro.');
  console.log('PASSOU: início de sala com 3 prontos; bloqueio sem quórum, sem pronto e com impostores excessivos.');

  console.log('PASSOU: telas independentes, cadastro concluído redireciona ao login e recuperação retorna ao login.');

  console.log('PASSOU: limitações de e-mail, cadastro, recuperação, callback e bloqueio de cliques duplicados.');
})().catch(e=>{console.error(e);process.exit(1);});
