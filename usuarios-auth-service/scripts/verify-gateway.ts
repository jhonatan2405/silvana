import { randomBytes } from 'node:crypto';
import { openDatabase } from '../src/database.js';
import { serviceRoot } from '../src/config.js';
const db=openDatabase(process.env.DATABASE_URL??'sqlite:///./usuarios.db',serviceRoot);
const gateway=process.env.GATEWAY_URL??'http://127.0.0.1:8000';
const email='node-check-'+randomBytes(6).toString('hex')+'@example.com',password=randomBytes(24).toString('base64url');
let userId:string|undefined,cookie='';
async function request(path:string,method='GET',data?:unknown){return fetch(gateway+'/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});}
try{
 const created=await request('/auth/register','POST',{name:'Verificación temporal Node',email,password});if(created.status!==201)throw new Error('register');userId=((await created.json()) as any).user.id;
 const login=await request('/auth/login','POST',{email,password});if(login.status!==200)throw new Error('login');cookie=login.headers.getSetCookie()[0]?.split(';')[0];if(!cookie)throw new Error('cookie');
 const me=await request('/auth/me');if(me.status!==200||((await me.json()) as any).user.id!==userId)throw new Error('me');
 if((await request('/auth/logout','POST')).status!==204)throw new Error('logout');
 if((await request('/auth/me')).status!==401)throw new Error('revocation');
 console.info('Gateway -> Auth Node.js -> Supabase: registro, login, perfil y revocación OK.');
}catch{console.error('La verificación no se completó. Revisa los procesos y sus puertos.');process.exitCode=1;}
finally{
 try{await db.transaction(async transaction=>{if(userId)await transaction.query('DELETE FROM sessions WHERE user_id=$1',[userId]);await transaction.query('DELETE FROM users WHERE email=$1',[email]);});console.info('Cuenta temporal eliminada.');}finally{await db.close();}
}
