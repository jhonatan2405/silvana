import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

export const services=[
 {name:'usuarios-auth-service',key:'USUARIOS_DATABASE_URL',offset:1},
 {name:'dispositivos-service',key:'DISPOSITIVOS_DATABASE_URL',offset:2},
 {name:'recepcion-iot-service',key:'RECEPCION_DATABASE_URL',offset:3},
 {name:'analisis-service',key:'ANALISIS_DATABASE_URL',offset:4},
 {name:'alertas-service',key:'ALERTAS_DATABASE_URL',offset:5},
 {name:'notificaciones-service',key:'NOTIFICACIONES_DATABASE_URL',offset:6},
];
export function childEnvironment(service,source=process.env){
 const base=Number(source.SILVANA_INTERNAL_BASE_PORT??18000);const env={...source};
 for(const key of Object.keys(env))if(key.endsWith('_DATABASE_URL')||key==='DATABASE_URL')delete env[key];
 Object.assign(env,{HOST:service.key?'127.0.0.1':'0.0.0.0',PORT:String(service.key?base+service.offset:Number(source.PORT??10000)),FRONTEND_ORIGIN:source.FRONTEND_ORIGIN??source.RENDER_EXTERNAL_URL??'http://localhost:5173',COOKIE_SECURE:source.COOKIE_SECURE??'true',AUTH_SERVICE_URL:'http://127.0.0.1:'+(base+1),DEVICES_SERVICE_URL:'http://127.0.0.1:'+(base+2),RECEPTION_SERVICE_URL:'http://127.0.0.1:'+(base+3),ANALYSIS_SERVICE_URL:'http://127.0.0.1:'+(base+4),ALERTS_SERVICE_URL:'http://127.0.0.1:'+(base+5),NOTIFICATIONS_SERVICE_URL:'http://127.0.0.1:'+(base+6)});
 if(service.key)env.DATABASE_URL=source[service.key];
 if(service.offset===1)delete env.INTERNAL_SERVICE_TOKEN;
 return env;
}
export async function start(){
 for(const service of services)if(!process.env[service.key])throw new Error('Falta '+service.key+'.');
 if(!process.env.INTERNAL_SERVICE_TOKEN||process.env.INTERNAL_SERVICE_TOKEN.length<24)throw new Error('Falta un token interno de al menos 24 caracteres.');
 const children=[];let stopping=false;
 const stop=(code)=>{if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');const timeout=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(code);},12000);timeout.unref();Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();else child.once('exit',resolve);}))).then(()=>{clearTimeout(timeout);process.exit(code);});};
 process.once('SIGINT',()=>stop(0));process.once('SIGTERM',()=>stop(0));
 for(const service of [...services,{name:'api-gateway',offset:0}]){
  if(stopping)return;
  const env=childEnvironment(service);const child=spawn(process.execPath,['--max-old-space-size=64',service.name+'/dist/server.js'],{env,stdio:'inherit'});children.push(child);
  child.once('error',()=>{console.error('No se pudo ejecutar '+service.name);stop(1);});child.once('exit',(code)=>{if(!stopping){console.error(service.name+' terminó inesperadamente. Código: '+code);stop(1);}});
  const deadline=Date.now()+90000;let ready=false;
  while(Date.now()<deadline&&!stopping){try{const response=await fetch('http://127.0.0.1:'+env.PORT+(service.key?'/ready':'/health'),{signal:AbortSignal.timeout(3000)});if(response.ok){ready=true;break;}}catch{}await delay(500);}
  if(!ready){console.error('No se confirmó el arranque de '+service.name);stop(1);return;}
  console.log('Silvana · '+service.name+' listo.');
 }
 console.log('Silvana · Gateway público en el puerto '+(process.env.PORT??10000)+'. Seis servicios internos preparados.');
}
import {pathToFileURL} from 'node:url';
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)start().catch(error=>{console.error(error.message);process.exitCode=1;});
