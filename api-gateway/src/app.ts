import { createHttp,HttpError } from './http.js';
import './config.js';
export function createGateway(options:{logger?:boolean;origin?:string;authUrl?:string;devicesUrl?:string;receptionUrl?:string;analysisUrl?:string;alertsUrl?:string;notificationsUrl?:string}={}){
 const origin=options.origin??process.env.FRONTEND_ORIGIN??'http://localhost:5173';
 const app=createHttp('gateway',origin,options.logger??true);
 app.removeAllContentTypeParsers();app.addContentTypeParser('*',{parseAs:'buffer'},(_request,body,done)=>done(null,body));
 app.addHook('onRequest',async(request,reply)=>{if(request.headers.origin&&request.headers.origin!==origin)return reply.code(403).send({detail:'Origen no permitido.'});});
 const upstreams={auth:options.authUrl??process.env.AUTH_SERVICE_URL??'http://127.0.0.1:8001',devices:options.devicesUrl??process.env.DEVICES_SERVICE_URL??'http://127.0.0.1:8002',readings:options.receptionUrl??process.env.RECEPTION_SERVICE_URL??'http://127.0.0.1:8003',analysis:options.analysisUrl??process.env.ANALYSIS_SERVICE_URL??'http://127.0.0.1:8004',alerts:options.alertsUrl??process.env.ALERTS_SERVICE_URL??'http://127.0.0.1:8005',notifications:options.notificationsUrl??process.env.NOTIFICATIONS_SERVICE_URL??'http://127.0.0.1:8006'};
 app.get('/health',async()=>({status:'ok',service:'gateway',runtime:'nodejs'}));
 app.route<{Params:{'*':string};Body:Buffer}>({method:['GET','POST','PUT','DELETE'],url:'/api/*',handler:async(request,reply)=>{
  const incoming=new URL(request.raw.url??'/', 'http://gateway.local');
  const path=incoming.pathname.slice(5),first=path.split('/')[0] as keyof typeof upstreams;
  if(!Object.hasOwn(upstreams,first))throw new HttpError(404,'Ruta no encontrada.');
  const url=new URL('/'+path+incoming.search,upstreams[first]);
  if(url.pathname!=='/'+first&&!url.pathname.startsWith('/'+first+'/'))throw new HttpError(404,'Ruta no encontrada.');
  const headers=new Headers();for(const name of ['cookie','content-type','origin','accept','authorization']){const value=request.headers[name];if(typeof value==='string')headers.set(name,value);}
  let result:Response;
  try{result=await fetch(url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body?.toString('utf8'),signal:AbortSignal.timeout(12000),redirect:'manual'});}catch{throw new HttpError(503,'El servicio no está disponible. Intenta nuevamente.');}
  for(const name of ['content-type','cache-control','x-content-type-options','retry-after']){const value=result.headers.get(name);if(value)reply.header(name,value);}
  const cookies=result.headers.getSetCookie();if(cookies.length)reply.header('set-cookie',cookies);
  return reply.code(result.status).send(result.status===204?undefined:Buffer.from(await result.arrayBuffer()));
 }});
 return app;
}
