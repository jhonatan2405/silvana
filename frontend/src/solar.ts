import {getPosition} from 'suncalc';
export function directHourTarget(current:number,target:number){return Math.floor(current/24)*24+((target%24+24)%24);}
export function localSolarHour(now=new Date()){const d=new Date(now.getTime()-5*3600000);return d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;}
export function solarPosition(hour:number,now=new Date()){
 const local=new Date(now.getTime()-5*3600000);const date=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate(),5)+((hour%24+24)%24)*3600000);
 const position=getPosition(date,8.75,-75.88);const altitude=position.altitude*Math.PI/180,azimuth=position.azimuth*Math.PI/180;
 return {...position,x:-Math.sin(azimuth)*Math.cos(altitude),y:Math.sin(altitude),z:Math.cos(azimuth)*Math.cos(altitude)};
}
export function lightAtHour(hour:number):'day'|'sunset'|'dusk'|'night'{const altitude=solarPosition(hour).altitude;return altitude>10?'day':altitude>0?'sunset':altitude>-8?'dusk':'night';}
