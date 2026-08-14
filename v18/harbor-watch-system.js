const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):min));
const label=(ko,en)=>Object.freeze({ko,en});

export const HARBOR_WATCH_ZONE=Object.freeze({
  id:'golden-marina-no-wake',
  name:label('골든 마리나 저속 운항 구역','GOLDEN MARINA NO-WAKE ZONE'),
  x:230,
  z:523,
  radius:270,
  innerRadius:135,
  speedLimitMps:11,
  innerSpeedLimitMps:8,
  warningGraceSeconds:2.5,
  incidentCooldownSeconds:7,
  heaveToSpeedMps:2.5,
  heaveToSeconds:4,
});

export const HARBOR_WATCH_LEVELS=Object.freeze([
  Object.freeze({tier:0,id:'clear',name:label('정상 운항','CLEAR PASSAGE'),patrols:0,color:'#78efc0'}),
  Object.freeze({tier:1,id:'advisory',name:label('안전 운항 안내','SAFETY ADVISORY'),patrols:1,color:'#ffd27d'}),
  Object.freeze({tier:2,id:'intercept',name:label('정선 요청','PATROL INTERCEPT'),patrols:1,color:'#ff9d66'}),
  Object.freeze({tier:3,id:'port-hold',name:label('항만 통제','PORT HOLD'),patrols:2,color:'#ff645b'}),
]);

export const HARBOR_WATCH_INCIDENTS=Object.freeze({
  'unsafe-wake':Object.freeze({id:'unsafe-wake',name:label('마리나 과속 항적','UNSAFE MARINA WAKE'),severity:18}),
  'boosted-marina':Object.freeze({id:'boosted-marina',name:label('마리나 급가속','BOOSTED MARINA RUN'),severity:27}),
  'patrol-contact':Object.freeze({id:'patrol-contact',name:label('순찰선 접촉','PATROL CONTACT'),severity:34}),
});

const levelFor=(score,outstandingFine=0)=>{
  const value=clamp(score,0,100);
  if(value>=72)return HARBOR_WATCH_LEVELS[3];
  if(value>=42)return HARBOR_WATCH_LEVELS[2];
  if(value>=18||outstandingFine>0)return HARBOR_WATCH_LEVELS[1];
  return HARBOR_WATCH_LEVELS[0];
};
const cleanProfile=value=>({
  incidents:Math.max(0,Math.floor(Number(value?.incidents)||0)),
  finesPaid:Math.max(0,Math.floor(Number(value?.finesPaid)||0)),
  totalFines:Math.max(0,Math.floor(Number(value?.totalFines)||0)),
  complianceAwards:Math.max(0,Math.floor(Number(value?.complianceAwards)||0)),
  bestCleanSeconds:Math.max(0,Number(value?.bestCleanSeconds)||0),
});

