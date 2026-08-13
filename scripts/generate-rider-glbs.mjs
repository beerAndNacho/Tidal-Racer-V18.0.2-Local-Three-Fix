import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from '../vendor/three/build/three.module.js';
import { RoundedBoxGeometry } from '../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFExporter } from '../vendor/three/examples/jsm/exporters/GLTFExporter.js';
import { RIDERS } from '../data-v12.js';
import { getCharacterProfile } from '../v16/character-catalog.js';

const originalWarn=console.warn.bind(console);
console.warn=(message,...rest)=>{if(!String(message).includes('Creating normalized normal attribute'))originalWarn(message,...rest)};

if(typeof globalThis.FileReader==='undefined')globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()}).catch(error=>this.onerror?.(error))}
  readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.()}).catch(error=>this.onerror?.(error))}
};

const outputRoot=path.resolve('assets/glb/riders'),only=process.argv.find(arg=>arg.startsWith('--only='))?.split('=')[1]||null,dryRun=process.argv.includes('--dry-run');
const requiredClips=['menu-idle','ride','hard-turn','drift','boost','landing','victory'];
const v=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function authorMaterial(name,color,{roughness=.4,metalness=.02,clearcoat=.3,transmission=0,opacity=1,emissive=0,emissiveIntensity=0,sheen=0,sheenRoughness=.5,sheenColor=0xffffff,specularIntensity=.5}={}){
  return new THREE.MeshPhysicalMaterial({name,color,roughness,metalness,clearcoat,clearcoatRoughness:.16,transmission,transparent:opacity<1,opacity,side:THREE.FrontSide,envMapIntensity:.82,emissive,emissiveIntensity,sheen,sheenRoughness,sheenColor,specularIntensity});
}

function transformGeometry(geometry,{position=v(0,0,0),scale=v(1,1,1),quaternion=new THREE.Quaternion()}={}){
  const matrix=new THREE.Matrix4().compose(position,quaternion,scale);geometry.applyMatrix4(matrix);geometry.computeVertexNormals();return geometry;
}

function betweenGeometry(geometry,a,b,scale=v(1,1,1)){
  const delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),q=new THREE.Quaternion().setFromUnitVectors(v(0,1,0),delta.clone().normalize());return transformGeometry(geometry,{position:mid,quaternion:q,scale});
}

