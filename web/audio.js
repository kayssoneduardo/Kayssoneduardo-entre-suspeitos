/* Trilha instrumental ORIGINAL criada para Entre Suspeitos. Nenhuma música de terceiros.
   Síntese WebAudio em tempo real; funciona sem internet. */
(function(){
 'use strict';
 let ctx=null,drone=null,clock=null,step=0, nextBeat=0, playing=false;
 const BPM=77,BEAT=60/BPM;
 const melody=[196,0,174.61,0,146.83,164.81,0,0,196,0,220,0,174.61,146.83,0,0,
                164.81,0,146.83,0,130.81,0,146.83,0,174.61,0,164.81,0,146.83,0,0,0];
 function activate(){
  if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;try{ctx=new C();}catch{return false;}}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true;
 }
 function note(freq,at,length,gain=.018,type='sine',low=1000){
  if(!ctx||!Number.isFinite(freq)||freq<=0)return;
  try{const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),v=ctx.createGain();
   osc.type=type;osc.frequency.setValueAtTime(freq,at);
   filter.type='lowpass';filter.frequency.setValueAtTime(low,at);
   v.gain.setValueAtTime(.0001,at);v.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),at+.04);
   v.gain.exponentialRampToValueAtTime(.0001,at+length);
   osc.connect(filter);filter.connect(v);v.connect(ctx.destination);osc.start(at);osc.stop(at+length+.08);
  }catch{}
 }
 function playBeat(at){
  const i=step++%melody.length;
  if(melody[i])note(melody[i],at,BEAT*.85,.012,'triangle',700);
  if(i%4===0){note(65.41,at,BEAT*3.8,.010,'sine',220);note(98.0,at,BEAT*3.6,.004,'triangle',190);}
  if(i%2===0)note(523.25,at,BEAT*.09,.003,'sine',900);
  if(i%8===7)note(73.42,at,BEAT*.9,.009,'sawtooth',160);
 }
 function music(on){
  if(!on){stop();return;}if(!activate()||playing)return;
  playing=true;nextBeat=ctx.currentTime+.1;
  clock=setInterval(()=>{if(!playing||!ctx)return;
   while(nextBeat<ctx.currentTime+.65){playBeat(nextBeat);nextBeat+=BEAT/2;}
  },145);
 }
 function stop(){playing=false;if(clock){clearInterval(clock);clock=null;}if(drone){try{drone.stop();}catch{}drone=null;}}
 function effect(name,enabled=true){
  if(!enabled||!activate())return;
  const t=ctx.currentTime+.015;
  if(name==='tap')note(330,t,.09,.017,'sine',850);
  if(name==='reveal'){note(196,t,.38,.03,'sine',650);note(293.66,t+.11,.34,.02,'triangle',800);}
  if(name==='impostor'){note(130.81,t,.45,.04,'sawtooth',260);note(92.50,t+.17,.48,.032,'triangle',320);}
  if(name==='finish'){[220,261.63,329.63].forEach((f,i)=>note(f,t+i*.15,.35,.025,'triangle',870));}
  if(name==='special'){[196,164.81,130.81].forEach((f,i)=>note(f,t+i*.16,.35,.022,'sine',500));}
  if(name==='timer'){note(587.33,t,.2,.04,'triangle',960);note(440,t+.24,.33,.033,'triangle',800);}
  if(name==='vote')note(392,t,.16,.025,'sine',800);
 }
 window.ESAudio={activate,effect,music,stop};
})();
