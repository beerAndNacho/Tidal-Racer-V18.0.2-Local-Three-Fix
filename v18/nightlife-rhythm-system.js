const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const NIGHTLIFE_RHYTHM_DIRECTIONS=Object.freeze(['left','down','up','right']);
const RHYTHM_PATTERNS=Object.freeze([
  Object.freeze([0,1,2,3,1,0,2,1,3,2,0,3,1,2,3,0]),
  Object.freeze([1,3,2,0,1,2,3,1,0,2,0,3,2,1,3,0]),
  Object.freeze([2,1,0,3,2,3,1,0,2,0,1,3,0,2,3,1]),
  Object.freeze([3,2,1,0,2,1,3,0,1,3,0,2,3,1,0,2]),
]);
export const NIGHTLIFE_RHYTHM_RULES=Object.freeze({duration:24,leadIn:1.2,noteInterval:.58,perfectWindow:.11,goodWindow:.21,hitWindow:.31,maxComboBonus:8,rewardCap:900});
export const nightlifeRhythmDirection=(day,index)=>NIGHTLIFE_RHYTHM_DIRECTIONS[RHYTHM_PATTERNS[(Math.max(1,Math.floor(day))-1)%RHYTHM_PATTERNS.length][Math.max(0,Math.floor(index))%16]];
const cleanProfile=saved=>({plays:Math.max(0,Math.floor(saved?.plays)||0),highScore:Math.max(0,Math.floor(saved?.highScore)||0),totalRewards:Math.max(0,Math.floor(saved?.totalRewards)||0),totalPerfects:Math.max(0,Math.floor(saved?.totalPerfects)||0),dailyBest:Object.fromEntries(Object.entries(saved?.dailyBest||{}).filter(([,value])=>Number.isFinite(value)).slice(-14).map(([key,value])=>[String(key),Math.max(0,Math.floor(value))]))});

