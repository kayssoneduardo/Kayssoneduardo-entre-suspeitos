const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('web/online.js','utf8')
  .replace('const online=new OnlineUI();window.ESOnline={open:args=>online.open(args)};',
  'window.__ES_TEST__={Cloud,OnlineUI,prettyError};');
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
const {Cloud,OnlineUI,prettyError}=window.__ES_TEST__;
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
  context.document.addEventListener=()=>{};ui.sound=()=>{};
  room.status='discussion';room.me={impostor:false,word:'Gato',category:'Animais'};
  room.phaseEnds=new Date(Date.now()+210000).toISOString();
  room.revealEnds=new Date(Date.now()+30000).toISOString();
  ui.renderRoom(room);assert.match(app.html,/id="onlineSecret"/);
  room.revealEnds=new Date(Date.now()-1000).toISOString();
  ui.renderRoom(room);assert.doesNotMatch(app.html,/id="onlineSecret"/);
  assert.match(app.html,/Tempo de visualização encerrado/);
  room.status='voting';room.phaseEnds=null;room.me={voted:false};
  ui.renderRoom(room);assert.doesNotMatch(app.html,/id="timerOnline"/);
  assert.match(app.html,/Sem limite de tempo/);
  console.log('PASSOU: carta por 30 segundos e votação sem cronômetro.');
  console.log('PASSOU: início de sala com 3 prontos; bloqueio sem quórum, sem pronto e com impostores excessivos.');

  console.log('PASSOU: telas independentes, cadastro concluído redireciona ao login e recuperação retorna ao login.');

  console.log('PASSOU: limitações de e-mail, cadastro, recuperação, callback e bloqueio de cliques duplicados.');
})().catch(e=>{console.error(e);process.exit(1);});
