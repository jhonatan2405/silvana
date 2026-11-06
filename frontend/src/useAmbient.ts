import {useInteractionSound} from './useInteractionSound';
import {useEffect,useRef,useState} from 'react';
import type {LightMode} from './Scene';
import {ambientPhase,createAmbientSound,type AmbientSound} from './ambientSound';
export function useAmbient(mode:LightMode,raining:boolean,available:boolean,options:{automatic?:boolean;storm?:boolean}={}){
 const pending=useRef(false),generation=useRef(0),sound=useRef<AmbientSound|null>(null);
 const [enabled,setEnabled]=useState(false),[error,setError]=useState('');
 const phase=ambientPhase(mode,options.automatic??false),storm=options.storm??false;
 const cue=useInteractionSound(available);
 const toggle=async()=>{
  if(pending.current)return;setError('');
  if(sound.current){generation.current++;sound.current.stop();sound.current=null;setEnabled(false);return;}
  pending.current=true;const token=++generation.current;let next:AmbientSound|null=null;
  try{next=await createAmbientSound();if(generation.current!==token){next.stop();return;}sound.current=next;next.setProfile({phase,raining,storm});setEnabled(true);}
  catch{next?.stop();if(generation.current===token){sound.current=null;setError('El navegador no pudo activar el audio. Intenta otra vez.');}}
  finally{pending.current=false;}
 };
 useEffect(()=>{sound.current?.setProfile({phase,raining,storm});},[phase,raining,storm,enabled]);
 useEffect(()=>{if(!available){generation.current++;sound.current?.stop();sound.current=null;setEnabled(false);}},[available]);
 useEffect(()=>{
  const visibility=()=>{const context=sound.current?.context;if(context){if(document.hidden)void context.suspend();else void context.resume().catch(()=>setError('Pulsa el control de sonido para reactivar el audio.'));}};
  const lightning=()=>sound.current?.thunder();
  document.addEventListener('visibilitychange',visibility);window.addEventListener('silvana:lightning',lightning);
  return()=>{generation.current++;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('silvana:lightning',lightning);sound.current?.stop();sound.current=null;};
 },[]);
 return {enabled,error,toggle,cue};
}
