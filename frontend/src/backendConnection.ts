export async function recoverSession({signal,onWaiting,fetcher=fetch,retryDelay=3000,attemptTimeout=15000,deadline=90000}:{signal:AbortSignal;onWaiting:()=>void;fetcher?:typeof fetch;retryDelay?:number;attemptTimeout?:number;deadline?:number}){
 const until=Date.now()+deadline;
 while(!signal.aborted&&Date.now()<until){
  try{
   const response=await fetcher('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(Math.min(attemptTimeout,Math.max(1,until-Date.now())))])});
   if(response.status===401)return null;
   if(response.ok){const data=await response.json();if(!data.user)throw new Error('Respuesta de acceso inválida.');return data.user;}
   if(response.status<500)throw new Error(response.status===403?'El servidor no reconoce la dirección de esta página.':'No se pudo comprobar la sesión.');
  }catch(error){if(signal.aborted)throw error;if(error instanceof Error&&['El servidor no reconoce la dirección de esta página.','No se pudo comprobar la sesión.','Respuesta de acceso inválida.'].includes(error.message))throw error;}
  onWaiting();
  await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},Math.min(retryDelay,Math.max(0,until-Date.now())));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
 }
 throw new Error('El servidor sigue sin responder. Puedes reintentar; tus datos no se han enviado.');
}
