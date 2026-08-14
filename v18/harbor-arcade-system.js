const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ARCADE_PATTERNS=Object.freeze([
  Object.freeze([1,0,1,2,1,2,0,1,0,2,1,0]),
  Object.freeze([0,1,2,1,0,2,2,1,0,1,2,0]),
  Object.freeze([2,1,0,0,1,2,1,0,2,2,0,1]),
  Object.freeze([1,2,2,1,0,0,1,2,0,1,0,2]),
]);
export const HARBOR_ARCADE_RULES=Object.freeze({duration:22,gateInterval:.72,lanes:3,maxComboBonus:6,rewardCap:700});
export const arcadeGateLane=(day,index)=>ARCADE_PATTERNS[(Math.max(1,Math.floor(day))-1)%ARCADE_PATTERNS.length][index%12];
const cleanProfile=saved=>({plays:Math.max(0,Math.floor(saved?.plays)||0),highScore:Math.max(0,Math.floor(saved?.highScore)||0),totalRewards:Math.max(0,Math.floor(saved?.totalRewards)||0),dailyBest:Object.fromEntries(Object.entries(saved?.dailyBest||{}).filter(([,value])=>Number.isFinite(value)).slice(-14).map(([key,value])=>[String(key),Math.max(0,Math.floor(value))]))});

export class HarborArcadeDirector{
  constructor(saved){this.profile=cleanProfile(saved);this.active=false;this.complete=false;this.day=1;this.elapsed=0;this.lane=1;this.gateIndex=0;this.score=0;this.combo=0;this.bestCombo=0;this.hits=0;this.misses=0;this.moves=0;this.events=[]}
  serialize(){return cleanProfile(this.profile)}
  start({day=1}={}){
    this.active=true;this.complete=false;this.day=Math.max(1,Math.floor(day));this.elapsed=0;this.lane=1;this.gateIndex=0;this.score=0;this.combo=0;this.bestCombo=0;this.hits=0;this.misses=0;this.moves=0;this.events.length=0;return this.snapshot();
  }
  move(direction){
    if(!this.active)return false;const next=clamp(this.lane+Math.sign(direction),0,2);if(next===this.lane)return false;this.lane=next;this.moves++;this.events.push({type:'move',lane:this.lane});return true;
  }
  gateTime(index){return 1.35+index*HARBOR_ARCADE_RULES.gateInterval}
  update(dt=0){
    if(!this.active)return this.snapshot();this.elapsed=Math.min(HARBOR_ARCADE_RULES.duration,this.elapsed+Math.max(0,dt));
    while(this.gateTime(this.gateIndex)<=this.elapsed&&this.gateTime(this.gateIndex)<HARBOR_ARCADE_RULES.duration){
      const target=arcadeGateLane(this.day,this.gateIndex),hit=this.lane===target;if(hit){this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);const points=100+Math.min(HARBOR_ARCADE_RULES.maxComboBonus,this.combo-1)*25;this.score+=points;this.hits++;this.events.push({type:'hit',target,points,combo:this.combo})}else{this.combo=0;this.misses++;this.events.push({type:'miss',target,lane:this.lane})}this.gateIndex++;
    }
    if(this.elapsed>=HARBOR_ARCADE_RULES.duration)this.finish();return this.snapshot();
  }
  finish(){
    if(this.complete)return this.result;this.active=false;this.complete=true;const total=this.hits+this.misses,accuracy=total?this.hits/total:0,reward=Math.min(HARBOR_ARCADE_RULES.rewardCap,Math.max(0,Math.round((this.score*.065+this.bestCombo*9)/10)*10)),xp=Math.round(45+this.score*.035),dayKey=String(this.day),previousDaily=this.profile.dailyBest[dayKey]||0,personalBest=this.score>this.profile.highScore,dailyBest=this.score>previousDaily;this.profile.plays++;this.profile.highScore=Math.max(this.profile.highScore,this.score);this.profile.dailyBest[dayKey]=Math.max(previousDaily,this.score);this.profile.dailyBest=Object.fromEntries(Object.entries(this.profile.dailyBest).slice(-14));this.profile.totalRewards+=reward;this.result={score:this.score,hits:this.hits,misses:this.misses,accuracy,bestCombo:this.bestCombo,reward,xp,personalBest,dailyBest,rank:accuracy>=.9?'S':accuracy>=.78?'A':accuracy>=.62?'B':accuracy>=.45?'C':'D'};this.events.push({type:'complete',...this.result});return this.result;
  }
  drainEvents(){return this.events.splice(0)}
  snapshot(){
    const upcoming=[];for(let index=this.gateIndex;index<this.gateIndex+6;index++){const time=this.gateTime(index);if(time>=HARBOR_ARCADE_RULES.duration)break;upcoming.push({index,lane:arcadeGateLane(this.day,index),time,remaining:Math.max(0,time-this.elapsed)})}
    return{active:this.active,complete:this.complete,day:this.day,elapsed:this.elapsed,remaining:Math.max(0,HARBOR_ARCADE_RULES.duration-this.elapsed),progress:clamp(this.elapsed/HARBOR_ARCADE_RULES.duration,0,1),lane:this.lane,gateIndex:this.gateIndex,score:this.score,combo:this.combo,bestCombo:this.bestCombo,hits:this.hits,misses:this.misses,moves:this.moves,upcoming,result:this.result||null,profile:this.serialize()};
  }
}
