import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createAuth} from '../../usuarios-auth-service/src/app.js';
import {createDevices} from '../../dispositivos-service/src/app.js';
import {createReception} from '../../recepcion-iot-service/src/app.js';
import {createAnalysis} from '../../analisis-service/src/app.js';
import {createAlerts} from '../../alertas-service/src/app.js';
import {createGateway} from '../../api-gateway/src/app.js';

async function fixture(t:any,weatherFetch?:typeof fetch){
 const token='internal-test-secret-not-used-in-production';
 const auth=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false});t.after(()=>auth.app.close());const authUrl=await auth.app.listen({host:'127.0.0.1',port:0});
 const devices=await createDevices({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,internalToken:token});t.after(()=>devices.app.close());const devicesUrl=await devices.app.listen({host:'127.0.0.1',port:0});
 const reception=await createReception({databaseUrl:'sqlite:///:memory:',logger:false,devicesUrl,internalToken:token});t.after(()=>reception.app.close());const receptionUrl=await reception.app.listen({host:'127.0.0.1',port:0});
 const analysis=await createAnalysis({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,devicesUrl,receptionUrl,internalToken:token,weatherFetch});t.after(()=>analysis.app.close());const analysisUrl=await analysis.app.listen({host:'127.0.0.1',port:0});
 const alerts=await createAlerts({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,devicesUrl,receptionUrl,internalToken:token});t.after(()=>alerts.app.close());const alertsUrl=await alerts.app.listen({host:'127.0.0.1',port:0});
 const gateway=createGateway({logger:false,authUrl,devicesUrl,receptionUrl,analysisUrl,alertsUrl});t.after(()=>gateway.close());
 const password='Prueba independiente de sensores 2026';
 async function account(email:string){await gateway.inject({method:'POST',url:'/api/auth/register',payload:{name:'Prueba sensores',email,password}});const login=await gateway.inject({method:'POST',url:'/api/auth/login',payload:{email,password}});return String(login.headers['set-cookie']).split(';')[0];}
 const cookie=await account('sensor-owner@example.com');
 const created=await gateway.inject({method:'POST',url:'/api/devices',headers:{cookie},payload:{name:'Estación de prueba',location:'Patio de prueba',model:'ESP32'}});assert.equal(created.statusCode,201);
 const {device,credential}=created.json();
 const payload=()=>({device_id:device.id,packet_id:randomUUID(),measured_at:new Date().toISOString(),measurements:{temperature_c:29.5,humidity_pct:76,rain_detected:false,pressure_hpa:1008,rain_raw_adc:3900}});
 const send=(body:any=payload(),key=credential)=>gateway.inject({method:'POST',url:'/api/readings',headers:{authorization:'Bearer '+key},payload:body});
 return {gateway,devices,reception,analysis,alerts,device,credential,cookie,payload,send,account,token};
}

const rule=(device_id:string)=>({device_id,name:'Temperatura de prueba',metric:'temperature_c',operator:'gt',threshold:32,enabled:true});

