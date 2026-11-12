export type SensorReport={type:'DHT11'|'DHT22'|'BMP280'|'RAIN_ANALOG';status:'ok'|'error'|'unverified'};
export type Device={shared?:boolean;id:string;name:string;location:string;model:string;active:boolean;created_at:string;online:boolean;last_seen_at:string|null;hardware_id:string|null;sensors:SensorReport[]};
export type Reading={id:string;device_id:string;packet_id:string;measured_at:string;received_at:string;measurements:{temperature_c?:number;temperature_bmp_c?:number;humidity_pct?:number;pressure_hpa?:number;rain_detected?:boolean;rain_raw_adc?:number};sensors:SensorReport[]};
const timeFormatter=new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
export const localTime=(value:string)=>timeFormatter.format(new Date(value));
