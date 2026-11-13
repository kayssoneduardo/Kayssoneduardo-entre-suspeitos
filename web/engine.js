(function(root,factory){
  const api = factory(); root.ES = api;
  if(typeof module==='object' && module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const LEVELS=['Fácil','Médio','Difícil'];
  function randomInt(max, source){
    if(!Number.isInteger(max)||max<1)throw Error('Limite inválido.');
    if(source)return source(max);
    const cryptoObj = typeof crypto!=='undefined'?crypto:null;
    if(cryptoObj&&cryptoObj.getRandomValues){
      const limit=Math.floor(4294967296/max)*max;
      const arr=new Uint32Array(1);
      do{cryptoObj.getRandomValues(arr)}while(arr[0]>=limit);
      return arr[0]%max;
    }
    return Math.floor(Math.random()*max);
  }
  function shuffle(a, rng=randomInt){
    const copy=[...a];for(let i=copy.length-1;i>0;i--){const j=rng(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;
  }
  function maxImpostors(n){return Math.max(1,Math.floor((n-1)/2));}
  function wordKey(c,w){return c+'|'+w;}
  function selectWord(bank,categories,level,history,rng=randomInt){
    const pool=categories.flatMap(c=>(bank[c]||[]).filter(x=>level==='Misturado'||x.d===level).map(x=>({...x,c})));
    if(!pool.length)throw Error('Não há palavras disponíveis nessa seleção.');
    let available=pool.filter(x=>!history.has(wordKey(x.c,x.w)));
    let reset=false;
    if(!available.length){
      // Exhaust only the selected pool; never reset history for unrelated categories/levels.
      for(const x of pool)history.delete(wordKey(x.c,x.w));
      available=pool;reset=true;
    }
    const pick=available[rng(available.length)];history.add(wordKey(pick.c,pick.w));
    return {...pick,reset};
  }
  const PHRASES={
    common:[
      'Nem todos estão dizendo a verdade.','O impostor pode estar ao seu lado.',
      'Confie em poucos. Desconfie de todos.','Uma palavra pode entregar tudo.',
      'Quem parece inocente pode ser o mais perigoso.','O silêncio pode ser uma pista.',
      'Entre amigos, existe um impostor.','A mentira também sabe falar.',
      'A verdade está escondida entre as palavras.','Ser inocente não significa parecer inocente.'
    ],
    uncommon:[
      'A amizade termina quando a votação começa.','Você conhece as mentiras dos seus amigos?',
      'A melhor mentira é aquela em que todos acreditam.','Quem fala demais também se entrega.',
      'Não é paranoia se realmente existe um impostor.','Hoje você mente. Amanhã, desconfia.'
    ],
    rare:[
      'O impostor mais perigoso é o que ninguém acusa.',
      'Se todos concordam, alguém pode estar manipulando.',
      'O segredo não escolhe seus amigos.',
      'Ninguém ouviu a mentira. Todos acreditaram.'
    ],
    special:['O LULA está entre nós.']
  };
  function selectOpening(rng=randomInt){
    const roll=rng(100);const tier=roll<1?'special':roll<10?'rare':roll<30?'uncommon':'common';
    const arr=PHRASES[tier];return {text:arr[rng(arr.length)],tier};
  }
  function validateBank(bank){
    const report={};let total=0;
    for(const [category,words] of Object.entries(bank)){
      if(words.length<100)throw Error('Categoria abaixo de 100: '+category);
      const keys=new Set();const levels=new Set();
      for(const x of words){
        if(!x.w||!x.h||!LEVELS.includes(x.d))throw Error('Registro incompleto em '+category);
        const key=x.w.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        if(keys.has(key))throw Error('Palavra repetida em '+category+': '+x.w);
        keys.add(key);levels.add(x.d);
      }
      if(levels.size!==3)throw Error('Níveis incompletos em '+category);
      report[category]=words.length;total+=words.length;
    }
    return {report,total};
  }
  return {LEVELS,PHRASES,randomInt,shuffle,maxImpostors,wordKey,selectWord,selectOpening,validateBank};
});
