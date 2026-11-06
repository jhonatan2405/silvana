export interface StationPort {
 open(options:{baudRate:number}):Promise<void>;
 close():Promise<void>;
 readable:ReadableStream<Uint8Array>|null;
 writable:WritableStream<Uint8Array>|null;
}
export type SerialApi={requestPort():Promise<StationPort>;getPorts():Promise<StationPort[]>;addEventListener(type:string,listener:EventListener):void;removeEventListener(type:string,listener:EventListener):void};
export function serialApi():SerialApi|undefined{return (navigator as Navigator&{serial?:SerialApi}).serial;}
const validateLine=(value:string,max:number)=>{if(/[\r\n\0]/.test(value)||new TextEncoder().encode(value).length>max)throw new Error('El valor contiene saltos de línea o supera el tamaño permitido.');};
export class StationSerial {
 private reader:ReadableStreamDefaultReader<Uint8Array>|null=null;
 private reading:Promise<void>|null=null;
 private waiter:{match:(line:string)=>boolean;resolve:(line:string)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
 private running=false;private busy=false;private closing=false;
 constructor(private port:StationPort,private onStatus:(line:string)=>void,private onLost:()=>void,private timeout=30000){}
 get isConnected(){return this.running;}
 private fail(error:Error){if(this.waiter){clearTimeout(this.waiter.timer);this.waiter.reject(error);this.waiter=null;}}
 private async read(){
  const decoder=new TextDecoder();let buffer='';
  try{while(this.running&&this.reader){const {value,done}=await this.reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});
   let end:number;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).replace(/\r$/,'');buffer=buffer.slice(end+1);
    if(line.startsWith('Wi-Fi: '))this.onStatus(line);
    if(/No se pudo guardar|Entrada demasiado larga|Tiempo agotado|URL no válida|Código no válido/.test(line)){this.fail(new Error('El ESP32 rechazó la configuración. Desconecta y vuelve a conectar; revisa los valores.'));continue;}
    if(this.waiter?.match(line)){const waiter=this.waiter;this.waiter=null;clearTimeout(waiter.timer);waiter.resolve(line);}
   }if(buffer.length>4096)buffer='';
  }}catch{this.fail(new Error('Se perdió la conexión USB.'));}finally{this.reader?.releaseLock();this.reader=null;this.running=false;this.fail(new Error('Se cerró la conexión USB.'));if(!this.closing)this.onLost();}
 }
 private exchange(value:string,match:(line:string)=>boolean,timeout=this.timeout):Promise<string>{
  if(!this.running||!this.port.writable)return Promise.reject(new Error('Conecta primero el ESP32 por USB.'));
  const response=new Promise<string>((resolve,reject)=>{
   const timer=setTimeout(()=>{this.fail(new Error('El ESP32 no respondió. Cierra el Monitor serie de Arduino, reinicia la placa y vuelve a conectar.'));},timeout);
   this.waiter={match,resolve,reject,timer};
  });
  const writing=(async()=>{const writer=this.port.writable!.getWriter();try{await writer.write(new TextEncoder().encode(value+'\n'));}finally{writer.releaseLock();}})().catch(()=>this.fail(new Error('No se pudo escribir en el puerto USB.')));
  return Promise.all([response,writing]).then(([line])=>line);
 }
 private async transaction<T>(action:()=>Promise<T>){if(this.busy)throw new Error('Espera a que termine la configuración actual.');this.busy=true;try{return await action();}catch(error){await this.close();throw error;}finally{this.busy=false;}}
 async connect(){
  try{await this.port.open({baudRate:115200});if(!this.port.readable)throw new Error('El puerto no permite leer datos.');this.reader=this.port.readable.getReader();this.running=true;this.reading=this.read();const deadline=Date.now()+this.timeout;let ready=false;while(this.running&&Date.now()<deadline){try{await this.exchange('estado',line=>line.startsWith('Wi-Fi: '),Math.min(1500,Math.max(1,deadline-Date.now())));ready=true;break;}catch{if(!this.running)break;}}if(!ready)throw new Error('No se reconoció el firmware de Silvana. Cierra el Monitor serie de Arduino y verifica el programa cargado.');}
  catch(error){await this.close();throw error;}
 }
 status(){return this.transaction(()=>this.exchange('estado',line=>line.startsWith('Wi-Fi: ')));}
 wifi(ssid:string,password:string){validateLine(ssid,32);validateLine(password,63);if(!ssid)throw new Error('Escribe el nombre de la red.');return this.transaction(async()=>{
  await this.exchange('wifi',line=>line.startsWith('Nombre exacto de la red'));
  await this.exchange(ssid,line=>line.startsWith('Clave Wi-Fi'));
  await this.exchange(password,line=>line.startsWith('Conectando a la red guardada.'));
 });}
 gateway(value:string){validateLine(value,240);let url:URL;try{url=new URL(value);}catch{throw new Error('Escribe una URL válida.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname)||['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Usa la dirección base del Gateway accesible desde el ESP32, sin /api ni localhost.');
  return this.transaction(async()=>{await this.exchange('gateway',line=>line.startsWith('URL base del Gateway'));await this.exchange(url.origin,line=>line.startsWith('Gateway guardado.'));});}
 pair(code:string){if(!/^[a-f0-9]{16}$/i.test(code))throw new Error('Genera un código de vinculación válido.');return this.transaction(async()=>{await this.exchange('vincular',line=>line.startsWith('Código de 16 caracteres'));await this.exchange(code,line=>line.startsWith('Vinculación pendiente;'));});}
 async close(){this.closing=true;this.running=false;this.fail(new Error('Se cerró la conexión USB.'));try{await this.reader?.cancel();}catch{}await this.reading;try{await this.port.close();}catch{} }
}
