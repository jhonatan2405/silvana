import {readFile} from 'node:fs/promises';
import {sensorReport} from './sensors.js';
import cookie from '@fastify/cookie';

import { createHash,randomBytes,randomUUID,timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { createHttp,HttpError } from './http.js';

import { openDatabase,utcDate,type Database,type Row } from './database.js';

import { serviceRoot } from './config.js';

const PRESENCE_TIMEOUT_MS=60000;
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');

const field=(max:number)=>z.string().trim().min(2).max(max);

const input=z.object({name:field(100),location:field(160),model:field(80).default('ESP32')}).strict();

const update=input.extend({active:z.boolean().default(true)}).strict();

const publicDevice=(row:Row)=>({id:row.id,name:row.name,location:row.location,model:row.model,active:Boolean(row.active),created_at:utcDate(row.created_at).toISOString(),last_seen_at:row.last_seen_at?utcDate(row.last_seen_at).toISOString():null,hardware_id:row.hardware_id??null,sensors:JSON.parse(row.sensors_json??'[]'),online:Boolean(row.active&&row.last_seen_at&&Date.now()-utcDate(row.last_seen_at).getTime()<PRESENCE_TIMEOUT_MS)});

export async function initializeDevices(db:Database){

 await db.exec(`CREATE TABLE IF NOT EXISTS devices(id VARCHAR(64) PRIMARY KEY,owner_id VARCHAR(64) NOT NULL,name VARCHAR(100) NOT NULL,location VARCHAR(160) NOT NULL,model VARCHAR(80) NOT NULL,active BOOLEAN NOT NULL,credential_hash VARCHAR(64) NOT NULL UNIQUE,created_at ${db.kind==='postgres'?'TIMESTAMPTZ':'TEXT'} NOT NULL); CREATE INDEX IF NOT EXISTS ix_devices_owner_id ON devices(owner_id);`);

 if(db.kind==='postgres')await db.exec('ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ');

 else if(!(await db.query('PRAGMA table_info(devices)')).some(row=>row.name==='last_seen_at'))await db.exec('ALTER TABLE devices ADD COLUMN last_seen_at TEXT');

 for(const [name,type] of [['hardware_id','VARCHAR(40)'],['sensors_json',"TEXT DEFAULT '[]'"]]){
  if(db.kind==='postgres')await db.exec(`ALTER TABLE devices ADD COLUMN IF NOT EXISTS ${name} ${type}`);
  else if(!(await db.query('PRAGMA table_info(devices)')).some(row=>row.name===name))await db.exec(`ALTER TABLE devices ADD COLUMN ${name} ${type}`);
 }
 await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ix_devices_hardware ON devices(hardware_id);CREATE TABLE IF NOT EXISTS pairing_codes(token_hash VARCHAR(64) PRIMARY KEY,owner_id VARCHAR(64) NOT NULL,device_id VARCHAR(64),expires_at ${db.kind==='postgres'?'TIMESTAMPTZ':'TEXT'} NOT NULL,hardware_id VARCHAR(40),credential_hash VARCHAR(64));`);
 await db.exec(`CREATE TABLE IF NOT EXISTS device_shares(device_id VARCHAR(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,user_id VARCHAR(64) NOT NULL,email VARCHAR(254) NOT NULL,created_at ${db.kind==='postgres'?'TIMESTAMPTZ':'TEXT'} NOT NULL,PRIMARY KEY(device_id,user_id));`);
 if(db.kind==='postgres')await db.exec('ALTER TABLE device_shares ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE device_shares FROM anon,authenticated;');
 await db.exec(await readFile(new URL('../migrations/003_presence.sql',import.meta.url),'utf8'));
 if(db.kind==='postgres')await db.exec('ALTER TABLE device_presence ENABLE ROW LEVEL SECURITY; ALTER TABLE device_notification_outbox ENABLE ROW LEVEL SECURITY; ALTER TABLE device_notification_receipts ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE device_presence,device_notification_outbox,device_notification_receipts FROM anon, authenticated;');
 if(db.kind==='postgres')await db.transaction(async transaction=>{await transaction.exec('ALTER TABLE devices ENABLE ROW LEVEL SECURITY; ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY');for(const role of ['anon','authenticated']){if((await transaction.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).length)await transaction.exec(`REVOKE ALL ON TABLE devices,pairing_codes FROM ${role}`);}});

}

export async function createDevices(options:{databaseUrl?:string;logger?:boolean;origin?:string;authUrl?:string;internalToken?:string;startWorker?:boolean;now?:()=>Date}={}){

 const db=openDatabase(options.databaseUrl??process.env.DATABASE_URL??'sqlite:///./dispositivos.db',serviceRoot);

 try{await initializeDevices(db);}catch(error){await db.close();throw error;}

 const app=createHttp('dispositivos',options.origin??process.env.FRONTEND_ORIGIN??'http://localhost:5173',options.logger??true);await app.register(cookie);

 const authUrl=options.authUrl??process.env.AUTH_SERVICE_URL??'http://127.0.0.1:8001';

 async function currentUser(cookies:Record<string,string|undefined>){

  const token=cookies.monitoreo_session;if(!token)throw new HttpError(401,'Inicia sesión para administrar tus dispositivos.');

  let response:Response;

  try{response=await fetch(authUrl+'/auth/me',{headers:{cookie:'monitoreo_session='+encodeURIComponent(token)},signal:AbortSignal.timeout(5000)});}catch{throw new HttpError(503,'No se pudo verificar la sesión. Intenta nuevamente.');}

  if(response.status===401)throw new HttpError(401,'Tu sesión ha expirado.');

  if(!response.ok)throw new HttpError(503,'La verificación de sesión no está disponible.');

  return ((await response.json()) as {user:{id:string}}).user;

 }

 async function owned(id:string,user:{id:string}){const device=(await db.query('SELECT * FROM devices WHERE id=$1 AND owner_id=$2',[id,user.id]))[0];if(!device)throw new HttpError(404,'Dispositivo no encontrado.');return device;}

 const internalToken=options.internalToken??process.env.INTERNAL_SERVICE_TOKEN;
 const presenceNow=options.now??(()=>new Date());
 async function recordStatus(tx:{query:(sql:string,params?:unknown[])=>Promise<Row[]>},device:Row,kind:string,at:Date){
  const state=(await tx.query('SELECT state FROM device_presence WHERE device_id=$1',[device.id]))[0]?.state;
  if(state===kind)return;
  await tx.query('INSERT INTO device_presence(device_id,state,updated_at) VALUES($1,$2,$3) ON CONFLICT(device_id) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at',[device.id,kind,at]);
  await tx.query('INSERT INTO device_notification_outbox(id,device_id,owner_id,device_name,kind,created_at) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),device.id,device.owner_id,device.name,kind,at]);
 }
 let scanning:Promise<void>|null=null;
 const scanPresence=()=>{if(scanning)return scanning;scanning=Promise.resolve().then(async()=>{try{const cutoff=new Date(presenceNow().getTime()-PRESENCE_TIMEOUT_MS);await db.transaction(async tx=>{const rows=await tx.query('SELECT d.* FROM devices d JOIN device_presence p ON p.device_id=d.id WHERE d.active=$1 AND p.state=$2 AND d.last_seen_at<=$3'+(db.kind==='postgres'?' FOR UPDATE OF d':''),[true,'online',cutoff]);for(const device of rows)await recordStatus(tx,device,'offline',presenceNow());});}finally{scanning=null;}});return scanning;};
 let timer:ReturnType<typeof setInterval>|undefined;app.addHook('onReady',async()=>{if(options.startWorker){void scanPresence().catch(()=>app.log.error({code:'PRESENCE_SCAN_FAILED'},'No se pudo comprobar la comunicación'));timer=setInterval(()=>void scanPresence().catch(()=>app.log.error({code:'PRESENCE_SCAN_FAILED'},'No se pudo comprobar la comunicación')),5000);}});app.addHook('onClose',async()=>{if(timer)clearInterval(timer);await scanning;await db.close();});
 const authorizeInternal=(supplied:unknown)=>{if(!internalToken||typeof supplied!=='string'||!timingSafeEqual(Buffer.from(digest(supplied)),Buffer.from(digest(internalToken))))throw new HttpError(403,'Acceso interno no permitido.');};
 app.get('/internal/notifications/feed',async request=>{authorizeInternal(request.headers['x-internal-token']);const data=z.object({limit:z.coerce.number().int().min(1).max(200).default(200)}).strict().parse(request.query);const rows=await db.query('SELECT o.* FROM device_notification_outbox o LEFT JOIN device_notification_receipts r ON r.source_id=o.id WHERE r.source_id IS NULL ORDER BY o.created_at,o.id LIMIT $1',[data.limit]);return {items:rows.map(row=>({...row,created_at:utcDate(row.created_at).toISOString()}))};});
 app.post('/internal/notifications/ack',async request=>{authorizeInternal(request.headers['x-internal-token']);const data=z.object({ids:z.array(z.uuid()).min(1).max(200)}).strict().parse(request.body);await db.query('INSERT INTO device_notification_receipts(source_id) SELECT id FROM device_notification_outbox WHERE id IN ('+data.ids.map((_,i)=>'$'+(i+1)).join(',')+') ON CONFLICT(source_id) DO NOTHING',data.ids);return {acknowledged:true};});


 app.get<{Params:{id:string}}>('/internal/devices/:id/recipients',async request=>{
  authorizeInternal(request.headers['x-internal-token']);const device=(await db.query('SELECT owner_id FROM devices WHERE id=$1',[request.params.id]))[0];
  if(!device)return {items:[]};
  return {items:[{id:device.owner_id,shared_at:null},...(await db.query('SELECT user_id AS id,created_at AS shared_at FROM device_shares WHERE device_id=$1',[request.params.id])).map(row=>({...row,shared_at:utcDate(row.shared_at).toISOString()}))]};
 });
 app.get<{Params:{id:string}}>('/devices/:id/shares',async request=>{await owned(request.params.id,await currentUser(request.cookies));return {items:(await db.query('SELECT user_id,email,created_at FROM device_shares WHERE device_id=$1 ORDER BY email',[request.params.id])).map(row=>({...row,created_at:utcDate(row.created_at).toISOString()}))};});
 app.post<{Params:{id:string}}>('/devices/:id/shares',async request=>{
  const user=await currentUser(request.cookies);await owned(request.params.id,user);
  const data=z.object({email:z.email().max(254).transform(value=>value.toLowerCase())}).strict().parse(request.body);
  const response=await fetch(authUrl+'/internal/notification-recipients',{headers:{'x-internal-token':internalToken??''},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new HttpError(503,'No se pudo consultar la cuenta. Intenta nuevamente.');
  const members=z.object({items:z.array(z.object({id:z.string(),email:z.email()}))}).parse(await response.json());const member=members.items.find(item=>item.email===data.email);
  if(!member)throw new HttpError(404,'Ese correo todav�a no est� registrado en Silvana.');
  if(member.id===user.id)throw new HttpError(409,'Ya eres propietario de esta estaci�n.');
  await db.query('INSERT INTO device_shares(device_id,user_id,email,created_at) VALUES($1,$2,$3,$4) ON CONFLICT(device_id,user_id) DO NOTHING',[request.params.id,member.id,member.email,new Date()]);
  return {shared:true};
 });
 app.delete<{Params:{id:string;userId:string}}>('/devices/:id/shares/:userId',async request=>{await owned(request.params.id,await currentUser(request.cookies));await db.query('DELETE FROM device_shares WHERE device_id=$1 AND user_id=$2',[request.params.id,request.params.userId]);return {revoked:true};});
 app.post('/internal/devices/verify',async request=>{

  const supplied=request.headers['x-internal-token'];

  if(!internalToken||typeof supplied!=='string'||!timingSafeEqual(Buffer.from(digest(supplied)),Buffer.from(digest(internalToken))))throw new HttpError(403,'Acceso interno no permitido.');

  const data=z.object({device_id:z.string().regex(/^[a-f0-9]{32}$/),credential:z.string().min(20).max(200),sensors:sensorReport.optional()}).strict().parse(request.body);

  const at=presenceNow();const device=await db.transaction(async tx=>{
   const device=(await tx.query('SELECT * FROM devices WHERE id=$1 AND credential_hash=$2 AND active=$3'+(db.kind==='postgres'?' FOR UPDATE':''),[data.device_id,digest(data.credential),true]))[0];
   if(!device)throw new HttpError(401,'Credencial de dispositivo no válida.');
   if(data.sensors)await tx.query('UPDATE devices SET last_seen_at=$1,sensors_json=$2 WHERE id=$3',[at,JSON.stringify(data.sensors),data.device_id]);else await tx.query('UPDATE devices SET last_seen_at=$1 WHERE id=$2',[at,data.device_id]);
   await recordStatus(tx,device,'online',at);return device;
  });return {device:{id:device.id,owner_id:device.owner_id},last_seen_at:at.toISOString()};

 });

 const pairingAttempts=new Map<string,{count:number;reset:number}>();
 app.post('/devices/pairing-codes',async(request,reply)=>{
  const user=await currentUser(request.cookies);
  const data=z.object({device_id:z.string().regex(/^[a-f0-9]{32}$/).optional()}).strict().parse(request.body??{});
  if(data.device_id)await owned(data.device_id,user);
  const code=randomBytes(8).toString('hex').toUpperCase(),expires=new Date(Date.now()+600000);
  await db.transaction(async tx=>{
   await tx.query('DELETE FROM pairing_codes WHERE owner_id=$1',[user.id]);
   await tx.query('INSERT INTO pairing_codes(token_hash,owner_id,device_id,expires_at) VALUES($1,$2,$3,$4)',[digest(code),user.id,data.device_id??null,expires]);
  });return reply.code(201).send({code,expires_at:expires.toISOString()});
 });
 app.get('/devices/pairing-codes/status',async request=>{
  const user=await currentUser(request.cookies);const pair=(await db.query('SELECT * FROM pairing_codes WHERE owner_id=$1',[user.id]))[0];
  return {paired:Boolean(pair?.hardware_id),device_id:pair?.hardware_id?pair.device_id:null,expires_at:pair?utcDate(pair.expires_at).toISOString():null};
 });
 app.post('/devices/enroll',async(request,reply)=>{
  const now=Date.now();for(const [key,item] of pairingAttempts)if(item.reset<=now)pairingAttempts.delete(key);
  const bucket=pairingAttempts.get(request.ip)??{count:0,reset:now+60000};
  if(bucket.count>=20||pairingAttempts.size>=10000&&!pairingAttempts.has(request.ip))throw new HttpError(429,'Demasiados intentos de vinculación.',{'Retry-After':'60'});
  bucket.count++;pairingAttempts.set(request.ip,bucket);
  const data=z.object({code:z.string().trim().regex(/^[A-Fa-f0-9]{16}$/).transform(value=>value.toUpperCase()),hardware_id:z.string().regex(/^esp32-[a-f0-9]{12}$/),credential:z.string().regex(/^[A-Za-z0-9_-]{40,100}$/),sensors:sensorReport}).strict().parse(request.body);
  const result=await db.transaction(async tx=>{
   const pair=(await tx.query('SELECT * FROM pairing_codes WHERE token_hash=$1'+(db.kind==='postgres'?' FOR UPDATE':''),[digest(data.code)]))[0];
   if(!pair||utcDate(pair.expires_at).getTime()<=Date.now())throw new HttpError(401,'Código vencido o no válido. Genera otro en Silvana.');
   if(pair.hardware_id){
    if(pair.hardware_id!==data.hardware_id||pair.credential_hash!==digest(data.credential))throw new HttpError(401,'El código ya fue utilizado.');
    const previous=(await tx.query('SELECT * FROM devices WHERE id=$1 AND credential_hash=$2 AND active=$3',[pair.device_id,digest(data.credential),true]))[0];
    if(!previous)throw new HttpError(401,'Vinculación revocada.');return previous;
   }
   const registered=(await tx.query('SELECT * FROM devices WHERE hardware_id=$1',[data.hardware_id]))[0];
   if(registered&&registered.id!==pair.device_id)throw new HttpError(409,'Esta estación ya está vinculada. Selecciónala al generar el código.');
   const id=pair.device_id??randomBytes(16).toString('hex');
   if(pair.device_id){
    const existing=(await tx.query('SELECT * FROM devices WHERE id=$1 AND owner_id=$2',[id,pair.owner_id]))[0];
    if(!existing)throw new HttpError(404,'Estación no encontrada.');
    if(existing.hardware_id&&existing.hardware_id!==data.hardware_id)throw new HttpError(409,'La estación seleccionada corresponde a otro equipo.');
    await tx.query('UPDATE devices SET hardware_id=$1,credential_hash=$2,sensors_json=$3,last_seen_at=$4,active=$5 WHERE id=$6',[data.hardware_id,digest(data.credential),JSON.stringify(data.sensors),new Date(),true,id]);
   }else await tx.query('INSERT INTO devices(id,owner_id,name,location,model,active,credential_hash,created_at,last_seen_at,hardware_id,sensors_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,pair.owner_id,'Estación '+data.hardware_id.slice(-4).toUpperCase(),'Ubicación por indicar','ESP32',true,digest(data.credential),new Date(),new Date(),data.hardware_id,JSON.stringify(data.sensors)]);
   await tx.query('UPDATE pairing_codes SET device_id=$1,hardware_id=$2,credential_hash=$3 WHERE token_hash=$4',[id,data.hardware_id,digest(data.credential),digest(data.code)]);
   const enrolled=(await tx.query('SELECT * FROM devices WHERE id=$1',[id]))[0];await recordStatus(tx,enrolled,'online',presenceNow());return enrolled;
  }).catch(error=>{if(error.code==='23505'||error.errcode===2067)throw new HttpError(409,'Esta estación ya está vinculada.');throw error;});return reply.code(200).send({device:publicDevice(result)});
 });
 app.get('/health',async()=>({status:'ok',service:'dispositivos',runtime:'nodejs'}));

 app.get('/ready',async()=>{await db.query('SELECT id FROM devices LIMIT 1');return {status:'ready'};});

 app.get('/devices',async request=>{

  const user=await currentUser(request.cookies);

  const pagination=z.object({offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict().parse(request.query);

  const order=db.kind==='sqlite'?'datetime(created_at) DESC,id':'created_at DESC,id';

  const rows=await db.query(`SELECT * FROM devices WHERE owner_id=$1 OR EXISTS(SELECT 1 FROM device_shares s WHERE s.device_id=devices.id AND s.user_id=$2) ORDER BY ${order} LIMIT $3 OFFSET $4`,[user.id,user.id,pagination.limit,pagination.offset]);return {items:rows.map(row=>({...publicDevice(row),shared:row.owner_id!==user.id})),...pagination};

 });

 app.post('/devices',async(request,reply)=>{

  const user=await currentUser(request.cookies),data=input.parse(request.body),credential=randomBytes(40).toString('base64url'),id=randomBytes(16).toString('hex'),created=new Date();

  await db.query('INSERT INTO devices(id,owner_id,name,location,model,active,credential_hash,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,user.id,data.name,data.location,data.model,true,digest(credential),created]);

  const device=await owned(id,user);return reply.code(201).send({device:publicDevice(device),credential,message:'Guarda la credencial: solo se muestra una vez.'});

 });

 app.get<{Params:{id:string}}>('/devices/:id',async request=>{const user=await currentUser(request.cookies);const row=(await db.query('SELECT * FROM devices WHERE id=$1 AND (owner_id=$2 OR EXISTS(SELECT 1 FROM device_shares s WHERE s.device_id=devices.id AND s.user_id=$3))',[request.params.id,user.id,user.id]))[0];if(!row)throw new HttpError(404,'Dispositivo no encontrado.');return {device:{...publicDevice(row),owner_id:row.owner_id,shared:row.owner_id!==user.id}};});

 app.put<{Params:{id:string}}>('/devices/:id',async request=>{

  const user=await currentUser(request.cookies);await owned(request.params.id,user);const data=update.parse(request.body);

  await db.transaction(async tx=>{const existing=(await tx.query('SELECT * FROM devices WHERE id=$1 AND owner_id=$2'+(db.kind==='postgres'?' FOR UPDATE':''),[request.params.id,user.id]))[0];if(!existing)throw new HttpError(404,'Dispositivo no encontrado.');await tx.query('UPDATE devices SET name=$1,location=$2,model=$3,active=$4 WHERE id=$5 AND owner_id=$6',[data.name,data.location,data.model,data.active,request.params.id,user.id]);if(Boolean(existing.active)!==data.active){await recordStatus(tx,{...existing,name:data.name},data.active?'enabled':'disabled',presenceNow());if(data.active)await tx.query('UPDATE devices SET last_seen_at=NULL WHERE id=$1',[existing.id]);}});return {device:publicDevice(await owned(request.params.id,user))};

 });

 app.post<{Params:{id:string}}>('/devices/:id/rotate-credential',async request=>{

  const user=await currentUser(request.cookies);await owned(request.params.id,user);const credential=randomBytes(40).toString('base64url');

  await db.query('UPDATE devices SET credential_hash=$1 WHERE id=$2 AND owner_id=$3',[digest(credential),request.params.id,user.id]);return {credential,message:'La credencial anterior dejó de ser válida.'};

 });

 app.delete<{Params:{id:string}}>('/devices/:id',async(request,reply)=>{

  const user=await currentUser(request.cookies);await owned(request.params.id,user);await db.query('DELETE FROM devices WHERE id=$1 AND owner_id=$2',[request.params.id,user.id]);return reply.code(204).send();

 });

 return {app,db,scanPresence};

}

