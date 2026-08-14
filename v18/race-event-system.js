const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const RACE_EVENTS=Object.freeze([
  {id:'golden-circuit',name:{ko:'골든 서킷',en:'GOLDEN CIRCUIT'},brief:{ko:'넓은 코너와 빠른 직선으로 구성된 해안 입문전',en:'A fast coastal opener with wide corners and clean sightlines.'},region:'GOLDEN COAST',laps:2,difficulty:1,unlockRep:0,reward:{credits:2800,xp:650,rep:140},points:[[230,530],[600,520],[800,250],[620,-80],[200,-250],[-250,-100],[-380,280],[0,530]]},
  {id:'volcano-crucible',name:{ko:'볼케이노 크루서블',en:'VOLCANO CRUCIBLE'},brief:{ko:'용암 해안의 급격한 고저 파도와 고속 회전 구간',en:'Commit through volcanic swell and long high-speed arcs.'},region:'VOLCANO BAY',laps:2,difficulty:2,unlockRep:200,reward:{credits:3900,xp:820,rep:190},points:[[1220,-980],[1600,-720],[1800,-1200],[1450,-1600],[850,-1500],[620,-1100],[900,-700]]},
  {id:'mangrove-technical',name:{ko:'맹그로브 테크니컬',en:'MANGROVE TECHNICAL'},brief:{ko:'좁은 수로와 연속 헤어핀에서 조종 실력을 겨루는 경기',en:'Thread narrow channels and linked hairpins with precision.'},region:'MANGROVE DELTA',laps:3,difficulty:3,unlockRep:450,reward:{credits:5200,xp:1050,rep:250},points:[[-1250,-920],[-700,-600],[-800,-1250],[-1300,-1520],[-1800,-1250],[-1850,-720],[-1450,-450]]},
  {id:'harbor-sprint',name:{ko:'하버 나이트 스프린트',en:'HARBOR NIGHT SPRINT'},brief:{ko:'도시 불빛 아래 짧고 치열하게 이어지는 추월전',en:'A compact urban sprint built for drafting and late overtakes.'},region:'HARBOR CITY',laps:3,difficulty:3,unlockRep:800,reward:{credits:6500,xp:1280,rep:310},points:[[-1250,1120],[-650,1450],[0,1500],[350,1150],[-250,900],[-850,760]]},
  {id:'storm-endurance',name:{ko:'스톰 스트레이트 내구전',en:'STORM STRAIT ENDURANCE'},brief:{ko:'거센 날씨와 장거리 항로를 버텨야 하는 체력전',en:'Survive exposed water, changing weather, and an endurance loop.'},region:'STORM STRAIT',laps:2,difficulty:4,unlockRep:1200,reward:{credits:8200,xp:1560,rep:390},points:[[1250,1080],[1900,900],[2400,500],[2600,-150],[2100,-500],[1500,-200],[900,250],[700,850]]},
  {id:'skywater-grand-prix',name:{ko:'스카이워터 그랑프리',en:'SKYWATER GRAND PRIX'},brief:{ko:'큰 파도와 장거리 코너가 이어지는 최상급 챔피언십',en:'Master towering swell and sweeping championship corners.'},region:'SKYWATER LAGOON',laps:3,difficulty:5,unlockRep:1600,reward:{credits:10400,xp:1950,rep:480},points:[[1200,-2500],[1700,-2200],[1900,-2750],[1450,-3250],[800,-3150],[550,-2600],[700,-2100]]},
  {id:'moonlight-cup',name:{ko:'문라이트 크라운 컵',en:'MOONLIGHT CROWN CUP'},brief:{ko:'암초와 달빛 수로를 가르는 시즌 최종 결승전',en:'The season finale through moonlit reefs and unforgiving water.'},region:'MOON ARCHIPELAGO',laps:3,difficulty:5,unlockRep:2200,reward:{credits:13800,xp:2400,rep:620},points:[[-2550,160],[-2100,600],[-2600,950],[-3200,650],[-3400,50],[-3000,-500],[-2350,-550],[-2000,-150]]}
].map(event=>Object.freeze({...event,name:Object.freeze(event.name),brief:Object.freeze(event.brief),reward:Object.freeze(event.reward),points:Object.freeze(event.points.map(point=>Object.freeze([...point])))})));

