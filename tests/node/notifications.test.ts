import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {notificationFixture} from '../helpers/notifications-fixture.js';import {renderEmail} from '../../notificaciones-service/src/mailer.js';
const rule=(device_id:string)=>({device_id,name:'Temperatura del patio',metric:'temperature_c',operator:'gt',threshold:32,enabled:true});
async function createRule(f:any){const result=await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:{cookie:f.cookie},payload:rule(f.device.id)});assert.equal(result.statusCode,201);return result.json().rule.id;}
async function send(f:any,value:number){await new Promise(resolve=>setTimeout(resolve,3));assert.equal((await f.send({...f.payload(),measurements:{temperature_c:value}})).statusCode,201);await f.alerts.syncOnce();}
const list=(f:any,query='')=>f.gateway.inject({url:'/api/notifications'+query,headers:{cookie:f.cookie}});
const prefs={web_enabled:true,opened_enabled:true,resolved_enabled:true,email_enabled:true};
test('notificaciones por Gateway: apertura, recuperación, cola durable, deduplicación y aislamiento',async t=>{
 const f=await notificationFixture(t);await createRule(f);await send(f,35);await send(f,36);await send(f,28);await f.notifications.syncOnce();let data=(await list(f)).json();assert.equal(data.counts.total,3);assert.equal(data.counts.unread,3);assert.deepEqual(new Set(data.items.map((x:any)=>x.kind)),new Set(['opened','resolved']));assert.ok(data.items.every((x:any)=>x.email_status==='disabled'));
 await f.alerts.db.query('DELETE FROM alert_notification_receipts');await f.notifications.syncOnce();assert.equal((await list(f)).json().counts.total,3);
 const id=data.items[0].id;const other=await f.account('other-notifications@example.com');assert.equal((await f.gateway.inject({url:'/api/notifications',headers:{cookie:other}})).json().counts.total,0);assert.equal((await f.gateway.inject({method:'POST',url:'/api/notifications/'+id+'/read',headers:{cookie:other}})).statusCode,404);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/notifications/'+id+'/read',headers:{cookie:f.cookie}})).statusCode,200);assert.equal((await list(f,'?unread=true')).json().items.length,2);
 assert.equal((await f.gateway.inject('/api/notifications')).statusCode,401);assert.equal((await f.alerts.app.inject('/internal/notifications/feed')).statusCode,403);assert.equal((await f.gateway.inject('/api/internal/notifications/feed')).statusCode,404);
 const page=(await list(f,'?limit=1')).json();assert.equal(page.has_more,true);const next=(await list(f,'?limit=1&offset=1&before='+encodeURIComponent(page.as_of))).json();assert.notEqual(next.items[0].id,page.items[0].id);
});
test('correo: solo destinatario de la cuenta, fallo recuperable y sin duplicar lo aceptado',async t=>{
 const sent:any[]=[];let fail=true;const f=await notificationFixture(t,{mailer:{send:async mail=>{if(fail)throw new Error('No imprimir secreto SMTP');sent.push(mail);}}});
 assert.equal((await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:{...prefs,email:'injected@example.com'}})).statusCode,422);
 assert.equal((await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:prefs})).statusCode,200);await createRule(f);await send(f,35);await f.notifications.syncOnce();await f.notifications.sendEmails();let item=(await list(f)).json().items[0];assert.equal(item.email_status,'failed');assert.equal(item.email_attempts,1);assert.equal(sent.length,0);
 await f.notifications.sendEmails();assert.equal((await list(f)).json().items[0].email_attempts,1);fail=false;assert.equal((await f.gateway.inject({method:'POST',url:'/api/notifications/'+item.id+'/retry-email',headers:{cookie:f.cookie}})).statusCode,200);await f.notifications.sendEmails();await f.notifications.sendEmails();assert.equal(sent.length,1);assert.equal(sent[0].to,'sensor-owner@example.com');item=(await list(f)).json().items[0];assert.equal(item.email_status,'sent');assert.ok(item.email_sent_at);
 // Reading a notification does not acknowledge the underlying alert.
 await f.gateway.inject({method:'POST',url:'/api/notifications/'+item.id+'/read',headers:{cookie:f.cookie}});const events=await f.gateway.inject({url:'/api/alerts?device_id='+f.device.id,headers:{cookie:f.cookie}});assert.equal(events.json().counts.unacknowledged,1);
 await send(f,28);await f.notifications.syncOnce();await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:{...prefs,email_enabled:false}});await f.notifications.sendEmails();assert.equal(sent.length,1);assert.ok((await list(f)).json().items.some((item:any)=>item.email_status==='cancelled'));
});
test('preferencias no envían histórico por correo; lectura masiva respeta el corte y configuración incompleta',async t=>{
 const f=await notificationFixture(t);await createRule(f);await send(f,35);assert.equal((await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:prefs})).statusCode,409);
 await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:{...prefs,email_enabled:false,resolved_enabled:false}});await f.notifications.syncOnce();const first=(await list(f)).json();await send(f,28);await f.notifications.syncOnce();assert.equal((await list(f)).json().counts.total,2);
 await send(f,35);await f.notifications.syncOnce();assert.equal((await list(f)).json().counts.total,3);await f.gateway.inject({method:'POST',url:'/api/notifications/read-all',headers:{cookie:f.cookie},payload:{before:first.as_of}});assert.equal((await list(f)).json().counts.unread,1);
});
test('plantilla de Silvana escapa contenido y conserva versión de texto accesible',()=>{
 const rendered=renderEmail({id:randomUUID(),to:'test@example.com',title:'Alerta: <script> & dato',body:'Medición <img src=x> peligrosa',metric:'temperature_c',value:34,threshold:32,measured_at:new Date().toISOString()},'https://silvana.example/');assert.ok(rendered.html.includes('&lt;script&gt;'));assert.ok(!rendered.html.includes('<script>'));assert.ok(rendered.text.includes('34 °C'));assert.ok(rendered.html.includes('https://silvana.example/'));assert.throws(()=>renderEmail({id:'x',to:'x',title:'x',body:'x',metric:'x',value:1,threshold:2,measured_at:new Date().toISOString()},'javascript:alert(1)'));
});

