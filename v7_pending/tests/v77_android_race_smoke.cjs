'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('web/online.js','utf8').replace('const online=new OnlineUI();window.ESOnline={open:args=>online.open(args)};','window.__UI=OnlineUI;');
assert.match(source,/this\.roomEpoch===epoch/);
assert.match(source,/this\.roomId===roomId/);
assert.match(source,/document\.hidden\|\|Date\.now/);
assert.match(source,/visibilitychange/);
assert.match(source,/selectedVotes\.includes/);
const els=new Map();
function remember(s){for(const m of String(s).matchAll(/id="([^"]+)"/g))els.set(m[1],{onclick:null,value:'',disabled:false});}
let oldResolve;
const oldPromise=new Promise(resolve=>oldResolve=resolve);
const mkPlayer=(id,ready)=>({id,nick:'Jogador'+id,active:true,online:true,ready,title:null,frame:'classica',banner:'padrao'});
const makeRoom=code=>({id:code,code,owner:'u',status:'lobby',name:'Sala',max:5,impostors:1,difficulty:'Fácil',categories:['Animais'],clue:'none',know:false,public:true,players:[mkPlayer('u',true),mkPlayer('v',false),mkPlayer('w',true)],me:{}});
const app={html:'',checked:[],choices:[],
 set innerHTML(v){this.html=v;remember(v)},get innerHTML(){return this.html},
 querySelector(x){return null},querySelectorAll(x){
  if(x==='[data-vote]:checked')return this.checked;
  if(x==='[data-vote]')return this.choices;
  return [];
 }};
const topbar={hidden:false,set innerHTML(v){remember(v)}};
const document={hidden:false,getElementById:id=>els.get(id)||null};
const window={ES_SERVER_CONFIG:{url:'https://example.com',key:'pub'},ES_WORD_BANK:{},ESMotion:{enterPhase(){}}};
vm.runInNewContext(source,{window,document,URL,URLSearchParams,console,Date,Math,JSON,Set,Map,Number,clearInterval(){},clearTimeout(){},confirm:()=>true});
const ui=new window.__UI();ui.app=app;ui.topbar=topbar;ui.sound=()=>{};ui.currentPage='room';
ui.roomId='old';ui.roomEpoch=1;
ui.cloud={userId:'u',rpc:async(name,params)=>{
 if(name==='es_title_catalog')return [];
 if(name==='es_room_view')return params.p_room==='old'?oldPromise:makeRoom('new');
 if(name==='es_v74_events_list')return [];
 throw Error(name);
}};
(async()=>{
 const pending=ui.refresh();assert.equal(ui.refreshing,true);
 ui.stopLoop();ui.roomId='new';ui.currentPage='room';
 await ui.refresh();assert.match(app.html,/Sala new/);
 assert.equal(ui.room.code,'new');assert.equal(ui.refreshing,false);
 oldResolve(makeRoom('old'));await pending;
 assert.equal(ui.room.code,'new','Stale server response must never replace current room');
 assert.match(app.html,/Sala new/);
 const voteRoom={...makeRoom('new'),status:'voting',me:{voted:false}};
 const choice={dataset:{vote:'v'},checked:false};
 app.checked=[{dataset:{vote:'v'}}];app.choices=[choice];
 ui.renderRoom(voteRoom);
 assert.equal(choice.checked,true,'Voted suspects must stay selected after poll rerender');
 console.log('PASSOU V7.7 ANDROID: stale room response discarded; vote checked state survives refresh.');
})().catch(e=>{console.error(e);process.exitCode=1});
