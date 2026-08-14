export const RACE_RULES=Object.freeze({laps:3,countdownSeconds:3.2,gridSpacingMeters:11.5,contactCooldown:.8,maxVisibleLeadMeters:88,laneCenters:[-7.4,0,7.4],overtakeLookaheadMeters:38,packRangeMeters:58});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const lerp=(a,b,t)=>a+(b-a)*t;

export class RivalRaceDirector{
  constructor({trackLength=18000,totalLaps=RACE_RULES.laps}={}){
    this.trackLength=Math.max(1000,Number(trackLength)||18000);this.totalLaps=Math.max(1,Math.floor(Number(totalLaps)||RACE_RULES.laps));this.sequence=0;this.reset();
  }

  configure({trackLength=this.trackLength,totalLaps=this.totalLaps}={}){this.reset();this.trackLength=Math.max(1000,Number(trackLength)||this.trackLength);this.totalLaps=Math.max(1,Math.floor(Number(totalLaps)||this.totalLaps));return{trackLength:this.trackLength,totalLaps:this.totalLaps}}

  reset(){this.active=false;this.phase='idle';this.startedAt=0;this.goAt=0;this.playerLap=1;this.playerT=0;this.lastPlayerT=0;this.playerProgress=0;this.playerRank=1;this.finished=false;this.finishOrder=[];this.rivals=[];this.lastResult=null}

  start(time=0,count=11){
    this.sequence++;this.active=true;this.phase='countdown';this.startedAt=time;this.goAt=time+RACE_RULES.countdownSeconds;this.playerLap=1;this.playerT=0;this.lastPlayerT=0;this.playerProgress=0;this.playerRank=count+1;this.finished=false;this.finishOrder=[];this.lastResult={type:'started',sequence:this.sequence};
    this.rivals=Array.from({length:count},(_,index)=>{const row=Math.floor(index/2)+1,offset=row*RACE_RULES.gridSpacingMeters+(index%2)*2.2,lane=index%2?-7.2:7.2;return{index,progress:offset/this.trackLength,t:offset/this.trackLength,lap:1,lane,laneTarget:lane,speed:0,targetSpeed:0,skill:.74+(index%6)*.022,aggression:.42+(index%5)*.105,laneDecisionAt:0,overtaking:false,blockedBy:null,finished:false,finishPosition:null,contactUntil:0}});
    return this.snapshot(time);
  }