test('histórico completo agrupa meses y años sin perder registros anteriores a 30 días',async t=>{
 const f=await fixture(t);const user=(await f.gateway.inject({url:'/api/auth/me',headers:{cookie:f.cookie}})).json().user;
 for(const when of ['2025-03-10T12:00:00Z','2025-04-10T12:00:00Z'])await f.analysis.db.query('INSERT INTO analysis_samples(reading_id,device_id,owner_id,measured_at,received_at,temperature_c) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),f.device.id,user.id,new Date(when),new Date(when),30]);
 const base='/api/analysis/summary?device_id='+f.device.id+'&period=all';
 const month=(await f.gateway.inject({url:base+'&aggregation=month',headers:{cookie:f.cookie}})).json();assert.equal(month.samples,2);assert.equal(month.series.length,2);assert.equal(month.series[0].bucket,'2025-03-01T05:00:00.000Z');
 const year=(await f.gateway.inject({url:base+'&aggregation=year',headers:{cookie:f.cookie}})).json();assert.equal(year.series.length,1);assert.equal(year.series[0].samples,2);assert.equal((await f.gateway.inject({url:base+'&aggregation=hour',headers:{cookie:f.cookie}})).statusCode,422);
 assert.equal((await f.gateway.inject('/api/analysis/external?source=skmr')).statusCode,401);
});
test('análisis por Gateway: agregados reales, nulos, series y deduplicación del consumo',async t=>{
 const f=await fixture(t);
 for(const temperature of [28,30,32])assert.equal((await f.send({...f.payload(),measurements:{temperature_c:temperature,humidity_pct:70,rain_detected:temperature===32}})).statusCode,201);
 await f.send({...f.payload(),measurements:{humidity_pct:80}});
 await f.analysis.syncOnce();await f.analysis.syncOnce();
 const result=await f.gateway.inject({url:'/api/analysis/summary?device_id='+f.device.id,headers:{cookie:f.cookie}});assert.equal(result.statusCode,200);const data=result.json();
 assert.equal(data.samples,4);assert.equal(data.metrics.temperature_c.average,30);assert.equal(data.metrics.temperature_c.count,3);assert.equal(data.metrics.temperature_c.minimum,28);assert.equal(data.metrics.temperature_c.maximum,32);assert.equal(data.metrics.pressure_hpa.average,null);assert.equal(data.wet_samples,1);assert.equal(data.series.reduce((sum:number,item:any)=>sum+item.samples,0),4);assert.equal(data.sync.unavailable,false);
 assert.equal(data.rain_samples,3);assert.ok(Math.abs(data.metrics.temperature_c.standard_deviation-Math.sqrt(8/3))<1e-8);assert.equal(data.metrics.pressure_hpa.standard_deviation,null);assert.equal(data.series.reduce((sum:number,item:any)=>sum+item.temperature_c_count,0),3);assert.equal(data.series[0].temperature_c_min,28);assert.equal(data.series[0].temperature_c_max,32);
 assert.equal((await f.reception.db.query('SELECT * FROM reading_deliveries WHERE consumer=$1',['analysis'])).length,4);
 assert.equal((await f.gateway.inject('/api/analysis/summary?device_id='+f.device.id)).statusCode,401);
 const other=await f.account('other-analysis@example.com');assert.equal((await f.gateway.inject({url:'/api/analysis/summary?device_id='+f.device.id,headers:{cookie:other}})).statusCode,404);
 assert.equal((await f.reception.app.inject('/internal/readings/feed?consumer=analysis&since='+new Date().toISOString())).statusCode,403);
 assert.equal((await f.gateway.inject('/api/internal/readings/feed')).statusCode,404);
});

test('referencia externa pasa por Gateway, respeta propietario y no altera mediciones',async t=>{
 let calls=0;const bucket=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString().slice(0,16);
 const weatherFetch:typeof fetch=async()=>{calls++;return Response.json({latitude:8.75,longitude:-75.88,hourly:{time:[bucket],temperature_2m:[30],relative_humidity_2m:[80],surface_pressure:[1006],precipitation:[.5]}});};
 const f=await fixture(t,weatherFetch);const url='/api/analysis/reference?device_id='+f.device.id;
 assert.equal((await f.gateway.inject(url)).statusCode,401);assert.equal(calls,0);
 const other=await f.account('reference-other@example.com');assert.equal((await f.gateway.inject({url,headers:{cookie:other}})).statusCode,404);assert.equal(calls,0);
 const result=await f.gateway.inject({url,headers:{cookie:f.cookie}});assert.equal(result.statusCode,200);assert.equal(result.json().kind,'weather_model');assert.equal(result.json().series[0].precipitation_mm,.5);assert.equal(result.json().series[0].pressure_hpa,1006);
 assert.equal((await f.gateway.inject({url,headers:{cookie:f.cookie}})).statusCode,200);assert.equal(calls,1);assert.equal((await f.analysis.db.query('SELECT * FROM analysis_samples')).length,0);
});
test('alertas: cruce de umbral, recuperación, nueva incidencia y reconocimiento sin inundación',async t=>{
 const f=await fixture(t);const created=await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:{cookie:f.cookie},payload:rule(f.device.id)});assert.equal(created.statusCode,201);const id=created.json().rule.id;
 for(const temperature of [30,35,36,28,35]){await new Promise(resolve=>setTimeout(resolve,2));assert.equal((await f.send({...f.payload(),measurements:{temperature_c:temperature}})).statusCode,201);}
 await f.alerts.syncOnce();
 const get=()=>f.gateway.inject({url:'/api/alerts?device_id='+f.device.id,headers:{cookie:f.cookie}});
 const first=(await get()).json();assert.equal(first.counts.total,2);assert.equal(first.counts.open,1);assert.equal(first.rules.length,1);const active=first.events.find((event:any)=>!event.resolved_at);assert.ok(active);
 await f.reception.db.query('DELETE FROM reading_deliveries WHERE consumer=$1',['alerts']);await f.alerts.syncOnce();assert.equal((await get()).json().counts.total,2);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/alerts/events/'+active.id+'/ack',headers:{cookie:f.cookie}})).statusCode,200);assert.equal((await get()).json().counts.unacknowledged,0);assert.equal((await get()).json().counts.open,1);
 const other=await f.account('other-alerts@example.com');assert.equal((await f.gateway.inject({method:'POST',url:'/api/alerts/events/'+active.id+'/ack',headers:{cookie:other}})).statusCode,404);
 assert.equal((await f.gateway.inject({method:'PUT',url:'/api/alerts/rules/'+id,headers:{cookie:other},payload:{...rule(f.device.id),device_id:undefined}})).statusCode,404);
 assert.equal((await f.gateway.inject({method:'DELETE',url:'/api/alerts/rules/'+id,headers:{cookie:f.cookie}})).statusCode,204);assert.equal((await get()).json().rules.length,0);assert.equal((await get()).json().counts.open,0);assert.equal((await get()).json().counts.total,2);
});
test('reglas: no evalúa datos anteriores a su creación y valida umbrales y propietario',async t=>{
 const f=await fixture(t);await f.send({...f.payload(),measured_at:new Date(Date.now()-60000).toISOString(),measurements:{temperature_c:39}});
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:{cookie:f.cookie},payload:{...rule(f.device.id),metric:'humidity_pct',threshold:150}})).statusCode,422);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:{cookie:f.cookie},payload:{...rule(f.device.id),owner_id:'forged'}})).statusCode,422);
 await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:{cookie:f.cookie},payload:rule(f.device.id)});await f.alerts.syncOnce();const result=await f.gateway.inject({url:'/api/alerts?device_id='+f.device.id,headers:{cookie:f.cookie}});assert.equal(result.json().counts.total,0);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/alerts/rules',payload:rule(f.device.id)})).statusCode,401);
});
