import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createAuth,digest,COOKIE} from '../../usuarios-auth-service/src/app.js';
import {postgresConfig} from '../../usuarios-auth-service/src/database.js';
import {createDevices} from '../../dispositivos-service/src/app.js';
import {createGateway} from '../../api-gateway/src/app.js';
const password='Una frase segura de prueba 2026';
const cookieOf=(response:any)=>{const raw=response.headers['set-cookie'];return (Array.isArray(raw)?raw[0]:raw)?.split(';')[0];};
async function authFixture(t:any){const service=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false});t.after(()=>service.app.close());return service;}
async function register(app:any,email='persona@example.com'){return app.inject({method:'POST',url:'/auth/register',payload:{name:'Persona de prueba',email,password}});}
async function login(app:any,email='persona@example.com',headers={}){return app.inject({method:'POST',url:'/auth/login',headers,payload:{email,password}});}

test('registro, normalización, duplicados, sesión HttpOnly y revocación',async t=>{
 const {app,db}=await authFixture(t);assert.equal((await app.inject('/auth/me')).statusCode,401);
 assert.equal((await register(app,'PERSONA@example.com')).statusCode,201);assert.equal((await register(app)).statusCode,409);
 const logged=await login(app);assert.equal(logged.statusCode,200);const cookie=cookieOf(logged);assert.ok(cookie);assert.match(String(logged.headers['set-cookie']),/HttpOnly/);assert.match(String(logged.headers['set-cookie']),/SameSite=Lax/i);
 assert.equal(logged.json().user.email,'persona@example.com');assert.ok(!logged.body.includes('password'));
 const rows=await db.query('SELECT * FROM users');assert.match(rows[0].password_hash,/^\$argon2id\$/);
 const sessions=await db.query('SELECT * FROM sessions');assert.equal(sessions[0].token_hash,digest(cookie.split('=')[1]));
 assert.equal((await app.inject({url:'/auth/me',headers:{cookie}})).statusCode,200);
 assert.equal((await app.inject({method:'POST',url:'/auth/logout',headers:{cookie,'content-type':'application/json'}})).statusCode,204);
 assert.equal((await app.inject({url:'/auth/me',headers:{cookie}})).statusCode,401);
});
test('contraseñas Argon2 y sesiones SQLite heredadas de Python siguen funcionando',async t=>{
 const {app,db}=await authFixture(t);const legacy=JSON.parse(await readFile(new URL('./fixtures/legacy-auth.json',import.meta.url),'utf8'));
 await db.query('INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)',['legacy','legacy@example.com','Usuario existente',legacy.hash,'usuario']);
 const expires=new Date(Date.now()+3600000).toISOString().replace('T',' ').replace('Z','');
 await db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[digest('old-python-token'),'legacy',expires]);
 assert.equal((await app.inject({url:'/auth/me',headers:{cookie:COOKIE+'=old-python-token'}})).statusCode,200);
 const logged=await app.inject({method:'POST',url:'/auth/login',payload:{email:'legacy@example.com',password:legacy.password}});assert.equal(logged.statusCode,200);
 assert.equal((await app.inject({url:'/auth/me',headers:{cookie:COOKIE+'=old-python-token'}})).statusCode,200);
});
test('validación estricta, origen, expiración y rotación de sesión',async t=>{
 const {app,db}=await authFixture(t);
 assert.equal((await app.inject({method:'POST',url:'/auth/register',payload:{name:'Persona',email:'a@example.com',password,role:'admin'}})).statusCode,422);
 assert.equal((await app.inject({method:'POST',url:'/auth/register',payload:{name:'  ',email:'a@example.com',password}})).statusCode,422);
 assert.equal((await app.inject({method:'POST',url:'/auth/login',headers:{origin:'https://evil.example'},payload:{email:'a@example.com',password}})).statusCode,403);
 await register(app);const oldCookie=cookieOf(await login(app));const newCookie=cookieOf(await login(app,'persona@example.com',{cookie:oldCookie}));assert.notEqual(oldCookie,newCookie);
 assert.equal((await app.inject({url:'/auth/me',headers:{cookie:oldCookie}})).statusCode,401);
 await db.query('UPDATE sessions SET expires_at=$1',[new Date(Date.now()-1000)]);assert.equal((await app.inject({url:'/auth/me',headers:{cookie:newCookie}})).statusCode,401);
});
test('login incorrecto y limitación por cuenta',async t=>{
 const {app}=await authFixture(t);
 for(let i=0;i<10;i++)assert.equal((await login(app,'missing@example.com')).statusCode,401);
 const result=await login(app,'missing@example.com');assert.equal(result.statusCode,429);assert.equal(result.headers['retry-after'],'600');
});
test('concurrencia de registro no duplica cuentas',async t=>{
 const {app}=await authFixture(t);const results=await Promise.all([register(app),register(app)]);assert.deepEqual(results.map(result=>result.statusCode).sort(),[201,409]);
});
test('configuración PostgreSQL conserva SSL con certificado y normaliza URL anterior',()=>{
 const config=postgresConfig('postgresql+psycopg://postgres.project:fake@aws-1-us-west-2.pooler.supabase.com:5432/postgres?sslmode=require');assert.ok(config.connectionString.startsWith('postgresql://'));assert.equal(config.ssl?.rejectUnauthorized,true);assert.ok(config.ssl?.ca?.includes('BEGIN CERTIFICATE'));assert.equal(config.max,5);
 assert.throws(()=>postgresConfig('postgresql://postgres:fake@db.test.supabase.co/postgres?sslmode=disable'));
});
test('SQLite conserva datos entre reinicios de Node',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'silvana-node-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const url='sqlite:///'+join(directory,'users.db');const first=await createAuth({databaseUrl:url,logger:false});await register(first.app);await first.app.close();
 const second=await createAuth({databaseUrl:url,logger:false});try{assert.equal((await login(second.app)).statusCode,200);}finally{await second.app.close();}
});
test('flujo HTTP real por Gateway: auth, aislamiento de dispositivos, rotación y logout',async t=>{
 const auth=await createAuth({databaseUrl:'sqlite:///:memory:',logger:false});const authUrl=await auth.app.listen({host:'127.0.0.1',port:0});
 const devices=await createDevices({databaseUrl:'sqlite:///:memory:',logger:false,authUrl});const devicesUrl=await devices.app.listen({host:'127.0.0.1',port:0});
 const gateway=createGateway({authUrl,devicesUrl,logger:false});const base=await gateway.listen({host:'127.0.0.1',port:0});
 t.after(async()=>{await gateway.close();await devices.app.close();await auth.app.close();});
 let cookie='';
 const request=async(path:string,method='GET',data?:unknown)=>fetch(base+'/api'+path,{method,headers:{'content-type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined});
 for(const email of ['owner-a@example.com','owner-b@example.com'])assert.equal((await request('/auth/register','POST',{name:'Owner',email,password})).status,201);
 const a=await request('/auth/login','POST',{email:'owner-a@example.com',password});cookie=a.headers.getSetCookie()[0].split(';')[0];const ownerACookie=cookie;
 const created=await request('/devices','POST',{name:'Patio principal',location:'Montería',model:'ESP32'});assert.equal(created.status,201);const payload=await created.json() as any;const id=payload.device.id;
 assert.ok(!('credential_hash' in payload.device));assert.equal((await devices.db.query('SELECT credential_hash FROM devices WHERE id=$1',[id]))[0].credential_hash,createHash('sha256').update(payload.credential).digest('hex'));
 assert.equal((await request('/devices?limit=101')).status,422);assert.equal((await request('/devices','POST',{name:'Patio',location:'Montería',owner_id:'inject'})).status,422);
 const rotated=await (await request('/devices/'+id+'/rotate-credential','POST')).json() as any;assert.notEqual(rotated.credential,payload.credential);
 const disabled=await (await request('/devices/'+id,'PUT',{name:'Patio principal',location:'Montería',model:'ESP32',active:false})).json() as any;assert.equal(disabled.device.active,false);
 cookie='';const b=await request('/auth/login','POST',{email:'owner-b@example.com',password});cookie=b.headers.getSetCookie()[0].split(';')[0];assert.equal(((await (await request('/devices')).json()) as any).items.length,0);
 for(const method of ['GET','PUT','DELETE'])assert.equal((await request('/devices/'+id,method,method==='PUT'?{name:'Otro',location:'Otro'}:undefined)).status,404);
 assert.equal((await request('/devices/'+id+'/rotate-credential','POST')).status,404);
 cookie=ownerACookie;assert.equal((await request('/devices/'+id,'DELETE')).status,204);assert.equal((await request('/auth/logout','POST')).status,204);assert.equal((await request('/auth/me')).status,401);assert.equal((await request('/devices')).status,401);
});
test('Gateway limita rutas, origen, carga y servicios caídos',async t=>{
 const gateway=createGateway({logger:false,authUrl:'http://127.0.0.1:1'});t.after(()=>gateway.close());
 assert.equal((await gateway.inject('/api/unknown')).statusCode,404);
 assert.equal((await gateway.inject({url:'/api/auth/me',headers:{origin:'https://evil.example'}})).statusCode,403);
 assert.equal((await gateway.inject({method:'POST',url:'/api/auth/login',payload:'x'.repeat(16385)})).statusCode,413);
 assert.equal((await gateway.inject('/api/auth/me')).statusCode,503);
});
test('dispositivos falla cerrado cuando autenticación no está disponible',async t=>{
 const {app}=await createDevices({databaseUrl:'sqlite:///:memory:',logger:false,authUrl:'http://127.0.0.1:1'});t.after(()=>app.close());
 assert.equal((await app.inject('/devices')).statusCode,401);assert.equal((await app.inject({url:'/devices',headers:{cookie:COOKIE+'=invalid'}})).statusCode,503);
 assert.equal((await app.inject('/health')).statusCode,200);assert.equal((await app.inject('/ready')).statusCode,200);
});
