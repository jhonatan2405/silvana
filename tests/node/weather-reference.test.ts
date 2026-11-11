import {test} from 'node:test';import assert from 'node:assert/strict';
import {createWeatherReference} from '../../analisis-service/src/weatherReference.js';
const initial=Date.parse('2026-11-11T17:30:00Z');
const payload=()=>({latitude:8.752,longitude:-75.879,hourly:{time:['2026-11-09T00:00','2026-11-11T16:00','2026-11-11T17:00','2026-11-11T18:00'],temperature_2m:[29,null,31,32],relative_humidity_2m:[70,72,73,74],surface_pressure:[1008,1007,1006,1005],precipitation:[0,.2,.7,1]}});
test('referencia: recorta fechas, conserva ausencias y agrupa consultas concurrentes',async()=>{
 let calls=0;const reference=createWeatherReference(async url=>{calls++;const u=new URL(String(url));assert.equal(u.hostname,'api.open-meteo.com');assert.equal(u.searchParams.get('timezone'),'GMT');assert.equal(u.searchParams.get('past_days'),'2');await new Promise(resolve=>setTimeout(resolve,5));return Response.json(payload());},()=>initial);
 const [a,b]=await Promise.all([reference('24h'),reference('24h')]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.series.length,2);assert.equal(a.series[0].temperature_c,null);assert.equal(a.series[1].bucket,'2026-11-11T17:00:00.000Z');assert.equal(a.series[1].precipitation_mm,.7);assert.equal(a.stale,false);
 await reference('24h');assert.equal(calls,1);
});
test('referencia: caché anterior explícita, caducidad y backoff ante caída del proveedor',async()=>{
 let clock=initial,calls=0,failed=false;const reference=createWeatherReference(async()=>{calls++;if(failed)throw new Error('offline');return Response.json(payload());},()=>clock);
 await reference('24h');failed=true;clock+=11*60000;const old=await reference('24h');assert.equal(old.stale,true);assert.equal(old.fetched_at,new Date(initial).toISOString());await reference('24h');assert.equal(calls,2);
 clock+=3600000;await assert.rejects(reference('24h'),/WEATHER_UNAVAILABLE/);
});
test('referencia: rechaza arrays desalineados sin inventar valores',async()=>{
 const bad=payload();bad.hourly.precipitation=[];let calls=0;const reference=createWeatherReference(async()=>{calls++;return Response.json(bad);},()=>initial);
 await assert.rejects(reference('24h'),/WEATHER_UNAVAILABLE/);await assert.rejects(reference('24h'),/WEATHER_UNAVAILABLE/);assert.equal(calls,1);
});
