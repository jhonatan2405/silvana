import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {createAuth} from '../../usuarios-auth-service/src/app.js';
import {createDevices} from '../../dispositivos-service/src/app.js';
import {createReception} from '../../recepcion-iot-service/src/app.js';
import {createGateway} from '../../api-gateway/src/app.js';
const sensors=[{type:'DHT11',status:'ok'},{type:'BMP280',status:'ok'},{type:'RAIN_ANALOG',status:'unverified'}];
async function setup(t:any){
 const auth=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false});t.after(()=>auth.app.close());const authUrl=await auth.app.listen({host:'127.0.0.1',port:0});
 const devices=await createDevices({databaseUrl:'sqlite:///:memory:',authUrl,logger:false,internalToken:'private-test-token'});t.after(()=>devices.app.close());const devicesUrl=await devices.app.listen({host:'127.0.0.1',port:0});
 const reception=await createReception({databaseUrl:'sqlite:///:memory:',devicesUrl,logger:false,internalToken:'private-test-token'});t.after(()=>reception.app.close());const receptionUrl=await reception.app.listen({host:'127.0.0.1',port:0});
 const gateway=createGateway({authUrl,devicesUrl,receptionUrl,logger:false});t.after(()=>gateway.close());
 async function account(email:string){const password='Una contraseña de prueba para sensores';await gateway.inject({method:'POST',url:'/api/auth/register',payload:{name:'Prueba vinculación',email,password}});const logged=await gateway.inject({method:'POST',url:'/api/auth/login',payload:{email,password}});return String(logged.headers['set-cookie']).split(';')[0];}
 const cookie=await account('pairing-owner@example.com');
 const code=async(cookieValue=cookie,device_id?:string)=>{const response=await gateway.inject({method:'POST',url:'/api/devices/pairing-codes',headers:{cookie:cookieValue},payload:device_id?{device_id}:{}});assert.equal(response.statusCode,201);return response.json().code;};
 const enroll=(code:string,hardware_id='esp32-aabbccddeeff',credential=randomBytes(32).toString('hex'))=>({code,hardware_id,credential,sensors});
 const send=(payload:any)=>gateway.inject({method:'POST',url:'/api/devices/enroll',payload});
 return {gateway,devices,reception,cookie,account,code,enroll,send};
}
test('vinculación crea estación automáticamente, tolera reintento y mantiene credenciales fuera de respuestas',async t=>{
 const f=await setup(t);const payload=f.enroll(await f.code());const results=await Promise.all([f.send(payload),f.send(payload)]);for(const result of results)assert.equal(result.statusCode,200);
 assert.equal(results[0].json().device.id,results[1].json().device.id);assert.equal((await f.devices.db.query('SELECT * FROM devices')).length,1);
 const row=(await f.devices.db.query('SELECT * FROM devices'))[0];assert.notEqual(row.credential_hash,payload.credential);assert.equal(row.hardware_id,payload.hardware_id);
 assert.ok(!results[0].body.includes(payload.credential));assert.deepEqual(results[0].json().device.sensors,sensors);
 const status=await f.gateway.inject({url:'/api/devices/pairing-codes/status',headers:{cookie:f.cookie}});assert.equal(status.json().paired,true);assert.ok(!status.body.includes(payload.code));
 assert.equal((await f.send({...payload,credential:'x'.repeat(64)})).statusCode,401);
 await f.gateway.inject({method:'POST',url:'/api/devices/'+row.id+'/rotate-credential',headers:{cookie:f.cookie}});assert.equal((await f.send(payload)).statusCode,401);
});
test('vinculación comprueba cuenta, vencimiento, código de un uso y unicidad del equipo',async t=>{
 const f=await setup(t);assert.equal((await f.gateway.inject({method:'POST',url:'/api/devices/pairing-codes',payload:{}})).statusCode,401);
 const first=f.enroll(await f.code());assert.equal((await f.send(first)).statusCode,200);const id=(await f.devices.db.query('SELECT * FROM devices'))[0].id;
 const other=await f.account('other-pairing@example.com');assert.equal((await f.gateway.inject({method:'POST',url:'/api/devices/pairing-codes',headers:{cookie:other},payload:{device_id:id}})).statusCode,404);
 assert.equal((await f.send(f.enroll(await f.code(other)))) .statusCode,409);
 const expired=await f.code();await f.devices.db.query('UPDATE pairing_codes SET expires_at=$1',[new Date(Date.now()-1000)]);assert.equal((await f.send(f.enroll(expired,'esp32-112233445566'))).statusCode,401);
 assert.equal((await f.send(f.enroll('0000000000000000'))).statusCode,401);
});
test('vinculación de estación existente conserva ID y nombre y reemplaza su credencial',async t=>{
 const f=await setup(t);const created=await f.gateway.inject({method:'POST',url:'/api/devices',headers:{cookie:f.cookie},payload:{name:'Estación del patio',location:'Mi patio'}});const {device,credential}=created.json();
 const payload=f.enroll(await f.code(f.cookie,device.id));const paired=await f.send(payload);assert.equal(paired.statusCode,200);assert.equal(paired.json().device.id,device.id);assert.equal(paired.json().device.name,device.name);
 const check=await f.devices.app.inject({method:'POST',url:'/internal/devices/verify',headers:{'x-internal-token':'private-test-token'},payload:{device_id:device.id,credential}});assert.equal(check.statusCode,401);
 assert.equal((await f.devices.db.query('SELECT * FROM devices')).length,1);
});
test('lecturas reportan sensores, temperatura BMP, lluvia seca ADC cero y filtro histórico',async t=>{
 const f=await setup(t);const enrollment=f.enroll(await f.code());const id=(await f.send(enrollment)).json().device.id;
 const payload={device_id:id,packet_id:randomUUID(),measured_at:new Date(Date.now()-60000).toISOString(),measurements:{temperature_c:32.5,temperature_bmp_c:33.66,humidity_pct:73,pressure_hpa:1009.09,rain_raw_adc:0,rain_detected:false},sensors};
 const headers={authorization:'Bearer '+enrollment.credential};const first=await f.gateway.inject({method:'POST',url:'/api/readings',headers,payload});assert.equal(first.statusCode,201);assert.equal(first.json().reading.measurements.rain_detected,false);assert.equal(first.json().reading.measurements.temperature_bmp_c,33.66);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/readings',headers,payload:{...payload,sensors:[...sensors].reverse()}})).statusCode,200);
 const changed=await f.gateway.inject({method:'POST',url:'/api/readings',headers,payload:{...payload,sensors:[{type:'BMP280',status:'error'}]}});assert.equal(changed.statusCode,409);
 const future=await f.gateway.inject({url:'/api/readings?device_id='+id+'&since='+encodeURIComponent(new Date().toISOString()),headers:{cookie:f.cookie}});assert.equal(future.statusCode,200);assert.equal(future.json().items.length,0);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/readings',headers,payload:{...payload,packet_id:randomUUID(),sensors:[...sensors,sensors[0]]}})).statusCode,422);
});
