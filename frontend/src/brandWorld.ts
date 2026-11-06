import * as THREE from 'three';

// A small, independent sculpture: thick curved leaves and signals travelling up a stem.
export function createBrandWorld(canvas:HTMLCanvasElement,complete:()=>boolean){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x000000,0);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,30);camera.position.set(0,.05,6.9);camera.lookAt(0,.05,0);
 scene.add(new THREE.HemisphereLight('#eeffe6','#123a31',2.5));
 const key=new THREE.DirectionalLight('#fff5d2',5);key.position.set(-3,4,5);scene.add(key);
 const rim=new THREE.DirectionalLight('#6ee0bf',4);rim.position.set(3,1,-3);scene.add(rim);
 const group=new THREE.Group();scene.add(group);
 const stemMat=new THREE.MeshPhysicalMaterial({color:'#d3dfae',metalness:.45,roughness:.28});
 const leafMats=['#8fc3a0','#4c9b77','#b0d6a1'].map(color=>new THREE.MeshPhysicalMaterial({color,metalness:.16,roughness:.28,clearcoat:.8,clearcoatRoughness:.18,side:THREE.DoubleSide}));
 const stemCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-1.15,0),new THREE.Vector3(-.12,-.65,.02),new THREE.Vector3(.13,-.05,.04),new THREE.Vector3(-.04,.63,0),new THREE.Vector3(.05,1.12,0)]);
 group.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve,45,.035,8,false),stemMat));
 function leafGeometry(){
  const vertices:number[]=[],indices:number[]=[];const rows=22,columns=10;
  for(let side=0;side<2;side++)for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
   const t=row/rows,u=col/columns*2-1,width=Math.pow(Math.sin(Math.PI*t),.8)*.46;
   vertices.push(u*width,t*1.38,Math.sin(Math.PI*t)*(.19+u*u*.16)+(side===0?.022:-.022));
  }
  const stride=(rows+1)*(columns+1);
  for(let side=0;side<2;side++)for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const a=side*stride+row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;
   if(side===0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 }
 const leafGeo=leafGeometry(),leaves:THREE.Group[]=[];
 const specs=[{x:-.02,y:-.25,z:0,angle:.95,scale:1.05},{x:.03,y:.31,z:.02,angle:-.7,scale:1},{x:-.04,y:-.73,z:.07,angle:-1.12,scale:.9}];
 specs.forEach((spec,index)=>{
  const leaf=new THREE.Group();leaf.position.set(spec.x,spec.y,spec.z);leaf.rotation.z=spec.angle;leaf.scale.setScalar(spec.scale);
  leaf.add(new THREE.Mesh(leafGeo,leafMats[index]));
  const vein=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.02,.035),new THREE.Vector3(0,.6,.22),new THREE.Vector3(0,1.34,.04)]);
  leaf.add(new THREE.Mesh(new THREE.TubeGeometry(vein,22,.009,5,false),stemMat));group.add(leaf);leaves.push(leaf);
 });
 const signalMat=new THREE.MeshBasicMaterial({color:'#ecffd5'}),signalGeo=new THREE.SphereGeometry(.055,12,8),signals=Array.from({length:3},()=>{const bead=new THREE.Mesh(signalGeo,signalMat);group.add(bead);return bead;});
 let raf=0,previous=0,time=0,yaw=.15,active=true;
 const resize=()=>{const rect=canvas.getBoundingClientRect();if(rect.width&&rect.height){renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();}};
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 const draw=(timestamp:number)=>{
  if(!active)return;raf=requestAnimationFrame(draw);if(document.hidden||timestamp-previous<33)return;
  const dt=Math.min((timestamp-previous)/1000,.065);previous=timestamp;if(!complete())time+=dt;
  const target=complete()?.08:Math.sin(time*.85)*.65+time*.38;
  yaw=THREE.MathUtils.lerp(yaw,target,1-Math.exp(-dt*5));group.rotation.y=yaw;group.rotation.z=complete()?0:Math.sin(time*.7)*.055;group.position.y=complete()?0:Math.sin(time*1.4)*.045;
  leaves.forEach((leaf,index)=>{leaf.rotation.x=complete()?.05:Math.sin(time*1.55+index*.9)*.16;});
  signals.forEach((signal,index)=>{signal.visible=!complete();signal.position.copy(stemCurve.getPoint((time*.45+index/3)%1));});
  renderer.render(scene,camera);
 };raf=requestAnimationFrame(draw);
 return()=>{active=false;cancelAnimationFrame(raf);observer.disconnect();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(material=>materials.add(material));});geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());renderer.dispose();renderer.forceContextLoss();};
}
