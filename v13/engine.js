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
renderer.toneMappingExposure=1.08;
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
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),quality==='ultra'?.38:.26,.45,.92));
  composer.addPass(new SMAAPass(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio()));
  composer.addPass(new OutputPass());
}
configurePost();

scene.add(new THREE.HemisphereLight(0xffe0b2,0x0f3141,1.8));
export const sunLight=new THREE.DirectionalLight(0xffc37d,5.1);
sunLight.position.set(-420,520,-250);
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
sky.material.uniforms.turbidity.value=7.2;
sky.material.uniforms.rayleigh.value=1.5;
sky.material.uniforms.mieCoefficient.value=.005;
sky.material.uniforms.mieDirectionalG.value=.82;
export const sunDir=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(79),THREE.MathUtils.degToRad(236));
sky.material.uniforms.sunPosition.value.copy(sunDir);

const pmrem=new THREE.PMREMGenerator(renderer);
const envRT=pmrem.fromScene(scene,.04);
scene.environment=envRT.texture;

const waterNormals=new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping});
export const water=new Water(new THREE.PlaneGeometry(12000,12000),{
  textureWidth:1024,textureHeight:1024,waterNormals,sunDirection:sunDir,sunColor:0xffca8b,waterColor:0x073a54,distortionScale:3.4,fog:true
});
water.rotation.x=-Math.PI/2;
water.position.y=-.35;
scene.add(water);

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
export function craftModel(c,r,visual={}){
  const paint=new THREE.MeshPhysicalMaterial({color:visual.paint||c.color,metalness:.34,roughness:.17,clearcoat:1,clearcoatRoughness:.09,envMapIntensity:1.65});
  const g=new THREE.Group(),hull=new THREE.Mesh(hullGeometry(),paint);hull.castShadow=true;g.add(hull);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(1.65,.35,4.4),paint);deck.position.set(0,.52,.15);deck.castShadow=true;g.add(deck);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.05,.55,2.25),mat(0x11171c,.52));seat.position.set(0,1,.55);g.add(seat);
  const consoleM=new THREE.MeshPhysicalMaterial({color:0x17262f,roughness:.15,metalness:.22,transmission:.15,transparent:true,opacity:.92});
  const console=new THREE.Mesh(new THREE.BoxGeometry(1,.78,.65),consoleM);console.position.set(0,1.38,-1.05);g.add(console);
  const rg=new THREE.Group(),skin=mat(r.skin,.66),suit=mat(visual.suit||r.suit,.32,.14),accent=mat(visual.helmet||r.accent,.26,.22);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.48,1.15,6,12),suit);torso.position.y=2.25;torso.scale.set(...r.body);rg.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.43,20,14),skin);head.position.set(0,3.35,-.05);rg.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.51,20,14,0,Math.PI*2,0,Math.PI*.72),accent);helmet.position.set(0,3.43,-.05);rg.add(helmet);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(.65,.18,.06),new THREE.MeshPhysicalMaterial({color:0x0a1b26,roughness:.04,metalness:.05,transmission:.55,transparent:true,opacity:.75}));visor.position.set(0,3.45,-.48);rg.add(visor);
  for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.85,5,8),suit);arm.position.set(side*.57,2.5,-.42);arm.rotation.z=side*.52;arm.rotation.x=.75;rg.add(arm);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.9,5,8),suit);leg.position.set(side*.35,1.35,.75);leg.rotation.x=-.8;rg.add(leg)}
  g.add(rg);return g;
}

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
