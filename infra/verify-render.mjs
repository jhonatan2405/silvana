import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';import {randomBytes,randomUUID} from 'node:crypto';import {setTimeout as delay} from 'node:timers/promises';import {services,childEnvironment} from './start-render.mjs';
const folder=await mkdtemp(join(tmpdir(),'silvana-render-'));const env={...process.env,PORT:'26100',SILVANA_INTERNAL_BASE_PORT:'26000',FRONTEND_ORIGIN:'http://localhost:26100',COOKIE_SECURE:'false',INTERNAL_SERVICE_TOKEN:randomBytes(32).toString('hex'),SMTP_HOST:'',SMTP_USER:'',SMTP_PASSWORD:'',SMTP_FROM:''};
for(const service of services)env[service.key]='sqlite:///'+join(folder,service.name+'.db');
const isolated=childEnvironment(services[1],env);assert.equal(isolated.DATABASE_URL,env.DISPOSITIVOS_DATABASE_URL);assert.equal(isolated.USUARIOS_DATABASE_URL,undefined);assert.equal(isolated.HOST,'127.0.0.1');
const child=spawn(process.execPath,['infra/start-render.mjs'],{env,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',data=>{log=(log+data).slice(-20000)});child.stderr.on('data',data=>{log=(log+data).slice(-20000)});
async function request(path,method='GET',body,headers={}){return fetch('http://127.0.0.1:26100'+path,{method,headers:{'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});}
try{
 let ready=false;const deadline=Date.now()+90000;while(Date.now()<deadline&&child.exitCode===null){try{if((await request('/health')).ok){ready=true;break}}catch{}await delay(500)}assert.ok(ready,'El supervisor no confirmó el arranque.');
 const email='render-'+randomUUID()+'@example.com',password=randomBytes(20).toString('hex');assert.equal((await request('/api/auth/register','POST',{name:'Prueba aislada Render',email,password})).status,201);const login=await request('/api/auth/login','POST',{email,password});assert.equal(login.status,200);const cookie=login.headers.getSetCookie()[0].split(';')[0];
 const created=await request('/api/devices','POST',{name:'Estación temporal',location:'Prueba aislada',model:'ESP32'},{cookie});assert.equal(created.status,201);const {device,credential}=await created.json();
 const reading=await request('/api/readings','POST',{device_id:device.id,packet_id:randomUUID(),measured_at:new Date().toISOString(),measurements:{temperature_c:29,humidity_pct:70}},{authorization:'Bearer '+credential});assert.equal(reading.status,201);
 const analysis=await request('/api/analysis/summary?device_id='+device.id,'GET',undefined,{cookie});assert.equal(analysis.status,200);assert.equal((await request('/api/alerts?device_id='+device.id,'GET',undefined,{cookie})).status,200);
 assert.equal((await request('/api/notifications','GET',undefined,{cookie})).status,200);assert.equal((await request('/api/internal/notifications/feed')).status,404);console.log('Arranque agrupado verificado: siete procesos, Gateway, sesión, recepción y paneles. Bases temporales; sin correos externos.');
}catch(error){console.error('Prueba de arranque fallida:',error.message);process.exitCode=1;}
finally{
 child.kill('SIGTERM');await Promise.race([new Promise(done=>{if(child.exitCode!==null)done();else child.once('exit',done)}),delay(16000)]);
 // Child processes are owned by this supervisor; wait for its orderly shutdown before cleanup.
 const absolute=resolve(folder);assert.ok(absolute.startsWith(resolve(tmpdir())+sep+'silvana-render-'));await rm(absolute,{recursive:true,force:true,maxRetries:10,retryDelay:300});
}
