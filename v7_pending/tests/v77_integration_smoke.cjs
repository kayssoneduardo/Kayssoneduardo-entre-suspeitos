'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const uiSource=fs.readFileSync('web/online.js','utf8').replace('const online=new OnlineUI();window.ESOnline={open:args=>online.open(args)};','window.__TEST_UI=OnlineUI;');
const v77=fs.readFileSync('web/v77.js','utf8'),css=fs.readFileSync('web/style.css','utf8'),html=fs.readFileSync('web/index.html','utf8');
const sqlSeason=fs.readFileSync('v7_pending/sql/v77_season_ranking.sql','utf8');
const sqlWeekly=fs.readFileSync('v7_pending/sql/v77_weekly_challenges.sql','utf8');
assert.match(html,/7\.7\.0 RC \(TEMPORADAS E VOTAÇÃO/);
assert(html.indexOf('v77.js')<html.indexOf('online.js'));
assert(css.includes('.es77-vote-choice')&&css.includes('.es77-season-player')&&css.includes('prefers-reduced-motion:reduce'));
assert(!sqlSeason.includes('update public.es_profiles'));
assert(sqlWeekly.includes('primary key(user_id,week_start,code)'));
assert(sqlWeekly.includes('alter table public.es_v77_weekly_claims enable row level security'));
assert(sqlWeekly.includes('on conflict do nothing'));
assert(sqlWeekly.includes('and x.voted')&&sqlSeason.includes('x.voted'));
const els=new Map(),store=new Map();
const parse=content=>{for(const m of String(content).matchAll(/id="([^"]+)"/g))els.set(m[1],{id:m[1],value:'',disabled:false,textContent:'',onclick:null,hidden:false});};
class El {constructor(tag){this.tag=tag;this.children=[];this.style={};this.textContent='';this.className='';}
 append(...items){this.children.push(...items)}appendChild(item){this.children.push(item)}remove(){this.removed=true;}}
const body=new El('body');
const app={html:'',buttons:[],selected:[],set innerHTML(value){this.html=value;parse(value)},get innerHTML(){return this.html},
 querySelectorAll(q){
 if(q==='[data-week-claim]')return [...this.html.matchAll(/data-week-claim="([^"]+)"/g)].map(m=>({dataset:{weekClaim:m[1]},disabled:false,onclick:null}));
 if(q==='[data-vote]:checked')return this.selected;
 if(q==='[data-send]')return [...this.html.matchAll(/data-send="([^"]+)"/g)].map(m=>({dataset:{send:m[1]},disabled:false,textContent:'Convidar',onclick:null}));
 return [];
 },querySelector(){return null}};
const topbar={hidden:false,set innerHTML(x){parse(x)}};
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const window={localStorage,ES_SERVER_CONFIG:{url:'https://example.com',key:'public'},
 ES_WORD_BANK:{},ESMotion:{enabled:()=>true,enterPhase(){}},location:{origin:'https://example.com',pathname:'/test/',search:'',href:'https://example.com/test/',hash:''},history:{replaceState(){}},setTimeout(){}};
const document={body,getElementById:id=>els.get(id)||null,createElement:tag=>new El(tag),hidden:false};
let confirmed=true,sounds=0;
const context={window,document,localStorage,URL,URLSearchParams,Date,Math,Number,String,Map,Set,JSON,Error,console,
 setInterval(){},clearInterval(){},setTimeout(){},clearTimeout(){},confirm:()=>confirmed,prompt:()=>''};
vm.runInNewContext(v77,context,{filename:'v77.js'});
vm.runInNewContext(uiSource,context,{filename:'online.js'});
const ui=new window.__TEST_UI();ui.app=app;ui.topbar=topbar;ui.sound=()=>{sounds++;};ui.stopLoop=()=>{};
let votes=[],rewards=0,invites=0;
let claimed=false;
const season={starts_at:'2026-10-01T00:00:00Z',ends_at:'2027-01-01T00:00:00Z',players:[{id:'usr1',nickname:'Zero & Cia',position:1,points:50,wins:2,games:2}]};
const weekly=[{code:'semana_partidas',title:'Investigador da semana',description:'Conclua 4 partidas',progress:4,target:4,reward_xp:20,claimed:false,week_ends_at:'2026-11-16T00:00:00Z'}];
ui.cloud={userId:'usr1',rpc:async(name,params)=>{
 if(name==='es_v75_leaderboard')return [{id:'usr1',nickname:'Zero',ranking_points:50,online_wins:2,online_losses:0,xp:400}];
 if(name==='es_title_catalog')return [];
 if(name==='es_v77_season_ranking')return season;
 if(name==='es_v77_season_history')return [{starts_at:'2026-07-01T00:00:00Z',ends_at:'2026-10-01T00:00:00Z',champions:[{position:1,nickname:'Veterano',id:'12345678-1234-1234-1234-123456789012',points:75}],my_position:2,my_points:25}];
 if(name==='es_v74_missions')return [];
 if(name==='es_v74_events_list')return [];
 if(name==='es_v74_claims'||name==='es_v75_event_claims')return [];
 if(name==='es_v77_weekly_challenges')return weekly.map(x=>({...x,claimed}));
 if(name==='es_v77_weekly_claim'){assert.equal(params.p_code,'semana_partidas');assert(!claimed);claimed=true;rewards++;return {xp_awarded:20};}
 if(name==='es_friend_list')return [{id:'friend1',nickname:'Amigo online',accepted:true}];
 if(name==='es_v74_friend_presence')return [{id:'friend1',online:true}];
 if(name==='es_invite_send'){invites++;return true;}
 if(name==='es_vote'){votes.push(params);return true;}
 if(name==='es_invite_list')return [{id:1}];
 throw Error('Unexpected rpc '+name);
}};
(async()=>{
 const player=(id,nick,ready)=>({id,nick,ready,active:true,online:true,title:null,frame:'classica',banner:'padrao'});
 const lobby={id:'lobby1',code:'ABCD12',owner:'usr1',status:'lobby',max:6,impostors:1,categories:['Animais'],difficulty:'Fácil',clue:'none',know:false,public:true,name:'Lendas',players:[player('usr1','Zero',true),player('friend1','Amigo',false),player('third','Terceiro',true)],me:{}};
 ui.renderRoom(lobby);
 assert.match(app.html,/2\/3/);assert.match(app.html,/jogadores prontos/);
 assert.match(app.html,/es77-players/);assert.match(app.html,/es77-ready/);
 assert.match(app.html,/Convidar amigos/);assert.doesNotMatch(app.html,/shareLinkOn|voiceOn/);
 const voting={...lobby,status:'voting',me:{voted:false},players:lobby.players.map(x=>({...x,voted:false}))};
 ui.renderRoom(voting);
 assert.match(app.html,/es77-vote-choice/);assert.match(app.html,/Votação secreta/);
 app.selected=[{dataset:{vote:'friend1'}}];ui.refresh=async()=>{};
 confirmed=false;await els.get('submitVote').onclick();assert.equal(votes.length,0,'Cancelled vote must not submit');
 confirmed=true;await els.get('submitVote').onclick();assert.equal(votes.length,1,'Confirmed vote must submit once');
 assert.equal(votes[0].p_targets[0],'friend1');
 assert(body.children.some(e=>e.className==='es77-vote-seal'),'After backend success, vote seal should display');
 await ui.ranking();assert.match(app.html,/Classificação sazonal/);assert.match(app.html,/Zero &amp; Cia/);
 assert.match(app.html,/Ranking histórico/);assert.match(app.html,/Temporadas anteriores/);assert.match(app.html,/Veterano/);
 await ui.progressHub();assert.match(app.html,/Investigador da semana/);assert.match(app.html,/Resgatar recompensa/);
 let btn=app.querySelectorAll('[data-week-claim]')[0];btn.onclick=async()=>{btn.disabled=true;const reward=await ui.cloud.rpc('es_v77_weekly_claim',{p_code:btn.dataset.weekClaim});await ui.progressHub();};
 await btn.onclick();assert.equal(rewards,1);assert.match(app.html,/Resgatado/);
 let seen=window.ESV77.rememberAchievements('usr1',[{code:'title1',name:'Lenda',rarity:'lenda'}]);assert.equal(seen,null);
 seen=window.ESV77.rememberAchievements('usr1',[{code:'title1',name:'Lenda',rarity:'lenda'},{code:'title2',name:'Mistério',rarity:'mistico'}]);
 assert(seen&&seen.code==='title2');window.ESV77.achievement(seen);
 assert(body.children.some(x=>x.className.startsWith('es77-achievement ')));
 const alert=window.ESV77.inviteAlert(2);assert.match(alert,/2 convites pendentes/);
 await ui.inviteFriends();assert.match(app.html,/Online agora/);
 assert.match(app.html,/Convidar/);
 console.log('PASSOU V7.7: lobby, voto secreto confirmado, temporadas, desafios únicos, conquistas, amigos e acessibilidade.');
})().catch(e=>{console.error(e);process.exitCode=1});
