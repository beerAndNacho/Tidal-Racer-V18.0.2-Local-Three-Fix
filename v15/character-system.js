import * as THREE from 'three';
import { getCharacterProfile } from './character-catalog.js';

const lerp=THREE.MathUtils.lerp;
const clamp=THREE.MathUtils.clamp;

const matPhysical=(color,rough=.48,metal=.04,clear=.15)=>new THREE.MeshPhysicalMaterial({color,roughness:rough,metalness:metal,clearcoat:clear,clearcoatRoughness:.18,envMapIntensity:1.2});
const matStandard=(color,rough=.75,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});

function mesh(parent,geometry,material,name,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){
  const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function joint(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g}
function segment(parent,name,length,radius,material,detail='hero'){
  const p=joint(parent,name),radial=detail==='hero'?10:7,cap=detail==='hero'?6:4;
  const body=mesh(p,new THREE.CapsuleGeometry(radius,Math.max(.02,length-radius*2),cap,radial),material,name+'Mesh',[0,-length*.5,0]);
  const end=joint(p,name+'End',[0,-length,0]);return{pivot:p,mesh:body,end};
}
function faceGeometry(profile,detail,skin,hairMat,accent){
  const head=joint(new THREE.Group(),'head');
  const hs=profile.face.head;
  const skull=mesh(head,new THREE.SphereGeometry(.43,detail==='hero'?24:14,detail==='hero'?18:10),skin,'skull',[0,0,0],hs);
  const jaw=mesh(head,new THREE.SphereGeometry(.31,detail==='hero'?18:10,detail==='hero'?12:8),skin,'jaw',[0,-.17,-.015],[profile.face.jaw,.72,.92]);
  const ears=[];for(const side of[-1,1])ears.push(mesh(head,new THREE.SphereGeometry(.075,10,8),skin,'ear'+side,[side*.42,-.01,.015],[.65,1,.55]));
  const face={head,skull,jaw,ears,eyes:[],brows:[],hair:[],tail:null};
  if(detail==='hero'){
    const eyeMat=new THREE.MeshPhysicalMaterial({color:0xf7f4ef,roughness:.18,clearcoat:.8});
    const irisMat=matPhysical(accent,.16,.02,.65);
    for(const side of[-1,1]){
      const eye=mesh(head,new THREE.SphereGeometry(.058,14,10),eyeMat,'eye'+side,[side*.145,.04,-.397],[1.15,.66,.38]);
      mesh(eye,new THREE.SphereGeometry(.028,12,8),irisMat,'iris'+side,[0,0,-.052],[1,1,.45]);face.eyes.push(eye);
      const brow=mesh(head,new THREE.BoxGeometry(.19,.028,.025),hairMat,'brow'+side,[side*.145,.145,-.414],[1,profile.face.brow,1],[0,0,side*.05]);face.brows.push(brow);
    }
    const nose=mesh(head,new THREE.ConeGeometry(.065,.22,10),skin,'nose',[0,-.005,-.455],[profile.face.nose,1,profile.face.nose],[Math.PI/2,0,0]);
    const mouth=mesh(head,new THREE.BoxGeometry(.18,.025,.022),matStandard(0x7d3e3f,.55),'mouth',[0,-.17,-.405],[.8,1,1]);
    face.nose=nose;face.mouth=mouth;
  }
  buildHair(head,profile,hairMat,face,detail);
  return face;
}
function buildHair(head,profile,hairMat,face,detail){
  const style=profile.hair.style;
  const cap=()=>mesh(head,new THREE.SphereGeometry(.445,detail==='hero'?20:12,detail==='hero'?14:8,0,Math.PI*2,0,Math.PI*.54),hairMat,'hairCap',[0,.075,.025],[1.02,1.02,1.02]);
  if(style==='close'||style==='undercut'){face.hair.push(cap());return}
  if(['bob','sharp-bob','wavy','windswept','side-shave'].includes(style)){
    face.hair.push(cap());
    for(const side of[-1,1])face.hair.push(mesh(head,new THREE.CapsuleGeometry(.10,.35,5,8),hairMat,'hairSide'+side,[side*.37,-.08,.05],[style==='sharp-bob'?.72:1,1,1],[0,0,side*.08]));
    if(style==='wavy')for(let i=0;i<4;i++)face.hair.push(mesh(head,new THREE.SphereGeometry(.13,10,8),hairMat,'curl'+i,[-.24+i*.16,-.18,.18],[1,1.25,1]));
    if(style==='windswept')face.hair.push(mesh(head,new THREE.ConeGeometry(.12,.46,8),hairMat,'windTuft',[.18,.34,.12],[1,1,1],[.15,0,-.55]));
    return;
  }
  if(['ponytail','long-tie'].includes(style)){face.hair.push(cap());const t=mesh(head,new THREE.CapsuleGeometry(.11,detail==='hero'?.78:.48,5,8),hairMat,'hairTail',[0,-.18,.34],[style==='long-tie'?1.25:1,1,1],[.45,0,0]);face.hair.push(t);face.tail=t;return}
  if(['high-bun','braided-bun'].includes(style)){face.hair.push(cap());face.hair.push(mesh(head,new THREE.SphereGeometry(.20,12,10),hairMat,'hairBun',[0,.47,.12],[1,1.05,1]));if(style==='braided-bun'&&detail==='hero')for(let i=0;i<5;i++)face.hair.push(mesh(head,new THREE.TorusGeometry(.22+i*.012,.025,6,18),hairMat,'braidRing'+i,[0,.45,.12],[1,1,1],[Math.PI/2,0,0]));return}
  if(['braid','locs','curls'].includes(style)){face.hair.push(cap());const count=detail==='hero'?7:4;for(let i=0;i<count;i++){const a=(i/(count-1)-.5)*1.6,t=mesh(head,new THREE.CapsuleGeometry(.045,.48+(i%3)*.08,4,6),hairMat,'strand'+i,[Math.sin(a)*.34,-.18,.15+Math.cos(a)*.19],[1,1,1],[.18,0,-a*.35]);face.hair.push(t);if(i===count-1)face.tail=t}return}
  face.hair.push(cap());
}
function buildHelmet(head,profile,helmetMat,detail){
  const group=joint(head,'helmet');
  const style=profile.helmet;
  const shell=mesh(group,new THREE.SphereGeometry(.50,detail==='hero'?22:14,detail==='hero'?16:10,0,Math.PI*2,0,Math.PI*.72),helmetMat,'helmetShell',[0,.04,.015],[1.03,1.02,1.04]);
  const dark=new THREE.MeshPhysicalMaterial({color:0x07131c,roughness:.06,metalness:.08,transmission:.48,transparent:true,opacity:.78,clearcoat:1});
  const visor=mesh(group,new THREE.BoxGeometry(.70,.18,.055),dark,'visor',[0,.07,-.492],[1,1,1],[-.08,0,0]);
  if(style.includes('full')){
    mesh(group,new THREE.BoxGeometry(.64,.16,.18),helmetMat,'chinGuard',[0,-.29,-.39],[1,1,1],[-.12,0,0]);
    mesh(group,new THREE.BoxGeometry(.08,.42,.17),helmetMat,'helmetSideL',[-.45,-.08,-.04]);mesh(group,new THREE.BoxGeometry(.08,.42,.17),helmetMat,'helmetSideR',[.45,-.08,-.04]);
  }
  if(style.includes('aero'))mesh(group,new THREE.ConeGeometry(.11,.42,10),helmetMat,'aeroFin',[0,.42,.23],[1,1,1],[-.65,0,0]);
  if(style.includes('heavy')){shell.scale.multiplyScalar(1.06);mesh(group,new THREE.BoxGeometry(.84,.08,.32),helmetMat,'heavyBrow',[0,.24,-.28]);}
  return{group,shell,visor};
}
function addGear(chest,pelvis,profile,suitMat,accentMat,detail){
  const gear=profile.gear;
  const vest=mesh(chest,new THREE.BoxGeometry(.94,.86,.34),accentMat,'lifeVest',[0,-.05,-.13],[profile.build.chest,1,1],[.06,0,0]);
  vest.material=accentMat;
  const belt=mesh(pelvis,new THREE.TorusGeometry(.40,.055,7,22),accentMat,'belt',[0,.03,0],[profile.build.waist,1,.83],[Math.PI/2,0,0]);
  if(['armored-vest','guardian','hunter','street-armored'].includes(gear)){
    for(const side of[-1,1])mesh(chest,new THREE.BoxGeometry(.25,.14,.38),accentMat,'shoulderPad'+side,[side*.55,.28,-.02],[1.25,1,1],[0,0,side*.15]);
    mesh(chest,new THREE.BoxGeometry(.46,.32,.09),accentMat,'chestPlate',[0,.07,-.34]);
  }
  if(['technical','utility-tech','precision','couture-tech'].includes(gear)&&detail==='hero'){
    for(let i=0;i<3;i++)mesh(chest,new THREE.BoxGeometry(.17,.18,.08),accentMat,'utility'+i,[-.25+i*.25,-.13,-.34]);
  }
  if(gear==='asymmetric')mesh(chest,new THREE.BoxGeometry(.27,.76,.10),accentMat,'asymPanel',[-.28,-.02,-.33],[1,1,1],[0,0,-.11]);
  return{vest,belt};
}

export function buildRiderRig(rider,visual={},options={}){
  const detail=options.detail||'hero',profile=getCharacterProfile(rider.id);
  const root=new THREE.Group();root.name='riderRig';
  const skin=matPhysical(rider.skin,.62,.01,.08),suit=matPhysical(visual.suit||rider.suit,.3,.08,.55),accent=matPhysical(visual.helmet||rider.accent,.22,.18,.85),hairMat=matStandard(profile.hair.color,.72,.01),bootMat=matPhysical(0x10161b,.34,.18,.45),gloveMat=matPhysical(0x151d23,.32,.14,.5);
  const scale=profile.build.height;
  root.scale.setScalar(scale);
  const pelvis=joint(root,'pelvis',[0,1.22,.45]);
  mesh(pelvis,new THREE.SphereGeometry(.40,detail==='hero'?18:12,detail==='hero'?14:8),suit,'pelvisMesh',[0,0,0],[profile.build.hip,.65,.86]);
  const spine=joint(pelvis,'spine',[0,.25,-.02]);
  mesh(spine,new THREE.CapsuleGeometry(.30,.56,detail==='hero'?6:4,detail==='hero'?10:7),suit,'abdomen',[0,.36,0],[profile.build.waist,1,.88]);
  const chest=joint(spine,'chest',[0,.72,-.02]);
  mesh(chest,new THREE.SphereGeometry(.48,detail==='hero'?20:12,detail==='hero'?16:9),suit,'chestMesh',[0,.18,0],[profile.build.shoulder,profile.build.chest,.76]);
  addGear(chest,pelvis,profile,suit,accent,detail);
  const neck=joint(chest,'neck',[0,.66,-.02]);mesh(neck,new THREE.CylinderGeometry(.15,.18,.26,detail==='hero'?12:8),skin,'neckMesh',[0,.13,0]);
  const face=faceGeometry(profile,detail,skin,hairMat,accent);face.head.position.set(0,.45,-.02);neck.add(face.head);
  const helmet=buildHelmet(face.head,profile,accent,detail);
  const arms={},legs={};
  for(const side of[-1,1]){
    const key=side<0?'L':'R';
    const shoulder=joint(chest,'shoulder.'+key,[side*.49*profile.build.shoulder,.38,-.02]);
    const upper=segment(shoulder,'upperArm.'+key,.74*profile.build.arm,.13*profile.build.muscle**.12,suit,detail);upper.pivot.rotation.z=side*.22;upper.pivot.rotation.x=.84;
    const fore=segment(upper.end,'foreArm.'+key,.66*profile.build.arm,.115,skin,detail);fore.pivot.rotation.x=.34;fore.pivot.rotation.z=-side*.12;
    const hand=mesh(fore.end,new THREE.SphereGeometry(.12,detail==='hero'?12:8,detail==='hero'?10:6),gloveMat,'hand.'+key,[0,-.04,0],[.82,1.18,.78]);
    arms[key]={shoulder,upper,fore,hand};
    const hip=joint(pelvis,'hip.'+key,[side*.27*profile.build.hip,-.12,.02]);
    const thigh=segment(hip,'upperLeg.'+key,.88*profile.build.leg,.17,suit,detail);thigh.pivot.rotation.x=.98;thigh.pivot.rotation.z=-side*.09;
    const shin=segment(thigh.end,'lowerLeg.'+key,.78*profile.build.leg,.145,suit,detail);shin.pivot.rotation.x=-.58;
    const boot=mesh(shin.end,new THREE.BoxGeometry(.27,.20,.48),bootMat,'boot.'+key,[0,-.07,-.15],[1,1,1],[-.1,0,0]);
    legs[key]={hip,thigh,shin,boot};
  }
  const rig={root,pelvis,spine,chest,neck,head:face.head,face,helmet,arms,legs,profile,detail,baseY:root.position.y,tail:face.tail,blinkSeed:profile.seed*.83,expression:0};
  root.userData.riderRig=rig;
  return root;
}

function smoothRot(obj,x,y,z,a=.16){obj.rotation.x=lerp(obj.rotation.x,x,a);obj.rotation.y=lerp(obj.rotation.y,y,a);obj.rotation.z=lerp(obj.rotation.z,z,a)}
function victoryPose(rig,type,t){
  const R=rig.arms.R,L=rig.arms.L,w=Math.sin(t*5)*.12;
  if(type==='salute'){smoothRot(R.upper.pivot,-1.25,-.2,-1.15,.18);smoothRot(R.fore.pivot,-1.28,0,.15,.18)}
  else if(type==='fist'){smoothRot(R.upper.pivot,-1.62,0,-.18,.2);smoothRot(R.fore.pivot,-.45,0,0,.2)}
  else if(type==='double-fist'){for(const a of[R,L]){smoothRot(a.upper.pivot,-1.48,0,a===R?-.25:.25,.2);smoothRot(a.fore.pivot,-.42,0,0,.2)}}
  else if(type==='wave'){smoothRot(R.upper.pivot,-1.35,0,-.45+w,.2);smoothRot(R.fore.pivot,-.72,0,.25+w,.2)}
  else if(type==='point'){smoothRot(R.upper.pivot,-.72,-.55,-.35,.2);smoothRot(R.fore.pivot,-.12,0,.02,.2)}
  else if(type==='crossed'){smoothRot(R.upper.pivot,.25,-.55,-.55,.2);smoothRot(R.fore.pivot,-1.5,.25,.2,.2);smoothRot(L.upper.pivot,.25,.55,.55,.2);smoothRot(L.fore.pivot,-1.5,-.25,-.2,.2)}
  else if(type==='chest'){smoothRot(R.upper.pivot,-.55,-.2,-.8,.2);smoothRot(R.fore.pivot,-1.35,0,.25,.2);smoothRot(L.upper.pivot,-.55,.2,.8,.2);smoothRot(L.fore.pivot,-1.35,0,-.25,.2)}
  else if(type==='dance'){smoothRot(R.upper.pivot,-1.2,0,-.5+w,.2);smoothRot(L.upper.pivot,-.45,0,.8-w,.2)}
}

export function animateRiderRig(craft,state={}){
  const rig=craft?.userData?.riderRig;if(!rig)return;
  const p=rig.profile,t=state.time||0,max=Math.max(1,state.maxSpeed||45),speedN=clamp(Math.abs(state.speed||0)/max,0,1.35),steer=clamp(state.steer||0,-1,1),drift=!!state.drift,boost=!!state.boost,menu=!!state.menu,victory=!!state.victory;
  const wave=clamp(state.wave||0,-1,1),bob=Math.sin(t*4.2+p.seed)*(.018+.035*speedN)+wave*.035;
  rig.root.position.y=lerp(rig.root.position.y,bob,.22);
  const forwardLean=menu?-.08:-(.16+.21*speedN)*p.stance.lean-(boost?.08:0);
  smoothRot(rig.pelvis,forwardLean*.45,0,-steer*(drift?.26:.12)+wave*.08,.16);
  smoothRot(rig.spine,forwardLean*.48,-steer*.055,-steer*(drift?.18:.08)+wave*.06,.16);
  smoothRot(rig.chest,forwardLean*.42,-steer*.08,-steer*(drift?.22:.1)+wave*.07,.16);
  smoothRot(rig.neck,-forwardLean*.18,menu?Math.sin(t*.42+p.seed)*.16:-steer*.12,steer*.05,.12);
  smoothRot(rig.head,menu?Math.sin(t*.35+p.seed)*.035:wave*.025,menu?Math.sin(t*.29+p.seed)*.18:-steer*.09,-steer*.025,.1);
  const armLift=.78+.16*speedN,elbow=.30+.16*speedN*p.stance.elbow;
  smoothRot(rig.arms.L.upper.pivot,armLift+steer*.08,-.12,.42+.10*steer,.16);smoothRot(rig.arms.R.upper.pivot,armLift-steer*.08,.12,-.42+.10*steer,.16);
  smoothRot(rig.arms.L.fore.pivot,elbow,0,.11,.16);smoothRot(rig.arms.R.fore.pivot,elbow,0,-.11,.16);
  const knee=.94+.12*(drift?1:0)*p.stance.knee;
  smoothRot(rig.legs.L.thigh.pivot,knee+steer*.05,0,.08+.06*steer,.14);smoothRot(rig.legs.R.thigh.pivot,knee-steer*.05,0,-.08+.06*steer,.14);
  smoothRot(rig.legs.L.shin.pivot,-.56-.08*speedN,0,0,.14);smoothRot(rig.legs.R.shin.pivot,-.56-.08*speedN,0,0,.14);
  if(rig.tail){rig.tail.rotation.z=lerp(rig.tail.rotation.z,-steer*.32+Math.sin(t*3+p.seed)*.1,.13);rig.tail.rotation.x=lerp(rig.tail.rotation.x,.35+speedN*.35,.12)}
  if(rig.face.eyes.length){const blink=Math.pow(Math.max(0,Math.sin(t*.72+rig.blinkSeed)),28);for(const eye of rig.face.eyes)eye.scale.y=lerp(eye.scale.y,Math.max(.08,1-blink*.95),.45)}
  if(victory)victoryPose(rig,p.victory,t);
  craft.userData.handlebar.rotation.z=lerp(craft.userData.handlebar.rotation.z,-steer*.24,.18);
  if(craft.userData.suspension){craft.userData.suspension.position.y=lerp(craft.userData.suspension.position.y,wave*.08+bob*.3,.18)}
}