const eventById=id=>RACE_EVENTS.find(event=>event.id===id)||RACE_EVENTS[0];
const cleanRecord=record=>({attempts:Math.max(0,Math.floor(Number(record?.attempts)||0)),wins:Math.max(0,Math.floor(Number(record?.wins)||0)),bestPosition:record?.bestPosition==null?null:clamp(Math.floor(Number(record.bestPosition)||12),1,12),bestTime:record?.bestTime==null?null:Math.max(0,Number(record.bestTime)||0)});

export function formatRaceTime(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return'--:--.---';const minutes=Math.floor(seconds/60),rest=seconds-minutes*60;return`${String(minutes).padStart(2,'0')}:${rest.toFixed(3).padStart(6,'0')}`;
}

export class RaceEventDirector{
  constructor(saved=null){this.profile={selected:RACE_EVENTS[0].id,records:{}};this.run=null;this.restore(saved)}

  get selected(){return eventById(this.profile.selected)}
  event(id){return eventById(id)}
  isUnlocked(id,reputation=0){return Math.max(0,Number(reputation)||0)>=this.event(id).unlockRep}
  available(reputation=0){return RACE_EVENTS.map(event=>({...event,unlocked:this.isUnlocked(event.id,reputation),record:cleanRecord(this.profile.records[event.id])}))}

  select(id,reputation=0){
    const event=eventById(id);if(event.id!==id)return{ok:false,reason:'event'};if(!this.isUnlocked(id,reputation))return{ok:false,reason:'locked',event,required:event.unlockRep};this.profile.selected=id;return{ok:true,event};
  }

  start(time=0){const event=this.selected;this.run={id:event.id,startedAt:Math.max(0,Number(time)||0),finished:false};return{ok:true,event,run:{...this.run}}}

  finish({position=12,elapsed=0}={}){
    if(!this.run||this.run.finished)return{ok:false,reason:'run'};const event=eventById(this.run.id),rank=clamp(Math.floor(Number(position)||12),1,12),time=Math.max(0,Number(elapsed)||0),record=cleanRecord(this.profile.records[event.id]),previousBest=record.bestTime,placement=clamp((13-rank)/12,0,1);
    record.attempts++;if(rank===1)record.wins++;record.bestPosition=record.bestPosition==null?rank:Math.min(record.bestPosition,rank);if(time>0)record.bestTime=record.bestTime==null?time:Math.min(record.bestTime,time);this.profile.records[event.id]=record;this.run.finished=true;
    const reward={credits:Math.round(event.reward.credits*(.48+placement*.72)),xp:Math.round(event.reward.xp*(.58+placement*.55)),rep:rank===1?event.reward.rep:Math.round(event.reward.rep*(.35+placement*.5))};reward.season=reward.xp;
    return{ok:true,event,position:rank,elapsed:time,reward,record:{...record},personalBest:time>0&&(previousBest==null||time<previousBest)};
  }

  serialize(){return{selected:this.profile.selected,records:Object.fromEntries(Object.entries(this.profile.records).map(([id,record])=>[id,cleanRecord(record)]))}}
  restore(saved){if(!saved||typeof saved!=='object')return this.serialize();const selected=eventById(saved.selected);this.profile.selected=selected.id;this.profile.records={};for(const event of RACE_EVENTS)if(saved.records?.[event.id])this.profile.records[event.id]=cleanRecord(saved.records[event.id]);this.run=null;return this.serialize()}
  snapshot(reputation=0){return{selected:this.selected,events:this.available(reputation),run:this.run?{...this.run}:null}}
}
