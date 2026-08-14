import { REGIONS } from '../data-v12.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export const FISH_RARITIES={
  common:{label:'COMMON',color:'#b9ced3',weight:52,multiplier:1},
  uncommon:{label:'UNCOMMON',color:'#73e4ba',weight:27,multiplier:1.35},
  rare:{label:'RARE',color:'#69c9ff',weight:13,multiplier:1.85},
  epic:{label:'EPIC',color:'#c18aff',weight:6,multiplier:2.7},
  legendary:{label:'LEGENDARY',color:'#ffd47d',weight:2,multiplier:4.4},
};

const fish=(id,name,koName,regions,rarity,minKg,maxKg,baseValue,fight,color,accent,body,behavior,description)=>({id,name,koName,regions,rarity,minKg,maxKg,baseValue,fight,color,accent,body,behavior,description});
export const FISH_SPECIES=[
  fish('silver-mackerel','Silver Mackerel','은빛 고등어',['GOLDEN COAST','HARBOR CITY'],'common',.35,1.8,90,.28,'#90aeb8','#d8eef0',[.42,.32,1.35],'school','연안 표층을 빠르게 도는 기본 어종.'),
  fish('red-sea-bream','Red Sea Bream','참돔',['GOLDEN COAST'],'uncommon',1.2,8.5,260,.48,'#bb6d67','#f2b09c',[.5,.42,1.2],'dash','짧고 강한 돌진을 반복한다.'),
  fish('golden-amberjack','Golden Amberjack','부시리',['GOLDEN COAST','CORAL EXPANSE'],'rare',4,28,620,.7,'#67828a','#d8bd66',[.5,.38,1.55],'runner','체력이 높고 긴 직선 질주를 한다.'),
  fish('bluefin-tuna','Bluefin Tuna','참다랑어',['GOLDEN COAST','STORM STRAIT'],'legendary',22,210,2400,.96,'#334f68','#b9d5dc',[.58,.43,1.85],'power','굵은 원을 그리며 줄을 끝까지 압박한다.'),
  fish('mangrove-snapper','Mangrove Snapper','망그로브 도미',['MANGROVE DELTA'],'common',.7,5.8,150,.4,'#765f55','#d09b6f',[.52,.45,1.1],'zigzag','수몰 뿌리 사이로 방향을 자주 바꾼다.'),
  fish('barramundi','Barramundi','바라문디',['MANGROVE DELTA'],'rare',3,32,720,.74,'#aeb9aa','#e6e1bf',[.48,.39,1.55],'jump','수면 점프로 장력을 급격히 바꾼다.'),
  fish('silver-tarpon','Silver Tarpon','타폰',['MANGROVE DELTA','HARBOR CITY'],'epic',12,86,1350,.88,'#b8c7c8','#f0f2e7',[.45,.31,1.8],'acrobat','연속 점프와 좌우 전환이 빠르다.'),
  fish('harbor-mullet','Harbor Mullet','숭어',['HARBOR CITY'],'common',.5,3.6,110,.32,'#7f9a99','#d0d9c7',[.42,.3,1.28],'school','항만 구조물 주변에서 무리지어 움직인다.'),
  fish('striped-bass','Striped Bass','줄무늬 농어',['HARBOR CITY'],'uncommon',1.8,14,340,.57,'#6e8181','#c3c8aa',[.52,.43,1.36],'zigzag','방향 전환 후 바닥으로 파고든다.'),
  fish('giant-trevally','Giant Trevally','자이언트 트레발리',['HARBOR CITY','CORAL EXPANSE'],'epic',8,62,1480,.9,'#5d737a','#bcc9c7',[.62,.52,1.38],'power','폭발적인 첫 질주가 위험한 대형 어종.'),
  fish('ember-grouper','Ember Grouper','붉은 능성어',['VOLCANO BAY'],'uncommon',1.5,18,420,.62,'#7d382f','#e68b56',[.66,.58,1.05],'bottom','바위 틈으로 줄을 끌고 들어간다.'),
  fish('obsidian-rockfish','Obsidian Rockfish','흑요석 볼락',['VOLCANO BAY','BLACK REEF'],'rare',.8,7.5,510,.66,'#252c30','#b64f37',[.64,.61,.9],'bottom','작지만 무겁고 바닥 저항이 강하다.'),
  fish('volcanic-oarfish','Volcanic Oarfish','화산 산갈치',['VOLCANO BAY'],'legendary',18,125,2900,.94,'#8b3030','#ffb05c',[.24,.25,2.7],'serpent','긴 몸으로 불규칙한 장력 파동을 만든다.'),
  fish('coral-parrotfish','Coral Parrotfish','비늘돔',['CORAL EXPANSE'],'common',.6,6.2,180,.38,'#3f9c91','#e4bc53',[.64,.55,1.0],'zigzag','산호 사이를 짧게 끊어 달린다.'),
  fish('mahi-mahi','Mahi-Mahi','만새기',['CORAL EXPANSE','STORM STRAIT'],'rare',3,24,680,.72,'#2e9b92','#e5d34d',[.38,.32,1.72],'jump','빠른 수면 질주와 점프를 반복한다.'),
  fish('napoleon-wrasse','Napoleon Wrasse','나폴레옹피시',['CORAL EXPANSE'],'epic',14,95,1700,.86,'#437f83','#7ed0aa',[.7,.64,1.2],'power','느리지만 지속적으로 강한 압력을 준다.'),
  fish('storm-wahoo','Storm Wahoo','폭풍 꼬치삼치',['STORM STRAIT'],'uncommon',2.5,22,480,.68,'#355f7a','#b8e0ef',[.35,.28,1.92],'runner','폭풍 해역에서 직선 속도가 크게 증가한다.'),
  fish('swordfish','Swordfish','황새치',['STORM STRAIT'],'epic',18,155,2100,.93,'#334b6d','#becde5',[.35,.36,2.15],'power','긴 주둥이와 체중으로 줄을 강하게 누른다.'),
  fish('tempest-marlin','Tempest Marlin','템페스트 청새치',['STORM STRAIT'],'legendary',28,260,3600,1,'#243e69','#79b9e2',[.32,.36,2.5],'acrobat','최고 속도와 점프를 모두 가진 보스 어종.'),
  fish('moon-opah','Moon Opah','달돔',['MOON ARCHIPELAGO'],'rare',4,38,760,.7,'#6d6fa8','#e58b9e',[.78,.72,.88],'pulse','둥근 몸으로 주기적인 장력 파동을 만든다.'),
  fish('lantern-fish','Lantern Fish','초롱빛 물고기',['MOON ARCHIPELAGO','BLACK REEF'],'uncommon',.2,2.1,220,.42,'#263853','#6ef1dc',[.3,.26,1.05],'pulse','어두운 수심에서 발광하며 움직인다.'),
  fish('lunar-coelacanth','Lunar Coelacanth','월광 실러캔스',['MOON ARCHIPELAGO','BLACK REEF'],'legendary',16,88,3200,.92,'#38455c','#b692d6',[.6,.5,1.38],'bottom','깊은 수심에서 거의 움직이지 않다가 폭발한다.'),
  fish('black-grouper','Black Grouper','검은 능성어',['BLACK REEF'],'rare',5,42,840,.78,'#222b2d','#657b73',[.72,.62,1.08],'bottom','암초에 몸을 고정해 강한 초기 제압이 필요하다.'),
  fish('abyss-shark','Abyss Reef Shark','심연 암초상어',['BLACK REEF'],'epic',35,180,2600,.98,'#27353a','#93a9a9',[.58,.38,2.35],'power','긴 파이팅을 요구하는 최상위 포식자.'),
  fish('sky-koi','Skywater Koi','하늘비단잉어',['SKYWATER LAGOON'],'uncommon',1,12,390,.54,'#e9ebe4','#e68b4d',[.58,.48,1.18],'zigzag','라군의 상승류를 타고 부드럽게 방향을 바꾼다.'),
  fish('prism-arowana','Prism Arowana','프리즘 아로와나',['SKYWATER LAGOON'],'epic',3,18,1450,.82,'#7998a3','#d19be8',[.35,.3,1.82],'jump','긴 몸으로 수면 위를 연속 도약한다.'),
  fish('cloud-ray','Cloud Manta','구름 만타',['SKYWATER LAGOON'],'legendary',40,240,3900,.95,'#63818a','#d8edf0',[1.35,.15,1.05],'glide','넓은 날개로 줄 방향을 천천히 크게 바꾼다.'),
];

