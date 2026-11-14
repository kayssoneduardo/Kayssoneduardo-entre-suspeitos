'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('web/cosmetics.js','utf8');
const metadata=JSON.parse(fs.readFileSync('v7_pending/docs/v743_banner_manifest.json','utf8'));
const win={};vm.runInNewContext(source,{window:win},{filename:'cosmetics.js'});
const cat=win.ESCosmetics;
assert.equal(metadata.banners.length,16);
assert.equal(Object.keys(cat.banners).length,16);
assert.equal(Object.keys(cat.frames).length,16);
function validWebp(path){
 assert(fs.existsSync(path),'Asset is missing: '+path);
 const bytes=fs.readFileSync(path);
 assert(bytes.length>12000 && bytes.length<160000,'Unexpected WebP file size: '+path);
 assert.equal(bytes.subarray(0,4).toString(),'RIFF',path+' invalid RIFF');
 assert.equal(bytes.subarray(8,12).toString(),'WEBP',path+' invalid WebP');
}
for(const x of metadata.banners){
 assert.equal(cat.safeBanner(x.code),x.code);
 assert.match(cat.banner(x.code),new RegExp('assets/banners/'+x.code+'\\.webp'));
 assert.match(cat.banner(x.code),/cosmetic-banner-fallback/);
 validWebp(x.path);
}
const frameAssets=['ouro','nevoa','coroa_arcana','chamas_eternas'];
const expectedFrameRarities={ouro:'raro',nevoa:'epico',coroa_arcana:'lenda',chamas_eternas:'lenda'};
for(const code of frameAssets){
 validWebp('web/assets/frames/'+code+'.webp');
 assert.equal(cat.frameRarity(code),expectedFrameRarities[code]);
 assert.match(cat.avatar(code,'✦'),new RegExp('assets/frames/'+code+'\\.webp'));
}
assert.match(cat.avatar('bronze','✦'),/cosmetic-frame-svg/,'Other frames must preserve SVG assets');
const expected={
 comum:['padrao','escuta_noturna','conspiracao'],
 incomum:['cacada_sombria','corredor_espectral','juramento_oculto'],
 raro:['lua_partida','cidade_sem_rosto','ruinas_do_segredo','vidro_estilhacado'],
 epico:['ecos_da_nevoa','floresta_rubra','segredo_carmesim'],
 lenda:['trono_arcano','eclipse_violeta','reino_dos_suspeitos']
};
const sql=fs.readFileSync('v7_pending/sql/v741_cosmetic_catalog.sql','utf8');
for(const [rarity,codes] of Object.entries(expected)){
 for(const code of codes){
  assert.equal(cat.bannerRarity(code),rarity);
  assert.match(cat.banner(code),new RegExp('banner-rarity-'+rarity));
  assert(sql.includes("'"+code+"','banner',"),'Missing catalog code '+code);
 }
}
assert.equal(cat.safeBanner('"><script>'),'padrao');
assert.equal(cat.frameRarity('nonexistent'),'comum');
const css=fs.readFileSync('web/style.css','utf8');
assert.match(css,/\.cosmetic-banner-illustration/);
assert.match(css,/\.cosmetic-frame-illustration/);
for(const rarity of Object.keys(expected)){
 assert(css.includes('.banner-rarity-'+rarity+'::after'),'Missing banner rarity '+rarity);
 assert(css.includes('.frame-rarity-'+rarity+' .cosmetic-frame-svg'),'Missing frame rarity '+rarity);
}
console.log('PASSOU: 16 WebPs panorâmicos e 4 molduras reais, catálogo e hierarquia de raridade.');
