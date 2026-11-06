import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
const noiseGLSL=`
float landscapeHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float landscapeNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(landscapeHash(i),landscapeHash(i+vec2(1,0)),f.x),mix(landscapeHash(i+vec2(0,1)),landscapeHash(i+1.),f.x),f.y);}
`;
export function terrainMaterial(time:{value:number},rain:{value:number}){
 const material=new THREE.MeshStandardMaterial({color:'#608b51',roughness:.96,vertexColors:true});
 material.onBeforeCompile=shader=>{
  shader.uniforms.landscapeTime=time;shader.uniforms.landscapeRain=rain;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vTerrainPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrainPosition=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vTerrainPosition;uniform float landscapeTime,landscapeRain;${noiseGLSL}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    vec2 soil=vTerrainPosition.xz;float broad=landscapeNoise(soil*.28),detail=landscapeNoise(soil*3.7);
    float channel=sin(soil.y*.095)*5.-4.;float bank=1.-smoothstep(3.0,6.,abs(soil.x-channel));
    diffuseColor.rgb*=.83+broad*.24+detail*.10;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.65,.73,.65),bank*.28+landscapeRain*.12);
    float cloudShade=smoothstep(.40,.82,landscapeNoise(soil*.044+vec2(landscapeTime*.014,0.)));
    diffuseColor.rgb*=1.-cloudShade*(.075+landscapeRain*.08);`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    float soilHeight=landscapeNoise(vTerrainPosition.xz*4.6)*.035;
    vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
    vec3 r1=cross(sy,normal),r2=cross(normal,sx);float determinant=dot(sx,r1);
    normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(soilHeight)*r1+dFdy(soilHeight)*r2));`);
 };
 return material;
}
export function barkMaterial(){
 const material=new THREE.MeshStandardMaterial({color:'#70604b',roughness:.97});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBark;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBark=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vBark;${noiseGLSL}`)
   .replace('#include <color_fragment>',`#include <color_fragment>
    float angle=atan(vBark.z,vBark.x);float fissure=pow(.5+.5*sin(angle*29.+landscapeNoise(vec2(angle*9.,vBark.y*2.))*5.),5.);
    float mottling=landscapeNoise(vec2(angle*7.,vBark.y*15.));diffuseColor.rgb*=.66+mottling*.39-fissure*.22;`);
 };
 return material;
}
export function foliageMaterials(time:{value:number},direction:{value:THREE.Vector3},daylight:{value:number}){
 const material=new THREE.MeshStandardMaterial({color:'#dce8c8',roughness:.88,side:THREE.DoubleSide});
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
 const wind=`
  vec3 origin=instanceMatrix[3].xyz;
  float gust=sin(windTime*.68+origin.x*.21+origin.z*.17);
  float flutter=sin(windTime*3.1+origin.x*2.+position.y*6.);
  transformed.x+=(gust*.10+flutter*.016)*(.5+uv.y*.5);
  transformed.z+=sin(windTime*.83+origin.z*.35)*.055;
  transformed.y+=flutter*.013*uv.y;`;
 for(const target of [material,depth])target.onBeforeCompile=shader=>{
  shader.uniforms.windTime=time;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float windTime;').replace('#include <begin_vertex>','#include <begin_vertex>\n'+wind);
  if(target===material){
   shader.uniforms.foliageSunDirection=direction;shader.uniforms.foliageDaylight=daylight;
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec3 foliageSunDirection;uniform float foliageDaylight;')
    .replace('#include <color_fragment>',`#include <color_fragment>
     float midrib=1.-smoothstep(.008,.025,abs(vUv.x-.5));
     float veins=(1.-smoothstep(.035,.08,abs(sin(vUv.y*36.+abs(vUv.x-.5)*21.))))*(1.-midrib);
     diffuseColor.rgb*=.87+vUv.y*.16+midrib*.10-veins*.055;`)
    .replace('#include <opaque_fragment>',`vec3 leafLight=normalize((viewMatrix*vec4(foliageSunDirection,0.)).xyz);
     float transmission=pow(max(dot(-normal,leafLight),0.),2.);
     outgoingLight+=diffuseColor.rgb*vec3(.66,.83,.35)*transmission*foliageDaylight*.14;
     #include <opaque_fragment>`);
  }
 };
 // Force the standard shader to provide leaf-local UV coordinates even without a bitmap map.
 material.defines={USE_UV:''};depth.defines={USE_UV:''};
 return {material,depth};
}
export function riverSurface(height:(x:number,z:number)=>number,riverX:(z:number)=>number,compact:boolean,dashboard:()=>boolean=()=>false){
 const segments=240,crossings=16,vertices:number[]=[],depths:number[]=[],indices:number[]=[];
 for(let j=0;j<=segments;j++){
  const z=45-j/segments*125;
  for(let i=0;i<=crossings;i++){const x=riverX(z)+(i/crossings-.5)*11.6;vertices.push(x,-z,0);depths.push(Math.max(0,-.05-height(x,z)));}
 }
 for(let j=0;j<segments;j++)for(let i=0;i<crossings;i++){const a=j*(crossings+1)+i,b=a+crossings+1;indices.push(a,a+1,b,b,a+1,b+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('shoreDepth',new THREE.Float32BufferAttribute(depths,1));geometry.setIndex(indices);geometry.computeVertexNormals();
 const river=new Reflector(geometry,{textureWidth:compact?256:512,textureHeight:compact?256:512,multisample:0,clipBias:.003,shader:{name:'SilvanaLivingRiver',uniforms:{color:{value:new THREE.Color()},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},time:{value:0},flowTime:{value:0},wind:{value:.15},shade:{value:new THREE.Color('#538f83')},light:{value:new THREE.Color('#fff0cd')},rain:{value:0},sunDirection:{value:new THREE.Vector3(-.5,.8,-.4)},fogTint:{value:new THREE.Color('#9cbcb0')},fogDensity:{value:.01}},
 vertexShader:`uniform mat4 textureMatrix;uniform float time,flowTime,rain,wind;attribute float shoreDepth;varying vec3 vWorld;varying vec4 vReflection;varying float vDepth;
 void main(){vec3 p=position;float force=1.+rain*3.2+wind*.5;float shore=smoothstep(.015,.32,shoreDepth);p.z=(sin(-p.y*.68-flowTime*.9)*.045+sin(p.x*1.7-p.y*.9-flowTime*1.3)*.024)*force*shore;vWorld=(modelMatrix*vec4(p,1.)).xyz;vReflection=textureMatrix*vec4(p,1.);vDepth=shoreDepth;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 shade,light,sunDirection,fogTint;uniform float time,flowTime,wind,rain,fogDensity;varying vec3 vWorld;varying vec4 vReflection;varying float vDepth;${noiseGLSL}
 float wave(vec2 p){float side=p.x-(sin(p.y*.095)*5.-4.);float travel=p.y-flowTime;float force=1.+rain*3.4+wind*.55;return (sin(travel*.68)*.045+sin(side*3.1+travel*1.15)*.024+sin(side*8.3-travel*4.2+time*.7)*.008)*force;}
 vec3 rainRipples(vec2 p){vec3 result=vec3(0.);if(rain<.01)return result;vec2 uv=p*2.3;vec2 base=floor(uv)-vec2(.5);for(int y=0;y<2;y++)for(int x=0;x<2;x++){vec2 cell=base+vec2(float(x),float(y));float phase=fract(time*(1.15+landscapeHash(cell)*.35)+landscapeHash(cell+3.));vec2 delta=uv-cell-vec2(landscapeHash(cell+5.),landscapeHash(cell+13.));float dist=length(delta);float envelope=exp(-abs(dist-phase*.62)*24.)*(1.-phase);float ring=sin((dist-phase*.62)*60.)*envelope;vec2 outward=delta/max(dist,.01);result+=vec3(outward*ring,abs(ring)*.25);}return result*rain;}

 void main(){vec2 p=vWorld.xz;float h=wave(p),epsilon=.045;
 vec3 n=normalize(vec3((h-wave(p+vec2(epsilon,0.)))/epsilon,1.,(h-wave(p+vec2(0.,epsilon)))/epsilon));
 vec3 impact=rainRipples(p);float ring=impact.z;
 n=normalize(n+vec3(impact.x*.16,0.,impact.y*.16));vec3 eye=normalize(cameraPosition-vWorld);float fresnel=.02+.98*pow(1.-max(dot(eye,n),0.),5.);
 vec2 reflectedUv=vReflection.xy/vReflection.w+n.xz*(.014+rain*.013);
 vec3 reflected=texture2D(tDiffuse,clamp(reflectedUv,vec2(.002),vec2(.998))).rgb;
 float depth=clamp(vDepth*1.7,0.,1.);float side=p.x-(sin(p.y*.095)*5.-4.);vec2 current=vec2(side*5.5,(p.y-flowTime)*1.2);float bed=landscapeNoise(p*4.);vec3 shallow=shade*vec3(.72,.80,.60)+vec3(.035,.027,.012)*bed;
 vec3 water=mix(shallow,shade*vec3(.34,.54,.52),depth);vec3 c=mix(water,reflected,clamp(.10+fresnel*.84,.10,.92));float streaks=landscapeNoise(current)*.7+landscapeNoise(current*vec2(2.5,.6)+4.)*.3;c+=mix(shade,light,.22)*pow(streaks,4.)*(.19+rain*.35);
 vec3 halfVector=normalize(normalize(sunDirection)+eye);float glint=pow(max(dot(n,halfVector),0.),mix(180.,95.,rain));c+=light*glint*.8*(1.-rain*.75);
 float foam=(1.-smoothstep(.01,.17,vDepth))*smoothstep(.64,.90,landscapeNoise(vec2(side*8.,(p.y-flowTime)*3.)));float crests=smoothstep(.10,.23,h)*rain*smoothstep(.40,.78,streaks);c+=vec3(.55,.65,.58)*(foam*.19+crests*.25);
 c+=light*ring*.035;float fog=1.-exp(-pow(length(cameraPosition-vWorld)*fogDensity,2.));c=mix(c,fogTint,fog);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}});
 river.rotation.x=-Math.PI/2;river.position.y=-.05;
 // Reflections update at a lower rate; fine surface motion remains at the scene frame rate.
 const reflect=river.onBeforeRender.bind(river);let last=-Infinity;
 river.onBeforeRender=(renderer,scene,camera,geometry,material,group)=>{const now=performance.now();if(now-last<(dashboard()?400:compact?140:90))return;last=now;reflect(renderer,scene,camera,geometry,material,group);};
 return {river,uniforms:(river.material as THREE.ShaderMaterial).uniforms};
}
