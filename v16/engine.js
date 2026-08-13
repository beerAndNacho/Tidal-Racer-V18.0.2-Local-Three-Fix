import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { REGIONS, ROUTE_POINTS } from '../data-v12.js';
import { buildRiderRig, animateRiderRig } from './character-system.js';
import { waveHeight, renderWaveHeight, waveCrestFactor } from './wave-model.js';

export { THREE };

const $=s=>document.querySelector(s);
export const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0xa9c9cf,.00035);

export const camera=new THREE.PerspectiveCamera(61,innerWidth/innerHeight,.1,11000);
export const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.82;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('#game').appendChild(renderer.domElement);

export const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
let gtao=null;
export function configurePost(quality='balanced'){
  while(composer.passes.length>1)composer.removePass(composer.passes[composer.passes.length-1]);
  if(quality==='ultra'&&innerWidth>900){
    gtao=new GTAOPass(scene,camera,innerWidth,innerHeight);
    gtao.updateGtaoMaterial({radius:2.2,distanceExponent:1.25,thickness:1.1,distanceFallOff:1.2});
    composer.addPass(gtao);
  }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),quality==='ultra'?.22:.14,.32,1.04));
  composer.addPass(new SMAAPass(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio()));
  composer.addPass(new OutputPass());
}
configurePost();

scene.add(new THREE.HemisphereLight(0xffe8c8,0x102f3e,1.38));
export const sunLight=new THREE.DirectionalLight(0xffd2a1,3.15);
sunLight.position.set(-420,410,-340);
sunLight.castShadow=true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.near=20;
sunLight.shadow.camera.far=2400;
sunLight.shadow.camera.left=-900;
sunLight.shadow.camera.right=900;
sunLight.shadow.camera.top=900;
sunLight.shadow.camera.bottom=-900;
scene.add(sunLight);

export const sky=new Sky();
sky.scale.setScalar(10000);
scene.add(sky);
sky.material.uniforms.turbidity.value=9.2;
sky.material.uniforms.rayleigh.value=2.15;
sky.material.uniforms.mieCoefficient.value=.0028;
sky.material.uniforms.mieDirectionalG.value=.72;
export const sunDir=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(69),THREE.MathUtils.degToRad(236));
sky.material.uniforms.sunPosition.value.copy(sunDir);

const pmrem=new THREE.PMREMGenerator(renderer);
const envRT=pmrem.fromScene(scene,.04);
scene.environment=envRT.texture;

