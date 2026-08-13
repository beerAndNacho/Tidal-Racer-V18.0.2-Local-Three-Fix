export const RACE_RULES=Object.freeze({laps:3,countdownSeconds:3.2,gridSpacingMeters:11.5,contactCooldown:.8,maxVisibleLeadMeters:88});

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const lerp=(a,b,t)=>a+(b-a)*t;

export class RivalRaceDirector{
  constructor({trackLength=18000,totalLaps=RACE_RULES.laps}={}){
    this.trackLength=Math.max(1000,Number(trackLength)||18000);this.totalLaps=totalLaps;this.sequence=0;this.reset();
  }

  reset(){this.active=false;this.phase='idle';this.startedAt=0;this.goAt=0;this.playerLap=1;this.playerT=0;this.lastPlayerT=0;this.playerProgress=0;this.playerRank=1;this.finished=false;this.finishOrder=[];this.rivals=[];this.lastResult=null}

  start(time=0,count=11){
    this.sequence++;this.active=true;this.phase='countdown';this.startedAt=time;this.goAt=time+RACE_RULES.countdownSeconds;this.playerLap=1;this.playerT=0;this.lastPlayerT=0;this.playerProgress=0;this.playerRank=count+1;this.finished=false;this.finishOrder=[];this.lastResult={type:'started',sequence:this.sequence};
    this.rivals=Array.from({length:count},(_,index)=>{const row=Math.floor(index/2)+1,offset=row*RACE_RULES.gridSpacingMeters+(index%2)*2.2;return{index,progress:offset/this.trackLength,t:offset/this.trackLength,lap:1,lane:index%2?-7.2:7.2,laneTarget:index%2?-7.2:7.2,speed:0,targetSpeed:0,skill:.74+(index%6)*.022,finished:false,finishPosition:null,contactUntil:0}});
    return this.snapshot(time);
  }

  update(time,dt,{playerT=0,playerSpeed=0,rivalCrafts=[]}={}){
    if(!this.active)return this.snapshot(time);dt=clamp(Number(dt)||0,0,.05);playerT=((Number(playerT)||0)%1+1)%1;
    if(time<this.goAt){this.phase='countdown';this.playerT=playerT;this.lastPlayerT=playerT;return this.snapshot(time)}
    this.phase=time<this.goAt+.85?'go':'racing';
    if(this.lastPlayerT>.86&&playerT<.14&&playerSpeed>0)this.playerLap++;
    else if(this.lastPlayerT<.14&&playerT>.86&&playerSpeed<-.5)this.playerLap=Math.max(1,this.playerLap-1);
    this.playerT=playerT;this.lastPlayerT=playerT;this.playerProgress=Math.max(0,this.playerLap-1+playerT);
    for(const rival of this.rivals){
      if(rival.finished)continue;const craft=rivalCrafts[rival.index],craftMax=Math.max(28,craft?.max||44),gapMeters=(this.playerProgress-rival.progress)*this.trackLength,catchup=clamp(gapMeters/700,-.13,.17),pressure=.025*Math.sin(time*.19+rival.index*1.71);let target=craftMax*(rival.skill+catchup+pressure);if(gapMeters<-72)target=Math.min(target,Math.abs(playerSpeed)*.94);rival.targetSpeed=clamp(target,0,craftMax*.96);rival.speed=lerp(rival.speed,rival.targetSpeed,1-Math.exp(-1.7*dt));rival.progress+=rival.speed/this.trackLength*dt;if((rival.progress-this.playerProgress)*this.trackLength>RACE_RULES.maxVisibleLeadMeters){rival.progress=this.playerProgress+RACE_RULES.maxVisibleLeadMeters/this.trackLength;rival.speed=Math.min(rival.speed,Math.abs(playerSpeed))}rival.t=((rival.progress%1)+1)%1;rival.lap=Math.floor(Math.max(0,rival.progress))+1;
      const weave=Math.sin(rival.progress*47+rival.index*2.3),passBias=Math.abs(gapMeters)<55?Math.sign(Math.sin(rival.index*4.1+time*.43))*3.2:0;rival.laneTarget=(rival.index%2?-6.5:6.5)+weave*1.8+passBias;rival.lane=lerp(rival.lane,rival.laneTarget,1-Math.exp(-1.05*dt));
      if(rival.progress>=this.totalLaps){rival.finished=true;rival.finishPosition=this.finishOrder.length+1;this.finishOrder.push({type:'rival',index:rival.index,position:rival.finishPosition,time})}
    }
    this.playerRank=1+this.rivals.filter(rival=>rival.progress>this.playerProgress+.00015).length;
    if(!this.finished&&this.playerProgress>=this.totalLaps){this.finished=true;const position=1+this.finishOrder.length;this.finishOrder.push({type:'player',position,time});this.lastResult={type:'player-finished',position,time};return{...this.snapshot(time),result:this.lastResult}}
    this.lastResult=null;return this.snapshot(time);
  }

  canDrive(time){return !this.active||time>=this.goAt}

  registerContact(index,time){const rival=this.rivals[index];if(!rival||time<rival.contactUntil)return false;rival.contactUntil=time+RACE_RULES.contactCooldown;rival.speed*=.82;return true}

  snapshot(time=0){
    const countdown=this.phase==='countdown'?Math.min(3,Math.max(0,Math.ceil(this.goAt-time))):0,closest=this.rivals.filter(rival=>!rival.finished).map(rival=>({...rival,gapMeters:(rival.progress-this.playerProgress)*this.trackLength})).sort((a,b)=>Math.abs(a.gapMeters)-Math.abs(b.gapMeters))[0]||null;
    return{active:this.active,phase:this.phase,countdown,goFlash:this.phase==='go',playerLap:this.playerLap,playerProgress:this.playerProgress,playerRank:this.playerRank,totalLaps:this.totalLaps,closest,rivals:this.rivals.map(rival=>({...rival})),finished:this.finished,finishOrder:[...this.finishOrder]};
  }
}
