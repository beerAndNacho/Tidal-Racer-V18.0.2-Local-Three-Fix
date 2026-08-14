const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const label=(ko,en)=>({ko,en});
const effect=(id,group,name,duration,modifiers)=>Object.freeze({id,group,name,duration,modifiers:Object.freeze(modifiers)});

export const LIFESTYLE_EFFECTS=Object.freeze({
  home_meal:effect('home-nourished','meal',label('집밥의 든든함','HOME NOURISHED'),6,{hungerDrain:.58,energyDrain:.92}),
  breakfast:effect('coastal-breakfast','meal',label('아침의 여유','COASTAL BREAKFAST'),5,{hungerDrain:.62,energyDrain:.88,fishingControl:1.03}),
  seafood_bowl:effect('harbor-fueled','meal',label('항구의 활력','HARBOR FUELED'),8,{hungerDrain:.44,energyDrain:.86,fishingControl:1.05}),
  chef_course:effect('chef-restored','meal',label('셰프의 만찬','CHEF RESTORED'),12,{hungerDrain:.34,energyDrain:.78,fishingControl:1.06}),
  coffee:effect('caffeine-focus','focus',label('카페인 집중','CAFFEINE FOCUS'),4,{energyDrain:.8,footSpeed:1.05,fishingControl:1.05}),
  arcade:effect('racing-focus','focus',label('레이싱 집중','RACING FOCUS'),6,{craftHandling:1.035,fishingControl:1.03}),
  live_music:effect('live-inspiration','leisure',label('라이브 영감','LIVE INSPIRATION'),8,{energyDrain:.92,fishingControl:1.04}),
  dance:effect('dance-high','leisure',label('댄스의 열기','DANCE HIGH'),5,{footSpeed:1.08,energyDrain:.9}),
  mocktail:effect('lounge-refresh','leisure',label('라운지 리프레시','LOUNGE REFRESH'),4,{energyDrain:.88,hungerDrain:.9}),
  cardio:effect('cardio-conditioned','fitness',label('유산소 컨디션','CARDIO CONDITIONED'),12,{energyDrain:.7,footSpeed:1.1}),
  strength:effect('strength-conditioned','fitness',label('근력 컨디션','STRENGTH CONDITIONED'),12,{energyDrain:.76,footSpeed:1.06,craftHandling:1.02}),
  stretch:effect('recovery-flow','fitness',label('회복 스트레칭','RECOVERY FLOW'),6,{energyDrain:.82,footSpeed:1.045}),
});

export const lifestyleClock=profile=>Math.max(0,Number(profile?.day)||0)*24+Math.max(0,Number(profile?.worldHour)||0);
export const lifestyleEffectFor=actionId=>LIFESTYLE_EFFECTS[actionId]||null;

export function pruneLifestyleEffects(records=[],now=0){
  if(!Array.isArray(records))return[];
  return records.filter(record=>lifestyleEffectFor(record?.actionId)&&Number.isFinite(record?.expiresAt)&&record.expiresAt>now)
    .map(record=>({actionId:record.actionId,expiresAt:record.expiresAt}));
}

export function grantLifestyleEffect(actionId,records=[],now=0){
  const selected=lifestyleEffectFor(actionId),active=pruneLifestyleEffects(records,now);
  if(!selected)return active;
  return [...active.filter(record=>lifestyleEffectFor(record.actionId)?.group!==selected.group),{actionId,expiresAt:now+selected.duration}];
}

export function lifestyleBonuses(records=[],now=0){
  const active=pruneLifestyleEffects(records,now).map(record=>{
    const definition=lifestyleEffectFor(record.actionId);
    return{...definition,actionId:record.actionId,expiresAt:record.expiresAt,remaining:record.expiresAt-now};
  });
  const bonuses={energyDrain:1,hungerDrain:1,footSpeed:1,fishingControl:1,craftHandling:1};
  for(const item of active)for(const [key,value] of Object.entries(item.modifiers))bonuses[key]*=value;
  bonuses.energyDrain=clamp(bonuses.energyDrain,.48,1);
  bonuses.hungerDrain=clamp(bonuses.hungerDrain,.3,1);
  bonuses.footSpeed=clamp(bonuses.footSpeed,1,1.16);
  bonuses.fishingControl=clamp(bonuses.fishingControl,1,1.12);
  bonuses.craftHandling=clamp(bonuses.craftHandling,1,1.06);
  return{...bonuses,active};
}
