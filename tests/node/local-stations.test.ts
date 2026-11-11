import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAirportReference} from '../../analisis-service/src/localStations.js';
test('SKMR: estación verificada, humedad derivada y altimétrica separada de superficie',async()=>{
 let calls=0;const now=Date.parse('2026-11-11T19:30:00Z');const provider=createAirportReference(async url=>{calls++;assert.equal(new URL(String(url)).searchParams.get('ids'),'SKMR');return Response.json([{icaoId:'SKMR',reportTime:'2026-11-11T19:00:00Z',temp:30,dewp:25,altim:1006,rawOb:'SKMR METAR'}]);},()=>now);
 const result=await provider('24h');assert.equal(result.kind,'airport_observation');assert.equal(result.series[0].pressure_hpa,null);assert.equal(result.series[0].altimeter_hpa,1006);assert.equal(result.series[0].precipitation_mm,null);assert.ok(result.series[0].humidity_pct>70&&result.series[0].humidity_pct<80);await provider('24h');assert.equal(calls,1);
});
test('SKMR: no inventa reportes en respuesta vacía, ni acepta otra estación',async()=>{
 const empty=createAirportReference(async()=>new Response(null,{status:204}));assert.equal((await empty('24h')).series.length,0);
 const invalid=createAirportReference(async()=>Response.json([{icaoId:'SKBO',reportTime:new Date().toISOString(),temp:20}]));await assert.rejects(invalid('24h'),/AIRPORT_UNAVAILABLE/);
});


test('SKMR consulta varias horas y conserva todos los reportes del rango personalizado',async()=>{
 const now=Date.parse('2026-11-11T22:30:00Z');const provider=createAirportReference(async url=>{assert.equal(new URL(String(url)).searchParams.get('hours'),'5');return Response.json(Array.from({length:5},(_,i)=>({icaoId:'SKMR',reportTime:new Date(now-i*3600000).toISOString(),temp:30+i,dewp:20,altim:1007})));},()=>now);
 const data=await provider('5h');assert.equal(data.series.length,5);assert.ok(data.series[0].bucket<data.series[4].bucket);
});
