import * as THREE from 'three';

const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
const label=(ko,en)=>({ko,en});

export const CITY_DOCK=Object.freeze({
  water:{x:230,z:523},
  shore:{x:230,z:436},
  boardRadius:12,
  disembarkRadius:102,
});

const action=(id,name,cost,hours,effects,description)=>({id,name,cost,hours,effects,description});
export const CITY_FACILITIES=Object.freeze([
  {
    id:'home',name:label('마리나 아파트','MARINA APARTMENT'),type:label('내 집','HOME'),accent:0x65d8cf,
    exterior:{x:61,z:379},interior:{x:7000,z:7000},
    actions:[
      action('sleep',label('푹 자기','SLEEP UNTIL MORNING'),0,8,{energy:100,hunger:-16,mood:10},label('다음 날 오전 7시까지 휴식합니다.','Rest until 7 AM the next day.')),
      action('shower',label('샤워하기','TAKE A SHOWER'),0,.45,{hygiene:100,energy:6,mood:4},label('위생과 컨디션을 회복합니다.','Restore hygiene and condition.')),
      action('home_meal',label('집밥 만들기','COOK A HOME MEAL'),120,1,{hunger:46,energy:6,mood:5},label('식재료를 사용해 든든하게 식사합니다.','Cook a filling meal with groceries.')),
      action('watch_tv',label('TV로 경기 보기','WATCH THE RACES'),0,1.2,{mood:14,energy:3,hunger:-4},label('소파에서 휴식하며 경기를 봅니다.','Relax on the sofa and watch racing.')),
    ],
  },
  {
    id:'grocery',name:label('코스트 마켓','COAST MARKET'),type:label('생활 상점','GROCERY'),accent:0xe6b85f,
    exterior:{x:115,z:379},interior:{x:7044,z:7000},
    actions:[
      action('groceries',label('일주일 식재료','WEEKLY GROCERIES'),680,.35,{hunger:12,mood:3},label('집에서 사용할 신선 식재료를 삽니다.','Buy fresh groceries for home.')),
      action('snack',label('간단한 간식','QUICK SNACK'),190,.2,{hunger:18,energy:3},label('간단히 허기를 달랩니다.','Take the edge off your hunger.')),
      action('coffee',label('커피','FRESH COFFEE'),260,.25,{energy:13,mood:5,hunger:3},label('잠깐 쉬며 에너지를 보충합니다.','Take a short break and regain energy.')),
    ],
  },
  {
    id:'restaurant',name:label('마리나 키친','MARINA KITCHEN'),type:label('음식점','RESTAURANT'),accent:0xf08a63,
    exterior:{x:169,z:379},interior:{x:7088,z:7000},
    actions:[
      action('breakfast',label('해안식 아침','COASTAL BREAKFAST'),390,.65,{hunger:36,energy:10,mood:6},label('달걀, 빵, 과일과 커피가 나옵니다.','Eggs, bread, fruit and coffee.')),
      action('seafood_bowl',label('해산물 덮밥','SEAFOOD RICE BOWL'),780,.85,{hunger:62,energy:8,mood:12},label('현지 해산물로 만든 대표 메뉴입니다.','The signature bowl made with local seafood.')),
      action('chef_course',label('셰프 코스','CHEF TASTING COURSE'),1450,1.5,{hunger:82,mood:24,energy:9},label('천천히 즐기는 다섯 가지 코스입니다.','A relaxed five-course tasting menu.')),
    ],
  },
  {
    id:'bank',name:label('타이달 은행','TIDAL BANK'),type:label('은행','BANK'),accent:0x6da8ff,
    exterior:{x:277,z:379},interior:{x:7132,z:7000},
    actions:[
      action('deposit_1000',label('1,000 CR 입금','DEPOSIT 1,000 CR'),0,.15,{},label('지갑에서 계좌로 안전하게 옮깁니다.','Move funds from your wallet to your account.')),
      action('withdraw_1000',label('1,000 CR 출금','WITHDRAW 1,000 CR'),0,.15,{},label('계좌에서 생활비를 인출합니다.','Withdraw spending money from your account.')),
      action('deposit_5000',label('5,000 CR 입금','DEPOSIT 5,000 CR'),0,.2,{},label('큰 금액을 계좌에 보관합니다.','Secure a larger amount in your account.')),
      action('withdraw_5000',label('5,000 CR 출금','WITHDRAW 5,000 CR'),0,.2,{},label('큰 금액을 지갑으로 인출합니다.','Withdraw a larger amount into your wallet.')),
    ],
  },
  {
    id:'nightlife',name:label('블루 웨이브 라운지','BLUE WAVE LOUNGE'),type:label('라이브·클럽','NIGHTLIFE'),accent:0xb878ff,
    exterior:{x:385,z:379},interior:{x:7176,z:7000},
    actions:[
      action('live_music',label('라이브 공연','LIVE MUSIC SET'),900,2,{mood:28,energy:-9,hunger:-5},label('지역 밴드의 라이브 공연을 즐깁니다.','Enjoy a live set by a local band.')),
      action('dance',label('댄스 플로어','DANCE FLOOR'),650,1.5,{mood:24,energy:-16,hunger:-7,hygiene:-8},label('음악과 조명 속에서 춤을 춥니다.','Dance under the lights and music.')),
      action('arcade',label('레이싱 아케이드','RACING ARCADE'),450,1,{mood:17,energy:-5},label('친선 타임어택에 도전합니다.','Try a friendly arcade time trial.')),
      action('mocktail',label('시그니처 무알코올 칵테일','SIGNATURE MOCKTAIL'),280,.4,{mood:9,hunger:7,energy:3},label('바에서 천천히 음료를 즐깁니다.','Enjoy a relaxed drink at the bar.')),
    ],
  },
  {
    id:'gym',name:label('하버 피트니스','HARBOR FITNESS'),type:label('체육관','GYM'),accent:0x72ef9e,
    exterior:{x:439,z:379},interior:{x:7220,z:7000},
    actions:[
      action('cardio',label('유산소 운동','CARDIO SESSION'),420,1,{energy:-15,mood:13,hunger:-10,hygiene:-12},label('지구력 중심으로 한 시간 운동합니다.','Train endurance for one hour.')),
      action('strength',label('근력 운동','STRENGTH SESSION'),520,1.2,{energy:-18,mood:15,hunger:-12,hygiene:-14},label('전신 근력 루틴을 수행합니다.','Complete a full-body strength routine.')),
      action('stretch',label('회복 스트레칭','RECOVERY STRETCH'),220,.55,{energy:8,mood:8,hygiene:-2},label('관절과 근육의 피로를 풉니다.','Release fatigue from joints and muscles.')),
    ],
  },
]);

