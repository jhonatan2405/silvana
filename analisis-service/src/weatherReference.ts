import {z} from 'zod';

export type Period='1h'|'24h'|'7d'|'30d'|'365d'|'all';
const numberOrNull=z.number().finite().nullable();
const source=z.object({latitude:z.number(),longitude:z.number(),hourly:z.object({time:z.array(z.string()).max(900),temperature_2m:z.array(numberOrNull),relative_humidity_2m:z.array(numberOrNull),surface_pressure:z.array(numberOrNull),precipitation:z.array(numberOrNull)})});
const days={ '1h':1/24,'24h':1,'7d':7,'30d':30,'365d':30,'all':30 };
export function createWeatherReference(fetcher:typeof fetch=fetch,now=()=>Date.now()){
 const cache=new Map<Period,{at:number;data:any}>(),pending=new Map<Period,Promise<any>>(),retryAfter=new Map<Period,number>();
 return async function reference(period:Period){
  const saved=cache.get(period);const stale=()=>saved&&now()-saved.at<3600000?{...saved.data,stale:true}:null;
  if(saved&&now()-saved.at<600000)return {...saved.data,stale:false};
  if(now()<(retryAfter.get(period)??0)){const previous=stale();if(previous)return previous;throw new Error('WEATHER_UNAVAILABLE');}
  if(pending.has(period))return pending.get(period)!;
  const operation=(async()=>{try{
   const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:'8.75',longitude:'-75.88',hourly:'temperature_2m,relative_humidity_2m,surface_pressure,precipitation',past_days:String(Math.ceil(days[period])+1),forecast_days:'1',timezone:'GMT'}).toString();
   const response=await fetcher(url,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw new Error('WEATHER_UNAVAILABLE');
   const body=source.parse(await response.json());const h=body.hourly;if([h.temperature_2m,h.relative_humidity_2m,h.surface_pressure,h.precipitation].some(values=>values.length!==h.time.length))throw new Error('WEATHER_INVALID');
   const end=now(),since=end-days[period]*86400000;
   const series=h.time.map((time,index)=>({bucket:time+'Z',temperature_c:h.temperature_2m[index],humidity_pct:h.relative_humidity_2m[index],pressure_hpa:h.surface_pressure[index],precipitation_mm:h.precipitation[index]})).filter(point=>{const t=Date.parse(point.bucket);return Number.isFinite(t)&&t>=Math.floor(since/3600000)*3600000&&t<=end;}).map(point=>({...point,bucket:new Date(point.bucket).toISOString()}));
   if(!series.length)throw new Error('WEATHER_EMPTY');
   const data={name:'Montería · referencia externa',provider:'Open-Meteo',source_url:'https://open-meteo.com/',license_url:'https://creativecommons.org/licenses/by/4.0/',kind:'weather_model',latitude:body.latitude,longitude:body.longitude,requested_latitude:8.75,requested_longitude:-75.88,fetched_at:new Date(end).toISOString(),period,coverage_note:period==='365d'||period==='all'?'Referencia externa limitada a los últimos 30 días; el histórico de tu estación se conserva completo.':null,series,note:'Datos de modelo meteorológico para Montería, no de una estación física. Presión a nivel de superficie; precipitación horaria en mm.'};cache.set(period,{at:end,data});retryAfter.delete(period);return {...data,stale:false};
  }catch{retryAfter.set(period,now()+60000);const previous=stale();if(previous)return previous;throw new Error('WEATHER_UNAVAILABLE');}finally{pending.delete(period);}})();pending.set(period,operation);return operation;
 };
}
