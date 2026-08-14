const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
const label=(ko,en)=>Object.freeze({ko,en});

export const CITY_DELIVERY_CONTRACT=Object.freeze({
  id:'coast-courier-run',
  name:label('코스트 특급 배송','COAST EXPRESS DELIVERY'),
  role:label('시장 화물 밴에서 봉인된 배송 상자를 수령해 항만 업무처 세 곳에 전달하세요.','Collect a sealed route box from the market van and serve three waterfront businesses.'),
  duration:190,
  basePay:680,
  fastBonus:320,
  reward:Object.freeze({xp:110,rep:16}),
  requirements:Object.freeze({energy:35,hunger:25}),
  checkpoints:Object.freeze([
    Object.freeze({id:'market-van-pickup',kind:'pickup',name:label('코스트 마켓 배송 밴','COAST MARKET DELIVERY VAN'),x:104,z:399.2,radius:2.6}),
    Object.freeze({id:'harbor-office-drop',kind:'drop',name:label('골든 코스트 항만청','GOLDEN COAST HARBOR OFFICE'),x:223,z:384.2,radius:3.1}),
    Object.freeze({id:'fish-auction-drop',kind:'drop',name:label('골든 코스트 어시장','GOLDEN COAST FISH AUCTION'),x:331,z:384.2,radius:3.1}),
    Object.freeze({id:'marina-crossing-north',kind:'crossing',name:label('마리나 횡단보도 북쪽','MARINA CROSSING · NORTH CURB'),x:358,z:388.4,radius:3.2}),
    Object.freeze({id:'marina-crossing-south',kind:'crossing',name:label('마리나 횡단보도 남쪽','MARINA CROSSING · SOUTH CURB'),x:358,z:430,radius:3.2}),
    Object.freeze({id:'tidal-square-drop',kind:'drop',name:label('타이달 광장 키오스크','TIDAL SQUARE KIOSK'),x:505,z:437,radius:3.4}),
  ]),
});

const defaultProfile=()=>({
  completed:0,failed:0,cancelled:0,totalEarnings:0,bestSeconds:null,lastCompletedDay:0,lastResult:null,
});

function cleanProfile(saved){
  const profile=defaultProfile(),source=saved&&typeof saved==='object'?saved:{};
  for(const key of['completed','failed','cancelled','totalEarnings','lastCompletedDay'])if(Number.isFinite(source[key]))profile[key]=Math.max(0,Math.floor(source[key]));
  if(Number.isFinite(source.bestSeconds)&&source.bestSeconds>0)profile.bestSeconds=Number(source.bestSeconds);
  if(source.lastResult&&typeof source.lastResult==='object')profile.lastResult={...source.lastResult};
  return profile;
}

function cleanActive(saved){
  if(!saved||typeof saved!=='object')return null;
  const checkpointIndex=Math.floor(Number(saved.checkpointIndex)),remaining=Number(saved.remaining),elapsed=Number(saved.elapsed);
  if(!Number.isInteger(checkpointIndex)||checkpointIndex<0||checkpointIndex>=CITY_DELIVERY_CONTRACT.checkpoints.length||!Number.isFinite(remaining)||remaining<=0)return null;
  return{
    contractId:CITY_DELIVERY_CONTRACT.id,
    day:Math.max(1,Math.floor(Number(saved.day)||1)),
    checkpointIndex,
    remaining:clamp(remaining,0,CITY_DELIVERY_CONTRACT.duration),
    elapsed:clamp(elapsed,0,CITY_DELIVERY_CONTRACT.duration),
    carryingParcel:Boolean(saved.carryingParcel),
    delivered:clamp(Math.floor(Number(saved.delivered)||0),0,3),
  };
}

