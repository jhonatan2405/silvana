import Fastify from 'fastify';
import { ZodError } from 'zod';
export class HttpError extends Error { constructor(public statusCode:number,message:string,public headers:Record<string,string>={}){super(message);} }
export function createHttp(service:string,origin:string,logger=true){
 const app=Fastify({bodyLimit:16384,logger:logger?{level:'info',redact:['req.headers.cookie','req.headers.authorization','res.headers.set-cookie'],serializers:{req:(req:any)=>({method:req.method,url:req.url?.split('?')[0],remoteAddress:req.ip})}}:false});
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
