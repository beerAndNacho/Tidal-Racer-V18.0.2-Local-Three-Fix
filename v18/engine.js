import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { REGIONS, ROUTE_POINTS } from '../data-v12.js';
import { buildRiderRig, animateRiderRig } from '../v16/character-system.js';
import { waveHeight, renderWaveHeight, waveCrestFactor } from '../v16/wave-model.js';
import { FISH_SPECIES } from './fishing-system.js';
import { COAST_PARKING_SPOTS, coastTrafficDecision, coastTrafficClearance, coastTrafficSignalDecision } from './city-traffic-system.js';

export { THREE };

const $=s=>document.querySelector(s);
const boot=(value,label,detail='')=>window.__tidalBoot?.report?.(value,label,detail);
const idle=(task,timeout=220)=>{
  if('requestIdleCallback' in window)return requestIdleCallback(task,{timeout});
  return setTimeout(()=>task({didTimeout:true,timeRemaining:()=>0}),16);
};
export const scene=new THREE.Scene();
scene.background=new THREE.Color(0x687f88);
scene.fog=new THREE.FogExp2(0x748890,.000055);
scene.environmentIntensity=.18;

export const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,11000);
export const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.86;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
$('#game').appendChild(renderer.domElement);
const maxAnisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()),textureCache=new Map(),localTextureLoader=new THREE.TextureLoader();
function localTexture(url,colorSpace=THREE.SRGBColorSpace){
  const texture=localTextureLoader.load(url,loaded=>{
    loaded.colorSpace=colorSpace;loaded.wrapS=loaded.wrapT=THREE.RepeatWrapping;loaded.anisotropy=maxAnisotropy;loaded.needsUpdate=true;
    const callbacks=loaded.userData.readyCallbacks?.splice(0)||[];for(const callback of callbacks)callback(loaded);
    window.__tidalBoot?.background?.('textures',`${url.split('/').pop()} ready`);
  });
  texture.userData.readyCallbacks=[];return texture;
}
function withTextureClone(source,repeat,apply,configure=()=>{}){
  const attach=ready=>{const image=ready?.source?.data||ready?.image;if(!image)return;const clone=new THREE.Texture(image);clone.name=`${ready.name||'local'}-instance`;clone.mapping=ready.mapping;clone.wrapS=clone.wrapT=THREE.RepeatWrapping;clone.magFilter=ready.magFilter;clone.minFilter=ready.minFilter;clone.format=ready.format;clone.type=ready.type;clone.flipY=ready.flipY;clone.colorSpace=ready.colorSpace;clone.repeat.set(...repeat);clone.anisotropy=maxAnisotropy;configure(clone);clone.needsUpdate=true;apply(clone)};
  if(source?.source?.data)attach(source);else source?.userData?.readyCallbacks?.push(attach);
}
boot(22,'renderer','WebGL renderer ready');

