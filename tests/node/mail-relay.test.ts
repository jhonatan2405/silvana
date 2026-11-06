import {test} from 'node:test';
import assert from 'node:assert/strict';
import {supabaseMailer} from '../../notificaciones-service/src/mailer.js';

test('HTTPS mail relay preserves inline logo, rejects failed delivery and unsafe destinations',async t=>{
 const previous={...process.env};const originalFetch=globalThis.fetch;
 t.after(()=>{globalThis.fetch=originalFetch;for(const key of ['SUPABASE_MAIL_URL','SUPABASE_MAIL_TOKEN','APP_URL']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}});
 process.env.SUPABASE_MAIL_URL='https://example.supabase.co/functions/v1/silvana-mail';process.env.SUPABASE_MAIL_TOKEN='test-secret';process.env.APP_URL='https://silvana.example';
 const mail={id:'test-123',to:'owner@example.com',title:'Estación conectada',body:'Recibimos comunicación.',value:1,threshold:0,metric:'station_status',measured_at:new Date().toISOString()};
 let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(String(url),process.env.SUPABASE_MAIL_URL);assert.equal((options?.headers as Record<string,string>)['x-silvana-mail-token'],'test-secret');const payload=JSON.parse(String(options?.body));assert.equal(payload.to,mail.to);assert.ok(payload.html.includes('cid:silvana-mark@silvana.notifications'));assert.equal(Buffer.from(payload.logo,'base64').subarray(1,4).toString(),'PNG');assert.ok(payload.text.includes('https://silvana.example/'));assert.equal(options?.redirect,'error');return Response.json({sent:true});};
 await supabaseMailer()!.send(mail);assert.equal(calls,1);
 globalThis.fetch=async()=>Response.json({error:'DELIVERY_FAILED'},{status:502});await assert.rejects(supabaseMailer()!.send(mail),/MAIL_RELAY_502/);
 globalThis.fetch=async()=>Response.json({sent:false});await assert.rejects(supabaseMailer()!.send(mail),/MAIL_RELAY_REJECTED/);
 process.env.SUPABASE_MAIL_URL='https://attacker.example/functions/v1/silvana-mail';assert.throws(()=>supabaseMailer(),/inválida/);
});
