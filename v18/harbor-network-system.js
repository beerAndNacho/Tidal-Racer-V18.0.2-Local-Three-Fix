const label=(ko,en)=>({ko,en});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const clone=value=>JSON.parse(JSON.stringify(value));
const RARITY_RANK={common:0,uncommon:1,rare:2,epic:3,legendary:4};

export const HARBOR_STANDING_TIERS=[
  {id:'deckhand',min:0,name:label('견습 갑판원','DECKHAND')},
  {id:'coast-runner',min:120,name:label('연안 주자','COAST RUNNER')},
  {id:'harbor-trust',min:320,name:label('항만 신뢰','HARBOR TRUST')},
  {id:'tide-broker',min:700,name:label('조류 중개인','TIDE BROKER')},
  {id:'archipelago-envoy',min:1200,name:label('군도 특사','ARCHIPELAGO ENVOY')},
];

export const HARBOR_CONTRACT_TEMPLATES=[
  {id:'podium-run',minTier:0,durationHours:16,baseCredits:1400,baseStanding:38,risk:'standard',title:label('포디엄 특송','PODIUM COURIER'),brief:label('항만 화물의 우선권을 증명할 공식 레이스 기록이 필요합니다.','Prove priority status for harbor cargo with an official race result.')},
  {id:'fresh-order',minTier:0,durationHours:20,baseCredits:1200,baseStanding:34,risk:'standard',title:label('당일 선어 주문','SAME-DAY CATCH'),brief:label('지역 식당에 납품할 신선한 어획물을 확보하십시오.','Land a fresh catch for the local restaurant network.')},
  {id:'value-haul',minTier:1,durationHours:24,baseCredits:1900,baseStanding:48,risk:'high-yield',title:label('블루워터 매입','BLUE-WATER BUY ORDER'),brief:label('지정 가치 이상의 어획물을 모아 경매 물량을 채우십시오.','Fill an auction lot with catches above the requested total value.')},
  {id:'safety-patrol',minTier:0,durationHours:18,baseCredits:1600,baseStanding:42,risk:'standard',title:label('연안 안전 순찰','COASTAL SAFETY PATROL'),brief:label('항로의 긴급 월드 활동을 해결해 안전 등급을 회복하십시오.','Resolve an urgent world activity and restore the route safety rating.')},
  {id:'island-chain',minTier:1,durationHours:30,baseCredits:2300,baseStanding:58,risk:'expedition',title:label('군도 표본 항해','ISLAND CHAIN SURVEY'),brief:label('여러 해역을 확인하고 현지 어종 표본을 확보하십시오.','Survey multiple waters and secure a local fish specimen.')},
  {id:'crew-readiness',minTier:1,durationHours:18,baseCredits:1750,baseStanding:46,risk:'standard',title:label('선원 준비 태세','CREW READINESS'),brief:label('식사와 체력 훈련을 마친 뒤 공식 레이스를 완주하십시오.','Eat, train, then finish an official race with the crew ready.')},
  {id:'grand-tour',minTier:2,durationHours:36,baseCredits:3200,baseStanding:74,risk:'elite',title:label('타이달 그랜드 투어','TIDAL GRAND TOUR'),brief:label('레이스·낚시·구조 활동을 잇는 항만 최고 등급 의뢰입니다.','A top-tier harbor commission linking racing, fishing, and rescue work.')},
];

export function harborClockValue(clock={}){
  const day=Math.max(1,Math.floor(Number(clock.day)||1));
  const hour=clamp(Number(clock.hour)||0,0,23.999);
  return(day-1)*24+hour;
}

export function harborTierFor(standing=0){
  let tier=HARBOR_STANDING_TIERS[0];
  for(const candidate of HARBOR_STANDING_TIERS)if(standing>=candidate.min)tier=candidate;
  return{...tier,index:HARBOR_STANDING_TIERS.indexOf(tier)};
}