export const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const CinematicGradeShader={
  uniforms:{tDiffuse:{value:null},uStrength:{value:.86},uBoost:{value:0},uStorm:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float uStrength;uniform float uBoost;uniform float uStorm;varying vec2 vUv;
    void main(){
      vec3 c=texture2D(tDiffuse,vUv).rgb;
      float l=dot(c,vec3(.2126,.7152,.0722));
      c=mix(vec3(l),c,1.01+.035*uStrength);
      c=(c-.5)*(1.045+.042*uStrength)+.5;
      vec3 shadows=vec3(.925,.972,1.025),highlights=vec3(1.02,1.008,.982);
      c*=mix(shadows,highlights,smoothstep(.12,.86,l));
      c=mix(c,c*vec3(.78,.9,1.12),uStorm*.24);
      c=c/(1.+c*.115);
      c+=uBoost*vec3(.018,.036,.06);
      float edge=smoothstep(.34,.76,length(vUv-.5));
      c*=1.-edge*(.045+.025*uStrength);
      gl_FragColor=vec4(max(c,vec3(0.0)),1.0);
    }`,
};
let gtao=null,GTAOPassCtor=null,gtaoLoading=null,currentPostQuality='balanced',cinematicGradePass=null,raceGuideMaterial=null,routeMaterial=null,waterReflectionInterval=2;
export function configurePost(quality='balanced'){
  currentPostQuality=quality;waterReflectionInterval=quality==='ultra'?1:2;if(document?.body)document.body.dataset.waterReflectionRate=waterReflectionInterval===1?'full':'half';
  while(composer.passes.length>1)composer.removePass(composer.passes[composer.passes.length-1]);
  if(quality==='ultra'&&innerWidth>900){
    if(GTAOPassCtor){
      gtao=new GTAOPassCtor(scene,camera,innerWidth,innerHeight);
      gtao.updateGtaoMaterial({radius:quality==='ultra'?2.4:1.65,distanceExponent:1.35,thickness:quality==='ultra'?1.15:.82,distanceFallOff:1.35});composer.addPass(gtao);
    }else if(!gtaoLoading){
      gtaoLoading=import('three/addons/postprocessing/GTAOPass.js').then(({GTAOPass})=>{GTAOPassCtor=GTAOPass;gtaoLoading=null;if(currentPostQuality==='ultra')configurePost('ultra')});
    }
  }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),quality==='ultra'?.09:.045,.22,1.38));
  cinematicGradePass=new ShaderPass(CinematicGradeShader);cinematicGradePass.uniforms.uStrength.value=quality==='ultra'?1:.86;composer.addPass(cinematicGradePass);
  composer.addPass(new SMAAPass(innerWidth*renderer.getPixelRatio(),innerHeight*renderer.getPixelRatio()));
  composer.addPass(new OutputPass());
}
configurePost();
boot(29,'post','Balanced post-processing ready');

scene.add(new THREE.HemisphereLight(0xe9f1ef,0x26343b,.23));
scene.add(new THREE.AmbientLight(0x95a7a9,.012));
export const sunLight=new THREE.DirectionalLight(0xffd7af,2.72);
sunLight.position.set(-500,650,400);
sunLight.castShadow=true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.near=20;
sunLight.shadow.camera.far=1450;
sunLight.shadow.camera.left=-320;
sunLight.shadow.camera.right=320;
sunLight.shadow.camera.top=280;
sunLight.shadow.camera.bottom=-280;
sunLight.shadow.bias=-.00006;sunLight.shadow.normalBias=.018;
scene.add(sunLight,sunLight.target);
export const rimLight=new THREE.DirectionalLight(0x91aeb8,.31);rimLight.position.set(360,190,480);scene.add(rimLight);

export const sky=new Sky();
sky.scale.setScalar(10000);
scene.add(sky);
sky.material.uniforms.turbidity.value=3.6;
sky.material.uniforms.rayleigh.value=2.25;
sky.material.uniforms.mieCoefficient.value=.00038;
sky.material.uniforms.mieDirectionalG.value=.64;
export const sunDir=new THREE.Vector3().setFromSphericalCoords(1,THREE.MathUtils.degToRad(38),THREE.MathUtils.degToRad(18));
sky.material.uniforms.sunPosition.value.copy(sunDir);
export function updateSunFocus(centerX=0,centerZ=0){const x=Math.round(centerX/48)*48,z=Math.round(centerZ/48)*48;sunLight.target.position.set(x,0,z);sunLight.position.set(x+sunDir.x*920,sunDir.y*920,z+sunDir.z*920);sunLight.target.updateMatrixWorld();sunLight.shadow.camera.updateProjectionMatrix();document.body.dataset.shadowFocus='dynamic-640m-v2'}
updateSunFocus();
boot(33,'sky','Sky and lighting ready');

let environmentReady=false;
export function deferEnvironmentMap(){
  if(environmentReady)return;
  environmentReady=true;
  idle(()=>{
    const pmrem=new THREE.PMREMGenerator(renderer);
    const envScene=new THREE.Scene(),envSky=sky.clone();envScene.background=scene.background;envScene.add(envSky);
    const envRT=pmrem.fromScene(envScene,.035);
    scene.environment=envRT.texture;
    pmrem.dispose();
    window.__tidalBoot?.background?.('environment','Environment reflections ready');
  },800);
}

function createProceduralWaterNormals(size=512){
  const data=new Uint8Array(size*size*4),tau=Math.PI*2;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=tau*x/size,v=tau*y/size;
    const a=3*u+2*v,b=-2*u+5*v+.7,c=7*u-3*v+1.3,d=11*u+9*v+.2;
    const du=.52*3*Math.cos(a)+.31*-2*Math.cos(b)+.13*7*Math.cos(c)+.06*11*Math.cos(d);
    const dv=.52*2*Math.cos(a)+.31*5*Math.cos(b)+.13*-3*Math.cos(c)+.06*9*Math.cos(d);
    let nx=-du*.22,ny=-dv*.22,nz=1;const inv=1/Math.hypot(nx,ny,nz);nx*=inv;ny*=inv;nz*=inv;
    const i=(y*size+x)*4;data[i]=Math.round((nx*.5+.5)*255);data[i+1]=Math.round((ny*.5+.5)*255);data[i+2]=Math.round((nz*.5+.5)*255);data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.name='TidalProceduralWaterNormals';texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
  return texture;
}
const oceanMicroTexture=localTexture('./assets/textures/ocean-micro-height-v1.webp',THREE.NoColorSpace);
oceanMicroTexture.name='TidalOceanMicroHeight';oceanMicroTexture.colorSpace=THREE.NoColorSpace;oceanMicroTexture.wrapS=oceanMicroTexture.wrapT=THREE.RepeatWrapping;oceanMicroTexture.repeat.set(28,28);oceanMicroTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
const waterNormals=createProceduralWaterNormals();
const waterGeometry=new THREE.PlaneGeometry(3400,3400,210,210);
const waterBaseXY=new Float32Array(waterGeometry.attributes.position.count*2);
for(let i=0;i<waterGeometry.attributes.position.count;i++){waterBaseXY[i*2]=waterGeometry.attributes.position.getX(i);waterBaseXY[i*2+1]=waterGeometry.attributes.position.getY(i)}
export const water=new Water(waterGeometry,{textureWidth:1024,textureHeight:1024,waterNormals,sunDirection:sunDir,sunColor:0x9fbab8,waterColor:0x053c4b,distortionScale:1.05,size:1.08,alpha:.84,fog:true});
function upgradeWaterShader(material){
  material.uniforms.tidalShallowColor={value:new THREE.Color(0x0b7180)};material.uniforms.tidalDeepColor={value:new THREE.Color(0x032f43)};material.uniforms.tidalReflectionStrength={value:.68};material.uniforms.tidalAbsorption={value:.00175};
  material.fragmentShader=material.fragmentShader.replace('uniform vec3 waterColor;','uniform vec3 waterColor;\n\t\t\t\tuniform vec3 tidalShallowColor;\n\t\t\t\tuniform vec3 tidalDeepColor;\n\t\t\t\tuniform float tidalReflectionStrength;\n\t\t\t\tuniform float tidalAbsorption;').replace('sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );','sunLight( surfaceNormal, eyeDirection, 120.0, 1.12, 0.42, diffuseLight, specularLight );').replace(/float theta = max\( dot\( eyeDirection, surfaceNormal \), 0\.0 \);[\s\S]*?vec3 outgoingLight = albedo;/,`float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
                    float horizon = pow( 1.0 - theta, 3.25 );
                    float opticalDepth = clamp( distance * tidalAbsorption, 0.0, 1.0 );
                    float reflectance = mix( 0.045, 0.72, horizon ) * tidalReflectionStrength;
                    vec3 depthColor = mix( tidalShallowColor, tidalDeepColor, smoothstep( 0.04, 0.88, opticalDepth ) );
                    vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * mix( waterColor, depthColor, 0.72 );
                    vec3 refracted = ( sunColor * diffuseLight * 0.22 + scatter ) * getShadowMask();
                    vec3 reflected = reflectionSample * mix( 0.62, 0.82, horizon ) + specularLight * 0.58;
                    vec3 albedo = mix( refracted, reflected, clamp( reflectance, 0.0, 0.64 ) );
                    albedo += depthColor * ( 0.055 + opticalDepth * 0.08 );
                    vec3 outgoingLight = albedo;`);
  material.needsUpdate=true;water.userData.shaderTier='tidal-fresnel-absorption-v3';document.body.dataset.waterShader=water.userData.shaderTier;
}
upgradeWaterShader(water.material);
water.rotation.x=-Math.PI/2;water.position.y=-.42;water.frustumCulled=false;water.geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),3000);water.material.transparent=true;water.material.depthWrite=false;water.renderOrder=4;scene.add(water);
const nativeWaterBeforeRender=water.onBeforeRender;let waterReflectionFrame=0;
water.onBeforeRender=function(...args){waterReflectionFrame++;if(waterReflectionInterval>1&&waterReflectionFrame%waterReflectionInterval!==0)return;return nativeWaterBeforeRender.apply(this,args)};
const oceanDetailMaterial=new THREE.MeshBasicMaterial({color:0xdff4f3,alphaMap:oceanMicroTexture,transparent:true,opacity:.038,alphaTest:.7,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false});
const oceanSurfaceDetail=new THREE.Mesh(waterGeometry,oceanDetailMaterial);oceanSurfaceDetail.rotation.x=-Math.PI/2;oceanSurfaceDetail.position.y=-.35;oceanSurfaceDetail.frustumCulled=false;oceanSurfaceDetail.renderOrder=5;scene.add(oceanSurfaceDetail);
boot(41,'water','High-detail water tile ready');
const farOcean=new THREE.Mesh(new THREE.PlaneGeometry(14000,14000),new THREE.MeshPhysicalMaterial({color:0x07384d,roughness:.24,metalness:.06,clearcoat:.62,clearcoatRoughness:.16,envMapIntensity:1.05}));
farOcean.rotation.x=-Math.PI/2;farOcean.position.y=-2.4;farOcean.receiveShadow=true;scene.add(farOcean);
const foamCount=1800,foamPos=new Float32Array(foamCount*3),foamSeed=new Float32Array(foamCount*2);
for(let i=0;i<foamCount;i++){const angle=i*2.3999632297,radius=75+Math.sqrt((i+.5)/foamCount)*1450;foamSeed[i*2]=Math.cos(angle)*radius;foamSeed[i*2+1]=Math.sin(angle)*radius}
const foamGeometry=new THREE.BufferGeometry();foamGeometry.setAttribute('position',new THREE.BufferAttribute(foamPos,3));
const foamMaterial=new THREE.PointsMaterial({color:0xe8f8f6,size:1.45,transparent:true,opacity:.44,depthWrite:false,blending:THREE.NormalBlending,sizeAttenuation:true});
export const whitecaps=new THREE.Points(foamGeometry,foamMaterial);whitecaps.frustumCulled=false;scene.add(whitecaps);
let lastWaterUpdate=-1,lastFoamUpdate=-1;
export function updateWaterSurface(time,seaState=1,centerX=0,centerZ=0){
  if(time-lastWaterUpdate<1/30)return;lastWaterUpdate=time;
  const snappedX=Math.round(centerX/80)*80,snappedZ=Math.round(centerZ/80)*80;water.position.x=snappedX;water.position.z=snappedZ;oceanSurfaceDetail.position.x=snappedX;oceanSurfaceDetail.position.z=snappedZ;
  const pos=water.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){const lx=waterBaseXY[i*2],ly=waterBaseXY[i*2+1],wx=snappedX+lx,wz=snappedZ-ly;pos.setZ(i,renderWaveHeight(wx,wz,time,seaState))}
  pos.needsUpdate=true;if(water.material.uniforms.time)water.material.uniforms.time.value=time;if(water.material.uniforms.distortionScale)water.material.uniforms.distortionScale.value=.86+seaState*.34;
  oceanMicroTexture.offset.set((time*.0045)%1,(time*.0022)%1);oceanDetailMaterial.opacity=.025+Math.min(.035,seaState*.018);foamMaterial.opacity=.3+Math.min(.18,(seaState-.7)*.17);
  if(time-lastFoamUpdate>=1/12){
    lastFoamUpdate=time;
    for(let i=0;i<foamCount;i++){const ox=foamSeed[i*2],oz=foamSeed[i*2+1],wx=snappedX+ox,wz=snappedZ+oz,crest=waveCrestFactor(wx,wz,time,seaState),j=i*3;foamPos[j]=wx;foamPos[j+2]=wz;foamPos[j+1]=crest>.32?waveHeight(wx,wz,time,seaState)+.17:-30}
    foamGeometry.attributes.position.needsUpdate=true;
  }
}

export class AssetRegistry{
  constructor(){this.assets=new Map();this.loader=null;this.initializing=null;this.cache=new Map();this.cloneSkinned=null}
  async init(){
    if(this.initializing)return this.initializing;
    this.initializing=(async()=>{
      try{
        const r=await fetch('./assets/manifest.json',{cache:'no-store'});
        if(!r.ok)return;
        const list=(await r.json()).assets||[];list.forEach(a=>this.assets.set(a.id,a));
        if(!list.some(a=>a.enabled!==false&&a.url))return;
        const [{GLTFLoader},{DRACOLoader},{KTX2Loader},{MeshoptDecoder},{clone}]=await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),import('three/addons/loaders/DRACOLoader.js'),
          import('three/addons/loaders/KTX2Loader.js'),import('three/addons/libs/meshopt_decoder.module.js'),
          import('three/addons/utils/SkeletonUtils.js'),
        ]);
        const draco=new DRACOLoader(),ktx2=new KTX2Loader();
        draco.setDecoderPath(new URL('./vendor/three/examples/jsm/libs/draco/',document.baseURI).href);
        ktx2.setTranscoderPath(new URL('./vendor/three/examples/jsm/libs/basis/',document.baseURI).href);ktx2.detectSupport(renderer);
        this.loader=new GLTFLoader();this.loader.setDRACOLoader(draco);this.loader.setKTX2Loader(ktx2);this.loader.setMeshoptDecoder(MeshoptDecoder);this.cloneSkinned=clone;
      }catch(e){console.info('asset manifest fallback',e)}
    })();
    return this.initializing;
  }
  async spawn(id){
    await this.init();const a=this.assets.get(id);if(!a?.url||a.enabled===false||!this.loader)return null;
    try{let gltf=this.cache.get(id);if(!gltf){gltf=await this.loader.loadAsync(a.url);this.cache.set(id,gltf)}const obj=this.cloneSkinned?this.cloneSkinned(gltf.scene):gltf.scene.clone(true);obj.scale.setScalar(a.scale||1);obj.userData.gltfAnimations=gltf.animations||[];obj.userData.assetId=id;return obj}
    catch(e){console.warn('asset load failed',id,e);return null}
  }
}
export const assets=new AssetRegistry();
export function deferAssetManifest(){idle(()=>assets.init().then(()=>window.__tidalBoot?.background?.('assets','Asset manifest ready')),500)}

export const worldRoot=new THREE.Group();
scene.add(worldRoot);
export const regionGroups=[];
const authoredTextures={
  facade:localTexture('./assets/textures/coastal-facade-v1.webp'),
  facadePhotoreal:localTexture('./assets/textures/facade-coastal-photoreal-v4.png'),
  facadeModern:localTexture('./assets/textures/facade-harbor-modern-photoreal-v4.png'),
  facades:[
    localTexture('./assets/textures/facade-marina-mixed-use-v3.webp'),
    localTexture('./assets/textures/facade-marina-service-v3.webp'),
    localTexture('./assets/textures/facade-harbor-shops-v2.webp'),
    localTexture('./assets/textures/facade-coastal-apartments-v2.webp'),
    localTexture('./assets/textures/facade-marina-office-v2.webp'),
    localTexture('./assets/textures/facade-harbor-warehouse-v2.webp'),
  ],
  asphalt:localTexture('./assets/textures/polyhaven/asphalt_03_diff_1k.jpg'),
  concrete:localTexture('./assets/textures/polyhaven/anti_slip_concrete_diff_1k.jpg'),
  paving:localTexture('./assets/textures/coastal-paving-photoreal-v1.webp'),
  sand:localTexture('./assets/textures/polyhaven/aerial_beach_02_diff_1k.jpg'),
  neoprene:localTexture('./assets/textures/neoprene-suit-v1.webp'),
  fish:localTexture('./assets/textures/fish-scales-v1.webp'),
  fishBluewater:localTexture('./assets/textures/fish-skin-bluewater-v1.webp'),
  fishTropical:localTexture('./assets/textures/fish-skin-tropical-v1.webp'),
  fishReef:localTexture('./assets/textures/fish-skin-reef-v1.webp'),
};
const authoredPbr={
  asphalt:{map:authoredTextures.asphalt,normalMap:localTexture('./assets/textures/polyhaven/asphalt_03_nor_gl_1k.jpg',THREE.NoColorSpace),packedMap:localTexture('./assets/textures/polyhaven/asphalt_03_arm_1k.jpg',THREE.NoColorSpace),normalScale:.58},
  concrete:{map:authoredTextures.concrete,normalMap:localTexture('./assets/textures/polyhaven/anti_slip_concrete_nor_gl_1k.jpg',THREE.NoColorSpace),packedMap:localTexture('./assets/textures/polyhaven/anti_slip_concrete_arm_1k.jpg',THREE.NoColorSpace),normalScale:.48},
  sand:{map:authoredTextures.sand,normalMap:localTexture('./assets/textures/polyhaven/aerial_beach_02_nor_gl_1k.jpg',THREE.NoColorSpace),packedMap:localTexture('./assets/textures/polyhaven/aerial_beach_02_arm_1k.jpg',THREE.NoColorSpace),normalScale:.36},
};
authoredPbr.paving={map:authoredTextures.paving,normalMap:authoredPbr.concrete.normalMap,packedMap:authoredPbr.concrete.packedMap,normalScale:.38};
const shoreFoamMeshes=[];
function canvasTexture(key,paint,repeatX=1,repeatY=1){
  if(textureCache.has(key))return textureCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');paint(ctx,canvas);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=maxAnisotropy;texture.needsUpdate=true;textureCache.set(key,texture);return texture;
}
function seeded(seed){let value=seed>>>0;return()=>((value=Math.imul(value,1664525)+1013904223>>>0)/4294967296)}
function surfaceTexture(kind){if(authoredTextures[kind])return authoredTextures[kind];return canvasTexture(`surface-${kind}`,(ctx,canvas)=>{
  const rnd=seeded(kind==='asphalt'?811:kind==='concrete'?419:233),base=kind==='asphalt'?'#35383a':kind==='concrete'?'#aaa69d':'#8f806d';ctx.fillStyle=base;ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<3200;i++){const a=.018+rnd()*.055,v=kind==='asphalt'?30+Math.floor(rnd()*80):75+Math.floor(rnd()*90);ctx.fillStyle=`rgba(${v},${v},${v},${a})`;const s=.4+rnd()*2.2;ctx.fillRect(rnd()*512,rnd()*512,s,s)}
  ctx.strokeStyle=kind==='asphalt'?'rgba(13,16,17,.22)':'rgba(62,56,49,.16)';ctx.lineWidth=1.1;for(let i=0;i<14;i++){ctx.beginPath();let x=rnd()*512,y=rnd()*512;ctx.moveTo(x,y);for(let j=0;j<4;j++){x+=(rnd()-.5)*70;y+=(rnd()-.5)*70;ctx.lineTo(x,y)}ctx.stroke()}
  if(kind==='concrete'){ctx.strokeStyle='rgba(60,58,54,.2)';ctx.lineWidth=2;for(let i=0;i<512;i+=128){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,512);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(512,i);ctx.stroke()}}
},8,2)}
function facadeTexture(style=0){if(authoredTextures.facades?.length)return authoredTextures.facades[Math.abs(style)%authoredTextures.facades.length];if(authoredTextures.facade)return authoredTextures.facade;return canvasTexture(`facade-${style}`,(ctx,canvas)=>{
  const palettes=[['#b3ada0','#77746e','#202a2d'],['#979c99','#696d6a','#1d292d'],['#b6a38e','#79695b','#273035'],['#9caaa9','#657274','#1e292d']],p=palettes[style%palettes.length],rnd=seeded(1301+style*97);ctx.fillStyle=p[0];ctx.fillRect(0,0,512,512);
  const grime=ctx.createLinearGradient(0,0,0,512);grime.addColorStop(0,'rgba(255,255,255,.12)');grime.addColorStop(.7,'rgba(40,35,30,.02)');grime.addColorStop(1,'rgba(20,20,18,.16)');ctx.fillStyle=grime;ctx.fillRect(0,0,512,512);
  for(let floor=0;floor<5;floor++){const y=34+floor*94;ctx.fillStyle='rgba(42,42,38,.22)';ctx.fillRect(0,y+66,512,7);for(let col=0;col<6;col++){const x=24+col*82;ctx.fillStyle='#343c3e';ctx.fillRect(x,y,52,58);ctx.fillStyle=col%3===style%3?'#6f898e':'#53666a';ctx.fillRect(x+5,y+5,42,47);ctx.fillStyle='rgba(220,226,217,.32)';ctx.fillRect(x+25,y+5,2,47);if(rnd()>.68){ctx.fillStyle='rgba(231,218,181,.38)';ctx.fillRect(x+5,y+5,20,47)}}}
  for(let i=0;i<180;i++){const a=.018+rnd()*.04;ctx.fillStyle=`rgba(40,35,30,${a})`;ctx.fillRect(rnd()*512,rnd()*512,1+rnd()*3,1+rnd()*3)}
})}
function photorealFacadeMaterial(style=0,tint=0xffffff){
  const material=new THREE.MeshPhysicalMaterial({color:new THREE.Color(tint).lerp(new THREE.Color(0xffffff),.64),roughness:.78,metalness:.015,clearcoat:.08,clearcoatRoughness:.72,envMapIntensity:.38});
  const source=style%3===1?authoredTextures.facadeModern:authoredTextures.facadePhotoreal,repeatX=.76+(style%4)*.085,offsetX=((style*37)%100)/100;
  withTextureClone(source,[repeatX,1],map=>{material.map=map;material.needsUpdate=true},map=>map.offset.set(offsetX,0));
  withTextureClone(source,[repeatX,1],map=>{material.bumpMap=map;material.bumpScale=style%3===1?.045:.075;material.needsUpdate=true},map=>{map.offset.set(offsetX,0);map.colorSpace=THREE.NoColorSpace});
  return material;
}
function signTexture(label,bg='#314b50',fg='#f3e6c8'){
  const key=`sign-${label}-${bg}`;return canvasTexture(key,(ctx,canvas)=>{ctx.fillStyle=bg;ctx.fillRect(0,0,512,512);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=18;ctx.strokeRect(12,150,488,212);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${label.length>11?54:68}px "Segoe UI",sans-serif`;ctx.fillText(label,256,256,455)},1,1);
}
function texturedMaterial(kind,color,roughness=.82,metalness=.02,repeat=[1,1]){
  const pbr=authoredPbr[kind],material=new THREE.MeshStandardMaterial({color,roughness,metalness}),configure=map=>{if(kind==='paving')map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping};
  withTextureClone(pbr?.map||surfaceTexture(kind),repeat,map=>{material.map=map;material.needsUpdate=true},configure);
  if(pbr){
    material.normalScale=new THREE.Vector2(pbr.normalScale,pbr.normalScale);
    withTextureClone(pbr.normalMap,repeat,map=>{material.normalMap=map;material.needsUpdate=true},configure);
    withTextureClone(pbr.packedMap,repeat,map=>{material.roughnessMap=map;material.metalnessMap=map;material.needsUpdate=true},configure);
  }
  return material;
}
const mat=(color,rough=.8,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const matPhysical=(color,rough=.35,metal=.08,clear=.5)=>new THREE.MeshPhysicalMaterial({color,roughness:rough,metalness:metal,clearcoat:clear,clearcoatRoughness:.12,envMapIntensity:.82});
const silhouetteShadow=/^(?:hull|deck|rearDeck|seat|frontFairing|console|carBody|carCabin|boatHull|boatCabin|boatRoof|pedestrianTorso|pedestrianPelvis|pedestrianFace)$/;
function mesh(parent,geometry,material,name,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.rotation.set(...rot);o.castShadow=silhouetteShadow.test(name);o.receiveShadow=o.castShadow;parent.add(o);return o}
function batchStaticMeshes(root,label='static'){
  const buckets=new Map();for(const child of [...root.children]){if(!child.isMesh||child.isInstancedMesh||child.userData.noBatch||Array.isArray(child.material))continue;const attributes=Object.entries(child.geometry.attributes).map(([name,attribute])=>`${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`).sort().join('|'),morphs=Object.keys(child.geometry.morphAttributes||{}).sort().join('|'),key=`${child.material.uuid}|${attributes}|${morphs}`;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(child)}
  for(const meshes of buckets.values()){
    if(meshes.length<2)continue;const geometries=[];for(const source of meshes){source.updateMatrix();let geometry=source.geometry.clone();if(geometry.getIndex()){const nonIndexed=geometry.toNonIndexed();geometry.dispose();geometry=nonIndexed}geometry.setIndex(null);geometry.applyMatrix4(source.matrix);geometries.push(geometry)}
    const geometry=mergeGeometries(geometries,false);if(!geometry)continue;const combined=new THREE.Mesh(geometry,meshes[0].material);combined.name=`${label}-${meshes[0].material.type}`;combined.castShadow=meshes.some(item=>item.castShadow);combined.receiveShadow=meshes.some(item=>item.receiveShadow);root.add(combined);for(const source of meshes)root.remove(source);for(const item of geometries)item.dispose()
  }
}
function joint(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g}

function addRock(group,x,y,z,s=1,c=0x3a4945){
  const o=new THREE.Mesh(new THREE.DodecahedronGeometry(8*s,1),mat(c,.94));
  o.position.set(x,y,z);o.scale.y=.78+.32*Math.random();o.rotation.set(Math.random()*.25,Math.random(),Math.random()*.18);
  o.castShadow=o.receiveShadow=true;group.add(o);
}
function addPalm(group,x,z,s=1){
  const palm=new THREE.Group();palm.name='palm-batch';group.add(palm);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.35*s,.55*s,9*s,7),mat(0x704b2c,1));trunk.position.set(x,4.5*s,z);palm.add(trunk);
  const leafMat=mat(0x267347,1);for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.BoxGeometry(.35*s,.12*s,6*s),leafMat);leaf.position.set(x,9*s,z);leaf.rotation.y=i/6*Math.PI*2;leaf.rotation.x=.22;leaf.translateZ(2.3*s);palm.add(leaf)}batchStaticMeshes(palm,'palm-fronds');
}
function addBuilding(group,x,z,h=20,w=16,c=0xd3cec1,style=0){
  const buildingRoot=new THREE.Group();buildingRoot.name=`building-${style}`;group.add(buildingRoot);group=buildingRoot;
  const map=facadeTexture(style),facadeTint=new THREE.Color(c).lerp(new THREE.Color(0xffffff),.38);
  const wall=new THREE.MeshStandardMaterial({color:facadeTint,map,roughness:.72,metalness:.025,envMapIntensity:.34});
  const b=new THREE.Mesh(new RoundedBoxGeometry(w,h,w*1.15,3,.18),wall);b.position.set(x,h/2,z);b.castShadow=b.receiveShadow=true;group.add(b);
  const photoFacade=new THREE.Mesh(new THREE.PlaneGeometry(w*.985,h*.975,1,1),photorealFacadeMaterial(style,c));photoFacade.name='photorealFacadeV4';photoFacade.position.set(x,h*.502,z+w*.579);photoFacade.castShadow=false;photoFacade.receiveShadow=true;group.add(photoFacade);
  const ground=new THREE.Mesh(new RoundedBoxGeometry(w*1.015,4.1,w*1.175,3,.12),mat(style%2?0x343b3b:0x48433c,.7,.05));ground.position.set(x,2.05,z+.08);ground.castShadow=ground.receiveShadow=true;group.add(ground);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w*1.06,.55,w*1.21),texturedMaterial('concrete',0x716d65,.9,.01,[1,1]));roof.position.set(x,h+.28,z);roof.castShadow=roof.receiveShadow=true;group.add(roof);
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x1d333b,roughness:.13,metalness:.09,clearcoat:.62,clearcoatRoughness:.16,envMapIntensity:.74});
  for(const side of[-1,1]){const window=new THREE.Mesh(new THREE.PlaneGeometry(w*.31,2.25),glassMat);window.position.set(x+side*w*.25,2.25,z+w*.582);group.add(window)}
  const storefrontPanels=style%3===0?4:3;for(let col=0;col<storefrontPanels;col++){const panel=new THREE.Mesh(new THREE.PlaneGeometry(w*(style%3===0?.17:.22),2.55),glassMat);panel.position.set(x+(col-(storefrontPanels-1)/2)*w*.225,1.72,z+w*.591);group.add(panel)}
  const door=new THREE.Mesh(new THREE.PlaneGeometry(w*.095,2.8),glassMat);door.position.set(x+w*(style%2?.34:-.34),1.5,z+w*.599);group.add(door);
  const sideWindowGeo=new THREE.PlaneGeometry(w*.2,2.05);for(const side of[-1,1])for(let floor=0;floor<Math.min(4,Math.floor(h/8));floor++)for(let col=0;col<2;col++){const window=new THREE.Mesh(sideWindowGeo,glassMat);window.position.set(x+side*w*.503,6.6+floor*6.5,z+(col-.5)*w*.42);window.rotation.y=side*Math.PI/2;group.add(window)}
  const labels=['COAST MARKET','MARINA CAFE','OCEAN HOUSE','TIDAL GOODS','HARBOR DELI','SURF SUPPLY'],label=labels[Math.abs(style)%labels.length],sign=new THREE.Mesh(new THREE.PlaneGeometry(w*.72,2.1),new THREE.MeshBasicMaterial({map:signTexture(label,style%2?'#31535a':'#7d3f34'),toneMapped:false}));sign.position.set(x,4.05,z+w*.586);group.add(sign);
  const awning=new THREE.Mesh(new THREE.BoxGeometry(w*.86,.18,2.15),mat(style%2?0x496c67:0x805144,.72,.02));awning.position.set(x,3.28,z+w*.64);awning.rotation.x=-.16;awning.castShadow=true;group.add(awning);
  const unitMat=mat(0x7e827e,.83,.15);for(let i=0;i<(h>30?2:1);i++){const unit=new THREE.Mesh(new RoundedBoxGeometry(2.4,1.35,1.8,3,.12),unitMat);unit.position.set(x-w*.2+i*w*.4,h+1,z);unit.castShadow=true;group.add(unit);const grille=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.06,16),mat(0x343a3b,.62,.35));grille.position.set(unit.position.x,h+1,unit.position.z+.93);grille.rotation.x=Math.PI/2;group.add(grille)}
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,h*.86,8),mat(0x646a68,.5,.48));pipe.position.set(x+w*.46,h*.43,z+w*.585);pipe.castShadow=true;group.add(pipe);
  const roofTrim=mat(0x4f5859,.52,.34);for(const [px,pz,sx,sz] of [[x-w*.49,z-w*.57,.16,w*1.12],[x+w*.49,z-w*.57,.16,w*1.12],[x,z-w*.57,w*.98,.16],[x,z+w*.57,w*.98,.16]]){const parapet=new THREE.Mesh(new THREE.BoxGeometry(sx,.65,sz),roofTrim);parapet.position.set(px,h+.78,pz);parapet.castShadow=true;group.add(parapet)}
  if(style%3===0){const panelMat=new THREE.MeshPhysicalMaterial({color:0x17384b,roughness:.18,metalness:.34,clearcoat:.9});for(const side of[-1,1]){const panel=new THREE.Mesh(new RoundedBoxGeometry(w*.28,.12,w*.26,3,.035),panelMat);panel.position.set(x+side*w*.2,h+1.45,z);panel.rotation.x=-.18;panel.castShadow=true;group.add(panel)}}
  else if(style%3===1){const tank=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.7,3.1,18),mat(0x767f7c,.42,.46));tank.position.set(x-w*.18,h+2.1,z);tank.castShadow=true;group.add(tank);const cap=new THREE.Mesh(new THREE.ConeGeometry(1.58,.55,18),roofTrim);cap.position.set(tank.position.x,h+3.93,z);group.add(cap)}
  else{const stairhouse=new THREE.Mesh(new RoundedBoxGeometry(w*.24,3.4,w*.3,4,.12),texturedMaterial('concrete',0x787872,.86,.02,[1,1]));stairhouse.position.set(x+w*.18,h+2,z);stairhouse.castShadow=true;group.add(stairhouse);const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.055,.08,4.6,8),roofTrim);antenna.position.set(x+w*.18,h+5.8,z);group.add(antenna)}
  const slabMat=texturedMaterial('concrete',0x8d8981,.88,.01,[1,1]),balconyCount=Math.max(1,Math.min(4,Math.floor((h-5)/6.4)));
  for(let floor=0;floor<balconyCount;floor++){
    if((floor+style)%3===2)continue;
    const y=6.9+floor*6.35,span=w*(.68+((style+floor)%2)*.13),slab=new THREE.Mesh(new THREE.BoxGeometry(span,.2,1.45),slabMat);slab.name='photorealBalconySlab';slab.position.set(x+((style+floor)%2?-.06*w:.055*w),y,z+w*.65);slab.castShadow=slab.receiveShadow=true;group.add(slab);
    const railZ=z+w*.99,modernRail=style%3===1,balconyRailMat=modernRail?new THREE.MeshPhysicalMaterial({color:0x69808b,roughness:.12,metalness:.08,transmission:.12,transparent:true,opacity:.54,clearcoat:.92}):roofTrim,railGeometry=modernRail?new THREE.BoxGeometry(span*.92,.72,.035):new THREE.BoxGeometry(span*.96,.055,.055),rail=new THREE.Mesh(railGeometry,balconyRailMat);rail.position.set(slab.position.x,y+(modernRail?.43:.76),railZ);rail.castShadow=!modernRail;group.add(rail);
    const lowerRail=new THREE.Mesh(new THREE.BoxGeometry(span*.96,.038,.045),roofTrim);lowerRail.position.set(slab.position.x,y+.22,railZ);group.add(lowerRail);
    const posts=Math.max(4,Math.round(span/2.6));for(let post=0;post<=posts;post++){if(modernRail&&post>0&&post<posts&&post%2)continue;const upright=new THREE.Mesh(new THREE.BoxGeometry(modernRail?.052:.038,modernRail?.84:1.42,.04),roofTrim);upright.position.set(slab.position.x-span*.46+span*.92*(post/posts),y+(modernRail?.42:.06),railZ+.012);group.add(upright)}
  }
  batchStaticMeshes(buildingRoot,'facade-batch');
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
const regionalLandmarkAnimators=[];let regionalLandmarkCount=0;
function landmarkPart(parent,geometry,material,name,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0]){const part=new THREE.Mesh(geometry,material);part.name=name;part.position.set(...position);part.scale.set(...scale);part.rotation.set(...rotation);part.castShadow=part.receiveShadow=true;parent.add(part);regionalLandmarkCount++;return part}
function addRegionalIdentityLandmarks(root,R,idx){
  const startCount=regionalLandmarkCount,r=R.r,rock=mat(R.biome==='reef'?0x252b2d:R.biome==='volcano'?0x3b3735:0x59635d,.94,.015),metal=mat(0x667378,.46,.42),light=new THREE.MeshStandardMaterial({color:0xffd49a,emissive:0xf08a42,emissiveIntensity:1.8,roughness:.34}),waterfall=new THREE.MeshBasicMaterial({color:0x8de8ed,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});let identity=R.biome;
  if(R.biome==='resort'){
    identity='sail-hotel-and-beacon';const x=-r*.26,z=-r*.08,tower=landmarkPart(root,new THREE.CylinderGeometry(9,18,128,22),mat(0xc6c4bb,.72,.05),'resort-sail-tower',[x,64,z],[1,1,.55]),sail=landmarkPart(root,new THREE.ConeGeometry(58,142,3),new THREE.MeshPhysicalMaterial({color:0xd9e6e4,roughness:.28,metalness:.06,clearcoat:.72}),'resort-sail-crown',[x+24,118,z],[.58,1,.22],[0,0,-.2]);tower.castShadow=sail.castShadow=true;const halo=landmarkPart(root,new THREE.TorusGeometry(17,1.25,10,42),new THREE.MeshBasicMaterial({color:0xffd18a,toneMapped:false}),'resort-beacon-halo',[-r*.56,82,r*.12],[1,1,1],[Math.PI/2,0,0]);regionalLandmarkAnimators.push({type:'halo',node:halo,phase:idx});
  }else if(R.biome==='city'){
    identity='container-crane-skyline';for(let i=0;i<4;i++){const crane=new THREE.Group();crane.name=`harbor-gantry-crane-${i}`;crane.position.set(-r*.36+i*r*.22,0,r*.16+(i%2)*22);root.add(crane);landmarkPart(crane,new THREE.BoxGeometry(9,112,9),metal,'crane-tower',[0,56,0]);landmarkPart(crane,new THREE.BoxGeometry(84,6,7),metal,'crane-jib',[27,106,0]);landmarkPart(crane,new THREE.BoxGeometry(4,58,4),metal,'crane-cable',[38,74,0]);landmarkPart(crane,new THREE.BoxGeometry(23,5,10),mat(0xc18b36,.52,.28),'crane-spreader',[38,45,0])}for(let i=0;i<3;i++)landmarkPart(root,new RoundedBoxGeometry(42,150+i*28,42,5,2),mat([0x59686b,0x707976,0x505c64][i],.78,.06),`harbor-skyline-${i}`,[r*(.1+i*.12),(150+i*28)/2,-r*.14+i*18]);
  }else if(R.biome==='volcano'){
    identity='caldera-and-lava-scars';landmarkPart(root,new THREE.ConeGeometry(r*.31,330,54,12),rock,'volcano-caldera',[0,125,0]);const crater=landmarkPart(root,new THREE.TorusGeometry(r*.085,5.5,12,50),light,'volcano-crater',[0,286,0],[1,1,1],[Math.PI/2,0,0]);for(const side of[-1,1])landmarkPart(root,new THREE.BoxGeometry(8,3,210),new THREE.MeshBasicMaterial({color:0xff5c2d,toneMapped:false}),'volcano-lava-scar',[side*r*.055,148,-r*.12],[1,1,1],[.86,side*.16,side*.14]);for(let i=0;i<5;i++){const smoke=landmarkPart(root,new THREE.IcosahedronGeometry(22+i*5,2),new THREE.MeshStandardMaterial({color:0x54504d,transparent:true,opacity:.45,roughness:1,depthWrite:false}),`volcano-smoke-${i}`,[(i%2?1:-1)*i*6,330+i*33,(i%3-1)*9]);regionalLandmarkAnimators.push({type:'smoke',node:smoke,phase:i*.7+idx,baseX:smoke.position.x})}regionalLandmarkAnimators.push({type:'halo',node:crater,phase:idx});
  }else if(R.biome==='mangrove'){
    identity='giant-root-canopy';for(let i=0;i<5;i++){const a=-.8+i*.4,x=Math.sin(a)*r*.33,z=Math.cos(a)*r*.24,arch=landmarkPart(root,new THREE.TorusGeometry(46+i%2*8,7.5,10,28,Math.PI),mat(0x59452d,.96,.01),`mangrove-root-arch-${i}`,[x,14,z],[1,1,.7],[0,a,0]);landmarkPart(root,new THREE.CylinderGeometry(8,15,92,11),mat(0x58422d,.98),'mangrove-giant-trunk',[x,64,z],[1,1,1],[0,0,(i-2)*.045]);for(let crown=0;crown<3;crown++)landmarkPart(root,new THREE.IcosahedronGeometry(32-crown*3,2),mat(0x315b43,.96),`mangrove-canopy-${i}-${crown}`,[x+(crown-1)*25,116+(crown%2)*10,z+(crown%2?16:-12)],[1.25,.7,1])}
  }else if(R.biome==='storm'){
    identity='storm-wind-array';for(let i=0;i<5;i++){const turbine=new THREE.Group();turbine.name=`storm-turbine-${i}`;turbine.position.set(-r*.4+i*r*.2,0,r*.12+Math.sin(i)*45);root.add(turbine);landmarkPart(turbine,new THREE.CylinderGeometry(3.4,7.5,150,12),metal,'storm-turbine-tower',[0,75,0]);landmarkPart(turbine,new RoundedBoxGeometry(18,9,14,4,1.5),metal,'storm-turbine-nacelle',[0,151,0]);const rotor=new THREE.Group();rotor.name='storm-turbine-rotor';rotor.position.set(0,151,-8);rotor.rotation.y=Math.PI/2;turbine.add(rotor);landmarkPart(rotor,new THREE.SphereGeometry(5.5,14,10),metal,'storm-rotor-hub');for(let blade=0;blade<3;blade++){const bladeRoot=new THREE.Group();bladeRoot.rotation.z=blade*Math.PI*2/3;rotor.add(bladeRoot);landmarkPart(bladeRoot,new THREE.BoxGeometry(5,62,2.2),mat(0xb9c4c3,.58,.13),`storm-rotor-blade-${blade}`,[0,31,0])}regionalLandmarkAnimators.push({type:'rotor',node:rotor,phase:i*.5})}
  }else if(R.biome==='coral'){
    identity='giant-coral-crown';const colors=[0xd87c66,0xc5a355,0x579b8c,0x9676a9];for(let i=0;i<9;i++){const a=i/9*Math.PI*2,d=r*(.12+(i%3)*.08),h=90+(i%4)*28,x=Math.cos(a)*d,z=Math.sin(a)*d;landmarkPart(root,new THREE.ConeGeometry(13+(i%3)*5,h,7,3),mat(colors[i%colors.length],.74,.015),`coral-spire-${i}`,[x,h/2,z],[1,1,1],[(i%2?1:-1)*.08,0,(i%3-1)*.08]);if(i%2===0)landmarkPart(root,new THREE.TorusGeometry(20+i*1.5,4,8,24,Math.PI*1.45),mat(colors[(i+1)%colors.length],.72),`coral-fan-${i}`,[x,h*.58,z],[1,.75,.35],[0,a,.3])}
  }else if(R.biome==='moon'){
    identity='moon-gate-and-lantern-spire';const gate=landmarkPart(root,new THREE.TorusGeometry(72,9,14,52,Math.PI*1.7),mat(0x667389,.68,.08),'moon-crescent-gate',[0,84,-r*.1],[1,1,.42],[0,0,.47]);landmarkPart(root,new THREE.CylinderGeometry(12,22,138,18),mat(0x3f4855,.7,.12),'moon-lantern-spire',[r*.22,69,r*.06]);const lantern=landmarkPart(root,new THREE.SphereGeometry(14,20,14),new THREE.MeshStandardMaterial({color:0xffd89e,emissive:0xf09a49,emissiveIntensity:2.1,roughness:.3}),'moon-spire-lantern',[r*.22,147,r*.06]);regionalLandmarkAnimators.push({type:'halo',node:gate,phase:idx},{type:'pulse',node:lantern,phase:idx});
  }else if(R.biome==='reef'){
    identity='obsidian-needle-field';for(let i=0;i<12;i++){const a=i/12*Math.PI*2,d=r*(.12+(i%4)*.075),h=75+(i%5)*34;landmarkPart(root,new THREE.ConeGeometry(10+(i%3)*5,h,5,2),rock,`black-reef-needle-${i}`,[Math.cos(a)*d,h/2-5,Math.sin(a)*d],[1,1,1],[(i%3-1)*.1,a,(i%2?1:-1)*.13])}landmarkPart(root,new THREE.TorusGeometry(58,11,9,32,Math.PI),rock,'black-reef-arch',[r*.19,18,r*.12],[1,1,.55],[0,.35,0]);
  }else if(R.biome==='lagoon'){
    identity='limestone-gate-waterfall';for(const side of[-1,1])landmarkPart(root,new THREE.ConeGeometry(34,172,13,5),mat(0x697a6f,.93,.01),`lagoon-limestone-pillar-${side}`,[side*72,78,-r*.08],[1,1,.82],[0,0,side*.08]);landmarkPart(root,new THREE.TorusGeometry(72,14,12,42,Math.PI),mat(0x66796e,.93),'lagoon-stone-gate',[0,112,-r*.08],[1,1,.6],[0,0,0]);const fall=landmarkPart(root,new THREE.PlaneGeometry(38,112,4,10),waterfall,'lagoon-waterfall',[0,56,-r*.075],[1,1,1],[0,0,0]);regionalLandmarkAnimators.push({type:'waterfall',node:fall,phase:idx});
  }
  root.userData.identity=identity;root.userData.landmarkCount=regionalLandmarkCount-startCount;document.body.dataset.regionalLandmarkTier='nine-biome-distant-silhouettes-v1';document.body.dataset.regionalLandmarkParts=String(regionalLandmarkCount);return identity;
}
const COASTLINE_CHARACTER=Object.freeze({resort:[.035,.018,.012],city:[.052,.025,.014],volcano:[.09,.048,.022],mangrove:[.125,.07,.034],storm:[.075,.045,.024],coral:[.1,.058,.03],moon:[.11,.064,.036],reef:[.14,.075,.042],lagoon:[.115,.062,.032]});
function coastlineRadiusFactor(biome,angle,idx=0){const [a,b,c]=COASTLINE_CHARACTER[biome]||COASTLINE_CHARACTER.resort,phase=idx*.73;return THREE.MathUtils.clamp(1+Math.sin(angle*3+phase)*a+Math.cos(angle*5-phase*.63)*b+Math.sin(angle*8+phase*1.41)*c,.79,1.17)}
function sculptCoastlineGeometry(geometry,R,idx,axes='xy'){const position=geometry.attributes.position;for(let i=0;i<position.count;i++){const x=position.getX(i),second=axes==='xy'?position.getY(i):position.getZ(i),angle=Math.atan2(second,x),factor=coastlineRadiusFactor(R.biome,angle,idx);position.setX(i,x*factor);if(axes==='xy')position.setY(i,second*factor);else position.setZ(i,second*factor)}position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry}
function addResortPromenade(group,r){
  const promenade=new THREE.Group();promenade.name='promenade-batch';group.add(promenade);group=promenade;
  const deckMaterial=new THREE.MeshStandardMaterial({color:0xb8b0a2,roughness:.88,metalness:.01});withTextureClone(surfaceTexture('concrete'),[16,16],map=>{deckMaterial.map=map;deckMaterial.needsUpdate=true});const deck=new THREE.Mesh(new THREE.RingGeometry(r*.39,r*.435,112),deckMaterial);deck.rotation.x=-Math.PI/2;deck.position.y=.38;deck.receiveShadow=true;group.add(deck);
  const poleGeo=new THREE.CylinderGeometry(.16,.22,4.4,10),lampGeo=new THREE.SphereGeometry(.38,14,10),poleMat=mat(0x283238,.3,.58),lampMat=new THREE.MeshStandardMaterial({color:0xe6dcc8,emissive:0xc79d63,emissiveIntensity:.22,roughness:.3});
  for(let i=0;i<18;i++){const a=i/18*Math.PI*2,d=r*.415,x=Math.cos(a)*d,z=Math.sin(a)*d,pole=new THREE.Mesh(poleGeo,poleMat),lamp=new THREE.Mesh(lampGeo,lampMat);pole.position.set(x,2.25,z);lamp.position.set(x,4.65,z);group.add(pole,lamp)}
  const accent=new THREE.Mesh(new THREE.TorusGeometry(r*.49,.38,7,128),new THREE.MeshStandardMaterial({color:0x637c7d,roughness:.72,metalness:.18,transparent:true,opacity:.64}));accent.rotation.x=Math.PI/2;accent.position.y=.48;group.add(accent);batchStaticMeshes(promenade,'promenade-fixtures');
}
function addStreetTree(group,x,z,s=1){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.22*s,.34*s,5.8*s,10),mat(0x5d4a38,.96));trunk.position.set(x,3*s,z);trunk.castShadow=true;group.add(trunk);
  const crownMat=mat(0x3f6247,.9),crown=new THREE.Group();for(const [ox,oy,oz,k] of [[0,0,0,1.2],[-1.1,.2,.1,.8],[1,.35,-.2,.9],[.15,.65,.8,.72]]){const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(2.3*s*k,2),crownMat);leaf.position.set(x+ox*s,6.7*s+oy*s,z+oz*s);leaf.castShadow=true;crown.add(leaf)}batchStaticMeshes(crown,'tree-crown');group.add(crown);
}
function addBench(group,x,z,rot=0){
  const wood=mat(0x72563e,.82,.02),steel=mat(0x343a3c,.38,.62),bench=new THREE.Group();bench.position.set(x,.55,z);bench.rotation.y=rot;
  for(const y of[.25,1.05]){const slat=new THREE.Mesh(new RoundedBoxGeometry(4.2,.22,.62,3,.08),wood);slat.position.y=y;slat.position.z=y>.5?.34:0;slat.castShadow=true;bench.add(slat)}
  for(const side of[-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,1.1,.9),steel);leg.position.set(side*1.55,.12,0);bench.add(leg)}batchStaticMeshes(bench,'bench-batch');group.add(bench);
}
let coastalStreetSurface=null;
function addCoastalStreetDetails(group,centerX,roadZ){
  const root=new THREE.Group();root.name='coastal-street-detail-v5';group.add(root);const dummy=new THREE.Object3D();
  const bollards=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.24,1.35,10),mat(0x343d40,.32,.66),18);bollards.name='quayside-bollards';for(let i=0;i<18;i++){dummy.position.set(centerX-245+i*28.8,1.46,roadZ+25.2);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();bollards.setMatrixAt(i,dummy.matrix)}bollards.castShadow=true;root.add(bollards);
  const drains=new THREE.InstancedMesh(new THREE.BoxGeometry(3.1,.055,.7),mat(0x242b2d,.48,.58),14);drains.name='storm-drains';for(let i=0;i<14;i++){dummy.position.set(centerX-225+i*34.6,.91,roadZ+(i%2?18.35:-18.35));dummy.updateMatrix();drains.setMatrixAt(i,dummy.matrix)}root.add(drains);
  const crossingMat=new THREE.MeshBasicMaterial({color:0xe5dfcf,toneMapped:false}),crossings=new THREE.InstancedMesh(new THREE.BoxGeometry(5.4,.028,1.05),crossingMat,20);crossings.name='pedestrian-crossings';for(let crossing=0;crossing<2;crossing++)for(let stripe=0;stripe<10;stripe++){const i=crossing*10+stripe;dummy.position.set(centerX+(crossing?178:-178),.805,roadZ-14.5+stripe*3.2);dummy.updateMatrix();crossings.setMatrixAt(i,dummy.matrix)}root.add(crossings);
  const parkingLines=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,.025,6.4),new THREE.MeshBasicMaterial({color:0xb9b6a9,toneMapped:false}),16);parkingLines.name='parking-bay-lines';for(let i=0;i<16;i++){dummy.position.set(centerX-224+i*30,.803,roadZ+(i%2?13.8:-13.8));dummy.updateMatrix();parkingLines.setMatrixAt(i,dummy.matrix)}root.add(parkingLines);
  const roadPatchMat=new THREE.MeshPhysicalMaterial({color:0x252b2e,roughness:.91,metalness:.025,clearcoat:.08,clearcoatRoughness:.7}),roadPatches=new THREE.InstancedMesh(new RoundedBoxGeometry(7,.035,3.2,2,.16),roadPatchMat,14);roadPatches.name='asphalt-repair-patches';for(let i=0;i<14;i++){dummy.position.set(centerX-224+i*34.2,.792,roadZ+((i*7)%5-2)*3.1);dummy.rotation.set(0,((i%3)-1)*.045,0);dummy.scale.set(.72+(i%4)*.14,1,.58+(i%5)*.09);dummy.updateMatrix();roadPatches.setMatrixAt(i,dummy.matrix)}roadPatches.receiveShadow=true;root.add(roadPatches);
  const manholeMat=new THREE.MeshStandardMaterial({color:0x333a3d,roughness:.48,metalness:.58}),manholes=new THREE.InstancedMesh(new THREE.CylinderGeometry(.72,.72,.045,24),manholeMat,8);manholes.name='road-manhole-covers';for(let i=0;i<8;i++){dummy.position.set(centerX-196+i*56,.82,roadZ+(i%2?7.1:-6.6));dummy.rotation.set(0,i*.37,0);dummy.scale.set(1,1,1);dummy.updateMatrix();manholes.setMatrixAt(i,dummy.matrix)}manholes.receiveShadow=true;root.add(manholes);
  const puddleMat=new THREE.MeshPhysicalMaterial({color:0x20343b,roughness:.09,metalness:.04,clearcoat:1,clearcoatRoughness:.04,transparent:true,opacity:.015,depthWrite:false}),puddles=new THREE.InstancedMesh(new THREE.CircleGeometry(1,24),puddleMat,9),puddlePoints=[];puddles.name='road-rain-puddles';for(let i=0;i<9;i++){const x=centerX-208+i*51,z=roadZ+((i*11)%7-3)*2.35;puddlePoints.push({x,z,sx:1.8+(i%3)*.7,sz:.68+(i%4)*.16});dummy.position.set(x,.825,z);dummy.rotation.set(-Math.PI/2,0,i*.51);dummy.scale.set(puddlePoints[i].sx,puddlePoints[i].sz,1);dummy.updateMatrix();puddles.setMatrixAt(i,dummy.matrix)}puddles.renderOrder=3;root.add(puddles);
  const rippleMaterial=new THREE.MeshBasicMaterial({color:0xbce4ea,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),ripples=new THREE.InstancedMesh(new THREE.RingGeometry(.34,.39,20),rippleMaterial,18),rippleSeeds=[];ripples.name='street-rain-ripple-rings';for(let i=0;i<18;i++){const puddle=puddlePoints[i%puddlePoints.length],seed={x:puddle.x+((i*17)%9-4)*.18,z:puddle.z+((i*23)%7-3)*.13,phase:(i*.417)%1};rippleSeeds.push(seed);dummy.position.set(seed.x,.842,seed.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(.01,.01,.01);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix)}ripples.visible=false;ripples.renderOrder=4;root.add(ripples);
  const crackMat=new THREE.MeshBasicMaterial({color:0x171b1d,toneMapped:false}),cracks=new THREE.InstancedMesh(new THREE.BoxGeometry(4.8,.018,.045),crackMat,18);cracks.name='asphalt-crack-lines';for(let i=0;i<18;i++){dummy.position.set(centerX-238+i*27.4,.823,roadZ+((i*13)%11-5)*2.3);dummy.rotation.set(0,(i%5-2)*.21,0);dummy.scale.set(.65+(i%4)*.16,1,1);dummy.updateMatrix();cracks.setMatrixAt(i,dummy.matrix)}root.add(cracks);
  const planterMat=mat(0x6d716b,.86,.04),greenMat=mat(0x42664c,.9),planters=new THREE.InstancedMesh(new RoundedBoxGeometry(2.2,1.05,2.2,3,.16),planterMat,8),shrubs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.24,1),greenMat,8);planters.name='street-planters';shrubs.name='street-shrubs';for(let i=0;i<8;i++){const x=centerX-210+i*60,z=roadZ-27;dummy.position.set(x,1.32,z);dummy.scale.set(1,1,1);dummy.updateMatrix();planters.setMatrixAt(i,dummy.matrix);dummy.position.set(x,2.35,z);dummy.scale.set(1,.72,1);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix)}planters.castShadow=shrubs.castShadow=true;root.add(planters,shrubs);
  const tableMat=mat(0x6e523d,.72,.08),canvasMat=new THREE.MeshStandardMaterial({color:0xd7c6a6,roughness:.66,metalness:.01,side:THREE.DoubleSide}),tables=new THREE.InstancedMesh(new THREE.CylinderGeometry(1.2,1.2,.14,20),tableMat,6),umbrellas=new THREE.InstancedMesh(new THREE.ConeGeometry(2.1,.55,18),canvasMat,6);tables.name='marina-cafe-tables';umbrellas.name='marina-cafe-umbrellas';for(let i=0;i<6;i++){const x=centerX-160+i*64,z=roadZ+24.5;dummy.position.set(x,1.5,z);dummy.scale.set(1,1,1);dummy.updateMatrix();tables.setMatrixAt(i,dummy.matrix);dummy.position.set(x,3.65,z);dummy.rotation.set(Math.PI,0,0);dummy.updateMatrix();umbrellas.setMatrixAt(i,dummy.matrix)}tables.castShadow=umbrellas.castShadow=true;root.add(tables,umbrellas);
  const binMat=mat(0x344247,.62,.28),bins=new THREE.InstancedMesh(new RoundedBoxGeometry(1.05,1.62,.9,4,.12),binMat,7);bins.name='street-litter-bins';for(let i=0;i<7;i++){dummy.position.set(centerX-204+i*68,1.62,roadZ+(i%2?26.4:-26.2));dummy.rotation.set(0,i%2?Math.PI:0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();bins.setMatrixAt(i,dummy.matrix)}bins.castShadow=true;root.add(bins);
  const hydrantMat=mat(0x9b332d,.44,.36),hydrants=new THREE.InstancedMesh(new THREE.CylinderGeometry(.27,.34,1.15,12),hydrantMat,4),hydrantCaps=new THREE.InstancedMesh(new THREE.SphereGeometry(.31,12,8),hydrantMat,4);hydrants.name='street-fire-hydrants';hydrantCaps.name='hydrant-domes';for(let i=0;i<4;i++){const x=centerX-170+i*112,z=roadZ-25.7;dummy.position.set(x,1.43,z);dummy.rotation.set(0,0,0);dummy.updateMatrix();hydrants.setMatrixAt(i,dummy.matrix);dummy.position.set(x,2.02,z);dummy.scale.set(1,.52,1);dummy.updateMatrix();hydrantCaps.setMatrixAt(i,dummy.matrix)}hydrants.castShadow=hydrantCaps.castShadow=true;root.add(hydrants,hydrantCaps);
  const cabinetMat=mat(0x727b73,.72,.15),cabinets=new THREE.InstancedMesh(new RoundedBoxGeometry(1.25,2.05,.68,3,.08),cabinetMat,5);cabinets.name='street-utility-cabinets';for(let i=0;i<5;i++){dummy.position.set(centerX-192+i*96,1.84,roadZ+27.2);dummy.rotation.set(0,Math.PI,0);dummy.scale.set(1,1,1);dummy.updateMatrix();cabinets.setMatrixAt(i,dummy.matrix)}cabinets.castShadow=true;root.add(cabinets);
  const rackMat=mat(0x69777b,.3,.64),racks=new THREE.InstancedMesh(new THREE.TorusGeometry(.58,.055,8,18,Math.PI),rackMat,8);racks.name='promenade-bike-racks';for(let i=0;i<8;i++){dummy.position.set(centerX-175+i*50,1.28,roadZ-26.9);dummy.rotation.set(0,i%2?Math.PI:0,Math.PI/2);dummy.scale.set(1,1,1);dummy.updateMatrix();racks.setMatrixAt(i,dummy.matrix)}racks.castShadow=true;root.add(racks);
  const coneMat=mat(0xd86e2f,.58,.04),cones=new THREE.InstancedMesh(new THREE.ConeGeometry(.34,1.05,12),coneMat,10);cones.name='road-safety-cones';for(let i=0;i<10;i++){dummy.position.set(centerX-62+i*2.7,1.34,roadZ+10.6+i*.38);dummy.rotation.set(0,i*.21,(i%3-1)*.035);dummy.scale.set(1,1,1);dummy.updateMatrix();cones.setMatrixAt(i,dummy.matrix)}cones.castShadow=true;root.add(cones);
  coastalStreetSurface={centerX,roadZ,root,puddles,puddleMaterial:puddleMat,puddlePoints,ripples,rippleMaterial,rippleSeeds,roadPatchMaterial:roadPatchMat,manholeMaterial:manholeMat,roadMaterial:null,dryRoadColor:new THREE.Color(0x626466),wetRoadColor:new THREE.Color(0x303b40),dummy:new THREE.Object3D(),wetness:0};document.body.dataset.streetDetail='quayside-v7-weather-reactive-surface';
}
export function updateCoastalStreetSurface(time,{dt=1/60,wetness=0,rain=0,player=null}={}){
  const state=coastalStreetSurface;if(!state)return{visible:false,wetness:0,ripples:0};const surfaceWetness=clamp(Number(wetness)||0,0,1),rainfall=clamp(Number(rain)||0,0,1),near=!player||Math.hypot((player.x||0)-state.centerX,(player.z||0)-state.roadZ)<285,blend=1-Math.exp(-.9*Math.max(0,Number(dt)||0));state.wetness=lerp(state.wetness,surfaceWetness,blend);const puddleStrength=clamp((state.wetness-.12)/.7,0,1);state.puddles.visible=near&&puddleStrength>.015;state.puddleMaterial.opacity=.015+puddleStrength*.5;state.roadPatchMaterial.roughness=.91-state.wetness*.2;state.manholeMaterial.roughness=.48-state.wetness*.2;if(state.roadMaterial){state.roadMaterial.roughness=.96-state.wetness*.3;state.roadMaterial.color.lerpColors(state.dryRoadColor,state.wetRoadColor,state.wetness*.72)}const rippleStrength=clamp((rainfall-.12)/.75,0,1)*puddleStrength;state.ripples.visible=near&&rippleStrength>.025;state.rippleMaterial.opacity=rippleStrength*.46;let activeRipples=0;if(state.ripples.visible){for(let index=0;index<state.rippleSeeds.length;index++){const seed=state.rippleSeeds[index],phase=(time*(.68+(index%4)*.09)+seed.phase)%1,scale=.14+phase*1.35;state.dummy.position.set(seed.x,.842,seed.z);state.dummy.rotation.set(-Math.PI/2,0,index*.31);state.dummy.scale.set(scale,scale,1);state.dummy.updateMatrix();state.ripples.setMatrixAt(index,state.dummy.matrix);if(phase<.78)activeRipples++}state.ripples.instanceMatrix.needsUpdate=true}document.body.dataset.citySurfaceWetness=state.wetness.toFixed(2);document.body.dataset.cityPuddleOpacity=state.puddleMaterial.opacity.toFixed(2);document.body.dataset.cityRainRipples=String(activeRipples);return{visible:near,wetness:state.wetness,puddles:state.puddles.visible?state.puddlePoints.length:0,ripples:activeRipples};
}
function addHarborCityInfrastructure(group,r){
  const root=new THREE.Group();root.name='harbor-city-infrastructure-v4';group.add(root);const dummy=new THREE.Object3D(),asphalt=texturedMaterial('asphalt',0x51585c,.95,.02,[8,1]),concrete=texturedMaterial('concrete',0x989994,.91,.02,[10,1]);
  const eastWest=new THREE.Mesh(new THREE.BoxGeometry(r*1.18,.52,34),asphalt),northSouth=new THREE.Mesh(new THREE.BoxGeometry(34,.52,r*.92),asphalt);eastWest.position.y=northSouth.position.y=.42;eastWest.receiveShadow=northSouth.receiveShadow=true;root.add(eastWest,northSouth);
  eastWest.name='harbor-east-west-road';northSouth.name='harbor-north-south-road';
  for(const z of[-22,22]){const walk=new THREE.Mesh(new THREE.BoxGeometry(r*1.2,.44,10),concrete);walk.position.set(0,.68,z);walk.receiveShadow=true;root.add(walk)}for(const x of[-22,22]){const walk=new THREE.Mesh(new THREE.BoxGeometry(10,.44,r*.94),concrete);walk.position.set(x,.68,0);walk.receiveShadow=true;root.add(walk)}
  const containers=new THREE.InstancedMesh(new RoundedBoxGeometry(13,5.1,27,3,.14),mat(0xffffff,.66,.12),18);containers.name='harbor-container-yard';const containerColors=[0xa4483d,0x315f78,0x9a7a38,0x46675d];for(let i=0;i<18;i++){const row=Math.floor(i/6),col=i%6;dummy.position.set(-r*.34+col*15.5,3.2+row%2*5.3,r*.29+row*29);dummy.rotation.set(0,(row%2)*Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();containers.setMatrixAt(i,dummy.matrix);containers.setColorAt(i,new THREE.Color(containerColors[(i+row)%containerColors.length]))}containers.castShadow=containers.receiveShadow=true;containers.instanceMatrix.needsUpdate=true;containers.instanceColor.needsUpdate=true;root.add(containers);
  const craneMat=mat(0xb89b50,.42,.52);for(let i=0;i<3;i++){const crane=new THREE.Group();crane.name=`gantry-crane-${i}`;const x=r*.29+i*54-r*.08,z=r*.38;mesh(crane,new THREE.BoxGeometry(3,36,3),craneMat,'craneTowerL',[x-14,18,z]);mesh(crane,new THREE.BoxGeometry(3,36,3),craneMat,'craneTowerR',[x+14,18,z]);mesh(crane,new THREE.BoxGeometry(42,2.6,3),craneMat,'craneBoom',[x,35,z]);mesh(crane,new THREE.BoxGeometry(2,19,2),craneMat,'craneCable',[x+8,25,z]);batchStaticMeshes(crane,'harbor-crane-batch');root.add(crane)}
  const dockLights=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.18,8.5,8),mat(0x394448,.38,.58),12);dockLights.name='harbor-dock-lights';for(let i=0;i<12;i++){dummy.position.set(-r*.42+i*r*.076,4.85,r*.42);dummy.rotation.set(0,0,0);dummy.updateMatrix();dockLights.setMatrixAt(i,dummy.matrix)}dockLights.castShadow=true;root.add(dockLights);batchStaticMeshes(root,'harbor-road-batch');document.body.dataset.harborDetail='container-yard-roads-cranes-v4';
}
function addMangroveWetland(group,r){
  const root=new THREE.Group();root.name='mangrove-wetland-v4';group.add(root);const dummy=new THREE.Object3D(),wood=mat(0x6b4b33,.94,.01);for(let i=0;i<4;i++){const boardwalk=new THREE.Mesh(new THREE.BoxGeometry(10,.58,r*.31),wood);boardwalk.position.set(-r*.2+i*r*.13,1.1,-r*.02+i*18);boardwalk.rotation.y=(i-1.5)*.19;boardwalk.receiveShadow=boardwalk.castShadow=true;root.add(boardwalk)}
  const roots=new THREE.InstancedMesh(new THREE.CylinderGeometry(.13,.34,7.5,7),mat(0x58402f,.98),42);roots.name='mangrove-aerial-roots';const rnd=seeded(7719);for(let i=0;i<42;i++){const a=rnd()*Math.PI*2,d=r*(.18+rnd()*.42);dummy.position.set(Math.cos(a)*d,2.7,Math.sin(a)*d);dummy.rotation.set((rnd()-.5)*.5,a,(rnd()-.5)*.5);dummy.scale.set(.72+rnd()*.65,.7+rnd()*.5,.72+rnd()*.65);dummy.updateMatrix();roots.setMatrixAt(i,dummy.matrix)}roots.castShadow=true;root.add(roots);batchStaticMeshes(root,'mangrove-boardwalk-batch');document.body.dataset.mangroveDetail='boardwalk-aerial-roots-v4';
}
function addCoralGarden(group,r){
  const root=new THREE.Group();root.name='coral-garden-v4';group.add(root);const dummy=new THREE.Object3D(),corals=new THREE.InstancedMesh(new THREE.ConeGeometry(1.4,7.5,7,2),mat(0xffffff,.72,.01),36),colors=[0xd67c68,0xc49a61,0x6c9f91,0x9b77a5];corals.name='coral-landmark-field';for(let i=0;i<36;i++){const a=i/36*Math.PI*2,d=r*(.53+(i%5)*.028);dummy.position.set(Math.cos(a)*d,1.2,Math.sin(a)*d);dummy.rotation.set((i%3-.5)*.08,a,0);dummy.scale.set(.7+(i%4)*.16,.72+(i%6)*.08,.7+(i%4)*.16);dummy.updateMatrix();corals.setMatrixAt(i,dummy.matrix);corals.setColorAt(i,new THREE.Color(colors[i%colors.length]))}corals.castShadow=true;corals.instanceMatrix.needsUpdate=true;corals.instanceColor.needsUpdate=true;root.add(corals);document.body.dataset.coralDetail='landmark-garden-v4';
}
function addMoonMarket(group,r){
  const root=new THREE.Group();root.name='moon-market-v4';group.add(root);const dummy=new THREE.Object3D(),stallMat=mat(0x514841,.78,.04),canopyMat=mat(0xffffff,.68,.01),stalls=new THREE.InstancedMesh(new RoundedBoxGeometry(8,3.2,5,3,.14),stallMat,12),canopies=new THREE.InstancedMesh(new THREE.ConeGeometry(5.6,1.5,4),canopyMat,12),lanterns=new THREE.InstancedMesh(new THREE.SphereGeometry(.48,10,8),new THREE.MeshStandardMaterial({color:0xffd39a,emissive:0xd67a35,emissiveIntensity:1.5,roughness:.35}),20);stalls.name='moon-market-stalls';canopies.name='moon-market-canopies';lanterns.name='moon-market-lanterns';for(let i=0;i<12;i++){const a=i/12*Math.PI*2,d=r*.31,x=Math.cos(a)*d,z=Math.sin(a)*d;dummy.position.set(x,2.15,z);dummy.rotation.set(0,-a,0);dummy.scale.set(1,1,1);dummy.updateMatrix();stalls.setMatrixAt(i,dummy.matrix);dummy.position.y=4.4;dummy.rotation.set(0,a+Math.PI/4,0);dummy.updateMatrix();canopies.setMatrixAt(i,dummy.matrix)}for(let i=0;i<20;i++){const a=i/20*Math.PI*2,d=r*.4;dummy.position.set(Math.cos(a)*d,5.2+(i%3)*.35,Math.sin(a)*d);dummy.scale.set(1,1,1);dummy.updateMatrix();lanterns.setMatrixAt(i,dummy.matrix)}stalls.castShadow=canopies.castShadow=true;root.add(stalls,canopies,lanterns);document.body.dataset.moonDetail='night-market-lanterns-v4';
}
const ambientRoadVehicles=[],parkedRoadVehicles=[],ambientBoats=[],ambientPedestrians=[];let ambientTrafficEnvironment={hour:12,wetness:0};
export function setAmbientTrafficEnvironment({hour=12,wetness=0}={}){ambientTrafficEnvironment={hour:Number(hour)||12,wetness:clamp(Number(wetness)||0,0,1)}}
const trafficBodyGeometry=new RoundedBoxGeometry(3.05,.82,5.65,5,.18),trafficCabinGeometry=new RoundedBoxGeometry(2.55,.82,2.75,5,.16),trafficWheelGeometry=new THREE.CylinderGeometry(.42,.42,.26,16);
const trafficGlassMaterial=new THREE.MeshPhysicalMaterial({color:0x29404b,roughness:.12,metalness:.12,clearcoat:.85,transparent:true,opacity:.92,envMapIntensity:.82}),trafficRubberMaterial=mat(0x111416,.72,.06);
const trafficColors=[0x314a5d,0xa44436,0xd0c6ae,0x33383d,0x47705e,0x9b8a61,0x6d526f,0xe2e0d8];
const pedestrianSkin=[0x5f3828,0x8a5a41,0xb77d5d,0xd39b76,0x6d4634,0xc28768],pedestrianClothes=[0x255f72,0x9a4d3d,0xd5c475,0x304a5c,0x4f7255,0x694d72,0xd3d1c8,0x2d3035];
function addTrafficCar(group,x,z,direction,index){
  const car=new THREE.Group(),paint=matPhysical(trafficColors[index%trafficColors.length],.24,.36,.88),wheels=[];car.name=`ambientCar-${index}`;
  mesh(car,trafficBodyGeometry,paint,'carBody',[0,.72,0]);mesh(car,trafficCabinGeometry,trafficGlassMaterial,'carCabin',[0,1.38,-.25],[.96,1,1]);
  mesh(car,new RoundedBoxGeometry(2.65,.12,.22,3,.04),paint,'carBumperFront',[0,.48,-2.87]);mesh(car,new RoundedBoxGeometry(2.65,.12,.22,3,.04),paint,'carBumperRear',[0,.48,2.87]);
  for(const side of[-1,1])for(const axle of[-1,1]){const wheel=mesh(car,trafficWheelGeometry,trafficRubberMaterial,`wheel-${side}-${axle}`,[side*1.48,.49,axle*1.78],[1,1,1],[0,0,Math.PI/2]);wheel.userData.noBatch=true;wheels.push(wheel)}
  const driverSkin=matPhysical(pedestrianSkin[(index+2)%pedestrianSkin.length],.62,.005,.08),driverCloth=matPhysical(pedestrianClothes[(index+3)%pedestrianClothes.length],.68,.01,.12);mesh(car,new THREE.CapsuleGeometry(.2,.36,4,8),driverCloth,'traffic-driver-torso',[direction>0?-.42:.42,1.28,-.18]);mesh(car,new THREE.SphereGeometry(.22,12,9),driverSkin,'traffic-driver-head',[direction>0?-.42:.42,1.67,-.28]);const mirrorMaterial=mat(0x20292d,.24,.55);for(const side of[-1,1])mesh(car,new RoundedBoxGeometry(.22,.12,.32,3,.035),mirrorMaterial,'traffic-side-mirror',[side*1.62,1.38,-.72]);
  const lampFront=new THREE.MeshStandardMaterial({color:0xf3f7df,emissive:0xeaf4dc,emissiveIntensity:.12,roughness:.2,metalness:.02}),lampRear=new THREE.MeshStandardMaterial({color:0x7d1715,emissive:0xb52320,emissiveIntensity:.35,roughness:.28}),plateMaterial=new THREE.MeshBasicMaterial({color:0xe9e4d7,toneMapped:false});for(const side of[-1,1]){mesh(car,new THREE.BoxGeometry(.42,.18,.035),lampFront,'headlamp',[side*.82,.75,-2.84]);mesh(car,new THREE.BoxGeometry(.38,.16,.035),lampRear,'taillamp',[side*.82,.72,2.84])}mesh(car,new THREE.BoxGeometry(.78,.24,.025),plateMaterial,'traffic-license-plate-front',[0,.51,-2.995]);mesh(car,new THREE.BoxGeometry(.78,.24,.025),plateMaterial,'traffic-license-plate-rear',[0,.51,2.995]);
  const beamMaterial=new THREE.MeshBasicMaterial({color:0xf4f2cf,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),beams=[];for(const side of[-1,1]){const beam=mesh(car,new THREE.ConeGeometry(.82,7.2,14,1,true),beamMaterial,'traffic-headlight-beam',[side*.76,.58,-6.28],[1,1,1],[-Math.PI/2,0,0]);beam.userData.noBatch=true;beam.visible=false;beams.push(beam)}
  const sprayMaterial=new THREE.MeshBasicMaterial({color:0xc8dde1,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),sprays=[];for(const side of[-1,1]){const spray=mesh(car,new THREE.ConeGeometry(.38,1.65,10,1,true),sprayMaterial,'traffic-tire-spray',[side*1.25,.35,3.48],[1,1,1],[Math.PI/2,0,0]);spray.userData.noBatch=true;spray.visible=false;sprays.push(spray)}
  const cruise=8.5+(index%5)*1.35;batchStaticMeshes(car,'traffic-car');car.position.set(x,.8,z);car.rotation.y=direction>0?-Math.PI/2:Math.PI/2;car.userData={direction,speed:cruise,cruise,targetSpeed:cruise,braking:false,minX:-48,maxX:498,wheels,brakeMaterial:lampRear,headMaterial:lampFront,beamMaterial,beams,sprayMaterial,sprays,phase:index*.61};group.add(car);ambientRoadVehicles.push(car);
}
function addParkedRoadVehicle(group,spot,index){
  const vehicle=new THREE.Group(),delivery=spot.kind==='delivery',pickup=spot.kind==='pickup',wagon=spot.kind==='wagon',paint=matPhysical(trafficColors[(index+5)%trafficColors.length],.25,.38,.9),trim=mat(0x20282c,.32,.58),wheels=[];vehicle.name='parked-road-vehicle-'+spot.id;
  if(delivery){mesh(vehicle,new RoundedBoxGeometry(3.1,2.2,5.9,5,.2),paint,'parked-delivery-body',[0,1.34,.18]);mesh(vehicle,new RoundedBoxGeometry(2.7,.92,1.72,4,.15),trafficGlassMaterial,'parked-delivery-windshield',[0,1.72,-2.08]);mesh(vehicle,new THREE.BoxGeometry(2.5,1.42,.08),mat(0xe7e0cf,.72,.01),'parked-delivery-side-panel',[0,1.52,3.16]);}
  else if(pickup){mesh(vehicle,trafficBodyGeometry,paint,'parked-pickup-body',[0,.72,0],[1.04,1,1.08]);mesh(vehicle,trafficCabinGeometry,trafficGlassMaterial,'parked-pickup-cabin',[0,1.42,-.72],[.98,1.1,.72]);mesh(vehicle,new RoundedBoxGeometry(2.72,.55,2.25,4,.12),trim,'parked-pickup-bed',[0,1.03,1.55]);}
  else{mesh(vehicle,trafficBodyGeometry,paint,'parked-car-body',[0,.72,0],[wagon?1.02:.94,1,wagon?1.1:.94]);mesh(vehicle,trafficCabinGeometry,trafficGlassMaterial,'parked-car-cabin',[0,1.4,wagon?.05:-.28],[wagon?1.02:.92,wagon?1.12:.96,wagon?1.22:.92]);}
  const axleZ=delivery?1.95:1.78;for(const side of[-1,1])for(const axle of[-1,1]){const wheel=mesh(vehicle,trafficWheelGeometry,trafficRubberMaterial,'parked-wheel',[side*1.5,.49,axle*axleZ],[delivery?1.08:1,1,1],[0,0,Math.PI/2]);wheel.userData.noBatch=true;wheels.push(wheel)}
  const fineStart=vehicle.children.length,mirrorMaterial=mat(0x1b2428,.22,.58);for(const side of[-1,1])mesh(vehicle,new RoundedBoxGeometry(.24,.13,.34,3,.04),mirrorMaterial,'parked-side-mirror',[side*1.64,delivery?1.76:1.4,-.92]);const plateMaterial=new THREE.MeshBasicMaterial({color:0xe9e3d6,toneMapped:false});mesh(vehicle,new THREE.BoxGeometry(.82,.25,.025),plateMaterial,'parked-license-plate-front',[0,.53,-3.01]);mesh(vehicle,new THREE.BoxGeometry(.82,.25,.025),plateMaterial,'parked-license-plate-rear',[0,.53,delivery?3.2:3.01]);
  const headMaterial=new THREE.MeshStandardMaterial({color:0xf2f4df,emissive:0xe6efd6,emissiveIntensity:.08,roughness:.22}),tailMaterial=new THREE.MeshStandardMaterial({color:0x821b18,emissive:0xaa211c,emissiveIntensity:.16,roughness:.3}),hazardMaterial=new THREE.MeshStandardMaterial({color:0x9b5b17,emissive:0xff8b24,emissiveIntensity:.05,roughness:.25}),hazards=[];for(const side of[-1,1]){mesh(vehicle,new THREE.BoxGeometry(.42,.18,.04),headMaterial,'parked-headlamp',[side*.84,.77,-3]);mesh(vehicle,new THREE.BoxGeometry(.4,.17,.04),tailMaterial,'parked-taillamp',[side*.84,.74,delivery?3.18:3]);const hazard=mesh(vehicle,new THREE.BoxGeometry(.18,.14,.05),hazardMaterial,'parked-hazard-lamp',[side*1.18,delivery?1.1:.82,delivery?3.2:3.02]);hazards.push(hazard)}
  if(wagon||delivery){for(const side of[-1,1])mesh(vehicle,new THREE.BoxGeometry(.08,.12,3.35),trim,'parked-roof-rail',[side*1.02,delivery?2.62:1.92,.15]);for(const z of[-1.1,1.1])mesh(vehicle,new THREE.BoxGeometry(2.18,.08,.1),trim,'parked-roof-rack',[0,delivery?2.69:1.99,z])}
  if(delivery){for(let parcel=0;parcel<3;parcel++)mesh(vehicle,new RoundedBoxGeometry(.72,.58,.64,3,.06),mat(parcel%2?0x8b6d4e:0x6f826e,.82,.01),'parked-delivery-parcel',[(parcel-1)*.78,1.05+(parcel%2)*.55,3.42],[1,1,1],[0,(parcel-1)*.08,0])}
  const fineNodes=vehicle.children.slice(fineStart);vehicle.position.set(spot.x,.8,spot.z);vehicle.rotation.y=spot.direction>0?-Math.PI/2:Math.PI/2;vehicle.userData={spot,paint,wheels,fineNodes,headMaterial,tailMaterial,hazardMaterial,hazards,delivery,phase:index*.73};group.add(vehicle);parkedRoadVehicles.push(vehicle);
}
function addAmbientBoat(group,r,index){
  const boat=new THREE.Group(),paint=matPhysical(trafficColors[(index+3)%trafficColors.length],.25,.24,.8),dark=matPhysical(0x1a2830,.2,.22,.72);boat.name=`ambientBoat-${index}`;
  mesh(boat,new RoundedBoxGeometry(2.35,.52,5.3,6,.19),paint,'boatHull',[0,.08,0],[1,1,1],[-.035,0,0]);mesh(boat,new RoundedBoxGeometry(1.55,.66,1.9,5,.15),trafficGlassMaterial,'boatCabin',[0,.68,.45]);mesh(boat,new RoundedBoxGeometry(1.72,.13,1.6,4,.05),dark,'boatRoof',[0,1.07,.45]);
  mesh(boat,new THREE.CylinderGeometry(.08,.08,1.25,10),dark,'boatAntenna',[0,1.72,.45]);
  batchStaticMeshes(boat,'traffic-boat');const angle=index/10*Math.PI*2,radius=r*(.93+(index%3)*.055);boat.userData={angle,radius,speed:.025+(index%4)*.004,phase:index*.73};boat.position.set(Math.cos(angle)*radius,.2,Math.sin(angle)*radius);group.add(boat);ambientBoats.push(boat);
}
function addCoastalPedestrian(group,x,z,direction,index,minX,maxX){
  const person=new THREE.Group(),skinMat=matPhysical(pedestrianSkin[index%pedestrianSkin.length],.56,.005,.08),clothMat=matPhysical(pedestrianClothes[index%pedestrianClothes.length],.64,.015,.18),trouserMat=mat(index%3?0x252d31:0x635946,.82,.01),shoeMat=mat(0x14191c,.55,.08);
  person.name=`coastalPedestrian-${index}`;person.rotation.y=direction>0?Math.PI/2:-Math.PI/2;person.scale.setScalar(.9+(index%5)*.025);
  mesh(person,new RoundedBoxGeometry(.48,.67,.27,5,.105),clothMat,'pedestrianTorso',[0,1.42,0],[1+(index%3)*.04,1,1]);
  mesh(person,new RoundedBoxGeometry(.39,.24,.25,4,.08),trouserMat,'pedestrianPelvis',[0,1.01,0]);
  const head=joint(person,'pedestrianHead',[0,1.97,0]);mesh(head,new THREE.SphereGeometry(.225,16,12),skinMat,'pedestrianFace',[0,0,0],[.92,1.06,.94]);
  const hairMat=mat([0x171513,0x31231c,0x111416,0x51372a][index%4],.8,.005);mesh(head,new THREE.SphereGeometry(.232,14,9,0,Math.PI*2,0,Math.PI*.56),hairMat,'pedestrianHair',[0,.055,.018],[.94,1.02,.95]);
  const limbs={arms:[],legs:[]};
  for(const side of[-1,1]){
    const arm=joint(person,'pedestrianArm'+side,[side*.31,1.67,0]);mesh(arm,new THREE.CapsuleGeometry(.06,.43,5,8),index%4===0?skinMat:clothMat,'pedestrianArmMesh'+side,[0,-.27,0]);limbs.arms.push(arm);
    const leg=joint(person,'pedestrianLeg'+side,[side*.13,.92,0]);mesh(leg,new THREE.CapsuleGeometry(.075,.56,5,8),trouserMat,'pedestrianLegMesh'+side,[0,-.34,0]);mesh(leg,new RoundedBoxGeometry(.17,.1,.32,3,.035),shoeMat,'pedestrianShoe'+side,[0,-.68,-.07]);limbs.legs.push(leg);
  }
  person.position.set(x,.15,z);person.userData={direction,speed:1.05+(index%6)*.14,minX,maxX,phase:index*.91,limbs};group.add(person);ambientPedestrians.push(person);
}
function addAmbientCoastTraffic(group,r,centerX,roadZ){
  for(let i=0;i<16;i++){const direction=i%2?1:-1,laneZ=roadZ+(direction>0?7.2:-7.2),x=centerX-250+(i/16)*510;addTrafficCar(group,x,laneZ,direction,i)}
  COAST_PARKING_SPOTS.forEach((spot,index)=>addParkedRoadVehicle(group,spot,index));
  for(let i=0;i<10;i++)addAmbientBoat(group,r,i);
  for(let i=0;i<18;i++){const direction=i%2?1:-1,z=roadZ+(i%3===0?25.8:-27.4),x=centerX-238+(i/18)*476;addCoastalPedestrian(group,x,z,direction,i,centerX-252,centerX+252)}
  document.body.dataset.ambientTraffic=String(ambientRoadVehicles.length+ambientBoats.length);
  document.body.dataset.parkedRoadVehicles=String(parkedRoadVehicles.length);
  document.body.dataset.ambientPedestrians=String(ambientPedestrians.length);
}
export function updateAmbientTraffic(time,dt,seaState=1,focus=null){
  const actors=Array.isArray(focus?.actors)?focus.actors:focus?[focus]:[];let nearest=null,brakingCount=0,signalBrakingCount=0;for(const car of ambientRoadVehicles){const d=car.userData,model={x:car.position.x,z:car.position.z,direction:d.direction,cruise:d.cruise},response=coastTrafficDecision(model,actors),signal=coastTrafficSignalDecision(model,time),signalControls=signal.braking&&(!response.braking||signal.targetSpeed<=response.targetSpeed),targetSpeed=Math.min(response.targetSpeed,signal.targetSpeed),braking=response.braking||signal.braking,blend=1-Math.exp(-(braking?5.8:1.45)*Math.max(0,dt));d.targetSpeed=targetSpeed;d.braking=braking;d.signal=signalControls?signal.crossing?.id:null;d.yieldingTo=signalControls?`signal:${signal.crossing.id}`:response.actorId;d.speed+=(d.targetSpeed-d.speed)*blend;if(d.braking)brakingCount++;if(signal.braking)signalBrakingCount++;d.brakeMaterial.color.setHex(d.braking?0xff2f25:0xb52320);car.position.x+=d.direction*d.speed*dt;if(car.position.x>d.maxX)car.position.x=d.minX;if(car.position.x<d.minX)car.position.x=d.maxX;for(const wheel of d.wheels)wheel.rotation.x-=d.direction*d.speed*dt*.48;const clearance=coastTrafficClearance({x:car.position.x,z:car.position.z},focus),entry={id:car.name,x:car.position.x,z:car.position.z,direction:d.direction,speed:d.speed,cruise:d.cruise,braking:d.braking,yieldingTo:d.yieldingTo,signalId:d.signal,signalState:signal.state?.vehicle||null,ahead:Math.min(response.ahead,signal.stopDistance),laneGap:response.laneGap,...clearance};if(!nearest||entry.distance<nearest.distance)nearest=entry}
  const trafficHour=((Number(focus?.hour??ambientTrafficEnvironment.hour)||12)%24+24)%24,darkness=trafficHour>=18?clamp((trafficHour-18)/2,0,1):trafficHour<7?clamp((7-trafficHour)/2,0,1):0,wetness=clamp(Number(focus?.wetness??ambientTrafficEnvironment.wetness)||0,0,1);let activeHeadlightCars=0,activeTireSprays=0;for(const car of ambientRoadVehicles){const d=car.userData,distance=Math.hypot(car.position.x-(focus?.x||0),car.position.z-(focus?.z||0)),near=distance<155,headOn=near&&darkness>.04,sprayStrength=clamp((wetness-.25)/.7,0,1)*clamp(Math.abs(d.speed)/12,0,1),sprayOn=near&&sprayStrength>.04;d.headMaterial.emissiveIntensity=.12+darkness*2.25;d.brakeMaterial.emissiveIntensity=d.braking?2.5:.25+darkness*.7;d.beamMaterial.opacity=darkness*.085;for(const beam of d.beams)beam.visible=headOn;if(headOn)activeHeadlightCars++;d.sprayMaterial.opacity=sprayStrength*.2;for(let index=0;index<d.sprays.length;index++){const spray=d.sprays[index];spray.visible=sprayOn;if(sprayOn){const flutter=.84+Math.sin(time*8+d.phase+index)*.16;spray.scale.set(.72+sprayStrength*.48,(.68+sprayStrength*.7)*flutter,.72+sprayStrength*.48);activeTireSprays++}}}
  const courier=actors.find(actor=>actor.id==='jiho-lee');let visibleParkedVehicles=0,parkedFineVehicles=0,parkedHazards=0,parkedActiveDeliveries=0;for(const vehicle of parkedRoadVehicles){const d=vehicle.userData,distance=focus?Math.hypot(vehicle.position.x-focus.x,vehicle.position.z-focus.z):0,visible=!focus||distance<320,fineVisible=visible&&(!focus||distance<135),courierAtVan=Boolean(d.delivery&&courier&&Math.hypot(vehicle.position.x-courier.x,vehicle.position.z-courier.z)<18);vehicle.visible=visible;if(visible)visibleParkedVehicles++;for(const node of d.fineNodes)node.visible=fineVisible;if(fineVisible)parkedFineVehicles++;d.paint.roughness=.25-wetness*.09;d.paint.clearcoatRoughness=.12-wetness*.045;d.headMaterial.emissiveIntensity=.08+darkness*.1;d.tailMaterial.emissiveIntensity=.16+darkness*.18;const hazardOn=d.delivery&&fineVisible&&(darkness>.04||courierAtVan)&&Math.sin(time*6+d.phase)>.05;d.hazardMaterial.emissiveIntensity=hazardOn?2.4:.05;if(hazardOn)parkedHazards++;if(courierAtVan)parkedActiveDeliveries++}
  for(const boat of ambientBoats){const d=boat.userData;d.angle=(d.angle+d.speed*dt)%(Math.PI*2);const x=Math.cos(d.angle)*d.radius,z=Math.sin(d.angle)*d.radius,dx=-Math.sin(d.angle),dz=Math.cos(d.angle),surface=waveHeight(x,z,time,seaState);boat.position.set(x,surface+.36,z);boat.rotation.y=Math.atan2(dx,dz);boat.rotation.z=Math.sin(time*1.25+d.phase)*.035*seaState;boat.rotation.x=Math.sin(time*.92+d.phase)*.024*seaState}
  for(const person of ambientPedestrians){const d=person.userData;person.position.x+=d.direction*d.speed*dt;if(person.position.x>d.maxX)person.position.x=d.minX;if(person.position.x<d.minX)person.position.x=d.maxX;const stride=Math.sin(time*(4.5+d.speed*.65)+d.phase)*.48;d.limbs.legs[0].rotation.x=stride;d.limbs.legs[1].rotation.x=-stride;d.limbs.arms[0].rotation.x=-stride*.72;d.limbs.arms[1].rotation.x=stride*.72;person.position.y=.15+Math.abs(Math.sin(time*(4.5+d.speed*.65)+d.phase))*.025}
  document.body.dataset.trafficBraking=String(brakingCount);document.body.dataset.trafficSignalBraking=String(signalBrakingCount);document.body.dataset.trafficActors=String(actors.length);document.body.dataset.trafficHeadlightCars=String(activeHeadlightCars);document.body.dataset.trafficTireSprays=String(activeTireSprays);document.body.dataset.visibleParkedVehicles=String(visibleParkedVehicles);document.body.dataset.parkedFineVehicles=String(parkedFineVehicles);document.body.dataset.parkedHazards=String(parkedHazards);document.body.dataset.parkedActiveDeliveries=String(parkedActiveDeliveries);document.body.dataset.parkedWetness=wetness.toFixed(2);return{nearest,brakingCount,signalBrakingCount,vehicleCount:ambientRoadVehicles.length,parkedVehicleCount:parkedRoadVehicles.length,actorCount:actors.length,activeHeadlightCars,activeTireSprays,visibleParkedVehicles,parkedHazards,parkedActiveDeliveries};
}
function addCoastalDistrict(group,r){
  const centerX=r*.36,roadZ=r*.66,buildingZ=r*.57;
  const road=new THREE.Mesh(new THREE.BoxGeometry(500,.58,38),texturedMaterial('asphalt',0x626466,.96,.01,[9,1]));road.position.set(centerX,.48,roadZ);road.receiveShadow=true;group.add(road);
  road.name='golden-coast-asphalt-road';
  const walk=new THREE.Mesh(new THREE.BoxGeometry(520,.5,18),texturedMaterial('paving',0xc4c0b8,.91,.01,[14,1]));walk.name='golden-coast-authored-paving-walk';walk.position.set(centerX,.72,roadZ-28);walk.receiveShadow=true;group.add(walk);
  const quay=new THREE.Mesh(new THREE.BoxGeometry(520,.66,12),texturedMaterial('paving',0xaaa69e,.94,.015,[16,1]));quay.name='golden-coast-authored-paving-quay';quay.position.set(centerX,.68,roadZ+27);quay.receiveShadow=true;group.add(quay);
  const curbMat=mat(0xd1c6b6,.86,.01);for(const z of[roadZ-19,roadZ+19]){const curb=new THREE.Mesh(new THREE.BoxGeometry(520,.34,.72),curbMat);curb.position.set(centerX,.86,z);curb.castShadow=curb.receiveShadow=true;group.add(curb)}
  const laneMat=new THREE.MeshBasicMaterial({color:0xd9d1bd,toneMapped:false});for(let i=-5;i<=5;i++){const dash=new THREE.Mesh(new THREE.BoxGeometry(18,.025,.3),laneMat);dash.position.set(centerX+i*43,.79,roadZ);group.add(dash)}
  for(let i=0;i<9;i++){const x=centerX+(i-4)*54,h=22+(i%4)*6,w=43+(i%2)*4;addBuilding(group,x,buildingZ+Math.sin(i*.8)*3,h,w,[0x9d9a91,0xb0a28e,0x8e9c9b,0xaaa59b][i%4],i)}
  for(let i=0;i<8;i++){const x=centerX+(i-3.5)*61,h=35+(i%5)*7,w=47+(i%3)*5;addBuilding(group,x,buildingZ-52+Math.sin(i*1.14)*4,h,w,[0x9a958a,0xb5afa4,0x87959a,0xaaa294][(i+1)%4],i+9)}
  for(let i=0;i<8;i++){const x=centerX-218+i*62;addStreetTree(group,x,roadZ-27,.72+(i%3)*.06);if(i%2===0)addBench(group,x+22,roadZ+26,Math.PI)}
  const railMat=mat(0x4c5557,.32,.68);for(let i=0;i<18;i++){const x=centerX-252+i*29,post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,2.2,8),railMat);post.position.set(x,1.7,roadZ+32);post.castShadow=true;group.add(post)}
  for(const y of[1.25,2.08]){const rail=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,505,8),railMat);rail.position.set(centerX,y,roadZ+32);rail.rotation.z=Math.PI/2;group.add(rail)}
  const poleMat=mat(0x343a3b,.48,.5),wireMat=new THREE.LineBasicMaterial({color:0x24292b,transparent:true,opacity:.65});const wirePoints=[];
  for(let i=0;i<6;i++){const x=centerX-225+i*90,pole=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,9.5,9),poleMat);pole.position.set(x,5.45,roadZ-37);pole.castShadow=true;group.add(pole);wirePoints.push(new THREE.Vector3(x,9.8,roadZ-37))}
  const wire=new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePoints),wireMat);group.add(wire);
  for(let i=0;i<7;i++){const bin=new THREE.Mesh(new THREE.CylinderGeometry(.48,.56,1.35,12),mat(i%2?0x4b625b:0x52585a,.72,.16));bin.position.set(centerX-205+i*68,1.4,roadZ+24);bin.castShadow=true;group.add(bin)}
  addCoastalStreetDetails(group,centerX,roadZ);if(coastalStreetSurface)coastalStreetSurface.roadMaterial=road.material;
  addAmbientCoastTraffic(group,r,centerX,roadZ);
  batchStaticMeshes(group,'district-fixtures');
  document.body.dataset.architectureTier='photoreal-facades-balconies-v4';document.body.dataset.cityPaving='generated-photoreal-v1';
}
export function createRegion(R,idx){
  const group=new THREE.Group();group.name=R.name;group.position.set(R.x,0,R.z);
  const islandGeometry=sculptCoastlineGeometry(new THREE.CylinderGeometry(R.r*.72,R.r*.93,155,128,14),R,idx,'xz'),island=new THREE.Mesh(islandGeometry,texturedMaterial('earth',R.color,.98,.005,[7,7]));
  island.position.y=-82;island.castShadow=island.receiveShadow=true;
  const pos=island.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),x=pos.getX(i),z=pos.getZ(i),rr=Math.hypot(x,z)/R.r;
    if(y>45)pos.setY(i,y+(Math.sin(x*.018+idx)*Math.cos(z*.021-idx)*18+Math.sin((x+z)*.009)*11)*Math.max(0,1-rr));
  }
  island.geometry.computeVertexNormals();island.geometry.computeBoundingSphere();group.add(island);
  const beachInner=R.biome==='resort'?R.r*.815:R.r*.66,beachColor=R.biome==='resort'?0x73716b:R.biome==='reef'?0x756e65:0xc2ad84,beachMaterial=new THREE.MeshStandardMaterial({color:beachColor,roughness:.96,metalness:0});withTextureClone(surfaceTexture('sand'),[14,14],map=>{beachMaterial.map=map;beachMaterial.needsUpdate=true});const beachGeometry=sculptCoastlineGeometry(new THREE.RingGeometry(beachInner,R.r*.84,160),R,idx),beach=new THREE.Mesh(beachGeometry,beachMaterial);beach.rotation.x=-Math.PI/2;beach.position.y=.02;beach.receiveShadow=true;group.add(beach);
  const shoreGlowGeometry=sculptCoastlineGeometry(new THREE.RingGeometry(R.r*.815,R.r*.875,176),R,idx),shoreGlow=new THREE.Mesh(shoreGlowGeometry,new THREE.MeshBasicMaterial({color:R.biome==='reef'?0x8ea3a5:0xbcc7c5,transparent:true,opacity:R.biome==='storm'?.045:.075,depthWrite:false,side:THREE.DoubleSide}));shoreGlow.rotation.x=-Math.PI/2;shoreGlow.position.y=.2;group.add(shoreGlow);
  for(let band=0;band<2;band++){
    const foamMaterial=new THREE.MeshBasicMaterial({color:band?0xd9f1ef:0xf4ffff,transparent:true,opacity:band?.18:.28,alphaTest:.5,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    const foamGeometry=sculptCoastlineGeometry(new THREE.RingGeometry(R.r*(.818+band*.022),R.r*(.852+band*.025),208),R,idx),foam=new THREE.Mesh(foamGeometry,foamMaterial);
    foam.rotation.x=-Math.PI/2;foam.position.y=.24+band*.025;foam.renderOrder=6;foam.userData={foamMap:null,phase:idx*.17+band*.41,band};withTextureClone(oceanMicroTexture,[12+band*5,1.15],map=>{foam.userData.foamMap=map;foamMaterial.alphaMap=map;foamMaterial.needsUpdate=true},map=>{map.rotation=band?Math.PI:.13;map.center.set(.5,.5)});group.add(foam);shoreFoamMeshes.push(foam);
  }
  const landmarkRoot=new THREE.Group();landmarkRoot.name=`regional-identity-${R.biome}`;group.add(landmarkRoot);group.userData.landmarkRoot=landmarkRoot;group.userData.regionIdentity=addRegionalIdentityLandmarks(landmarkRoot,R,idx);group.userData.coastlineProfile=R.biome;
  const detailRoot=new THREE.Group();detailRoot.name='region-detail';group.add(detailRoot);group.userData.detailRoot=detailRoot;
  const seed=idx*37+11;
  for(let i=0;i<38;i++){
    const a=(i*2.399+seed)*1.01,d=R.r*(.46+.17*Math.sin(i*1.73+seed)),x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(['resort','mangrove','lagoon','moon'].includes(R.biome))addPalm(detailRoot,x,z,.8+(i%5)*.08);
    if(i<(R.biome==='resort'?8:18))addRock(detailRoot,x*.84,R.biome==='resort'?2.8:6,z*.84,R.biome==='resort'?.34+(i%3)*.09:.62+(i%4)*.19,R.biome==='volcano'||R.biome==='reef'?0x303836:0x4a5548);
  }
  if(R.biome==='city'){addHarborCityInfrastructure(detailRoot,R.r);for(let i=0;i<34;i++){const a=i*.55,d=R.r*(.20+(i%7)*.055);addBuilding(detailRoot,Math.cos(a)*d,Math.sin(a)*d,18+(i%9)*8,12+(i%4)*5,i%3?0xaeb8b8:0xd2c7b6,i)}addPier(detailRoot,R.r*.7,0,Math.PI/2,170);addCargoShip(detailRoot,R.r*.95,40,.08)}
  if(R.biome==='resort'){addCoastalDistrict(detailRoot,R.r);addPier(detailRoot,R.r*.7,-90,.1,130);addLighthouse(detailRoot,-R.r*.65,80);addResortPromenade(detailRoot,R.r)}
  if(R.biome==='mangrove')addMangroveWetland(detailRoot,R.r);
  if(R.biome==='volcano'){const crater=new THREE.PointLight(0xff5d2e,45,480,2);crater.position.set(0,286,0);landmarkRoot.add(crater);addCaveArch(detailRoot,R.r*.48,-R.r*.08,1.25)}
  if(R.biome==='reef'){for(let i=0;i<16;i++)addRock(detailRoot,(Math.random()-.5)*R.r,4,(Math.random()-.5)*R.r,1.4+(i%4)*.4,0x242b2a);addCaveArch(detailRoot,R.r*.2,R.r*.47,1.5)}
  if(R.biome==='coral')addCoralGarden(detailRoot,R.r);
  if(R.biome==='moon')addMoonMarket(detailRoot,R.r);
  if(R.biome==='lagoon'){for(let i=0;i<7;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(18,2.2,10,36),new THREE.MeshStandardMaterial({color:0x7cf5ff,emissive:0x2ac7dd,emissiveIntensity:2,roughness:.2}));ring.position.set(-100+i*35,14+Math.sin(i)*8,120-i*28);ring.rotation.y=.2;detailRoot.add(ring)}}
  if(R.biome==='storm'){for(let i=0;i<7;i++){const tower=new THREE.Mesh(new THREE.CylinderGeometry(2.2,3.5,55,9),mat(0x8c9697,.5,.45));tower.position.set(-180+i*60,27,R.r*.2+Math.sin(i)*40);detailRoot.add(tower)}}
  worldRoot.add(group);const entry={region:R,group,index:idx};regionGroups.push(entry);loadedRegionIds.add(idx);document.body.dataset.coastlineTier='biome-harmonic-coves-headlands-v1';return entry;
}
const loadedRegionIds=new Set();
const regionQueue=[];
let regionStreaming=false;
export function ensureRegionLoaded(idx){
  if(loadedRegionIds.has(idx))return regionGroups.find(x=>x.index===idx);
  return createRegion(REGIONS[idx],idx);
}
export function queueRegion(idx,priority=false){
  if(loadedRegionIds.has(idx)||regionQueue.includes(idx))return;
  priority?regionQueue.unshift(idx):regionQueue.push(idx);
  pumpRegionQueue();
}
function pumpRegionQueue(){
  if(regionStreaming||!regionQueue.length)return;regionStreaming=true;
  idle(()=>{
    const idx=regionQueue.shift();ensureRegionLoaded(idx);regionStreaming=false;
    window.__tidalBoot?.background?.('regions',`${loadedRegionIds.size}/${REGIONS.length} regions streamed`);
    pumpRegionQueue();
  },600);
}
export function scheduleWorldStreaming(){
  REGIONS.forEach((_,idx)=>{if(idx!==0)queueRegion(idx)});
}
export function updateRegionStreaming(centerX,centerZ){
  REGIONS.forEach((r,idx)=>{const d=Math.hypot(centerX-r.x,centerZ-r.z);if(d<3600)queueRegion(idx,true)});
  let nearest=null,visibleLandmarks=0;for(const entry of regionGroups){const distance=Math.hypot(centerX-entry.region.x,centerZ-entry.region.z);entry.group.visible=distance<3900;if(entry.group.userData.detailRoot)entry.group.userData.detailRoot.visible=distance<1350;if(entry.group.userData.landmarkRoot){entry.group.userData.landmarkRoot.visible=distance<3200;if(entry.group.userData.landmarkRoot.visible)visibleLandmarks++}if(!nearest||distance<nearest.distance)nearest={entry,distance}}document.body.dataset.nearestRegionIdentity=nearest?.entry.group.userData.regionIdentity||'';document.body.dataset.nearestCoastlineProfile=nearest?.entry.group.userData.coastlineProfile||'';document.body.dataset.visibleRegionalLandmarks=String(visibleLandmarks);
}
export function worldStreamingState(){return {loaded:loadedRegionIds.size,total:REGIONS.length,pending:regionQueue.length}}
ensureRegionLoaded(0);
boot(52,'coast','Golden Coast ready');