const waterNormals=new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping});
const waterGeometry=new THREE.PlaneGeometry(3400,3400,150,150);
const waterBaseXY=new Float32Array(waterGeometry.attributes.position.count*2);
for(let i=0;i<waterGeometry.attributes.position.count;i++){waterBaseXY[i*2]=waterGeometry.attributes.position.getX(i);waterBaseXY[i*2+1]=waterGeometry.attributes.position.getY(i)}
export const water=new Water(waterGeometry,{textureWidth:1024,textureHeight:1024,waterNormals,sunDirection:sunDir,sunColor:0xffd7ae,waterColor:0x063b55,distortionScale:4.8,size:1.45,fog:true});
water.rotation.x=-Math.PI/2;water.position.y=-.42;water.frustumCulled=false;water.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),3000);scene.add(water);
const farOcean=new THREE.Mesh(new THREE.PlaneGeometry(14000,14000),new THREE.MeshPhysicalMaterial({color:0x082f43,roughness:.32,metalness:.08,clearcoat:.28,envMapIntensity:.72}));
farOcean.rotation.x=-Math.PI/2;farOcean.position.y=-2.4;farOcean.receiveShadow=true;scene.add(farOcean);
const foamCount=1200,foamPos=new Float32Array(foamCount*3),foamSeed=new Float32Array(foamCount*2);
for(let i=0;i<foamCount;i++){const angle=i*2.3999632297,radius=75+Math.sqrt((i+.5)/foamCount)*1450;foamSeed[i*2]=Math.cos(angle)*radius;foamSeed[i*2+1]=Math.sin(angle)*radius}
const foamGeometry=new THREE.BufferGeometry();foamGeometry.setAttribute('position',new THREE.BufferAttribute(foamPos,3));
const foamMaterial=new THREE.PointsMaterial({color:0xeafcff,size:2.8,transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
export const whitecaps=new THREE.Points(foamGeometry,foamMaterial);whitecaps.frustumCulled=false;scene.add(whitecaps);
let lastWaterUpdate=-1,lastFoamUpdate=-1;
export function updateWaterSurface(time,seaState=1,centerX=0,centerZ=0){
  if(time-lastWaterUpdate<1/30)return;lastWaterUpdate=time;
  const snappedX=Math.round(centerX/80)*80,snappedZ=Math.round(centerZ/80)*80;water.position.x=snappedX;water.position.z=snappedZ;
  const pos=water.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){const lx=waterBaseXY[i*2],ly=waterBaseXY[i*2+1],wx=snappedX+lx,wz=snappedZ-ly;pos.setZ(i,renderWaveHeight(wx,wz,time,seaState))}
  pos.needsUpdate=true;if(water.material.uniforms.time)water.material.uniforms.time.value=time;if(water.material.uniforms.distortionScale)water.material.uniforms.distortionScale.value=4.25+seaState*1.15;
  foamMaterial.opacity=.26+Math.min(.25,(seaState-.7)*.24);
  if(time-lastFoamUpdate>=1/12){
    lastFoamUpdate=time;
    for(let i=0;i<foamCount;i++){const ox=foamSeed[i*2],oz=foamSeed[i*2+1],wx=snappedX+ox,wz=snappedZ+oz,crest=waveCrestFactor(wx,wz,time,seaState),j=i*3;foamPos[j]=wx;foamPos[j+2]=wz;foamPos[j+1]=crest>.32?waveHeight(wx,wz,time,seaState)+.17:-30}
    foamGeometry.attributes.position.needsUpdate=true;
  }
}

export class AssetRegistry{
  constructor(){
    this.assets=new Map();
    this.loader=new GLTFLoader();
    this.draco=new DRACOLoader();
    this.ktx2=new KTX2Loader();
    this.draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this.ktx2.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/basis/');
    this.ktx2.detectSupport(renderer);
    this.loader.setDRACOLoader(this.draco);
    this.loader.setKTX2Loader(this.ktx2);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }
  async init(){
    try{
      const r=await fetch('./assets/manifest.json',{cache:'no-store'});
      if(r.ok)(await r.json()).assets?.forEach(a=>this.assets.set(a.id,a));
    }catch(e){console.info('asset manifest fallback',e)}
  }
  async spawn(id){
    const a=this.assets.get(id);
    if(!a?.url||a.enabled===false)return null;
    try{
      const gltf=await this.loader.loadAsync(a.url);
      const obj=gltf.scene.clone(true);
      obj.scale.setScalar(a.scale||1);
      return obj;
    }catch(e){console.warn('asset load failed',id,e);return null}
  }
}
export const assets=new AssetRegistry();
assets.init();

export const worldRoot=new THREE.Group();
scene.add(worldRoot);
export const regionGroups=[];
const mat=(color,rough=.8,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const matPhysical=(color,rough=.35,metal=.08,clear=.5)=>new THREE.MeshPhysicalMaterial({color,roughness:rough,metalness:metal,clearcoat:clear,clearcoatRoughness:.12,envMapIntensity:1.35});
function mesh(parent,geometry,material,name,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
function joint(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g}

function addRock(group,x,y,z,s=1,c=0x3a4945){
  const o=new THREE.Mesh(new THREE.DodecahedronGeometry(12*s,0),mat(c,1));
  o.position.set(x,y,z);o.scale.y=1.2+.6*Math.random();o.rotation.set(Math.random(),Math.random(),Math.random());
  o.castShadow=o.receiveShadow=true;group.add(o);
}
function addPalm(group,x,z,s=1){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35*s,.55*s,9*s,7),mat(0x704b2c,1));trunk.position.set(x,4.5*s,z);group.add(trunk);
  const leafMat=mat(0x267347,1);
  for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.BoxGeometry(.35*s,.12*s,6*s),leafMat);leaf.position.set(x,9*s,z);leaf.rotation.y=i/6*Math.PI*2;leaf.rotation.x=.22;leaf.translateZ(2.3*s);group.add(leaf)}
}
function addBuilding(group,x,z,h=20,w=16,c=0xd3cec1){
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w*1.15),mat(c,.68,.04));b.position.set(x,h/2,z);b.castShadow=b.receiveShadow=true;group.add(b);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w*1.06,.7,w*1.21),mat(0x776f63,.86));roof.position.set(x,h+.35,z);group.add(roof);
}
function addLighthouse(group,x,z){
  const t=new THREE.Mesh(new THREE.CylinderGeometry(3.2,4.5,30,16),mat(0xf4e7d5,.72));t.position.set(x,15,z);t.castShadow=true;group.add(t);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(5,5,3.4,16),mat(0x26323a,.4,.15));top.position.set(x,31.6,z);group.add(top);
  const light=new THREE.PointLight(0xffd38e,35,260,2);light.position.set(x,34,z);group.add(light);
}
function addPier(group,x,z,rot=0,len=110){
  const deck=new THREE.Mesh(new THREE.BoxGeometry(14,1.2,len),mat(0x7b5737,.9));deck.position.set(x,1,z);deck.rotation.y=rot;group.add(deck);
  for(let i=-4;i<=4;i++){const p=new THREE.Mesh(new THREE.CylinderGeometry(.7,.8,7,7),mat(0x604029,1));p.position.set(x+Math.cos(rot)*i*12,-2,z-Math.sin(rot)*i*12);group.add(p)}
}
function addCargoShip(group,x,z,rot=0){
  const hull=new THREE.Mesh(new THREE.BoxGeometry(30,9,130),mat(0x253746,.38,.3));hull.position.set(x,3,z);hull.rotation.y=rot;group.add(hull);
  for(let i=-2;i<=2;i++)for(let j=0;j<2;j++){const c=new THREE.Mesh(new THREE.BoxGeometry(20,8,18),mat([0xc34b3d,0x2d73b9,0xb58d39][(i+j+5)%3],.65,.08));c.position.set(x+Math.sin(rot)*(i*20),10+j*8,z+Math.cos(rot)*(i*20));c.rotation.y=rot;group.add(c)}
}
function addCaveArch(group,x,z,s=1){
  for(let i=0;i<12;i++){const a=Math.PI*i/11,r=35*s;addRock(group,x+Math.cos(a)*r,Math.sin(a)*r-2,z,1.2*s,0x303a38)}
}
function createRegion(R,idx){
  const group=new THREE.Group();group.name=R.name;group.position.set(R.x,0,R.z);
  const island=new THREE.Mesh(new THREE.CylinderGeometry(R.r*.72,R.r*.93,155,96,12),mat(R.color,.97));
  island.position.y=-82;island.castShadow=island.receiveShadow=true;
  const pos=island.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),x=pos.getX(i),z=pos.getZ(i),rr=Math.hypot(x,z)/R.r;
    if(y>45)pos.setY(i,y+(Math.sin(x*.018+idx)*Math.cos(z*.021-idx)*18+Math.sin((x+z)*.009)*11)*(1-rr));
  }
  island.geometry.computeVertexNormals();group.add(island);
  const beach=new THREE.Mesh(new THREE.RingGeometry(R.r*.66,R.r*.84,120),mat(R.biome==='reef'?0x6c6358:0xc9aa70,1));beach.rotation.x=-Math.PI/2;beach.position.y=.02;group.add(beach);
  const seed=idx*37+11;
  for(let i=0;i<38;i++){
    const a=(i*2.399+seed)*1.01,d=R.r*(.46+.17*Math.sin(i*1.73+seed)),x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(['resort','mangrove','lagoon','moon'].includes(R.biome))addPalm(group,x,z,.8+(i%5)*.08);
    if(i<18)addRock(group,x*.84,8,z*.84,.7+(i%4)*.25,R.biome==='volcano'||R.biome==='reef'?0x303836:0x4a5548);
  }
  if(R.biome==='city'){for(let i=0;i<34;i++){const a=i*.55,d=R.r*(.20+(i%7)*.055);addBuilding(group,Math.cos(a)*d,Math.sin(a)*d,18+(i%9)*8,12+(i%4)*5,i%3?0xaeb8b8:0xd2c7b6)}addPier(group,R.r*.7,0,Math.PI/2,170);addCargoShip(group,R.r*.95,40,.08)}
  if(R.biome==='resort'){for(let i=0;i<12;i++)addBuilding(group,-R.r*.35+i*28,R.r*.32+Math.sin(i)*20,14+(i%3)*5,18,0xd9d0c2);addPier(group,R.r*.7,-90,.1,130);addLighthouse(group,-R.r*.65,80)}
  if(R.biome==='volcano'){const cone=new THREE.Mesh(new THREE.ConeGeometry(R.r*.28,260,42,10),mat(0x4c4b42,1));cone.position.y=86;group.add(cone);const crater=new THREE.PointLight(0xff5d2e,45,480,2);crater.position.set(0,190,0);group.add(crater);addCaveArch(group,R.r*.48,-R.r*.08,1.25)}
  if(R.biome==='reef'){for(let i=0;i<16;i++)addRock(group,(Math.random()-.5)*R.r,4,(Math.random()-.5)*R.r,1.4+(i%4)*.4,0x242b2a);addCaveArch(group,R.r*.2,R.r*.47,1.5)}
  if(R.biome==='lagoon'){for(let i=0;i<7;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(18,2.2,10,36),new THREE.MeshStandardMaterial({color:0x7cf5ff,emissive:0x2ac7dd,emissiveIntensity:2,roughness:.2}));ring.position.set(-100+i*35,14+Math.sin(i)*8,120-i*28);ring.rotation.y=.2;group.add(ring)}}
  if(R.biome==='storm'){for(let i=0;i<7;i++){const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.2,3.5,55,9),mat(0x8c9697,.5,.45));tower.position.set(-180+i*60,27,R.r*.2+Math.sin(i)*40);group.add(tower)}}
  worldRoot.add(group);regionGroups.push({region:R,group});
}
REGIONS.forEach(createRegion);

