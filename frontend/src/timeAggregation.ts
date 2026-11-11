export type Aggregation='minute'|'hour'|'day'|'month'|'year';
export function timeBucket(value:string,aggregation:Aggregation){const date=new Date(value);if(aggregation==='minute')return new Date(Math.floor(date.getTime()/60000)*60000).toISOString();if(aggregation==='hour')return new Date(Math.floor(date.getTime()/3600000)*3600000).toISOString();const local=new Date(date.getTime()-5*3600000);return new Date(Date.UTC(local.getUTCFullYear(),aggregation==='year'?0:local.getUTCMonth(),aggregation==='day'?local.getUTCDate():1,5)).toISOString();}
export function aggregateReference(points:any[],aggregation:Aggregation){const groups=new Map<string,any[]>();for(const point of points){const bucket=timeBucket(point.bucket,aggregation);groups.set(bucket,[...(groups.get(bucket)??[]),point]);}return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([bucket,group])=>({bucket,...Object.fromEntries(['temperature_c','humidity_pct','pressure_hpa','precipitation_mm'].map(key=>{const valid=group.map(p=>p[key]).filter(v=>typeof v==='number'&&Number.isFinite(v));return [key,valid.length?valid.reduce((sum,v)=>sum+v,0)/valid.length:null];}))}));}
export const groupLabels={minute:'minuto',hour:'hora',day:'día',month:'mes',year:'año'};
export const groupGaps={minute:90000,hour:5400000,day:129600000,month:45*86400000,year:550*86400000};

export function comparisonBuckets(points:any[],aggregation:Aggregation){
 const groups=new Map<string,any[]>();for(const p of points){const key=timeBucket(p.bucket,aggregation);groups.set(key,[...(groups.get(key)??[]),p]);}
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([bucket,group])=>({bucket,...Object.fromEntries(['temperature_c','humidity_pct','pressure_hpa','temperature_bmp_c'].map(key=>{let sum=0,count=0;for(const p of group){if(typeof p[key]!=='number'||!Number.isFinite(p[key]))continue;const weight=Number(p[key+'_count']??1);sum+=p[key]*weight;count+=weight;}return [key,count?sum/count:null];}))}));
}