export const route=new THREE.CatmullRomCurve3(ROUTE_POINTS.map(p=>new THREE.Vector3(p[0],0,p[1])),true,'catmullrom',.16);
routeMaterial=new THREE.LineBasicMaterial({color:0xb3c9c8,transparent:true,opacity:.075,depthWrite:false});
const routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(route.getPoints(900)),routeMaterial);
routeLine.position.y=.28;scene.add(routeLine);
raceGuideMaterial=new THREE.MeshStandardMaterial({color:0xe4d7b8,emissive:0x8e6a32,emissiveIntensity:.18,roughness:.58,metalness:.12});
const guideCount=36,guideGeometry=new THREE.CylinderGeometry(.28,.46,2.5,14),raceGuides=new THREE.InstancedMesh(guideGeometry,raceGuideMaterial,guideCount*2),guideDummy=new THREE.Object3D();
for(let i=0;i<guideCount;i++){
  const p=route.getPointAt(i/guideCount),tan=route.getTangentAt(i/guideCount),side=new THREE.Vector3(-tan.z,0,tan.x),lane=15+(i%3)*2.5;
  for(let s=0;s<2;s++){const idx=i*2+s,sign=s?1:-1;guideDummy.position.copy(p).addScaledVector(side,lane*sign);guideDummy.position.y=.82;guideDummy.scale.set(1,1+(i%4)*.09,1);guideDummy.updateMatrix();raceGuides.setMatrixAt(idx,guideDummy.matrix);raceGuides.setColorAt(idx,new THREE.Color(s?0xffd58b:0x78eaff))}
}
raceGuides.instanceMatrix.needsUpdate=true;raceGuides.castShadow=true;raceGuides.receiveShadow=true;scene.add(raceGuides);
export function setGlobalRouteGuidesVisible(visible=true){routeLine.visible=Boolean(visible);raceGuides.visible=Boolean(visible)}

