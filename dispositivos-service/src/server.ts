import { createDevices } from './app.js';
try{
 const {app}=await createDevices({startWorker:true});
 await app.listen({host:process.env.HOST??'127.0.0.1',port:Number(process.env.PORT??8002)});
 let closing=false;
 const stop=async()=>{if(closing)return;closing=true;await app.close();process.exit(0);};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}catch(error){console.error('No se pudo iniciar dispositivos-service. Revisa configuración, puerto y base de datos.',{code:(error as any).code??'STARTUP_ERROR'});process.exit(1);}
