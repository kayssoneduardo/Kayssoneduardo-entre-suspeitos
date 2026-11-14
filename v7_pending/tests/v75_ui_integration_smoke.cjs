'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/online.js','utf8')
 .replace("const online=new OnlineUI();window.ESOnline={open:args=>online.open(args)};","window.__OnlineUI=OnlineUI;");
const art=fs.readFileSync('web/cosmetics.js','utf8');
const els=new Map();
const parse=(html)=>{for(const m of html.matchAll(/id="([^"]+)"/g)){if(!els.has(m[1]))els.set(m[1],{value:'',disabled:false,onclick:null,textContent:'',hidden:false});}};
const app={html:'',eventButtons:[],set innerHTML(value){this.html=value;parse(value);},get innerHTML(){return this.html;},querySelectorAll(selector){
 if(selector==='[data-event-claim]'){
  this.eventButtons=Array.from(this.html.matchAll(/data-event-claim="([^"]+)"/g),m=>({dataset:{eventClaim:m[1]},disabled:false,onclick:null}));
  return this.eventButtons;
 }
 return [];
}};
const topbar={hidden:false,set innerHTML(value){parse(value);}};
const window={ES_SERVER_CONFIG:{url:'https://example.com',key:'public'},ES_WORD_BANK:{},location:{origin:'https://example.com',pathname:'/test/',search:'',hash:'',href:'https://example.com/test/'},history:{replaceState(){}}};
const context={window,document:{getElementById:id=>els.get(id)||null},localStorage:{getItem(){return null;},setItem(){}},URL,URLSearchParams,console,Date,Math,Number,JSON,Set,Map,Error,clearInterval(){},clearTimeout(){}};
vm.runInNewContext(art,context,{filename:'cosmetics.js'});
vm.runInNewContext(source,context,{filename:'online.js'});
const ui=new window.__OnlineUI();ui.app=app;ui.topbar=topbar;
const id='12345678-1234-1234-1234-123456789012';
const guest={id,nickname:'Visitante & Cia',avatar_url:null,equipped_frame:'ouro',equipped_banner:'lua_partida',equipped_title:'test-title',xp:400,ranking_points:25,online_wins:3,online_losses:1};
const titles=[{code:'test-title',name:'Detetive da Noite',rarity:'raro'}];
const recent=[
 {finished_at:'2026-11-14T20:00:00Z',is_public:true,is_impostor:false,win:true,votes_received:1,hits:1,xp_earned:20},
 {finished_at:'2026-11-14T19:00:00Z',is_public:false,is_impostor:true,win:false,votes_received:2,hits:0,xp_earned:0}
];
let claimed=false,claimedCount=0;
const event={code:'noite_dos_suspeitos_2026',name:'Noite dos Suspeitos',description:'Conclua 8 partidas públicas',active:true,progress:8,target:8,starts_at:'2026-12-01T03:00:00Z',ends_at:'2026-12-16T03:00:00Z',reward_frame:null};
ui.cloud={url:'https://example.com',userId:id,rpc:async(name,params)=>{
 switch(name){
 case 'es_v75_public_profile':assert.equal(params.p_user,id);return guest;
 case 'es_title_catalog':return titles;
 case 'es_v75_leaderboard':return [guest];
 case 'es_leaderboard':throw Error('Enriched ranking must be preferred when present');
 case 'es_v74_stats':return {games:2,win_rate:50,recent};
 case 'es_v74_missions':return [];
 case 'es_v74_events_list':return [event];
 case 'es_v74_claims':return [];
 case 'es_v75_event_claims':return claimed?[{code:event.code,xp_awarded:60}]:[];
 case 'es_v75_event_claim':assert.equal(params.p_code,event.code);assert.equal(claimed,false,'Claim cannot repeat');claimed=true;claimedCount++;return {code:event.code,xp_awarded:60,claimed:true};
 default:throw Error('Unexpected RPC '+name);
 }
}};
(async()=>{
 await ui.publicProfile(id);
 assert.match(app.html,/Visitante &amp; Cia/,'Nickname must be escaped');
 assert.match(app.html,/Detetive da Noite/);
 assert.match(app.html,/lua_partida.webp/);
 assert.match(app.html,/Vitórias públicas/);
 assert.doesNotMatch(app.html,/votos secretos|email|senha/i);
 await ui.ranking();assert.match(app.html,/data-social="12345678-1234-1234-1234-123456789012"/);
 await ui.historyPage();assert.match(app.html,/Suas últimas 10 partidas/);
 assert.match(app.html,/Vitória · Comum/);assert.match(app.html,/Derrota · Impostor/);assert.match(app.html,/Sem XP/);
 await ui.progressHub();assert.match(app.html,/Noite dos Suspeitos/);assert.match(app.html,/Resgatar 60 XP/);
 assert.equal(app.eventButtons.length,1);
 await app.eventButtons[0].onclick();
 assert.equal(claimedCount,1,'Reward awarded exactly once');
 assert.match(app.html,/Recompensa resgatada/);
 assert.doesNotMatch(app.html,/Resgatar 60 XP/);
 console.log('PASSOU: perfis públicos, ranking, histórico privado, progresso de evento e resgate único renderizados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
