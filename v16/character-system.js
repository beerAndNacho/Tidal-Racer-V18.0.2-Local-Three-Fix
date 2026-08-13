import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getCharacterProfile } from './character-catalog.js';

const lerp=THREE.MathUtils.lerp;
const clamp=THREE.MathUtils.clamp;
const neopreneTexture=new THREE.TextureLoader().load('./assets/textures/neoprene-suit-v1.webp',texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(4,6);texture.anisotropy=8;texture.needsUpdate=true});

const matPhysical=(color,rough=.48,metal=.04,clear=.15)=>new THREE.MeshPhysicalMaterial({color,roughness:rough,metalness:metal,clearcoat:clear,clearcoatRoughness:.18,envMapIntensity:.78});
const matStandard=(color,rough=.75,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
function neopreneMaterial(color){const tint=new THREE.Color(color).lerp(new THREE.Color(0xffffff),.2);return new THREE.MeshPhysicalMaterial({color:tint,map:neopreneTexture,roughness:.46,metalness:.012,clearcoat:.34,clearcoatRoughness:.31,sheen:.24,sheenRoughness:.68,sheenColor:tint.clone().lerp(new THREE.Color(0xb8e9f1),.12),envMapIntensity:.82,emissive:new THREE.Color(color),emissiveIntensity:.022})}

function mesh(parent,geometry,material,name,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){
  const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.scale.set(...scale);m.rotation.set(...rot);m.castShadow=/pelvisMesh|abdomen|chestMesh|lifeVest|neckMesh|skull|jaw|helmetShell|hairCap|upperArm\..*Mesh|foreArm\..*Mesh|upperLeg\..*Mesh|lowerLeg\..*Mesh|boot\.[LR]/.test(name);m.receiveShadow=m.castShadow;parent.add(m);return m;
}
function joint(parent,name,pos=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);return g}
function taperedLimbGeometry(length,radiusTop,radiusBottom,detail='hero'){
  const radial=detail==='hero'?20:10,shoulder=.08,ankle=.07,points=[
    new THREE.Vector2(0,0),new THREE.Vector2(radiusTop*.72,0),new THREE.Vector2(radiusTop,-shoulder),
    new THREE.Vector2(radiusTop*.98,-length*.22),new THREE.Vector2(lerp(radiusTop,radiusBottom,.58),-length*.62),
    new THREE.Vector2(radiusBottom,-length+ankle),new THREE.Vector2(radiusBottom*.7,-length),new THREE.Vector2(0,-length),
  ];
  return new THREE.LatheGeometry(points,radial);
}
function sculptedTorsoGeometry(height,widthBottom,widthMid,widthTop,depthBottom,depthTop,detail='hero'){
  const radial=detail==='hero'?24:12,rings=detail==='hero'?9:6,vertices=[],indices=[];
  for(let ring=0;ring<rings;ring++){
    const t=ring/(rings-1),lower=t<.5?lerp(widthBottom,widthMid,t*2):lerp(widthMid,widthTop,(t-.5)*2),chest=Math.sin(t*Math.PI)*.035,width=lower+chest,depth=lerp(depthBottom,depthTop,t)+Math.sin(t*Math.PI)*.028;
    for(let side=0;side<radial;side++){
      const a=side/radial*Math.PI*2,sx=Math.sin(a),cz=Math.cos(a),front=cz<0?1.1:.94;
      vertices.push(sx*width*.5,(t-.5)*height,cz*depth*.5*front);
    }
    if(ring<rings-1)for(let side=0;side<radial;side++){const next=(side+1)%radial,a=ring*radial+side,b=ring*radial+next,c=(ring+1)*radial+side,d=(ring+1)*radial+next;indices.push(a,c,b,b,c,d)}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function segment(parent,name,length,radius,material,detail='hero'){
  const p=joint(parent,name),factor=name.includes('upperLeg')?.69:name.includes('lowerLeg')?.74:name.includes('foreArm')?.72:.79;
  const body=mesh(p,taperedLimbGeometry(length,radius,radius*factor,detail),material,name+'Mesh');
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
    const pupilMat=matPhysical(0x050709,.08,.01,.82),catchlightMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
    for(const side of[-1,1]){
      const eye=mesh(head,new THREE.SphereGeometry(.047,16,10),eyeMat,'eye'+side,[side*.142,.043,-.402],[1.12,.62,.34]);
      const iris=mesh(eye,new THREE.SphereGeometry(.021,12,8),irisMat,'iris'+side,[0,0,-.043],[1,1,.42]);
      mesh(iris,new THREE.SphereGeometry(.0105,10,7),pupilMat,'pupil'+side,[0,0,-.019],[1,1,.32]);
      mesh(iris,new THREE.SphereGeometry(.0038,7,5),catchlightMat,'eyeCatchlight'+side,[-.005,.006,-.022],[1,1,.2]);face.eyes.push(eye);
      const brow=mesh(head,new THREE.BoxGeometry(.19,.028,.025),hairMat,'brow'+side,[side*.145,.145,-.414],[1,profile.face.brow,1],[0,0,side*.05]);face.brows.push(brow);
    }
    const nose=mesh(head,new THREE.CapsuleGeometry(.035,.105,6,10),skin,'nose',[0,-.015,-.447],[profile.face.nose,.9,profile.face.nose],[Math.PI/2,0,0]);
    const nostrilMat=matStandard(0x3d2423,.78);for(const side of[-1,1])mesh(head,new THREE.SphereGeometry(.009,8,5),nostrilMat,'nostril'+side,[side*.025,-.078,-.478],[1,.55,.35]);
    const lipMat=matPhysical(0x824c4f,.46,.01,.24),mouth=mesh(head,new THREE.CapsuleGeometry(.013,.10,4,10),lipMat,'mouth',[0,-.165,-.41],[1,1,.55],[0,0,Math.PI/2]);
    mesh(head,new THREE.CapsuleGeometry(.009,.074,4,10),lipMat,'lowerLip',[0,-.181,-.407],[1,1,.46],[0,0,Math.PI/2]);
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
  const shell=mesh(group,new THREE.SphereGeometry(.50,detail==='hero'?30:16,detail==='hero'?20:11,0,Math.PI*2,0,Math.PI*.72),helmetMat,'helmetShell',[0,.04,.015],[.94,1.01,.96]);
  const dark=new THREE.MeshPhysicalMaterial({color:0x07131c,roughness:.06,metalness:.08,transmission:.48,transparent:true,opacity:.78,clearcoat:1});
  const visor=mesh(group,new RoundedBoxGeometry(.70,.18,.055,5,.045),dark,'visor',[0,.07,-.482],[1,1,1],[-.08,0,0]);
  if(style.includes('full')){
    mesh(group,new RoundedBoxGeometry(.64,.16,.18,4,.055),helmetMat,'chinGuard',[0,-.29,-.39],[1,1,1],[-.12,0,0]);
    mesh(group,new RoundedBoxGeometry(.08,.42,.17,3,.035),helmetMat,'helmetSideL',[-.42,-.08,-.04]);mesh(group,new RoundedBoxGeometry(.08,.42,.17,3,.035),helmetMat,'helmetSideR',[.42,-.08,-.04]);
  }
  if(style.includes('aero'))mesh(group,new THREE.ConeGeometry(.11,.42,10),helmetMat,'aeroFin',[0,.42,.23],[1,1,1],[-.65,0,0]);
  if(style.includes('heavy')){shell.scale.multiplyScalar(1.06);mesh(group,new THREE.BoxGeometry(.84,.08,.32),helmetMat,'heavyBrow',[0,.24,-.28]);}
  if(detail==='hero'){
    const ventMat=matPhysical(0x111b21,.3,.24,.62);
    mesh(group,new RoundedBoxGeometry(.23,.085,.035,4,.018),ventMat,'helmetRearVent',[0,.19,.47],[1,1,1],[-.08,0,0]);
    mesh(group,new RoundedBoxGeometry(.075,.35,.028,3,.014),ventMat,'helmetRearSpine',[0,.02,.486],[1,1,1],[.08,0,0]);
    mesh(group,new THREE.TorusGeometry(.435,.026,8,36),ventMat,'helmetRim',[0,-.16,.02],[1,1,.94],[Math.PI/2,0,0]);
  }
  return{group,shell,visor};
}
function addGear(chest,pelvis,profile,suitMat,accentMat,detail){
  const gear=profile.gear;
  const vest=mesh(chest,sculptedTorsoGeometry(.86,.72,.94,.96,.36,.42,detail),accentMat,'lifeVest',[0,-.05,-.015],[profile.build.chest,1,1],[.06,0,0]);
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
  if(detail==='hero'){
    const panelMat=matPhysical(0x172127,.38,.14,.48);
    mesh(chest,new RoundedBoxGeometry(.66,.52,.075,4,.025),suitMat,'vestBackPanel',[0,-.02,.265],[1,1,1],[.02,0,0]);
    for(const side of[-1,1])mesh(chest,new RoundedBoxGeometry(.075,.66,.055,3,.018),accentMat,'vestBackStrap'+side,[side*.27,.02,.315],[1,1,1],[0,0,side*.04]);
    mesh(chest,new RoundedBoxGeometry(.29,.37,.055,4,.02),panelMat,'vestBackSpine',[0,-.015,.323]);
    mesh(chest,new RoundedBoxGeometry(.38,.065,.045,3,.016),accentMat,'vestBackYoke',[0,.25,.33]);
  }
  return{vest,belt};
}

export function buildRiderRig(rider,visual={},options={}){
  const detail=options.detail||'hero',profile=getCharacterProfile(rider.id);
  const root=new THREE.Group();root.name='riderRig';
  const skinColor=new THREE.Color(rider.skin),skin=new THREE.MeshPhysicalMaterial({color:skinColor,roughness:.54,metalness:0,clearcoat:.09,clearcoatRoughness:.56,sheen:.16,sheenRoughness:.72,sheenColor:skinColor.clone().lerp(new THREE.Color(0xffc9b8),.18),specularIntensity:.38,envMapIntensity:.7}),suit=neopreneMaterial(visual.suit||rider.suit),accent=matPhysical(visual.helmet||rider.accent,.22,.18,.85),hairMat=matStandard(profile.hair.color,.72,.01),bootMat=matPhysical(0x10161b,.34,.18,.45),gloveMat=matPhysical(0x151d23,.32,.14,.5);
  const scale=profile.build.height;
  root.scale.setScalar(scale);
  const pelvis=joint(root,'pelvis',[0,1.22,.45]);
  mesh(pelvis,new RoundedBoxGeometry(.70,.43,.48,detail==='hero'?6:3,.12),suit,'pelvisMesh',[0,-.015,0],[profile.build.hip,1,.92]);
  const spine=joint(pelvis,'spine',[0,.25,-.02]);
  mesh(spine,sculptedTorsoGeometry(.72,.50,.56,.64,.36,.42,detail),suit,'abdomen',[0,.36,0],[profile.build.waist,1,.92]);
  const chest=joint(spine,'chest',[0,.72,-.02]);
  mesh(chest,sculptedTorsoGeometry(.72,.70,.86,.92,.42,.50,detail),suit,'chestMesh',[0,.17,0],[profile.build.shoulder,profile.build.chest,.94]);
  if(detail==='hero'){mesh(chest,new RoundedBoxGeometry(.64,.14,.39,4,.055),suit,'trapezius',[0,.53,-.005],[profile.build.shoulder,1,.9]);mesh(spine,new RoundedBoxGeometry(.54,.18,.39,4,.06),suit,'waistTransition',[0,.04,0],[profile.build.waist,1,.9])}
  addGear(chest,pelvis,profile,suit,accent,detail);
  const neck=joint(chest,'neck',[0,.66,-.02]);mesh(neck,new THREE.CylinderGeometry(.15,.18,.26,detail==='hero'?12:8),skin,'neckMesh',[0,.13,0]);
  if(detail==='hero'){mesh(neck,new THREE.TorusGeometry(.19,.045,8,24),suit,'sealedCollar',[0,.035,0],[1,1,.86],[Math.PI/2,0,0]);mesh(chest,new RoundedBoxGeometry(.68,.12,.08,4,.035),accent,'shoulderYoke',[0,.47,.27])}
  const face=faceGeometry(profile,detail,skin,hairMat,accent);face.head.position.set(0,.42,-.02);face.head.scale.multiplyScalar(.68);neck.add(face.head);
  const helmet=buildHelmet(face.head,profile,accent,detail);
  const arms={},legs={};
  for(const side of[-1,1]){
    const key=side<0?'L':'R';
    const shoulder=joint(chest,'shoulder.'+key,[side*.49*profile.build.shoulder,.38,-.02]);
    const upper=segment(shoulder,'upperArm.'+key,.74*profile.build.arm,.145*profile.build.muscle**.1,suit,detail);upper.pivot.rotation.z=side*.22;upper.pivot.rotation.x=.84;
    const fore=segment(upper.end,'foreArm.'+key,.66*profile.build.arm,.122,suit,detail);fore.pivot.rotation.x=.34;fore.pivot.rotation.z=-side*.12;
    if(detail==='hero'){mesh(upper.pivot,new THREE.SphereGeometry(.142,16,12),suit,'deltoid.'+key,[0,-.095,0],[.96,1.13,.9]);mesh(upper.end,new THREE.SphereGeometry(.102,14,10),suit,'elbowVolume.'+key,[0,-.015,0],[1,.84,.96]);mesh(fore.end,new THREE.TorusGeometry(.108,.017,7,18),gloveMat,'gloveCuff.'+key,[0,-.015,0],[1,1,.86],[Math.PI/2,0,0])}
    const hand=mesh(fore.end,new RoundedBoxGeometry(.17,.25,.13,detail==='hero'?4:2,.045),gloveMat,'hand.'+key,[0,-.07,-.015],[.86,1,.82]);
    if(detail==='hero')mesh(hand,new THREE.CapsuleGeometry(.032,.105,4,7),gloveMat,'thumb.'+key,[side*.105,-.015,-.025],[1,1,1],[.28,0,side*.42]);
    arms[key]={shoulder,upper,fore,hand};
    const hip=joint(pelvis,'hip.'+key,[side*.27*profile.build.hip,-.12,.02]);
    const thigh=segment(hip,'upperLeg.'+key,.88*profile.build.leg,.184,suit,detail);thigh.pivot.rotation.x=.98;thigh.pivot.rotation.z=-side*.09;
    const shin=segment(thigh.end,'lowerLeg.'+key,.78*profile.build.leg,.154,suit,detail);shin.pivot.rotation.x=-.58;
    if(detail==='hero'){mesh(thigh.end,new THREE.SphereGeometry(.145,16,12),suit,'kneeVolume.'+key,[0,-.02,0],[1,.88,1]);mesh(shin.pivot,new RoundedBoxGeometry(.18,.34,.12,4,.045),accent,'shinGuard.'+key,[0,-.38,-.105],[.9,1,1],[-.08,0,0])}
    if(detail==='hero'){mesh(thigh.pivot,new RoundedBoxGeometry(.25,.16,.12,3,.04),accent,'kneePanel.'+key,[0,-.73,-.13],[.82,1,1],[-.12,0,0]);mesh(upper.pivot,new RoundedBoxGeometry(.20,.14,.10,3,.035),accent,'elbowPanel.'+key,[0,-.62,-.11],[.74,1,1])}
    const boot=mesh(shin.end,new RoundedBoxGeometry(.27,.20,.48,4,.06),bootMat,'boot.'+key,[0,-.07,-.15],[1,1,1],[-.1,0,0]);
    if(detail==='hero')mesh(boot,new RoundedBoxGeometry(.29,.045,.52,3,.018),gloveMat,'bootSole.'+key,[0,-.11,.015],[1,1,1],[0,0,0]);
    legs[key]={hip,thigh,shin,boot};
  }
  const rig={root,pelvis,spine,chest,neck,head:face.head,face,helmet,arms,legs,profile,detail,baseY:root.position.y,tail:face.tail,blinkSeed:profile.seed*.83,expression:0,lastGripCheck:-99,motionBlend:{boost:0,drift:0,airborne:0,landing:0,turn:0}};
  root.userData.riderRig=rig;root.userData.visualTier='procedural-pbr-v4-anatomical';
  return root;
}

function smoothRot(obj,x,y,z,a=.16){obj.rotation.x=lerp(obj.rotation.x,x,a);obj.rotation.y=lerp(obj.rotation.y,y,a);obj.rotation.z=lerp(obj.rotation.z,z,a)}
function solveGripContact(craft,rig,strength=.34){
  if(!craft?.userData?.grips)return;craft.updateWorldMatrix(true,true);
  for(const key of['L','R']){const hand=rig.arms[key].hand,grip=craft.userData.grips[key],target=grip.getWorldPosition(new THREE.Vector3());hand.parent.updateWorldMatrix(true,false);hand.position.lerp(hand.parent.worldToLocal(target),strength)}
}
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
  const p=rig.profile,t=state.time||0,max=Math.max(1,state.maxSpeed||45),speedN=clamp(Math.abs(state.speed||0)/max,0,1.35),steer=clamp(state.steer||0,-1,1),drift=!!state.drift,boost=!!state.boost,menu=!!state.menu,victory=!!state.victory,vertical=state.vertical||0;
  const targetBlend={boost:boost?1:0,drift:drift?1:0,airborne:Math.abs(vertical)>1.35?clamp(Math.abs(vertical)/8,0,1):0,landing:vertical<-.75?clamp(-vertical/9,0,1):0,turn:clamp(Math.abs(steer)*1.25,0,1)};
  for(const key of Object.keys(rig.motionBlend))rig.motionBlend[key]=lerp(rig.motionBlend[key],targetBlend[key],key==='landing'?.24:.13);
  const blend=rig.motionBlend,wave=clamp(state.wave||0,-1,1),breath=menu?Math.sin(t*1.45+p.seed)*.5+.5:0,bob=Math.sin(t*4.2+p.seed)*(.018+.035*speedN)+wave*.035;
  rig.root.position.y=lerp(rig.root.position.y,bob-blend.landing*.105+blend.airborne*.035,.22);
  rig.chest.scale.y=lerp(rig.chest.scale.y,1+breath*.012,.08);rig.chest.position.y=lerp(rig.chest.position.y,.72+breath*.008,.08);
  const forwardLean=menu?-.08:-(.16+.21*speedN)*p.stance.lean-blend.boost*.08+blend.airborne*.035;
  smoothRot(rig.pelvis,forwardLean*.45-blend.landing*.12,0,-steer*(drift?.26:.12)+wave*.08,.16);
  smoothRot(rig.spine,forwardLean*.48-blend.landing*.08,-steer*.055,-steer*(drift?.18:.08)+wave*.06,.16);
  smoothRot(rig.chest,forwardLean*.42+blend.airborne*.06,-steer*.08,-steer*(drift?.22:.1)+wave*.07,.16);
  smoothRot(rig.neck,-forwardLean*.18,menu?Math.sin(t*.42+p.seed)*.16:-steer*.12,steer*.05,.12);
  smoothRot(rig.head,menu?Math.sin(t*.35+p.seed)*.035:wave*.025,menu?Math.sin(t*.29+p.seed)*.18:-steer*.09,-steer*.025,.1);
  const armLift=.60+.055*speedN+blend.boost*.03,elbow=1.14-.08*speedN+(p.stance.elbow-1)*.08+blend.landing*.04;
  smoothRot(rig.arms.L.upper.pivot,armLift+steer*.09,-.12,-.20-.075*steer,.16);smoothRot(rig.arms.R.upper.pivot,armLift-steer*.09,.12,.20-.075*steer,.16);
  smoothRot(rig.arms.L.fore.pivot,elbow,0,-.045-.035*steer,.16);smoothRot(rig.arms.R.fore.pivot,elbow,0,.045-.035*steer,.16);
  rig.arms.L.hand.rotation.z=lerp(rig.arms.L.hand.rotation.z,-.08-steer*.11,.16);rig.arms.R.hand.rotation.z=lerp(rig.arms.R.hand.rotation.z,.08-steer*.11,.16);
  const knee=.94+.12*(drift?1:0)*p.stance.knee+blend.landing*.34-blend.airborne*.08;
  smoothRot(rig.legs.L.thigh.pivot,knee+steer*.05,0,.08+.06*steer,.14);smoothRot(rig.legs.R.thigh.pivot,knee-steer*.05,0,-.08+.06*steer,.14);
  smoothRot(rig.legs.L.shin.pivot,-.56-.08*speedN,0,0,.14);smoothRot(rig.legs.R.shin.pivot,-.56-.08*speedN,0,0,.14);
  if(rig.tail){rig.tail.rotation.z=lerp(rig.tail.rotation.z,-steer*.32+Math.sin(t*3+p.seed)*.1,.13);rig.tail.rotation.x=lerp(rig.tail.rotation.x,.35+speedN*.35,.12)}
  if(rig.face.eyes.length){const blink=Math.pow(Math.max(0,Math.sin(t*.72+rig.blinkSeed)),28);for(const [index,eye] of rig.face.eyes.entries()){eye.scale.y=lerp(eye.scale.y,Math.max(.08,1-blink*.95),.45);eye.rotation.y=lerp(eye.rotation.y,menu?Math.sin(t*.31+p.seed)*.08:-steer*.055,.12);eye.rotation.x=lerp(eye.rotation.x,blend.airborne*.035+(index?-.004:.004),.12)}}
  if(rig.face.mouth){rig.expression=lerp(rig.expression,blend.boost*.8+blend.airborne*.35,.08);rig.face.mouth.scale.x=lerp(rig.face.mouth.scale.x,1+rig.expression*.16,.1);rig.face.mouth.rotation.z=lerp(rig.face.mouth.rotation.z,Math.PI/2-steer*.025,.1)}
  for(const [index,brow] of rig.face.brows.entries())brow.rotation.z=lerp(brow.rotation.z,(index?.05:-.05)+(blend.boost+.45*blend.turn)*(.045*(index?1:-1)),.1);
  if(victory)victoryPose(rig,p.victory,t);
  craft.userData.handlebar.rotation.z=lerp(craft.userData.handlebar.rotation.z,-steer*.24,.18);
  if(!victory&&rig.detail==='hero')solveGripContact(craft,rig,menu?.22:.38);
  if(craft.userData.suspension){craft.userData.suspension.position.y=lerp(craft.userData.suspension.position.y,wave*.08+bob*.3-blend.landing*.085,.18)}
  const animationState=victory?'victory':menu?'menu-idle':blend.landing>.28?'landing':blend.airborne>.28?'airborne':boost?'boost':drift?'drift':Math.abs(steer)>.58?'hard-turn':'ride';
  craft.userData.animationState=animationState;if(rig.detail==='hero'&&typeof document!=='undefined')document.body.dataset.riderAnimation=animationState;
  if(rig.detail==='hero'&&craft.userData.grips&&t-rig.lastGripCheck>.2){rig.lastGripCheck=t;craft.updateWorldMatrix(true,true);const lh=rig.arms.L.hand.getWorldPosition(new THREE.Vector3()),rh=rig.arms.R.hand.getWorldPosition(new THREE.Vector3()),lg=craft.userData.grips.L.getWorldPosition(new THREE.Vector3()),rg=craft.userData.grips.R.getWorldPosition(new THREE.Vector3()),ld=lg.clone().sub(lh),rd=rg.clone().sub(rh),error=(ld.length()+rd.length())*.5;craft.userData.gripError=error;if(typeof document!=='undefined'){document.body.dataset.riderGripError=error.toFixed(3);document.body.dataset.riderGripDelta=[ld.x,ld.y,ld.z,rd.x,rd.y,rd.z].map(v=>v.toFixed(3)).join(',')}}
}
