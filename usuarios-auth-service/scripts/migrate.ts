import { openDatabase } from '../src/database.js';
import { initializeAuth } from '../src/app.js';
import { serviceRoot } from '../src/config.js';
const db=openDatabase(process.env.DATABASE_URL??'sqlite:///./usuarios.db',serviceRoot);
try{await initializeAuth(db);console.info('Migración de autenticación aplicada. Base existente y tablas protegidas conservadas.');}
catch(error){console.error('No se pudo aplicar la migración. Revisa la conexión y permisos.',{code:(error as any).code??'DATABASE_ERROR'});process.exitCode=1;}
finally{await db.close();}