const marineRoot=new THREE.Group();marineRoot.name='coastalMarineLife';scene.add(marineRoot);
const REGIONAL_WATER_PALETTES=Object.freeze({
  'GOLDEN COAST':[0x0b7180,0x032f43,0x89d8d1],'VOLCANO BAY':[0x356667,0x182e32,0x97b7a9],'MANGROVE DELTA':[0x356f5f,0x143832,0x8fc8a3],
  'HARBOR CITY':[0x316775,0x173945,0x9cbfc0],'STORM STRAIT':[0x385b68,0x142b38,0xa9bec4],'CORAL EXPANSE':[0x2a9b93,0x075663,0x9df1d5],
  'MOON ARCHIPELAGO':[0x526f8f,0x172d50,0xaebbe4],'BLACK REEF':[0x274d50,0x0a222b,0x789d9b],'SKYWATER LAGOON':[0x49a19b,0x0b5262,0xb2eee0],
});
const subsurfaceRoot=new THREE.Group();subsurfaceRoot.name='streamed-subsurface-volume';scene.add(subsurfaceRoot);const underwaterParticleCount=480,underwaterPositions=new Float32Array(underwaterParticleCount*3),underwaterSeed=new Float32Array(underwaterParticleCount*4);
for(let i=0;i<underwaterParticleCount;i++){const angle=i*2.3999632297,radius=6+Math.sqrt((i+.5)/underwaterParticleCount)*118;underwaterSeed[i*4]=Math.cos(angle)*radius;underwaterSeed[i*4+1]=Math.sin(angle)*radius;underwaterSeed[i*4+2]=.7+(i%31)/31*8.6;underwaterSeed[i*4+3]=(i*1.6180339)%6.283;underwaterPositions[i*3+1]=-100}
const underwaterParticleGeometry=new THREE.BufferGeometry();underwaterParticleGeometry.setAttribute('position',new THREE.BufferAttribute(underwaterPositions,3));const underwaterParticleMaterial=new THREE.PointsMaterial({color:0x89d8d1,size:.13,transparent:true,opacity:.24,depthWrite:false,sizeAttenuation:true,blending:THREE.NormalBlending}),underwaterParticles=new THREE.Points(underwaterParticleGeometry,underwaterParticleMaterial);underwaterParticles.name='subsurface-suspended-matter';underwaterParticles.frustumCulled=false;subsurfaceRoot.add(underwaterParticles);
const underwaterShaftMaterial=new THREE.MeshBasicMaterial({color:0x9de6df,transparent:true,opacity:.026,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false}),underwaterLightShafts=[];for(let i=0;i<7;i++){const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.55,4.8,10.5,12,1,true),underwaterShaftMaterial);shaft.name=`subsurface-light-shaft-${i}`;shaft.rotation.z=(i%3-1)*.035;shaft.renderOrder=3;subsurfaceRoot.add(shaft);underwaterLightShafts.push(shaft)}
let lastSubsurfaceUpdate=-1;
function updateSubsurfaceEnvironment(time,centerX,centerZ,seaState,region){const palette=REGIONAL_WATER_PALETTES[region]||REGIONAL_WATER_PALETTES['GOLDEN COAST'],shallow=new THREE.Color(palette[0]),deep=new THREE.Color(palette[1]),scatter=new THREE.Color(palette[2]);water.material.uniforms.tidalShallowColor?.value.lerp(shallow,.025);water.material.uniforms.tidalDeepColor?.value.lerp(deep,.025);underwaterParticleMaterial.color.lerp(scatter,.035);underwaterShaftMaterial.color.lerp(scatter,.03);underwaterShaftMaterial.opacity=.018+Math.max(0,1.25-seaState)*.016;if(time-lastSubsurfaceUpdate<1/15)return;lastSubsurfaceUpdate=time;const anchorX=Math.round(centerX/120)*120,anchorZ=Math.round(centerZ/120)*120,baseSurface=waveHeight(anchorX,anchorZ,time,seaState);for(let i=0;i<underwaterParticleCount;i++){const j=i*3,k=i*4,phase=underwaterSeed[k+3];underwaterPositions[j]=anchorX+underwaterSeed[k]+Math.sin(time*.16+phase)*.55;underwaterPositions[j+1]=baseSurface-underwaterSeed[k+2]+Math.sin(time*.34+phase)*.18;underwaterPositions[j+2]=anchorZ+underwaterSeed[k+1]+Math.cos(time*.13+phase)*.48}underwaterParticleGeometry.attributes.position.needsUpdate=true;for(let i=0;i<underwaterLightShafts.length;i++){const angle=i/underwaterLightShafts.length*Math.PI*2+time*.012,radius=25+(i%3)*24,x=anchorX+Math.cos(angle)*radius,z=anchorZ+Math.sin(angle)*radius,surface=waveHeight(x,z,time,seaState),shaft=underwaterLightShafts[i];shaft.position.set(x,surface-5.15,z);shaft.scale.set(1+Math.sin(time*.21+i)*.12,1,1+Math.cos(time*.18+i)*.1)}document.body.dataset.subsurfaceParticles=String(underwaterParticleCount);document.body.dataset.subsurfaceShafts=String(underwaterLightShafts.length);document.body.dataset.regionalWaterPalette=region;document.body.dataset.subsurfaceTier='streamed-scatter-volume-v1'}
function createFishBodyGeometry(){
  const rings=19,radial=16,vertices=[],indices=[];
  for(let ring=0;ring<rings;ring++){
    const t=ring/(rings-1),z=-1+t*2,profile=Math.max(.035,Math.pow(Math.sin(Math.PI*t),.58)*(1-.12*t)),belly=.9+.1*Math.sin(Math.PI*t);
    for(let side=0;side<radial;side++){const a=side/radial*Math.PI*2;vertices.push(Math.cos(a)*profile,Math.sin(a)*profile*belly,z)}
    if(ring<rings-1)for(let side=0;side<radial;side++){const next=(side+1)%radial,a=ring*radial+side,b=ring*radial+next,c=(ring+1)*radial+side,d=(ring+1)*radial+next;indices.push(a,c,b,b,c,d)}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
const fishBodyGeometry=createFishBodyGeometry(),rayBodyGeometry=new THREE.SphereGeometry(1,24,12),fishEyeGeometry=new THREE.SphereGeometry(.075,8,6),fishSpotGeometry=new THREE.SphereGeometry(.045,7,5),rayWingGeometry=new THREE.SphereGeometry(1,18,8),serpentSegmentGeometry=new THREE.SphereGeometry(1,14,8);
const fishTailGeometry=new THREE.BufferGeometry();fishTailGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,.72,.58,0,0,.88,0,0,0,0,0,.88,0,-.72,.58],3));fishTailGeometry.computeVertexNormals();
const fishTextureFor=species=>species.regions.some(r=>['CORAL EXPANSE','SKYWATER LAGOON'].includes(r))?authoredTextures.fishTropical:['bottom','pulse'].includes(species.behavior)||species.regions.some(r=>['VOLCANO BAY','BLACK REEF','MANGROVE DELTA'].includes(r))?authoredTextures.fishReef:authoredTextures.fishBluewater;
const fishMaterials=FISH_SPECIES.map(species=>new THREE.MeshPhysicalMaterial({color:species.color,map:fishTextureFor(species),roughness:.36,metalness:.025,clearcoat:.44,clearcoatRoughness:.24,envMapIntensity:.5,emissive:species.behavior==='pulse'?new THREE.Color(species.accent):new THREE.Color(0x000000),emissiveIntensity:species.behavior==='pulse'?.22:0}));
const fishFinMaterials=FISH_SPECIES.map(species=>new THREE.MeshPhysicalMaterial({color:species.accent,roughness:.4,metalness:.015,clearcoat:.3,transparent:true,opacity:.88,depthWrite:true,side:THREE.DoubleSide}));
const fishEyeMaterial=new THREE.MeshPhysicalMaterial({color:0x06090a,roughness:.08,clearcoat:1});
const splashMaterial=new THREE.MeshBasicMaterial({color:0xf2ffff,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
const marineFish=[];
for(let i=0;i<81;i++){
  const species=FISH_SPECIES[i%FISH_SPECIES.length],fish=new THREE.Group();fish.name=`marine-${species.id}-${i}`;
  const [width,height,length]=species.body,isShark=species.id.includes('shark'),isBillfish=['swordfish','tempest-marlin'].includes(species.id),isRay=species.behavior==='glide',isSerpent=species.behavior==='serpent',isRound=species.id==='moon-opah',isGrouper=species.id.includes('grouper')||species.id.includes('wrasse'),isTuna=species.id.includes('tuna')||species.id.includes('amberjack')||species.id.includes('trevally'),body=new THREE.Mesh(isRay?rayBodyGeometry:fishBodyGeometry,fishMaterials[i%FISH_SPECIES.length]);body.scale.set(width,height,length);body.castShadow=true;fish.add(body);
  const tail=new THREE.Mesh(fishTailGeometry,fishFinMaterials[i%FISH_SPECIES.length]);tail.position.z=length*.88;tail.scale.set(Math.max(.45,width*1.5),Math.max(.48,height*1.55),Math.max(.55,length*.58));fish.add(tail);
  const dorsal=new THREE.Mesh(new THREE.ConeGeometry(Math.max(.12,width*.34),Math.max(.28,length*.48),3),fishFinMaterials[i%FISH_SPECIES.length]);dorsal.position.set(0,height*.82,.05);fish.add(dorsal);
  const pectorals=[];for(const side of[-1,1]){const eye=new THREE.Mesh(fishEyeGeometry,fishEyeMaterial);eye.position.set(side*width*.62,height*.27,-length*.76);eye.scale.setScalar(THREE.MathUtils.clamp(width*.95,.62,1.45));fish.add(eye);const fin=new THREE.Mesh(new THREE.ConeGeometry(Math.max(.08,height*.32),Math.max(.22,width*.7),3),fishFinMaterials[i%FISH_SPECIES.length]);fin.position.set(side*width*.75,-height*.06,-length*.08);fin.rotation.set(0,0,side*Math.PI*.46);fish.add(fin);pectorals.push(fin)}
  if(isShark){mesh(fish,new THREE.SphereGeometry(1,18,10),fishMaterials[i%FISH_SPECIES.length],'sharkSnout',[0,-height*.02,-length*.84],[width*.82,height*.68,length*.28]);for(const side of[-1,1])for(let slit=0;slit<3;slit++)mesh(fish,new THREE.BoxGeometry(.012,height*.34,.035),fishEyeMaterial,'sharkGill'+side+'-'+slit,[side*width*.94,-height*.02,-length*(.43-slit*.07)],[1,1,1],[0,0,side*.08])}
  if(isBillfish)mesh(fish,new THREE.CylinderGeometry(.018,.075,length*.78,12),fishMaterials[i%FISH_SPECIES.length],'billfishRostrum',[0,.02,-length*1.18],[1,1,1],[Math.PI/2,0,0]);
  const wings=[],segments=[];if(isRay){dorsal.visible=false;tail.visible=false;for(const side of[-1,1]){const wing=new THREE.Mesh(rayWingGeometry,fishFinMaterials[i%FISH_SPECIES.length]);wing.name=`rayWing${side<0?'Left':'Right'}`;wing.position.x=side*width*.78;wing.scale.set(width*.9,height*.42,length*.76);fish.add(wing);wings.push(wing)}mesh(fish,new THREE.CylinderGeometry(.018,.055,length*2.2,9),fishFinMaterials[i%FISH_SPECIES.length],'rayWhipTail',[0,0,length*1.72],[1,1,1],[Math.PI/2,0,0])}
  if(isSerpent){body.scale.x*=.68;body.scale.y*=.82;for(let segment=0;segment<4;segment++){const part=new THREE.Mesh(serpentSegmentGeometry,fishMaterials[i%FISH_SPECIES.length]);part.name=`serpentSegment${segment}`;part.position.z=length*(.62+segment*.38);part.scale.set(width*(.55-segment*.075),height*(.7-segment*.08),length*.48);fish.add(part);segments.push(part)}}
  if(isRound){dorsal.scale.set(1.45,1.65,1);const anal=dorsal.clone();anal.name='opahAnalFin';anal.position.y=-height*.78;anal.rotation.z=Math.PI;fish.add(anal)}
  if(isGrouper)mesh(fish,new THREE.SphereGeometry(1,14,9),fishFinMaterials[i%FISH_SPECIES.length],'grouperJaw',[0,-height*.22,-length*.82],[width*.48,height*.2,length*.18]);
  if(species.id==='coral-parrotfish')mesh(fish,new THREE.SphereGeometry(1,12,8),fishFinMaterials[i%FISH_SPECIES.length],'parrotfishBeak',[0,-height*.02,-length*.92],[width*.36,height*.24,length*.12]);
  if(isTuna)for(let finlet=0;finlet<4;finlet++){const z=length*(.38+finlet*.13);mesh(fish,new THREE.ConeGeometry(.055,.16,3),fishFinMaterials[i%FISH_SPECIES.length],`tunaFinlet${finlet}`,[0,height*(.56-finlet*.04),z])}
  if(species.behavior==='pulse')for(let spot=0;spot<6;spot++){const glow=new THREE.Mesh(fishSpotGeometry,fishFinMaterials[i%FISH_SPECIES.length]);glow.name=`lanternPhotophore${spot}`;glow.position.set((spot%2?1:-1)*width*.58,-height*.14,-length*.52+Math.floor(spot/2)*length*.42);fish.add(glow)}
  const jumping=['jump','acrobat'].includes(species.behavior),splash=jumping?new THREE.Mesh(new THREE.TorusGeometry(.72,.045,6,28),splashMaterial.clone()):null;if(splash){splash.name=`fishBreachSplash-${i}`;splash.rotation.x=Math.PI/2;splash.visible=false;scene.add(splash)}
  const visualScale=(isShark?.46:isRay?.56:isSerpent?.48:.5)+(i%6)*.022;fish.scale.setScalar(visualScale);const rarityDepth=['epic','legendary'].includes(species.rarity)?.48:species.behavior==='bottom'?.82:0;fish.userData={seed:i*1.618+2.7,school:(i+Math.floor(i/FISH_SPECIES.length)*2)%9,depth:.82+(i%9)*.12+rarityDepth,tail,species,swim:species.behavior==='runner'?1.55:species.behavior==='power'?.72:species.behavior==='bottom'?.58:1,pectorals,wings,segments,splash,jumping,isRay,isSerpent};marineRoot.add(fish);marineFish.push(fish);
}
const dolphinMaterial=new THREE.MeshPhysicalMaterial({color:0x6f8f98,roughness:.3,metalness:.01,clearcoat:.75,clearcoatRoughness:.14,envMapIntensity:.8});
const dolphinBellyMaterial=new THREE.MeshPhysicalMaterial({color:0xc3d1cf,roughness:.38,clearcoat:.42});
const marineDolphins=[];
for(let i=0;i<3;i++){
  const dolphin=new THREE.Group();dolphin.name=`coastalDolphin-${i}`;
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,26,16),dolphinMaterial);body.scale.set(.72,.6,2.25);body.castShadow=true;dolphin.add(body);
  mesh(dolphin,new THREE.SphereGeometry(1,18,10),dolphinBellyMaterial,'dolphinBelly',[0,-.22,-.2],[.57,.34,1.72]);
  mesh(dolphin,new THREE.CylinderGeometry(.18,.31,.92,14),dolphinMaterial,'dolphinSnout',[0,.02,-2.42],[1,1,1],[Math.PI/2,0,0]);
  mesh(dolphin,new THREE.ConeGeometry(.4,.9,12),dolphinMaterial,'dorsalFin',[0,.78,.25],[.45,1,.9],[0,0,0]);
  const tail=new THREE.Mesh(fishTailGeometry,dolphinMaterial);tail.position.z=2.12;tail.scale.set(1.35,.9,1.15);dolphin.add(tail);
  const splash=new THREE.Mesh(new THREE.TorusGeometry(1.2,.09,7,36),splashMaterial.clone());splash.rotation.x=Math.PI/2;splash.renderOrder=7;scene.add(splash);
  dolphin.userData={phase:i/3,tail,splash};marineRoot.add(dolphin);marineDolphins.push(dolphin);
}
export const marineLife={fish:marineFish,dolphins:marineDolphins,speciesCount:FISH_SPECIES.length,subsurface:{particles:underwaterParticles,shafts:underwaterLightShafts}};
document.body.dataset.marineLife=String(marineFish.length+marineDolphins.length);
document.body.dataset.fishSpecies=String(FISH_SPECIES.length);
export function updateMarineLife(time,centerX=0,centerZ=0,seaState=1,speedN=0,region='GOLDEN COAST'){
  const anchorX=Math.round(centerX/180)*180,anchorZ=Math.round(centerZ/180)*180;
  updateSubsurfaceEnvironment(time,centerX,centerZ,seaState,region);
  const schoolCenters=[[30,-12],[44,-62],[66,46],[-38,70],[-72,-34],[5,82],[82,4],[-18,-78],[-88,42]],regionalSpecies=new Set();
  let visible=0,breaches=0;
  for(let i=0;i<marineFish.length;i++){
    const fish=marineFish[i],d=fish.userData,local=d.species.regions.includes(region);fish.visible=local;if(!local){if(d.splash)d.splash.visible=false;continue}visible++;regionalSpecies.add(d.species.id);
    const [sx,sz]=schoolCenters[d.school],behavior=d.species.behavior,formation=(Math.floor(i/FISH_SPECIES.length)-1)*2.45,pace=['runner','dash'].includes(behavior)?1.24:behavior==='bottom'?.72:1,phase=time*(.31+d.school*.035)*d.swim*pace+d.seed,radius=(behavior==='school'?8.5:behavior==='runner'?20:13)+(i%9)*1.8;
    const x=anchorX+sx+Math.cos(phase)*radius+Math.cos(phase*.38)*formation,z=anchorZ+sz+Math.sin(phase*.91)*radius*.7+Math.sin(phase*.43)*formation,dx=-Math.sin(phase)*radius*.31*d.swim,dz=Math.cos(phase*.91)*radius*.7*.91*.31*d.swim,surface=waveHeight(x,z,time,seaState),bottomBias=behavior==='bottom'?1.28:behavior==='pulse'?.55:0;
    const breachCycle=(time*(behavior==='acrobat'?.18:.13)+d.seed*.071)%1,breaching=d.jumping&&breachCycle<.22,breachP=breaching?breachCycle/.22:0,breachHeight=breaching?Math.sin(breachP*Math.PI)*(behavior==='acrobat'?1.9:1.38):0,swimDepth=breaching?.12:d.depth+bottomBias+.08*Math.sin(time*1.7+d.seed);
    fish.position.set(x,surface-swimDepth+breachHeight,z);fish.rotation.y=Math.atan2(dx,dz)+Math.PI;fish.rotation.z=Math.sin(time*(behavior==='zigzag'?3.7:2.1)+d.seed)*(behavior==='zigzag'?.13:.055);fish.rotation.x=breaching?(breachP-.5)*1.05:behavior==='serpent'?Math.sin(time*1.7+d.seed)*.045:0;d.tail.rotation.y=Math.sin(time*(6.8+3*d.swim)+d.seed)*(.28+.12*d.swim);
    d.pectorals.forEach((fin,index)=>{fin.rotation.x=Math.sin(time*3.1+d.seed+index*Math.PI)*.16});d.wings.forEach((wing,index)=>{wing.rotation.z=(index?1:-1)*(.05+Math.sin(time*2.2+d.seed)*.17)});d.segments.forEach((segment,index)=>{segment.rotation.y=Math.sin(time*2.4+d.seed-index*.58)*(.12+index*.035)});
    if(d.splash){d.splash.visible=breaching;d.splash.position.set(x,surface+.035,z);const splashPulse=breaching?Math.sin(breachP*Math.PI):0;d.splash.scale.setScalar(.55+splashPulse*1.5);d.splash.material.opacity=splashPulse*.48;if(breaching)breaches++}
  }
  for(let i=0;i<marineDolphins.length;i++){
    const dolphin=marineDolphins[i],cycle=(time*.075+dolphin.userData.phase)%1,phase=time*.16+i*2.08,radius=48+i*12,x=anchorX+Math.cos(phase)*radius,z=anchorZ+Math.sin(phase)*radius*.72,surface=waveHeight(x,z,time,seaState);
    const active=cycle>.08&&cycle<.43,p=active?(cycle-.08)/.35:0,breach=active?Math.sin(p*Math.PI)*(3.8+speedN*1.1):-.75;
    dolphin.position.set(x,surface+breach,z);dolphin.rotation.y=-phase+.12;dolphin.rotation.x=active?(p-.5)*1.15:.08;dolphin.userData.tail.rotation.y=Math.sin(time*5.2+i)*.28;
    const splash=dolphin.userData.splash;splash.position.set(x,surface+.08,z);splash.scale.setScalar(.65+(active?Math.sin(p*Math.PI)*2.2:0));splash.material.opacity=active?Math.sin(p*Math.PI)*.55:0;
  }
  document.body.dataset.marineVisible=String(visible);document.body.dataset.marineRegionalSpecies=String(regionalSpecies.size);document.body.dataset.marineBreaches=String(breaches);document.body.dataset.marineRegion=region;return{visible,total:marineFish.length,species:regionalSpecies.size,breaches,region};
}

