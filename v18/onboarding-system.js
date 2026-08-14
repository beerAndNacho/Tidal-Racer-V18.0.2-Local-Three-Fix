const text=(ko,en)=>({ko,en});
export const COAST_LICENSE_REWARD=Object.freeze({credits:2500,xp:500,rep:75});
export const COAST_LICENSE_STEPS=Object.freeze([
  {id:'throttle',title:text('출항 가속','LEAVE THE MARINA'),instruction:text('전진해 첫 항적을 만드세요.','Accelerate and make your first wake.'),prompt:{keyboard:'W / ↑ · ACCELERATE',gamepad:'RT · ACCELERATE'},target:35,metric:'distance'},
  {id:'steer',title:text('선체 조향','CARVE THE WATER'),instruction:text('속도를 유지하며 좌우로 방향을 바꾸세요.','Hold speed and carve left or right.'),prompt:{keyboard:'A / D / ← / → · STEER',gamepad:'LEFT STICK · STEER'},target:1.2,metric:'steer'},
  {id:'boost',title:text('부스트 점화','IGNITE BOOST'),instruction:text('직선에서 부스트를 유지하세요.','Hold boost on open water.'),prompt:{keyboard:'SHIFT · BOOST',gamepad:'RB · BOOST'},target:.8,metric:'boost'},
  {id:'roam',title:text('자유 항해 전환','ENTER FREE ROAM'),instruction:text('레이스를 벗어나 섬을 자유롭게 탐험하세요.','Leave the race and explore the archipelago.'),prompt:{keyboard:'F · RACE / FREE ROAM',gamepad:'VIEW · MODE'},target:1,metric:'roam'},
  {id:'disembark',title:text('골든 코스트 입항','DOCK AT GOLDEN COAST'),instruction:text('황금 표식을 따라 선착장에 천천히 접근해 하선하세요.','Follow the gold marker, slow down, and step ashore.'),prompt:{keyboard:'X · DISEMBARK',gamepad:'Y · DISEMBARK'},target:1,metric:'disembark',waypoint:'dock-water'},
  {id:'city',title:text('도시 생활 체험','LIVE ASHORE'),instruction:text('주민과 대화하거나 시설에서 행동 하나를 완료하세요.','Talk to a resident or complete one venue action.'),prompt:{keyboard:'E · INTERACT',gamepad:'X / A · INTERACT'},target:1,metric:'city',waypoint:null},
  {id:'board',title:text('제트스키 복귀','RETURN TO YOUR CRAFT'),instruction:text('선착장으로 돌아가 제트스키에 다시 승선하세요.','Return to the dock and board your craft.'),prompt:{keyboard:'E / X · BOARD',gamepad:'X / Y · BOARD'},target:1,metric:'board',waypoint:'dock-shore'},
  {id:'fish',title:text('첫 어획','LAND YOUR FIRST CATCH'),instruction:text('감속 후 낚시 모드에서 물고기 한 마리를 낚으세요.','Slow down, enter fishing mode, and land one fish.'),prompt:{keyboard:'G · FISHING  /  Q · CAST & HOOK  /  SPACE · REEL',gamepad:'X · FISHING & CAST  /  A · REEL'},target:1,metric:'fish'},
]);

const clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

export class OnboardingDirector{
  constructor(saved=null,{enabled=true}={}){
    this.events=[];this.profile={status:enabled?'active':'dismissed',step:0,progress:0,anchors:{distance:null,fishCaught:null},rewardClaimed:false,completedAt:null,skipped:false};this.restore(saved);
  }
  get definition(){return COAST_LICENSE_STEPS[Math.min(this.profile.step,COAST_LICENSE_STEPS.length-1)]}
  reset(context={}){this.profile.status='active';this.profile.step=0;this.profile.progress=0;this.profile.skipped=false;this.profile.completedAt=null;this.profile.anchors={distance:Number(context.distance)||0,fishCaught:Number(context.fishCaught)||0};this.events.push({type:'reset'});return this.snapshot()}
  skip(){if(this.profile.status!=='active')return false;this.profile.status='dismissed';this.profile.skipped=true;this.events.push({type:'skipped'});return true}
  record(type){if(this.profile.status!=='active'||this.definition.metric!=='city'||!['lifeAction','citizenTalk'].includes(type))return null;this.profile.progress=1;return this.advance()}
  update(context={}){
    if(this.profile.status!=='active')return this.snapshot();const step=this.definition,dt=Math.max(0,Number(context.dt)||0);
    if(step.metric==='distance'){if(this.profile.anchors.distance==null)this.profile.anchors.distance=Number(context.distance)||0;this.profile.progress=clamp((Number(context.distance)||0)-this.profile.anchors.distance,0,step.target)}
    if(step.metric==='steer'&&Math.abs(Number(context.steer)||0)>=.34&&Math.abs(Number(context.speed)||0)>=4)this.profile.progress=clamp(this.profile.progress+dt,0,step.target);
    if(step.metric==='boost'&&context.boosting&&Math.abs(Number(context.speed)||0)>=5)this.profile.progress=clamp(this.profile.progress+dt,0,step.target);
    if(step.metric==='roam'&&context.mode==='FREE ROAM')this.profile.progress=1;
    if(step.metric==='disembark'&&['foot','interior'].includes(context.travelMode))this.profile.progress=1;
    if(step.metric==='board'&&context.travelMode==='water')this.profile.progress=1;
    if(step.metric==='fish'){if(this.profile.anchors.fishCaught==null)this.profile.anchors.fishCaught=Number(context.fishCaught)||0;this.profile.progress=clamp((Number(context.fishCaught)||0)-this.profile.anchors.fishCaught,0,step.target)}
    if(this.profile.progress+1e-6>=step.target)return this.advance();return this.snapshot();
  }
  advance(){
    const completed=this.definition;if(this.profile.step>=COAST_LICENSE_STEPS.length-1){this.profile.status='complete';this.profile.progress=completed.target;this.profile.completedAt=new Date().toISOString();const event={type:'complete',completed};this.events.push(event);return event}
    this.profile.step++;this.profile.progress=0;if(this.definition.metric==='fish')this.profile.anchors.fishCaught=null;const event={type:'step',completed,next:this.definition,index:this.profile.step};this.events.push(event);return event;
  }
  claimReward(){if(this.profile.status!=='complete'||this.profile.rewardClaimed)return null;this.profile.rewardClaimed=true;return{...COAST_LICENSE_REWARD}}
  drainEvents(){return this.events.splice(0)}
  serialize(){return clone(this.profile)}
  restore(saved){if(!saved||typeof saved!=='object')return this.profile;this.profile={...this.profile,...saved,step:clamp(Math.floor(saved.step)||0,0,COAST_LICENSE_STEPS.length-1),progress:Math.max(0,Number(saved.progress)||0),anchors:{...this.profile.anchors,...(saved.anchors||{})},rewardClaimed:Boolean(saved.rewardClaimed),skipped:Boolean(saved.skipped)};if(!['active','complete','dismissed'].includes(this.profile.status))this.profile.status='dismissed';return this.profile}
  snapshot(){const step=this.definition;return{status:this.profile.status,index:this.profile.step,total:COAST_LICENSE_STEPS.length,step,progress:this.profile.status==='complete'?1:clamp(this.profile.progress/(step.target||1),0,1),rewardClaimed:this.profile.rewardClaimed,completedAt:this.profile.completedAt,skipped:this.profile.skipped}}
}
