import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
export const serviceRoot=fileURLToPath(new URL('../',import.meta.url));
config({path:new URL('../.env',import.meta.url),quiet:true});
