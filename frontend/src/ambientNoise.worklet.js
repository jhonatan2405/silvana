/* Continuous stochastic ambience. No recorded clip or short repeating buffer. */
class SilvanaAmbientNoise extends AudioWorkletProcessor {
  constructor(options) {
    super();this.kind=options.processorOptions?.kind??'wind';this.state=[new Float64Array(4),new Float64Array(4)];this.stopped=false;
    this.port.onmessage=event=>{if(event.data==='stop'){this.stopped=true;this.port.close();}};
  }
  process(_inputs,outputs) {
    if(this.stopped)return false;
    const output=outputs[0];
    for(let channel=0;channel<output.length;channel++){
      const samples=output[channel],s=this.state[channel%2];
      for(let i=0;i<samples.length;i++){
        const white=Math.random()*2-1;
        s[0]=.99765*s[0]+white*.099046;s[1]=.963*s[1]+white*.296516;s[2]=.57*s[2]+white*1.05269;s[3]=(s[3]+white*.02)/1.02;
        const pink=(s[0]+s[1]+s[2]+white*.1848)*.13,brown=s[3]*3.5;
        samples[i]=this.kind==='rain'?white*.42+pink*.08:this.kind==='river'?pink*.62+brown*.38:brown*.8+pink*.2;
      }
    }
    return true;
  }
}
registerProcessor('silvana-ambient-noise',SilvanaAmbientNoise);
