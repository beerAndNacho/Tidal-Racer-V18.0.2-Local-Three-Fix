const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
export const COAST_CROSSWALKS=Object.freeze([
  Object.freeze({id:'market-crossing',x:142,z:409.2,phase:0}),
  Object.freeze({id:'marina-crossing',x:358,z:409.2,phase:11}),
]);
export const COAST_PARKING_SPOTS=Object.freeze([
  Object.freeze({id:'west-compact',x:-4,z:395.4,direction:1,kind:'compact'}),
  Object.freeze({id:'home-wagon',x:52,z:423,direction:-1,kind:'wagon'}),
  Object.freeze({id:'market-delivery',x:104,z:395.4,direction:1,kind:'delivery'}),
  Object.freeze({id:'kitchen-compact',x:172,z:395.4,direction:-1,kind:'compact'}),
  Object.freeze({id:'office-pickup',x:194,z:423,direction:1,kind:'pickup'}),
  Object.freeze({id:'bank-wagon',x:248,z:395.4,direction:-1,kind:'wagon'}),
  Object.freeze({id:'auction-delivery',x:302,z:423,direction:1,kind:'delivery'}),
  Object.freeze({id:'nightlife-compact',x:386,z:423,direction:-1,kind:'compact'}),
  Object.freeze({id:'gym-wagon',x:406,z:395.4,direction:1,kind:'wagon'}),
  Object.freeze({id:'east-compact',x:462,z:423,direction:-1,kind:'compact'}),
]);
export function coastSignalState(time=0,crossing=COAST_CROSSWALKS[0]){
  const cycle=24,phase=((Number(time)||0)+(crossing?.phase||0))%cycle,normalized=(phase+cycle)%cycle;let vehicle='green',pedestrian='wait',remaining=14-normalized;if(normalized>=14&&normalized<17){vehicle='amber';remaining=17-normalized}else if(normalized>=17&&normalized<23){vehicle='red';pedestrian='walk';remaining=23-normalized}else if(normalized>=23){vehicle='red';remaining=24-normalized}return{crossingId:crossing?.id||'',vehicle,pedestrian,remaining,phase:normalized,cycle};
}
export function nearestCoastCrosswalk(position){
  if(!position)return null;return COAST_CROSSWALKS.map(crossing=>({...crossing,distance:Math.hypot(Number(position.x)-crossing.x,Number(position.z)-crossing.z)})).sort((a,b)=>a.distance-b.distance)[0]||null;
}
export function coastTrafficSignalDecision(car,time=0){
  const direction=car.direction<0?-1:1,cruise=Math.max(0,Number(car.cruise)||0);let selected=null;for(const crossing of COAST_CROSSWALKS){const stopX=crossing.x-direction*5.4,stopDistance=(stopX-Number(car.x))*direction;if(stopDistance<=.1||stopDistance>=30)continue;const state=coastSignalState(time,crossing),mustStop=state.vehicle==='red'||state.vehicle==='amber'&&stopDistance>5.5;if(!mustStop)continue;const targetSpeed=stopDistance<7.5?0:cruise*clamp((stopDistance-5)/22,.14,.62),candidate={braking:true,targetSpeed,stopDistance,stopX,crossing,state};if(!selected||candidate.targetSpeed<selected.targetSpeed||candidate.stopDistance<selected.stopDistance)selected=candidate}
  return selected||{braking:false,targetSpeed:cruise,stopDistance:Infinity,stopX:null,crossing:null,state:null};
}

export function coastTrafficAwareness(car,focus){
  const direction=car.direction<0?-1:1,cruise=Math.max(0,Number(car.cruise)||0),walking=focus?.mode==='foot',ahead=walking?(Number(focus.x)-Number(car.x))*direction:Infinity,laneGap=walking?Math.abs(Number(focus.z)-Number(car.z)):Infinity,braking=walking&&laneGap<4&&ahead>-3.4&&ahead<22;
  const targetSpeed=!braking?cruise:ahead<9?0:cruise*clamp((ahead-7)/15,.16,.58);
  return{walking,ahead,laneGap,braking,targetSpeed};
}

export function coastTrafficClearance(car,focus,{halfLength=3.05,halfWidth=1.72}={}){
  if(!focus||focus.mode!=='foot')return{distance:Infinity,overlap:false,dx:Infinity,dz:Infinity};
  const centerX=Math.abs(Number(focus.x)-Number(car.x)),centerZ=Math.abs(Number(focus.z)-Number(car.z)),dx=Math.max(0,centerX-halfLength),dz=Math.max(0,centerZ-halfWidth);
  return{distance:Math.hypot(dx,dz),overlap:centerX<halfLength&&centerZ<halfWidth,dx,dz};
}

export function coastTrafficDecision(car,actors=[]){
  let selected=coastTrafficAwareness(car,null),actor=null;
  for(const candidate of Array.isArray(actors)?actors:[]){const response=coastTrafficAwareness(car,candidate);if(response.braking&&(!selected.braking||response.targetSpeed<selected.targetSpeed||response.targetSpeed===selected.targetSpeed&&response.ahead<selected.ahead)){selected=response;actor=candidate}}
  return{...selected,actorId:actor?.id||null};
}
