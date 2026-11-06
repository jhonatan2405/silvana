import {z} from 'zod';
export const sensorReport=z.array(z.object({type:z.enum(['DHT11','DHT22','BMP280','RAIN_ANALOG']),status:z.enum(['ok','error','unverified'])}).strict()).max(3).refine(items=>new Set(items.map(item=>item.type.startsWith('DHT')?'DHT':item.type)).size===items.length,'No repitas sensores.');