test('cola y preferencias sobreviven al reinicio; activar correo no envía avisos anteriores',async t=>{
 const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {createNotifications}=await import('../../notificaciones-service/src/app.js');const folder=await mkdtemp(join(tmpdir(),'silvana-notifications-'));const databaseUrl='sqlite:///'+join(folder,'notifications.db');const sent:any[]=[];const mailer={send:async(mail:any)=>{sent.push(mail)}};
 const f=await notificationFixture(t,{databaseUrl,mailer});await createRule(f);await send(f,35);await new Promise(resolve=>setTimeout(resolve,5));await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:prefs});await f.notifications.syncOnce();await f.notifications.sendEmails();assert.equal(sent.length,0);
 await send(f,28);await f.notifications.syncOnce();assert.ok((await list(f)).json().items.some((x:any)=>x.email_status==='pending'));await f.notifications.app.close();
 const restarted=await createNotifications({databaseUrl,authUrl:f.authUrl,alertsUrl:f.alertsUrl,devicesUrl:f.devicesUrl,internalToken:f.token,logger:false,mailer});t.after(async()=>{await restarted.app.close();await rm(folder,{recursive:true,force:true});});await restarted.sendEmails();const result=await restarted.app.inject({url:'/notifications',headers:{cookie:f.cookie}});assert.equal(result.statusCode,200);assert.equal(result.json().counts.total,3);assert.equal(sent.length,1);assert.ok(result.json().items.some((x:any)=>x.email_status==='sent'));
});

