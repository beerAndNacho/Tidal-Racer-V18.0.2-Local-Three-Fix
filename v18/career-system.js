export const CAREER_CHAPTERS=[
  {id:'first-wake',title:{ko:'첫 항적',en:'FIRST WAKE'},brief:{ko:'조종 감각을 익히며 해안을 달리세요.',en:'Learn the craft and carve your first wake.'},objectives:[{metric:'distance',target:650,label:{ko:'항해 거리',en:'DISTANCE'}}],reward:{credits:900,xp:320,rep:45}},
  {id:'coastline-survey',title:{ko:'해안 정찰',en:'COASTLINE SURVEY'},brief:{ko:'인접 해역을 찾아 항로를 확장하세요.',en:'Discover neighboring waters and expand the chart.'},objectives:[{metric:'regionsVisited',target:2,label:{ko:'새 해역 발견',en:'NEW REGIONS'}}],reward:{credits:1400,xp:460,rep:75}},
  {id:'saltwater-supper',title:{ko:'첫 조과',en:'SALTWATER SUPPER'},brief:{ko:'낚싯대를 펴고 서로 다른 입질에 대응하세요.',en:'Deploy the rod and answer the pull of open water.'},objectives:[{metric:'fishCaught',target:2,label:{ko:'물고기 포획',en:'FISH CAUGHT'}}],reward:{credits:1750,xp:560,rep:90}},
  {id:'riders-edge',title:{ko:'라이더의 날',en:"RIDER'S EDGE"},brief:{ko:'기술과 현장 아이템을 조합하세요.',en:'Chain rider skills with equipment found at sea.'},objectives:[{metric:'skillUses',target:4,label:{ko:'스킬 사용',en:'SKILL USES'}},{metric:'itemPickups',target:2,label:{ko:'아이템 획득',en:'ITEM PICKUPS'}}],reward:{credits:2300,xp:720,rep:120}},
  {id:'rookie-circuit',title:{ko:'루키 서킷',en:'ROOKIE CIRCUIT'},brief:{ko:'군도 공식 레이스를 완주하세요.',en:'Finish an official archipelago circuit.'},objectives:[{metric:'races',target:1,label:{ko:'레이스 완주',en:'RACES FINISHED'}}],reward:{credits:3200,xp:900,rep:180}},
  {id:'trophy-water',title:{ko:'트로피 해역',en:'TROPHY WATER'},brief:{ko:'희귀 등급 이상의 물고기를 끌어올리세요.',en:'Land a rare-or-better trophy fish.'},objectives:[{metric:'rareFish',target:1,label:{ko:'희귀 어종',en:'RARE FISH'}}],reward:{credits:4200,xp:1100,rep:240}},
  {id:'archipelago-run',title:{ko:'군도 횡단',en:'ARCHIPELAGO RUN'},brief:{ko:'장거리 항해로 다섯 해역을 연결하세요.',en:'Link five regions in one long-range expedition.'},objectives:[{metric:'regionsVisited',target:3,label:{ko:'새 해역 발견',en:'NEW REGIONS'}},{metric:'distance',target:8000,label:{ko:'항해 거리',en:'DISTANCE'}}],reward:{credits:6200,xp:1550,rep:360}},
  {id:'tidal-crown',title:{ko:'타이달 크라운',en:'TIDAL CROWN'},brief:{ko:'레이스와 낚시 양쪽에서 정점에 오르세요.',en:'Prove mastery in both racing and angling.'},objectives:[{metric:'wins',target:2,label:{ko:'레이스 우승',en:'RACE WINS'}},{metric:'fishCaught',target:5,label:{ko:'물고기 포획',en:'FISH CAUGHT'}}],reward:{credits:12000,xp:2600,rep:700}},
];

CAREER_CHAPTERS.find(chapter=>chapter.id==='archipelago-run').objectives.push({metric:'activitiesCompleted',target:1,label:{ko:'월드 활동 완료',en:'WORLD ACTIVITIES'}});
CAREER_CHAPTERS.find(chapter=>chapter.id==='tidal-crown').objectives.push({metric:'activitiesCompleted',target:2,label:{ko:'월드 활동 완료',en:'WORLD ACTIVITIES'}});

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const copyMetrics=metrics=>Object.fromEntries(Object.keys(metrics||{}).map(key=>[key,finite(metrics[key])]));

export class CareerDirector{
  constructor(chapters=CAREER_CHAPTERS){this.chapters=chapters;this.index=0;this.completed=[];this.baseline=null;this.revision=0}
  get current(){return this.chapters[this.index]||null}
  start(metrics={}){if(!this.baseline)this.baseline=copyMetrics(metrics);return this.snapshot(metrics)}
  restore(data,metrics={}){if(data&&typeof data==='object'){this.index=Math.max(0,Math.min(this.chapters.length,Math.floor(finite(data.index))));this.completed=Array.isArray(data.completed)?data.completed.filter(id=>this.chapters.some(chapter=>chapter.id===id)):[];this.baseline=data.baseline&&typeof data.baseline==='object'?copyMetrics(data.baseline):copyMetrics(metrics);this.revision=finite(data.revision)}return this.start(metrics)}
  objectiveProgress(objective,metrics={}){const value=Math.max(0,finite(metrics[objective.metric])-finite(this.baseline?.[objective.metric]));return{...objective,value:Math.min(objective.target,value),done:value>=objective.target,pct:Math.min(1,value/objective.target)}}
  update(metrics={}){this.start(metrics);const chapter=this.current;if(!chapter)return null;const objectives=chapter.objectives.map(objective=>this.objectiveProgress(objective,metrics));if(!objectives.every(objective=>objective.done))return null;this.completed.push(chapter.id);this.index++;this.baseline=copyMetrics(metrics);this.revision++;return{type:'chapter-complete',chapter,next:this.current,index:this.index,complete:this.index>=this.chapters.length}}
  snapshot(metrics={}){if(!this.baseline)this.baseline=copyMetrics(metrics);const chapter=this.current,objectives=chapter?chapter.objectives.map(objective=>this.objectiveProgress(objective,metrics)):[],progress=objectives.length?objectives.reduce((sum,objective)=>sum+objective.pct,0)/objectives.length:1;return{status:chapter?'active':'complete',index:this.index,total:this.chapters.length,chapter,objectives,progress,completed:[...this.completed],revision:this.revision}}
  serialize(){return{index:this.index,completed:[...this.completed],baseline:{...(this.baseline||{})},revision:this.revision}}
}
