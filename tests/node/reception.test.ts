import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createAuth} from '../../usuarios-auth-service/src/app.js';
import {createDevices} from '../../dispositivos-service/src/app.js';
import {createReception} from '../../recepcion-iot-service/src/app.js';
import {createGateway} from '../../api-gateway/src/app.js';

async function fixture(t:any){
 const token='internal-test-secret-not-used-in-production';
 const auth=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false});t.after(()=>auth.app.close());const authUrl=await auth.app.listen({host:'127.0.0.1',port:0});
 const devices=await createDevices({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,internalToken:token});t.after(()=>devices.app.close());const devicesUrl=await devices.app.listen({host:'127.0.0.1',port:0});
 const reception=await createReception({databaseUrl:'sqlite:///:memory:',logger:false,devicesUrl,internalToken:token});t.after(()=>reception.app.close());const receptionUrl=await reception.app.listen({host:'127.0.0.1',port:0});
 const gateway=createGateway({logger:false,authUrl,devicesUrl,receptionUrl});t.after(()=>gateway.close());
 const password='Prueba independiente de sensores 2026';
 async function account(email:string){await gateway.inject({method:'POST',url:'/api/auth/register',payload:{name:'Prueba sensores',email,password}});const login=await gateway.inject({method:'POST',url:'/api/auth/login',payload:{email,password}});return String(login.headers['set-cookie']).split(';')[0];}
 const cookie=await account('sensor-owner@example.com');
 const created=await gateway.inject({method:'POST',url:'/api/devices',headers:{cookie},payload:{name:'Estación de prueba',location:'Patio de prueba',model:'ESP32'}});assert.equal(created.statusCode,201);
 const {device,credential}=created.json();
 const payload=()=>({device_id:device.id,packet_id:randomUUID(),measured_at:new Date().toISOString(),measurements:{temperature_c:29.5,humidity_pct:76,rain_detected:false,pressure_hpa:1008,rain_raw_adc:3900}});
 const send=(body:any=payload(),key=credential)=>gateway.inject({method:'POST',url:'/api/readings',headers:{authorization:'Bearer '+key},payload:body});
 return {gateway,devices,reception,device,credential,cookie,payload,send,account,token};
}
test('recepción por Gateway: autentica estación, persiste, deduplica y registra última comunicación',async t=>{
 const f=await fixture(t);const packet=f.payload();
 const before=await f.gateway.inject({url:'/api/devices/'+f.device.id,headers:{cookie:f.cookie}});assert.equal(before.json().device.online,false);
 const first=await f.send(packet);assert.equal(first.statusCode,201);assert.equal(first.json().duplicate,false);
 const duplicate=await f.send({...packet,measurements:{rain_raw_adc:3900,pressure_hpa:1008,rain_detected:false,humidity_pct:76,temperature_c:29.5}});assert.equal(duplicate.statusCode,200);assert.equal(duplicate.json().reading.id,first.json().reading.id);assert.equal(duplicate.json().duplicate,true);
 const concurrentPacket=f.payload();const concurrent=await Promise.all([f.send(concurrentPacket),f.send(concurrentPacket)]);assert.deepEqual(concurrent.map(r=>r.statusCode).sort(),[200,201]);
 assert.equal((await f.reception.db.query('SELECT * FROM readings')).length,2);
 assert.equal((await f.send({...packet,measurements:{temperature_c:30}})).statusCode,409);
 const listed=await f.gateway.inject({url:'/api/readings?device_id='+f.device.id+'&limit=1',headers:{cookie:f.cookie}});assert.equal(listed.statusCode,200);assert.equal(listed.json().items.length,1);assert.ok(!listed.body.includes(f.credential));
 const after=await f.gateway.inject({url:'/api/devices/'+f.device.id,headers:{cookie:f.cookie}});assert.equal(after.json().device.online,true);assert.ok(after.json().device.last_seen_at);
 await f.devices.db.query('UPDATE devices SET last_seen_at=$1 WHERE id=$2',[new Date(Date.now()-180000),f.device.id]);assert.equal((await f.gateway.inject({url:'/api/devices/'+f.device.id,headers:{cookie:f.cookie}})).json().device.online,false);
});
test('recepción rechaza acceso ajeno, rutas internas, credenciales inválidas, revocadas y estaciones desactivadas',async t=>{
 const f=await fixture(t);assert.equal((await f.send()).statusCode,201);
 assert.equal((await f.gateway.inject('/api/readings?device_id='+f.device.id)).statusCode,401);
 const other=await f.account('other-sensor@example.com');assert.equal((await f.gateway.inject({url:'/api/readings?device_id='+f.device.id,headers:{cookie:other}})).statusCode,404);
 assert.equal((await f.devices.app.inject({method:'POST',url:'/internal/devices/verify',payload:{device_id:f.device.id,credential:f.credential}})).statusCode,403);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/internal/devices/verify',payload:{}})).statusCode,404);
 assert.equal((await f.send(f.payload(),'incorrect-credential-long-enough')).statusCode,401);
 const rotated=await f.gateway.inject({method:'POST',url:'/api/devices/'+f.device.id+'/rotate-credential',headers:{cookie:f.cookie}});assert.equal(rotated.statusCode,200);
 assert.equal((await f.send()).statusCode,401);assert.equal((await f.send(f.payload(),rotated.json().credential)).statusCode,201);
 await f.devices.db.query('UPDATE devices SET active=$1 WHERE id=$2',[false,f.device.id]);assert.equal((await f.send(f.payload(),rotated.json().credential)).statusCode,401);
 assert.equal((await f.gateway.inject({url:'/api/devices/'+f.device.id,headers:{cookie:f.cookie}})).json().device.online,false);
 assert.equal((await f.reception.db.query('SELECT * FROM readings')).length,2);
});
test('recepción valida unidades, rangos, fechas y campos sin almacenar lecturas inválidas',async t=>{
 const f=await fixture(t);const base=f.payload();
 for(const measurements of [{},{humidity_pct:101},{temperature_c:-100},{rain_detected:'sí'},{rain_raw_adc:4096},{pressure_hpa:1200},{rainfall_mm:10},{inventado:25}])assert.equal((await f.send({...base,measurements})).statusCode,422);
 assert.equal((await f.send({...base,measured_at:new Date(Date.now()+600000).toISOString()})).statusCode,422);
 assert.equal((await f.send({...base,owner_id:'injected'})).statusCode,422);
 assert.equal((await f.send({...base,packet_id:'not-a-uuid'})).statusCode,422);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/readings',payload:base})).statusCode,401);
 assert.equal((await f.reception.db.query('SELECT * FROM readings')).length,0);
 assert.equal((await f.gateway.inject({url:'/api/readings?device_id='+f.device.id+'&limit=101',headers:{cookie:f.cookie}})).statusCode,422);
});
test('recepción falla cerrado si dispositivos no responde y limita envíos',async t=>{
 const reception=await createReception({databaseUrl:'sqlite:///:memory:',logger:false,devicesUrl:'http://127.0.0.1:1',internalToken:'secret',rateLimit:1});t.after(()=>reception.app.close());
 const payload={device_id:'a'.repeat(32),packet_id:randomUUID(),measured_at:new Date().toISOString(),measurements:{temperature_c:27}};
 const send=()=>reception.app.inject({method:'POST',url:'/readings',headers:{authorization:'Bearer '+'x'.repeat(40)},payload});
 assert.equal((await send()).statusCode,503);const limited=await send();assert.equal(limited.statusCode,429);assert.ok(limited.headers['retry-after']);assert.equal((await reception.db.query('SELECT * FROM readings')).length,0);
});

