import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {parse} from 'dotenv';import {randomUUID} from 'node:crypto';
import {createAuth} from '../../usuarios-auth-service/src/app.js';import {createDevices} from '../../dispositivos-service/src/app.js';import {createReception} from '../../recepcion-iot-service/src/app.js';import {createAnalysis} from '../src/app.js';import {createAlerts} from '../../alertas-service/src/app.js';import {createGateway} from '../../api-gateway/src/app.js';
const analysisEnv=parse(readFileSync(new URL('../.env',import.meta.url))),alertsEnv=parse(readFileSync(new URL('../../alertas-service/.env',import.meta.url)));
const closes:(()=>Promise<unknown>)[]=[];let fixtureData:any;
async function fixture(t:any){
 const token='internal-test-secret-not-used-in-production';
 const auth=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false});t.after(()=>auth.app.close());const authUrl=await auth.app.listen({host:'127.0.0.1',port:0});
 const devices=await createDevices({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,internalToken:token});t.after(()=>devices.app.close());const devicesUrl=await devices.app.listen({host:'127.0.0.1',port:0});
 const reception=await createReception({databaseUrl:'sqlite:///:memory:',logger:false,devicesUrl,internalToken:token});t.after(()=>reception.app.close());const receptionUrl=await reception.app.listen({host:'127.0.0.1',port:0});
 const analysis=await createAnalysis({databaseUrl:analysisEnv.DATABASE_URL,logger:false,authUrl,devicesUrl,receptionUrl,internalToken:token});t.after(()=>analysis.app.close());const analysisUrl=await analysis.app.listen({host:'127.0.0.1',port:0});
 const alerts=await createAlerts({databaseUrl:alertsEnv.DATABASE_URL,logger:false,authUrl,devicesUrl,receptionUrl,internalToken:token});t.after(()=>alerts.app.close());const alertsUrl=await alerts.app.listen({host:'127.0.0.1',port:0});
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


try{
 const f=fixtureData=await fixture({after:(close:()=>Promise<unknown>)=>closes.push(close)});
 const created=await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:{cookie:f.cookie},payload:{device_id:f.device.id,name:'Verificación temporal',metric:'temperature_c',operator:'gt',threshold:32,enabled:true}});assert.equal(created.statusCode,201);
 for(const value of [29,35,28]){await new Promise(resolve=>setTimeout(resolve,5));assert.equal((await f.send({...f.payload(),measurements:{temperature_c:value,humidity_pct:70}})).statusCode,201);}
 await f.analysis.syncOnce();await f.alerts.syncOnce();
 const analysis=await f.gateway.inject({url:'/api/analysis/summary?device_id='+f.device.id,headers:{cookie:f.cookie}});assert.equal(analysis.statusCode,200);assert.equal(analysis.json().samples,3);assert.ok(Math.abs(analysis.json().metrics.temperature_c.average-92/3)<.001);
 const alerts=await f.gateway.inject({url:'/api/alerts?device_id='+f.device.id,headers:{cookie:f.cookie}});assert.equal(alerts.statusCode,200);assert.equal(alerts.json().counts.total,1);assert.equal(alerts.json().counts.open,0);
 console.log('PostgreSQL verificado: Gateway, análisis, series, reglas, cruce y recuperación.');
}catch(error){console.error('Verificación no completada:',(error as any).code??'ASSERTION_OR_SERVICE_ERROR');process.exitCode=1;}
finally{
 if(fixtureData){const f=fixtureData;try{await f.alerts.db.transaction(async(tx:any)=>{await tx.query('DELETE FROM alert_notification_receipts WHERE source_id IN (SELECT id FROM alert_notification_outbox WHERE device_id=$1)',[f.device.id]);await tx.query('DELETE FROM alert_notification_outbox WHERE device_id=$1',[f.device.id]);await tx.query('DELETE FROM alert_states WHERE rule_id IN (SELECT id FROM alert_rules WHERE device_id=$1)',[f.device.id]);await tx.query('DELETE FROM alert_events WHERE device_id=$1',[f.device.id]);await tx.query('DELETE FROM alert_rules WHERE device_id=$1',[f.device.id]);});await f.analysis.db.query('DELETE FROM analysis_samples WHERE device_id=$1',[f.device.id]);console.log('Datos temporales eliminados de ambas bases.');}catch{console.error('Revisar limpieza de la estación temporal:',f.device.id);process.exitCode=1;}}
 for(const close of closes.reverse()){try{await close();}catch{}}
}