const facilityById=id=>CITY_FACILITIES.find(item=>item.id===id);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class CityLifeDirector{
  constructor(saved){
    this.mode='water';this.facilityId=null;this.parkedCraft=null;this.lastExterior={...CITY_DOCK.shore};
    this.profile={energy:88,hunger:82,mood:76,hygiene:92,bankBalance:5000,worldHour:15.5,day:1,visits:{},activities:{}};
    this.restore(saved);
  }
  restore(saved){
    if(!saved||typeof saved!=='object')return this.serialize();
    const source=saved.profile||saved;
    for(const key of['energy','hunger','mood','hygiene'])if(Number.isFinite(source[key]))this.profile[key]=clamp(source[key]);
    for(const key of['bankBalance','worldHour','day'])if(Number.isFinite(source[key]))this.profile[key]=Math.max(0,source[key]);
    this.profile.visits={...(source.visits||{})};this.profile.activities={...(source.activities||{})};
    return this.serialize();
  }
  serialize(){return{profile:{...this.profile,visits:{...this.profile.visits},activities:{...this.profile.activities}}}}
  tick(dt,{running=false}={}){
    if(this.mode==='water')return;
    this.profile.hunger=clamp(this.profile.hunger-dt*(running?.018:.006));
    this.profile.energy=clamp(this.profile.energy-dt*(running?.026:.004));
    this.profile.hygiene=clamp(this.profile.hygiene-dt*(running?.012:.002));
    if(this.profile.hunger<18||this.profile.energy<14)this.profile.mood=clamp(this.profile.mood-dt*.009);
  }
  tickClock(dt){
    const total=this.profile.worldHour+Math.max(0,dt)/90,days=Math.floor(total/24);this.profile.worldHour=total%24;this.profile.day+=days;
  }
  advance(hours){
    const before=this.profile.worldHour,total=before+Math.max(0,hours);this.profile.day+=Math.floor(total/24);this.profile.worldHour=total%24;
    this.profile.hunger=clamp(this.profile.hunger-hours*1.25);this.profile.energy=clamp(this.profile.energy-hours*.35);this.profile.hygiene=clamp(this.profile.hygiene-hours*.22);
  }
  canDisembark({x,z,speed=0}){return this.mode==='water'&&distance({x,z},CITY_DOCK.water)<=CITY_DOCK.disembarkRadius&&Math.abs(speed)<4}
  disembark({x,z,heading=0,speed=0}){
    if(!this.canDisembark({x,z,speed}))return{ok:false,reason:'dock'};
    const shore={x:clamp(x,-20,480),z:CITY_DOCK.shore.z};
    this.mode='foot';this.parkedCraft={x,z,heading};this.facilityId=null;this.lastExterior=shore;
    return{ok:true,position:{...shore},heading:Math.PI};
  }
  canBoard(position){return this.mode==='foot'&&this.parkedCraft&&distance(position,this.lastExterior)<=CITY_DOCK.boardRadius}
  board(position){
    if(!this.canBoard(position))return{ok:false,reason:'craft-distance'};
    const parked={...this.parkedCraft};this.mode='water';this.facilityId=null;this.parkedCraft=null;return{ok:true,parked};
  }
  enter(id){
    const facility=facilityById(id);if(this.mode!=='foot'||!facility)return{ok:false};
    this.mode='interior';this.facilityId=id;this.lastExterior={x:facility.exterior.x,z:facility.exterior.z+4.8};
    this.profile.visits[id]=(this.profile.visits[id]||0)+1;
    return{ok:true,facility,position:{x:facility.interior.x,z:facility.interior.z+6.8},heading:Math.PI};
  }
  leave(){
    const facility=facilityById(this.facilityId);if(this.mode!=='interior'||!facility)return{ok:false};
    this.mode='foot';this.facilityId=null;return{ok:true,position:{...this.lastExterior},heading:0};
  }
  currentFacility(){return facilityById(this.facilityId)}
  bounds(){
    if(this.mode==='interior'){const origin=this.currentFacility()?.interior||{x:0,z:0};return{minX:origin.x-12.7,maxX:origin.x+12.7,minZ:origin.z-9.4,maxZ:origin.z+9.4,y:.46}}
    return{minX:-35,maxX:488,minZ:372,maxZ:441,y:1.03};
  }
  contextAt(position){
    if(this.mode==='water')return null;
    if(this.mode==='foot'){
      if(this.canBoard(position))return{kind:'board',distance:distance(position,this.lastExterior)};
      let nearest=null;for(const facility of CITY_FACILITIES){const d=distance(position,facility.exterior);if(d<5.4&&(!nearest||d<nearest.distance))nearest={kind:'enter',facility,distance:d}}
      return nearest;
    }
    const facility=this.currentFacility();if(!facility)return null;
    const origin=facility.interior,exit={x:origin.x,z:origin.z+8.8},exitDistance=distance(position,exit);
    if(exitDistance<3.4)return{kind:'exit',facility,distance:exitDistance};
    const spots=facility.actions.map((item,index)=>({kind:'actions',facility,action:item,index,distance:distance(position,{x:origin.x-7.5+index*5,z:origin.z-4.6})})).sort((a,b)=>a.distance-b.distance);
    return spots[0]?.distance<3.5?{kind:'actions',facility,distance:spots[0].distance}:null;
  }
  perform(actionId,wallet=0){
    const facility=this.currentFacility(),item=facility?.actions.find(candidate=>candidate.id===actionId);
    if(!item)return{ok:false,reason:'action',wallet};
    let nextWallet=Math.max(0,Math.floor(wallet)),bank=this.profile.bankBalance;
    const transfer=actionId.match(/^(deposit|withdraw)_(1000|5000)$/);
    if(transfer){
      const amount=Number(transfer[2]);
      if(transfer[1]==='deposit'){if(nextWallet<amount)return{ok:false,reason:'wallet',wallet:nextWallet};nextWallet-=amount;bank+=amount}
      else{if(bank<amount)return{ok:false,reason:'bank',wallet:nextWallet};bank-=amount;nextWallet+=amount}
    }else{
      if(nextWallet<item.cost)return{ok:false,reason:'wallet',wallet:nextWallet};
      nextWallet-=item.cost;
    }
    this.profile.bankBalance=bank;this.advance(item.hours);
    for(const [key,value] of Object.entries(item.effects||{})){
      if(value===100)this.profile[key]=100;else this.profile[key]=clamp(this.profile[key]+value);
    }
    if(actionId==='sleep'){this.profile.day+=this.profile.worldHour>=7?1:0;this.profile.worldHour=7}
    this.profile.activities[actionId]=(this.profile.activities[actionId]||0)+1;
    return{ok:true,facility,action:item,wallet:nextWallet,bankBalance:bank,profile:this.serialize().profile};
  }
  snapshot(){return{mode:this.mode,facilityId:this.facilityId,facility:this.currentFacility(),parkedCraft:this.parkedCraft,profile:this.serialize().profile}}
}

