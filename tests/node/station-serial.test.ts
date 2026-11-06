import test from 'node:test';
import assert from 'node:assert/strict';
import {StationSerial,type StationPort} from '../../frontend/src/stationSerial';
class FakePort implements StationPort{
 controller!:ReadableStreamDefaultController<Uint8Array>;writes:string[]=[];stage='';closed=false;bad=false;silent=false;
 readable=new ReadableStream<Uint8Array>({start:controller=>{this.controller=controller;}});
 writable=new WritableStream<Uint8Array>({write:chunk=>{const text=new TextDecoder().decode(chunk);this.writes.push(text);if(this.silent)return;const value=text.replace(/\n$/,'');
 const emit=(line:string)=>{const bytes=new TextEncoder().encode(line+'\r\n');this.controller.enqueue(bytes.slice(0,4));this.controller.enqueue(bytes.slice(4));};
 if(this.stage==='ssid'){this.stage='password';emit('Clave Wi-Fi (no se mostrará en la salida):');}
 else if(this.stage==='password'){this.stage='';emit('Conectando a la red guardada. Comando wifi para cambiarla.');}
 else if(this.stage==='gateway'){this.stage='';emit('Gateway guardado. Para HTTPS configura su CA con el comando ca.');}
 else if(this.stage==='pair'){this.stage='';emit('Vinculación pendiente; se enviará por el Gateway.');}
 else if(value==='estado'){if(!this.bad)emit('Wi-Fi: conectado | Estación: test | IP local: 192.168.1.5');}
 else if(value==='wifi'){this.stage='ssid';emit('Nombre exacto de la red 2.4 GHz:');}
 else if(value==='gateway'){this.stage='gateway';emit('URL base del Gateway, sin /api (http://IP:8000 o https://dominio):');}
 else if(value==='vincular'){this.stage='pair';emit('Código de 16 caracteres del dashboard:');}
 }});
 async open(options:{baudRate:number}){assert.equal(options.baudRate,115200);}
 async close(){this.closed=true;}
}
test('USB reconoce Silvana, configura Wi-Fi/Gateway y vincula con respuestas fragmentadas',async()=>{
 const port=new FakePort(),statuses:string[]=[];const client=new StationSerial(port,line=>statuses.push(line),()=>{},100);
 await client.connect();await client.wifi('Red de prueba','contraseña de prueba');await client.gateway('http://192.168.1.7:8000/');await client.pair('1234567890ABCDEF');await client.status();
 assert.deepEqual(port.writes,['estado\n','wifi\n','Red de prueba\n','contraseña de prueba\n','gateway\n','http://192.168.1.7:8000\n','vincular\n','1234567890ABCDEF\n','estado\n']);assert.equal(statuses.length,2);assert.ok(statuses.every(line=>!line.includes('contraseña')));await client.close();assert.equal(port.closed,true);assert.equal(client.isConnected,false);
});
test('USB impide inyección de comandos y direcciones locales inválidas sin escribir secretos',async()=>{
 const port=new FakePort(),client=new StationSerial(port,()=>{},()=>{},100);await client.connect();
 assert.throws(()=>client.wifi('red\ngateway','secret'));assert.throws(()=>client.wifi('a'.repeat(33),'secret'));assert.throws(()=>client.gateway('http://localhost:8000'));assert.throws(()=>client.gateway('http://user:secret@example.com'));assert.throws(()=>client.gateway('https://example.com/api'));assert.throws(()=>client.pair('invalid'));
 assert.deepEqual(port.writes,['estado\n']);assert.equal(client.isConnected,true);await client.close();
});
test('USB rechaza un dispositivo que no responde al protocolo y libera el puerto',async()=>{
 const port=new FakePort();port.bad=true;const client=new StationSerial(port,()=>{},()=>{},30);await assert.rejects(client.connect(),/No se reconoció/);assert.equal(port.closed,true);
});
test('USB corta la sesión si falla un paso y no envía la contraseña fuera de su pregunta',async()=>{
 const port=new FakePort(),client=new StationSerial(port,()=>{},()=>{},30);await client.connect();port.silent=true;await assert.rejects(client.wifi('red','secret'),/no respondió/);assert.deepEqual(port.writes,['estado\n','wifi\n']);assert.equal(port.closed,true);
});
