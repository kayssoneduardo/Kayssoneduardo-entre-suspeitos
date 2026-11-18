'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync('web/'+p,'utf8');
const window={ES83_SVGS:{}};
for(const name of ['v83_skin_manifest.js','v83_skin_assets_1.js','v83_skin_assets_2.js','v83_skin_assets_3.js','v83_skin_assets_4.js'])
 vm.runInNewContext(read(name),{window,Object},{filename:name,timeout:20000});
const meta=window.ES83_META,imgs=window.ES83_SVGS;
assert.equal(meta.length,200,'200 actual titles');
assert.equal(Object.keys(imgs).length,400,'400 SVG assets for male and female');
assert.equal(new Set(meta.map(x=>x.code)).size,200,'No duplicate title codes');
const expected={comum:0,incomum:0,raro:1,lenda:3,mistico:19};
const rarityCounter={}, unique=new Set();
for(const title of meta){
 rarityCounter[title.rarity]=(rarityCounter[title.rarity]||0)+1;
 for(const gender of ['m','f']){
  const key=title.code+'_'+gender,base64=imgs[key];
  assert(base64&&/^[A-Za-z0-9+/]+={0,2}$/.test(base64),'Missing base64 '+key);
  assert(!unique.has(base64),'Duplicate SVG art '+key);unique.add(base64);
  const svg=Buffer.from(base64,'base64').toString('utf8');
  assert(svg.includes('<svg ')&&svg.includes('</svg>'),'Invalid SVG envelope '+key);
  assert(!/<script\b|onload\s*=|onerror\s*=|javascript:|<foreignObject\b/i.test(svg),'Unsafe content '+key);
  const effects=(svg.match(/<animate(?:Transform|Motion)?\b/g)||[]).length;
  assert.equal(effects,expected[title.rarity], 'Wrong tier animation budget for '+key);
  assert(svg.includes('aria-label='),'Character accessibility label '+key);
  if(title.rarity==='mistico')assert(svg.includes('repeatCount="indefinite"'),'Mystic has perpetual themed effects');
 }
}
assert.deepEqual(rarityCounter,{comum:62,incomum:55,lenda:18,mistico:11,raro:54});
assert.equal(unique.size,400);
const gallery=read('skins-v84.html'),index=read('index.html'),online=read('online.js');
assert(gallery.includes('200 títulos e 400 skins'));
assert(gallery.includes('v83_skin_assets_4.js?v=v840-refined'));
assert(gallery.includes('data-title='));
assert(online.includes('href="skins-v84.html"'));
assert(index.includes('VERSÃO WEB 8.4.0'));
assert(index.includes('v840-refined'));
console.log('PASSOU V8.4: 200 títulos, 400 SVGs únicos, 11 místicos com 19 efeitos por skin, versão feminina/masculina, galeria e cache atualizado.');