function objectivesFor(template,tierIndex){
  switch(template.id){
    case'podium-run':return[{id:'race-result',event:'race',target:1,maxPosition:tierIndex>=3?2:3,label:label(`${tierIndex>=3?2:3}위 이내 공식 레이스`,`OFFICIAL RACE · TOP ${tierIndex>=3?2:3}`)}];
    case'fresh-order':{const target=2+Math.floor(tierIndex/2);return[{id:'fresh-catch',event:'fish',target,minRarity:tierIndex>=3?'uncommon':'common',label:label(`신선한 어획 ${target}마리`,`LAND ${target} FRESH FISH`)}]}
    case'value-haul':{const target=900+tierIndex*450;return[{id:'catch-value',event:'fish',target,sumField:'value',label:label(`어획 가치 ${target.toLocaleString()} CR`,`CATCH VALUE ${target.toLocaleString()} CR`)}]}
    case'safety-patrol':{const target=tierIndex>=3?2:1;return[{id:'world-response',event:'activity',target,label:label(`월드 활동 ${target}회 해결`,`CLEAR ${target} WORLD ACTIVIT${target===1?'Y':'IES'}`)}]}
    case'island-chain':{const target=tierIndex>=3?3:2;return[{id:'region-survey',event:'region',target,uniqueField:'region',label:label(`서로 다른 해역 ${target}곳 발견`,`DISCOVER ${target} UNIQUE REGIONS`)},{id:'survey-catch',event:'fish',target:1,label:label('현지 어종 표본 1마리','LAND 1 LOCAL SPECIMEN')}]}
    case'crew-readiness':return[{id:'meal',event:'life',target:1,facilityId:'restaurant',label:label('음식점에서 식사','EAT AT THE RESTAURANT')},{id:'training',event:'life',target:1,facilityId:'gym',label:label('체육관에서 훈련','TRAIN AT THE GYM')},{id:'finish-race',event:'race',target:1,maxPosition:12,label:label('공식 레이스 완주','FINISH AN OFFICIAL RACE')}];
    case'grand-tour':return[{id:'tour-race',event:'race',target:1,maxPosition:4,label:label('레이스 4위 이내','RACE · TOP 4')},{id:'tour-fish',event:'fish',target:1,minRarity:'uncommon',label:label('고급 이상 어종 1마리','LAND 1 UNCOMMON+ FISH')},{id:'tour-activity',event:'activity',target:1,label:label('월드 활동 1회 해결','CLEAR 1 WORLD ACTIVITY')}];
    default:return[];
  }
}

function rewardFor(template,tierIndex){
  const scale=1+tierIndex*.24;
  return{credits:Math.round(template.baseCredits*scale/50)*50,xp:Math.round((420+tierIndex*135)*scale),rep:42+tierIndex*16,standing:template.baseStanding+tierIndex*7};
}

function createOffer(template,tierIndex,day,slot){
  return{id:`day-${day}-${slot}-${template.id}`,templateId:template.id,title:clone(template.title),brief:clone(template.brief),risk:template.risk,durationHours:template.durationHours,minTier:template.minTier,day,objectives:objectivesFor(template,tierIndex).map(objective=>({...objective,progress:0,uniqueValues:[]})),reward:rewardFor(template,tierIndex)};
}

function shuffledTemplates(seed,day,tierIndex){
  let state=(seed^(day*2654435761)^((tierIndex+1)*2246822519))>>>0;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296};
  const pool=HARBOR_CONTRACT_TEMPLATES.filter(template=>template.minTier<=tierIndex);
  for(let index=pool.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[pool[index],pool[swap]]=[pool[swap],pool[index]]}
  return pool;
}

function objectiveMatches(objective,event,payload){
  if(objective.event!==event)return false;
  if(Number.isFinite(objective.maxPosition)&&Number(payload.position)>objective.maxPosition)return false;
  if(objective.minRarity&&(RARITY_RANK[payload.rarity]??-1)<RARITY_RANK[objective.minRarity])return false;
  if(objective.facilityId&&payload.facilityId!==objective.facilityId)return false;
  if(Array.isArray(objective.facilityIds)&&!objective.facilityIds.includes(payload.facilityId))return false;
  return true;
}

function safeHistory(history){return Array.isArray(history)?history.filter(item=>item&&typeof item==='object').slice(0,12).map(clone):[]}