export const FISHING_TACKLE=[
  {level:1,name:'COAST STARTER',line:100,reel:1,control:1,unlock:0},
  {level:2,name:'REEF HUNTER',line:114,reel:1.18,control:1.12,unlock:12},
  {level:3,name:'BLUEWATER PRO',line:132,reel:1.38,control:1.25,unlock:35},
  {level:4,name:'ABYSS MASTER',line:150,reel:1.62,control:1.4,unlock:70},
];

export const FISHING_BAITS=[
  {id:'shore-worm',name:'SHORE WORM',koName:'갯지렁이',unlock:0,zone:'shallow',depth:'2–8 M',time:'any',behaviors:['school','dash','bottom']},
  {id:'flash-minnow',name:'FLASH MINNOW',koName:'플래시 미노우',unlock:8,zone:'mid',depth:'8–22 M',time:'day',behaviors:['runner','dash','zigzag']},
  {id:'surface-popper',name:'SURFACE POPPER',koName:'서피스 포퍼',unlock:22,zone:'surface',depth:'0–3 M',time:'dawn',behaviors:['jump','acrobat','glide']},
  {id:'deep-glow-jig',name:'DEEP GLOW JIG',koName:'딥 글로우 지그',unlock:45,zone:'deep',depth:'22–60 M',time:'night',behaviors:['bottom','power','pulse','serpent']},
];

