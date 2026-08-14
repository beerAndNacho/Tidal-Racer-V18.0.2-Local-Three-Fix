const STORE_KEY='tidal-racer-world-activities-v1';
const localize=(ko,en)=>({ko,en});

const activity=(id,region,type,title,description,timeLimit,reward,steps)=>({id,region,type,title:localize(title[0],title[1]),description:localize(description[0],description[1]),timeLimit,reward,steps:steps.map(step=>({...step,label:localize(step.label[0],step.label[1])}))});

export const WORLD_ACTIVITIES=[
  activity('golden-rescue','GOLDEN COAST','RESCUE',['해안 구조','COASTAL RESCUE'],['표류자를 찾아 안전한 마리나까지 호송하세요.','Locate a drifter and escort them to the marina.'],145,{credits:1850,xp:520,rep:90},[
    {x:520,z:620,radius:34,label:['조난 신호로 이동','Reach the distress signal']},{x:690,z:260,radius:40,maxSpeed:18,label:['표류자와 속도를 맞추기','Match speed with the drifter']},{x:245,z:505,radius:48,maxSpeed:22,label:['마리나로 안전하게 호송','Escort safely to the marina']}
  ]),
  activity('volcano-courier','VOLCANO BAY','COURIER',['화산 관측 보급','VOLCANIC SUPPLY RUN'],['관측소 세 곳에 냉각 장비를 배송하세요.','Deliver cooling equipment to three survey stations.'],165,{credits:2200,xp:610,rep:105},[
    {x:1660,z:-920,radius:42,label:['해상 창고에서 장비 수령','Collect equipment at the sea depot']},{x:1320,z:-1510,radius:38,label:['남쪽 관측소 배송','Deliver to the south station']},{x:720,z:-1160,radius:38,label:['서쪽 관측소 배송','Deliver to the west station']},{x:1030,z:-430,radius:42,label:['북쪽 관측소 배송','Deliver to the north station']}
  ]),
  activity('mangrove-cleanup','MANGROVE DELTA','ECO',['델타 생태 정화','DELTA ECO SWEEP'],['저속으로 부유 오염 표본을 회수하세요.','Recover floating samples at controlled speed.'],180,{credits:2050,xp:650,rep:135},[
    {x:-740,z:-790,radius:36,maxSpeed:14,label:['첫 번째 표본 저속 회수','Recover sample one at low speed']},{x:-1230,z:-320,radius:36,maxSpeed:14,label:['두 번째 표본 저속 회수','Recover sample two at low speed']},{x:-1780,z:-850,radius:36,maxSpeed:14,label:['세 번째 표본 저속 회수','Recover sample three at low speed']},{x:-1370,z:-1510,radius:40,maxSpeed:14,label:['마지막 표본 저속 회수','Recover the final sample']}
  ]),
  activity('harbor-dispatch','HARBOR CITY','DISPATCH',['항만 긴급 배송','HARBOR PRIORITY'],['혼잡한 항로를 따라 긴급 부품을 전달하세요.','Move urgent parts through the active harbor lanes.'],135,{credits:2400,xp:600,rep:95},[
    {x:-930,z:1580,radius:42,label:['부두 A에서 화물 수령','Collect cargo at Pier A']},{x:-1810,z:1420,radius:36,label:['컨테이너 선석 통과','Clear the container berth']},{x:-1880,z:720,radius:38,label:['수리 부두에 배송','Deliver to the repair dock']},{x:-1120,z:510,radius:42,label:['관제소에서 완료 확인','Check in with harbor control']}
  ]),
  activity('storm-mayday','STORM STRAIT','MAYDAY',['폭풍 조난 대응','STORM MAYDAY'],['강한 파도 속 비상 송신기를 순서대로 확보하세요.','Secure emergency transponders through heavy seas.'],125,{credits:2850,xp:760,rep:155},[
    {x:1770,z:1380,radius:45,label:['첫 번째 비상 송신기','Reach transponder one']},{x:1410,z:1780,radius:45,label:['두 번째 비상 송신기','Reach transponder two']},{x:760,z:1450,radius:45,label:['세 번째 비상 송신기','Reach transponder three']},{x:820,z:760,radius:48,label:['구조선과 합류','Rendezvous with rescue crew']}
  ]),
  activity('coral-survey','CORAL EXPANSE','SURVEY',['산호 광역 조사','CORAL SURVEY'],['지정 구역에서 속도를 낮춰 산호 상태를 기록하세요.','Slow down inside each zone to record reef health.'],190,{credits:2300,xp:720,rep:170},[
    {x:2550,z:690,radius:55,maxSpeed:8,hold:3,label:['북쪽 산호 구역 3초 조사','Survey north reef for 3 seconds']},{x:3180,z:120,radius:55,maxSpeed:8,hold:3,label:['동쪽 산호 구역 3초 조사','Survey east reef for 3 seconds']},{x:2600,z:-870,radius:55,maxSpeed:8,hold:3,label:['남쪽 산호 구역 3초 조사','Survey south reef for 3 seconds']}
  ]),
  activity('moon-relay','MOON ARCHIPELAGO','RELAY',['문 아일랜드 릴레이','MOON ISLAND RELAY'],['섬 사이의 항로 표지를 제한 시간 내 연결하세요.','Link navigation beacons between the islands.'],150,{credits:2450,xp:680,rep:125},[
    {x:-1990,z:480,radius:40,label:['동쪽 항로 표지 활성화','Activate the east beacon']},{x:-2480,z:910,radius:40,label:['북쪽 항로 표지 활성화','Activate the north beacon']},{x:-3180,z:250,radius:40,label:['서쪽 항로 표지 활성화','Activate the west beacon']},{x:-2640,z:-580,radius:40,label:['남쪽 항로 표지 활성화','Activate the south beacon']}
  ]),
  activity('black-salvage','BLACK REEF','SALVAGE',['블랙 리프 인양','BLACK REEF SALVAGE'],['암초 사이의 화물 위치를 확인하고 안전 구역으로 복귀하세요.','Tag lost cargo among the reefs and return to safety.'],175,{credits:3100,xp:820,rep:165},[
    {x:-520,z:-2040,radius:38,maxSpeed:16,label:['첫 번째 화물 위치 확인','Tag cargo one']},{x:-1050,z:-3060,radius:38,maxSpeed:16,label:['두 번째 화물 위치 확인','Tag cargo two']},{x:-1690,z:-2510,radius:38,maxSpeed:16,label:['세 번째 화물 위치 확인','Tag cargo three']},{x:-780,z:-1850,radius:48,label:['안전 구역으로 복귀','Return to the safe zone']}
  ]),
  activity('skywater-slalom','SKYWATER LAGOON','SLALOM',['스카이워터 슬라럼','SKYWATER SLALOM'],['라군의 링 게이트를 순서대로 통과하세요.','Thread the lagoon ring gates in sequence.'],118,{credits:2700,xp:700,rep:130},[
    {x:1750,z:-2290,radius:34,label:['게이트 1','Gate 1']},{x:1650,z:-2880,radius:34,label:['게이트 2','Gate 2']},{x:1120,z:-3200,radius:34,label:['게이트 3','Gate 3']},{x:620,z:-2820,radius:34,label:['게이트 4','Gate 4']},{x:720,z:-2140,radius:34,label:['게이트 5','Gate 5']},{x:1250,z:-1820,radius:38,label:['피니시 게이트','Finish gate']}
  ])
];

