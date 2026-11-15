'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm');
const m=JSON.parse(fs.readFileSync('v7_pending/docs/v745_cinematic_banners_manifest.json','utf8'));
const win={};vm.runInNewContext(fs.readFileSync('web/cosmetics.js','utf8'),{window:win});
const cat=win.ESCosmetics;
const v='v745-approved-cinematic-20261114-r1';
assert.equal(m.assets.length,13);
assert.equal(m.preserve_banners.length,3);
assert.equal(new Set(m.assets.map(a=>a.code)).size,13);
for(const a of m.assets){
 assert.equal(cat.safeBanner(a.code),a.code);
 assert.match(cat.banner(a.code),new RegExp('assets/banners/'+a.code+'\\.webp\\?v='+v));
 assert.match(a.sha256,/^[0-9a-f]{64}$/);
 assert.equal(m.dimensions[0]/m.dimensions[1],3);
 if(process.env.V745_REQUIRE_ASSETS==='1'){
  const data=fs.readFileSync(a.path);
  assert.equal(data.length,a.size_bytes,'Unexpected size '+a.code);
  assert.equal(data.subarray(0,4).toString('latin1'),'RIFF');
  assert.equal(data.subarray(8,12).toString('latin1'),'WEBP');
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256,'Artwork does not match approved source: '+a.code);
 }
}
for(const code of m.preserve_banners)assert(!m.assets.some(a=>a.code===code));
assert.match(fs.readFileSync('web/index.html','utf8'),/v(?:745-cinematic-20261114-r1|750-(?:animations-social-20261114-dev|cinematic-release-20261114-r2)|760-entrances-release-20261114-r1|761-legendary-impact-20261114-r1|762-lobby-clean-20261114-r1|770-consolidated-dev-20261114-r1)/);
console.log('PASSOU: catálogo, 13 artes planejadas, versões de cache e 3 banners preservados.'+(process.env.V745_REQUIRE_ASSETS==='1'?' Integridade de todos os WebP confirmada.':' Envio dos WebP ainda pendente.'));
