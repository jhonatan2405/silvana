import nodemailer from 'nodemailer';
import {readFileSync} from 'node:fs';
export type Mail={id:string;to:string;title:string;body:string;value:number;threshold:number;metric:string;measured_at:string};
export type Mailer={send:(mail:Mail)=>Promise<void>;close?:()=>void};
const units:Record<string,string>={temperature_c:'°C',temperature_bmp_c:'°C',humidity_pct:'%',pressure_hpa:'hPa',rain_detected:'(0 = seco · 1 = agua)'};
const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function renderEmail(mail:Mail,appUrl:string){
 const url=new URL(appUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('APP_URL inválida.');
 const time=new Date(mail.measured_at).toLocaleString('es-CO',{timeZone:'America/Bogota'});const values:Record<string,unknown>={...mail,value:mail.value+' '+(units[mail.metric]??''),threshold:mail.threshold+' '+(units[mail.metric]??''),time,url:url.href,context:mail.metric==='station_status'?'Este aviso registra un cambio en la comunicación o en la habilitación de tu estación. Consulta Dispositivos para revisar su estado.':'Este aviso se basa en las mediciones recibidas y en tus reglas. Consulta el historial de alertas para conocer el contexto.'};
 let template=readFileSync(new URL('../templates/alert.html',import.meta.url),'utf8');if(mail.metric==='station_status')template=template.replace(/<!-- measurement:start -->[\s\S]*?<!-- measurement:end -->/,'');const html=template.replace(/{{(\w+)}}/g,(_,key)=>escape(values[key]??''));
 return {attachments:[{filename:'silvana.png',content:readFileSync(new URL('../templates/silvana-mark.png',import.meta.url)),contentType:'image/png',cid:'silvana-mark@silvana.notifications',contentDisposition:'inline' as const}],subject:'Silvana · '+mail.title.replace(/[\r\n]/g,' '),html,text:mail.title+'\n\n'+mail.body+(mail.metric==='station_status'?'':'\nValor: '+values.value+'\nUmbral: '+values.threshold)+'\nHora de Montería: '+time+'\n\n'+url.href+'\nCambia tus preferencias desde Notificaciones.'};
}
export function smtpMailer():Mailer|null{
 const {SMTP_HOST,SMTP_USER,SMTP_PASSWORD,SMTP_FROM}=process.env;const port=Number(process.env.SMTP_PORT??465);
 if(!SMTP_HOST||!SMTP_USER||!SMTP_PASSWORD||!SMTP_FROM)return null;if(![465,587].includes(port))throw new Error('Usa SMTP_PORT 465 o 587.');
 const transport=nodemailer.createTransport({host:SMTP_HOST,port,secure:port===465,requireTLS:true,auth:{user:SMTP_USER,pass:SMTP_PASSWORD},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
 return {send:async mail=>{const info=await transport.sendMail({from:{name:'Silvana',address:SMTP_FROM},to:{address:mail.to,name:''},messageId:'<'+mail.id+'@silvana.notifications>',...renderEmail(mail,process.env.APP_URL??'http://localhost:5173')});if(!info.accepted?.length)throw new Error('SMTP_REJECTED');},close:()=>transport.close()};
}