export class NightlifeRhythmDirector{
  constructor(saved){this.profile=cleanProfile(saved);this.active=false;this.complete=false;this.day=1;this.elapsed=0;this.notes=[];this.score=0;this.combo=0;this.bestCombo=0;this.hits=0;this.misses=0;this.perfects=0;this.goods=0;this.okays=0;this.strays=0;this.events=[];this.result=null}
  serialize(){return cleanProfile(this.profile)}
  noteTime(index){return NIGHTLIFE_RHYTHM_RULES.leadIn+index*NIGHTLIFE_RHYTHM_RULES.noteInterval}
  start({day=1}={}){
    this.active=true;this.complete=false;this.day=Math.max(1,Math.floor(day));this.elapsed=0;this.notes=[];for(let index=0;this.noteTime(index)<NIGHTLIFE_RHYTHM_RULES.duration-.4;index++)this.notes.push({index,time:this.noteTime(index),direction:nightlifeRhythmDirection(this.day,index),status:'pending',timing:null,delta:null});this.score=0;this.combo=0;this.bestCombo=0;this.hits=0;this.misses=0;this.perfects=0;this.goods=0;this.okays=0;this.strays=0;this.events.length=0;this.result=null;return this.snapshot();
  }
  normalizeDirection(direction){if(Number.isFinite(direction))return NIGHTLIFE_RHYTHM_DIRECTIONS[Math.floor(direction)]||null;return NIGHTLIFE_RHYTHM_DIRECTIONS.includes(direction)?direction:null}
  markMiss(note,reason='late',input=null){
    if(!note||note.status!=='pending')return false;note.status='miss';note.timing=reason;note.delta=this.elapsed-note.time;this.combo=0;this.misses++;this.events.push({type:'miss',reason,input,target:note.direction,index:note.index,delta:note.delta});return true;
  }
  input(direction){
    if(!this.active)return false;const input=this.normalizeDirection(direction);if(!input)return false;let target=null,best=Infinity;for(const note of this.notes){if(note.status!=='pending')continue;const delta=Math.abs(note.time-this.elapsed);if(delta<=NIGHTLIFE_RHYTHM_RULES.hitWindow&&delta<best){target=note;best=delta}}
    if(!target){this.combo=0;this.strays++;this.events.push({type:'stray',input});return false}
    if(target.direction!==input){this.markMiss(target,'wrong',input);return false}
    const timing=best<=NIGHTLIFE_RHYTHM_RULES.perfectWindow?'perfect':best<=NIGHTLIFE_RHYTHM_RULES.goodWindow?'good':'okay',base={perfect:120,good:85,okay:55}[timing];target.status='hit';target.timing=timing;target.delta=this.elapsed-target.time;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);const points=base+Math.min(NIGHTLIFE_RHYTHM_RULES.maxComboBonus,this.combo-1)*8;this.score+=points;this.hits++;if(timing==='perfect')this.perfects++;else if(timing==='good')this.goods++;else this.okays++;this.events.push({type:'hit',timing,points,combo:this.combo,input,index:target.index,delta:target.delta});return true;
  }
  update(dt=0){
    if(!this.active)return this.snapshot();this.elapsed=Math.min(NIGHTLIFE_RHYTHM_RULES.duration,this.elapsed+Math.max(0,dt));for(const note of this.notes)if(note.status==='pending'&&this.elapsed-note.time>NIGHTLIFE_RHYTHM_RULES.hitWindow)this.markMiss(note);if(this.elapsed>=NIGHTLIFE_RHYTHM_RULES.duration)this.finish();return this.snapshot();
  }
  finish(){
    if(this.complete)return this.result;for(const note of this.notes)if(note.status==='pending')this.markMiss(note,'finish');this.active=false;this.complete=true;const total=this.notes.length,accuracy=total?(this.perfects+this.goods*.75+this.okays*.5)/total:0,reward=Math.min(NIGHTLIFE_RHYTHM_RULES.rewardCap,Math.max(0,Math.round((this.score*.055+this.bestCombo*5)/10)*10)),xp=Math.round(55+this.score*.025),dayKey=String(this.day),previousDaily=this.profile.dailyBest[dayKey]||0,personalBest=this.score>this.profile.highScore,dailyBest=this.score>previousDaily;this.profile.plays++;this.profile.highScore=Math.max(this.profile.highScore,this.score);this.profile.dailyBest[dayKey]=Math.max(previousDaily,this.score);this.profile.dailyBest=Object.fromEntries(Object.entries(this.profile.dailyBest).slice(-14));this.profile.totalRewards+=reward;this.profile.totalPerfects+=this.perfects;this.result={score:this.score,hits:this.hits,misses:this.misses,strays:this.strays,perfects:this.perfects,goods:this.goods,okays:this.okays,accuracy,bestCombo:this.bestCombo,reward,xp,personalBest,dailyBest,rank:accuracy>=.9?'S':accuracy>=.78?'A':accuracy>=.62?'B':accuracy>=.45?'C':'D'};this.events.push({type:'complete',...this.result});return this.result;
  }
  drainEvents(){return this.events.splice(0)}
  snapshot(){
    const upcoming=this.notes.filter(note=>note.status==='pending'&&note.time-this.elapsed>=-NIGHTLIFE_RHYTHM_RULES.hitWindow&&note.time-this.elapsed<=4.2).slice(0,10).map(note=>({...note,remaining:note.time-this.elapsed}));return{active:this.active,complete:this.complete,day:this.day,elapsed:this.elapsed,remaining:Math.max(0,NIGHTLIFE_RHYTHM_RULES.duration-this.elapsed),progress:clamp(this.elapsed/NIGHTLIFE_RHYTHM_RULES.duration,0,1),score:this.score,combo:this.combo,bestCombo:this.bestCombo,hits:this.hits,misses:this.misses,perfects:this.perfects,goods:this.goods,okays:this.okays,strays:this.strays,total:this.notes.length,upcoming,result:this.result,profile:this.serialize()};
  }
}
