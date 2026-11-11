import {localSolarHour,lightAtHour} from './solar';
import { useEffect, useRef, useState } from 'react';
export type Weather = 'custom' | 'auto' | 'day' | 'sunset' | 'dusk' | 'night';
export type LightMode = Exclude<Weather, 'auto'|'custom'>;
export function monteriaHour() { return Number(new Intl.DateTimeFormat('en-GB', { timeZone:'America/Bogota',hour:'2-digit',hourCycle:'h23' }).format(new Date())); }
export function resolvedWeather(weather:Weather,hour?:number):LightMode { return weather==='auto'?lightAtHour(localSolarHour()):weather==='custom'?lightAtHour(hour??12):weather; }
const solarHour=localSolarHour;
const selectedHours:Record<LightMode,number>={day:12,sunset:17.5,dusk:18.5,night:22};
export type EnvironmentConditions={cloudCover?:number;rainIntensity?:number;windStrength?:number};
export type SceneState = {mode:LightMode;rain:boolean;register:boolean;hour:number;automatic:boolean;storm:boolean;motion:boolean;cloudCover:number;precipitation:number;windStrength:number;dashboard:boolean};
export default function Scene({weather,rain,storm,register,motion,conditions,simulationHour,dashboard=false}:{weather:Weather;rain:boolean;register:boolean;storm:boolean;motion:boolean;conditions?:EnvironmentConditions;simulationHour?:number;dashboard?:boolean}) {
 const bounded=(value:number|undefined,fallback:number)=>value===undefined||!Number.isFinite(value)?fallback:Math.min(1,Math.max(0,value));
 const precipitation=bounded(conditions?.rainIntensity,rain||storm?1:0),cloudCover=bounded(conditions?.cloudCover,precipitation>0?.97:.18),windStrength=bounded(conditions?.windStrength,storm?1:precipitation>0?.62:.15);
 const canvas=useRef<HTMLCanvasElement>(null);const mode=resolvedWeather(weather,simulationHour);const current=useRef<SceneState>({mode,rain:precipitation>0,precipitation,cloudCover,windStrength,storm,register,hour:weather==='auto'?solarHour():weather==='custom'?(simulationHour??12):selectedHours[mode],automatic:weather==='auto',motion,dashboard});current.current={mode,rain:precipitation>0,precipitation,cloudCover,windStrength,storm,register,hour:weather==='auto'?solarHour():weather==='custom'?(simulationHour??12):selectedHours[mode],automatic:weather==='auto',motion,dashboard};
 const[status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');
 useEffect(()=>{let cancelled=false;let dispose:(()=>void)|undefined;import('./world').then(({createWorld})=>{if(cancelled)return;dispose=createWorld(canvas.current!,()=>current.current.automatic?{...current.current,hour:solarHour()}:current.current);setStatus('ready');}).catch(()=>{if(!cancelled)setStatus('fallback');});return()=>{cancelled=true;dispose?.();};},[]);
 return <><canvas ref={canvas} className="landscape" aria-hidden="true"/>{status==='fallback'&&<span className="scene-render-status" role="status">La vista ambiental no está disponible en este navegador.</span>}</>;
}