export const route=new THREE.CatmullRomCurve3(ROUTE_POINTS.map(p=>new THREE.Vector3(p[0],0,p[1])),true,'catmullrom',.16);
const routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(900)),new THREE.LineBasicMaterial({color:0x76ecff,transparent:true,opacity:.11}));
routeLine.position.y=.28;scene.add(routeLine);

function hullGeometry(){
  const v=[],ix=[],rings=18;
  for(let j=0;j<rings;j++){
    const t=j/(rings-1),z=(t-.5)*7.4,k=Math.pow(Math.sin(Math.PI*t),.55),w=.24+1.28*k,h=.46+.28*k;
    v.push(-w,-.18,z,-w*.82,h,z,w*.82,h,z,w,-.18,z);
    const b=j*4;if(j<rings-1){const n=b+4;ix.push(b,b+1,n+1,b,n+1,n,b+1,b+2,n+2,b+1,n+2,n+1,b+2,b+3,n+3,b+2,n+3,n+2,b+3,b,n,b+3,n,n+3)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
export function craftModel(c,r,visual={},options={}){
  const detail=options.detail||'hero';
  const paint=new THREE.MeshPhysicalMaterial({color:visual.paint||c.color,metalness:.42,roughness:.15,clearcoat:1,clearcoatRoughness:.065,envMapIntensity:1.9});
  const dark=mat(0x101820,.36,.28),rubber=mat(0x0d1114,.76,.02),metal=mat(0x8fa2aa,.22,.72);
  const g=new THREE.Group();g.name=`${c.name}-${r.name}`;
  const suspension=new THREE.Group();suspension.name='craftSuspension';g.add(suspension);g.userData.suspension=suspension;
  const hull=new THREE.Mesh(hullGeometry(),paint);hull.castShadow=hull.receiveShadow=true;hull.scale.set(c.type==='STABLE'?1.12:c.type==='TOP SPEED'?.92:1,c.type==='WAVE'?1.08:1,c.type==='TOP SPEED'?1.08:1);suspension.add(hull);
  const keel=mesh(suspension,new THREE.BoxGeometry(.58,.34,5.9),dark,'keel',[0,-.22,.15],[1,1,1],[.02,0,0]);
  const deck=mesh(suspension,new THREE.BoxGeometry(1.68,.33,4.35),paint,'deck',[0,.54,.28],[1,1,1],[.02,0,0]);
  mesh(suspension,new THREE.BoxGeometry(.34,.28,4.9),rubber,'footwellL',[-.72,.52,.45],[1,1,1],[.02,0,.03]);mesh(suspension,new THREE.BoxGeometry(.34,.28,4.9),rubber,'footwellR',[.72,.52,.45],[1,1,1],[.02,0,-.03]);
  const rear=mesh(suspension,new THREE.BoxGeometry(1.9,.24,1.3),paint,'rearDeck',[0,.58,2.45]);
  const seat=mesh(suspension,new THREE.CapsuleGeometry(.48,1.35,6,12),rubber,'seat',[0,1.02,.65],[1,1,.82],[Math.PI/2,0,0]);
  const hood=mesh(suspension,new THREE.SphereGeometry(1.05,20,14),paint,'frontHood',[0,.74,-2.15],[.88,.55,1.38],[.08,0,0]);
  const consoleM=new THREE.MeshPhysicalMaterial({color:0x13232d,roughness:.11,metalness:.24,transmission:.18,transparent:true,opacity:.93,clearcoat:1});
  const console=mesh(suspension,new THREE.BoxGeometry(1.04,.84,.72),consoleM,'console',[0,1.43,-1.02],[1,1,1],[-.1,0,0]);
  const screen=mesh(suspension,new THREE.PlaneGeometry(.68,.34),new THREE.MeshBasicMaterial({color:0x6fe8ff}), 'dashScreen',[0,1.56,-1.39],[1,1,1],[-.2,0,0]);
  const bar=joint(suspension,'handlebar',[0,1.82,-1.08]);
  mesh(bar,new THREE.CylinderGeometry(.045,.045,1.28,10),metal,'bar',[0,0,0],[1,1,1],[0,0,Math.PI/2]);
  for(const side of[-1,1]){mesh(bar,new THREE.CylinderGeometry(.075,.075,.34,10),rubber,'grip'+side,[side*.73,0,0],[1,1,1],[0,0,Math.PI/2]);mesh(suspension,new THREE.BoxGeometry(.12,.2,.46),paint,'sideFairing'+side,[side*.93,.76,-1.62],[1,1,1],[0,side*.08,side*.05])}
  mesh(suspension,new THREE.CylinderGeometry(.18,.23,.52,12),metal,'jetNozzle',[0,-.02,3.68],[1,1,1],[Math.PI/2,0,0]);
  const stripeMat=matPhysical(r.accent,.24,.18,.75);for(const side of[-1,1])mesh(suspension,new THREE.BoxGeometry(.08,.07,4.2),stripeMat,'stripe'+side,[side*.83,.79,.15],[1,1,1],[.02,0,side*.05]);
  const rig=buildRiderRig(r,visual,{detail});suspension.add(rig);g.userData.riderRig=rig.userData.riderRig;g.userData.handlebar=bar;g.userData.detail=detail;g.userData.craft=c;g.userData.rider=r;
  return g;
}

export function animateCraftCharacter(craft,state){animateRiderRig(craft,state)}

export const itemBoxes=[];
const boxMat=new THREE.MeshStandardMaterial({color:0x72ecff,emissive:0x239fb5,emissiveIntensity:2,roughness:.22,metalness:.25});
for(let i=0;i<34;i++){
  const o=new THREE.Mesh(new THREE.OctahedronGeometry(3.8,0),boxMat.clone()),p=route.getPointAt((i+.5)/34),tan=route.getTangentAt((i+.5)/34),side=new THREE.Vector3(-tan.z,0,tan.x).multiplyScalar((i%3-1)*15);
  o.position.copy(p).add(side);o.position.y=5;o.userData={cool:0};scene.add(o);itemBoxes.push(o);
}

const cloudCanvas=document.createElement('canvas');cloudCanvas.width=128;cloudCanvas.height=64;
const cc=cloudCanvas.getContext('2d'),cg=cc.createRadialGradient(64,32,3,64,32,55);
cg.addColorStop(0,'rgba(255,255,255,.78)');cg.addColorStop(.45,'rgba(255,244,225,.42)');cg.addColorStop(1,'rgba(255,255,255,0)');
cc.fillStyle=cg;cc.fillRect(0,0,128,64);
const cloudTex=new THREE.CanvasTexture(cloudCanvas),cloudMat=new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,opacity:.48});
export const clouds=[];
for(let i=0;i<42;i++){const sp=new THREE.Sprite(cloudMat.clone());sp.position.set((Math.random()-.5)*6500,260+Math.random()*430,(Math.random()-.5)*6500);sp.scale.set(240+Math.random()*430,90+Math.random()*150,1);scene.add(sp);clouds.push(sp)}

export function resizeEngine(quality){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);configurePost(quality);
}
