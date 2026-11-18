'use strict';
/* Browser-level mobile viewport smoke test, with installed Chromium/Chrome and no outside packages.
 * Verifies real CSS/DOM, motion accessibility, and no horizontal overflow. No production login.
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../web');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png'};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function browserExecutable(){
 const bins=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
 return bins.find(x=>x&&fs.existsSync(x));
}
function serve(){
 const server=http.createServer((req,res)=>{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const resolved=path.resolve(root,'.'+p,(p==='/'?'index.html':''));
  if(!resolved.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(resolved,(err,body)=>{
   if(err){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':mime[path.extname(resolved)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  });
 });
 return server;
}
async function main(){
 const exe=browserExecutable();assert(exe,'Chrome/Chromium needed for mobile-browser smoke test');
 const server=serve();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/index.html';
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'es77-chrome-'));
 let chrome,ws;
 try{
  chrome=spawn(exe,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check',
   '--remote-debugging-port=0','--user-data-dir='+dir,url],{stdio:'ignore'});
  const active=path.join(dir,'DevToolsActivePort');
  for(let n=0;n<100&&!fs.existsSync(active);n++)await delay(100);
  assert(fs.existsSync(active),'Chrome DevTools did not start');
  const debugPort=Number(fs.readFileSync(active,'utf8').split('\n')[0]);
  let pages=[];
  for(let n=0;n<30;n++){
   pages=await fetch('http://127.0.0.1:'+debugPort+'/json/list').then(r=>r.json()).catch(()=>[]);
   if(pages.some(p=>p.type==='page'))break;
   await delay(120);
  }
  const target=pages.find(p=>p.type==='page');assert(target,'No page target');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  const pending=new Map();let next=0;
  ws.addEventListener('message',event=>{
   const message=JSON.parse(event.data);
   if(message.id&&pending.has(message.id)){const cb=pending.get(message.id);pending.delete(message.id);message.error?cb.reject(Error(message.error.message)):cb.resolve(message.result);}
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{
   const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(data.exceptionDetails)throw Error('Browser exception: '+data.exceptionDetails.text);
   return data.result.value;
  };
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:780,deviceScaleFactor:1,mobile:true});
  await send('Page.enable');
  await send('Page.navigate',{url});
  let ready=false;
  for(let n=0;n<40&&!ready;n++){
   await delay(100);
   ready=await evaluate("document.readyState==='complete'&&!!window.ESV77").catch(()=>false);
  }
  assert(ready,'V7.7 must load in a real browser');
  const initial=await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,version:document.body.textContent.includes("8.4.0")})');
  assert(initial.version,'RC must be visible in the page');
  assert(initial.scrollWidth<=initial.width+5,'Initial page must not scroll sideways at 360px');
  const mobile=await evaluate(`(function(){
   const root=document.getElementById('app');
   root.innerHTML='<section class="card es77-lobby"><h2>Aguardando jogadores</h2>'+
    window.ESV77.readySummary([{active:true,ready:true},{active:true,ready:false},{active:true,ready:true}])+'</section>'+
    '<section class="card es77-voting"><div class="es77-vote-eyebrow">DECISÃO FINAL</div><h2>Votação secreta</h2>'+
    '<label class="check es77-vote-choice"><input type="checkbox" id="voteFixture">'+
    '<span class="es77-vote-avatar">Z</span><strong>Zero</strong><span class="es77-vote-mark">◈</span></label></section>'+
    window.ESV77.seasonPanel({starts_at:'2026-10-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',
    players:[{nickname:'Zero',position:1,points:25,wins:1,games:1}]},[]);
   document.getElementById('voteFixture').checked=true;
   window.ESV77.sealedVote();
   const vote=document.querySelector('.es77-vote-choice');
   return {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
    border:getComputedStyle(vote).borderTopColor,
    seal:!!document.querySelector('.es77-vote-seal'),ready:!!document.querySelector('.es77-ready-summary'),
    seasons:!!document.querySelector('.es77-season-card')};
  })()`);
  assert(mobile.scrollWidth<=mobile.viewport+5,'V7.7 game panels must fit 360px');
  assert(mobile.seal&&mobile.ready&&mobile.seasons,'Cinematic vote, readiness and seasons must render');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await evaluate(`(function(){
   const item=document.createElement('aside');item.className='es77-achievement es77-achievement-lenda';document.body.appendChild(item);
   return item?getComputedStyle(item).animationDuration:null;
  })()`);
  assert(reduced==='0s','Reduced-motion preference must disable legendary achievement motion');
  // Real Android-sized Chrome interaction with the playable front-arena demo.
  await send('Page.navigate',{url:url.replace('index.html','arena-demo.html')});
  let arenaLoaded=false;
  for(let n=0;n<45&&!arenaLoaded;n++){
    await delay(120);
    arenaLoaded=await evaluate("document.readyState==='complete'&&!!window.ESJudgmentArena&&!!document.getElementById('demoConfirm')").catch(()=>false);
  }
  assert(arenaLoaded,'Front arena demo must load in real Chromium');
  const arenaSelection=await evaluate("(function(){const items=[...document.querySelectorAll('[data-vote]')];items[0].click();items[1].click();return {inputs:items.length,enabled:!document.getElementById('demoConfirm').disabled,selected:document.querySelectorAll('[data-vote]:checked').length,width:innerWidth,scroll:document.documentElement.scrollWidth};})()");
  assert.equal(arenaSelection.inputs,5,'Demo has five possible suspects');
  assert.equal(arenaSelection.selected,2);
  assert.equal(arenaSelection.enabled,true,'Selecting exactly two fighters enables attack');
  assert(arenaSelection.scroll<=arenaSelection.width+5,'Front arena must not overflow at 360px');
  await evaluate("document.getElementById('demoConfirm').click(); true");
  let arenaFinished=false;
  for(let n=0;n<45&&!arenaFinished;n++){
    await delay(120);
    arenaFinished=await evaluate("!!document.querySelector('#demoReplay .es-judgment-result')&&document.querySelector('#demoReplay .es-vote-replay')?.classList.contains('is-finished')").catch(()=>false);
  }
  assert(arenaFinished,'Demo must reveal a completed anonymous front-facing replay');
  console.log('PASSOU V7.9 CHROME/ANDROID: escolha por toque, dois golpes, resultado frontal e tela 360px.');
  console.log('PASSOU V7.7 CHROME/ANDROID: 360px no overflow; vote seal, ready status, season ranking, reduced motion.');
 }finally{
  try{ws?.close()}catch{}
  try{chrome?.kill('SIGKILL')}catch{}
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