export class CityDeliveryDirector{
  constructor(saved){this.profile=defaultProfile();this.active=null;this.events=[];this.restore(saved)}
  quote({day=1,mode='interior',facilityId=null,needs={}}={}){
    const contract=CITY_DELIVERY_CONTRACT,requirements=[];
    for(const [key,value] of Object.entries(contract.requirements))if((Number(needs[key])||0)<value)requirements.push([key,value]);
    const active=Boolean(this.active),worked=this.profile.lastCompletedDay===Math.max(1,Math.floor(Number(day)||1)),atDesk=mode==='interior'&&facilityId==='grocery';
    return{contract,active,worked,atDesk,requirements,ok:!active&&!worked&&atDesk&&!requirements.length,profile:{...this.profile}};
  }
  start(context={}){
    const quote=this.quote(context);
    if(!quote.ok)return{ok:false,reason:quote.active?'active':quote.worked?'worked':!quote.atDesk?'location':'needs',...quote};
    this.active={contractId:CITY_DELIVERY_CONTRACT.id,day:Math.max(1,Math.floor(Number(context.day)||1)),checkpointIndex:0,remaining:CITY_DELIVERY_CONTRACT.duration,elapsed:0,carryingParcel:false,delivered:0};
    const event={type:'start',contract:CITY_DELIVERY_CONTRACT,target:CITY_DELIVERY_CONTRACT.checkpoints[0]};this.events.push(event);
    return{ok:true,...event,snapshot:this.snapshot()};
  }
  cancel(reason='player-cancelled'){
    if(!this.active)return{ok:false,reason:'inactive'};
    const elapsed=this.active.elapsed,result={status:'cancelled',reason,day:this.active.day,elapsed,delivered:this.active.delivered,reward:{credits:0,xp:0,rep:0}};
    this.profile.cancelled++;this.profile.lastResult=result;this.active=null;const event={ok:true,type:'cancelled',result};this.events.push(event);return event;
  }
  fail(reason='time-expired'){
    if(!this.active)return{ok:false,reason:'inactive'};
    const result={status:'failed',reason,day:this.active.day,elapsed:this.active.elapsed,delivered:this.active.delivered,reward:{credits:0,xp:0,rep:0}};
    this.profile.failed++;this.profile.lastResult=result;this.active=null;const event={ok:true,type:'failed',result};this.events.push(event);return event;
  }
  complete(){
    if(!this.active)return{ok:false,reason:'inactive'};
    const contract=CITY_DELIVERY_CONTRACT,elapsed=Math.min(contract.duration,this.active.elapsed),timeBonus=Math.round(contract.fastBonus*clamp(this.active.remaining/contract.duration)/10)*10,credits=contract.basePay+timeBonus,reward={credits,xp:contract.reward.xp,rep:contract.reward.rep},result={status:'completed',day:this.active.day,elapsed,timeBonus,delivered:this.active.delivered,reward};
    this.profile.completed++;this.profile.totalEarnings+=credits;this.profile.lastCompletedDay=this.active.day;this.profile.bestSeconds=this.profile.bestSeconds==null?elapsed:Math.min(this.profile.bestSeconds,elapsed);this.profile.lastResult=result;this.active=null;
    const event={ok:true,type:'completed',contract,result};this.events.push(event);return event;
  }
  update({dt=0,position=null,mode='foot'}={}){
    if(!this.active)return this.snapshot(position);
    if(mode==='water'){this.fail('boarded-craft');return this.snapshot(position)}
    const step=Math.max(0,Number(dt)||0);this.active.elapsed=Math.min(CITY_DELIVERY_CONTRACT.duration,this.active.elapsed+step);this.active.remaining=Math.max(0,this.active.remaining-step);
    if(this.active.remaining<=0){this.fail('time-expired');return this.snapshot(position)}
    if(mode!=='foot'||!position)return this.snapshot(position);
    const checkpoint=CITY_DELIVERY_CONTRACT.checkpoints[this.active.checkpointIndex],distance=Math.hypot(Number(position.x)-checkpoint.x,Number(position.z)-checkpoint.z);
    if(distance<=checkpoint.radius){
      if(checkpoint.kind==='pickup')this.active.carryingParcel=true;
      if(checkpoint.kind==='drop')this.active.delivered++;
      const completedIndex=this.active.checkpointIndex;this.active.checkpointIndex++;
      if(this.active.checkpointIndex>=CITY_DELIVERY_CONTRACT.checkpoints.length)this.complete();
      else this.events.push({type:'checkpoint',checkpoint,index:completedIndex,next:CITY_DELIVERY_CONTRACT.checkpoints[this.active.checkpointIndex],carryingParcel:this.active.carryingParcel,delivered:this.active.delivered});
    }
    return this.snapshot(position);
  }
  drainEvents(){return this.events.splice(0)}
  snapshot(position=null){
    const active=this.active?{...this.active}:null,target=active?CITY_DELIVERY_CONTRACT.checkpoints[active.checkpointIndex]:null,distance=target&&position?Math.hypot(Number(position.x)-target.x,Number(position.z)-target.z):null;
    return{contract:CITY_DELIVERY_CONTRACT,active:Boolean(active),state:active?'active':this.profile.lastResult?.status||'idle',run:active,target,distance,progress:active?active.checkpointIndex/CITY_DELIVERY_CONTRACT.checkpoints.length:(this.profile.lastResult?.status==='completed'?1:0),profile:{...this.profile}};
  }
  serialize(){return{profile:{...this.profile},active:this.active?{...this.active}:null}}
  restore(saved){
    if(!saved||typeof saved!=='object')return this.serialize();this.profile=cleanProfile(saved.profile||saved);this.active=cleanActive(saved.active);this.events=[];return this.serialize();
  }
}
