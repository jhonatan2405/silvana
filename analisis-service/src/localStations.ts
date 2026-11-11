import {z} from 'zod';
import type {Period} from './weatherReference.js';
const row=z.object({icaoId:z.literal('SKMR'),reportTime:z.string(),temp:z.number().min(-80).max(70).nullable().optional(),dewp:z.number().nullable().optional(),altim:z.number().nullable().optional(),rawOb:z.string().optional()});
export function createAirportReference(fetcher:typeof fetch=fetch,now=()=>Date.now()){
 const cache=new Map<Period,{at:number;data:any}>(),pending=new Map<Period,Promise<any>>();let retryAfter=0;
 return async(period:Period)=>{
  const old=cache.get(period);if(old&&now()-old.at<600000)return {...old.data,stale:false};
  const stale=()=>old&&now()-old.at<3600000?{...old.data,stale:true}:null;
  if(now()<retryAfter){const previous=stale();if(previous)return previous;throw new Error('AIRPORT_UNAVAILABLE');}
  if(pending.has(period))return pending.get(period)!;
  const operation=(async()=>{try{
   const hours={'1h':1,'24h':24,'7d':168,'30d':720,'365d':720,'all':720}[period];const url=new URL('https://aviationweather.gov/api/data/metar');url.search=new URLSearchParams({ids:'SKMR',format:'json',hours:String(hours)}).toString();
   const response=await fetcher(url,{headers:{'User-Agent':'Silvana-academic-weather/1.0'},signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw new Error('AIRPORT_UNAVAILABLE');
   const reports=response.status===204?[]:z.array(row).max(400).parse(await response.json());
   const series=reports.filter(p=>Number.isFinite(Date.parse(p.reportTime))&&Date.parse(p.reportTime)<=now()&&Date.parse(p.reportTime)>=now()-hours*3600000).map(p=>({bucket:new Date(p.reportTime).toISOString(),temperature_c:p.temp??null,humidity_pct:p.temp!=null&&p.dewp!=null?Math.round(Math.max(0,Math.min(100,100*Math.exp(17.625*p.dewp/(243.04+p.dewp)-17.625*p.temp/(243.04+p.temp))))*10)/10:null,pressure_hpa:null,altimeter_hpa:p.altim??null,precipitation_mm:null,raw_report:p.rawOb??null})).sort((a,b)=>a.bucket.localeCompare(b.bucket));
   const data={name:'Los Garzones · SKMR',provider:'NOAA / Aviation Weather Center',source_url:'https://aviationweather.gov/data/api/',license_url:null,kind:'airport_observation',period,latitude:8.823,longitude:-75.826,fetched_at:new Date(now()).toISOString(),series,coverage_note:'Observaciones disponibles de hasta 30 días y 400 reportes por consulta. La humedad se calcula a partir de temperatura y punto de rocío. La presión altimétrica no se compara con presión de superficie. No se infieren milímetros de lluvia.'};cache.set(period,{at:now(),data});return {...data,stale:false};
  }catch{retryAfter=now()+60000;const previous=stale();if(previous)return previous;throw new Error('AIRPORT_UNAVAILABLE');}finally{pending.delete(period);}})();pending.set(period,operation);return operation;
 };
}
