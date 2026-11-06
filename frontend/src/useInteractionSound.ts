import {useCallback,useEffect,useRef} from 'react';
export type InteractionCue='hover'|'tap'|'navigate'|'enter'|'exit';
type InteractionSound={context:AudioContext;cue:(kind:InteractionCue)=>void;stop:()=>void};
function createInteractionSound():InteractionSound{
 const context=new AudioContext({latencyHint:'interactive'}),master=context.createGain();master.gain.value=.22;master.connect(context.destination);
 const sources=new Set<AudioScheduledSourceNode>(),nodes=new Set<AudioNode>();let stopped=false;
 const keep=<T extends AudioNode>(node:T)=>{nodes.add(node);return node;};
 const gain=()=>keep(context.createGain());
 const start=(source:AudioScheduledSourceNode,when:number)=>{sources.add(source);source.start(when);};
  let lastHover=-Infinity,lastAction=-Infinity;
  const cue=(kind:InteractionCue)=>{
   if(stopped||context.state!=='running'||document.hidden)return;
   const now=context.currentTime;
   if(kind==='hover'){if(now-lastHover<.18||now-lastAction<.15)return;lastHover=now;}
   else{if(now-lastAction<.08)return;lastAction=now;}
   const notes=kind==='enter'?[392,523.25,659.25]:kind==='exit'?[659.25,523.25,392]:kind==='navigate'?[440,587.33]:kind==='tap'?[523.25]:[740];
   const duration=kind==='hover'?.055:kind==='tap'?.09:kind==='navigate'?.16:.32;
   notes.forEach((frequency,index)=>{
    const oscillator=keep(context.createOscillator()),envelope=gain(),pan=keep(context.createStereoPanner());
    const when=now+index*(kind==='navigate'?.045:.075);
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,when);oscillator.frequency.exponentialRampToValueAtTime(frequency*.98,when+duration);
    envelope.gain.setValueAtTime(0,when);envelope.gain.linearRampToValueAtTime(kind==='hover'?.045:kind==='tap'?.10:.14,when+.008);envelope.gain.exponentialRampToValueAtTime(.0001,when+duration);
    pan.pan.value=(index-(notes.length-1)/2)*.16;
    oscillator.connect(envelope);envelope.connect(pan);pan.connect(master);start(oscillator,when);oscillator.stop(when+duration+.025);
    oscillator.onended=()=>{sources.delete(oscillator);for(const node of [oscillator,envelope,pan]){node.disconnect();nodes.delete(node);}};
   });
  };

 const stop=()=>{stopped=true;for(const source of sources){try{source.stop();}catch{}}sources.clear();for(const node of nodes)node.disconnect();nodes.clear();master.disconnect();void context.close();};
 return {context,cue,stop};
}
export function useInteractionSound(available:boolean){
 const sound=useRef<InteractionSound|null>(null);
 const cue=useCallback((kind:InteractionCue)=>sound.current?.cue(kind),[]);
 useEffect(()=>{
  if(!available)return;
  const unlock=()=>{
   if(document.hidden)return;
   try{sound.current??=createInteractionSound();if(sound.current.context.state==='suspended')void sound.current.context.resume().catch(()=>{});}catch{/* Retry after another user gesture if audio is unavailable. */}
  };
  const control=(target:EventTarget|null)=>{
   if(!(target instanceof Element))return null;
   const element=target.closest<HTMLElement>('button,a[href],select,summary');
   if(!element||element.matches(':disabled,[aria-disabled="true"]')||element.closest('[inert]')||/sonido/i.test(element.getAttribute('aria-label')??''))return null;
   return element;
  };
  const hover=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;const target=control(event.target);if(!target||event.relatedTarget instanceof Node&&target.contains(event.relatedTarget))return;cue('hover');};
  const click=(event:MouseEvent)=>{const target=control(event.target);if(target)cue(target.closest('nav,[role="group"],.environment-menu')?'navigate':'tap');};
  const visibility=()=>{const context=sound.current?.context;if(!context)return;if(document.hidden)void context.suspend();else void context.resume().catch(()=>{});};
  document.addEventListener('pointerdown',unlock,{capture:true,passive:true});document.addEventListener('keydown',unlock,true);
  document.addEventListener('pointerover',hover,{passive:true});document.addEventListener('click',click,{passive:true});document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('keydown',unlock,true);document.removeEventListener('pointerover',hover);document.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);sound.current?.stop();sound.current=null;};
 },[available,cue]);
 return cue;
}
