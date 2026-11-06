import {terrainMaterial,barkMaterial,foliageMaterials,riverSurface} from './landscapeMaterials';
import * as THREE from 'three';
import type { SceneState, LightMode } from './Scene';
type Palette = {sky:string;horizon:string;fog:string;sun:string;ground:string;water:string;ambient:number;strength:number;height:number;night:number};
const palettes:Record<LightMode,Palette>={
 day:{sky:'#70adca',horizon:'#d9dfb8',fog:'#9cbcb0',sun:'#fff0cd',ground:'#608b51',water:'#538f83',ambient:2.1,strength:3.8,height:25,night:0},
 sunset:{sky:'#566d98',horizon:'#f7b97e',fog:'#c1a38f',sun:'#ffad62',ground:'#6a8052',water:'#8c9894',ambient:1.25,strength:3.6,height:7,night:0},
 dusk:{sky:'#303d69',horizon:'#b58690',fog:'#646780',sun:'#c7b7dc',ground:'#3f6359',water:'#526e85',ambient:.95,strength:1.1,height:3,night:.45},
 night:{sky:'#07172e',horizon:'#28445f',fog:'#183d50',sun:'#abc9ed',ground:'#325d52',water:'#345b73',ambient:1.05,strength:2.1,height:27,night:1},
};
// Interpolate along the solar timeline, including dawn when wrapping from night to day.
function atmosphere(hour:number):Palette {
 const h=((hour%24)+24)%24;
 const keys:[number,LightMode][]=[[0,'night'],[5,'night'],[6,'dusk'],[7.5,'day'],[16,'day'],[17.5,'sunset'],[18.5,'dusk'],[20,'night'],[24,'night']];
 let index=0;while(index<keys.length-2&&h>keys[index+1][0])index++;
 const [a,from]=keys[index],[b,to]=keys[index+1];let t=(h-a)/(b-a);t=t*t*(3-2*t);
 const result={...palettes[from]};
 for(const key of ['sky','horizon','fog','sun','ground','water'] as const)result[key]='#'+new THREE.Color(palettes[from][key]).lerp(new THREE.Color(palettes[to][key]),t).getHexString();
 for(const key of ['ambient','strength','height','night'] as const)result[key]=THREE.MathUtils.lerp(palettes[from][key],palettes[to][key],t);
 return result;
}
export function createWorld(canvas:HTMLCanvasElement,state:()=>SceneState){
 const compact=matchMedia('(max-width:700px)').matches;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2('#183d50',.012);const camera=new THREE.PerspectiveCamera(42,1,.3,220);camera.position.set(23,16,29);const lookAt=new THREE.Vector3(0,4.5,-8);const reduced={get matches(){return !state().motion;}};
 let seed=27;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};const color=(v:string)=>new THREE.Color(v);
 const uniforms={top:{value:color(palettes[state().mode].sky)},bottom:{value:color(palettes[state().mode].horizon)},sunDirection:{value:new THREE.Vector3(-.5,.5,-.5).normalize()},sunColor:{value:color('#fff2c9')},sunVisibility:{value:1},night:{value:0}};
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,
 vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vDirection;uniform vec3 top,bottom,sunDirection,sunColor;uniform float sunVisibility,night;float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}void main(){vec3 d=normalize(vDirection);float h=smoothstep(-.08,.85,d.y);vec3 c=mix(bottom,top,h);float s=max(dot(d,sunDirection),0.);float horizonHaze=exp(-abs(d.y)*8.);c=mix(c,bottom,horizonHaze*.2);c+=sunColor*(pow(s,500.)*.9+pow(s,18.)*.16+pow(s,4.)*.035)*sunVisibility;vec3 cell=floor(d*420.);float stars=step(.9988,hash(cell))*smoothstep(.03,.45,d.y);c+=vec3(.65,.77,.9)*stars*night;gl_FragColor=vec4(c,1.);}`});
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(150,32,20),skyMaterial));const hemi=new THREE.HemisphereLight('#b8d6e6','#284d32',1.6);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#fff0c4',3);sun.position.set(-18,25,-18);sun.castShadow=true;sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.far=110;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=2.4;sun.target.position.set(0,0,-12);scene.add(sun,sun.target);
 const riverX=(z:number)=>Math.sin(z*.095)*5-4;
 const terrainHeight=(x:number,z:number)=>{const edge=THREE.MathUtils.smoothstep(Math.abs(x-riverX(z)),2.3,6.2);return-.60+edge*Math.max(.95,1.45+Math.sin(x*.17+z*.09)*.7+Math.cos(z*.21)*.3)+edge*Math.pow(Math.max(0,-z-15)*.09,1.5)*(1+Math.sin(x*.11)*.35);};
 const windUniform={value:0},surfaceTime={value:0},surfaceRain={value:0},leafDaylight={value:1};
 const groundMat=terrainMaterial(surfaceTime,surfaceRain);const groundGeo=new THREE.PlaneGeometry(115,110,140,140);groundGeo.rotateX(-Math.PI/2);const positions=groundGeo.attributes.position;const groundColors=[];
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i)-22;positions.setXYZ(i,x,terrainHeight(x,z),z);const tint=color(Math.abs(x-riverX(z))<4?'#b9b28a':'#9cb886');tint.multiplyScalar(.88+Math.sin(x*.43+z*.31)*.055+Math.sin(x*1.7-z*.9)*.025);groundColors.push(tint.r,tint.g,tint.b);}
 groundGeo.setAttribute('color',new THREE.Float32BufferAttribute(groundColors,3));groundGeo.computeVertexNormals();const ground=new THREE.Mesh(groundGeo,groundMat);ground.receiveShadow=true;scene.add(ground);
 const {river,uniforms:waterUniforms}=riverSurface(terrainHeight,riverX,compact,()=>state().dashboard);scene.add(river);
 const trunkMat=barkMaterial();const {material:leafMat,depth:leafDepth}=foliageMaterials(windUniform,uniforms.sunDirection,leafDaylight);
 const trunkGeo=new THREE.CylinderGeometry(.09,.22,1,9);
 const leafGeo=new THREE.BufferGeometry(),leafVertices:number[]=[],leafUvs:number[]=[];
 for(let k=0;k<30;k++){
  const azimuth=rand()*Math.PI*2,elevation=rand()*2-1,radius=Math.sqrt(rand())*.92;
  const center=new THREE.Vector3(Math.cos(azimuth)*radius,elevation*.63,Math.sin(azimuth)*radius);
  const axis=new THREE.Vector3(Math.cos(azimuth+.4),.2+rand()*.65,Math.sin(azimuth+.4)).normalize();
  const side=new THREE.Vector3(-axis.z,0,axis.x).normalize(),length=.27+rand()*.24,width=length*.34;
  const base=center.clone().addScaledVector(axis,-length*.5),tip=center.clone().addScaledVector(axis,length*.5);
  const left=center.clone().addScaledVector(side,width),right=center.clone().addScaledVector(side,-width),ridge=center.clone().add(new THREE.Vector3(0,.055,0));
  const points=[base,left,ridge,left,tip,ridge,tip,right,ridge,right,base,ridge];
  for(const v of points)leafVertices.push(v.x,v.y,v.z);
  leafUvs.push(.5,0,0,.5,.5,.5,0,.5,.5,1,.5,.5,.5,1,1,.5,.5,.5,1,.5,.5,0,.5,.5);
 }
 leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(leafVertices,3));leafGeo.setAttribute('uv',new THREE.Float32BufferAttribute(leafUvs,2));leafGeo.computeVertexNormals();
 const treeCount=compact?180:215,clusters=24,branchCount=7;
 const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,treeCount),branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.085,1,7),trunkMat,treeCount*branchCount),leaves=new THREE.InstancedMesh(leafGeo,leafMat,treeCount*clusters);
 leaves.customDepthMaterial=leafDepth;
 for(const part of [trunks,branches,leaves]){part.castShadow=true;part.receiveShadow=true;}
 const dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
 for(let i=0;i<treeCount;i++){
  let x=rand()*85-43,z=rand()*79-60;if(z>5)z=-8-rand()*46;
  if(Math.abs(x-riverX(z))<6.2||(x>1&&x<14&&z>-10&&z<8))x+=x<0?-10:12;
  const y=terrainHeight(x,z),scale=.68+rand()*1.03,height=(4.7+rand()*1.2)*scale,spread=(1.65+rand()*.65)*scale;
  dummy.rotation.set(0,rand()*6,(rand()-.5)*.055);dummy.position.set(x,y+height*.34,z);dummy.scale.set(scale,height*.68,scale);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  for(let j=0;j<branchCount;j++){
   const angle=j*2.4+rand()*.7,start=new THREE.Vector3(x,y+height*(.28+j*.047),z),reach=(.55+rand()*.45)*spread;
   const end=new THREE.Vector3(x+Math.cos(angle)*reach,y+height*(.65+rand()*.25),z+Math.sin(angle)*reach),delta=end.clone().sub(start);
   dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());dummy.scale.set(scale,delta.length(),scale);dummy.updateMatrix();branches.setMatrixAt(i*branchCount+j,dummy.matrix);
  }
  const treeTint=rand();
  for(let j=0;j<clusters;j++){
   const angle=j*2.39996+rand()*.55,radius=Math.sqrt(rand())*spread;
   const dome=Math.sqrt(Math.max(0,1-radius*radius/(spread*spread)));
   dummy.position.set(x+Math.cos(angle)*radius,y+height*(.64+.28*dome)+(rand()-.5)*.65*scale,z+Math.sin(angle)*radius);
   dummy.rotation.set(rand()*1.6,rand()*6,rand()*1.8);const leafScale=(.7+rand()*.35)*scale;
   dummy.scale.set(leafScale,leafScale*(.66+rand()*.25),leafScale);dummy.updateMatrix();leaves.setMatrixAt(i*clusters+j,dummy.matrix);
   leaves.setColorAt(i*clusters+j,color(['#8fa96a','#648653','#476f44','#729452','#3e653e'][Math.floor((rand()*.6+treeTint*.4)*5)]));
  }
 }
 scene.add(trunks,branches,leaves);
 const rockMat=new THREE.MeshStandardMaterial({color:'#8a9585',roughness:1});const rocks=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),rockMat,70);rocks.castShadow=true;rocks.receiveShadow=true;
 for(let i=0;i<70;i++){const z=rand()*70-48,x=riverX(z)+(rand()>.5?1:-1)*(3+rand()*2),s=.18+rand()*.65;dummy.position.set(x,terrainHeight(x,z)+s*.23,z);dummy.scale.set(s*1.4,s*.65,s);dummy.rotation.set(rand(),rand()*6,rand());dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}scene.add(rocks);
 const station=new THREE.Group();station.position.set(6.5,terrainHeight(6.5,-1),-1);station.rotation.y=-.25;scene.add(station);
 const white=new THREE.MeshStandardMaterial({color:'#eee8d3',roughness:.76}),metal=new THREE.MeshStandardMaterial({color:'#c1cbd0',metalness:.7,roughness:.32}),dark=new THREE.MeshStandardMaterial({color:'#244944',metalness:.15,roughness:.65});const windowMat=new THREE.MeshStandardMaterial({color:'#839da1',emissive:'#ffbd62',emissiveIntensity:0,metalness:.35,roughness:.22});
 const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 mesh(new THREE.BoxGeometry(4.5,.25,3.6),rockMat,station,0,.15,0);mesh(new THREE.BoxGeometry(3.6,2.15,2.7),white,station,0,1.3,0);const roof=new THREE.Group();roof.position.y=2.48;station.add(roof);
 const roofL=mesh(new THREE.BoxGeometry(2.25,.14,3.3),dark,roof,-.96,.35,0);roofL.rotation.z=.36;const roofR=mesh(new THREE.BoxGeometry(2.25,.14,3.3),dark,roof,.96,.35,0);roofR.rotation.z=-.36;
 mesh(new THREE.BoxGeometry(.8,1.6,.08),dark,station,.9,1,1.39);mesh(new THREE.BoxGeometry(.95,.85,.07),windowMat,station,-.8,1.5,1.4);mesh(new THREE.BoxGeometry(.07,.85,1),windowMat,station,1.84,1.5,0);mesh(new THREE.BoxGeometry(.04,.9,.08),white,station,-.8,1.5,1.45);
 // Gables, roof seams and framed joinery give the station a finished structure.
 const gableShape=new THREE.Shape();gableShape.moveTo(-1.8,0);gableShape.lineTo(0,.72);gableShape.lineTo(1.8,0);gableShape.closePath();
 const gableGeo=new THREE.ExtrudeGeometry(gableShape,{depth:.07,bevelEnabled:false});
 mesh(gableGeo,white,station,0,2.38,1.3);mesh(gableGeo,white,station,0,2.38,-1.37);
 mesh(new THREE.CylinderGeometry(.065,.065,3.5,8),metal,roof,0,.75,0).rotation.x=Math.PI/2;
 for(const side of [-1,1])for(let j=0;j<9;j++){const seam=mesh(new THREE.BoxGeometry(2.2,.035,.025),metal,roof,side*.96,.44,-1.48+j*.37);seam.rotation.z=-side*.36;}
 const frameMat=new THREE.MeshStandardMaterial({color:'#b8c5ba',roughness:.7});
 for(const x of [-1.32,-.28])mesh(new THREE.BoxGeometry(.07,.98,.12),frameMat,station,x,1.5,1.44);
 for(const y of [1.02,1.98])mesh(new THREE.BoxGeometry(1.11,.07,.12),frameMat,station,-.8,y,1.44);
 mesh(new THREE.BoxGeometry(1.17,.09,.32),frameMat,station,-.8,1.01,1.51);
 for(const x of [.45,1.35])mesh(new THREE.BoxGeometry(.07,1.78,.12),frameMat,station,x,1.05,1.45);
 mesh(new THREE.BoxGeometry(.96,.08,.12),frameMat,station,.9,1.94,1.45);
 mesh(new THREE.SphereGeometry(.055,8,6),metal,station,1.16,1.03,1.48);
 mesh(new THREE.BoxGeometry(1.4,.18,.7),rockMat,station,.9,.18,1.82);mesh(new THREE.BoxGeometry(1.6,.1,.45),rockMat,station,.9,.09,2.25);
 for(let j=0;j<5;j++)mesh(new THREE.BoxGeometry(.48,.025,.055),dark,station,0,2.53+j*.045,1.4);
 for(const x of [-1.76,1.76])mesh(new THREE.BoxGeometry(.08,2.14,.08),frameMat,station,x,1.3,1.37);
 const mast=new THREE.Group();mast.position.set(-3,.3,1);station.add(mast);mesh(new THREE.CylinderGeometry(.065,.09,6,12),metal,mast,0,3,0);
 // Every strut terminates on the mast or the panel underside: no floating supports.
 const support=(from:THREE.Vector3,to:THREE.Vector3,radius=.055)=>{const delta=to.clone().sub(from);const bar=mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),10),metal,mast,0,0,0);bar.position.copy(from).add(to).multiplyScalar(.5);bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());};
 const attachment=new THREE.Vector3(-1.2,2.64,.328);
 support(new THREE.Vector3(0,2.64,0),attachment,.065);
 support(new THREE.Vector3(0,1.88,0),attachment,.055);
 for(const offset of [-.42,.42]){
 const anchor=new THREE.Vector3(-1.2,2.7-.055*Math.cos(.45)-offset*Math.sin(.45),.35-.055*Math.sin(.45)+offset*Math.cos(.45));
 support(attachment,anchor,.045);
 support(anchor.clone().add(new THREE.Vector3(-.58,0,0)),anchor.clone().add(new THREE.Vector3(.58,0,0)),.035);
 }
 for(const y of [1.88,2.64])mesh(new THREE.CylinderGeometry(.13,.13,.16,12),metal,mast,0,y,0);
 const solar=mesh(new THREE.BoxGeometry(1.5,.09,1.2),new THREE.MeshStandardMaterial({color:'#193c68',metalness:.65,roughness:.2}),mast,-1.2,2.7,.35);solar.rotation.x=.45;
 for(let i=0;i<4;i++){const line=mesh(new THREE.BoxGeometry(.018,.01,1.16),metal,solar,-.55+i*.36,.052,0);line.castShadow=false;}for(let i=0;i<5;i++)mesh(new THREE.CylinderGeometry(.28,.28,.06,16),white,mast,0,4.1+i*.12,0);
 const rotor=new THREE.Group();rotor.position.y=6;mast.add(rotor);for(let i=0;i<3;i++){const arm=new THREE.Group();arm.rotation.y=i*Math.PI*2/3;rotor.add(arm);mesh(new THREE.BoxGeometry(.8,.035,.035),metal,arm,.35,0,0);mesh(new THREE.SphereGeometry(.16,10,8),dark,arm,.8,0,0);}
 const lamp=new THREE.PointLight('#ffbb66',0,12,2);lamp.position.set(0,2.6,2.1);station.add(lamp);mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:'#98f3c0'}),mast,0,4.9,.1);
 const fenceMat=new THREE.MeshStandardMaterial({color:'#aeaa91',roughness:.9});for(let i=0;i<8;i++)mesh(new THREE.BoxGeometry(.08,1.1,.08),fenceMat,station,-4+i*1.2,.65,-2.4);mesh(new THREE.BoxGeometry(8.5,.05,.05),fenceMat,station,.2,1,-2.4);mesh(new THREE.BoxGeometry(8.5,.05,.05),fenceMat,station,.2,.5,-2.4);
 const clouds=new THREE.Group();scene.add(clouds);
 const cloudUniforms={time:{value:0},rain:{value:0},overcast:{value:.18},tint:{value:color(palettes[state().mode].night>.5?'#40556c':'#edf0e9')}};
 const cloudMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:cloudUniforms,
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float time,rain,overcast;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+7.1;a*=.5;}return n;}
 void main(){vec2 p=(vUv-.5)*vec2(2.4,2.);float shape=exp(-dot(p*vec2(.95,1.8),p*vec2(.95,1.8))*2.8);
 shape+=exp(-dot((p-vec2(-.38,.1))*vec2(2.,2.8),(p-vec2(-.38,.1))*vec2(2.,2.8))*2.)*.55;
 shape+=exp(-dot((p-vec2(.2,.24))*vec2(2.,2.3),(p-vec2(.2,.24))*vec2(2.,2.3))*2.)*.65;
 float detail=fbm(p*5.+vec2(time*.018,0.));float density=smoothstep(.18,1.65,shape*(.3+detail*1.3+overcast*.58));
 float edge=smoothstep(0.,.13,vUv.x)*smoothstep(0.,.13,1.-vUv.x)*smoothstep(0.,.12,vUv.y)*smoothstep(0.,.12,1.-vUv.y);
 vec3 lit=tint*(.68+vUv.y*.24+detail*.18-overcast*(1.-vUv.y)*.16);gl_FragColor=vec4(lit,density*edge*.88);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const stormMat=cloudMat.clone();stormMat.uniforms={...cloudUniforms,coverage:{value:0}};stormMat.opacity=0;
 stormMat.fragmentShader=stormMat.fragmentShader.replace('uniform float time,rain,overcast;','uniform float time,rain,overcast;uniform float coverage;').replace('density*edge*.88','density*edge*.94*coverage');
 const cloudGeo=new THREE.PlaneGeometry(1,1);
 for(let i=0;i<56;i++){const storm=i>=18;const c=new THREE.Mesh(cloudGeo,storm?stormMat:cloudMat);c.position.set(rand()*145-72,storm?24+rand()*10:23+rand()*12,-rand()*95-8);c.scale.set(storm?32+rand()*17:21+rand()*13,storm?13+rand()*8:9+rand()*7,1);c.renderOrder=storm?-1:-2;clouds.add(c);}
 const rainCount=2800,rainPositions=new Float32Array(rainCount*6),speeds=new Float32Array(rainCount);for(let i=0;i<rainCount;i++){const n=i*6;rainPositions[n]=rand()*65-32;rainPositions[n+1]=rand()*36;rainPositions[n+2]=rand()*65-35;rainPositions[n+3]=rainPositions[n]-.13;rainPositions[n+4]=rainPositions[n+1]-.7;rainPositions[n+5]=rainPositions[n+2];speeds[i]=.8+rand()*.7;}
 const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));const rainMat=new THREE.LineBasicMaterial({color:'#c5dce5',transparent:true,opacity:0,depthWrite:false});const rain=new THREE.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;scene.add(rain);
 const flyPositions=new Float32Array(90);for(let i=0;i<30;i++){const z=rand()*35-15;flyPositions[i*3]=riverX(z)+(rand()>.5?1:-1)*(4+rand()*3);flyPositions[i*3+1]=.6+rand()*2;flyPositions[i*3+2]=z;}const flyGeo=new THREE.BufferGeometry();flyGeo.setAttribute('position',new THREE.BufferAttribute(flyPositions,3));const flyMat=new THREE.PointsMaterial({color:'#dceaa0',size:.09,transparent:true,opacity:0,depthWrite:false});scene.add(new THREE.Points(flyGeo,flyMat));
 // A distant branching bolt lights the landscape, with one soft pulse per strike.
 const lightning=new THREE.Group();scene.add(lightning);lightning.visible=false;
 const boltMat=new THREE.MeshBasicMaterial({color:'#d5eaff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
 const boltPoints=[new THREE.Vector3(-16,32,-26),new THREE.Vector3(-18,27,-26),new THREE.Vector3(-15,24,-26),new THREE.Vector3(-19,18,-26),new THREE.Vector3(-17,16,-26),new THREE.Vector3(-22,8,-26)];
 const boltPaths=[boltPoints,[boltPoints[2],new THREE.Vector3(-11,20,-27),new THREE.Vector3(-12,17,-27)],[boltPoints[3],new THREE.Vector3(-23,16,-25),new THREE.Vector3(-25,11,-25)]];
 for(const points of boltPaths){const curve=new THREE.CurvePath<THREE.Vector3>();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));lightning.add(new THREE.Mesh(new THREE.TubeGeometry(curve,points.length*2,.045,5,false),boltMat));}
 const lightningLight=new THREE.PointLight('#bfdcff',0,150,1.4);lightningLight.position.set(-16,24,-18);scene.add(lightningLight);
 let stormAmount=0,strikeAge=2,nextStrike=.8;
 let width=0,raf=0,previous=0,time=0,riverFlow=0,cloudAmount=state().cloudCover,windAmount=state().windStrength,rainAmount=state().precipitation,nightAmount=palettes[state().mode].night;let visualHour=state().hour,hourFrom=visualHour,hourTarget=visualHour,hourElapsed=7,lightKey=state().automatic?'auto':state().mode;let pointerX=0,pointerY=0,px=0,py=0;
 const onPointer=(event:PointerEvent)=>{const rect=canvas.getBoundingClientRect();pointerX=(event.clientX-rect.left)/rect.width-.5;pointerY=(event.clientY-rect.top)/rect.height-.5;};const leave=()=>{pointerX=pointerY=0;};canvas.parentElement?.addEventListener('pointermove',onPointer);canvas.parentElement?.addEventListener('pointerleave',leave);
 let dashboardQuality=state().dashboard,lastShadow=-Infinity;
 const resize=()=>{const rect=canvas.getBoundingClientRect();width=rect.width;if(width&&rect.height){renderer.setPixelRatio(dashboardQuality?Math.min(devicePixelRatio,1):Math.min(devicePixelRatio,1.7));renderer.setSize(width,rect.height,false);camera.aspect=width/rect.height;camera.updateProjectionMatrix();}};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();const targetColor=new THREE.Color();const lerpColor=(value:THREE.Color,target:string,amount:number)=>value.lerp(targetColor.set(target),amount);
 const draw=(timestamp:number)=>{raf=requestAnimationFrame(draw);if(document.hidden||!width||timestamp-previous<(state().dashboard?80:33))return;const dt=Math.min((timestamp-previous)/1000,.12);previous=timestamp;const current=state();if(dashboardQuality!==current.dashboard){dashboardQuality=current.dashboard;resize();}renderer.shadowMap.autoUpdate=!current.dashboard;if(current.dashboard&&timestamp-lastShadow>500){renderer.shadowMap.needsUpdate=true;lastShadow=timestamp;}const previousStorm=stormAmount>.001;const key=current.automatic?'auto':current.mode;
 if(key!==lightKey){lightKey=key;hourFrom=visualHour;hourTarget=visualHour+((current.hour-visualHour%24+24)%24);hourElapsed=0;}
 hourElapsed=Math.min(7,hourElapsed+dt);const travel=hourElapsed/7;const ease=travel*travel*(3-2*travel);
 if(reduced.matches){visualHour=current.hour;hourElapsed=7;}else if(hourElapsed<7){visualHour=THREE.MathUtils.lerp(hourFrom,hourTarget,ease);}else{visualHour=current.automatic?current.hour:hourTarget;}
 const p=atmosphere(visualHour),blend=reduced.matches?1:1-Math.exp(-dt*2.2);rainAmount=THREE.MathUtils.lerp(rainAmount,current.precipitation,blend);cloudAmount=THREE.MathUtils.lerp(cloudAmount,current.cloudCover,blend*.6);windAmount=THREE.MathUtils.lerp(windAmount,current.windStrength,blend);nightAmount=THREE.MathUtils.lerp(nightAmount,p.night,blend);if(!reduced.matches){time+=dt;riverFlow+=dt*(.65+rainAmount*1.9+windAmount*.65);}stormAmount=current.storm?THREE.MathUtils.lerp(stormAmount,1,blend):0;if(previousStorm&&!current.storm&&!current.rain)rainAmount=0;if(rainAmount<.001)rainAmount=0;if(!current.storm){nextStrike=.8;}nextStrike-=dt;if(current.storm&&nextStrike<=0){window.dispatchEvent(new CustomEvent('silvana:lightning'));strikeAge=0;nextStrike=5+rand()*4;lightning.position.x=(rand()-.5)*18;}strikeAge+=dt;const flash=current.storm?Math.exp(-strikeAge*6)*stormAmount:0;lightning.visible=flash>.025;boltMat.opacity=flash;lightningLight.intensity=flash*220;rainGeo.setDrawRange(0,Math.floor(1250+stormAmount*1550)*2);
 lerpColor(uniforms.top.value,cloudAmount>.65?(p.night>.65?'#0b1b2d':'#526c81'):p.sky,blend);lerpColor(uniforms.bottom.value,cloudAmount>.65?(p.night>.65?'#293e52':'#9daeb0'):p.horizon,blend);lerpColor((scene.fog as THREE.FogExp2).color,cloudAmount>.65?(p.night>.65?'#1c3447':'#80969e'):p.fog,blend);(scene.fog as THREE.FogExp2).density=THREE.MathUtils.lerp((scene.fog as THREE.FogExp2).density,.010+cloudAmount*.005+rainAmount*.007,blend);
 lerpColor(groundMat.color,p.ground,blend);lerpColor(waterUniforms.shade.value,p.water,blend);lerpColor(waterUniforms.light.value,p.sun,blend);lerpColor(sun.color,p.sun,blend);sun.intensity=THREE.MathUtils.lerp(sun.intensity,p.strength*(1-cloudAmount*.65-rainAmount*.13),blend);sun.position.y=THREE.MathUtils.lerp(sun.position.y,p.height,blend);sun.position.x=THREE.MathUtils.lerp(sun.position.x,-Math.cos(visualHour/24*Math.PI*2)*27,blend);hemi.intensity=THREE.MathUtils.lerp(hemi.intensity,p.ambient*(1-cloudAmount*.12-rainAmount*.10),blend);uniforms.sunDirection.value.copy(sun.position).sub(sun.target.position).normalize();leafDaylight.value=(1-nightAmount*.96)*(1-cloudAmount*.45);uniforms.sunVisibility.value=1-THREE.MathUtils.smoothstep(cloudAmount,.25,.97)*.98;uniforms.night.value=nightAmount*(1-cloudAmount*.97);
 cloudUniforms.time.value=time;cloudUniforms.rain.value=rainAmount;cloudUniforms.overcast.value=cloudAmount;stormMat.uniforms.coverage.value=THREE.MathUtils.smoothstep(cloudAmount,.25,.95);lerpColor(cloudUniforms.tint.value,nightAmount>.5?'#40556c':cloudAmount>.65?'#8e9da9':'#efebe0',blend);surfaceTime.value=time;surfaceRain.value=rainAmount;waterUniforms.sunDirection.value.copy(uniforms.sunDirection.value);waterUniforms.fogTint.value.copy((scene.fog as THREE.FogExp2).color);waterUniforms.fogDensity.value=(scene.fog as THREE.FogExp2).density;waterUniforms.time.value=time;waterUniforms.flowTime.value=riverFlow;waterUniforms.wind.value=windAmount;waterUniforms.rain.value=rainAmount;windowMat.emissiveIntensity=nightAmount*2.6;lamp.intensity=nightAmount*13;flyMat.opacity=nightAmount*(1-rainAmount)*(.45+Math.sin(time)*.15);rainMat.opacity=rainAmount*(.38+stormAmount*.22);rain.visible=rainAmount>.01;
 if(!reduced.matches){rotor.rotation.y+=dt*(1.2+rainAmount*3);for(const cloud of clouds.children){cloud.quaternion.copy(camera.quaternion);cloud.position.x+=dt*(1.1+rainAmount*1.2+stormAmount*7)*(hourElapsed<7?1.8:1);if(cloud.position.x>72)cloud.position.x=-72;}windUniform.value=time*(1.+rainAmount*.65+stormAmount*1.7);if(rainAmount>.01){for(let i=0;i<rainCount;i++){const n=i*6;rainPositions[n+1]-=dt*(17+stormAmount*15)*speeds[i];rainPositions[n]-=dt*(1.9+stormAmount*14);if(rainPositions[n+1]<0){rainPositions[n+1]=30+rand()*7;rainPositions[n]=rand()*65-32;}rainPositions[n+3]=rainPositions[n]-(.13+stormAmount*.7);rainPositions[n+4]=rainPositions[n+1]-(.7+stormAmount*.7);}rainGeo.attributes.position.needsUpdate=true;}}
 px=THREE.MathUtils.lerp(px,pointerX,blend*.5);py=THREE.MathUtils.lerp(py,pointerY,blend*.5);const angle=.68;camera.position.set(Math.sin(angle)*38+(reduced.matches?0:px*.8),12.5+(reduced.matches?0:py*.45),Math.cos(angle)*38);lookAt.x=7;camera.lookAt(lookAt);renderer.render(scene,camera);};
 raf=requestAnimationFrame(draw);
 return()=>{cancelAnimationFrame(raf);observer.disconnect();canvas.parentElement?.removeEventListener('pointermove',onPointer);canvas.parentElement?.removeEventListener('pointerleave',leave);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(object=>{const m=object as THREE.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>materials.add(mat));if(m.customDepthMaterial)materials.add(m.customDepthMaterial);});river.getRenderTarget().dispose();sun.shadow.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();};
}