export class HarborNetworkDirector{
  constructor({seed=1802}={}){
    this.seed=seed;this.standing=0;this.offerDay=0;this.offers=[];this.active=null;this.history=[];this.completed=0;this.failed=0;this.sequence=0;
  }
  refresh(clock,force=false){
    const day=Math.max(1,Math.floor(Number(clock?.day)||1));
    if(!force&&this.offerDay===day&&this.offers.length)return false;
    const tier=harborTierFor(this.standing),pool=shuffledTemplates(this.seed,day,tier.index);
    this.offers=pool.slice(0,3).map((template,index)=>createOffer(template,tier.index,day,index+1));this.offerDay=day;return true;
  }
  restore(saved,clock={day:1,hour:0}){
    if(!saved||typeof saved!=='object'){this.refresh(clock);return this.snapshot(clock)}
    this.standing=Math.max(0,Math.floor(Number(saved.standing)||0));this.offerDay=Math.max(0,Math.floor(Number(saved.offerDay)||0));
    this.offers=Array.isArray(saved.offers)?saved.offers.slice(0,3).map(clone):[];this.active=saved.active&&typeof saved.active==='object'?clone(saved.active):null;
    this.history=safeHistory(saved.history);this.completed=Math.max(0,Math.floor(Number(saved.completed)||0));this.failed=Math.max(0,Math.floor(Number(saved.failed)||0));this.sequence=Math.max(0,Math.floor(Number(saved.sequence)||0));
    this.refresh(clock);this.tick(clock);return this.snapshot(clock);
  }
  accept(offerId,clock){
    this.tick(clock);this.refresh(clock);if(this.active)return{ok:false,reason:'active-contract',contract:clone(this.active)};
    const offer=this.offers.find(candidate=>candidate.id===offerId);if(!offer)return{ok:false,reason:'offer-missing'};
    const now=harborClockValue(clock);this.sequence++;
    this.active={...clone(offer),instanceId:`hn-${this.sequence}-${offer.id}`,status:'active',acceptedAt:now,deadline:now+offer.durationHours,completedAt:null};
    return{ok:true,type:'accepted',contract:clone(this.active)};
  }
  tick(clock){
    this.refresh(clock);if(!this.active||this.active.status!=='active')return null;
    const now=harborClockValue(clock);if(now<=this.active.deadline)return null;
    const expired={...clone(this.active),status:'expired',closedAt:now};this.history.unshift(expired);this.history=this.history.slice(0,12);this.active=null;this.failed++;this.standing=Math.max(0,this.standing-5);
    return{type:'expired',contract:expired,standing:this.standing};
  }
  record(event,payload={},clock={day:1,hour:0}){
    const expiry=this.tick(clock);if(expiry)return expiry;if(!this.active||this.active.status!=='active')return null;
    let changed=false;
    for(const objective of this.active.objectives){
      if(objective.progress>=objective.target||!objectiveMatches(objective,event,payload))continue;
      if(objective.uniqueField){
        const value=String(payload[objective.uniqueField]??'');if(!value||objective.uniqueValues.includes(value))continue;
        objective.uniqueValues.push(value);objective.progress=Math.min(objective.target,objective.uniqueValues.length);changed=true;continue;
      }
      const increment=objective.sumField?Math.max(0,Number(payload[objective.sumField])||0):1;if(!increment)continue;
      objective.progress=Math.min(objective.target,objective.progress+increment);changed=true;
    }
    if(!changed)return null;
    const ready=this.active.objectives.every(objective=>objective.progress>=objective.target);
    if(ready){this.active.status='ready';this.active.completedAt=harborClockValue(clock);return{type:'ready',contract:clone(this.active)}}
    return{type:'progress',contract:clone(this.active)};
  }
  claim(clock){
    if(!this.active||this.active.status!=='ready')return{ok:false,reason:'not-ready'};
    const previousTier=harborTierFor(this.standing),completed={...clone(this.active),status:'completed',closedAt:harborClockValue(clock)};
    this.standing+=completed.reward.standing;this.completed++;this.history.unshift(completed);this.history=this.history.slice(0,12);this.active=null;
    const tier=harborTierFor(this.standing),tierUp=tier.index>previousTier.index;if(tierUp)this.refresh(clock,true);
    return{ok:true,type:'claimed',contract:completed,reward:clone(completed.reward),standing:this.standing,tier,tierUp};
  }
  abandon(clock){
    if(!this.active)return{ok:false,reason:'no-contract'};
    const contract={...clone(this.active),status:'abandoned',closedAt:harborClockValue(clock)};this.history.unshift(contract);this.history=this.history.slice(0,12);this.active=null;this.standing=Math.max(0,this.standing-8);return{ok:true,type:'abandoned',contract,standing:this.standing};
  }
  snapshot(clock={day:1,hour:0}){
    const tier=harborTierFor(this.standing),active=this.active?clone(this.active):null,timeRemaining=active?Math.max(0,active.deadline-harborClockValue(clock)):0;
    const progress=active&&active.objectives.length?active.objectives.reduce((sum,objective)=>sum+clamp(objective.progress/objective.target,0,1),0)/active.objectives.length:0;
    return{standing:this.standing,tier,offerDay:this.offerDay,offers:clone(this.offers),active,history:clone(this.history),completed:this.completed,failed:this.failed,timeRemaining,progress};
  }
  serialize(){return{version:1,standing:this.standing,offerDay:this.offerDay,offers:clone(this.offers),active:this.active?clone(this.active):null,history:clone(this.history),completed:this.completed,failed:this.failed,sequence:this.sequence}}
}
