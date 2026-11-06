import {openDatabase} from '../src/database.js';
import {serviceRoot} from '../src/config.js';
import {initializeReception} from '../src/app.js';
const db=openDatabase(process.env.DATABASE_URL!,serviceRoot);
try{await initializeReception(db);console.log('Esquema de recepción preparado.');}catch(error){console.error('Migración no completada:',(error as any).code??'MIGRATION_ERROR');process.exitCode=1;}finally{await db.close();}