function physical(color,roughness=.45,metalness=.05,emissive=0){
  return new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.36,clearcoatRoughness:.18,emissive,emissiveIntensity:emissive?1.1:0});
}
function box(parent,name,size,position,material,rotationY=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.rotation.y=rotationY;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent,name,radius,height,position,material,segments=20){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function signTexture(title,subtitle,accent){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const context=canvas.getContext('2d');
  context.fillStyle='#071119';context.fillRect(0,0,1024,256);context.fillStyle=accent;context.fillRect(0,0,18,256);context.fillRect(0,238,1024,18);
  context.fillStyle='#f4fbff';context.font='900 74px Segoe UI, sans-serif';context.fillText(title,52,112);context.fillStyle=accent;context.font='800 33px Segoe UI, sans-serif';context.fillText(subtitle,54,174);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function addPortalMarker(parent,x,z,accent){
  const material=new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.58,depthWrite:false,toneMapped:false}),ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.11,10,44),material);
  ring.name='life-portal-marker';ring.position.set(x,1.04,z+1.2);ring.rotation.x=Math.PI/2;ring.userData.baseY=ring.position.y;parent.add(ring);return ring;
}
function addStorefront(root,facility){
  const group=new THREE.Group();group.name=`life-storefront-${facility.id}`;const {x,z}=facility.exterior,accent=`#${facility.accent.toString(16).padStart(6,'0')}`;
  box(group,'storefront-frame',[14.6,5.6,.42],[x,3.52,z-.35],physical(0x172329,.5,.24));
  box(group,'storefront-glass',[10.8,3.35,.16],[x-.9,2.65,z-.57],new THREE.MeshPhysicalMaterial({color:0x24454e,roughness:.08,metalness:.06,transmission:.18,transparent:true,opacity:.82,clearcoat:1}));
  box(group,'life-door',[2.3,3.75,.25],[x+4.9,2.22,z-.68],physical(0x10232a,.16,.18,facility.accent));
  box(group,'awning',[15.4,.22,2.05],[x,5.2,z+.35],physical(facility.accent,.34,.1));
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(12.8,3.2),new THREE.MeshBasicMaterial({map:signTexture(facility.name.en,facility.type.en,accent),toneMapped:false}));sign.position.set(x,7.15,z-.08);group.add(sign);
  const light=new THREE.PointLight(facility.accent,7,16,2);light.name='life-storefront-light';light.position.set(x,5.6,z+1.5);group.add(light);
  group.userData.portal=addPortalMarker(group,x+4.9,z+.2,facility.accent);root.add(group);
}
function actionMarker(root,x,z,accent,index){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.085,8,32),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.62,depthWrite:false,toneMapped:false}));
  ring.name='life-action-marker';ring.position.set(x,.51,z);ring.rotation.x=Math.PI/2;ring.userData={phase:index*.7,baseY:.51};root.add(ring);return ring;
}
function furnishInterior(root,facility){
  const origin=facility.interior,{x,z}=origin,wall=physical(0x243039,.78,.02),floor=physical(0x766e61,.72,.03),dark=physical(0x151d22,.48,.18),accent=physical(facility.accent,.32,.12,facility.id==='nightlife'?facility.accent:0),wood=physical(0x70513a,.7,.02),fabric=physical(0x48535b,.82,.01);
  box(root,'interior-floor',[28,.42,22],[x,.2,z],floor);box(root,'interior-back-wall',[28,7.8,.42],[x,4.1,z-10.8],wall);box(root,'interior-left-wall',[.42,7.8,22],[x-13.8,4.1,z],wall);box(root,'interior-right-wall',[.42,7.8,22],[x+13.8,4.1,z],wall);box(root,'interior-ceiling',[28,.3,22],[x,8,z],dark);
  box(root,'exit-frame',[4.3,4.8,.36],[x,2.6,z+10.5],accent);box(root,'exit-door',[3.2,4.25,.24],[x,2.35,z+10.25],dark);
  const title=new THREE.Mesh(new THREE.PlaneGeometry(10.5,2.4),new THREE.MeshBasicMaterial({map:signTexture(facility.name.en,facility.type.en,`#${facility.accent.toString(16).padStart(6,'0')}`),toneMapped:false}));title.position.set(x,6.15,z-10.55);root.add(title);
  if(facility.id==='home'){
    box(root,'bed-frame',[6,.6,4.3],[x-8,.75,z-5.1],wood);box(root,'mattress',[5.7,.65,4],[x-8,1.35,z-5.1],fabric);box(root,'sofa',[5,1.4,2.2],[x+6,1.1,z-4.8],fabric);box(root,'tv-console',[5,.8,1],[x+6,.75,z+1.8],dark);box(root,'television',[4.4,2.5,.25],[x+6,2.25,z+1.4],dark);box(root,'kitchen',[7,2.2,1.8],[x-6,1.3,z+2.1],wood);
  }else if(facility.id==='grocery'){
    for(let row=-1;row<=1;row++)box(root,'market-shelf',[11,2.6,1.2],[x,1.65,z-4.5+row*3.8],wood);box(root,'market-counter',[8,1.25,2],[x+7,1,z+5.4],dark);
  }else if(facility.id==='restaurant'){
    box(root,'restaurant-counter',[12,1.25,2.2],[x,1,z-7.4],wood);for(const side of[-1,1])for(let row=0;row<2;row++){cylinder(root,'dining-table',1.3,.22,[x+side*6,1.25,z-1+row*5],wood);for(const offset of[-1.8,1.8])cylinder(root,'dining-stool',.48,.8,[x+side*6+offset,.8,z-1+row*5],fabric)}
  }else if(facility.id==='bank'){
    box(root,'teller-counter',[17,1.4,2.2],[x,1.05,z-5.8],wood);for(const offset of[-6,-2,2,6])box(root,'teller-glass',[.12,2.2,2.8],[x+offset,2.55,z-5.7],new THREE.MeshPhysicalMaterial({color:0x9bc8d2,roughness:.08,transmission:.4,transparent:true,opacity:.58}));for(const side of[-1,1])box(root,'atm',[2.2,3.2,1.2],[x+side*8,1.9,z+3],dark);
  }else if(facility.id==='nightlife'){
    box(root,'dance-floor',[11,.15,8],[x,.54,z-2],accent);box(root,'night-bar',[11,1.3,2.1],[x+7,1,z+5.2],dark);for(const side of[-1,1])box(root,'speaker',[2.1,4.2,1.8],[x+side*9,2.4,z-7.4],dark);for(const side of[-1,1]){const light=new THREE.PointLight(side<0?0xff3b9a:0x3bdcff,18,22,2);light.name='nightlife-light';light.position.set(x+side*7,6,z-1);light.userData.phase=side;root.add(light)}
  }else if(facility.id==='gym'){
    for(const side of[-1,1])for(let row=0;row<2;row++){box(root,'treadmill',[3,.35,5],[x+side*6,.65,z-4+row*6],dark);box(root,'treadmill-console',[2.3,1.5,.4],[x+side*6,1.65,z-6.1+row*6],accent)}box(root,'weight-rack',[8,2.8,1.2],[x,1.65,z-8],dark);
  }
  facility.actions.forEach((item,index)=>actionMarker(root,x-7.5+index*5,z-4.6,facility.accent,index));
  const exit=actionMarker(root,x,z+8.8,0xffffff,9);exit.name='life-exit-marker';
}

