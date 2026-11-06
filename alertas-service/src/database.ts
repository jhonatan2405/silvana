import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
import { Pool, type PoolClient } from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export type Row=Record<string,any>;
export interface Queryable {query(sql:string,params?:unknown[]):Promise<Row[]>;exec(sql:string):Promise<void>}
export interface Database extends Queryable {kind:'sqlite'|'postgres';transaction<T>(fn:(db:Queryable)=>Promise<T>):Promise<T>;close():Promise<void>}
export function postgresConfig(raw:string){
 const url=new URL(raw.replace(/^postgresql\+psycopg:/,'postgresql:'));
 if(!['postgresql:','postgres:'].includes(url.protocol))throw new Error('DATABASE_URL debe ser PostgreSQL.');
 const mode=url.searchParams.get('sslmode');
 const remote=url.hostname.endsWith('.supabase.com')||url.hostname.endsWith('.supabase.co');
 if(remote&&mode==='disable')throw new Error('Supabase requiere SSL.');
 let ssl:undefined|{rejectUnauthorized:boolean;ca?:string};
 if(remote||mode&&mode!=='disable'){
  ssl={rejectUnauthorized:true};
  if(process.env.DATABASE_CA_CERT)ssl.ca=readFileSync(process.env.DATABASE_CA_CERT,'utf8');
  else if(remote)ssl.ca=readFileSync(new URL('../certs/supabase-ca.crt',import.meta.url),'utf8');
  url.searchParams.delete('sslmode');
 }
 return {connectionString:url.toString(),ssl,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,allowExitOnIdle:true};
}
export function openDatabase(raw:string,root:string):Database{
 if(!raw.startsWith('sqlite:')){
  const pool=new Pool(postgresConfig(raw));
  pool.on('error',()=>{console.error('La conexión de base de datos debe restablecerse.');});
  const query=async(sql:string,params:unknown[]=[],client:Pool|PoolClient=pool)=>(await client.query(sql,params)).rows;
  return {kind:'postgres',query,exec:async sql=>{await pool.query(sql);},transaction:async fn=>{
   const client=await pool.connect();try{await client.query('BEGIN');const result=await fn({query:(sql,params)=>query(sql,params,client),exec:async sql=>{await client.query(sql);}});await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  },close:()=>pool.end()};
 }
 const path=raw.replace(/^sqlite:\/\/\//,'');
 const {DatabaseSync}=require('node:sqlite') as typeof import('node:sqlite');
 const sqlite=new DatabaseSync(path===':memory:'?path:resolve(root,path));sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 const direct:Queryable={query:async(sql,params=[])=>sqlite.prepare(sql.replace(/\$\d+/g,'?')).all(...params.map(value=>value instanceof Date?value.toISOString():typeof value==='boolean'?Number(value):value) as any[]) as Row[],exec:async sql=>{sqlite.exec(sql);}};
 let tail=Promise.resolve();
 const lock=async<T>(fn:()=>Promise<T>):Promise<T>=>{const before=tail;let release!:()=>void;tail=new Promise<void>(done=>{release=done;});await before;try{return await fn();}finally{release();}};
 return {kind:'sqlite',query:(sql,params)=>lock(()=>direct.query(sql,params)),exec:sql=>lock(()=>direct.exec(sql)),transaction:fn=>lock(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const result=await fn(direct);sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}),close:async()=>{await tail;sqlite.close();}};
}
export function utcDate(value:Date|string):Date{
 if(value instanceof Date)return value;
 return new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value)?value:value.replace(' ','T')+'Z');
}
