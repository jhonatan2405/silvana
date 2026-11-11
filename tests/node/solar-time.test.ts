import {test} from 'node:test';import assert from 'node:assert/strict';
import {solarPosition,localSolarHour,directHourTarget} from '../../frontend/src/solar.js';
import {timeBucket,aggregateReference,comparisonBuckets} from '../../frontend/src/timeAggregation.js';
test('cambiar la hora retrocede directamente sin recorrer otro día',()=>{
 assert.equal(directHourTarget(15,10),10);assert.equal(directHourTarget(10,15),15);assert.equal(directHourTarget(23,1),1);
});
test('Montería: el sol sube, cruza el cielo y cae con la hora y la fecha',()=>{
 const date=new Date('2026-11-11T17:00:00Z');const morning=solarPosition(7,date),noon=solarPosition(12,date),evening=solarPosition(17,date),night=solarPosition(22,date);
 assert.ok(noon.altitude>morning.altitude);assert.ok(noon.altitude>evening.altitude);assert.ok(morning.x<0);assert.ok(evening.x>0);assert.ok(night.altitude<0);assert.equal(localSolarHour(new Date('2026-11-11T17:30:00Z')),12.5);assert.notEqual(solarPosition(12,new Date('2026-06-11')).altitude,noon.altitude);
});
test('agrupaciones de Montería respetan medianoche local y no convierten faltantes a cero',()=>{
 assert.equal(timeBucket('2026-01-01T02:00:00Z','year'),'2025-01-01T05:00:00.000Z');assert.equal(timeBucket('2026-11-11T04:30:00Z','day'),'2026-11-10T05:00:00.000Z');
 const result=aggregateReference([{bucket:'2026-11-11T10:00:00Z',temperature_c:20,pressure_hpa:null},{bucket:'2026-11-11T11:00:00Z',temperature_c:30,pressure_hpa:null}],'day');assert.equal(result[0].temperature_c,25);assert.equal(result[0].pressure_hpa,null);
});


test('comparación conserva resolución original y pondera los minutos antes de comparar horas',()=>{
 const minutes=[{bucket:'2026-11-11T17:01:00Z',temperature_c:30,temperature_c_count:6},{bucket:'2026-11-11T17:02:00Z',temperature_c:40,temperature_c_count:1}];const hourly=comparisonBuckets(minutes,'hour');assert.equal(hourly.length,1);assert.equal(hourly[0].temperature_c,220/7);assert.equal(minutes.length,2);assert.equal(minutes[0].bucket,'2026-11-11T17:01:00Z');assert.equal(hourly[0].pressure_hpa,null);
});