function quat(x=0,y=0,z=0){const q=new THREE.Quaternion();q.setFromEuler(new THREE.Euler(x,y,z,'XYZ'));return q}
function quaternionTrack(name,times,eulers){const values=[];for(const e of eulers){const q=quat(...e);values.push(q.x,q.y,q.z,q.w)}return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`,times,values)}
function positionTrack(name,times,points){return new THREE.VectorKeyframeTrack(`${name}.position`,times,points.flat())}

function createRig(profile){
  const h=profile.build.height,shoulder=profile.build.shoulder,hip=profile.build.hip,arm=profile.build.arm,leg=profile.build.leg;
  const points={
    root:v(0,0,0),pelvis:v(0,1.22*h,.45),spine:v(0,1.47*h,.43),chest:v(0,2.19*h,.41),neck:v(0,2.85*h,.39),head:v(0,3.13*h,.37),
    'upperArm.L':v(-.49*shoulder,2.57*h,.39),'foreArm.L':v(-.68*arm,2.18*h,-.05),'hand.L':v(-.65*arm,1.92*h,-.76),
    'upperArm.R':v(.49*shoulder,2.57*h,.39),'foreArm.R':v(.68*arm,2.18*h,-.05),'hand.R':v(.65*arm,1.92*h,-.76),
    'upperLeg.L':v(-.27*hip,1.17*h,.47),'lowerLeg.L':v(-.39*leg,.76*h,-.08),'boot.L':v(-.43*leg,.46*h,-.64),
    'upperLeg.R':v(.27*hip,1.17*h,.47),'lowerLeg.R':v(.39*leg,.76*h,-.08),'boot.R':v(.43*leg,.46*h,-.64),
  };
  const parent={pelvis:'root',spine:'pelvis',chest:'spine',neck:'chest',head:'neck','upperArm.L':'chest','foreArm.L':'upperArm.L','hand.L':'foreArm.L','upperArm.R':'chest','foreArm.R':'upperArm.R','hand.R':'foreArm.R','upperLeg.L':'pelvis','lowerLeg.L':'upperLeg.L','boot.L':'lowerLeg.L','upperLeg.R':'pelvis','lowerLeg.R':'upperLeg.R','boot.R':'lowerLeg.R'};
  const ordered=['root','pelvis','spine','chest','neck','head','upperArm.L','foreArm.L','hand.L','upperArm.R','foreArm.R','hand.R','upperLeg.L','lowerLeg.L','boot.L','upperLeg.R','lowerLeg.R','boot.R'],bones=[],byName={};
  for(const name of ordered){const bone=new THREE.Bone();bone.name=name;const parentName=parent[name];bone.position.copy(parentName?points[name].clone().sub(points[parentName]):points[name]);if(parentName)byName[parentName].add(bone);byName[name]=bone;bones.push(bone)}
  return{bones,byName,points,root:byName.root};
}

function createRiderScene(rider){
  const profile=getCharacterProfile(rider.id),scene=new THREE.Scene();scene.name=`TidalRacer_${rider.name}_LOD0`;scene.userData={authoring:'Tidal Racer original character atelier v3 anatomical wet-gear pass',assetId:`rider-${rider.id}-hero`,license:'Project-authored original geometry',authoredOn:'2026-08-12',sourceScript:'scripts/generate-rider-glbs.mjs'};
  const rig=createRig(profile),armature=new THREE.Group();armature.name='Armature';armature.add(rig.root);scene.add(armature);scene.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(rig.bones);skeleton.calculateInverses();
  const materials={
    skin:authorMaterial(`${rider.name}_skin`,rider.skin,{roughness:.5,clearcoat:.1,sheen:.08,sheenRoughness:.72,sheenColor:0xffc9b8,specularIntensity:.34}),
    suit:authorMaterial(`${rider.name}_neoprene`,rider.suit,{roughness:.38,clearcoat:.42,sheen:.22,sheenRoughness:.68,sheenColor:new THREE.Color(rider.suit).lerp(new THREE.Color(0xffffff),.2),specularIntensity:.4}),
    wetSuit:authorMaterial(`${rider.name}_wet_neoprene_panels`,new THREE.Color(rider.suit).lerp(new THREE.Color(0x071219),.18),{roughness:.24,clearcoat:.62,sheen:.18,sheenRoughness:.42,sheenColor:0xb8d7de,specularIntensity:.52}),
    accent:authorMaterial(`${rider.name}_accent`,rider.accent,{roughness:.21,metalness:.16,clearcoat:.92}),
    vest:authorMaterial(`${rider.name}_life_vest`,new THREE.Color(rider.suit).lerp(new THREE.Color(0xffffff),.1),{roughness:.48,clearcoat:.3}),
    helmet:authorMaterial(`${rider.name}_helmet_shell`,new THREE.Color(rider.suit).lerp(new THREE.Color(0x07141b),.34),{roughness:.2,metalness:.17,clearcoat:1}),
    dark:authorMaterial(`${rider.name}_reinforcement`,0x121a20,{roughness:.42,metalness:.12,clearcoat:.42}),
    rubber:authorMaterial(`${rider.name}_rubber`,0x0a1014,{roughness:.7,metalness:.04,clearcoat:.24}),
    visor:authorMaterial(`${rider.name}_visor`,0x183b4b,{roughness:.08,metalness:.12,clearcoat:1,transmission:.18,opacity:.78}),
    eye:authorMaterial(`${rider.name}_eye_white`,0xf2ede5,{roughness:.2,clearcoat:.72,specularIntensity:.62}),
    iris:authorMaterial(`${rider.name}_iris`,new THREE.Color(rider.accent).lerp(new THREE.Color(0x20363b),.72),{roughness:.14,clearcoat:.82,specularIntensity:.7}),
    white:authorMaterial(`${rider.name}_reflective`,0xeaf5f3,{roughness:.23,metalness:.08,clearcoat:.8,emissive:0x173a40,emissiveIntensity:.08}),
  };
  const boneIndex=name=>rig.bones.indexOf(rig.byName[name]);
  const add=(geometry,material,bone,name)=>{
    const count=geometry.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4),index=boneIndex(bone);for(let i=0;i<count;i++){indices[i*4]=index;weights[i*4]=1}geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.bind(skeleton);scene.add(mesh);return mesh;
  };
  const ellipsoid=(name,bone,center,scale,material,segments=24)=>add(transformGeometry(new THREE.SphereGeometry(1,segments,Math.max(12,segments/2)),{position:center,scale}),material,bone,name);
  const rounded=(name,bone,center,size,material,radius=.08,rotation=[0,0,0])=>add(transformGeometry(new RoundedBoxGeometry(size.x,size.y,size.z,2,radius),{position:center,quaternion:quat(...rotation)}),material,bone,name);
  const capsule=(name,bone,a,b,radius,material)=>{const length=Math.max(.02,a.distanceTo(b)-radius*2);return add(betweenGeometry(new THREE.CapsuleGeometry(radius,length,8,14),a,b),material,bone,name)};
  const cylinder=(name,bone,a,b,radius,material,radial=14)=>add(betweenGeometry(new THREE.CylinderGeometry(radius*.9,radius,a.distanceTo(b),radial),a,b),material,bone,name);
  const {points:p}=rig,body=rider.body||[1,1,1],width=profile.build.shoulder,hip=profile.build.hip,muscle=clamp(profile.build.muscle||1,.85,1.22);

  rounded('pelvis-shell','pelvis',v(0,1.23,.46),v(.72*hip,.43,.52),materials.suit,.13);
  for(const side of[-1,1])ellipsoid(`glute-transition-${side}`,'pelvis',v(side*.205*hip,1.28,.64),v(.24*hip,.25,.22),materials.suit,22);
  rounded('lumbar-transition','spine',v(0,1.52,.57),v(.58*profile.build.waist,.34,.24),materials.wetSuit,.095,[.08,0,0]);
  ellipsoid('abdomen-sculpt','spine',v(0,1.72,.42),v(.39*profile.build.waist,.46,.29),materials.suit,28);
  ellipsoid('chest-sculpt','chest',v(0,2.23,.40),v(.51*width,.58*profile.build.chest,.34),materials.suit,32);
  ellipsoid('trapezius-bridge','chest',v(0,2.67,.42),v(.39*width,.18,.28),materials.wetSuit,28);
  for(const side of[-1,1])cylinder(`clavicle-${side}`,'chest',v(side*.055,2.57,.10),v(side*.39*width,2.54,.18),.035,materials.wetSuit,12);
  rounded('vest-front','chest',v(0,2.25,.08),v(.82*width,.75,.18),materials.vest,.10,[-.07,0,0]);
  rounded('vest-back','chest',v(0,2.26,.72),v(.74*width,.70,.13),materials.vest,.075,[.055,0,0]);
  for(const side of[-1,1])rounded(`vest-side-${side}`,'chest',v(side*.43*width,2.23,.40),v(.11,.55,.49),materials.dark,.04,[0,0,side*.08]);
  rounded('vest-center-panel','chest',v(0,2.25,-.025),v(.22,.64,.035),materials.dark,.025);
  rounded('vest-reflective-strip','chest',v(0,2.51,-.035),v(.72*width,.055,.028),materials.white,.015);
  for(const y of[2.11,2.38]){rounded(`vest-webbing-${y}`,'chest',v(0,y,-.034),v(.79*width,.042,.026),materials.dark,.012);for(const side of[-1,1])rounded(`vest-buckle-${side}-${y}`,'chest',v(side*.17,y,-.061),v(.105,.075,.035),materials.accent,.016)}
  rounded('vest-back-spine','chest',v(0,2.25,.804),v(.19,.53,.035),materials.dark,.018,[.055,0,0]);
  rounded('vest-back-protector','chest',v(0,2.25,.842),v(.31,.44,.055),materials.wetSuit,.045,[.055,0,0]);
  for(const side of[-1,1]){
    rounded(`vest-back-strap-${side}`,'chest',v(side*.245*width,2.28,.8),v(.065,.49,.03),materials.accent,.014,[.055,0,side*.045]);
    rounded(`vest-back-shoulder-mark-${side}`,'chest',v(side*.22*width,2.54,.798),v(.17,.045,.03),materials.white,.012,[.055,0,side*.12]);
  }
  add(transformGeometry(new THREE.TorusGeometry(.205,.045,9,28),{position:v(0,2.84,.39),quaternion:quat(Math.PI/2,0,0),scale:v(1,1,.88)}),materials.suit,'neck','sealed-collar');
  cylinder('neck-seal','neck',v(0,2.82,.39),v(0,3.04,.38),.17,materials.skin,18);
  ellipsoid('head-anatomy','head',v(0,3.16,.33),v(.245,.325,.255),materials.skin,28);
  ellipsoid('jaw','head',v(0,3.02,.27),v(.19,.16,.18),materials.skin,22);
  ellipsoid('nose','head',v(0,3.17,.055),v(.045,.065,.073),materials.skin,16);
  for(const side of[-1,1]){ellipsoid(`ear-${side}`,'head',v(side*.245,3.16,.33),v(.038,.063,.03),materials.skin,14);ellipsoid(`eye-${side}`,'head',v(side*.088,3.215,.088),v(.047,.026,.017),materials.eye,16);ellipsoid(`iris-${side}`,'head',v(side*.088,3.215,.071),v(.017,.017,.009),materials.iris,14);ellipsoid(`eye-catchlight-${side}`,'head',v(side*.083,3.221,.062),v(.0045,.0045,.003),materials.white,10);rounded(`brow-${side}`,'head',v(side*.091,3.267,.091),v(.09,.016,.016),materials.dark,.008,[0,0,side*.06])}
  rounded('upper-lip','head',v(0,3.075,.073),v(.105,.018,.012),materials.skin,.007);rounded('lower-lip','head',v(0,3.054,.075),v(.09,.015,.012),materials.skin,.007);
  const helmetShell=new THREE.SphereGeometry(.335,30,18,0,Math.PI*2,0,Math.PI*.64);add(transformGeometry(helmetShell,{position:v(0,3.245,.35),scale:v(.96,1.02,1.08)}),materials.helmet,'head','helmet-shell');
  rounded('helmet-rear','head',v(0,3.19,.574),v(.49,.34,.105),materials.helmet,.085);
  rounded('helmet-visor','head',v(0,3.30,.035),v(.415,.12,.03),materials.visor,.027,[-.16,0,0]);
  rounded('helmet-crest','head',v(0,3.535,.36),v(.052,.075,.34),materials.accent,.018);
  add(transformGeometry(new THREE.TorusGeometry(.275,.026,8,30),{position:v(0,3.04,.35),quaternion:quat(Math.PI/2,0,0),scale:v(1,.86,1)}),materials.dark,'head','helmet-lower-rim');
  for(const side of[-1,1]){rounded(`helmet-ear-cover-${side}`,'head',v(side*.285,3.18,.35),v(.06,.19,.145),materials.dark,.028);rounded(`helmet-mark-${side}`,'head',v(side*.205,3.405,.18),v(.11,.035,.018),materials.accent,.01,[0,side*.15,side*.08]);rounded(`helmet-rear-vent-${side}`,'head',v(side*.105,3.27,.638),v(.07,.035,.018),materials.dark,.009,[0,side*.08,side*.04])}

  for(const side of[-1,1]){
    const key=side<0?'L':'R',upper=`upperArm.${key}`,fore=`foreArm.${key}`,hand=`hand.${key}`,thigh=`upperLeg.${key}`,shin=`lowerLeg.${key}`,boot=`boot.${key}`;
    capsule(`upper-arm-${key}`,upper,p[upper],p[fore],.145*muscle,materials.suit);ellipsoid(`deltoid-${key}`,upper,p[upper].clone().lerp(p[fore],.08),v(.17*muscle,.19,.17),materials.suit,20);
    capsule(`forearm-${key}`,fore,p[fore],p[hand],.118*muscle,materials.suit);capsule(`forearm-wet-panel-${key}`,fore,p[fore].clone().lerp(p[hand],.18).add(v(0,0,-.075)),p[fore].clone().lerp(p[hand],.76).add(v(0,0,-.075)),.045,materials.wetSuit);rounded(`elbow-guard-${key}`,fore,p[fore].clone().lerp(p[hand],.08).add(v(0,.01,-.06)),v(.22,.20,.10),materials.accent,.035);
    rounded(`glove-${key}`,hand,p[hand].clone().add(v(0,-.02,-.03)),v(.19,.24,.18),materials.dark,.055);rounded(`glove-knuckle-${key}`,hand,p[hand].clone().add(v(0,.025,-.13)),v(.16,.055,.045),materials.accent,.018);
    for(let finger=0;finger<4;finger++)rounded(`glove-finger-${key}-${finger}`,hand,p[hand].clone().add(v(side*(-.058+finger*.039),-.105,-.14)),v(.033,.135,.038),materials.dark,.014,[.12,0,side*.025]);
    capsule(`glove-thumb-${key}`,hand,p[hand].clone().add(v(side*.095,-.005,-.065)),p[hand].clone().add(v(side*.135,-.10,-.13)),.033,materials.dark);
    capsule(`thigh-${key}`,thigh,p[thigh],p[shin],.19*body[0],materials.suit);ellipsoid(`knee-${key}`,shin,p[shin],v(.17,.15,.17),materials.suit,20);
    capsule(`shin-${key}`,shin,p[shin],p[boot],.145*body[0],materials.suit);rounded(`shin-guard-${key}`,shin,p[shin].clone().lerp(p[boot],.52).add(v(0,.02,-.10)),v(.21,.37,.085),materials.accent,.035,[-.15,0,0]);
    rounded(`ankle-cuff-${key}`,boot,p[boot].clone().add(v(0,.08,.025)),v(.245,.18,.25),materials.wetSuit,.055,[-.05,0,0]);rounded(`boot-${key}`,boot,p[boot].clone().add(v(0,-.04,-.13)),v(.29,.22,.52),materials.rubber,.065,[-.12,0,0]);rounded(`boot-toe-cap-${key}`,boot,p[boot].clone().add(v(0,-.045,-.36)),v(.27,.17,.20),materials.dark,.055,[-.16,0,0]);rounded(`boot-sole-${key}`,boot,p[boot].clone().add(v(0,-.14,-.10)),v(.31,.055,.55),materials.dark,.018);
    rounded(`suit-stripe-arm-${key}`,upper,p[upper].clone().lerp(p[fore],.42).add(v(side*.12,0,-.08)),v(.045,.31,.035),materials.white,.012,[.68,0,side*.22]);
    rounded(`suit-stripe-leg-${key}`,thigh,p[thigh].clone().lerp(p[shin],.4).add(v(side*.12,0,-.10)),v(.05,.37,.035),materials.white,.012,[.94,0,-side*.1]);
  }
  rounded('utility-belt','pelvis',v(0,1.43,.45),v(.78*hip,.09,.55),materials.dark,.035);rounded('belt-buckle','pelvis',v(0,1.43,.145),v(.16,.12,.045),materials.accent,.018);
  const clips=createClips(rig,profile);scene.animations=clips;scene.updateMatrixWorld(true);return{scene,clips,profile};
}

function createClips(rig,profile){
  const basePelvis=rig.byName.pelvis.position.toArray(),times=[0,.5,1],cycle=(name,tracks)=>new THREE.AnimationClip(name,1,tracks),s=profile.seed||1;
  return[
    cycle('menu-idle',[positionTrack('pelvis',times,[basePelvis,[basePelvis[0],basePelvis[1]+.018,basePelvis[2]],[...basePelvis]]),quaternionTrack('chest',times,[[0,0,-.012],[.018,.012,.012],[0,0,-.012]]),quaternionTrack('head',times,[[0,-.025,0],[0,.035,0],[0,-.025,0]]),quaternionTrack('upperArm.L',times,[[0,0,0],[.015,0,-.018],[0,0,0]]),quaternionTrack('upperArm.R',times,[[0,0,0],[-.015,0,.018],[0,0,0]])]),
    cycle('ride',[quaternionTrack('pelvis',times,[[-.035,0,0],[-.048,0,.008],[-.035,0,0]]),quaternionTrack('spine',times,[[-.05,0,0],[-.065,.008,0],[-.05,0,0]]),quaternionTrack('chest',times,[[-.08,0,0],[-.095,0,.008],[-.08,0,0]]),quaternionTrack('head',times,[[.035,0,0],[.025,.012,0],[.035,0,0]]),quaternionTrack('upperArm.L',times,[[.035,0,-.025],[.05,0,-.035],[.035,0,-.025]]),quaternionTrack('upperArm.R',times,[[.035,0,.025],[.05,0,.035],[.035,0,.025]]),quaternionTrack('foreArm.L',times,[[.02,0,0],[.035,0,-.012],[.02,0,0]]),quaternionTrack('foreArm.R',times,[[.02,0,0],[.035,0,.012],[.02,0,0]])]),
    cycle('hard-turn',[quaternionTrack('pelvis',times,[[0,0,.12],[0,0,.18],[0,0,.12]]),quaternionTrack('chest',times,[[-.08,.08,.18],[-.1,.12,.24],[-.08,.08,.18]]),quaternionTrack('head',times,[[.02,-.1,-.08],[.02,-.14,-.11],[.02,-.1,-.08]]),quaternionTrack('upperArm.L',times,[[.06,-.08,-.11],[.08,-.11,-.15],[.06,-.08,-.11]]),quaternionTrack('upperArm.R',times,[[-.03,.08,-.04],[-.05,.11,-.06],[-.03,.08,-.04]]),quaternionTrack('foreArm.L',times,[[.06,0,-.05],[.09,0,-.08],[.06,0,-.05]]),quaternionTrack('foreArm.R',times,[[-.025,0,-.035],[-.04,0,-.055],[-.025,0,-.035]])]),
    cycle('drift',[quaternionTrack('pelvis',times,[[-.04,0,-.18],[-.08,0,-.25],[-.04,0,-.18]]),quaternionTrack('chest',times,[[-.12,-.08,-.27],[-.16,-.12,-.34],[-.12,-.08,-.27]]),quaternionTrack('head',times,[[.04,.12,.12],[.02,.16,.16],[.04,.12,.12]]),quaternionTrack('upperArm.L',times,[[-.02,.08,.1],[-.04,.12,.14],[-.02,.08,.1]]),quaternionTrack('upperArm.R',times,[[.08,-.1,.16],[.11,-.14,.22],[.08,-.1,.16]]),quaternionTrack('upperLeg.L',times,[[.08,0,.06],[.13,0,.1],[.08,0,.06]]),quaternionTrack('upperLeg.R',times,[[-.04,0,.03],[-.07,0,.05],[-.04,0,.03]])]),
    cycle('boost',[quaternionTrack('pelvis',times,[[-.12,0,0],[-.16,0,0],[-.12,0,0]]),quaternionTrack('spine',times,[[-.18,0,0],[-.23,0,0],[-.18,0,0]]),quaternionTrack('chest',times,[[-.24,0,0],[-.29,0,0],[-.24,0,0]]),quaternionTrack('head',times,[[.12,0,0],[.1,0,0],[.12,0,0]]),quaternionTrack('upperArm.L',times,[[-.08,0,-.035],[-.12,0,-.045],[-.08,0,-.035]]),quaternionTrack('upperArm.R',times,[[-.08,0,.035],[-.12,0,.045],[-.08,0,.035]]),quaternionTrack('foreArm.L',times,[[.06,0,0],[.09,0,0],[.06,0,0]]),quaternionTrack('foreArm.R',times,[[.06,0,0],[.09,0,0],[.06,0,0]])]),
    cycle('landing',[positionTrack('pelvis',times,[basePelvis,[basePelvis[0],basePelvis[1]-.12,basePelvis[2]+.04],[...basePelvis]]),quaternionTrack('spine',times,[[-.1,0,0],[.14,0,0],[-.1,0,0]]),quaternionTrack('chest',times,[[-.12,0,0],[.08,0,0],[-.12,0,0]]),quaternionTrack('upperLeg.L',times,[[0,0,0],[.22,0,.04],[0,0,0]]),quaternionTrack('upperLeg.R',times,[[0,0,0],[.22,0,-.04],[0,0,0]]),quaternionTrack('lowerLeg.L',times,[[0,0,0],[-.18,0,0],[0,0,0]]),quaternionTrack('lowerLeg.R',times,[[0,0,0],[-.18,0,0],[0,0,0]])]),
    cycle('victory',[quaternionTrack('chest',times,[[0,0,0],[0,.1,-.08],[0,0,0]]),quaternionTrack('upperArm.L',times,[[0,0,0],[-1.65,0,-.35],[0,0,0]]),quaternionTrack('foreArm.L',times,[[0,0,0],[-.45,0,-.2],[0,0,0]]),quaternionTrack('upperArm.R',times,[[0,0,0],[-.35,.1,.25],[0,0,0]]),quaternionTrack('foreArm.R',times,[[0,0,0],[-.75,0,.12],[0,0,0]]),quaternionTrack('head',times,[[0,0,0],[-.08,.18,.05],[0,0,0]])]),
  ].map((clip,index)=>{clip.userData={authored:true,variation:s,index};return clip});
}

async function exportRider(rider){
  const {scene,clips}=createRiderScene(rider),result=await new GLTFExporter().parseAsync(scene,{binary:true,animations:clips,onlyVisible:true,trs:true,includeCustomExtensions:true});if(!(result instanceof ArrayBuffer))throw new Error(`Exporter did not return GLB for ${rider.id}`);const buffer=Buffer.from(result),file=path.join(outputRoot,`${rider.id}-lod0.glb`),hash=crypto.createHash('sha256').update(buffer).digest('hex');if(!dryRun){fs.mkdirSync(outputRoot,{recursive:true});fs.writeFileSync(file,buffer)}return{id:rider.id,file:path.relative(process.cwd(),file).replaceAll('\\','/'),bytes:buffer.length,sha256:hash,animations:requiredClips};
}

const riders=only?RIDERS.filter(rider=>rider.id===only):RIDERS;if(!riders.length)throw new Error(`Unknown rider: ${only}`);const records=[];for(const rider of riders){const record=await exportRider(rider);records.push(record);console.log(`${dryRun?'DRY':'WROTE'} ${record.id} ${(record.bytes/1024).toFixed(1)} KiB ${record.sha256}`)}
if(!dryRun&&records.length===RIDERS.length){
  const provenance={version:2,tool:'Tidal Racer project-authored Three.js GLB generator',authoringPass:'anatomical wet-gear v3',sourceScript:'scripts/generate-rider-glbs.mjs',license:'Project-authored original geometry; no third-party model or texture input',generatedAt:new Date().toISOString(),files:records};fs.writeFileSync(path.join(outputRoot,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
  const manifestFile=path.resolve('assets/manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));for(const record of records){const asset=manifest.assets.find(item=>item.id===`rider-${record.id}-hero`);if(!asset)throw new Error(`Missing manifest entry for ${record.id}`);asset.sha256=record.sha256}manifest.characterRig.fallback='v18 project-authored anatomical wet-gear v5 articulated rig';fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');console.log('SYNCED assets/manifest.json rider hashes and V5 fallback metadata');
}else if(!dryRun)console.log('SKIPPED provenance and manifest sync because this was a partial rider export');
console.log(`${records.length}/${riders.length} rider GLBs generated with ${requiredClips.length} authored clips each`);