const HABITAT_TYPES=[
  {zone:'surface',name:'TIDE LINE',koName:'조류 경계',radius:.9,angle:0},
  {zone:'shallow',name:'REEF SHELF',koName:'연안 여밭',radius:.98,angle:1.62},
  {zone:'mid',name:'CURRENT LANE',koName:'중층 물길',radius:1.08,angle:3.18},
  {zone:'deep',name:'DROP-OFF',koName:'심해 급경사',radius:1.17,angle:4.72},
];
export const FISHING_HABITATS=REGIONS.flatMap((region,regionIndex)=>{
  const phase=(regionIndex*.83+.28)%(Math.PI*2);
  return HABITAT_TYPES.map((type,index)=>({id:`${region.name.toLowerCase().replaceAll(' ','-')}-${type.zone}`,region:region.name,zone:type.zone,name:type.name,koName:type.koName,x:region.x+Math.cos(phase+type.angle)*region.r*type.radius,z:region.z+Math.sin(phase+type.angle)*region.r*type.radius,index}));
});
export function fishingHabitatAt(region,x=0,z=0,zone='shallow'){
  const pool=FISHING_HABITATS.filter(entry=>entry.region===region&&entry.zone===zone),fallback=FISHING_HABITATS.find(entry=>entry.region===region)||FISHING_HABITATS[0],habitat=pool[0]||fallback,dx=habitat.x-x,dz=habitat.z-z,distance=Math.hypot(dx,dz),strength=clamp(1-distance/320,0,1),status=strength>=.7?'HOT SCHOOL':strength>=.34?'ACTIVE WATER':'SPARSE WATER';
  return{...habitat,distance,strength,status,bearing:(Math.atan2(dx,dz)*180/Math.PI+360)%360,biteRate:.72+strength*.7};
}

const speciesDepth=behavior=>{
  if(['jump','acrobat','glide'].includes(behavior))return'surface';
  if(['bottom','power','pulse','serpent'].includes(behavior))return'deep';
  if(['runner'].includes(behavior))return'mid';
  return'shallow';
};
const timeAffinity=(time,hour)=>{
  if(time==='any')return 1;
  if(time==='day')return hour>=8&&hour<18?1.32:.68;
  if(time==='night')return hour>=20||hour<5?1.42:.58;
  if(time==='dawn')return((hour>=5&&hour<9)||(hour>=17&&hour<20))?1.48:.55;
  return 1;
};
export function fishingBaitMatch(species,bait=FISHING_BAITS[0],hour=12){
  const resolved=typeof bait==='string'?FISHING_BAITS.find(entry=>entry.id===bait)||FISHING_BAITS[0]:bait;
  const behaviorMatch=resolved.behaviors.includes(species.behavior),depthMatch=speciesDepth(species.behavior)===resolved.zone;
  return(behaviorMatch?1.52:depthMatch?1.18:.72)*timeAffinity(resolved.time,hour);
}
export function baitCondition(bait=FISHING_BAITS[0],hour=12){
  const resolved=typeof bait==='string'?FISHING_BAITS.find(entry=>entry.id===bait)||FISHING_BAITS[0]:bait,affinity=timeAffinity(resolved.time,hour);
  return affinity>=1.4?'PRIME WINDOW':affinity>=1?'GOOD WINDOW':'OFF WINDOW';
}

function weightedSpecies(region,random,seaState=1,bait=FISHING_BAITS[0],hour=12,habitat=null){
  const pool=FISH_SPECIES.filter(s=>s.regions.includes(region));
  const scored=pool.map(species=>{let weight=FISH_RARITIES[species.rarity].weight*fishingBaitMatch(species,bait,hour);if(habitat&&speciesDepth(species.behavior)===habitat.zone)weight*=1+habitat.strength*.58;if(seaState>1.35&&['runner','power','acrobat'].includes(species.behavior))weight*=1.25;if(seaState<1&&species.behavior==='bottom')weight*=1.18;return{species,weight}});
  let roll=random()*scored.reduce((n,x)=>n+x.weight,0);for(const entry of scored){roll-=entry.weight;if(roll<=0)return entry.species}return scored.at(-1)?.species||FISH_SPECIES[0];
}