export class HarborWatchDirector{
  constructor(saved=null,{zone=HARBOR_WATCH_ZONE}={}){
    this.zone=zone;this.events=[];this.score=0;this.outstandingFine=0;this.violationSeconds=0;this.heaveToSeconds=0;this.cleanSeconds=0;this.lastIncidentAt=-Infinity;this.lastContext={mode:'water',gameMode:'FREE',x:zone.x,z:zone.z,speed:0,boosting:false,inZone:true,innerZone:true,speedLimit:zone.innerSpeedLimitMps};this.profile=cleanProfile();this.restore(saved);
  }
  level(){return levelFor(this.score,this.outstandingFine)}
  reportIncident(type,time=0,{severity,context=null}={}){
    const definition=HARBOR_WATCH_INCIDENTS[type]||HARBOR_WATCH_INCIDENTS['unsafe-wake'],before=this.level(),amount=clamp(severity??definition.severity,1,60);
    this.score=clamp(this.score+amount,0,100);this.profile.incidents++;this.lastIncidentAt=Number(time)||0;this.heaveToSeconds=0;
    const after=this.level();if(after.tier>=2){const quoted=Math.round(420+after.tier*360+this.score*13);this.outstandingFine=Math.max(this.outstandingFine,quoted)}
    const event={type:'incident',incident:definition,severity:amount,score:this.score,level:after,context};
    this.events.push(event);if(after.tier>before.tier)this.events.push({type:'escalated',from:before,to:after,fine:this.outstandingFine,incident:definition});return event;
  }
  settle(wallet=0){
    const fine=Math.max(0,Math.floor(this.outstandingFine)),available=Math.max(0,Math.floor(Number(wallet)||0)),ready=this.heaveToSeconds>=this.zone.heaveToSeconds;
    if(!fine)return{ok:false,reason:'clear',wallet:available,fine:0};
    if(!ready)return{ok:false,reason:'heave-to',wallet:available,fine};
    if(available<fine){this.events.push({type:'insufficient',fine,wallet:available});return{ok:false,reason:'wallet',wallet:available,fine}};
    const previous=this.level();this.outstandingFine=0;this.score=0;this.heaveToSeconds=0;this.violationSeconds=0;this.cleanSeconds=0;this.profile.finesPaid++;this.profile.totalFines+=fine;const result={ok:true,fine,wallet:available-fine,previous,level:this.level()};this.events.push({type:'settled',...result});return result;
  }
  update({dt=0,time=0,mode='water',gameMode='FREE',x=this.zone.x,z=this.zone.z,speed=0,boosting=false,exempt=false}={}){
    const step=clamp(dt,0,.25),distance=Math.hypot((Number(x)||0)-this.zone.x,(Number(z)||0)-this.zone.z),inZone=mode==='water'&&distance<=this.zone.radius,innerZone=inZone&&distance<=this.zone.innerRadius,speedLimit=innerZone?this.zone.innerSpeedLimitMps:this.zone.speedLimitMps,absoluteSpeed=Math.abs(Number(speed)||0),enforcement=inZone&&gameMode!=='RACE'&&!exempt,speeding=enforcement&&absoluteSpeed>speedLimit+1.25;
    this.lastContext={mode,gameMode,x:Number(x)||0,z:Number(z)||0,speed:absoluteSpeed,boosting:Boolean(boosting),distance,inZone,innerZone,speedLimit,enforcement,speeding};
    if(speeding){
      this.violationSeconds+=step;
      if(this.violationSeconds>=this.zone.warningGraceSeconds&&(Number(time)||0)-this.lastIncidentAt>=this.zone.incidentCooldownSeconds){const incidentType=boosting||absoluteSpeed>speedLimit*1.65?'boosted-marina':'unsafe-wake',severity=(innerZone?5:0)+(boosting?5:0);this.reportIncident(incidentType,time,{severity:HARBOR_WATCH_INCIDENTS[incidentType].severity+severity,context:{distance,innerZone,speed:absoluteSpeed,speedLimit}});this.violationSeconds=0}
    }else this.violationSeconds=Math.max(0,this.violationSeconds-step*1.8);

    const requiresSettlement=this.outstandingFine>0,heavingTo=requiresSettlement&&inZone&&absoluteSpeed<=this.zone.heaveToSpeedMps;
    if(heavingTo)this.heaveToSeconds=Math.min(this.zone.heaveToSeconds,this.heaveToSeconds+step);
    else this.heaveToSeconds=Math.max(0,this.heaveToSeconds-step*1.7);

    const beforeDecay=this.level();
    if(!speeding&&this.score>0){const decay=requiresSettlement?(inZone?.08:.42):(inZone?.34:1.1);this.score=Math.max(0,this.score-decay*step)}
    const afterDecay=this.level();if(afterDecay.tier<beforeDecay.tier)this.events.push({type:'deescalated',from:beforeDecay,to:afterDecay,fine:this.outstandingFine});

    const clean=enforcement&&!speeding&&!requiresSettlement&&absoluteSpeed<=speedLimit;
    if(clean){this.cleanSeconds+=step;this.profile.bestCleanSeconds=Math.max(this.profile.bestCleanSeconds,this.cleanSeconds);if(this.cleanSeconds>=120){this.cleanSeconds=0;this.profile.complianceAwards++;this.events.push({type:'good-standing',reward:{credits:180,rep:18}})}}else if(speeding||requiresSettlement)this.cleanSeconds=0;
    return this.snapshot();
  }
  snapshot(){
    const level=this.level(),context={...this.lastContext},holdProgress=this.zone.heaveToSeconds?clamp(this.heaveToSeconds/this.zone.heaveToSeconds,0,1):0;
    return{level,tier:level.tier,score:Number(this.score.toFixed(2)),outstandingFine:this.outstandingFine,requiresSettlement:this.outstandingFine>0,heavingTo:this.outstandingFine>0&&context.inZone&&context.speed<=this.zone.heaveToSpeedMps,settleReady:this.outstandingFine>0&&holdProgress>=1,heaveToSeconds:Number(this.heaveToSeconds.toFixed(2)),holdProgress,violationProgress:clamp(this.violationSeconds/this.zone.warningGraceSeconds,0,1),cleanSeconds:Number(this.cleanSeconds.toFixed(2)),patrols:level.patrols,zone:this.zone,context,profile:{...this.profile}};
  }
  drainEvents(){const events=this.events;this.events=[];return events}
  serialize(){return{score:Number(this.score.toFixed(2)),outstandingFine:Math.max(0,Math.floor(this.outstandingFine)),profile:cleanProfile(this.profile)}}
  restore(saved){
    if(!saved||typeof saved!=='object')return this.serialize();this.score=clamp(saved.score,0,100);this.outstandingFine=Math.max(0,Math.floor(Number(saved.outstandingFine)||0));this.profile=cleanProfile(saved.profile);this.violationSeconds=0;this.heaveToSeconds=0;this.cleanSeconds=0;return this.serialize();
  }
}
