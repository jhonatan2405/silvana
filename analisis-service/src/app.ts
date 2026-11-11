import {createAirportReference} from './localStations.js';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {createHttp,HttpError} from './http.js';
import {createWeatherReference} from './weatherReference.js';
import {openDatabase,utcDate,type Database} from './database.js';
import {serviceRoot} from './config.js';
import {ownedDevice,owner,createWorker} from './upstream.js';
export async function initializeAnalysis(db:Database){await db.exec(await readFile(new URL('../migrations/001_analysis.sql',import.meta.url),'utf8'));if(db.kind==='postgres')await db.exec('ALTER TABLE analysis_samples ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE analysis_samples FROM anon, authenticated;');}
export async function createAnalysis(options:{databaseUrl?:string;logger?:boolean;origin?:string;authUrl?:string;devicesUrl?:string;receptionUrl?:string;internalToken?:string;startWorker?:boolean;weatherFetch?:typeof fetch}={}){
 const db=openDatabase(options.databaseUrl??process.env.DATABASE_URL??'sqlite:///./analysis.db',serviceRoot);try{await initializeAnalysis(db);}catch(error){await db.close();throw error;}
 const app=createHttp('analisis',options.origin??process.env.FRONTEND_ORIGIN??'http://localhost:5173',options.logger??true);
 const authUrl=options.authUrl??process.env.AUTH_SERVICE_URL??'http://127.0.0.1:8001',devicesUrl=options.devicesUrl??process.env.DEVICES_SERVICE_URL??'http://127.0.0.1:8002';
 const worker=createWorker(options.receptionUrl??process.env.RECEPTION_SERVICE_URL??'http://127.0.0.1:8003',options.internalToken??process.env.INTERNAL_SERVICE_TOKEN,'analysis',async items=>{
  const values:unknown[]=[];const groups=items.map((item,index)=>{values.push(item.id,item.device_id,item.owner_id,new Date(item.measured_at),new Date(item.received_at),...['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'].map(key=>item.measurements[key]??null),item.measurements.rain_detected===undefined?null:item.measurements.rain_detected?1:0);return '('+Array.from({length:10},(_,column)=>'$'+(index*10+column+1)).join(',')+')';});
  await db.query('INSERT INTO analysis_samples(reading_id,device_id,owner_id,measured_at,received_at,temperature_c,humidity_pct,pressure_hpa,temperature_bmp_c,rain_detected) VALUES '+groups.join(',')+' ON CONFLICT(reading_id) DO NOTHING',values);
 },async()=>'1970-01-01T00:00:00.000Z');
 let timer:ReturnType<typeof setInterval>|undefined;
 app.addHook('onReady',async()=>{if(options.startWorker){void worker.run();timer=setInterval(()=>void worker.run(),5000);}});
 app.addHook('onClose',async()=>{if(timer)clearInterval(timer);await worker.finish();await db.close();});
 app.get('/health',async()=>({status:'ok',service:'analisis',runtime:'nodejs'}));app.get('/ready',async()=>{await db.query('SELECT reading_id FROM analysis_samples LIMIT 1');return {status:'ready',sync:worker.status()};});
 const weatherReference=createWeatherReference(options.weatherFetch),airportReference=createAirportReference(options.weatherFetch);
 app.get('/analysis/external',async request=>{
  const data=z.object({source:z.enum(['open-meteo','skmr']),period:z.enum(['1h','24h','7d','30d','365d','all']).default('24h')}).strict().parse(request.query);
  await owner(request.headers.cookie,authUrl);
  try{return await (data.source==='skmr'?airportReference(data.period):weatherReference(data.period));}catch{throw new HttpError(503,'La fuente externa no responde. Inténtalo en un minuto. Tus lecturas locales se conservan.');}
 });
 app.get('/analysis/reference',async request=>{
  const data=z.object({device_id:z.string().regex(/^[a-f0-9]{32}$/),period:z.enum(['1h','24h','7d','30d','365d','all']).default('24h'),source:z.enum(['open-meteo','skmr']).default('open-meteo')}).strict().parse(request.query);
  await ownedDevice(data.device_id,request.headers.cookie,authUrl,devicesUrl);
  try{return await (data.source==='skmr'?airportReference(data.period):weatherReference(data.period));}catch{throw new HttpError(503,'La referencia meteorológica no está disponible. Tus mediciones siguen disponibles; inténtalo en un minuto.');}
 });
 app.get('/analysis/summary',async request=>{
  const data=z.object({device_id:z.string().regex(/^[a-f0-9]{32}$/),period:z.enum(['1h','24h','7d','30d','365d','all']).default('24h'),aggregation:z.enum(['auto','hour','day','month','year']).default('auto')}).strict().parse(request.query);
  const user=await ownedDevice(data.device_id,request.headers.cookie,authUrl,devicesUrl);const end=new Date();const earliest=data.period==='all'?(await db.query('SELECT MIN(measured_at) AS first FROM analysis_samples WHERE owner_id=$1 AND device_id=$2 AND measured_at<=$3',[user.id,data.device_id,end]))[0]?.first:null;
  const since=data.period==='all'?(earliest?utcDate(earliest):new Date(end.getTime()-86400000)):new Date(end.getTime()-({'1h':1/24,'24h':1,'7d':7,'30d':30,'365d':365}[data.period])*86400000);
  const duration=(end.getTime()-since.getTime())/86400000;const aggregation=data.aggregation==='auto'?(duration<=2?'hour':duration<=92?'day':duration<=1825?'month':'year'):data.aggregation;
  if(aggregation==='hour'&&duration>93)throw new HttpError(422,'Para más de 93 días, agrupa por día, mes o año.');
  if(aggregation==='day'&&duration>3660)throw new HttpError(422,'Para más de 10 años, agrupa por mes o año.');
  const where='owner_id=$1 AND device_id=$2 AND measured_at>=$3 AND measured_at<=$4',params=[user.id,data.device_id,since,end];
  const columns=['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'] as const;
  const aggregate=columns.map(key=>`COUNT(${key}) AS ${key}_count, AVG(${key}) AS ${key}_avg, MIN(${key}) AS ${key}_min, MAX(${key}) AS ${key}_max, AVG(${key}*${key}) AS ${key}_square`).join(',');
  const sqliteFormats={hour:'%Y-%m-%dT%H:00:00Z',day:'%Y-%m-%dT05:00:00Z',month:'%Y-%m-01T05:00:00Z',year:'%Y-01-01T05:00:00Z'};
  const bucket=db.kind==='postgres'?(aggregation==='hour'?"date_trunc('hour',measured_at)":`date_trunc('${aggregation}',measured_at AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'`):`strftime('${sqliteFormats[aggregation]}',${aggregation==='hour'?'measured_at':"datetime(measured_at,'-5 hours')"})`;
  const hourly=columns.map(key=>`AVG(${key}) AS ${key},MIN(${key}) AS ${key}_min,MAX(${key}) AS ${key}_max,COUNT(${key}) AS ${key}_count`).join(',');
  const [summaries,series]=await Promise.all([db.query('SELECT COUNT(*) AS samples,MAX(received_at) AS last_received_at,COUNT(rain_detected) AS rain_samples,SUM(CASE WHEN rain_detected=1 THEN 1 ELSE 0 END) AS wet_samples,'+aggregate+' FROM analysis_samples WHERE '+where,params),db.query('SELECT '+bucket+' AS bucket,COUNT(*) AS samples,SUM(CASE WHEN rain_detected=1 THEN 1 ELSE 0 END) AS wet_samples,COUNT(rain_detected) AS rain_samples,'+hourly+' FROM analysis_samples WHERE '+where+' GROUP BY bucket ORDER BY bucket',params)]);
  const summary=summaries[0];const numeric=(value:unknown)=>value===null||value===undefined?null:Number(value);
  return {device_id:data.device_id,period:data.period,aggregation,since:since.toISOString(),until:end.toISOString(),samples:Number(summary.samples),wet_samples:Number(summary.wet_samples??0),rain_samples:Number(summary.rain_samples??0),last_received_at:summary.last_received_at?utcDate(summary.last_received_at).toISOString():null,metrics:Object.fromEntries(columns.map(key=>[key,{count:Number(summary[key+'_count']),average:numeric(summary[key+'_avg']),minimum:numeric(summary[key+'_min']),maximum:numeric(summary[key+'_max']),standard_deviation:summary[key+'_avg']===null?null:Math.sqrt(Math.max(0,Number(summary[key+'_square'])-Number(summary[key+'_avg'])**2))}])),series:series.map(row=>({bucket:utcDate(row.bucket).toISOString(),samples:Number(row.samples),wet_samples:Number(row.wet_samples??0),rain_samples:Number(row.rain_samples??0),...Object.fromEntries(columns.flatMap(key=>[[key,numeric(row[key])],[key+'_min',numeric(row[key+'_min'])],[key+'_max',numeric(row[key+'_max'])],[key+'_count',Number(row[key+'_count'])]])),temperature_min:numeric(row.temperature_c_min),temperature_max:numeric(row.temperature_c_max)})),sync:worker.status(),note:'La lluvia resistiva indica agua en la placa; no mide milímetros de precipitación.'};
 });
 return {app,db,syncOnce:worker.run};
}
