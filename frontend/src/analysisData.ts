import {timeBucket,type Aggregation} from './timeAggregation';
const keys=['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'];
export function summarizeExternal(source:any,period:string,requested:string,now=Date.now()){
 const raw=(source.series??[]).filter((p:any)=>Date.parse(p.bucket)<=now);
 const days:Record<string,number>={'1h':1/24,'24h':1,'7d':7,'30d':30,'365d':365};
 const since=period==='all'?(raw[0]?.bucket??new Date(now-86400000).toISOString()):new Date(now-(days[period]??30)*86400000).toISOString();
 const points=raw.filter((p:any)=>Date.parse(p.bucket)>=Date.parse(since));
 const aggregation:Aggregation=requested==='auto'?(period==='365d'?'month':['7d','30d'].includes(period)?'day':'hour'):requested as Aggregation;
 const stats=(items:any[],key:string)=>{const values=items.map(p=>p[key]).filter(v=>typeof v==='number'&&Number.isFinite(v));const average=values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;return {count:values.length,average,minimum:values.length?Math.min(...values):null,maximum:values.length?Math.max(...values):null,standard_deviation:average===null?null:Math.sqrt(values.reduce((sum,v)=>sum+(v-average)**2,0)/values.length)};};
 const groups=new Map<string,any[]>();for(const point of points){const bucket=timeBucket(point.bucket,aggregation);groups.set(bucket,[...(groups.get(bucket)??[]),point]);}
 return {source,device_id:'external',period,aggregation,since,until:new Date(now).toISOString(),samples:points.length,wet_samples:0,rain_samples:0,last_received_at:points.at(-1)?.bucket??null,metrics:Object.fromEntries(keys.map(key=>[key,stats(points,key)])),series:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([bucket,items])=>({bucket,samples:items.length,...Object.fromEntries(keys.flatMap(key=>{const s=stats(items,key);return [[key,s.average],[key+'_count',s.count],[key+'_min',s.minimum],[key+'_max',s.maximum]];}))})),sync:{last_success_at:source.fetched_at,unavailable:source.stale,catching_up:false}};
}
export function analysisInsights(data:any,metric:string,unit:string){
 const stat=data.metrics[metric],valid=data.series.filter((p:any)=>typeof p[metric]==='number'),format=(n:number)=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}).format(n);
 return [
 {title:'Cambio en el período',text:valid.length>1?`Entre el primer y el último intervalo con datos, la variable ${valid.at(-1)[metric]>=valid[0][metric]?'aumentó':'disminuyó'} ${format(Math.abs(valid.at(-1)[metric]-valid[0][metric]))} ${unit}. No es una predicción.`:'Se necesitan al menos dos intervalos con mediciones para describir un cambio.'},
 {title:'Variación observada',text:stat?.count?`Los valores disponibles van de ${format(stat.minimum)} a ${format(stat.maximum)} ${unit}. Amplitud de ${format(stat.maximum-stat.minimum)} ${unit}.`:'Esta fuente no entrega la variable elegida en este período. No se interpreta como un valor cero.'},
 {title:'Antes de comparar',text:data.source?`${data.source.coverage_note??data.source.note??'Consulta la cobertura del proveedor.'} Las diferencias espaciales y temporales pueden influir en la comparación.`:data.samples?`${format(stat.count/data.samples*100)}% de las lecturas incluyen esta variable. Los intervalos sin datos no permiten concluir que el entorno estuvo estable.`:'No hay mediciones en este período. Amplía el rango o comprueba la comunicación de la estación.'}
 ];
}
