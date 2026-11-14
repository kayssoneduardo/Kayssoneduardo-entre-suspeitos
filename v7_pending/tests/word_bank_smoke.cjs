const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const context={window:{},crypto:require('crypto').webcrypto};vm.createContext(context);
for(const f of ['words.js','engine.js'])vm.runInContext(fs.readFileSync('web/'+f,'utf8'),context);
const bank=context.window.ES_WORD_BANK,engine=context.window.ES;
assert.equal(engine.validateBank(bank).total,1348);
assert.equal(bank['Pessoas de Loreto'].length,26);
assert(bank['Pessoas de Loreto'].every(x=>x.h===''));
for(const difficulty of ['Fácil','Médio','Difícil','Misturado']){
 const word=engine.selectWord(bank,['Pessoas de Loreto'],difficulty,new Set(),()=>0);
 assert.equal(word.c,'Pessoas de Loreto');assert.equal(word.h,'');
}
assert.throws(()=>engine.validateBank({...bank,Animais:[bank.Animais[0]]}));
console.log('PASS: complete bank loads; 26 Loreto names without hints; all difficulty modes; other category validation retained.');
