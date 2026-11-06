import {HttpError} from './http.js';
export async function getJson(url:string,init:RequestInit={}){
 let response:Response;try{response=await fetch(url,{...init,signal:AbortSignal.timeout(8000),redirect:'error'});}catch{throw new HttpError(503,'Un servicio necesario no está disponible.');}
 if(!response.ok)throw new HttpError([401,403,404].includes(response.status)?response.status:503,response.status===401?'Tu sesión ha expirado.':response.status===404?'Estación no encontrada.':'No se pudo completar la consulta.');
 return await response.json() as any;
}
export async function owner(cookie:string|undefined,authUrl:string){if(!cookie)throw new HttpError(401,'Inicia sesión para continuar.');const data=await getJson(authUrl+'/auth/me',{headers:{cookie}});if(typeof data.user?.id!=='string')throw new HttpError(503,'No se pudo verificar la sesión.');return data.user as {id:string};}
export async function ownedDevice(id:string,cookie:string|undefined,authUrl:string,devicesUrl:string){const user=await owner(cookie,authUrl);await getJson(devicesUrl+'/devices/'+id,{headers:{cookie:cookie!}});return user;}
export function createWorker(receptionUrl:string,token:string|undefined,consumer:'analysis'|'alerts',process:(items:any[])=>Promise<void>,since:()=>Promise<string|null>){
 let pending:Promise<void>|null=null,lastSuccess:string|null=null,lastError=false,catchingUp=false;
 const run=()=>{if(pending)return pending;pending=Promise.resolve().then(async()=>{try{
  if(!token)throw new Error('Configuración interna incompleta.');const start=await since();if(start===null){lastSuccess=new Date().toISOString();lastError=false;return;}
  const query=new URLSearchParams({consumer,limit:'200',since:start});const headers={'x-internal-token':token};
  const data=await getJson(receptionUrl+'/internal/readings/feed?'+query,{headers});
  catchingUp=data.items.length===200;
  if(data.items.length){await process(data.items);await getJson(receptionUrl+'/internal/readings/ack',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({consumer,ids:data.items.map((item:any)=>item.id)})});}
  lastSuccess=new Date().toISOString();lastError=false;
 }catch{lastError=true;}finally{pending=null;}});return pending;};
 return {run,status:()=>({last_success_at:lastSuccess,unavailable:lastError,catching_up:catchingUp}),finish:async()=>{await pending;}};
}
