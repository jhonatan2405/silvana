import { useEffect, useRef, useState } from 'react';

export function SilvanaMark({animated=false,className=''}:{animated?:boolean;className?:string}){
 return <svg className={'silvana-mark '+(animated?'is-alive ':'')+className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <path d="M30 36C14 39 8 28 10 17c16-1 23 8 20 19Z" fill="#A5CEAA"/>
  <path d="M31 27C29 15 38 8 50 8c1 14-7 22-19 19Z" fill="#5CA580"/>
  <path d="M29 46c2-12 13-15 24-12-4 12-13 17-24 12Z" fill="#C0D8AA"/>
  <path className="silvana-stem" d="M28 56c-3-13 9-20 3-39M30 34 17 23M32 25 44 14M29 44l16-7" stroke="#EAF1D5" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>;
}
export function SilvanaBrand(){
 return <span className="silvana-brand"><SilvanaMark/><span>silvana</span></span>;
}
function LoadingSculpture({complete}:{complete:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),finished=useRef(complete);finished.current=complete;
 const [ready,setReady]=useState(false);
 useEffect(()=>{let cancelled=false;let dispose:(()=>void)|undefined;import('./brandWorld').then(({createBrandWorld})=>{if(cancelled)return;try{dispose=createBrandWorld(canvas.current!,()=>finished.current);setReady(true);}catch{setReady(false);}}).catch(()=>setReady(false));return()=>{cancelled=true;dispose?.();};},[]);
 return <div className={'silvana-sculpture'+(ready?' is-ready':'')} aria-hidden="true"><SilvanaMark animated={!complete}/><canvas ref={canvas}/></div>;
}
export function BrandLoading({label='Preparando tu entorno',kind='inline',complete=false}:{label?:string;detail?:string;kind?:'inline'|'page'|'card';complete?:boolean}){
 return <div className={'brand-loading brand-loading-'+kind+(complete?' is-complete':'')} role="status" aria-label={label} aria-live="polite"><LoadingSculpture complete={complete}/><span className="brand-loading-wordmark" aria-hidden="true">silvana</span></div>;
}
