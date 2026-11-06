// Private HTTPS mail relay. Only notificaciones-service knows MAIL_RELAY_TOKEN.
import nodemailer from 'npm:nodemailer@10.3.1';
import { timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

const reply=(status:number,body:object)=>Response.json(body,{status});
Deno.serve(async request=>{
 const secret=Deno.env.get('MAIL_RELAY_TOKEN')??'';
 const provided=request.headers.get('x-silvana-mail-token')??'';
 const expected=Buffer.from(secret),actual=Buffer.from(provided);
 if(expected.length<32||actual.length!==expected.length||!timingSafeEqual(expected,actual))return reply(401,{error:'UNAUTHORIZED'});
 if(request.method!=='POST')return reply(405,{error:'METHOD_NOT_ALLOWED'});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415,{error:'JSON_REQUIRED'});
 // Read a bounded stream before parsing; do not trust Content-Length.
 let raw='';let size=0;const reader=request.body?.getReader();if(!reader)return reply(400,{error:'BODY_REQUIRED'});
 const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();return reply(413,{error:'TOO_LARGE'});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
 let mail;try{mail=JSON.parse(raw);}catch{return reply(400,{error:'INVALID_JSON'});}
 const bounded=(value:unknown,max:number)=>typeof value==='string'&&value.length>0&&value.length<=max;
 if(!bounded(mail.id,80)||!/^[a-zA-Z0-9-]+$/.test(mail.id)||!bounded(mail.to,254)||!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(mail.to)||!bounded(mail.subject,300)||/[\r\n]/.test(mail.subject)||!bounded(mail.html,50000)||!bounded(mail.text,10000)||!bounded(mail.logo,50000)||!/^[A-Za-z0-9+/]+={0,2}$/.test(mail.logo))return reply(400,{error:'INVALID_MAIL'});
 const user=Deno.env.get('SMTP_USER'),password=Deno.env.get('SMTP_PASSWORD');if(!user||!password)return reply(503,{error:'NOT_CONFIGURED'});
 const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user,pass:password},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true});
 try{const result=await transport.sendMail({from:{name:'Silvana',address:user},to:{name:'',address:mail.to},messageId:`<${mail.id}@silvana.notifications>`,subject:mail.subject,html:mail.html,text:mail.text,attachments:[{filename:'silvana.png',content:Buffer.from(mail.logo,'base64'),contentType:'image/png',cid:'silvana-mark@silvana.notifications',contentDisposition:'inline'}]});return result.accepted?.length?reply(200,{sent:true}):reply(502,{error:'REJECTED'});}catch{return reply(502,{error:'DELIVERY_FAILED'});}finally{transport.close();}
});
