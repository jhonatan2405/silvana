import {test} from 'node:test';import assert from 'node:assert/strict';
import {recoverSession} from '../../frontend/src/backendConnection.js';
test('inicio: espera una reactivación y trata 401 como servidor listo, sin reenviar formularios',async()=>{
 let calls=0,waiting=0;const result=await recoverSession({signal:new AbortController().signal,onWaiting:()=>waiting++,retryDelay:1,fetcher:async(url,options)=>{assert.equal(url,'/api/auth/me');assert.equal(options?.method,undefined);calls++;return new Response('',{status:calls<3?503:401});}});
 assert.equal(result,null);assert.equal(waiting,2);assert.equal(calls,3);
});
test('inicio: recupera sesión y detecta un origen inválido sin reintentar',async()=>{
 const user={id:'owner',name:'Prueba'};assert.deepEqual(await recoverSession({signal:new AbortController().signal,onWaiting:()=>{},fetcher:async()=>Response.json({user})}),user);
 let calls=0;await assert.rejects(recoverSession({signal:new AbortController().signal,onWaiting:()=>{},fetcher:async()=>{calls++;return new Response('',{status:403});}}),/dirección/);assert.equal(calls,1);
});
test('inicio: limita espera y permite cancelar los reintentos',async()=>{
 await assert.rejects(recoverSession({signal:new AbortController().signal,onWaiting:()=>{},deadline:25,retryDelay:2,fetcher:async()=>new Response('',{status:503})}),/sigue sin responder/);
 const controller=new AbortController();await assert.rejects(recoverSession({signal:controller.signal,onWaiting:()=>controller.abort(),retryDelay:1,fetcher:async()=>new Response('',{status:503})}),/Cancelled|responder/);
});
