/* Entre Suspeitos: decorative assets rendered locally, never loaded from untrusted URLs. */
(function(){
'use strict';
const frames={
classica:['Clássica','#8a75b7','#ded3ff',0],bronze:['Vigilante Bronze','#a66b3c','#f5c88a',1],ouro:['Olhar de Ouro','#b88c28','#ffef9c',2],
nevoa:['Névoa','#9764da','#e2c8ff',3],coroa_arcana:['Coroa Arcana','#f0b34e','#b964ff',4],
lamina_eclipse:['Lâmina Eclipse','#78b9e7','#effaff',5],cacador_ebano:['Caçador Ébano','#c73454','#ff889c',6],
ordem_velada:['Ordem Velada','#49bc83','#ceffc1',7],rubi_sombrio:['Rubi Sombrio','#b02e43','#fa6c7b',8],
sentinela_lunar:['Sentinela Lunar','#8ebee4','#e5eeff',9],espiral_abissal:['Espiral Abissal','#6146dd','#d5b9ff',10],
espectro_violeta:['Espectro Violeta','#b47ff4','#ffdaff',11],chamas_eternas:['Chamas Eternas','#e56f35','#ffd46f',12],
aurora_fantasma:['Aurora Fantasma','#49c2ba','#ebd7ff',13],guardiao_do_eco:['Guardião do Eco','#a2a7f7','#e5edff',14],
trono_da_noite:['Trono da Noite','#d5a45d','#fff1c6',15]
};
const banners={
padrao:['Sombras Originais','#1a1133','#65459c','#9b6ff5',0],
ecos_da_nevoa:['Ecos da Névoa','#180f35','#6741a7','#cba1ff',1],
trono_arcano:['Trono Arcano','#24142a','#ad7735','#ffda85',2],
cacada_sombria:['Caçada Sombria','#2c0d25','#ad275d','#f48dbe',3],
lua_partida:['Lua Partida','#07152e','#4268a0','#d2eaff',4],
conspiracao:['Conspiração','#18132a','#7f395c','#ff9fb4',5],
cidade_sem_rosto:['Cidade Sem Rosto','#16172c','#67547d','#c6bce3',6],
corredor_espectral:['Corredor Espectral','#132b2e','#348c96','#c1f2ea',7],
floresta_rubra:['Floresta Rubra','#2e0c20','#b83850','#f89c6e',8],
eclipse_violeta:['Eclipse Violeta','#160c35','#6748d6','#f5cfff',9],
juramento_oculto:['Juramento Oculto','#131d36','#407eae','#9ee3ee',10],
ruinas_do_segredo:['Ruínas do Segredo','#242034','#8b6d85','#e7d0f5',11],
reino_dos_suspeitos:['Reino dos Suspeitos','#302038','#9b687c','#ffda99',12],
escuta_noturna:['Escuta Noturna','#111624','#315273','#a8d5e9',13],
segredo_carmesim:['Segredo Carmesim','#330e22','#c63b53','#fbb0b1',14],
vidro_estilhacado:['Vidro Estilhaçado','#16213a','#4c91c9','#ccecff',15]
};
function safeFrame(id){return Object.prototype.hasOwnProperty.call(frames,id)?id:'classica';}
function safeBanner(id){return Object.prototype.hasOwnProperty.call(banners,id)?id:'padrao';}
function svgFrame(code){
 const key=safeFrame(code),[,a,b,index]=frames[key],id='f'+index;
 const premium=index>=3,grand=index>=4;
 const paths=Array.from({length:7},(_,i)=>{
   const angle=(i-3)*18,offset=i*4;
   return '<g transform="rotate('+angle+' 100 100)"><path d="M100 '+(grand?3:12)+' Q'+(90-offset/4)+' 32 100 '+(38+offset/3)+' Q'+(110+offset/4)+' 30 100 '+(grand?3:12)+'Z" fill="url(#'+id+'gold)" stroke="'+a+'" stroke-width=".8"/></g>';
 }).join('');
 const side=Array.from({length:6},(_,i)=>{
  const y=126+i*9,curv=15+i*4;
  return '<path d="M'+(26+i*4)+' '+y+' Q'+(10-i*2)+' '+(y-curv)+' '+(22+i*2)+' '+(y-curv-8)+' Q'+(42+i*3)+' '+(y-16)+' '+(26+i*4)+' '+y+'Z" fill="url(#'+id+'gold)" stroke="'+a+'" stroke-width=".7"/>';
 }).join('');
 const gems=Array.from({length:premium?8:4},(_,i)=>{
   const angle=i*360/(premium?8:4);
   return '<g transform="rotate('+angle+' 100 100)"><path d="M100 3 L108 17 L100 31 L92 17Z" fill="url(#'+id+'gem)" stroke="'+a+'" stroke-width="1.5"/><path d="M100 5 L103 17 L100 27 L97 17Z" fill="#fff" opacity=".72"/></g>';
 }).join('');
 const sparkles=Array.from({length:grand?12:5},(_,i)=>{
  const angle=i*360/(grand?12:5)+17;
  return '<g transform="rotate('+angle+' 100 100)"><path d="M100 -2V8 M95 3H105" stroke="'+b+'" stroke-width="1.6" opacity=".75"/></g>';
 }).join('');
 return '<svg class="cosmetic-frame-svg" viewBox="0 0 200 200" aria-hidden="true"><defs>'
 +'<linearGradient id="'+id+'gold" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="'+b+'"/><stop offset=".24" stop-color="#fff3c3"/><stop offset=".53" stop-color="'+a+'"/><stop offset=".79" stop-color="'+b+'"/><stop offset="1" stop-color="#fff1b5"/></linearGradient>'
 +'<linearGradient id="'+id+'gem" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8d9ff"/><stop offset=".48" stop-color="'+b+'"/><stop offset="1" stop-color="#44217e"/></linearGradient>'
 +'<filter id="'+id+'glow"><feGaussianBlur stdDeviation="3.5"/></filter></defs>'
 +'<circle cx="100" cy="100" r="79" fill="none" stroke="'+b+'" stroke-width="12" opacity=".46" filter="url(#'+id+'glow)"/>'
 +'<circle cx="100" cy="100" r="78" fill="none" stroke="url(#'+id+'gold)" stroke-width="'+(grand?9:6)+'"/>'
 +'<circle cx="100" cy="100" r="72" fill="none" stroke="'+b+'" stroke-width="2" opacity=".9"/>'
 +'<circle cx="100" cy="100" r="85" fill="none" stroke="'+b+'" stroke-width="1.2" opacity=".5"/>'
 +'<g>'+paths+'</g><g>'+side+'</g><g transform="translate(200 0) scale(-1 1)">'+side+'</g>'
 +gems+sparkles
 +'<path d="M75 27L100 8L125 27L117 39L100 32L83 39Z" fill="url(#'+id+'gold)" stroke="'+b+'" stroke-width="1.2" opacity="'+(grand?1:.8)+'"/>'
 +'<path d="M100 9L112 23L100 35L88 23Z" fill="url(#'+id+'gem)" stroke="'+a+'" stroke-width="1.8"/>'
 +'<path d="M85 160Q100 181 115 160L100 194Z" fill="url(#'+id+'gold)" opacity="'+(premium?1:.6)+'"/>'
 +'</svg>';
}
function bannerSvg(code){
 const key=safeBanner(code),[name,a,b,c,i]=banners[key],id='b'+i;
 const buildings=Array.from({length:11},(_,j)=>{
  const x=j*55+((i*7+j*13)%17),h=36+((j*29+i*19)%83);
  const tower=j%4===0?'<path d="M'+(x+12)+' '+(194-h)+' l14 -25 14 25 Z" fill="'+a+'" opacity=".8"/>':'';
  return '<rect x="'+x+'" y="'+(196-h)+'" width="'+(31+j%3*7)+'" height="'+h+'" fill="'+a+'" opacity=".65"/>'+tower;
 }).join('');
 const trees=Array.from({length:6},(_,j)=>{
  const x=j*119-10,y=205+(j%2)*11;
  return '<path d="M'+x+' '+y+' q12 -44 0 -74 m0 38 q-12 -19 -30 -19 m30 0 q14 -27 30 -31" fill="none" stroke="'+a+'" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
 }).join('');
 const scenery=(i===3||i===8||i===14)?trees:buildings;
 const throne=(i===2||i===12)?'<path d="M490 175V77L515 47L540 77V175Z" fill="'+a+'" stroke="'+c+'" stroke-width="5"/><rect x="470" y="176" width="88" height="14" fill="'+a+'" stroke="'+c+'"/><path d="M475 90 515 58 552 90" fill="none" stroke="'+c+'" stroke-width="3"/>':'';
 const hat=(i===1||i===5||i===13)?'<path d="M476 127 492 80 547 80 561 129Z M458 132Q521 153 577 131Z" fill="'+a+'" stroke="'+c+'" stroke-width="2" opacity=".75"/><path d="M484 150Q523 127 554 154L565 214H465Z" fill="'+a+'" opacity=".72"/>':'';
 return '<svg class="cosmetic-banner-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="'+id+'sky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+a+'"/><stop offset=".56" stop-color="'+b+'"/><stop offset="1" stop-color="'+a+'"/></linearGradient><radialGradient id="'+id+'fog"><stop stop-color="'+c+'" stop-opacity=".36"/><stop offset="1" stop-color="'+a+'" stop-opacity="0"/></radialGradient></defs>'
 +'<rect width="640" height="220" fill="url(#'+id+'sky)"/>'
 +'<circle cx="'+(470-i*7%125)+'" cy="63" r="'+(26+(i%3)*7)+'" fill="'+c+'" opacity=".65"/>'
 +'<circle cx="'+(470-i*7%125)+'" cy="63" r="'+(38+(i%3)*7)+'" fill="none" stroke="'+c+'" stroke-width="1" opacity=".35"/>'
 +'<path d="M0 175Q80 90 160 165T320 150T640 155V220H0Z" fill="'+b+'" opacity=".42"/>'
 +scenery+throne+hat
 +'<ellipse cx="200" cy="202" rx="400" ry="58" fill="url(#'+id+'fog)"/>'
 +'<path d="M0 200 Q90 160 160 196 T330 191 T640 185" fill="none" stroke="'+c+'" stroke-width="9" opacity=".22"/>'
 +'<circle cx="'+(220+(i*47)%310)+'" cy="30" r="2" fill="#fff" opacity=".7"/><circle cx="'+(160+(i*67)%410)+'" cy="75" r="2" fill="#fff" opacity=".4"/>'
 +'</svg>';
}
function avatar(code,imageHtml){return '<span class="cosmetic-avatar-wrap"><span class="cosmetic-avatar-content">'+imageHtml+'</span>'+svgFrame(code)+'</span>';}
function banner(code){return '<span class="cosmetic-banner-art">'+bannerSvg(code)+'</span>';}
window.ESCosmetics=Object.freeze({frames,banners,safeFrame,safeBanner,svgFrame,bannerSvg,avatar,banner});
})();
