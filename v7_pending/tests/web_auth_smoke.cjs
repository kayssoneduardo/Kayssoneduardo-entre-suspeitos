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
const {Cloud,prettyError}=window.__ES_TEST__;
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
  console.log('PASSOU: limitações de e-mail, cadastro, recuperação, callback e bloqueio de cliques duplicados.');
})().catch(e=>{console.error(e);process.exit(1);});
