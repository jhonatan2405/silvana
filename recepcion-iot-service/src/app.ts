import {sensorReport} from './sensors.js';
import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {z} from 'zod';
import {createHttp,HttpError} from './http.js';
import {openDatabase,utcDate,type Database,type Row} from './database.js';
import {serviceRoot} from './config.js';
const deviceId=z.string().regex(/^[a-f0-9]{32}$/);
const measurements=z.object({temperature_bmp_c:z.number().finite().min(-80).max(100).optional(),temperature_c:z.number().finite().min(-80).max(100).optional(),humidity_pct:z.number().finite().min(0).max(100).optional(),rain_detected:z.boolean().optional(),rain_raw_adc:z.number().int().min(0).max(4095).optional(),pressure_hpa:z.number().finite().min(300).max(1100).optional()}).strict().refine(data=>Object.keys(data).length>0,'Incluye al menos una medición.');
const reading=z.object({device_id:deviceId,packet_id:z.uuid(),measured_at:z.iso.datetime({offset:true}).refine(value=>Date.parse(value)<=Date.now()+300000,'La fecha supera cinco minutos en el futuro.'),measurements,sensors:sensorReport.optional()}).strict();
const publicReading=(row:Row)=>({id:row.id,device_id:row.device_id,packet_id:row.packet_id,measured_at:utcDate(row.measured_at).toISOString(),received_at:utcDate(row.received_at).toISOString(),measurements:JSON.parse(row.measurements),sensors:JSON.parse(row.sensor_report??'[]')});
export async function initializeReception(db:Database){
 if(db.kind==='postgres')await db.transaction(async tx=>tx.exec(await readFile(new URL('../migrations/001_readings.sql',import.meta.url),'utf8')));
 else await db.exec(`CREATE TABLE IF NOT EXISTS readings(id TEXT PRIMARY KEY,device_id TEXT NOT NULL,owner_id TEXT NOT NULL,packet_id TEXT NOT NULL,measured_at TEXT NOT NULL,received_at TEXT NOT NULL,measurements TEXT NOT NULL,payload_hash TEXT NOT NULL,UNIQUE(device_id,packet_id));CREATE INDEX IF NOT EXISTS ix_readings_device_time ON readings(device_id,measured_at DESC,id);CREATE INDEX IF NOT EXISTS ix_readings_owner ON readings(owner_id);`);
 if(db.kind==='postgres')await db.exec(await readFile(new URL('../migrations/002_sensor_report.sql',import.meta.url),'utf8'));
 else if(!(await db.query('PRAGMA table_info(readings)')).some(row=>row.name==='sensor_report'))await db.exec("ALTER TABLE readings ADD COLUMN sensor_report TEXT NOT NULL DEFAULT '[]'");
 await db.exec(await readFile(new URL('../migrations/003_deliveries.sql',import.meta.url),'utf8'));
 if(db.kind==='postgres')await db.exec('ALTER TABLE reading_deliveries ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE reading_deliveries FROM anon, authenticated;');
}
export async function createReception(options:{databaseUrl?:string;logger?:boolean;origin?:string;devicesUrl?:string;internalToken?:string;rateLimit?:number}={}){
 const db=openDatabase(options.databaseUrl??process.env.DATABASE_URL??'sqlite:///./recepcion.db',serviceRoot);
 try{await initializeReception(db);}catch(error){await db.close();throw error;}
 const app=createHttp('recepcion-iot',options.origin??process.env.FRONTEND_ORIGIN??'http://localhost:5173',options.logger??true);
 app.addHook('onClose',async()=>db.close());
 const devicesUrl=options.devicesUrl??process.env.DEVICES_SERVICE_URL??'http://127.0.0.1:8002';
 const internalToken=options.internalToken??process.env.INTERNAL_SERVICE_TOKEN;
 const buckets=new Map<string,{count:number;reset:number}>();
 async function callDevices(path:string,init:RequestInit){
  let response:Response;try{response=await fetch(devicesUrl+path,{...init,signal:AbortSignal.timeout(5000),redirect:'error'});}catch{throw new HttpError(503,'No se pudo verificar el dispositivo.');}
  if([401,403,404].includes(response.status))throw new HttpError(response.status,response.status===404?'Dispositivo no encontrado.':'Acceso no permitido.');
  if(!response.ok)throw new HttpError(503,'La verificación del dispositivo no está disponible.');
  return await response.json() as any;
 }
 const authorizeInternal=(supplied:unknown)=>{if(!internalToken||typeof supplied!=='string'||Buffer.byteLength(supplied)!==Buffer.byteLength(internalToken)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(internalToken)))throw new HttpError(403,'Acceso no permitido.');};
 app.get('/internal/readings/feed',async request=>{
  authorizeInternal(request.headers['x-internal-token']);
  const data=z.object({consumer:z.enum(['analysis','alerts']),limit:z.coerce.number().int().min(1).max(200).default(200),since:z.iso.datetime({offset:true})}).strict().parse(request.query);
  const rows=await db.query('SELECT r.* FROM readings r LEFT JOIN reading_deliveries d ON d.reading_id=r.id AND d.consumer=$1 WHERE d.reading_id IS NULL AND r.received_at>=$2 ORDER BY r.received_at,r.id LIMIT $3',[data.consumer,new Date(data.since),data.limit]);
  return {items:rows.map(row=>({...publicReading(row),owner_id:row.owner_id}))};
 });
 app.post('/internal/readings/ack',async request=>{
  authorizeInternal(request.headers['x-internal-token']);const data=z.object({consumer:z.enum(['analysis','alerts']),ids:z.array(z.uuid()).min(1).max(200)}).strict().parse(request.body);
  const placeholders=data.ids.map((_,i)=>'$'+(i+2)).join(',');
  await db.query('INSERT INTO reading_deliveries(consumer,reading_id) SELECT $1,id FROM readings WHERE id IN ('+placeholders+') ON CONFLICT(consumer,reading_id) DO NOTHING',[data.consumer,...data.ids]);return {acknowledged:true};
 });
 app.get('/health',async()=>({status:'ok',service:'recepcion-iot',runtime:'nodejs'}));
 app.get('/ready',async()=>{await db.query('SELECT id FROM readings LIMIT 1');return {status:'ready'};});
 app.post('/readings',async(request,reply)=>{
  const now=Date.now();const key=request.ip;const limit=options.rateLimit??120;
  for(const [key,bucket] of buckets)if(bucket.reset<=now)buckets.delete(key);
  const bucket=buckets.get(key)??{count:0,reset:now+60000};
  if(bucket.count>=limit)throw new HttpError(429,'Demasiados envíos. Intenta más tarde.',{'Retry-After':String(Math.ceil((bucket.reset-now)/1000))});
  if(buckets.size>=10000&&!buckets.has(key))throw new HttpError(429,'Intenta más tarde.',{'Retry-After':'60'});
  bucket.count++;buckets.set(key,bucket);
  const data=reading.parse(request.body);
  const authorization=request.headers.authorization;
  if(!authorization?.startsWith('Bearer ')||authorization.length>207)throw new HttpError(401,'Se requiere la credencial del dispositivo.');
  if(!internalToken)throw new HttpError(503,'La verificación del dispositivo no está configurada.');
  const verified=await callDevices('/internal/devices/verify',{method:'POST',headers:{'content-type':'application/json','x-internal-token':internalToken},body:JSON.stringify({device_id:data.device_id,credential:authorization.slice(7),...(data.sensors?{sensors:data.sensors}:{})})});
  const measuredAt=new Date(data.measured_at).toISOString();
  const values=JSON.stringify(Object.fromEntries(Object.entries(data.measurements).sort(([a],[b])=>a.localeCompare(b))));
  const report=JSON.stringify([...(data.sensors??[])].sort((a,b)=>a.type.localeCompare(b.type)));
  const hash=createHash('sha256').update(measuredAt+'|'+values+(data.sensors?'|'+report:'')).digest('hex');
  const id=randomUUID();
  const result=await db.transaction(async tx=>{
   await tx.query('INSERT INTO readings(id,device_id,owner_id,packet_id,measured_at,received_at,measurements,payload_hash,sensor_report) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(device_id,packet_id) DO NOTHING',[id,data.device_id,verified.device.owner_id,data.packet_id,new Date(measuredAt),new Date(),values,hash,report]);
   const row=(await tx.query('SELECT * FROM readings WHERE device_id=$1 AND packet_id=$2',[data.device_id,data.packet_id]))[0];
   if(row.payload_hash!==hash)throw new HttpError(409,'Ese packet_id ya corresponde a otra lectura.');
   return {row,duplicate:row.id!==id};
  });
  return reply.code(result.duplicate?200:201).send({reading:publicReading(result.row),duplicate:result.duplicate});
 });
 app.get('/readings',async request=>{
  const data=z.object({device_id:deviceId,limit:z.coerce.number().int().min(1).max(100).default(50),offset:z.coerce.number().int().min(0).default(0),since:z.iso.datetime({offset:true}).optional(),until:z.iso.datetime({offset:true}).optional(),include_latest:z.enum(['true','false']).default('false')}).strict().parse(request.query);
  const cookie=request.headers.cookie;if(!cookie)throw new HttpError(401,'Inicia sesión para consultar lecturas.');
  await callDevices('/devices/'+data.device_id,{headers:{cookie}});
  const params:unknown[]=[data.device_id];let where='device_id=$1';
  if(data.since){params.push(new Date(data.since));where+=' AND measured_at>=$'+params.length;}
  if(data.until){params.push(new Date(data.until));where+=' AND received_at<=$'+params.length;}
  const pageQuery=db.query('SELECT * FROM readings WHERE '+where+' ORDER BY measured_at DESC,id DESC LIMIT $'+(params.length+1)+' OFFSET $'+(params.length+2),[...params,data.limit+1,data.offset]);
  const [rows,latest]=await Promise.all([pageQuery,data.include_latest==='true'?db.query('SELECT * FROM readings WHERE device_id=$1 ORDER BY measured_at DESC,id DESC LIMIT 1',[data.device_id]):Promise.resolve(null)]);
  return {items:rows.slice(0,data.limit).map(publicReading),has_more:rows.length>data.limit,limit:data.limit,offset:data.offset,...(latest?{latest:latest[0]?publicReading(latest[0]):null}:{})};
 });
 return {app,db};
}
