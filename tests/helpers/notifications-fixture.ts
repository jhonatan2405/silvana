import {createAnalysis} from '../../analisis-service/src/app.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createAuth} from '../../usuarios-auth-service/src/app.js';
import {createDevices} from '../../dispositivos-service/src/app.js';
import {createReception} from '../../recepcion-iot-service/src/app.js';
import {createNotifications} from '../../notificaciones-service/src/app.js';
import type {Mailer} from '../../notificaciones-service/src/mailer.js';
import {createAlerts} from '../../alertas-service/src/app.js';
import {createGateway} from '../../api-gateway/src/app.js';

export async function notificationFixture(t:any,options:{databaseUrl?:string;mailer?:Mailer|null}={}){
 const token='internal-test-secret-not-used-in-production';
 const auth=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false,internalToken:token});t.after(()=>auth.app.close());const authUrl=await auth.app.listen({host:'127.0.0.1',port:0});
 const devices=await createDevices({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,internalToken:token});t.after(()=>devices.app.close());const devicesUrl=await devices.app.listen({host:'127.0.0.1',port:0});
 const reception=await createReception({databaseUrl:'sqlite:///:memory:',logger:false,devicesUrl,internalToken:token});t.after(()=>reception.app.close());const receptionUrl=await reception.app.listen({host:'127.0.0.1',port:0});
 const alerts=await createAlerts({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,devicesUrl,receptionUrl,internalToken:token});t.after(()=>alerts.app.close());const alertsUrl=await alerts.app.listen({host:'127.0.0.1',port:0});
 const notifications=await createNotifications({databaseUrl:options.databaseUrl??'sqlite:///:memory:',logger:false,authUrl,alertsUrl,devicesUrl,internalToken:token,mailer:options.mailer??null});t.after(()=>notifications.app.close());const notificationsUrl=await notifications.app.listen({host:'127.0.0.1',port:0});
 const analysis=await createAnalysis({databaseUrl:'sqlite:///:memory:',logger:false,authUrl,devicesUrl,receptionUrl,internalToken:token});t.after(()=>analysis.app.close());const analysisUrl=await analysis.app.listen({host:'127.0.0.1',port:0});
 const gateway=createGateway({logger:false,authUrl,devicesUrl,receptionUrl,alertsUrl,notificationsUrl,analysisUrl});t.after(()=>gateway.close());
 const password='Prueba independiente de sensores 2026';
 async function account(email:string){await gateway.inject({method:'POST',url:'/api/auth/register',payload:{name:'Prueba sensores',email,password}});const login=await gateway.inject({method:'POST',url:'/api/auth/login',payload:{email,password}});return String(login.headers['set-cookie']).split(';')[0];}
 const cookie=await account('sensor-owner@example.com');
 const created=await gateway.inject({method:'POST',url:'/api/devices',headers:{cookie},payload:{name:'Estación de prueba',location:'Patio de prueba',model:'ESP32'}});assert.equal(created.statusCode,201);
 const {device,credential}=created.json();
 const payload=()=>({device_id:device.id,packet_id:randomUUID(),measured_at:new Date().toISOString(),measurements:{temperature_c:29.5,humidity_pct:76,rain_detected:false,pressure_hpa:1008,rain_raw_adc:3900}});
 const send=(body:any=payload(),key=credential)=>gateway.inject({method:'POST',url:'/api/readings',headers:{authorization:'Bearer '+key},payload:body});
 return {authUrl,alertsUrl,devicesUrl,analysis,gateway,devices,reception,notifications,alerts,device,credential,cookie,payload,send,account,token};
}
