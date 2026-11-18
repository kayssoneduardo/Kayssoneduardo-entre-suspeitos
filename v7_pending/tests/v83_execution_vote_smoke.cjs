'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync('web/'+p,'utf8');
const win={ES83_SVGS:{},matchMedia:()=>({matches:true})};
const context={window:win,document:{hidden:true},console,Set,Map,Object,String,Number,Math};
for(const path of ['v83_skin_manifest.js','v83_skin_assets_1.js','v83_skin_assets_2.js','v83_skin_assets_3.js','v83_skin_assets_4.js','v83_arena.js','vote_replay.js'])
 vm.runInNewContext(read(path),context,{filename:path});
assert.equal(win.ES83_META.length,200);
assert.equal(Object.keys(win.ES83_SVGS).length,400);
const titleCodes=new Set(win.ES83_META.map(x=>x.code));
assert.equal(titleCodes.size,200);
const base64=/^[A-Za-z0-9+/]+={0,2}$/;
for(const title of win.ES83_META){
 assert(base64.test(win.ES83_SVGS[title.code+'_m']),'missing male skin '+title.code);
 assert(base64.test(win.ES83_SVGS[title.code+'_f']),'missing female skin '+title.code);
 assert.notEqual(win.ES83_SVGS[title.code+'_m'],win.ES83_SVGS[title.code+'_f']);
}
const all=win.ES83_META.map(x=>({code:x.code,name:x.name,rarity:x.rarity}));
let user={id:'a',title:'fantasma_absoluto',gender:'f',voted:true,nick:'AnA'};
const rendered=win.ES83Arena.art(user,all);
assert(rendered.includes('data-title-skin="fantasma_absoluto"'));
assert(rendered.includes('data-gender="f"'));
assert(rendered.includes('data-animation-count="3"'));
assert(win.ES83Arena.standing(user).includes('JÁ VOTOU'));
assert(win.ES83Arena.standing({...user,voted:false}).includes('AGUARDANDO VOTO'));
assert(!win.ES83Arena.standing(user).includes('data-vote='));
const ordinary=win.ES83Arena.character({...user,title:'primeira_rodada'},all);
assert.equal(ordinary.tier,'comum');
assert.equal(win.ES83Arena.character({...user,title:'nao_existe'},all).code,'primeira_rodada');
const sample=[{id:'a',nick:'Ana'},{id:'b',nick:'Bento'},{id:'c',nick:'Carlos'}];
let r=win.ES83Arena.chooseEliminated([{to:'a',count:4},{to:'b',count:2}],sample,1);
assert.equal(r.eliminated[0],'a');
r=win.ES83Arena.chooseEliminated([{to:'a',count:4},{to:'b',count:4}],sample,1);
assert.equal(r.eliminated.length,0);
assert(r.shots.every(shot=>!Object.hasOwn(shot,'from')),'Never reveal voter');
const index=read('index.html');
const scripts=['v83_skin_manifest.js','v83_skin_assets_1.js','v83_skin_assets_2.js','v83_skin_assets_3.js','v83_skin_assets_4.js','v83_arena.js','judgment_arena.js','vote_replay.js'];
let last=-1;for(const name of scripts){const i=index.indexOf(name);assert(i>last,'script order '+name);last=i}
const online=read('online.js');
assert(online.includes("this.cloud.rpc('es_vote'"),'Official secret vote server unchanged');
assert(online.includes('ESJudgmentArena?.markup'),'Original vote UI retained');
assert(online.includes('ES83Arena.renderCenter')||read('vote_replay.js').includes('ES83Arena.renderCenter'));
assert(!read('v83_arena.js').includes('es_vote('),'Visual scene never sends votes');
assert(!read('v83_arena.js').includes('ranking_points='),'Replay never changes score');
console.log('PASSOU V8.3: 400 SVG, 200 títulos, feminino/masculino, voto confirmado, sigilo, empate e execução central.');
