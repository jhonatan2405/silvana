import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {createHttp} from './http.js';
import {openDatabase,utcDate,type Database} from './database.js';
import {serviceRoot} from './config.js';
import {ownedDevice,createWorker} from './upstream.js';
export async function initializeAnalysis(db:Database){await db.exec(await readFile(new URL('../migrations/001_analysis.sql',import.meta.url),'utf8'));if(db.kind==='postgres')await db.exec('ALTER TABLE analysis_samples ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE analysis_samples FROM anon, authenticated;');}
export async function createAnalysis(options:{databaseUrl?:string;logger?:boolean;origin?:string;authUrl?:string;devicesUrl?:string;receptionUrl?:string;internalToken?:string;startWorker?:boolean}={}){
 const db=openDatabase(options.databaseUrl??process.env.DATABASE_URL??'sqlite:///./analysis.db',serviceRoot);try{await initializeAnalysis(db);}catch(error){await db.close();throw error;}
 const app=createHttp('analisis',options.origin??process.env.FRONTEND_ORIGIN??'http://localhost:5173',options.logger??true);
 const authUrl=options.authUrl??process.env.AUTH_SERVICE_URL??'http://127.0.0.1:8001',devicesUrl=options.devicesUrl??process.env.DEVICES_SERVICE_URL??'http://127.0.0.1:8002';
 const worker=createWorker(options.receptionUrl??process.env.RECEPTION_SERVICE_URL??'http://127.0.0.1:8003',options.internalToken??process.env.INTERNAL_SERVICE_TOKEN,'analysis',async items=>{
  const values:unknown[]=[];const groups=items.map((item,index)=>{values.push(item.id,item.device_id,item.owner_id,new Date(item.measured_at),new Date(item.received_at),...['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'].map(key=>item.measurements[key]??null),item.measurements.rain_detected===undefined?null:item.measurements.rain_detected?1:0);return '('+Array.from({length:10},(_,column)=>'$'+(index*10+column+1)).join(',')+')';});
  await db.query('INSERT INTO analysis_samples(reading_id,device_id,owner_id,measured_at,received_at,temperature_c,humidity_pct,pressure_hpa,temperature_bmp_c,rain_detected) VALUES '+groups.join(',')+' ON CONFLICT(reading_id) DO NOTHING',values);
 },async()=>new Date(Date.now()-31*86400000).toISOString());
 let timer:ReturnType<typeof setInterval>|undefined;
 app.addHook('onReady',async()=>{if(options.startWorker){void worker.run();timer=setInterval(()=>void worker.run(),5000);}});
 app.addHook('onClose',async()=>{if(timer)clearInterval(timer);await worker.finish();await db.close();});
 app.get('/health',async()=>({status:'ok',service:'analisis',runtime:'nodejs'}));app.get('/ready',async()=>{await db.query('SELECT reading_id FROM analysis_samples LIMIT 1');return {status:'ready',sync:worker.status()};});
 app.get('/analysis/summary',async request=>{
  const data=z.object({device_id:z.string().regex(/^[a-f0-9]{32}$/),period:z.enum(['24h','7d','30d']).default('24h')}).strict().parse(request.query);
  const user=await ownedDevice(data.device_id,request.headers.cookie,authUrl,devicesUrl);const end=new Date(),since=new Date(end.getTime()-({'24h':1,'7d':7,'30d':30}[data.period])*86400000);
  const where='owner_id=$1 AND device_id=$2 AND measured_at>=$3 AND measured_at<=$4',params=[user.id,data.device_id,since,end];
  const columns=['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'] as const;
  const aggregate=columns.map(key=>`COUNT(${key}) AS ${key}_count, AVG(${key}) AS ${key}_avg, MIN(${key}) AS ${key}_min, MAX(${key}) AS ${key}_max`).join(',');
  const bucket=db.kind==='postgres'?"date_trunc('hour', measured_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'":"strftime('%Y-%m-%dT%H:00:00Z',measured_at)";
  const [summaries,series]=await Promise.all([db.query('SELECT COUNT(*) AS samples,MAX(received_at) AS last_received_at,SUM(CASE WHEN rain_detected=1 THEN 1 ELSE 0 END) AS wet_samples,'+aggregate+' FROM analysis_samples WHERE '+where,params),db.query('SELECT '+bucket+' AS bucket,COUNT(*) AS samples,AVG(temperature_c) AS temperature_c,MIN(temperature_c) AS temperature_min,MAX(temperature_c) AS temperature_max,AVG(humidity_pct) AS humidity_pct,AVG(pressure_hpa) AS pressure_hpa FROM analysis_samples WHERE '+where+' GROUP BY bucket ORDER BY bucket',params)]);
  const summary=summaries[0];const numeric=(value:unknown)=>value===null||value===undefined?null:Number(value);
  return {device_id:data.device_id,period:data.period,since:since.toISOString(),until:end.toISOString(),samples:Number(summary.samples),wet_samples:Number(summary.wet_samples??0),last_received_at:summary.last_received_at?utcDate(summary.last_received_at).toISOString():null,metrics:Object.fromEntries(columns.map(key=>[key,{count:Number(summary[key+'_count']),average:numeric(summary[key+'_avg']),minimum:numeric(summary[key+'_min']),maximum:numeric(summary[key+'_max'])}])),series:series.map(row=>({bucket:utcDate(row.bucket).toISOString(),samples:Number(row.samples),temperature_c:numeric(row.temperature_c),temperature_min:numeric(row.temperature_min),temperature_max:numeric(row.temperature_max),humidity_pct:numeric(row.humidity_pct),pressure_hpa:numeric(row.pressure_hpa)})),sync:worker.status(),note:'La lluvia resistiva indica agua en la placa; no mide milímetros de precipitación.'};
 });
 return {app,db,syncOnce:worker.run};
}
