'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/cosmetics.js','utf8');
const metadata=JSON.parse(fs.readFileSync('v7_pending/docs/v743_banner_manifest.json','utf8'));
const win={};vm.runInNewContext(source,{window:win},{filename:'cosmetics.js'});
const cat=win.ESCosmetics;
assert.equal(metadata.published,false,'Do not treat draft artwork as publicly deployed');
assert.equal(metadata.banners.length,16);
assert.equal(Object.keys(cat.banners).length,16);
assert.equal(Object.keys(cat.frames).length,16);
for(const record of metadata.banners){
 assert.equal(cat.safeBanner(record.code),record.code);
 assert.match(cat.banner(record.code),new RegExp('assets/banners/'+record.code+'\\.webp'));
 assert.match(cat.banner(record.code),/cosmetic-banner-fallback/);
 assert.match(cat.banner(record.code),/cosmetic-banner-svg/);
}
assert.equal(cat.safeBanner('"><script>'),'padrao');
assert.match(cat.banner('foo'),/assets\/banners\/padrao\.webp/);
const css=fs.readFileSync('web/style.css','utf8');
assert.match(css,/\.cosmetic-banner-illustration/);
assert.match(css,/object-fit:cover/);
console.log('PASSOU: 16 banners locais, fallback seguro, 16 molduras preservadas.');
