import {timeBucket,type Aggregation} from './timeAggregation';
const keys=['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'];
export function summarizeExternal(source:any,period:string,requested:string,now=Date.now()){
 const raw=(source.series??[]).filter((p:any)=>Date.parse(p.bucket)<=now);
 const days:Record<string,number>={'1h':1/24,'24h':1,'7d':7,'30d':30,'365d':365};
 const since=period==='all'?(raw[0]?.bucket??new Date(now-86400000).toISOString()):new Date(now-(period.endsWith('h')?Number(period.slice(0,-1))/24:days[period]??30)*86400000).toISOString();
 const points=raw.filter((p:any)=>Date.parse(p.bucket)>=Date.parse(since));
 const aggregation:Aggregation=requested==='auto'?((now-Date.parse(since))/86400000<=2?'hour':(now-Date.parse(since))/86400000<=92?'day':'month'):requested as Aggregation;
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

export function readingRecommendations(data:any){
 const last=(key:string)=>[...data.series].reverse().find((p:any)=>typeof p[key]==='number'&&Number.isFinite(p[key]))?.[key] as number|undefined;
 const temperature=last('temperature_c'),humidity=last('humidity_pct');const format=(value:number)=>new Intl.NumberFormat('es-CO',{maximumFractionDigits:1}).format(value);
 return [
 {title:temperature===undefined?'Confirma la temperatura':temperature>=30?'Temperatura elevada':'Observa la temperatura',text:temperature===undefined?'Sin lecturas de temperatura no se pueden evaluar sus cambios. Revisa la comunicación y el período elegido.':`Último intervalo: ${format(temperature)} °C. ${temperature>=30?'Revisa la ventilación del lugar si corresponde y evita fuentes de calor junto al sensor.':'Observa si hay subidas sostenidas y revisa el lugar de instalación si aparecen saltos bruscos.'}`},
 {title:humidity===undefined?'Comprueba la humedad':humidity>=80?'Humedad elevada':'Temperatura y humedad juntas',text:humidity===undefined?'No hay humedad disponible en este período. No se interpreta como cero; comprueba el sensor antes de sacar conclusiones.':`Humedad del último intervalo: ${format(humidity)} %. ${humidity>=80?'Revisa el lugar de instalación y los límites recomendados para los equipos o materiales que quieres proteger.':'Consulta ambas curvas para distinguir un cambio general del entorno de una variación aislada del sensor.'}`},
 {title:data.wet_samples>0?'Revisa la protección frente al agua':'Seguimiento y próximos pasos',text:(data.wet_samples>0?'Se detectó agua en la placa: revisa la instalación y la protección del equipo. No equivale a milímetros de lluvia. ':'Configura una regla con el límite que necesitas vigilar y comprueba si la tendencia persiste antes de actuar. ')+ '30 °C y 80 % son referencias visuales, no son límites universales ni modifican tus reglas.'}
 ];
}