export class WorldActivityDirector{
  constructor(catalog=WORLD_ACTIVITIES,{storageKey=STORE_KEY}={}){this.catalog=Array.isArray(catalog)?catalog:WORLD_ACTIVITIES;this.storageKey=storageKey;this.active=null;this.profile={completed:{},best:{}};try{if(this.storageKey&&typeof localStorage!=='undefined')this.restore(JSON.parse(localStorage.getItem(this.storageKey)||'null'))}catch{}}
  forRegion(region){return this.catalog.find(item=>item.region===region)||this.catalog[0]}
  start(id,time=0){const definition=this.catalog.find(item=>item.id===id);if(!definition)return null;this.active={definition,step:0,startedAt:time,deadline:time+definition.timeLimit,holdProgress:0};return{type:'started',activity:definition}}
  cancel(){if(!this.active)return null;const definition=this.active.definition;this.active=null;return{type:'cancelled',activity:definition}}
  update({x,z,time,speed=0,dt=0}){
    if(!this.active)return null;const state=this.active,definition=state.definition;
    if(time>=state.deadline){this.active=null;return{type:'failed',reason:'timeout',activity:definition}}
    const target=definition.steps[state.step],distance=Math.hypot(x-target.x,z-target.z),speedOk=target.maxSpeed==null||Math.abs(speed)<=target.maxSpeed;
    if(distance<=target.radius&&speedOk){
      if(target.hold){state.holdProgress=Math.min(target.hold,state.holdProgress+dt);if(state.holdProgress<target.hold)return null}
      state.step++;state.holdProgress=0;
      if(state.step>=definition.steps.length){const elapsed=time-state.startedAt;this.profile.completed[definition.id]=(this.profile.completed[definition.id]||0)+1;this.profile.best[definition.id]=Math.min(this.profile.best[definition.id]||Infinity,elapsed);this.save();this.active=null;return{type:'completed',activity:definition,elapsed}}
      return{type:'step',activity:definition,step:state.step,target:definition.steps[state.step]};
    }
    if(target.hold)state.holdProgress=Math.max(0,state.holdProgress-dt*.35);
    return null;
  }
  snapshot({x=0,z=0,time=0}={}){if(!this.active)return{active:false,completed:this.profile.completed,best:this.profile.best};const state=this.active,target=state.definition.steps[state.step];return{active:true,id:state.definition.id,type:state.definition.type,title:state.definition.title,description:state.definition.description,step:state.step,total:state.definition.steps.length,target,label:target.label,distance:Math.hypot(x-target.x,z-target.z),timeRemaining:Math.max(0,state.deadline-time),holdProgress:state.holdProgress,progress:(state.step+(target.hold?state.holdProgress/target.hold:0))/state.definition.steps.length,reward:state.definition.reward}}
  serialize(){return JSON.parse(JSON.stringify(this.profile))}
  restore(saved){if(!saved||typeof saved!=='object')return this.profile;this.profile={completed:{...(saved.completed||{})},best:{...(saved.best||{})}};return this.profile}
  save(){try{if(this.storageKey&&typeof localStorage!=='undefined')localStorage.setItem(this.storageKey,JSON.stringify(this.serialize()))}catch{}}
}
