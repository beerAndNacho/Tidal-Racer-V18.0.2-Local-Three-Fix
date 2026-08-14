export const RACE_COURSE_RULES=Object.freeze({checkpointCount:12,trackWidth:58,gateWidth:30,warningDelay:1.1,recoveryDelay:3.4,recoveryPenalty:5});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const normal=value=>((Number(value)||0)%1+1)%1;
const crossedForward=(from,to,target)=>to>=from?target>from&&target<=to:target>from||target<=to;

export class RaceCourseDirector{
  constructor(options={}){this.configure(options)}

  configure({checkpointCount=RACE_COURSE_RULES.checkpointCount,totalLaps=3,trackWidth=RACE_COURSE_RULES.trackWidth}={}){
    this.checkpointCount=Math.max(6,Math.floor(Number(checkpointCount)||RACE_COURSE_RULES.checkpointCount));this.totalLaps=Math.max(1,Math.floor(Number(totalLaps)||3));this.trackWidth=Math.max(24,Number(trackWidth)||RACE_COURSE_RULES.trackWidth);this.reset();return this.snapshot();
  }

  reset(){this.active=false;this.lap=1;this.nextCheckpoint=1;this.lastT=0;this.safeT=0;this.offCourseSeconds=0;this.penaltySeconds=0;this.invalidLaps=0;this.recoveries=0;this.wasWarning=false}
  start(){this.reset();this.active=true;return this.snapshot()}

  update(dt,{playerT=0,distanceToCourse=0,playerSpeed=0}={}){
    if(!this.active)return{...this.snapshot(),passed:[],validLap:false,invalidLap:false,warningStarted:false};dt=clamp(Number(dt)||0,0,.1);const t=normal(playerT),distance=Math.max(0,Number(distanceToCourse)||0),forward=Number(playerSpeed)>=-.25,passed=[];let validLap=false,invalidLap=false;
    if(forward){
      while(this.nextCheckpoint<this.checkpointCount){
        const target=this.nextCheckpoint/this.checkpointCount;if(!crossedForward(this.lastT,t,target))break;if(distance<=RACE_COURSE_RULES.gateWidth){passed.push(this.nextCheckpoint);this.safeT=target;this.nextCheckpoint++}break;
      }
      if(this.lastT>.82&&t<.18){
        if(this.nextCheckpoint>=this.checkpointCount){validLap=true;this.lap=Math.min(this.totalLaps+1,this.lap+1)}else{invalidLap=true;this.invalidLaps++}
        this.nextCheckpoint=1;this.safeT=0;
      }
    }
    if(distance>this.trackWidth)this.offCourseSeconds+=dt;else if(distance<this.trackWidth*.72)this.offCourseSeconds=0;else this.offCourseSeconds=Math.max(0,this.offCourseSeconds-dt*.45);
    const warning=this.offCourseSeconds>=RACE_COURSE_RULES.warningDelay,warningStarted=warning&&!this.wasWarning;this.wasWarning=warning;this.lastT=t;
    return{...this.snapshot(),passed,validLap,invalidLap,warningStarted};
  }

  recover(){
    if(!this.active||this.offCourseSeconds<RACE_COURSE_RULES.recoveryDelay)return{ok:false,reason:'not-needed'};const t=normal(Math.max(0,this.safeT-.012));this.lastT=t;this.offCourseSeconds=0;this.wasWarning=false;this.penaltySeconds+=RACE_COURSE_RULES.recoveryPenalty;this.recoveries++;return{ok:true,t,penalty:RACE_COURSE_RULES.recoveryPenalty,totalPenalty:this.penaltySeconds};
  }

  elapsed(baseSeconds=0){return Math.max(0,Number(baseSeconds)||0)+this.penaltySeconds}
  snapshot(){return{active:this.active,lap:this.lap,totalLaps:this.totalLaps,nextCheckpoint:this.nextCheckpoint,checkpointCount:this.checkpointCount,nextT:this.nextCheckpoint/this.checkpointCount,progress:(this.nextCheckpoint-1)/(this.checkpointCount-1),offCourseSeconds:this.offCourseSeconds,warning:this.offCourseSeconds>=RACE_COURSE_RULES.warningDelay,recoveryAvailable:this.offCourseSeconds>=RACE_COURSE_RULES.recoveryDelay,penaltySeconds:this.penaltySeconds,invalidLaps:this.invalidLaps,recoveries:this.recoveries,safeT:this.safeT,trackWidth:this.trackWidth}}
}