test('historial paginado conserva 10 filas, último valor y páginas estables mientras llegan muestras',async t=>{
 const f=await fixture(t);const boundary=new Date();
 for(let i=0;i<23;i++)await f.reception.db.query('INSERT INTO readings(id,device_id,owner_id,packet_id,measured_at,received_at,measurements,payload_hash,sensor_report) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),f.device.id,'test-owner',randomUUID(),new Date(boundary.getTime()-i*1000),new Date(boundary.getTime()-100),JSON.stringify({temperature_c:i}),'test','[]']);
 const get=(offset:number)=>f.gateway.inject({url:'/api/readings?'+new URLSearchParams({device_id:f.device.id,limit:'10',offset:String(offset),include_latest:'true',until:boundary.toISOString()}),headers:{cookie:f.cookie}});
 const first=(await get(0)).json();assert.equal(first.items.length,10);assert.equal(first.has_more,true);assert.equal(first.latest.measurements.temperature_c,0);
 await f.reception.db.query('INSERT INTO readings(id,device_id,owner_id,packet_id,measured_at,received_at,measurements,payload_hash,sensor_report) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[randomUUID(),f.device.id,'test-owner',randomUUID(),new Date(boundary.getTime()+1000),new Date(boundary.getTime()+1000),JSON.stringify({temperature_c:99}),'test','[]']);
 const second=(await get(10)).json(),third=(await get(20)).json();
 assert.equal(second.items.length,10);assert.equal(third.items.length,3);assert.equal(third.has_more,false);assert.equal(second.latest.measurements.temperature_c,99);
 assert.equal(new Set([...first.items,...second.items,...third.items].map(row=>row.id)).size,23);
 assert.equal((await get(0)).json().items[0].id,first.items[0].id);
 const empty=(await get(30)).json();assert.deepEqual(empty.items,[]);assert.equal(empty.has_more,false);
 const other=await f.account('pagination-other@example.com');assert.equal((await f.gateway.inject({url:'/api/readings?device_id='+f.device.id+'&include_latest=true',headers:{cookie:other}})).statusCode,404);
});
