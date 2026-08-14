const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const smoothstep=(min,max,value)=>{const t=clamp((value-min)/(max-min),0,1);return t*t*(3-2*t)};

export const CRAFT_DYNAMICS_TUNING={
  spoolUp:5.8,
  spoolDown:8.6,
  displacementDrag:.38,
  cavitationThreshold:.42,
  cavitationMax:.52,
  softImpactSpeed:1.55,
  hardImpactSpeed:4.4,
};

export function craftDriveForces({speed=0,maxSpeed=30,accel=12,turn=1,stability=1,throttle=0,steer=0,drift=false,boost=false,seaState=1,spool=0,dt=1/60}={}){
  const speedAbs=Math.abs(speed),speedRatio=clamp(speedAbs/Math.max(1,maxSpeed),0,1.35),targetSpool=clamp(throttle,-1,1),spoolRate=Math.abs(targetSpool)>Math.abs(spool)?CRAFT_DYNAMICS_TUNING.spoolUp:CRAFT_DYNAMICS_TUNING.spoolDown,nextSpool=spool+(targetSpool-spool)*(1-Math.exp(-spoolRate*dt)),planing=smoothstep(3.8,Math.max(9,maxSpeed*.5),speedAbs),roughLoss=clamp((seaState-.9)*.095,0,.16),cavitation=clamp((Math.abs(steer)*speedRatio-CRAFT_DYNAMICS_TUNING.cavitationThreshold)*1.45+(drift&&speedRatio>.35?.1:0),0,CRAFT_DYNAMICS_TUNING.cavitationMax),traction=(1-roughLoss)*(1-cavitation*.38),thrust=nextSpool*accel*(boost?1.55:1)*traction,dragRate=(.145+.0052*speedAbs)*(1+(1-planing)*CRAFT_DYNAMICS_TUNING.displacementDrag+roughLoss*.7),reverseSign=speed<-.5?-.68:1,steerAuthority=(.43+speedRatio*.64)*(drift?1.29:.82)*turn*(1-cavitation*.16)*reverseSign,lateralDrive=steer*speed*.043*(drift?1.82:.58),lateralDamping=(drift?1.34:3.12)*(1+stability*.08);
  return{spool:nextSpool,planing,cavitation,traction,thrust,dragRate,speedRatio,steerAuthority,lateralDrive,lateralDamping};
}

export function hullReentryImpact({wasAirborne=false,submersion=0,verticalSpeed=0,speedRatio=0,seaState=1}={}){
  if(!wasAirborne||submersion<=0||verticalSpeed>=-CRAFT_DYNAMICS_TUNING.softImpactSpeed)return{hit:false,severity:0,hard:false,damage:0};
  const impactSpeed=-verticalSpeed,severity=clamp((impactSpeed-CRAFT_DYNAMICS_TUNING.softImpactSpeed)/4.8+speedRatio*seaState*.09,0,1),hard=impactSpeed>CRAFT_DYNAMICS_TUNING.hardImpactSpeed,damage=hard?Math.min(9,(impactSpeed-3.8)*1.35):0;
  return{hit:severity>.04,severity,hard,damage,impactSpeed};
}
