import {openDatabase,utcDate} from '../src/database.js';

import {serviceRoot} from '../src/config.js';

import {readFile,writeFile} from 'node:fs/promises';

import {resolve} from 'node:path';

const db=openDatabase((process.env.SUPABASE_DATABASE_URL??process.env.DATABASE_URL)!,serviceRoot);

try{

 if(db.kind!=='postgres')throw new Error('Se requiere PostgreSQL para esta migración.');

 await db.transaction(async tx=>tx.exec(await readFile(new URL('../migrations/001_devices.sql',import.meta.url),'utf8')));

 await db.transaction(async tx=>tx.exec(await readFile(new URL('../migrations/002_pairing_sensors.sql',import.meta.url),'utf8')));
 await db.transaction(async tx=>tx.exec(await readFile(new URL('../migrations/003_presence.sql',import.meta.url),'utf8')));
 await db.exec('ALTER TABLE device_presence ENABLE ROW LEVEL SECURITY; ALTER TABLE device_notification_outbox ENABLE ROW LEVEL SECURITY; ALTER TABLE device_notification_receipts ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE device_presence,device_notification_outbox,device_notification_receipts FROM anon, authenticated;');
 console.log('Esquema de dispositivos preparado.');

 if(process.argv.includes('--import-local')){

  const local=openDatabase('sqlite:///./dispositivos.db',serviceRoot);

  try{const rows=await local.query('SELECT * FROM devices');

   await db.transaction(async tx=>{for(const row of rows){

    const existing=(await tx.query('SELECT * FROM devices WHERE id=$1',[row.id]))[0];

    if(existing){if(['owner_id','name','location','model','credential_hash'].some(key=>existing[key]!==row[key])||Boolean(existing.active)!==Boolean(row.active))throw new Error('Conflicto al importar un dispositivo existente. No se sobrescribieron datos.');continue;}

    await tx.query('INSERT INTO devices(id,owner_id,name,location,model,active,credential_hash,created_at,last_seen_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[row.id,row.owner_id,row.name,row.location,row.model,Boolean(row.active),row.credential_hash,utcDate(row.created_at),row.last_seen_at?utcDate(row.last_seen_at):null]);

   }});console.log('Importación local verificada:',rows.length,'dispositivos; archivo SQLite conservado.');

  }finally{await local.close();}

 }

 if(process.argv.includes('--activate')){

  if(!process.argv.includes('--import-local'))throw new Error('Activa solo después de importar la base local.');

  const path=resolve(serviceRoot,'.env');const current=await readFile(path,'utf8');const target=process.env.SUPABASE_DATABASE_URL??process.env.DATABASE_URL!;

  await writeFile(path,current.replace(/^DATABASE_URL=.*$/m,()=>'DATABASE_URL='+target),'utf8');console.log('PostgreSQL activado en .env. Reinicia dispositivos-service.');

 }

}catch(error){console.error('Migración no completada:',(error as any).code??(error as Error).message);process.exitCode=1;}finally{await db.close();}

