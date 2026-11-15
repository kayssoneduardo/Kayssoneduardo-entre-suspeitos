/* Entre Suspeitos V7.5: cosmetic motion controller. Purely decorative.
 * Never mutates voting, game state, progression, or secret cards. */
(function(){
'use strict';
const key='es_v75_motion_pref';
const tiers=['comum','incomum','raro','epico','lenda'];
const memo=Object.freeze({comum:0,incomum:1,raro:2,epico:3,lenda:4});
function systemReduced(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}
function systemDataSaver(){return !!(navigator.connection&&navigator.connection.saveData);}
function saved(){try{return localStorage.getItem(key);}catch{return null;}}
function mode(){const value=saved();return ['on','off','auto'].includes(value)?value:'auto';}
function enabled(){return mode()==='on'||(mode()==='auto'&&!systemReduced()&&!systemDataSaver());}
function apply(){
 if(!document.body)return;
 document.body.dataset.motion=enabled()?'on':'off';
 document.body.dataset.motionMode=mode();
 // Room voice chat and voting must remain accessible; only decoration animates.
}
function setMode(next){if(!['on','off','auto'].includes(next))return;try{localStorage.setItem(key,next);}catch{}apply();}
function enterPhase(phase){
 if(!document.body)return;
 document.body.dataset.phase=['lobby','discussion','voting','results'].includes(phase)?phase:'menu';
}
function intensity(rarity){return memo[rarity]??0;}
function resolveFrame(code){return window.ESCosmetics?.frameRarity(code)||'comum';}
function resolveBanner(code){return window.ESCosmetics?.bannerRarity(code)||'comum';}
function revealCard(card){if(!card)return;card.classList.add('es-v75-secret-flip');}
function endReveal(card){card?.classList.remove('es-v75-secret-flip');}
function outcome(win){return '<span class="es-v75-result-spark '+(win?'is-win':'is-loss')+'" aria-hidden="true">✦</span>';}
function attach(){
 apply();
 if(window.matchMedia){const m=window.matchMedia('(prefers-reduced-motion: reduce)');m.addEventListener?.('change',apply);}
 document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('es-v75-paused',document.hidden);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
window.ESMotion=Object.freeze({tiers,intensity,mode,enabled,setMode,apply,enterPhase,resolveFrame,resolveBanner,revealCard,endReveal,outcome});
})();
