import Fastify, { LogController } from 'fastify';
import { ZodError } from 'zod';
export class HttpError extends Error { constructor(public statusCode:number,message:string,public headers:Record<string,string>={}){super(message);} }
export function createHttp(service:string,origin:string,logger=true){
 const app=Fastify({bodyLimit:16384,logController:new LogController({disableRequestLogging:true}),logger:logger?{level:'info',stream:{write(line:string){const entry=JSON.parse(line);const time=new Date(entry.time).toLocaleTimeString('es-CO',{hour12:false});if(entry.method){const status=entry.status;const color=status>=500?'\x1b[31m':status>=400?'\x1b[33m':'\x1b[32m';const ansi=process.stdout.isTTY;const method=entry.method.padEnd(6);const label=ansi?`\x1b[1;36m${method}\x1b[0m`:method;const code=ansi?`${color}${status}\x1b[0m`:status;process.stdout.write(`${time}  ${label} ${entry.path}  -> ${entry.service}  ${code}  ${entry.durationMs} ms\n`);}else{process.stdout.write(`${time}  ${entry.msg}${entry.code?' ['+entry.code+']':''}\n`);}}},redact:['req.headers.cookie','req.headers.authorization','res.headers.set-cookie'],serializers:{req:(req:any)=>({method:req.method,url:req.url?.split('?')[0],remoteAddress:req.ip})}}:false});
 app.addHook('onResponse',async(request,reply)=>{const path=new URL(request.raw.url??'/', 'http://gateway.local').pathname;const segment=path.split('/')[2];const target=path.startsWith('/api/auth')&&segment==='auth'?'auth-service':path.startsWith('/api/devices')&&segment==='devices'?'dispositivos-service':segment==='readings'?'recepcion-iot-service':segment==='analysis'?'analisis-service':segment==='alerts'?'alertas-service':segment==='notifications'?'notificaciones-service':'gateway';request.log.info({method:request.method,path,service:target,status:reply.statusCode,durationMs:Math.round(reply.elapsedTime)},'Solicitud completada');});
 const jsonParser=app.getDefaultJsonParser('error','error');
 app.removeContentTypeParser('application/json');app.addContentTypeParser('application/json',{parseAs:'string'},(request,body,done)=>{if(body==='')return done(null,undefined);jsonParser(request,body as string,done);});
 app.addHook('onRequest',async(request,reply)=>{
  if(request.headers.origin&&request.headers.origin!==origin&&!['GET','HEAD','OPTIONS'].includes(request.method))return reply.code(403).send({detail:'Origen no permitido.'});
 });
 app.addHook('onSend',async(_request,reply,payload)=>{reply.header('Cache-Control','no-store');reply.header('X-Content-Type-Options','nosniff');return payload;});
 app.setErrorHandler((error,request,reply)=>{
  if(error instanceof ZodError)return reply.code(422).send({detail:'Revisa los datos ingresados.',fields:error.issues.map(issue=>issue.path.join('.'))});
  if(error instanceof HttpError)return reply.headers(error.headers).code(error.statusCode).send({detail:error.message});
  const status=(error as any).statusCode;
  if(status&&status<500)return reply.code(status).send({detail:status===413?'La solicitud excede el tamaño permitido.':'Solicitud no válida.'});
  request.log.error({service,code:(error as any).code||'INTERNAL_ERROR'},'No se pudo completar la operación');
  return reply.code(503).send({detail:'El servicio no está disponible. Intenta nuevamente.'});
 });
 app.setNotFoundHandler((_request,reply)=>reply.code(404).send({detail:'Ruta no encontrada.'}));
 return app;
}