test('correo incluye el logo como imagen CID sin acceso externo ni al sistema de archivos',async()=>{
 const {default:nodemailer}=await import('nodemailer');const message=renderEmail({id:'logo-preview',to:'test@example.com',title:'Prueba de marca',body:'Valores ilustrativos',metric:'temperature_c',value:34,threshold:32,measured_at:new Date().toISOString()},'https://silvana.example/');assert.ok(message.html.includes('src="cid:silvana-mark@silvana.notifications"'));assert.ok(message.attachments[0].content.length>100);
 const transport=nodemailer.createTransport({streamTransport:true,buffer:true,disableFileAccess:true,disableUrlAccess:true});const info=await transport.sendMail({from:'sender@example.com',to:'test@example.com',...message});const mime=info.message.toString();assert.ok(mime.includes('multipart/related'));assert.ok(mime.includes('Content-ID: <silvana-mark@silvana.notifications>'));assert.ok(mime.includes('Content-Type: image/png'));transport.close();
});

test('estaciones: conexión, pérdida tras un minuto, recuperación y habilitación sin duplicados',async t=>{
 const f=await notificationFixture(t);await f.send();await f.notifications.syncOnce();let items=(await list(f)).json().items;assert.equal(items.length,1);assert.ok(items[0].title.startsWith('Estación conectada'));assert.equal(items[0].metric,'station_status');await f.send();await f.notifications.syncOnce();assert.equal((await list(f)).json().items.length,1);
 await f.devices.db.query('UPDATE devices SET last_seen_at=$1 WHERE id=$2',[new Date(Date.now()-55000),f.device.id]);await f.devices.scanPresence();await f.notifications.syncOnce();assert.equal((await list(f)).json().items.length,1);
 await f.devices.db.query('UPDATE devices SET last_seen_at=$1 WHERE id=$2',[new Date(Date.now()-61000),f.device.id]);await f.devices.scanPresence();await f.devices.scanPresence();await f.notifications.syncOnce();items=(await list(f)).json().items;assert.equal(items.length,2);assert.equal(items.filter((x:any)=>x.title.startsWith('Estación sin comunicación')).length,1);
 await f.send();await f.notifications.syncOnce();assert.equal((await list(f)).json().items.length,3);
 const update={name:f.device.name,location:f.device.location,model:f.device.model,active:false};assert.equal((await f.gateway.inject({method:'PUT',url:'/api/devices/'+f.device.id,headers:{cookie:f.cookie},payload:update})).statusCode,200);await f.notifications.syncOnce();assert.ok((await list(f)).json().items.some((x:any)=>x.title.startsWith('Estación deshabilitada')));await f.devices.scanPresence();assert.equal((await f.send()).statusCode,401);
 const enabled=await f.gateway.inject({method:'PUT',url:'/api/devices/'+f.device.id,headers:{cookie:f.cookie},payload:{...update,active:true}});assert.equal(enabled.json().device.online,false);await f.notifications.syncOnce();assert.ok((await list(f)).json().items.some((x:any)=>x.title.startsWith('Estación habilitada')));
 const before=(await list(f)).json().counts.total;await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:{...prefs,email_enabled:false,station_enabled:false}});await f.send();await f.notifications.syncOnce();assert.equal((await list(f)).json().counts.total,before);
 assert.equal((await f.devices.app.inject('/internal/notifications/feed')).statusCode,403);
});
test('correo de estación contiene el estado y no presenta valores de sensores inventados',()=>{
 const message=renderEmail({id:randomUUID(),to:'test@example.com',title:'Estación conectada: Patio',body:'Se recibió comunicación válida de la estación.',metric:'station_status',value:1,threshold:0,measured_at:new Date().toISOString()},'https://silvana.example/');assert.ok(!message.html.includes('Medición recibida'));assert.ok(!message.html.includes('Umbral de tu regla'));assert.ok(!message.text.includes('Umbral:'));
});


test('recordatorio de incidencia entrega otro aviso con la misma alerta y no se duplica',async t=>{
 const sent:any[]=[];const f=await notificationFixture(t,{mailer:{send:async mail=>{sent.push(mail);}}});await f.gateway.inject({method:'PUT',url:'/api/notifications/preferences',headers:{cookie:f.cookie},payload:prefs});const id=await createRule(f);await send(f,35);await f.notifications.syncOnce();await f.notifications.sendEmails();
 await f.alerts.db.query('UPDATE alert_states SET last_notified_at=$1 WHERE rule_id=$2',[new Date(Date.now()-3600001),id]);await send(f,36);await f.notifications.syncOnce();await f.notifications.syncOnce();await f.notifications.sendEmails();
 const items=(await list(f)).json().items;const reminder=items.find((x:any)=>x.title.startsWith('Recordatorio:'));assert.ok(reminder);assert.equal(reminder.event_id,items.find((x:any)=>x.title.startsWith('Alerta:')).event_id);assert.equal(sent.filter(x=>x.title.startsWith('Recordatorio:')).length,1);
});

