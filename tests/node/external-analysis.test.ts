import {test} from 'node:test';import assert from 'node:assert/strict';
import {summarizeExternal,analysisInsights,readingRecommendations} from '../../frontend/src/analysisData.js';
test('análisis externo agrupa observaciones sin inventar variables ausentes ni incluir el futuro',()=>{
 const source={series:[{bucket:'2026-11-11T10:00:00Z',temperature_c:20,pressure_hpa:null},{bucket:'2026-11-11T10:30:00Z',temperature_c:30,pressure_hpa:null},{bucket:'2026-11-12T10:00:00Z',temperature_c:99}]};
 const result=summarizeExternal(source,'24h','hour',Date.parse('2026-11-11T17:00:00Z'));
 assert.equal(result.samples,2);assert.equal(result.series.length,1);assert.equal(result.metrics.temperature_c.average,25);assert.equal(result.metrics.temperature_c.standard_deviation,5);assert.equal(result.metrics.pressure_hpa.average,null);assert.equal(result.metrics.temperature_bmp_c.count,0);
 assert.match(analysisInsights(result,'pressure_hpa','hPa')[1].text,/no entrega/);
});
test('análisis externo vacío informa ausencia de datos',()=>{
 const result=summarizeExternal({series:[]},'all','day');assert.equal(result.samples,0);assert.equal(result.metrics.temperature_c.average,null);assert.match(analysisInsights(result,'temperature_c','°C')[0].text,/al menos dos/);
});


test('recomendaciones usan lecturas existentes y explican sus criterios sin cambiar reglas',()=>{
 const data={series:[{temperature_c:35,humidity_pct:85}],samples:1,wet_samples:1};assert.equal(readingRecommendations(data).length,3);const text=readingRecommendations(data).map(x=>x.text).join(' ');assert.match(text,/35/);assert.match(text,/85/);assert.match(text,/no son límites universales/);assert.equal(data.series[0].temperature_c,35);
 const empty=readingRecommendations({series:[],samples:0,wet_samples:0});assert.match(empty[0].text,/Sin lecturas/);
});