function hullGeometry(){
  const v=[],ix=[],rings=30,sections=10;
  for(let j=0;j<rings;j++){
    const t=j/(rings-1),z=(t-.5)*7.4,k=Math.pow(Math.sin(Math.PI*t),.52),w=.12+1.34*k*(.82+.18*t),h=.32+.5*k;
    for(let s=0;s<sections;s++){const a=s/sections*Math.PI*2,x=Math.cos(a)*w,y=Math.sin(a)*h-.08-Math.max(0,Math.cos(a))*.055;v.push(x,y,z)}
    const b=j*sections;if(j<rings-1)for(let s=0;s<sections;s++){const n=(s+1)%sections,a=b+s,c=b+n,d=b+sections+s,e=b+sections+n;ix.push(a,c,e,a,e,d)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function fairingGeometry(){
  const v=[],ix=[],rings=14,sections=10;
  for(let j=0;j<rings;j++){const t=j/(rings-1),z=-3.22+t*2.75,k=Math.sin(Math.PI*(.18+t*.72)),w=.18+.79*k,h=.22+.42*k;for(let s=0;s<sections;s++){const a=s/sections*Math.PI*2;v.push(Math.cos(a)*w,.72+Math.sin(a)*h+t*.22,z)}const b=j*sections;if(j<rings-1)for(let s=0;s<sections;s++){const n=(s+1)%sections,a=b+s,c=b+n,d=b+sections+s,e=b+sections+n;ix.push(a,e,c,a,d,e)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function craftSplineTube(side=1,kind='rubRail'){
  const points=kind==='chine'
    ?[[-.02,-.12,-3.67],[.72,-.22,-2.72],[1.16,-.16,-1.12],[1.31,-.08,.82],[.92,-.08,2.72],[.26,-.10,3.58]]
    :[[.08,.34,-3.58],[.76,.42,-2.7],[1.27,.36,-1.1],[1.38,.28,.86],[1.06,.25,2.72],[.35,.22,3.58]];
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x*side,y,z)),false,'centripetal');return new THREE.TubeGeometry(curve,32,kind==='chine'?.038:.052,7,false);
}
function craftDashTexture(accent='#79e8ff'){
  return canvasTexture(`craft-dash-${accent}`,(ctx,canvas)=>{
    const gradient=ctx.createLinearGradient(0,0,512,512);gradient.addColorStop(0,'#061016');gradient.addColorStop(1,'#102a35');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,512);
    ctx.strokeStyle='rgba(130,235,255,.22)';ctx.lineWidth=3;for(let y=48;y<512;y+=52){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(512,y);ctx.stroke()}
    ctx.strokeStyle=accent;ctx.lineWidth=18;ctx.beginPath();ctx.arc(180,278,112,Math.PI*.72,Math.PI*2.28);ctx.stroke();ctx.fillStyle='#e8fbff';ctx.font='700 86px "Segoe UI",sans-serif';ctx.textAlign='center';ctx.fillText('42',180,304);ctx.font='700 28px "Segoe UI",sans-serif';ctx.fillStyle=accent;ctx.fillText('KNOTS',180,348);
    ctx.fillStyle='#8ef0d1';ctx.fillRect(346,128,30,220);ctx.fillStyle='#305560';ctx.fillRect(394,172,30,176);ctx.fillStyle='#d8f8ff';ctx.font='700 22px "Segoe UI",sans-serif';ctx.fillText('NAV',386,398);
  },1,1);
}
function proxyLimb(parent,a,b,radius,material,name){const delta=b.clone().sub(a),length=delta.length(),limb=new THREE.Mesh(new THREE.CylinderGeometry(radius*.78,radius,length,7),material);limb.name=name;limb.position.copy(a).add(b).multiplyScalar(.5);limb.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());parent.add(limb);return limb}
function buildDistantCraftProxy(c,r){
  const proxy=new THREE.Group();proxy.name='LOD2-distant-rider';proxy.rotation.y=Math.PI;
  const paint=matPhysical(c.color,.3,.3,.66),dark=mat(0x101820,.62,.08),suit=matPhysical(r.suit,.48,.02,.24),accent=matPhysical(r.accent,.26,.14,.7);
  const hull=new THREE.Mesh(new RoundedBoxGeometry(1.7,.62,6.4,3,.17),paint);hull.name='lod2Hull';hull.position.set(0,.18,.15);hull.castShadow=true;proxy.add(hull);
  const deck=new THREE.Mesh(new RoundedBoxGeometry(1.35,.28,3.7,3,.12),dark);deck.name='lod2Deck';deck.position.set(0,.68,.58);proxy.add(deck);
  const riderRoot=new THREE.Group();riderRoot.name='lod2RiderRoot';proxy.add(riderRoot);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.72,4,8),suit);torso.name='lod2Torso';torso.position.set(0,2.16,.22);torso.rotation.x=-.18;torso.castShadow=true;riderRoot.add(torso);
  const vest=new THREE.Mesh(new RoundedBoxGeometry(.76,.76,.48,3,.12),accent);vest.name='lod2Vest';vest.position.set(0,2.22,.24);vest.rotation.x=-.18;riderRoot.add(vest);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.34,12,8),accent);helmet.name='lod2Helmet';helmet.position.set(0,3.04,-.03);helmet.scale.set(.94,1.05,.96);helmet.castShadow=true;riderRoot.add(helmet);
  const shoulderY=2.48,gripY=1.83;proxyLimb(riderRoot,new THREE.Vector3(-.34,shoulderY,.05),new THREE.Vector3(-.61,gripY,-.95),.095,suit,'lod2ArmL');proxyLimb(riderRoot,new THREE.Vector3(.34,shoulderY,.05),new THREE.Vector3(.61,gripY,-.95),.095,suit,'lod2ArmR');
  proxyLimb(riderRoot,new THREE.Vector3(-.2,1.85,.42),new THREE.Vector3(-.45,.88,1.3),.12,suit,'lod2LegL');proxyLimb(riderRoot,new THREE.Vector3(.2,1.85,.42),new THREE.Vector3(.45,.88,1.3),.12,suit,'lod2LegR');
  proxy.userData={riderRoot,baseY:riderRoot.position.y};return proxy;
}
export function craftModel(c,r,visual={},options={}){
  const detail=options.detail||'hero';
  const paintColor=new THREE.Color(visual.paint||c.color),paint=new THREE.MeshPhysicalMaterial({color:paintColor,metalness:.34,roughness:.16,clearcoat:1,clearcoatRoughness:.065,envMapIntensity:1.18,sheen:.08,sheenRoughness:.24,sheenColor:paintColor.clone().lerp(new THREE.Color(0xffffff),.18)});
  const dark=mat(0x101820,.36,.28),rubber=mat(0x0d1114,.76,.02),metal=mat(0x8fa2aa,.22,.72),seatRubber=texturedMaterial('neoprene',0x596267,.7,.01,[3,4]),trimMat=matPhysical(0x17232a,.29,.22,.62),polishedMetal=matPhysical(0xa9bbc0,.15,.78,.88);
  const g=new THREE.Group();g.name=`${c.name}-${r.name}`;
  const suspension=new THREE.Group();suspension.name='craftSuspension';suspension.rotation.y=Math.PI;g.add(suspension);g.userData.suspension=suspension;
  const hull=new THREE.Mesh(hullGeometry(),paint);hull.castShadow=hull.receiveShadow=true;hull.scale.set(c.type==='STABLE'?1.12:c.type==='TOP SPEED'?.92:1,c.type==='WAVE'?1.08:1,c.type==='TOP SPEED'?1.08:1);suspension.add(hull);
  mesh(suspension,new RoundedBoxGeometry(.58,.34,5.9,4,.11),dark,'keel',[0,-.22,.15],[1,1,1],[.02,0,0]);
  for(const side of[-1,1]){mesh(suspension,craftSplineTube(side,'chine'),trimMat,'hullChine'+side);mesh(suspension,craftSplineTube(side,'rubRail'),rubber,'hullRubRail'+side)}
  mesh(suspension,new RoundedBoxGeometry(.52,.16,.26,4,.07),rubber,'bowBumper',[0,.28,-3.68],[1,1,1],[-.1,0,0]);
  const towEye=mesh(suspension,new THREE.TorusGeometry(.13,.025,7,18),polishedMetal,'bowTowEye',[0,-.12,-3.72],[1,1,1],[Math.PI/2,0,0]);towEye.castShadow=true;
  mesh(suspension,new RoundedBoxGeometry(1.68,.33,4.35,5,.15),paint,'deck',[0,.54,.28],[1,1,1],[.02,0,0]);
  mesh(suspension,new RoundedBoxGeometry(.34,.28,4.9,4,.12),rubber,'footwellL',[-.72,.52,.45],[1,1,1],[.02,0,.03]);mesh(suspension,new RoundedBoxGeometry(.34,.28,4.9,4,.12),rubber,'footwellR',[.72,.52,.45],[1,1,1],[.02,0,-.03]);
  if(detail==='hero')for(const side of[-1,1])for(let rib=0;rib<7;rib++)mesh(suspension,new RoundedBoxGeometry(.28,.035,.065,2,.018),trimMat,`footwellRib${side}-${rib}`,[side*.72,.71,-1.52+rib*.55],[1,1,1],[.02,0,side*.03]);
  mesh(suspension,new RoundedBoxGeometry(1.9,.24,1.3,4,.11),paint,'rearDeck',[0,.58,2.45]);
  mesh(suspension,new RoundedBoxGeometry(.92,.38,2.48,7,.18),seatRubber,'seat',[0,.94,.67],[1,1,1],[-.035,0,0]);
  for(const side of[-1,1])mesh(suspension,new RoundedBoxGeometry(.045,.035,2.02,3,.016),polishedMetal,'seatPiping'+side,[side*.425,1.095,.62],[1,1,1],[-.035,0,0]);
  if(detail==='hero')for(let seam=0;seam<5;seam++)mesh(suspension,new RoundedBoxGeometry(.78,.022,.025,2,.01),trimMat,'seatSeam'+seam,[0,1.142,-.12+seam*.36],[1,1,1],[-.035,0,0]);
  const hood=mesh(suspension,fairingGeometry(),paint,'frontFairing');
  mesh(suspension,new RoundedBoxGeometry(.58,.12,.88,4,.055),dark,'frontIntake',[0,.58,-3.0],[1,1,1],[-.22,0,0]);
  const intakeSlatMat=mat(0x809097,.3,.52);for(let i=-2;i<=2;i++)mesh(suspension,new THREE.BoxGeometry(.065,.025,.62),intakeSlatMat,'intakeSlat'+i,[i*.105,.525,-3.03],[1,1,1],[-.22,0,0]);
  const consoleM=new THREE.MeshPhysicalMaterial({color:0x13232d,roughness:.11,metalness:.24,clearcoat:1,clearcoatRoughness:.08});
  const console=mesh(suspension,new RoundedBoxGeometry(1.04,.84,.72,5,.1),consoleM,'console',[0,1.43,-1.02],[1,1,1],[-.1,0,0]);
  const screen=mesh(suspension,new THREE.PlaneGeometry(.68,.34),new THREE.MeshBasicMaterial({map:craftDashTexture('#79e8ff'),toneMapped:false}), 'dashScreen',[0,1.56,-1.39],[1,1,1],[-.2,0,0]);
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x7da5b2,roughness:.08,metalness:.04,transmission:.34,transparent:true,opacity:.55,clearcoat:1,clearcoatRoughness:.04,side:THREE.DoubleSide,envMapIntensity:1.25}),windshield=mesh(suspension,new RoundedBoxGeometry(1.12,.54,.055,6,.09),glassMat,'windshield',[0,1.84,-1.18],[1,1,1],[-.28,0,0]);windshield.castShadow=false;
  const bar=joint(suspension,'handlebar',[0,1.86,-1.04]);
  mesh(bar,new THREE.CylinderGeometry(.045,.045,1.28,10),metal,'bar',[0,0,0],[1,1,1],[0,0,Math.PI/2]);
  const grips={};for(const side of[-1,1]){grips[side<0?'L':'R']=mesh(bar,new THREE.CylinderGeometry(.075,.075,.34,10),rubber,'grip'+side,[side*.65,0,0],[1,1,1],[0,0,Math.PI/2]);mesh(suspension,new RoundedBoxGeometry(.12,.2,.46,3,.035),paint,'sideFairing'+side,[side*.93,.76,-1.62],[1,1,1],[0,side*.08,side*.05]);const stalk=mesh(bar,new THREE.CylinderGeometry(.025,.032,.33,8),trimMat,'mirrorStalk'+side,[side*.53,.23,-.02],[1,1,1],[0,0,side*.4]);mesh(stalk,new RoundedBoxGeometry(.28,.17,.07,4,.045),consoleM,'mirrorHousing'+side,[0,.18,0],[1,1,1],[0,side*.08,0]);mesh(stalk,new RoundedBoxGeometry(.225,.125,.012,3,.025),polishedMetal,'mirrorGlass'+side,[0,.18,-.041],[1,1,1],[0,side*.08,0])}
  const grab=mesh(suspension,new THREE.TorusGeometry(.66,.045,8,30,Math.PI),metal,'rearGrab',[0,.92,2.52],[1,1,.7],[Math.PI/2,0,0]);grab.rotation.z=Math.PI;
  mesh(suspension,new THREE.CylinderGeometry(.18,.23,.52,12),metal,'jetNozzle',[0,-.02,3.68],[1,1,1],[Math.PI/2,0,0]);mesh(suspension,new THREE.TorusGeometry(.26,.036,8,24),rubber,'jetNozzleSeal',[0,-.02,3.91],[1,1,1],[Math.PI/2,0,0]);
  const headlampMat=new THREE.MeshBasicMaterial({color:0xeafaff,toneMapped:false}),navRed=new THREE.MeshBasicMaterial({color:0xff3f36,toneMapped:false}),navGreen=new THREE.MeshBasicMaterial({color:0x54f0a5,toneMapped:false});for(const side of[-1,1]){mesh(suspension,new RoundedBoxGeometry(.24,.09,.025,3,.018),headlampMat,'bowLamp'+side,[side*.42,.91,-2.83],[1,1,1],[-.2,side*.04,0]);mesh(suspension,new THREE.SphereGeometry(.045,10,7),side<0?navRed:navGreen,'navLight'+side,[side*.86,.82,-.62])}
  mesh(suspension,new THREE.CylinderGeometry(.12,.12,.035,24),polishedMetal,'fuelCap',[.53,.77,1.8],[1,1,1],[0,0,Math.PI/2]);
  const stripeMat=matPhysical(r.accent,.24,.18,.75);for(const side of[-1,1])mesh(suspension,new THREE.BoxGeometry(.08,.07,4.2),stripeMat,'stripe'+side,[side*.83,.79,.15],[1,1,1],[.02,0,side*.05]);
  const rig=buildRiderRig(r,visual,{detail});rig.position.z=-.2;suspension.add(rig);const lodProxy=detail==='rival'?buildDistantCraftProxy(c,r):null;if(lodProxy){lodProxy.visible=false;g.add(lodProxy)}g.userData.riderRig=rig.userData.riderRig;g.userData.proceduralRiderRoot=rig;g.userData.handlebar=bar;g.userData.grips=grips;g.userData.detail=detail;g.userData.craft=c;g.userData.rider=r;g.userData.lodProxy=lodProxy;g.userData.lodTier=detail==='hero'?'LOD0':'LOD1';
  if(typeof document!=='undefined')document.body.dataset.craftVisual='marine-craft-pbr-v5-sculpted-cockpit';
  return g;
}