test('compartir estación limita acceso, activa avisos del invitado y permite revocar sin correo duplicado',async t=>{
 const sent:any[]=[];const f=await notificationFixture(t,{mailer:{send:async mail=>{sent.push(mail)}}});
 assert.equal((await fetch(f.authUrl+'/internal/notification-recipients')).status,403);assert.equal((await f.gateway.inject('/api/internal/notification-recipients')).statusCode,404);
 const guest=await f.account('guest@example.com'),stranger=await f.account('stranger@example.com');
 const headers={cookie:f.cookie},guestHeaders={cookie:guest};const path='/api/devices/'+f.device.id;
 assert.equal((await f.gateway.inject({url:path,headers:guestHeaders})).statusCode,404);
 assert.equal((await f.gateway.inject({method:'POST',url:path+'/shares',headers:{cookie:stranger},payload:{email:'guest@example.com'}})).statusCode,404);
 assert.equal((await f.gateway.inject({method:'POST',url:path+'/shares',headers,payload:{email:'absent@example.com'}})).statusCode,404);
 assert.equal((await f.gateway.inject({method:'POST',url:path+'/shares',headers,payload:{email:'guest@example.com'}})).statusCode,200);
 assert.equal((await f.gateway.inject({url:'/api/devices',headers:guestHeaders})).json().items[0].shared,true);
 assert.equal((await f.gateway.inject({url:path,headers:guestHeaders})).statusCode,200);
 assert.equal((await f.gateway.inject({method:'DELETE',url:path,headers:guestHeaders})).statusCode,404);
 await createRule(f);await send(f,35);await f.notifications.syncOnce();await f.notifications.sendEmails();await f.notifications.syncOnce();await f.notifications.sendEmails();
 assert.equal((await f.gateway.inject({url:'/api/readings?device_id='+f.device.id,headers:guestHeaders})).statusCode,200);
 await f.analysis.syncOnce();const summary=await f.gateway.inject({url:'/api/analysis/summary?device_id='+f.device.id,headers:guestHeaders});assert.equal(summary.statusCode,200);
 const alerts=await f.gateway.inject({url:'/api/alerts?device_id='+f.device.id,headers:guestHeaders});assert.equal(alerts.statusCode,200);assert.equal(alerts.json().events.length,1);
 assert.equal((await f.gateway.inject({method:'POST',url:'/api/alerts/rules',headers:guestHeaders,payload:rule(f.device.id)})).statusCode,403);
 const inbox=(await f.gateway.inject({url:'/api/notifications',headers:guestHeaders})).json();assert.equal(inbox.counts.total,2);assert.equal(sent.length,2);assert.ok(sent.every(mail=>mail.to==='guest@example.com'));
 assert.equal((await f.gateway.inject({url:'/api/notifications',headers:{cookie:stranger}})).json().counts.total,0);
 await f.gateway.inject({method:'POST',url:'/api/notifications/'+inbox.items[0].id+'/read',headers:guestHeaders});assert.equal((await list(f)).json().counts.unread,2);
 await send(f,28);await f.notifications.syncOnce();
 const members=(await f.gateway.inject({url:path+'/shares',headers})).json().items;
 assert.equal((await f.gateway.inject({method:'DELETE',url:path+'/shares/'+members[0].user_id,headers})).statusCode,200);
 await f.notifications.sendEmails();assert.equal(sent.length,2);
 assert.equal((await f.gateway.inject({url:'/api/readings?device_id='+f.device.id,headers:guestHeaders})).statusCode,404);
 assert.equal((await f.gateway.inject({url:'/api/alerts?device_id='+f.device.id,headers:guestHeaders})).statusCode,404);
});