export function buildCityLifeWorld(scene){
  const exteriorRoot=new THREE.Group();exteriorRoot.name='city-life-exteriors';scene.add(exteriorRoot);const portals=[];
  for(const facility of CITY_FACILITIES){addStorefront(exteriorRoot,facility);portals.push(facility.exterior)}
  const dockMarker=addPortalMarker(exteriorRoot,CITY_DOCK.shore.x,CITY_DOCK.shore.z,0x74ebff);dockMarker.name='life-dock-marker';
  const interiors=new Map();for(const facility of CITY_FACILITIES){const root=new THREE.Group();root.name=`city-life-interior-${facility.id}`;root.visible=false;furnishInterior(root,facility);scene.add(root);interiors.set(facility.id,root)}
  document.body.dataset.cityLifeWorld='golden-coast-six-facilities-v1';
  return{
    exteriorRoot,interiors,dockMarker,
    setInterior(id){for(const [key,root] of interiors)root.visible=key===id},
    hideInteriors(){for(const root of interiors.values())root.visible=false},
    animate(time){
      exteriorRoot.traverse(node=>{if(node.name==='life-portal-marker'){node.rotation.z=time*.42;node.position.y=node.userData.baseY+Math.sin(time*2.2+node.position.x)*.08}});
      for(const root of interiors.values())if(root.visible)root.traverse(node=>{if(node.name==='life-action-marker'||node.name==='life-exit-marker'){node.rotation.z=time*.55;node.material.opacity=.46+Math.sin(time*3+node.userData.phase)*.16}else if(node.name==='nightlife-light'){node.intensity=13+Math.sin(time*4.2+node.userData.phase)*7}});
    },
  };
}