export class FishingDirector{
  constructor({random=Math.random,storageKey='tidal-racer-v18-fishing'}={}){
    this.random=random;this.storageKey=storageKey;this.active=false;this.phase='stowed';this.timer=0;this.tension=28;this.stamina=0;this.distance=0;this.direction=0;this.directionTimer=0;this.looseTimer=0;this.target=null;this.catchResult=null;this.events=[];this.scanContext={region:'GOLDEN COAST',x:0,z:0};this.sonar=fishingHabitatAt('GOLDEN COAST',0,0);
    this.profile={total:0,earned:0,baitId:FISHING_BAITS[0].id,discovered:{},best:{},byRegion:{}};this.load();
  }
  load(){if(!this.storageKey)return;try{const saved=JSON.parse(localStorage.getItem(this.storageKey)||'null');if(saved)this.restore(saved)}catch{}}
  save(){if(!this.storageKey)return;try{localStorage.setItem(this.storageKey,JSON.stringify(this.serialize()))}catch{}}
  serialize(){return JSON.parse(JSON.stringify(this.profile))}
  restore(saved){if(!saved||typeof saved!=='object')return this.profile;this.profile={...this.profile,...saved,discovered:{...(saved.discovered||{})},best:{...(saved.best||{})},byRegion:{...(saved.byRegion||{})}};if(!FISHING_BAITS.some(entry=>entry.id===this.profile.baitId&&this.profile.total>=entry.unlock))this.profile.baitId=FISHING_BAITS[0].id;return this.profile}
  get tackle(){return[...FISHING_TACKLE].reverse().find(t=>this.profile.total>=t.unlock)||FISHING_TACKLE[0]}
  get availableBaits(){return FISHING_BAITS.filter(entry=>this.profile.total>=entry.unlock)}
  get bait(){return FISHING_BAITS.find(entry=>entry.id===this.profile.baitId)||FISHING_BAITS[0]}
  scan(context={}){
    this.scanContext={...this.scanContext,...context};this.sonar=fishingHabitatAt(this.scanContext.region,this.scanContext.x,this.scanContext.z,this.bait.zone);return this.sonar;
  }
  cycleBait(){
    if(!this.active||!['ready','landed','lost'].includes(this.phase))return null;
    const options=this.availableBaits,index=Math.max(0,options.findIndex(entry=>entry.id===this.bait.id)),bait=options[(index+1)%options.length]||FISHING_BAITS[0];
    this.profile.baitId=bait.id;this.scan();this.save();this.emit('baitChanged',{bait,options,sonar:this.sonar});return bait;
  }
  emit(type,data={}){this.events.push({type,...data})}
  drainEvents(){return this.events.splice(0)}
  enter(region,context={}){if(this.active)return;this.active=true;this.phase='ready';this.catchResult=null;this.distance=0;this.stamina=0;this.tension=18;this.scan({region,...context});this.emit('entered',{region,tackle:this.tackle,sonar:this.sonar})}
  exit(reason='manual'){if(!this.active)return;if(['bite','hooked'].includes(this.phase))this.emit('escaped',{reason:'line-stowed',species:this.target?.species});this.active=false;this.phase='stowed';this.target=null;this.emit('exited',{reason})}
  action(context={}){
    if(!this.active)return;
    if(['ready','landed','lost'].includes(this.phase)){this.cast(context);return}
    if(this.phase==='bite')this.hook();
  }
  cast({region='GOLDEN COAST',seaState=1,hour=12,x=this.scanContext.x,z=this.scanContext.z}={}){const bait=this.bait,condition=baitCondition(bait,hour),timeBonus=timeAffinity(bait.time,hour),habitat=this.scan({region,x,z}),windowRate=timeBonus>=1.3?1.22:timeBonus<.8?.82:1;this.phase='waiting';this.timer=(2.2+this.random()*3.8)/(windowRate*habitat.biteRate);this.tension=18;this.stamina=0;this.distance=12+this.random()*7;this.target={region,seaState,hour,bait,condition,depth:bait.depth,habitat,species:null,weight:0};this.catchResult=null;this.emit('cast',{region,bait,condition,depth:bait.depth,habitat})}
  beginBite(){const species=weightedSpecies(this.target.region,this.random,this.target.seaState,this.target.bait,this.target.hour,this.target.habitat),weight=species.minKg+Math.pow(this.random(),1.7)*(species.maxKg-species.minKg),match=fishingBaitMatch(species,this.target.bait,this.target.hour);this.target={...this.target,species,weight,match};this.phase='bite';this.timer=3.4+(1-species.fight)*.8;this.emit('bite',{species,weight,bait:this.target.bait,match,habitat:this.target.habitat})}
  hook(){const species=this.target?.species;if(!species)return;this.phase='hooked';this.stamina=72+species.fight*68;this.distance=15+species.fight*18+this.random()*8;this.tension=38+species.fight*12;this.direction=this.random()>.5?1:-1;this.directionTimer=.55+this.random()*1.3;this.looseTimer=0;this.emit('hooked',{species,weight:this.target.weight})}
  fail(reason){const species=this.target?.species;this.phase='lost';this.timer=2;this.emit('escaped',{reason,species});this.target=null}
  land(){const {species,weight}=this.target,rarity=FISH_RARITIES[species.rarity],quality=.86+this.random()*.28,value=Math.round(species.baseValue*rarity.multiplier*(.45+weight/species.maxKg*.85)*quality),record=this.profile.best[species.id]||0,isRecord=weight>record;this.profile.total++;this.profile.earned+=value;this.profile.discovered[species.id]=(this.profile.discovered[species.id]||0)+1;this.profile.byRegion[this.target.region]=(this.profile.byRegion[this.target.region]||0)+1;if(isRecord)this.profile.best[species.id]=weight;this.save();this.catchResult={species,weight,value,isRecord,quality};this.phase='landed';this.timer=3.2;this.emit('landed',this.catchResult);this.target=null}
  update(dt,context={},input={}){
    if(!this.active)return this.snapshot();
    if(this.phase==='waiting'){this.timer-=dt;if(this.timer<=0)this.beginBite()}
    else if(this.phase==='bite'){this.timer-=dt;if(this.timer<=0)this.fail('missed-bite')}
    else if(this.phase==='hooked'){
      const species=this.target.species,tackle=this.tackle,reel=!!input.reel,slack=!!input.slack,rod=clamp(input.rod||0,-1,1);this.directionTimer-=dt;if(this.directionTimer<=0){this.direction=(this.random()>.5?1:-1);this.directionTimer=.45+this.random()*(1.5-species.fight*.55)}
      const control=clamp(Number(context.control)||1,.8,1.2),pulse=.55+.45*Math.sin((context.time||0)*(3.4+species.fight*2.8)+species.fight*5),pull=species.fight*(.58+pulse*.72),counter=rod&&Math.sign(rod)===-Math.sign(this.direction);this.tension+=(pull*(counter?.44:1)-.34)*24*dt;
      if(reel&&!slack){this.tension+=(10+species.fight*8)*dt;const safe=this.tension>22&&this.tension<this.tackle.line*.88;if(safe){this.stamina-=dt*(11+8*tackle.reel)*(1.18-species.fight*.35);this.distance-=dt*(2.1+2.4*tackle.reel)*(1.12-species.fight*.26)}else this.stamina-=dt*1.2}
      else if(slack){this.tension-=34*dt*tackle.control*control;this.distance+=dt*(.8+pull)}else this.tension-=dt*(7+counter*8*tackle.control*control);
      if(counter)this.tension-=dt*8*tackle.control*control;this.distance+=dt*Math.max(0,pull-.62)*2.2;this.tension=clamp(this.tension,0,tackle.line+8);this.stamina=Math.max(0,this.stamina);this.distance=clamp(this.distance,0,55);
      if(this.tension>tackle.line)this.fail('line-snap');else{this.looseTimer=this.tension<7?this.looseTimer+dt:Math.max(0,this.looseTimer-dt*2);if(this.looseTimer>2.15)this.fail('slack-line');else if(this.stamina<=0&&this.distance<=2.2)this.land()}
    }else if(['landed','lost'].includes(this.phase)){this.timer-=dt;if(this.timer<=0){this.phase='ready';this.catchResult=null;this.distance=0;this.stamina=0;this.tension=18}}
    return this.snapshot();
  }
  snapshot(){return{active:this.active,phase:this.phase,timer:this.timer,tension:this.tension,stamina:this.stamina,distance:this.distance,direction:this.direction,target:this.target,catchResult:this.catchResult,tackle:this.tackle,bait:this.bait,baitOptions:this.availableBaits,sonar:this.sonar,profile:this.profile}}
}
