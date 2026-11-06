import type {LightMode} from './Scene';
export type AmbientPhase='dawn'|'day'|'dusk'|'night';
export type AmbientProfile={phase:AmbientPhase;raining:boolean;storm:boolean};
export type AmbientSound={context:AudioContext;setProfile:(profile:AmbientProfile)=>void;thunder:()=>void;stop:()=>void};
const random=(min:number,max:number)=>min+Math.random()*(max-min);
export async function createAmbientSound():Promise<AmbientSound>{
 const context=new AudioContext({latencyHint:'playback'});
 const sources=new Set<AudioScheduledSourceNode>(),nodes=new Set<AudioNode>(),worklets:AudioWorkletNode[]=[];
 let stopped=false,profile:AmbientProfile={phase:'day',raining:false,storm:false};
 let timer:ReturnType<typeof setInterval>|undefined;
 const keep=<T extends AudioNode>(node:T)=>{nodes.add(node);return node;};
 const gain=(value=0)=>{const node=keep(context.createGain());node.gain.value=value;return node;};
 const filter=(type:BiquadFilterType,frequency:number,q=.7)=>{const node=keep(context.createBiquadFilter());node.type=type;node.frequency.value=frequency;node.Q.value=q;return node;};
 const master=gain(),compressor=keep(context.createDynamicsCompressor());compressor.threshold.value=-18;compressor.ratio.value=3;compressor.attack.value=.012;compressor.release.value=.35;master.connect(compressor);compressor.connect(context.destination);
 const wind=gain(),river=gain(),rainNear=gain(),rainFar=gain(),insects=gain(),birds=gain(),thunder=gain();
 for(const bus of [wind,river,rainNear,rainFar,insects,birds,thunder])bus.connect(master);
 const start=(source:AudioScheduledSourceNode,when=context.currentTime)=>{sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();};source.start(when);};
 const stop=()=>{if(stopped)return;stopped=true;if(timer)clearInterval(timer);const now=context.currentTime;master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(0,now+.06);setTimeout(()=>{for(const source of sources){try{source.stop();}catch{}}sources.clear();for(const node of worklets){node.port.postMessage('stop');node.port.close();}for(const node of nodes)node.disconnect();void context.close();},90);};
 try{
  // Resume during the button gesture, before awaiting the processor download.
  await context.resume();
  let liveNoise=false;
  if(context.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
   try{await context.audioWorklet.addModule(new URL('./ambientNoise.worklet.js?no-inline',import.meta.url));liveNoise=true;}catch{/* Long, independently phased buffers support older audio engines. */}
  }
  const noise=(kind:'wind'|'river'|'rain',destination:AudioNode)=>{
   if(liveNoise){const node=keep(new AudioWorkletNode(context,'silvana-ambient-noise',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{kind}}));worklets.push(node);node.connect(destination);return;}
   for(let layer=0;layer<2;layer++){
    const duration=layer?53:37,buffer=context.createBuffer(2,Math.ceil(context.sampleRate*duration),context.sampleRate);
    for(let c=0;c<2;c++){const data=buffer.getChannelData(c);let brown=0;for(let i=0;i<data.length;i++){const white=Math.random()*2-1;brown=(brown+white*.02)/1.02;const edge=Math.min(1,i/(context.sampleRate*.5),(data.length-1-i)/(context.sampleRate*.5));data[i]=(kind==='rain'?white*.30:brown*3)*edge;}}
    const source=keep(context.createBufferSource());source.buffer=buffer;source.loop=true;const mix=gain(.5);source.connect(mix);mix.connect(destination);start(source,context.currentTime);source.loopStart=0;source.loopEnd=duration;
   }
  };
  const windFilter=filter('lowpass',650),riverFilter=filter('lowpass',1900),rainHigh=filter('highpass',420),rainLow=filter('lowpass',8200),distantFilter=filter('lowpass',820);
  windFilter.connect(wind);riverFilter.connect(river);rainHigh.connect(rainLow);rainLow.connect(rainNear);distantFilter.connect(rainFar);
  noise('wind',windFilter);noise('river',riverFilter);noise('rain',rainHigh);noise('river',distantFilter);
  const insectFilter=filter('bandpass',4800,4),insectBed=gain(.025);insectFilter.connect(insectBed);insectBed.connect(insects);noise('rain',insectFilter);
  const room=keep(context.createConvolver()),roomGain=gain(.09),impulse=context.createBuffer(2,Math.floor(context.sampleRate*.7),context.sampleRate);
  for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/context.sampleRate*13)*.2;}
  room.buffer=impulse;birds.connect(room);room.connect(roomGain);roomGain.connect(master);
  const birdCall=()=>{
   const now=context.currentTime+.05,base=random(1500,2700),count=Math.floor(random(2,6)),direction=random(-.85,.85),duration=random(.09,.23);
   for(let i=0;i<count;i++){
    const when=now+i*(duration+random(.07,.15));const oscillator=keep(context.createOscillator()),envelope=gain(),pan=keep(context.createStereoPanner());
    oscillator.type='sine';const pitch=base*random(.82,1.22);oscillator.frequency.setValueAtTime(pitch,when);oscillator.frequency.exponentialRampToValueAtTime(pitch*random(1.15,1.55),when+duration*.38);oscillator.frequency.exponentialRampToValueAtTime(pitch*random(.72,1.05),when+duration);
    envelope.gain.setValueAtTime(0,when);envelope.gain.linearRampToValueAtTime(random(.025,.055),when+.018);envelope.gain.exponentialRampToValueAtTime(.0001,when+duration);pan.pan.value=direction;
    oscillator.connect(envelope);envelope.connect(pan);pan.connect(birds);start(oscillator,when);oscillator.stop(when+duration+.03);oscillator.onended=()=>{sources.delete(oscillator);for(const node of [oscillator,envelope,pan]){node.disconnect();nodes.delete(node);}};
   }
  };
  const cricket=()=>{
   const now=context.currentTime+.03,oscillator=keep(context.createOscillator()),envelope=gain(),pan=keep(context.createStereoPanner());const count=Math.floor(random(5,12)),period=random(.064,.10),frequency=random(3400,5500);
   oscillator.frequency.value=frequency;pan.pan.value=random(-.9,.9);envelope.gain.setValueAtTime(0,now);
   for(let i=0;i<count;i++){const t=now+i*period;envelope.gain.setValueAtTime(.0001,t);envelope.gain.linearRampToValueAtTime(random(.015,.028),t+.01);envelope.gain.exponentialRampToValueAtTime(.0001,t+period*.65);}
   oscillator.connect(envelope);envelope.connect(pan);pan.connect(insects);start(oscillator,now);oscillator.stop(now+count*period+.06);oscillator.onended=()=>{sources.delete(oscillator);for(const node of [oscillator,envelope,pan]){node.disconnect();nodes.delete(node);}};
  };
  const rumble=()=>{
   if(stopped||!profile.raining||!profile.storm||context.state!=='running')return;
   const duration=random(5.5,8),buffer=context.createBuffer(2,Math.ceil(context.sampleRate*duration),context.sampleRate);
   for(let c=0;c<2;c++){const data=buffer.getChannelData(c);let state=0;const rollFrequency=random(1.1,1.5),rollPhase=random(0,6);for(let i=0;i<data.length;i++){const t=i/context.sampleRate;state=(state+(Math.random()*2-1)*.055)/1.055;const attack=Math.min(1,t/.35);const tail=Math.exp(-t*.55);const roll=.65+.35*Math.sin(t*rollFrequency+rollPhase);data[i]=state*attack*tail*roll;}}
   const source=keep(context.createBufferSource()),low=filter('lowpass',random(260,460)),envelope=gain(),pan=keep(context.createStereoPanner());const now=context.currentTime+random(1.1,2.4);
   source.buffer=buffer;pan.pan.value=random(-.55,.55);envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(.8,now+.45);envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
   source.connect(low);low.connect(envelope);envelope.connect(pan);pan.connect(thunder);start(source,now);source.onended=()=>{sources.delete(source);for(const node of [source,low,envelope,pan]){node.disconnect();nodes.delete(node);}};
  };
  let nextBird=context.currentTime+random(1,4),nextCricket=context.currentTime+random(1,3),nextGust=context.currentTime;
  const target=(param:AudioParam,value:number,seconds=2)=>param.setTargetAtTime(value,context.currentTime,seconds);
  const setProfile=(next:AmbientProfile)=>{
   if(stopped)return;profile=next;const night=next.phase==='night',twilight=next.phase==='dusk';
   target(master.gain,.22,.45);target(wind.gain,next.raining?.23:.16);target(river.gain,next.raining?.46:.19,3);target(rainNear.gain,next.raining?.33:0,1.8);target(rainFar.gain,next.raining?.65:0,2.8);
   target(insects.gain,next.raining?.035:night?.85:twilight?.46:.08,2.5);target(birds.gain,next.raining?.03:next.phase==='dawn'?.95:next.phase==='day'?.6:twilight?.25:0,2.5);target(thunder.gain,next.storm&&next.raining?1:0,.18);
  };
  timer=setInterval(()=>{
   if(stopped||context.state!=='running')return;const now=context.currentTime;
   if(now>=nextGust){target(windFilter.frequency,random(profile.raining?350:240,profile.raining?1300:900),random(2,5));target(riverFilter.frequency,random(profile.raining?1100:700,profile.raining?2800:1800),random(3,7));nextGust=now+random(4,11);}
   if(now>=nextBird){if(profile.phase!=='night'&&!profile.raining)birdCall();nextBird=now+random(profile.phase==='dawn'?2.5:6,profile.phase==='dawn'?8:19);}
   if(now>=nextCricket){if((profile.phase==='night'||profile.phase==='dusk')&&!profile.raining)cricket();nextCricket=now+random(1.3,5.5);}
  },500);
  return {context,setProfile,thunder:rumble,stop};
 }catch(error){stop();throw error;}
}
export function ambientPhase(mode:LightMode,automatic:boolean):AmbientPhase{
 if(!automatic)return mode==='night'?'night':mode==='dusk'||mode==='sunset'?'dusk':'day';
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Bogota',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
 return hour>=5&&hour<8?'dawn':hour>=8&&hour<17?'day':hour>=17&&hour<19?'dusk':'night';
}