const premiumClipForState=state=>state?.victory?'victory':state?.boost?'boost':Math.abs(state?.vertical||0)>1.25?'landing':state?.drift?'drift':Math.abs(state?.steer||0)>.58?'hard-turn':state?.menu?'menu-idle':'ride';
function animatePremiumRider(craft,state={}){
  const premium=craft.userData.premiumRider;if(!premium)return false;const clipName=premiumClipForState(state),next=premium.actions.get(clipName)||premium.actions.get('ride')||premium.actions.values().next().value;if(next&&next!==premium.current){next.reset().fadeIn(.18).play();if(premium.current)premium.current.fadeOut(.18);premium.current=next;premium.clip=clipName}const time=Number(state.time)||0,dt=Math.max(0,Math.min(.05,time-premium.lastTime));premium.lastTime=time;premium.mixer.update(dt);craft.userData.premiumClip=premium.clip;return true;
}
export async function upgradeCraftRider(craft){
  if(!craft||craft.userData.detail!=='hero'||craft.userData.premiumRider)return false;const rider=craft.userData.rider,obj=await assets.spawn(`rider-${rider.id}-hero`);if(!obj||!craft.parent)return false;
  const fallback=craft.userData.proceduralRiderRoot,suspension=craft.userData.suspension;obj.name=`premium-rider-${rider.id}`;obj.position.copy(fallback?.position||new THREE.Vector3(0,0,-.2));obj.rotation.copy(fallback?.rotation||new THREE.Euler());obj.traverse(node=>{if(node.isMesh||node.isSkinnedMesh){node.castShadow=true;node.receiveShadow=true;node.frustumCulled=true}});suspension.add(obj);if(fallback)fallback.visible=false;
  const mixer=new THREE.AnimationMixer(obj),actions=new Map();for(const clip of obj.userData.gltfAnimations||[])if(clip?.name)actions.set(clip.name,mixer.clipAction(clip));craft.userData.premiumRider={root:obj,mixer,actions,current:null,clip:null,lastTime:0};craft.userData.lodTier='LOD0-premium';document.body.dataset.premiumRider=rider.id;document.body.dataset.premiumRiderClips=String(actions.size);return true;
}

