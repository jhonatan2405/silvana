import {randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parse} from 'dotenv';
import {openDatabase} from '../src/database.js';
const root=new URL('../../',import.meta.url);
const env=(folder:string)=>parse(readFileSync(new URL(folder+'/.env',root)));
const databases=['usuarios-auth-service','dispositivos-service','recepcion-iot-service'].map(folder=>openDatabase(env(folder).DATABASE_URL,fileURLToPath(new URL(folder+'/',root))));
const [authDb,devicesDb,receptionDb]=databases;
const gateway=process.env.GATEWAY_URL??'http://127.0.0.1:8000';
const email='iot-check-'+randomBytes(6).toString('hex')+'@example.com';const password=randomBytes(24).toString('base64url');
let userId:string|undefined,deviceId:string|undefined,cookie='';
async function request(path:string,method='GET',data?:unknown,credential?:string){return fetch(gateway+'/api'+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{}),...(credential?{authorization:'Bearer '+credential}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(20000)});}
async function expect(response:Response,status:number,step:string){if(response.status!==status)throw new Error(step+' (HTTP '+response.status+')');return response;}
try{
 const created=await expect(await request('/auth/register','POST',{name:'Verificación temporal IoT',email,password}),201,'Registro');userId=((await created.json()) as any).user.id;
 const login=await expect(await request('/auth/login','POST',{email,password}),200,'Login');cookie=login.headers.getSetCookie()[0]?.split(';')[0];if(!cookie)throw new Error('Cookie ausente');
 const pairing=await expect(await request('/devices/pairing-codes','POST',{}),201,'Generar vinculación');const code=((await pairing.json()) as any).code;
 const credential=randomBytes(32).toString('hex');const sensors=[{type:'DHT11',status:'ok'},{type:'BMP280',status:'ok'},{type:'RAIN_ANALOG',status:'unverified'}];
 const station=await expect(await request('/devices/enroll','POST',{code,hardware_id:'esp32-'+randomBytes(6).toString('hex'),credential,sensors}),200,'Vincular estación automáticamente');deviceId=((await station.json()) as any).device.id;

 const packet={device_id:deviceId,packet_id:randomUUID(),measured_at:new Date().toISOString(),measurements:{temperature_c:29.4,temperature_bmp_c:30.1,humidity_pct:74,pressure_hpa:1007.2,rain_detected:false,rain_raw_adc:0},sensors};
 const first=await expect(await request('/readings','POST',packet,credential),201,'Guardar lectura');const id=((await first.json()) as any).reading.id;
 const repeat=await expect(await request('/readings','POST',packet,credential),200,'Reenvío idempotente');if(((await repeat.json()) as any).reading.id!==id)throw new Error('Lectura duplicada');
 await expect(await request('/readings','POST',{...packet,packet_id:randomUUID()},'invalid-credential-long-enough'),401,'Rechazar credencial');
 const list=await expect(await request('/readings?device_id='+deviceId),200,'Consultar lecturas');if(((await list.json()) as any).items.length!==1)throw new Error('Persistencia incorrecta');
 const checked=await expect(await request('/devices/'+deviceId),200,'Consultar estación');if(!((await checked.json()) as any).device.online)throw new Error('Última comunicación ausente');
 await expect(await request('/auth/logout','POST'),204,'Cerrar sesión');await expect(await request('/readings?device_id='+deviceId),401,'Sesión revocada');
 console.log('Flujo por Gateway verificado: login, vinculación automática, sensores, recepción, persistencia, deduplicación, credenciales y consulta protegida.');
 console.log('Almacenamiento de recepción:',receptionDb.kind,'; almacenamiento de dispositivos:',devicesDb.kind);
}catch(error){console.error('Verificación incompleta:',(error as any).code??(error as Error).message);process.exitCode=1;}
finally{
 try{
  if(deviceId){await receptionDb.query('DELETE FROM readings WHERE device_id=$1',[deviceId]);await devicesDb.query('DELETE FROM devices WHERE id=$1',[deviceId]);}
  if(userId)await devicesDb.query('DELETE FROM pairing_codes WHERE owner_id=$1',[userId]);
  if(userId)await authDb.transaction(async tx=>{await tx.query('DELETE FROM sessions WHERE user_id=$1',[userId]);await tx.query('DELETE FROM users WHERE id=$1',[userId]);});
  console.log('Datos temporales eliminados; no son lecturas de sensores reales.');
 }catch{console.error('No se pudo completar la limpieza de datos temporales.');process.exitCode=1;}
 finally{await Promise.all(databases.map(db=>db.close()));}
}
