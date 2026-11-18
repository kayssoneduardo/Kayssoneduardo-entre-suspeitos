'use strict';
/* V7.9: arena frontal sem backend simulado e invariantes do voto real. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const get=p=>fs.readFileSync(p,'utf8');
const arena=get('web/judgment_arena.js');
const replay=get('web/vote_replay.js');
const online=get('web/online.js');
const html=get('web/index.html');
const demo=get('web/arena-demo.html');
const css=get('web/style.css');
const window={matchMedia:()=>({matches:true})};
const document={hidden:false,getElementById:()=>null};
const c={window,document,console,Map,Set,Object,String,Number,Math,JSON,Promise};
vm.runInNewContext(arena,c,{filename:'judgment_arena.js'});
vm.runInNewContext(replay,c,{filename:'vote_replay.js'});
const api=window.ESJudgmentArena;
assert(api?.markup&&api?.bind&&api?.impact&&api?.resultMarkup);
const players=[
 {id:'host',nick:'Zero',active:true,online:true},
 {id:'ana',nick:'Ana <3',active:true,online:true},
 {id:'b',nick:'Bento',active:true,online:true},
 {id:'c',nick:'Celso',active:true,online:true},
 {id:'d',nick:'Diana',active:true,online:false}
];
const ballot=api.markup(players,'host',2,false);
assert(ballot.includes('ARENA DO JULGAMENTO'));
assert(ballot.includes('judge-stage')&&ballot.includes('judge-figure'));
assert.equal((ballot.match(/data-vote=/g)||[]).length,3,'Only online non-self players can be voted');
assert(!ballot.includes('data-vote="host"')&&!ballot.includes('data-vote="d"'));
assert(ballot.includes('Ana &lt;3'),'Player names escaped');
assert(!ballot.includes('Ana <3'),'Never inject raw nickname markup');
const waiting=api.markup(players,'host',2,true);
assert(!waiting.includes('data-vote='),'No secret ballot after submission');
assert(waiting.includes('Seu voto já foi registrado'));
const inputs=[0,1,2].map(i=>{
 const listeners={},classes=new Set();
 return {dataset:{vote:String(i)},checked:false,listeners,classes,
  addEventListener(name,fn){listeners[name]=fn},
  closest(){return {classList:{toggle(name,on){on?classes.add(name):classes.delete(name)}}}}
 };
});
const stage={querySelectorAll:x=>x==='[data-vote]'?inputs:[]};
const counter={textContent:''},button={disabled:false};
const container={querySelector:x=>x==='#judgmentStage'?stage:x==='[data-judge-counter]'?counter:x==='#submitVote'?button:null};
api.bind(container,2);
assert.equal(button.disabled,true,'Submit disabled until all chosen');
inputs[0].checked=true;inputs[0].listeners.change();
inputs[1].checked=true;inputs[1].listeners.change();
assert.equal(button.disabled,false,'Exactly 2 suspects enables submit');
assert.equal(inputs[0].classes.has('judge-selected'),true);
inputs[2].checked=true;inputs[2].listeners.change();
assert.equal(inputs[2].checked,false,'More than 2 targets are disallowed');
assert.equal(button.disabled,false);
inputs[1].checked=false;inputs[1].listeners.change();
assert.equal(button.disabled,true,'Removing target re-disables submit');
const aggregates=[{to:'ana',count:3},{to:'b',count:2},{to:'c',count:2}];
const s=window.ESVoteReplay.tally(aggregates,players,2);
assert.equal(s.shots.length,7);
assert(s.shots.every(shot=>!Object.hasOwn(shot,'from')),'Replay never exposes voter');
const board=api.resultMarkup(players,s);
assert(board.includes('es-judgment-result')&&board.includes('es-vote-actor'));
assert(board.includes('Quem votou em quem permanece secreto'));
assert(!board.includes('data-vote='));
assert(html.indexOf('judgment_arena.js')>html.indexOf('v77.js'));
assert(html.indexOf('judgment_arena.js')<html.indexOf('vote_replay.js'));
assert.match(html,/8\.3\.0 \(EXECUÇÃO E STATUS DE VOTO\)/);
assert(demo.includes('ESJudgmentArena.bind')&&demo.includes('ESVoteReplay.mount'));
assert(demo.includes('não envia votos ao servidor'),'Demo does not submit real votes');
assert(online.includes("this.cloud.rpc('es_vote',{p_room:r.id,p_targets:targets})"),'Official server voting unchanged');
assert(online.includes("this.cloud.rpc('es_v78_vote_replay',{p_room:r.id})"),'Backend aggregate replay unchanged');
assert(online.includes("this.app.querySelector('.es-vote-replay.is-playing')"),'Polling preserves animation');
assert(online.includes('ESJudgmentArena?.bind(this.app,r.impostors)'));
assert(online.includes('ESJudgmentArena.impact(arenaStage,targets)'));
assert(css.includes('.judge-arches')&&css.includes('.judge-weapon'));
assert(css.includes('prefers-reduced-motion:reduce'));
console.log('PASSOU V7.9: arena frontal, toque, múltiplos alvos, privacidade, votação oficial, replay e demonstração.');