export function updateCraftLod(craft,distance=0){
  if(craft?.userData?.detail!=='rival'||!craft.userData.lodProxy)return'LOD0';const previous=craft.userData.lodTier,far=distance>(previous==='LOD2'?125:155);craft.userData.suspension.visible=!far;craft.userData.lodProxy.visible=far;craft.userData.lodTier=far?'LOD2':'LOD1';return craft.userData.lodTier;
}
export function animateCraftCharacter(craft,state){
  const proxy=craft?.userData?.lodProxy;if(proxy?.visible){const rider=proxy.userData.riderRoot,t=state?.time||0,steer=THREE.MathUtils.clamp(state?.steer||0,-1,1),speedN=THREE.MathUtils.clamp(Math.abs(state?.speed||0)/Math.max(1,state?.maxSpeed||45),0,1);rider.rotation.x=THREE.MathUtils.lerp(rider.rotation.x,-.11-speedN*.13,.16);rider.rotation.z=THREE.MathUtils.lerp(rider.rotation.z,-steer*.16,.16);rider.position.y=proxy.userData.baseY+Math.sin(t*4.2)*.02;return}if(animatePremiumRider(craft,state))return;animateRiderRig(craft,state)
}

export const itemBoxes=[];
const boxMat=new THREE.MeshStandardMaterial({color:0x72ecff,emissive:0x239fb5,emissiveIntensity:2,roughness:.22,metalness:.25});
function spawnItemBox(i){
  const o=new THREE.Mesh(new THREE.OctahedronGeometry(3.8,0),boxMat.clone()),p=route.getPointAt((i+.5)/34),tan=route.getTangentAt((i+.5)/34),side=new THREE.Vector3(-tan.z,0,tan.x).multiplyScalar((i%3-1)*15);
  o.position.copy(p).add(side);o.position.y=5;o.userData={cool:0};scene.add(o);itemBoxes.push(o);
}
for(let i=0;i<8;i++)spawnItemBox(i);

