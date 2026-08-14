const label=(ko,en)=>({ko,en});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const CITY_JOBS=Object.freeze([
  {id:'dock-crew',facilityId:'harbor-office',name:label('항만 갑판 근무','HARBOR DECK CREW'),role:label('입출항 안전과 화물 계류를 담당합니다.','Secure arrivals, departures, and cargo lines.'),hours:4,open:6,close:18,basePay:920,unlockRep:0,requirements:{energy:34,hunger:24,hygiene:18},effects:{energy:-24,hunger:-17,hygiene:-18,mood:4}},
  {id:'marina-tech',facilityId:'marina-workshop',name:label('마리나 정비 보조','MARINA TECHNICIAN'),role:label('기체 점검과 부품 정리를 지원합니다.','Assist inspections, service bays, and parts inventory.'),hours:3.5,open:8,close:20,basePay:880,unlockRep:120,requirements:{energy:32,hunger:22,hygiene:20},effects:{energy:-20,hunger:-14,hygiene:-15,mood:3}},
  {id:'market-stocker',facilityId:'grocery',name:label('해안 마켓 진열 근무','COAST MARKET STOCKER'),role:label('신선 상품을 검수하고 매장을 정리합니다.','Receive fresh goods and prepare the shop floor.'),hours:3,open:7,close:17,basePay:680,unlockRep:0,requirements:{energy:26,hunger:20,hygiene:20},effects:{energy:-16,hunger:-12,hygiene:-10,mood:2}},
  {id:'kitchen-shift',facilityId:'restaurant',name:label('마리나 키친 교대','MARINA KITCHEN SHIFT'),role:label('주방 준비와 해안 식당 서비스를 돕습니다.','Support prep work and a busy coastal service.'),hours:4,open:10,close:23,basePay:790,unlockRep:260,requirements:{energy:36,hunger:25,hygiene:38},effects:{energy:-23,hunger:-18,hygiene:-20,mood:5}},
  {id:'auction-runner',facilityId:'fish-market',name:label('수산 경매 운반 근무','FISH AUCTION RUNNER'),role:label('새벽 경매 물량과 낙찰표를 운반합니다.','Move early auction lots and winning tickets.'),hours:3,open:5,close:14,basePay:840,unlockRep:180,requirements:{energy:34,hunger:22,hygiene:16},effects:{energy:-22,hunger:-15,hygiene:-17,mood:3}},
  {id:'lounge-crew',facilityId:'nightlife',name:label('블루 웨이브 야간 근무','BLUE WAVE NIGHT CREW'),role:label('공연장 운영과 손님 응대를 맡습니다.','Run the floor and support the live venue.'),hours:4,open:18,close:4,basePay:1020,unlockRep:520,requirements:{energy:42,hunger:28,hygiene:45},effects:{energy:-28,hunger:-20,hygiene:-22,mood:9}}
].map(job=>Object.freeze({...job,name:Object.freeze(job.name),role:Object.freeze(job.role),requirements:Object.freeze(job.requirements),effects:Object.freeze(job.effects)})));

const jobById=id=>CITY_JOBS.find(job=>job.id===id);
const isOpen=(job,hour)=>job.open<job.close?hour>=job.open&&hour<=job.close:hour>=job.open||hour<=job.close;
const cleanRecord=value=>({
  shifts:Math.max(0,Math.floor(Number(value?.shifts)||0)),
  xp:Math.max(0,Math.floor(Number(value?.xp)||0)),
  level:Math.max(1,Math.min(10,Math.floor(Number(value?.level)||1))),
  earnings:Math.max(0,Math.floor(Number(value?.earnings)||0)),
  bestPay:Math.max(0,Math.floor(Number(value?.bestPay)||0)),
  lastDay:Math.floor(Number(value?.lastDay)||0)
});

export class CityJobDirector{
  constructor(saved=null){this.profile={records:{},totalEarnings:0,totalShifts:0};this.restore(saved)}
  record(id){return cleanRecord(this.profile.records[id])}
  jobsAt(facilityId){return CITY_JOBS.filter(job=>job.facilityId===facilityId)}
  quote(id,{day=1,hour=12,reputation=0,needs={}}={}){
    const job=jobById(id);if(!job)return{ok:false,reason:'job'};
    const record=this.record(id),requirements=Object.entries(job.requirements).filter(([key,value])=>(Number(needs[key])||0)<value),open=isOpen(job,Number(hour)||0),unlocked=(Number(reputation)||0)>=job.unlockRep,worked=record.lastDay===Math.floor(Number(day)||1),performance=clamp(((needs.energy||0)*.42+(needs.hunger||0)*.24+(needs.hygiene||0)*.2+(needs.mood||0)*.14)/100,0,1),pay=Math.round(job.basePay*(.72+performance*.34+(record.level-1)*.035));
    return{ok:open&&unlocked&&!worked&&!requirements.length,job,record,open,unlocked,worked,requirements,pay,performance};
  }
  work(id,context={}){
    const quote=this.quote(id,context);if(!quote.ok)return{...quote,reason:!quote.unlocked?'locked':!quote.open?'closed':quote.worked?'worked':quote.requirements.length?'needs':'job'};
    const record=quote.record,previousLevel=record.level,skillXp=55+Math.round(quote.performance*45);record.shifts++;record.xp+=skillXp;record.level=Math.min(10,1+Math.floor(record.xp/240));record.earnings+=quote.pay;record.bestPay=Math.max(record.bestPay,quote.pay);record.lastDay=Math.floor(Number(context.day)||1);this.profile.records[id]=record;this.profile.totalEarnings+=quote.pay;this.profile.totalShifts++;
    return{ok:true,job:quote.job,pay:quote.pay,performance:quote.performance,skillXp,record:{...record},promotion:record.level>previousLevel,effects:{...quote.job.effects},hours:quote.job.hours,profile:this.serialize()};
  }
  serialize(){return{records:Object.fromEntries(Object.entries(this.profile.records).map(([id,value])=>[id,cleanRecord(value)])),totalEarnings:Math.max(0,Math.floor(this.profile.totalEarnings)),totalShifts:Math.max(0,Math.floor(this.profile.totalShifts))}}
  restore(saved){if(!saved||typeof saved!=='object')return this.serialize();this.profile.records={};for(const [id,value] of Object.entries(saved.records||{}))if(jobById(id))this.profile.records[id]=cleanRecord(value);this.profile.totalEarnings=Math.max(0,Math.floor(Number(saved.totalEarnings)||0));this.profile.totalShifts=Math.max(0,Math.floor(Number(saved.totalShifts)||0));return this.serialize()}
  snapshot(context={}){return{jobs:CITY_JOBS.map(job=>this.quote(job.id,context)),...this.serialize()}}
}
