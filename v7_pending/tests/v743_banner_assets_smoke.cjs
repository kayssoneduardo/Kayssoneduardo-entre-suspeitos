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
// Cosmetics visually progress from subtle common to glowing legendary items.
const expected={
 comum:['padrao','escuta_noturna','conspiracao'],
 incomum:['cacada_sombria','corredor_espectral','juramento_oculto'],
 raro:['lua_partida','cidade_sem_rosto','ruinas_do_segredo','vidro_estilhacado'],
 epico:['ecos_da_nevoa','floresta_rubra','segredo_carmesim'],
 lenda:['trono_arcano','eclipse_violeta','reino_dos_suspeitos']
};
for(const [rarity,codes] of Object.entries(expected)){
 for(const code of codes){
  assert.equal(cat.bannerRarity(code),rarity,code+' rarity must match catalog');
  assert.match(cat.banner(code),new RegExp('banner-rarity-'+rarity),code+' CSS tier missing');
 }
}
assert.equal(cat.bannerRarity('invalid'), 'comum','Unknown banner must default to safe common appearance');
const sql=fs.readFileSync('v7_pending/sql/v741_cosmetic_catalog.sql','utf8');
for(const [rarity,codes] of Object.entries(expected)){
 for(const code of codes)assert(sql.includes("'"+code+"','banner',") && sql.includes("'"+code+"','banner',"),'Catalog code '+code+' missing');
}
const css=fs.readFileSync('web/style.css','utf8');
assert.match(css,/\.cosmetic-banner-illustration/);
assert.match(css,/object-fit:cover/);
for(const rarity of Object.keys(expected))assert(css.includes('.banner-rarity-'+rarity+'::after'),'No visible styling for '+rarity);
console.log('PASSOU: 16 banners locais, fallback seguro, 16 molduras preservadas.');