const cloudCanvas=document.createElement('canvas');cloudCanvas.width=128;cloudCanvas.height=64;
const cc=cloudCanvas.getContext('2d'),cg=cc.createRadialGradient(64,32,3,64,32,55);
cg.addColorStop(0,'rgba(255,255,255,.78)');cg.addColorStop(.45,'rgba(255,244,225,.42)');cg.addColorStop(1,'rgba(255,255,255,0)');
cc.fillStyle=cg;cc.fillRect(0,0,128,64);
const cloudTex=new THREE.CanvasTexture(cloudCanvas),cloudMat=new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,opacity:.48});
export const clouds=[];
function spawnCloud(i){const sp=new THREE.Sprite(cloudMat.clone());sp.position.set((((i*977)%101)/100-.5)*6500,260+((i*43)%100)/100*430,((((i*613)%103)/102)-.5)*6500);sp.scale.set(240+((i*67)%100)/100*430,90+((i*37)%100)/100*150,1);scene.add(sp);clouds.push(sp)}
for(let i=0;i<10;i++)spawnCloud(i);
let propStreaming=false,itemStreamIndex=8,cloudStreamIndex=10;
export function scheduleGameplayStreaming(){
  if(propStreaming||(itemStreamIndex>=34&&cloudStreamIndex>=42))return;propStreaming=true;
  const batch=()=>idle(()=>{
    const start=performance.now();
    while(itemStreamIndex<34&&performance.now()-start<7)spawnItemBox(itemStreamIndex++);
    while(cloudStreamIndex<42&&performance.now()-start<11)spawnCloud(cloudStreamIndex++);
    window.__tidalBoot?.background?.('props',`${itemStreamIndex}/34 pickups · ${cloudStreamIndex}/42 clouds`);
    if(itemStreamIndex<34||cloudStreamIndex<42)batch();else propStreaming=false;
  },500);
  batch();
}
export function streamingState(){return {...worldStreamingState(),items:itemBoxes.length,clouds:clouds.length}}
boot(57,'props','Core race props ready');

export function updatePresentation(time,speedN=0,boost=false,storm=false){
  if(cinematicGradePass){cinematicGradePass.uniforms.uBoost.value=THREE.MathUtils.lerp(cinematicGradePass.uniforms.uBoost.value,boost?Math.min(1,.35+speedN):speedN*.12,.08);cinematicGradePass.uniforms.uStorm.value=THREE.MathUtils.lerp(cinematicGradePass.uniforms.uStorm.value,storm?1:0,.04)}
  if(raceGuideMaterial)raceGuideMaterial.emissiveIntensity=.16+Math.sin(time*3.2)*.035+speedN*.12;
  if(routeMaterial)routeMaterial.opacity=.055+speedN*.045;
  rimLight.intensity=THREE.MathUtils.lerp(rimLight.intensity,storm?.22:.42+speedN*.12,.035);
  if(water.material.uniforms.distortionScale)water.material.uniforms.distortionScale.value=THREE.MathUtils.lerp(water.material.uniforms.distortionScale.value,.96+speedN*.45+(storm?.22:0),.04);
  if(water.material.uniforms.tidalReflectionStrength)water.material.uniforms.tidalReflectionStrength.value=THREE.MathUtils.lerp(water.material.uniforms.tidalReflectionStrength.value,storm?.76:.66-speedN*.025,.035);
  if(water.material.uniforms.tidalAbsorption)water.material.uniforms.tidalAbsorption.value=THREE.MathUtils.lerp(water.material.uniforms.tidalAbsorption.value,storm?.00235:.00175,.025);
  for(const foam of shoreFoamMeshes){const {foamMap,phase,band}=foam.userData;if(foamMap)foamMap.offset.x=(time*(band?.007:-.01)+phase)%1;foam.material.opacity=(band?.14:.22)+(Math.sin(time*.72+phase)*.5+.5)*(band?.055:.085)+(storm?.035:0)}
  for(const animator of regionalLandmarkAnimators){const pulse=Math.sin(time*1.4+animator.phase)*.5+.5;if(animator.type==='rotor')animator.node.rotation.z=time*(.52+animator.phase*.02);else if(animator.type==='smoke'){animator.node.position.x=animator.baseX+Math.sin(time*.32+animator.phase)*6;animator.node.material.opacity=.32+pulse*.2}else if(animator.type==='halo')animator.node.rotation.z=time*.18+animator.phase;else if(animator.type==='pulse')animator.node.material.emissiveIntensity=1.45+pulse*1.15;else if(animator.type==='waterfall'){animator.node.material.opacity=.36+pulse*.14;animator.node.position.y=56+Math.sin(time*.9+animator.phase)*.55}}
}

export function resizeEngine(quality){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);configurePost(quality);
}

function effectivelyVisible(object){for(let node=object;node;node=node.parent)if(node.visible===false)return false;return true}
export function sceneDiagnostics(){
  const stats={meshes:0,visibleMeshes:0,shadowCasters:0,triangles:0,characters:0,traffic:0,marine:0,environment:0};
  scene.traverse(object=>{
    if(!object.isMesh&&!object.isInstancedMesh)return;
    stats.meshes++;if(!effectivelyVisible(object))return;stats.visibleMeshes++;if(object.castShadow)stats.shadowCasters++;
    const position=object.geometry?.attributes?.position,index=object.geometry?.index,count=object.isInstancedMesh?object.count:1;stats.triangles+=Math.round(((index?.count||position?.count||0)/3)*count);
    let node=object,tag='';while(node){tag+=' '+(node.name||'');node=node.parent}tag=tag.toLowerCase();
    if(tag.includes('riderrig')||tag.includes('storm-x')||tag.includes('barracuda')||tag.includes('manta-r')||tag.includes('leviathan')||tag.includes('stingray')||tag.includes('phoenix')||tag.includes('orca gt')||tag.includes('specter')||tag.includes('tsunami')||tag.includes('volt-9'))stats.characters++;
    else if(tag.includes('ambientcar')||tag.includes('ambientboat')||tag.includes('coastalpedestrian'))stats.traffic++;
    else if(tag.includes('fish')||tag.includes('dolphin'))stats.marine++;
    else stats.environment++;
  });
  return stats;
}