export function prepareFootAvatar(root){
  const bones={},base={};root.traverse(node=>{if(['upperArm.L','upperArm.R','foreArm.L','foreArm.R','upperLeg.L','upperLeg.R','lowerLeg.L','lowerLeg.R','boot.L','boot.R','spine','chest'].includes(node.name)){bones[node.name]=node;base[node.name]=node.rotation.clone()}if(node.isMesh||node.isSkinnedMesh){node.castShadow=true;node.receiveShadow=true}});
  root.userData.footRig={bones,base,walkPhase:0};return root;
}
export function animateFootAvatar(root,{time=0,speed=0,running=false}={}){
  if(!root?.userData?.footRig)return;const {bones,base}=root.userData.footRig,moving=Math.abs(speed)>.08,pace=running?9.2:6.2,stride=moving?Math.sin(time*pace)*(running?.72:.48):0,bob=moving?Math.abs(Math.sin(time*pace))*(running?.08:.045):0;
  root.userData.footBob=bob;
  for(const [name,bone] of Object.entries(bones)){const rest=base[name];bone.rotation.copy(rest);if(name==='upperLeg.L')bone.rotation.x+=stride;if(name==='upperLeg.R')bone.rotation.x-=stride;if(name==='lowerLeg.L')bone.rotation.x+=Math.max(0,-stride)*.72;if(name==='lowerLeg.R')bone.rotation.x+=Math.max(0,stride)*.72;if(name==='upperArm.L')bone.rotation.x-=stride*.62;if(name==='upperArm.R')bone.rotation.x+=stride*.62;if(name==='foreArm.L'||name==='foreArm.R')bone.rotation.x+=moving?.18:.08;if(name==='spine'||name==='chest')bone.rotation.z+=Math.sin(time*pace*.5)*(moving?.025:.008)}
}
