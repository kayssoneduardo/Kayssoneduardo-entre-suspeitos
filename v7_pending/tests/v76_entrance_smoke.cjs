'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('web/entrance.js','utf8'),css=fs.readFileSync('web/style.css','utf8'),ui=fs.readFileSync('web/online.js','utf8'),html=fs.readFileSync('web/index.html','utf8');
assert(html.indexOf('motion.js')<html.indexOf('entrance.js')&&html.indexOf('entrance.js')<html.indexOf('online.js'));
assert(ui.includes('this.entrancePending=true')&&ui.includes("r.status==='lobby'"));
assert(ui.includes('bindEntranceDemo()')&&ui.includes('esEntryLegend'));
assert(css.includes('esEntranceFigure')&&css.includes('esEntranceSigil')&&css.includes('esEntranceScatter'));
assert(css.includes('prefers-reduced-motion:reduce'));
assert(!js.includes('es_vote')&&!js.includes('es_start')&&!js.includes('es_me'));
class FakeElement {
 constructor(tag){this.tag=tag;this.style={setProperty(){}};this.children=[];this.className='';this.attributes={};this.textContent='';}
 append(...children){this.children.push(...children)}
 appendChild(el){this.children.push(el)}
 remove(){this.removed=true;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(){}
}
const body=new FakeElement('body'),win={ESCosmetics:{frameRarity:c=>c==='coroa_arcana'?'lenda':c==='nevoa'?'epico':'comum'},ESMotion:{enabled:()=>true}};
let dispose=null;
const ctx={window:win,document:{body,createElement:tag=>new FakeElement(tag)},setTimeout:fn=>{dispose=fn;return 1},clearTimeout:()=>{}};
vm.runInNewContext(js,ctx);
assert.equal(win.ESEntrance.rarityFromFrame('coroa_arcana'),'lenda');
assert.equal(win.ESEntrance.rarityFromFrame('nevoa'),'epico');
assert.equal(win.ESEntrance.rarityFromFrame('classica'),'comum');
for (const rarity of ['comum','epico','lenda']){
 const played=win.ESEntrance.play({rarity,nickname:'Zero'});
 assert(played,'Must play '+rarity);
 const overlay=body.children.at(-1);
 assert(overlay.className.includes('es-entrance-'));
 assert(overlay.children.some(c=>c.className==='es-entrance-words'),'Must display player name');
 assert(overlay.children.some(c=>c.className==='es-entrance-skip'),'Must have skip button');
 assert(!JSON.stringify(overlay).includes('IMPOSTOR')&&!JSON.stringify(overlay).includes('secretWord'));
 win.ESEntrance.clean();assert(overlay.removed);
}
win.ESMotion.enabled=()=>false;
assert.equal(win.ESEntrance.play({rarity:'lenda'}),false);
console.log('PASSOU: entradas comum/épica/lendária, privacidade, controle de animação e botão Pular.');