  update(time,dt,{playerT=0,playerSpeed=0,playerLane=0,rivalCrafts=[],lapEligible=true}={}){
    if(!this.active)return this.snapshot(time);dt=clamp(Number(dt)||0,0,.05);playerT=((Number(playerT)||0)%1+1)%1;
    if(time<this.goAt){this.phase='countdown';this.playerT=playerT;this.lastPlayerT=playerT;return this.snapshot(time)}
    this.phase=time<this.goAt+.85?'go':'racing';
    if(this.lastPlayerT>.86&&playerT<.14&&playerSpeed>0&&lapEligible)this.playerLap++;
    else if(this.lastPlayerT<.14&&playerT>.86&&playerSpeed<-.5)this.playerLap=Math.max(1,this.playerLap-1);
    this.playerT=playerT;this.lastPlayerT=playerT;this.playerProgress=Math.max(0,this.playerLap-1+playerT);playerLane=clamp(Number(playerLane)||0,-10,10);
    for(const rival of this.rivals){
      if(rival.finished)continue;const craft=rivalCrafts[rival.index],craftMax=Math.max(28,craft?.max||44),gapMeters=(this.playerProgress-rival.progress)*this.trackLength,catchup=clamp(gapMeters/700,-.13,.17),pressure=.025*Math.sin(time*.19+rival.index*1.71),actors=[{id:'player',progress:this.playerProgress,lane:playerLane,speed:Math.abs(playerSpeed)},...this.rivals.filter(other=>other!==rival&&!other.finished).map(other=>({id:other.index,progress:other.progress,lane:other.lane,speed:other.speed}))],front=actors.map(actor=>({...actor,ahead:(actor.progress-rival.progress)*this.trackLength})).filter(actor=>actor.ahead>0&&actor.ahead<RACE_RULES.overtakeLookaheadMeters&&Math.abs(actor.lane-rival.lane)<4.4).sort((a,b)=>a.ahead-b.ahead)[0]||null;
      if(time>=rival.laneDecisionAt){let bestLane=rival.laneTarget,bestScore=-Infinity;for(const lane of RACE_RULES.laneCenters){let score=-Math.abs(lane-(rival.index%2?-7.4:7.4))*.045+Math.sin(rival.index*2.17+lane)*.08;for(const actor of actors){const longitudinal=(actor.progress-rival.progress)*this.trackLength,laneGap=Math.abs(lane-actor.lane);if(Math.abs(longitudinal)<RACE_RULES.packRangeMeters){const proximity=1-Math.abs(longitudinal)/RACE_RULES.packRangeMeters,laneConflict=Math.max(0,1-laneGap/5);score-=proximity*laneConflict*(longitudinal>0?3.1:1.25)}}if(front&&Math.abs(lane-front.lane)>4.6)score+=.8+rival.aggression;if(score>bestScore){bestScore=score;bestLane=lane}}rival.laneTarget=bestLane;rival.laneDecisionAt=time+.72+(rival.index%4)*.14+(1-rival.aggression)*.28}
      rival.blockedBy=front?.id??null;rival.overtaking=Boolean(front&&Math.abs(rival.laneTarget-front.lane)>4.5);const blocked=front&&front.ahead<18&&!rival.overtaking,flowLimit=blocked?clamp(front.speed/craftMax+.055,.62,.91):1;let target=craftMax*(rival.skill+catchup+pressure)*flowLimit;if(gapMeters<-72)target=Math.min(target,Math.abs(playerSpeed)*.94);rival.targetSpeed=clamp(target,craftMax*.62,craftMax*.96);rival.speed=lerp(rival.speed,rival.targetSpeed,1-Math.exp(-(rival.overtaking?2.05:1.7)*dt));rival.progress+=rival.speed/this.trackLength*dt;if((rival.progress-this.playerProgress)*this.trackLength>RACE_RULES.maxVisibleLeadMeters){rival.progress=this.playerProgress+RACE_RULES.maxVisibleLeadMeters/this.trackLength;rival.speed=Math.min(rival.speed,Math.abs(playerSpeed))}rival.t=((rival.progress%1)+1)%1;rival.lap=Math.floor(Math.max(0,rival.progress))+1;rival.lane=lerp(rival.lane,rival.laneTarget,1-Math.exp(-(1.05+rival.aggression*.55)*dt));
      if(rival.progress>=this.totalLaps){rival.finished=true;rival.finishPosition=this.finishOrder.length+1;this.finishOrder.push({type:'rival',index:rival.index,position:rival.finishPosition,time})}
    }
    this.playerRank=1+this.rivals.filter(rival=>rival.progress>this.playerProgress+.00015).length;
    if(!this.finished&&this.playerProgress>=this.totalLaps){this.finished=true;const position=1+this.finishOrder.length;this.finishOrder.push({type:'player',position,time});this.lastResult={type:'player-finished',position,time};return{...this.snapshot(time),result:this.lastResult}}
    this.lastResult=null;return this.snapshot(time);
  }

  canDrive(time){return !this.active||time>=this.goAt}

  registerContact(index,time){const rival=this.rivals[index];if(!rival||time<rival.contactUntil)return false;rival.contactUntil=time+RACE_RULES.contactCooldown;rival.speed*=.82;return true}
  syncPlayerPosition(playerT=0){const t=((Number(playerT)||0)%1+1)%1;this.playerT=t;this.lastPlayerT=t;this.playerProgress=Math.max(0,this.playerLap-1+t);return this.snapshot()}

  snapshot(time=0){
    const countdown=this.phase==='countdown'?Math.min(3,Math.max(0,Math.ceil(this.goAt-time))):0,closest=this.rivals.filter(rival=>!rival.finished).map(rival=>({...rival,gapMeters:(rival.progress-this.playerProgress)*this.trackLength})).sort((a,b)=>Math.abs(a.gapMeters)-Math.abs(b.gapMeters))[0]||null,packNearby=this.rivals.filter(rival=>!rival.finished&&Math.abs((rival.progress-this.playerProgress)*this.trackLength)<RACE_RULES.packRangeMeters).length,overtaking=this.rivals.filter(rival=>rival.overtaking&&!rival.finished).length;
    return{active:this.active,phase:this.phase,countdown,goFlash:this.phase==='go',playerLap:this.playerLap,playerProgress:this.playerProgress,playerRank:this.playerRank,totalLaps:this.totalLaps,closest,packNearby,overtaking,rivals:this.rivals.map(rival=>({...rival})),finished:this.finished,finishOrder:[...this.finishOrder]};
  }
}
