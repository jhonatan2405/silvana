import cookie from '@fastify/cookie';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createHttp, HttpError } from './http.js';
import { openDatabase, utcDate, type Database, type Row } from './database.js';
import { serviceRoot } from './config.js';
export const COOKIE='monitoreo_session';
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const hashOptions={type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:4};
const loginSchema=z.object({email:z.string().email().max(254).transform(value=>value.toLowerCase()),password:z.string().min(1).max(128)}).strict();
const registerSchema=loginSchema.extend({name:z.string().trim().min(2).max(100),password:z.string().min(12).max(128)}).strict();
const publicUser=(user:Row)=>({id:user.id,name:user.name,email:user.email,role:user.role});
export async function initializeAuth(db:Database){
 if(db.kind==='postgres'){
  const sql=await readFile(new URL('../migrations/001_auth.sql',import.meta.url),'utf8');
  await db.transaction(async transaction=>{await transaction.exec(sql);});
 }else{
  await db.exec('CREATE TABLE IF NOT EXISTS users(id VARCHAR(64) PRIMARY KEY,email VARCHAR(254) NOT NULL UNIQUE,name VARCHAR(100) NOT NULL,password_hash VARCHAR(255) NOT NULL,role VARCHAR(20) NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token_hash VARCHAR(64) PRIMARY KEY,user_id VARCHAR(64) NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS ix_sessions_user_id ON sessions(user_id);');
 }
}
export async function createAuth(options:{databaseUrl?:string;logger?:boolean;origin?:string;secure?:boolean;hours?:number;internalToken?:string}={}){
 const db=openDatabase(options.databaseUrl??process.env.DATABASE_URL??'sqlite:///./usuarios.db',serviceRoot);
 try{await initializeAuth(db);}catch(error){await db.close();throw error;}
 const app=createHttp('usuarios-auth',options.origin??process.env.FRONTEND_ORIGIN??'http://localhost:5173',options.logger??true);
 await app.register(cookie);
 app.addHook('onClose',async()=>db.close());
 const dummy=await argon2.hash(randomBytes(32),hashOptions);
 const attempts=new Map<string,number[]>();
 function limit(email:string){
  const now=Date.now();for(const [key,queue] of attempts){const recent=queue.filter(time=>time>now-600000);if(recent.length)attempts.set(key,recent);else attempts.delete(key);}
  const queue=attempts.get(email)??[];
  if(queue.length>=10)throw new HttpError(429,'Demasiados intentos. Espera diez minutos.',{'Retry-After':'600'});
  queue.push(now);attempts.set(email,queue);
 }
 const secure=options.secure??process.env.COOKIE_SECURE==='true';
 const hours=Math.max(1,Math.min(options.hours??(Number(process.env.SESSION_HOURS)||24),168));
 const internalToken=options.internalToken??process.env.INTERNAL_SERVICE_TOKEN;
 app.get('/internal/notification-recipients',async request=>{
  const supplied=request.headers['x-internal-token'];
  if(!internalToken||typeof supplied!=='string'||!timingSafeEqual(Buffer.from(digest(supplied)),Buffer.from(digest(internalToken))))throw new HttpError(403,'Acceso interno no permitido.');
  return {items:await db.query('SELECT id,email FROM users ORDER BY id')};
 });
 app.get('/health',async()=>({status:'ok',service:'usuarios-auth',runtime:'nodejs'}));
 app.get('/ready',async()=>{await db.query('SELECT id FROM users LIMIT 1');return {status:'ready'};});
 app.post('/auth/register',async(request,reply)=>{
  const data=registerSchema.parse(request.body);limit(data.email);
  const user={id:randomBytes(16).toString('hex'),email:data.email,name:data.name,role:'usuario'};
  const hash=await argon2.hash(data.password,hashOptions);
  try{await db.query('INSERT INTO users(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)',[user.id,user.email,user.name,hash,user.role]);}
  catch(error){if((error as any).code==='23505'||/UNIQUE constraint failed: users.email/.test((error as Error).message))throw new HttpError(409,'No se pudo registrar ese correo. Si ya tienes cuenta, inicia sesión.');throw error;}
  return reply.code(201).send({user,message:'Cuenta creada. Ya puedes iniciar sesión.'});
 });
 app.post('/auth/login',async(request,reply)=>{
  const data=loginSchema.parse(request.body);limit(data.email);
  const user=(await db.query('SELECT * FROM users WHERE email=$1',[data.email]))[0];
  let valid=false;try{valid=await argon2.verify(user?.password_hash??dummy,data.password);}catch{valid=false;}
  if(!user||!valid)throw new HttpError(401,'El correo o la contraseña no son correctos.');
  const token=randomBytes(48).toString('base64url'),now=new Date(),expiry=new Date(now.getTime()+hours*3600000);
  await db.transaction(async transaction=>{
   if(argon2.needsRehash(user.password_hash,hashOptions))await transaction.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await argon2.hash(data.password,hashOptions),user.id]);
   const old=request.cookies[COOKIE];if(old)await transaction.query('DELETE FROM sessions WHERE token_hash=$1',[digest(old)]);
   await transaction.query(db.kind==='sqlite'?'DELETE FROM sessions WHERE julianday(expires_at)<julianday($1)':'DELETE FROM sessions WHERE expires_at<$1',[now]);
   await transaction.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[digest(token),user.id,expiry]);
  });
  reply.setCookie(COOKIE,token,{httpOnly:true,secure,sameSite:'lax',maxAge:hours*3600,path:'/'});attempts.delete(data.email);
  return {user:publicUser(user)};
 });
 app.get('/auth/me',async request=>{
  const token=request.cookies[COOKIE];
  const session=token?(await db.query('SELECT * FROM sessions WHERE token_hash=$1',[digest(token)]))[0]:undefined;
  if(!session||!Number.isFinite(utcDate(session.expires_at).getTime())||utcDate(session.expires_at).getTime()<=Date.now())throw new HttpError(401,'Tu sesión no está activa. Inicia sesión nuevamente.');
  const user=(await db.query('SELECT * FROM users WHERE id=$1',[session.user_id]))[0];
  if(!user)throw new HttpError(401,'Sesión no válida.');return {user:publicUser(user)};
 });
 app.post('/auth/logout',async(request,reply)=>{
  const token=request.cookies[COOKIE];if(token)await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]);
  return reply.clearCookie(COOKIE,{path:'/',httpOnly:true,secure,sameSite:'lax'}).code(204).send();
 });
 return {app,db};
}
