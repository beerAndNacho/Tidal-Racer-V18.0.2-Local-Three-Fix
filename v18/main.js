import { THREE, scene, camera, renderer, composer, configurePost, sunLight, sky, sunDir, water, updateWaterSurface, updatePresentation, updateSunFocus, updateMarineLife, updateAmbientTraffic, regionGroups, route, craftModel, upgradeCraftRider, animateCraftCharacter, updateCraftLod, itemBoxes, clouds, resizeEngine, scheduleWorldStreaming, scheduleGameplayStreaming, updateRegionStreaming, streamingState, deferEnvironmentMap, deferAssetManifest, sceneDiagnostics, assets } from './engine.js';
import { RIDERS, CRAFTS, SKILLS, ITEMS, EVENTS, REGIONS } from '../data-v12.js';
import { RARITIES, SEASON, COSMETICS, COLLECTIONS, CONTRACTS, TITLES, GHOST_RIVALS, MARKET_SEED } from '../systems-v13.js';
import { getCharacterProfile } from '../v16/character-catalog.js';
import { audioDirector } from '../v14/audio-director.js';
import { waveHeight, seaStateFor } from '../v16/wave-model.js';
import { i18n } from '../v17/i18n.js';
import { FishingDirector, FISH_SPECIES, FISH_RARITIES, FISHING_TACKLE } from './fishing-system.js';
import { PerformanceGovernor } from './performance-governor.js';
import { CareerDirector } from './career-system.js';
import { WorldActivityDirector } from './world-activity-system.js';
import { GamepadDirector } from './input-system.js';
import { RivalRaceDirector } from './race-system.js';
import { CityLifeDirector, CITY_DOCK, buildCityLifeWorld, prepareFootAvatar, animateFootAvatar } from './city-life-system.js';

const $=s=>document.querySelector(s),clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const riderPortraitUrl=id=>`./assets/portraits/rider-${id}-portrait-v1.webp`;
const speedFx=$('#speedFx');
const boot=(value,label,detail='')=>window.__tidalBoot?.report?.(value,label,detail);
const idle=(task,timeout=180)=>{if('requestIdleCallback' in window)return requestIdleCallback(task,{timeout});return setTimeout(()=>task({didTimeout:true,timeRemaining:()=>0}),16)};
const bootStarted=performance.now();
const STATE={started:false,time:0,lap:1,credits:24000,boost:58,item:null,mode:'RACE',camera:0,quality:'balanced',event:null,eventEnd:0,nextEvent:25,shield:false,cloak:false,stability:1,discount:1,xp:0,level:1,reputation:0,seasonXp:0,wins:0,races:0,streak:0,rating:1450,finished:false,victoryUntil:0};
let rider=RIDERS[0],craft=CRAFTS[0],selectedSkills=[SKILLS[0],SKILLS[1],SKILLS[2],SKILLS[3]];
const inventory=new Map([[2,2],[1,1],[14,1],[27,1]]),skillLast=new Map(SKILLS.map(s=>[s.id,-999]));
const cosmeticOwned=new Set(['paint-coral','wake-aqua']);
const equipped={paint:'paint-coral',wake:'wake-aqua',suit:null,helmet:null};
const claimedContracts=new Set(),claimedCollections=new Set(),visitedRegions=new Set(['GOLDEN COAST']);
const affinity=new Map(RIDERS.map(r=>[r.id,{xp:0,level:1}]));
const metrics={distance:0,skillUses:0,itemPickups:0,itemUses:0,regionsVisited:1,driftSeconds:0,races:0,wins:0,events:0,fishCaught:0,rareFish:0,activitiesCompleted:0};
const market=MARKET_SEED.map(x=>({...x}));
const SAVE_KEY='tidal-racer-v13-profile';
const ACCESS_KEY='tidal-racer-accessibility-v1';
const DEFAULT_BINDINGS={up:['KeyW','ArrowUp'],down:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],drift:['Space'],boost:['ShiftLeft','ShiftRight']};
const accessibility={reducedEffects:false,highContrast:false,captions:false};
let controlBindings=Object.fromEntries(Object.entries(DEFAULT_BINDINGS).map(([action,codes])=>[action,[...codes]])),remapAction=null,captionTimer=0;
try{
  const saved=JSON.parse(localStorage.getItem(ACCESS_KEY)||'null');
  if(saved){Object.assign(accessibility,saved.accessibility||{});for(const [action,codes] of Object.entries(saved.controls||{}))if(DEFAULT_BINDINGS[action]&&Array.isArray(codes)&&codes.length)controlBindings[action]=codes.filter(code=>typeof code==='string').slice(0,3)}
}catch{}
const fishing=new FishingDirector();
const career=new CareerDirector();
const worldActivities=new WorldActivityDirector();
const rivalRace=new RivalRaceDirector({trackLength:route.getLength(),totalLaps:3});
const gamepadDirector=new GamepadDirector();
const cityLife=new CityLifeDirector();
const cityLifeWorld=buildCityLifeWorld(scene);
const liveControls={throttle:0,brake:0,steer:0,drift:false,boost:false};
let lastInputDevice='keyboard',previousPadBoost=false,previousPadDrift=false;
const performanceGovernor=new PerformanceGovernor({renderer,composer,quality:STATE.quality,basePixelRatio:Math.min(devicePixelRatio,2),targetFps:55});

function saveAccessibility(){try{localStorage.setItem(ACCESS_KEY,JSON.stringify({accessibility,controls:controlBindings}))}catch{}}
function applyAccessibility(){document.body.classList.toggle('reduced-effects',accessibility.reducedEffects);document.body.classList.toggle('high-contrast',accessibility.highContrast);document.body.dataset.captions=accessibility.captions?'on':'off';document.body.dataset.reducedEffects=accessibility.reducedEffects?'on':'off';document.body.dataset.highContrast=accessibility.highContrast?'on':'off'}
function bindingLabel(action){return(controlBindings[action]||DEFAULT_BINDINGS[action]).map(code=>code.replace(/^Key/,'').replace(/^Arrow/,'').replace('ShiftLeft','L-SHIFT').replace('ShiftRight','R-SHIFT')).join(' / ')}
const AUDIO_CAPTIONS={uiClick:'UI 선택',uiConfirm:'확인음',raceStart:'레이스 시작',boostIgnite:'부스트 점화',driftStart:'드리프트 시작',driftRelease:'드리프트 해제',itemPickup:'아이템 획득',itemUse:'아이템 사용',impact:'충돌음',rareDrop:'희귀 보상 획득',victory:'승리 팡파르',region:'새 지역 진입',danger:'위험 경보',event:'월드 이벤트',eventClear:'위험 해제',fishingReady:'낚시 장비 준비',fishingStow:'낚시 장비 수납',fishingCast:'낚싯줄 투척',fishingBite:'물고기 입질',fishingHook:'물고기 걸림',fishingCatch:'물고기 포획',fishingSnap:'낚싯줄 끊어짐',fishingLost:'물고기 이탈'};
Object.assign(AUDIO_CAPTIONS,{activityStart:'월드 활동 시작',activityStep:'활동 목표 통과',activityComplete:'월드 활동 완료',activityFail:'월드 활동 실패'});
document.addEventListener('tidal-audio-cue',event=>{const name=event.detail?.name;if(!name)return;const haptics={boostIgnite:[.56,100],impact:[.78,150],fishingBite:[.4,85],fishingHook:[.62,120],fishingCatch:[.88,210],fishingSnap:[.92,190],activityStep:[.42,80],activityComplete:[.9,220],victory:[1,260]}[name];if(haptics)gamepadDirector.pulse(...haptics);if(!accessibility.captions)return;const el=$('#audioCaption');if(!el)return;el.textContent=AUDIO_CAPTIONS[name]||name.replace(/([A-Z])/g,' $1').toUpperCase();el.classList.add('show');clearTimeout(captionTimer);captionTimer=setTimeout(()=>el.classList.remove('show'),1450)});
applyAccessibility();

function careerMetrics(){return{distance:metrics.distance,regionsVisited:visitedRegions.size,fishCaught:metrics.fishCaught,rareFish:metrics.rareFish,skillUses:metrics.skillUses,itemPickups:metrics.itemPickups,races:metrics.races,wins:metrics.wins,activitiesCompleted:metrics.activitiesCompleted}}

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1500)}
function levelFromXp(xp){return 1+Math.floor(xp/1000)}
function seasonLevel(){return Math.min(SEASON.maxLevel,1+Math.floor(STATE.seasonXp/SEASON.xpPerLevel))}
function currentTitle(){return [...TITLES].reverse().find(t=>STATE.reputation>=t.rep)?.name||TITLES[0].name}
function progressValue(metric){return metric==='regionsVisited'?visitedRegions.size:(metrics[metric]||0)}
function cosmeticById(id){return COSMETICS.find(c=>c.id===id)}
function saveProfile(){
  const payload={state:{credits:STATE.credits,xp:STATE.xp,reputation:STATE.reputation,seasonXp:STATE.seasonXp,wins:STATE.wins,races:STATE.races,streak:STATE.streak,rating:STATE.rating},inventory:[...inventory],cosmetics:[...cosmeticOwned],equipped,claimedContracts:[...claimedContracts],claimedCollections:[...claimedCollections],visited:[...visitedRegions],affinity:[...affinity],metrics,career:career.serialize(),life:cityLife.serialize()};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(payload))}catch{}
}
function loadProfile(){
  try{
    const p=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!p)return;
    Object.assign(STATE,p.state||{});STATE.level=levelFromXp(STATE.xp);
    (p.inventory||[]).forEach(([k,v])=>inventory.set(+k,v));
    (p.cosmetics||[]).forEach(x=>cosmeticOwned.add(x));
    Object.assign(equipped,p.equipped||{});
    (p.claimedContracts||[]).forEach(x=>claimedContracts.add(x));
    (p.claimedCollections||[]).forEach(x=>claimedCollections.add(x));
    (p.visited||[]).forEach(x=>visitedRegions.add(x));
    (p.affinity||[]).forEach(([k,v])=>affinity.set(k,v));
    Object.assign(metrics,p.metrics||{});career.restore(p.career,careerMetrics());cityLife.restore(p.life);
  }catch(e){console.info('profile reset',e)}
}
function updateMetaHud(){
  $('#levelHud').textContent=STATE.level;$('#repHud').textContent=STATE.reputation;$('#seasonLabel').textContent=`${SEASON.id} ${SEASON.name} · LV ${seasonLevel()}`;
}
function creditsUI(){$('#credits').textContent=`${STATE.credits.toLocaleString()} CR`;$('#creditsHud').textContent=STATE.credits.toLocaleString();updateMetaHud()}
function award({credits=0,xp=0,rep=0,season=xp}={}){
  STATE.credits+=credits;STATE.xp+=xp;STATE.seasonXp+=season;STATE.reputation+=rep;STATE.level=levelFromXp(STATE.xp);creditsUI();saveProfile();
}
function rarityBadge(r){const q=RARITIES[r]||RARITIES.common;return `<span class="rarity" style="color:${q.color}">${q.label}</span>`}
function fishRarityBadge(r){const q=FISH_RARITIES[r]||FISH_RARITIES.common;return `<span class="rarity" style="color:${q.color}">${q.label}</span>`}
function ownedSetProgress(set){const got=set.items.filter(id=>cosmeticOwned.has(id)).length;return {got,total:set.items.length,pct:Math.round(got/set.items.length*100)}}
function affinityGain(amount=20){const a=affinity.get(rider.id)||{xp:0,level:1};a.xp+=amount;a.level=1+Math.floor(a.xp/500);affinity.set(rider.id,a)}
function visualLoadout(){
  return {paint:cosmeticById(equipped.paint)?.color,suit:cosmeticById(equipped.suit)?.color,helmet:cosmeticById(equipped.helmet)?.color};
}
function maybeCosmeticDrop(){
  if(Math.random()>.07)return;
  const pool=COSMETICS.filter(c=>!cosmeticOwned.has(c.id));if(!pool.length)return;
  let sum=pool.reduce((n,c)=>n+RARITIES[c.rarity].weight,0),roll=Math.random()*sum,pick=pool[0];
  for(const c of pool){roll-=RARITIES[c.rarity].weight;if(roll<=0){pick=c;break}}
  cosmeticOwned.add(pick.id);const f=$('#dropFlash');f.classList.add('show');setTimeout(()=>f.classList.remove('show'),500);toast(`DROP · ${pick.name} · ${RARITIES[pick.rarity].label}`);saveProfile();
}
loadProfile();
career.start(careerMetrics());

function renderCareerHud(){
  const snapshot=career.snapshot(careerMetrics()),lang=i18n.lang==='ko'?'ko':'en',root=$('#careerHud');if(!root)return;
  if(snapshot.status==='complete'){$('#careerChapter').textContent='NETWORK COMPLETE';$('#careerTitle').textContent=lang==='ko'?'타이달 크라운 획득':'TIDAL CROWN EARNED';$('#careerObjective').textContent=lang==='ko'?'모든 커리어 임무 완료':'ALL CAREER CHAPTERS COMPLETE';$('#careerFill').style.width='100%';$('#careerReward').textContent='LEGEND STATUS'}
  else{const chapter=snapshot.chapter,objectives=snapshot.objectives;$('#careerChapter').textContent=`TIDAL NETWORK · CH ${String(snapshot.index+1).padStart(2,'0')} / ${String(snapshot.total).padStart(2,'0')}`;$('#careerTitle').textContent=chapter.title[lang];$('#careerObjective').textContent=objectives.map(objective=>`${objective.label[lang]} ${Math.floor(objective.value).toLocaleString()} / ${objective.target.toLocaleString()}`).join(' · ');$('#careerFill').style.width=`${Math.round(snapshot.progress*100)}%`;$('#careerReward').textContent=`+${chapter.reward.credits.toLocaleString()} CR · +${chapter.reward.xp} XP`}
  document.body.dataset.careerChapter=String(snapshot.index+1);document.body.dataset.careerProgress=snapshot.progress.toFixed(3);document.body.dataset.careerState=snapshot.status;
}
function updateCareer(){const result=career.update(careerMetrics());if(result){award(result.chapter.reward);affinityGain(90+result.index*12);toast(`${result.chapter.title[i18n.lang==='ko'?'ko':'en']} · CHAPTER COMPLETE`);saveProfile()}renderCareerHud()}

function updateRiderCard(r){
  const p=getCharacterProfile(r.id),af=affinity.get(r.id)||{level:1,xp:0};
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  const portrait=$('#riderPortrait');
  if(portrait){portrait.src=riderPortraitUrl(r.id);portrait.alt=`${r.name} rider portrait`}
  set('#riderBioName',r.name);set('#riderBioRole',p.role);set('#riderBioOrigin',p.origin);set('#riderBioTagline',p.tagline);set('#riderBioText',p.bio);set('#riderBioBuild',`${Math.round(p.build.height*100)} · ${p.gear.toUpperCase()}`);set('#riderBioPose',p.victory.toUpperCase());set('#riderBioAffinity',`AFFINITY LV ${af.level}`);
}

function renderSettings(root){
  const volumeLabels={master:'MASTER',music:'MUSIC',sfx:'SFX',engine:'ENGINE',ambient:'AMBIENCE'};
  root.innerHTML=`<div class="settingsPanel"><div class="settingsGroup"><h4>AUDIO MIX</h4>${Object.entries(volumeLabels).map(([channel,label])=>`<label class="settingRow"><span>${label}</span><input data-volume="${channel}" type="range" min="0" max="100" value="${Math.round(audioDirector.volumes[channel]*100)}" aria-label="${label} volume"><b data-volume-value="${channel}">${Math.round(audioDirector.volumes[channel]*100)}%</b></label>`).join('')}</div><div class="settingsGroup"><h4>ACCESSIBILITY</h4><label class="settingRow"><span>REDUCED EFFECTS</span><span>카메라 흔들림·속도 효과 감소</span><input data-access="reducedEffects" type="checkbox" ${accessibility.reducedEffects?'checked':''}></label><label class="settingRow"><span>HIGH CONTRAST</span><span>HUD 대비 강화</span><input data-access="highContrast" type="checkbox" ${accessibility.highContrast?'checked':''}></label><label class="settingRow"><span>AUDIO CAPTIONS</span><span>효과음 시각 자막</span><input data-access="captions" type="checkbox" ${accessibility.captions?'checked':''}></label></div><div class="settingsGroup"><h4>KEY BINDINGS · 방향키는 항상 유지됩니다</h4>${Object.keys(DEFAULT_BINDINGS).map(action=>`<div class="settingRow"><span>${action.toUpperCase()}</span><span>${bindingLabel(action)}</span><button type="button" data-remap="${action}" aria-label="Remap ${action}">${remapAction===action?'PRESS KEY…':'REMAP'}</button></div>`).join('')}<div class="settingRow"><span>RESET</span><span>WASD + ARROWS</span><button type="button" data-reset-bindings>DEFAULT</button></div></div></div>`;
  const gamepad=gamepadDirector.snapshot(),gamepadGroup=document.createElement('div');gamepadGroup.className='settingsGroup';gamepadGroup.innerHTML=`<h4>GAMEPAD · XBOX / PLAYSTATION STANDARD</h4><div class="settingRow"><span>STATUS</span><span id="gamepadSettingsStatus">${gamepad.connected?gamepad.id:'연결된 패드 없음'}</span><b>${gamepad.connected?'READY':'WAITING'}</b></div><label class="settingRow"><span>DEADZONE</span><input data-gamepad="deadzone" type="range" min="5" max="35" value="${Math.round(gamepad.settings.deadzone*100)}" aria-label="Gamepad stick deadzone"><b data-gamepad-value="deadzone">${Math.round(gamepad.settings.deadzone*100)}%</b></label><label class="settingRow"><span>SENSITIVITY</span><input data-gamepad="sensitivity" type="range" min="50" max="150" value="${Math.round(gamepad.settings.sensitivity*100)}" aria-label="Gamepad steering sensitivity"><b data-gamepad-value="sensitivity">${Math.round(gamepad.settings.sensitivity*100)}%</b></label><label class="settingRow"><span>VIBRATION</span><span>충돌·부스트·낚시 피드백</span><input data-gamepad="vibration" type="checkbox" ${gamepad.settings.vibration?'checked':''}></label><div class="settingRow"><span>LAYOUT</span><span>D-PAD 메뉴 · A 확정/드리프트 · RT/LT 가감속 · LS 조향 · RB 부스트 · X 낚시 · Y 활동</span><b>STANDARD</b></div>`;root.querySelector('.settingsPanel')?.append(gamepadGroup);
  root.querySelectorAll('input[data-volume]').forEach(input=>input.addEventListener('input',()=>{audioDirector.setVolume(input.dataset.volume,Number(input.value)/100);const out=root.querySelector(`[data-volume-value="${input.dataset.volume}"]`);if(out)out.textContent=`${input.value}%`}));
  root.querySelectorAll('input[data-gamepad]').forEach(input=>input.addEventListener(input.type==='checkbox'?'change':'input',()=>{const setting=input.dataset.gamepad,next=setting==='vibration'?input.checked:Number(input.value)/100;gamepadDirector.updateSettings({[setting]:next});const out=root.querySelector(`[data-gamepad-value="${setting}"]`);if(out)out.textContent=`${input.value}%`}));
  root.querySelectorAll('input[data-access]').forEach(input=>input.addEventListener('change',()=>{accessibility[input.dataset.access]=input.checked;applyAccessibility();saveAccessibility()}));
  root.querySelectorAll('[data-remap]').forEach(button=>button.onclick=()=>{remapAction=button.dataset.remap;renderSettings(root)});
  root.querySelector('[data-reset-bindings]').onclick=()=>{controlBindings=Object.fromEntries(Object.entries(DEFAULT_BINDINGS).map(([action,codes])=>[action,[...codes]]));remapAction=null;rebuildKeyMap();saveAccessibility();renderSettings(root)};
}

function renderStore(tab='shop'){
  const root=$('#store');root.innerHTML='';if(tab==='settings'){renderSettings(root);return}
  const row=(html,btn,fn,cls='')=>{const d=document.createElement('div');d.className='row '+cls;d.innerHTML=`<span>${html}</span>${btn?`<button>${btn}</button>`:''}`;if(btn)d.querySelector('button').onclick=fn;root.appendChild(d)};
  if(tab==='shop'){
    COSMETICS.slice(0,16).forEach(c=>{const owned=cosmeticOwned.has(c.id),limited=c.limited?` · ${c.supply} made`:'';row(`<b>${c.name}</b>${rarityBadge(c.rarity)}<br>${c.slot.toUpperCase()} · ${c.price.toLocaleString()} CR${limited}`,owned?'EQUIP':'BUY',()=>{if(owned)return equipCosmetic(c);if(STATE.credits>=c.price){STATE.credits-=c.price;cosmeticOwned.add(c.id);creditsUI();saveProfile();renderStore('shop');toast(`${c.name} 획득`)}})});
    ITEMS.slice(0,8).forEach(it=>row(`<b>${it.name}</b><br>${it.category} · ${it.price.toLocaleString()} CR`,'BUY',()=>{if(STATE.credits>=it.price){STATE.credits-=it.price;inventory.set(it.id,(inventory.get(it.id)||0)+1);creditsUI();saveProfile();toast(`${it.name} 구매`)}}));
  }
  if(tab==='inventory'){
    [...cosmeticOwned].forEach(id=>{const c=cosmeticById(id);if(c)row(`<b>${c.name}</b>${rarityBadge(c.rarity)}<br>${c.slot.toUpperCase()} · ${equipped[c.slot]===c.id?'EQUIPPED':'OWNED'}`,'EQUIP',()=>equipCosmetic(c))});
    [...inventory].filter(([,n])=>n>0).forEach(([id,n])=>{const it=ITEMS[id];row(`<b>${it.name}</b><br>${n} owned`,'SELL',()=>{if((inventory.get(id)||0)>0){inventory.set(id,inventory.get(id)-1);STATE.credits+=Math.floor(it.price*.62);creditsUI();saveProfile();renderStore('inventory')}})});
  }
  if(tab==='contracts')CONTRACTS.forEach(c=>{const v=Math.min(c.target,progressValue(c.metric)),pct=Math.round(v/c.target*100),done=v>=c.target,claimed=claimedContracts.has(c.id);row(`<b>${c.cadence} · ${c.name}</b><br>${Math.floor(v).toLocaleString()} / ${c.target.toLocaleString()}<div class="progressTrack"><i style="width:${pct}%"></i></div><small>${c.reward.credits.toLocaleString()} CR · ${c.reward.xp} XP</small>`,done&&!claimed?'CLAIM':claimed?'DONE':'',()=>{if(done&&!claimed){claimedContracts.add(c.id);award({credits:c.reward.credits,xp:c.reward.xp,rep:Math.floor(c.reward.xp*.18)});renderStore('contracts');toast('CONTRACT COMPLETE')}},done?'contractDone':'')});
  if(tab==='collection')COLLECTIONS.forEach(set=>{const p=ownedSetProgress(set),claimed=claimedCollections.has(set.id);row(`<b>${set.name}</b><br>${p.got} / ${p.total} OWNED · REWARD ${set.reward.title}<div class="progressTrack"><i style="width:${p.pct}%"></i></div>`,p.got===p.total&&!claimed?'CLAIM':claimed?'DONE':'',()=>{if(p.got===p.total&&!claimed){claimedCollections.add(set.id);award({credits:set.reward.credits,xp:750,rep:500});renderStore('collection');toast(`${set.reward.title} TITLE UNLOCKED`)}},p.got===p.total?'contractDone':'')});
  if(tab==='profile'){
    const af=affinity.get(rider.id)||{xp:0,level:1},show=[equipped.paint,equipped.wake,equipped.suit,equipped.helmet].filter(Boolean).map(cosmeticById).filter(Boolean);
    root.innerHTML=`<div class="profileCard"><strong>RIDER-${String(STATE.rating).slice(-4)} · ${currentTitle()}</strong><small>LEVEL ${STATE.level} · RATING ${STATE.rating} · REP ${STATE.reputation}</small><div class="progressTrack"><i style="width:${(STATE.xp%1000)/10}%"></i></div><div class="showcase">${show.map(c=>`<span style="border-color:${RARITIES[c.rarity].color}55">${c.name}</span>`).join('')||'<span>NO SHOWCASE</span>'}</div></div><div class="profileCard"><strong>${rider.name} AFFINITY <span class="affinity">LV ${af.level}</span></strong><small>${af.xp} affinity XP · ${rider.passive}</small><div class="progressTrack"><i style="width:${(af.xp%500)/5}%"></i></div></div><div class="profileCard"><strong>SEASON ${SEASON.id} · ${SEASON.name}</strong><small>Season LV ${seasonLevel()} / ${SEASON.maxLevel} · ${STATE.wins} wins · ${STATE.streak} streak</small><div class="progressTrack"><i style="width:${(STATE.seasonXp%SEASON.xpPerLevel)/SEASON.xpPerLevel*100}%"></i></div></div>`;
  }
  if(tab==='market')market.forEach(m=>{const c=cosmeticById(m.id),trend=m.trend>=0?`<span class="trendUp">▲ ${m.trend}%</span>`:`<span class="trendDown">▼ ${Math.abs(m.trend)}%</span>`;row(`<b>${c.name}</b>${rarityBadge(c.rarity)}<br>${m.ask.toLocaleString()} CR · ${trend} · ${m.stock} LISTED`,'BUY',()=>{if(m.stock>0&&STATE.credits>=m.ask){STATE.credits-=m.ask;m.stock--;cosmeticOwned.add(c.id);creditsUI();saveProfile();renderStore('market');toast('MARKET PURCHASE · '+c.name)}})});
  if(tab==='rivals')GHOST_RIVALS.forEach((g,i)=>row(`<b>#${i+1} ${g.name}</b><br>${g.title} · RATING ${g.rating} · ${g.craft}`));
  if(tab==='skills')SKILLS.forEach((sk,i)=>row(`<b>${i<4?'SLOT '+(i+1)+' · ':''}${sk.name}</b><br>${sk.desc}`));
  if(tab==='events')EVENTS.forEach(e=>row(`<b>${e.name}</b><br>${e.desc}`));
  if(tab==='fish'){
    const discovered=Object.keys(fishing.profile.discovered).length,nextTackle=FISHING_TACKLE.find(t=>fishing.profile.total<t.unlock);
    root.innerHTML=`<div class="profileCard fishSummary"><strong>ANGLER LOG · ${discovered} / ${FISH_SPECIES.length}</strong><small>${fishing.profile.total} CAUGHT · ${fishing.profile.earned.toLocaleString()} CR EARNED · ${fishing.tackle.name}</small><div class="progressTrack"><i style="width:${Math.round(discovered/FISH_SPECIES.length*100)}%"></i></div>${nextTackle?`<small>NEXT TACKLE · ${nextTackle.name} AT ${nextTackle.unlock} CATCHES</small>`:'<small>ALL TACKLE MASTERED</small>'}</div>`;
    FISH_SPECIES.forEach(species=>{const count=fishing.profile.discovered[species.id]||0,best=fishing.profile.best[species.id]||0,locked=!count;row(`<b style="color:${locked?'#6f858e':species.accent}">${locked?'UNDISCOVERED':species.koName+' · '+species.name}</b>${fishRarityBadge(species.rarity)}<br>${locked?species.regions.join(' · '):`${count} CAUGHT · BEST ${best.toFixed(2)} KG · ${species.description}`}`,'',null,locked?'fishLocked':'fishFound')});
  }
}

function equipCosmetic(c){if(!cosmeticOwned.has(c.id))return;equipped[c.slot]=c.id;refreshPlayer();updateWakeStyle();saveProfile();toast(`${c.name} 장착`)}

let player=null;
function refreshPlayer(){
  const pos=player?.position.clone()||new THREE.Vector3(),rot=player?.rotation.clone();if(player)scene.remove(player);
  player=craftModel(craft,rider,visualLoadout(),{detail:'hero'});player.position.copy(pos);if(rot)player.rotation.copy(rot);scene.add(player);updateRiderCard(rider);const candidate=player;void upgradeCraftRider(candidate).then(upgraded=>{if(upgraded&&candidate===player){if(cityLife.mode!=='water')mountedRiderVisible(false);toast(`${rider.name} · PREMIUM LOD0 READY`)}});
}
let footAvatar=null,footAvatarPromise=null,footMotionSpeed=0,lifeContext=null;
const lifeText=value=>value?.[i18n.lang==='ko'?'ko':'en']||value?.en||'';
function mountedRiderVisible(visible){
  if(!player)return;const premium=player.userData.premiumRider?.root,fallback=player.userData.proceduralRiderRoot;
  if(premium)premium.visible=visible;if(fallback)fallback.visible=visible&&!premium;
}
async function ensureFootAvatar(){
  const assetId=`rider-${rider.id}-hero`;if(footAvatar?.userData.assetId===assetId)return footAvatar;if(footAvatarPromise)return footAvatarPromise;
  footAvatarPromise=assets.spawn(assetId).then(object=>{
    const candidate=object||player?.userData.proceduralRiderRoot?.clone(true);if(!candidate)return null;if(footAvatar)scene.remove(footAvatar);footAvatar=prepareFootAvatar(candidate);footAvatar.userData.assetId=assetId;footAvatar.name=`on-foot-${rider.id}`;footAvatar.visible=cityLife.mode!=='water';scene.add(footAvatar);return footAvatar;
  }).catch(error=>{console.warn('on-foot avatar unavailable',error);return null}).finally(()=>{footAvatarPromise=null});
  return footAvatarPromise;
}
function placeFootAvatar(){
  if(!footAvatar)return;const ground=cityLife.bounds().y,bob=footAvatar.userData.footBob||0;footAvatar.position.set(px,ground+bob,pz);footAvatar.rotation.y=heading;footAvatar.visible=cityLife.mode!=='water';
}
function closeLifePanel(){
  const panel=$('#lifePanel');panel?.classList.add('hidden');if(panel)panel.dataset.open='false';renderer.domElement.focus({preventScroll:true});
}
function renderLifePanel(facility=cityLife.currentFacility()){
  const panel=$('#lifePanel'),list=$('#lifeActionList');if(!panel||!list||!facility)return;
  $('#lifePanelType').textContent=lifeText(facility.type);$('#lifePanelTitle').textContent=lifeText(facility.name);
  list.innerHTML=facility.actions.map((item,index)=>`<button type="button" data-life-action="${item.id}"><span><b>${index+1}. ${lifeText(item.name)}</b><small>${lifeText(item.description)}</small></span><em>${item.cost?item.cost.toLocaleString()+' CR':'FREE'} · ${item.hours}H</em></button>`).join('');
  panel.classList.remove('hidden');panel.dataset.open='true';list.querySelector('button')?.focus({preventScroll:true});
}
function performLifeAction(actionId){
  const result=cityLife.perform(actionId,STATE.credits);if(!result.ok){toast(result.reason==='bank'?'은행 잔액이 부족합니다':'지갑 잔액이 부족합니다');return}
  STATE.credits=result.wallet;creditsUI();saveProfile();audioDirector.cue('uiConfirm',.65);gamepadDirector.pulse(.38,85);toast(`${lifeText(result.action.name)} · DAY ${result.profile.day} ${formatLifeHour(result.profile.worldHour)}`);renderLifePanel(result.facility);updateLifeHud();
}
function enterLifeFacility(facility){
  const result=cityLife.enter(facility.id);if(!result.ok)return;px=result.position.x;pz=result.position.z;heading=result.heading;py=cityLife.bounds().y;cityLifeWorld.setInterior(facility.id);closeLifePanel();placeFootAvatar();saveProfile();audioDirector.cue('uiConfirm',.45);toast(`${lifeText(facility.name)} · ENTER`);
}
function leaveLifeFacility(){
  const result=cityLife.leave();if(!result.ok)return;px=result.position.x;pz=result.position.z;heading=result.heading;py=cityLife.bounds().y;cityLifeWorld.hideInteriors();closeLifePanel();placeFootAvatar();saveProfile();toast(`${lifeText(result.facility.name)} · STREET`);
}
function toggleOnFoot(){
  if(!STATE.started)return;
  if(cityLife.mode==='interior')return leaveLifeFacility();
  if(cityLife.mode==='foot'){
    const result=cityLife.board({x:px,z:pz});if(!result.ok)return toast('선착장의 제트스키 가까이 가세요');
    px=result.parked.x;pz=result.parked.z;heading=result.parked.heading;speed=0;lateral=0;vertical=0;STATE.mode='FREE ROAM';$('#mode').textContent=STATE.mode;document.body.classList.remove('on-foot','life-interior');mountedRiderVisible(true);if(footAvatar)footAvatar.visible=false;closeLifePanel();toast('JET SKI · BOARDED');return;
  }
  if(fishing.active)return toast('낚싯대를 먼저 정리하세요');
  if(!cityLife.canDisembark({x:px,z:pz,speed}))return toast('Golden Coast 선착장에 천천히 접근하세요');
  if(worldActivities.active)toggleWorldActivity();const result=cityLife.disembark({x:px,z:pz,heading,speed});if(!result.ok)return;
  speed=0;lateral=0;vertical=0;STATE.mode='LIFE';$('#mode').textContent='ON FOOT';$('#raceCountdown')?.classList.add('hidden');$('#rivalHud')?.classList.add('hidden');competitors.forEach(entry=>entry.marker.visible=false);px=result.position.x;pz=result.position.z;heading=result.heading;py=cityLife.bounds().y;mountedRiderVisible(false);document.body.classList.add('on-foot');void ensureFootAvatar().then(()=>placeFootAvatar());toast('ON FOOT · GOLDEN COAST');saveProfile();
}
function handleLifeInteraction(){
  if(cityLife.mode==='water')return useItem();
  const context=cityLife.contextAt({x:px,z:pz});if(!context)return toast('상호작용할 장소에 더 가까이 가세요');
  if(context.kind==='board')return toggleOnFoot();if(context.kind==='enter')return enterLifeFacility(context.facility);if(context.kind==='exit')return leaveLifeFacility();if(context.kind==='actions')return renderLifePanel(context.facility);
}
function formatLifeHour(hour){const value=Math.floor(hour*60),h=Math.floor(value/60)%24,m=String(value%60).padStart(2,'0');return `${String(h).padStart(2,'0')}:${m}`}
function updateLifeHud(){
  const hud=$('#lifeHud'),prompt=$('#lifePrompt'),snapshot=cityLife.snapshot(),profile=snapshot.profile;if(!hud||!prompt)return;
  const nearDock=snapshot.mode==='water'&&Math.hypot(px-CITY_DOCK.water.x,pz-CITY_DOCK.water.z)<=CITY_DOCK.disembarkRadius;
  hud.classList.toggle('hidden',snapshot.mode==='water'&&!nearDock);document.body.dataset.travelMode=snapshot.mode;document.body.dataset.lifeFacility=snapshot.facilityId||'';document.body.classList.toggle('life-interior',snapshot.mode==='interior');
  $('#lifeMode').textContent=snapshot.mode==='water'?'DOCK READY':snapshot.mode==='interior'?lifeText(snapshot.facility.name):'ON FOOT';
  $('#lifeClock').textContent=`DAY ${profile.day} · ${formatLifeHour(profile.worldHour)}`;$('#lifeBank').textContent=`${profile.bankBalance.toLocaleString()} CR`;
  for(const stat of['energy','hunger','mood','hygiene']){const value=Math.round(profile[stat]),fill=$(`#life${stat[0].toUpperCase()+stat.slice(1)}`);if(fill){fill.style.width=`${value}%`;fill.parentElement.dataset.low=String(value<20)}}
  lifeContext=snapshot.mode==='water'?null:cityLife.contextAt({x:px,z:pz});
  let text=nearDock?'X · 하선 / DISEMBARK':'';
  if(lifeContext?.kind==='board')text='E / X · 제트스키 승선';if(lifeContext?.kind==='enter')text=`E · ${lifeText(lifeContext.facility.name)} 입장`;if(lifeContext?.kind==='exit')text='E · 거리로 나가기';if(lifeContext?.kind==='actions')text='E · 행동 선택';
  prompt.textContent=text;prompt.classList.toggle('hidden',!text);
}
$('#lifeActionList')?.addEventListener('click',event=>{const button=event.target.closest('[data-life-action]');if(button)performLifeAction(button.dataset.lifeAction)});
$('#lifePanelClose')?.addEventListener('click',closeLifePanel);
RIDERS.forEach((r,i)=>{const b=document.createElement('button');b.className='choice riderChoice'+(i===0?' active':'');b.innerHTML=`<img src="${riderPortraitUrl(r.id)}" alt="" loading="${i<4?'eager':'lazy'}" decoding="async"><span><b>${r.name}</b><small>${r.style} · ${r.passive}</small></span>`;b.onclick=()=>{rider=r;updateRiderCard(r);refreshPlayer();toast(`${r.name} · ${getCharacterProfile(r.id).role}`);[...$('#riders').children].forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('#riders').appendChild(b)});
CRAFTS.forEach((c,i)=>{const b=document.createElement('button');b.className='choice'+(i===0?' active':'');b.innerHTML=`<b>${c.name}</b><small>${c.type}</small>`;b.onclick=()=>{craft=c;refreshPlayer();[...$('#crafts').children].forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('#crafts').appendChild(b)});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');renderStore(t.dataset.tab)});
document.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-quality]').forEach(x=>x.classList.remove('active'));b.classList.add('active');STATE.quality=b.dataset.quality;configurePost(STATE.quality);performanceGovernor.setQuality(STATE.quality);toast(`QUALITY · ${STATE.quality.toUpperCase()}`)});
selectedSkills.forEach((s,i)=>{const d=document.createElement('div');d.className='skill glass';d.id='skill-'+i;d.innerHTML=`<span>${i+1}</span><b>${s.name}</b><i></i>`;$('#skills').appendChild(d)});
renderStore();creditsUI();updateRiderCard(rider);
boot(66,'interface','Menus and progression UI ready');

refreshPlayer();
boot(74,'player','Hero rider and craft ready');
const activityMarker=new THREE.Group();activityMarker.name='world-activity-marker';activityMarker.visible=false;scene.add(activityMarker);
const activityRingMat=new THREE.MeshBasicMaterial({color:0xffd38e,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}),activityBeamMat=new THREE.MeshBasicMaterial({color:0x74ebff,transparent:true,opacity:.1,depthWrite:false,toneMapped:false});
const activityRing=new THREE.Mesh(new THREE.TorusGeometry(18,.72,10,72),activityRingMat),activityBeam=new THREE.Mesh(new THREE.CylinderGeometry(4.6,10,52,18,1,true),activityBeamMat),activityArrow=new THREE.Mesh(new THREE.ConeGeometry(2.4,4.6,12),activityRingMat.clone());activityRing.rotation.x=Math.PI/2;activityRing.position.y=.4;activityBeam.position.y=26;activityArrow.position.y=10;activityArrow.rotation.x=Math.PI;activityMarker.add(activityRing,activityBeam,activityArrow);
const competitors=[];
let competitorCursor=0,competitorStreaming=false;
function createRivalMarker(rr,index){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;const ctx=canvas.getContext('2d'),accent=`#${new THREE.Color(rr.accent).getHexString()}`;ctx.fillStyle='rgba(4,12,17,.86)';ctx.beginPath();ctx.roundRect(6,10,500,92,22);ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=5;ctx.stroke();ctx.fillStyle=accent;ctx.font='900 27px Segoe UI';ctx.fillText(`RIVAL ${String(index+1).padStart(2,'0')}`,30,45);ctx.fillStyle='#ffffff';ctx.font='900 38px Segoe UI';ctx.fillText(rr.name,30,84);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));marker.name=`rival-marker-${rr.id}`;marker.position.set(0,5.2,0);marker.scale.set(6.8,1.5,1);marker.renderOrder=30;return marker}
function spawnCompetitor(i){
  if(i>=11)return null;const rr=RIDERS[(i+1)%RIDERS.length],cc=CRAFTS[(i+1)%CRAFTS.length],o=craftModel(cc,rr,{}, {detail:'rival'}),marker=createRivalMarker(rr,i);o.add(marker);o.visible=STATE.started;scene.add(o);const entry={o,rider:rr,craft:cc,marker,t:0,lane:i%2?-7.2:7.2,speed:0};competitors.push(entry);competitorCursor=Math.max(competitorCursor,i+1);return entry;
}
for(let i=0;i<3;i++)spawnCompetitor(i);
boot(81,'rivals','Starter rival field ready');
function scheduleCompetitorStreaming(){
  if(competitorStreaming||competitorCursor>=11)return;competitorStreaming=true;
  const next=()=>idle(()=>{const start=performance.now();while(competitorCursor<11&&performance.now()-start<8)spawnCompetitor(competitorCursor);window.__tidalBoot?.background?.('rivals',`${competitors.length}/11 rivals streamed`);if(competitorCursor<11)next();else competitorStreaming=false},420);
  next();
}

const wakeGeo=new THREE.BufferGeometry(),wakeCount=220,wakePos=new Float32Array(wakeCount*3),wakeLife=new Float32Array(wakeCount),wakeDrift=new Float32Array(wakeCount*2);
wakeGeo.setAttribute('position',new THREE.BufferAttribute(wakePos,3));
const wakeMat=new THREE.PointsMaterial({color:0xeaffff,size:1.75,transparent:true,opacity:.76,depthWrite:false,blending:THREE.NormalBlending});
const wakePoints=new THREE.Points(wakeGeo,wakeMat);wakePoints.renderOrder=8;scene.add(wakePoints);
const sprayGeo=new THREE.BufferGeometry(),sprayCount=150,sprayPos=new Float32Array(sprayCount*3),sprayVel=new Float32Array(sprayCount*3),sprayLife=new Float32Array(sprayCount);for(let i=0;i<sprayCount;i++)sprayPos[i*3+1]=-1000;
sprayGeo.setAttribute('position',new THREE.BufferAttribute(sprayPos,3));const sprayMat=new THREE.PointsMaterial({color:0xf6ffff,size:.72,transparent:true,opacity:.82,depthWrite:false,blending:THREE.NormalBlending});const sprayPoints=new THREE.Points(sprayGeo,sprayMat);sprayPoints.renderOrder=9;scene.add(sprayPoints);
let wakeHead=0,wakeTimer=0,sprayHead=0;
function updateWakeStyle(){const c=new THREE.Color(cosmeticById(equipped.wake)?.color||'#65ecff');wakeMat.color.copy(c).lerp(new THREE.Color(0xffffff),.68);sprayMat.color.copy(c).lerp(new THREE.Color(0xffffff),.86)}
function emitWake(dt){
  wakeTimer-=dt;if(wakeTimer>0||Math.abs(speed)<3)return;wakeTimer=.028;
  const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x);
  for(const side of [-1,1]){const i=wakeHead++%wakeCount,p=player.position.clone().add(f.clone().multiplyScalar(-3.35)).add(right.clone().multiplyScalar(side*(.82+Math.random()*.38)));wakePos[i*3]=p.x;wakePos[i*3+1]=p.y-.12;wakePos[i*3+2]=p.z;wakeLife[i]=1;wakeDrift[i*2]=right.x*side*(.36+Math.random()*.28)-f.x*.12;wakeDrift[i*2+1]=right.z*side*(.36+Math.random()*.28)-f.z*.12}
  if(Math.abs(speed)>7)for(let n=0;n<3;n++){const i=sprayHead++%sprayCount,p=player.position.clone().addScaledVector(f,-3.0).addScaledVector(right,(Math.random()-.5)*1.5),j=i*3;sprayPos[j]=p.x;sprayPos[j+1]=p.y+.04;sprayPos[j+2]=p.z;const lift=.65+Math.random()*1.25,side=(Math.random()-.5)*1.25;sprayVel[j]=-f.x*(2.4+Math.random()*2.7)+right.x*side;sprayVel[j+1]=lift;sprayVel[j+2]=-f.z*(2.4+Math.random()*2.7)+right.z*side;sprayLife[i]=.58+Math.random()*.34}
  wakeGeo.attributes.position.needsUpdate=true;
}
function updateWake(dt){for(let i=0;i<wakeCount;i++)if(wakeLife[i]>0){wakeLife[i]=Math.max(0,wakeLife[i]-dt*.48);wakePos[i*3]+=wakeDrift[i*2]*dt;wakePos[i*3+2]+=wakeDrift[i*2+1]*dt;wakePos[i*3+1]+=.012}for(let i=0;i<sprayCount;i++)if(sprayLife[i]>0){const j=i*3;sprayLife[i]-=dt;sprayPos[j]+=sprayVel[j]*dt;sprayPos[j+1]+=sprayVel[j+1]*dt;sprayPos[j+2]+=sprayVel[j+2]*dt;sprayVel[j+1]-=3.8*dt;if(sprayLife[i]<=0)sprayPos[j+1]=-1000}wakeMat.opacity=.52+Math.min(.3,Math.abs(speed)*.005);sprayMat.opacity=.58+Math.min(.3,Math.abs(speed)*.006);wakeGeo.attributes.position.needsUpdate=true;sprayGeo.attributes.position.needsUpdate=true}
updateWakeStyle();

const fishingRig=new THREE.Group();scene.add(fishingRig);fishingRig.visible=false;
const rodMat=new THREE.MeshPhysicalMaterial({color:0x17242b,roughness:.22,metalness:.54,clearcoat:1,clearcoatRoughness:.1}),rodGripMat=new THREE.MeshStandardMaterial({color:0x4b3323,roughness:.78});
const fishingRod=new THREE.Mesh(new THREE.CylinderGeometry(.035,.065,2.9,12),rodMat),rodGrip=new THREE.Mesh(new THREE.CylinderGeometry(.075,.085,.72,12),rodGripMat);fishingRig.add(fishingRod,rodGrip);
const linePointCount=18,linePositions=new Float32Array(linePointCount*3),lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.BufferAttribute(linePositions,3));
const fishingLine=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:0xd8fbff,transparent:true,opacity:.72,depthWrite:false}));fishingLine.frustumCulled=false;fishingRig.add(fishingLine);
const bobber=new THREE.Group(),bobberWhite=new THREE.Mesh(new THREE.SphereGeometry(.16,14,10),new THREE.MeshStandardMaterial({color:0xf5f1df,roughness:.3})),bobberRed=new THREE.Mesh(new THREE.SphereGeometry(.165,14,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xff4d42,roughness:.25,emissive:0x4a0805,emissiveIntensity:.35}));
const bobberStem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.42,8),new THREE.MeshStandardMaterial({color:0xffd46e,roughness:.35})),bobberRipple=new THREE.Mesh(new THREE.RingGeometry(.28,.34,28),new THREE.MeshBasicMaterial({color:0xc6f8ff,transparent:true,opacity:.52,side:THREE.DoubleSide,depthWrite:false}));bobberRed.position.y=.015;bobberStem.position.y=.25;bobberRipple.rotation.x=-Math.PI/2;bobberRipple.position.y=-.11;bobber.add(bobberWhite,bobberRed,bobberStem,bobberRipple);fishingRig.add(bobber);
const catchDisplay=new THREE.Group(),catchBody=new THREE.Mesh(new THREE.SphereGeometry(.52,24,14),new THREE.MeshPhysicalMaterial({color:0x72aeb4,roughness:.27,metalness:.08,clearcoat:.8})),catchTail=new THREE.Mesh(new THREE.ConeGeometry(.46,.7,3),catchBody.material);catchBody.scale.set(1,.72,1.85);catchTail.rotation.x=Math.PI/2;catchTail.position.z=-1.05;catchDisplay.add(catchBody,catchTail);catchDisplay.visible=false;fishingRig.add(catchDisplay);
let fishingSnapshot=fishing.snapshot(),fishingModeBefore='FREE ROAM',catchDisplayTimer=0;
function placeCylinder(mesh,a,b){const mid=a.clone().add(b).multiplyScalar(.5),len=a.distanceTo(b);mesh.position.copy(mid);mesh.scale.y=len/(mesh.geometry.parameters.height||1);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize())}
function toggleFishing(){
  if(!STATE.started)return;
  if(cityLife.mode!=='water')return toast('낚시는 제트스키에 승선한 상태에서 이용하세요');
  if(!fishing.active&&worldActivities.active)return toast('WORLD ACTIVITY ACTIVE · H TO CANCEL');
  if(fishing.active){fishing.exit('manual');STATE.mode=fishingModeBefore;$('#mode').textContent=STATE.mode;$('#fishingHud').classList.add('hidden');document.body.classList.remove('fishing-active');fishingRig.visible=false;audioDirector.cue('fishingStow',.55);toast('낚시 종료 · 항해 재개');return}
  if(Math.abs(speed)>4)return toast('낚시하려면 먼저 감속하세요');
  fishingModeBefore=STATE.mode;STATE.mode='FISHING';$('#mode').textContent='FISHING';fishing.enter(nearestRegion().r.name);$('#fishingHud').classList.remove('hidden');document.body.classList.add('fishing-active');fishingRig.visible=true;audioDirector.cue('fishingReady',.65);
}
function fishingAction(){if(!STATE.started)return;if(!fishing.active)return toggleFishing();fishing.action({region:nearestRegion().r.name,seaState:currentSeaState()})}
function showCatchCard(result){
  const {species,weight,value,isRecord}=result,rarity=FISH_RARITIES[species.rarity],card=$('#catchCard');$('#catchRarity').textContent=rarity.label;$('#catchRarity').style.color=rarity.color;$('#catchName').textContent=`${species.koName} · ${species.name}`;$('#catchStats').textContent=`${weight.toFixed(2)} KG · +${value.toLocaleString()} CR`;$('#catchRecord').textContent=isRecord?'NEW PERSONAL RECORD':'LOG UPDATED';card.style.setProperty('--fish-accent',species.accent);card.classList.remove('hidden');clearTimeout(showCatchCard.t);showCatchCard.t=setTimeout(()=>card.classList.add('hidden'),4200);
  catchBody.material.color.set(species.color);catchBody.material.emissive?.set(species.accent);catchBody.material.emissiveIntensity=species.rarity==='legendary'?.22:.04;catchBody.scale.set(species.body[0]*1.4,species.body[1]*1.35,species.body[2]);catchDisplay.visible=true;catchDisplayTimer=3.8;
}
function handleFishingEvents(){for(const event of fishing.drainEvents()){
  if(event.type==='entered')toast(`${event.region} · ${event.tackle.name}`);
  if(event.type==='cast'){audioDirector.cue('fishingCast',.75);toast('캐스팅 완료 · 입질을 기다리세요')}
  if(event.type==='bite'){audioDirector.cue('fishingBite',1);toast('입질! 지금 Q로 챔질하세요')}
  if(event.type==='hooked'){audioDirector.cue('fishingHook',.9);toast(`${event.species.koName} HIT · 반대 방향으로 버티세요`)}
  if(event.type==='escaped'){audioDirector.cue(event.reason==='line-snap'?'fishingSnap':'fishingLost',.82);const reason={'line-snap':'줄이 끊어졌습니다','slack-line':'줄이 너무 느슨합니다','missed-bite':'챔질 타이밍을 놓쳤습니다','line-stowed':'물고기가 도망갔습니다'}[event.reason]||'물고기가 빠져나갔습니다';toast(reason)}
  if(event.type==='landed'){audioDirector.cue('fishingCatch',1);const rarity=FISH_RARITIES[event.species.rarity],xp=Math.round(45+event.species.fight*95+rarity.multiplier*24),rep=Math.round(8+rarity.multiplier*10);metrics.fishCaught++;if(['rare','epic','legendary'].includes(event.species.rarity))metrics.rareFish++;award({credits:event.value,xp,rep});affinityGain(22+Math.round(event.species.fight*18));maybeCosmeticDrop();showCatchCard(event);toast(`${event.species.koName} · ${event.weight.toFixed(2)} KG · +${event.value.toLocaleString()} CR`);if(document.querySelector('.tab.active')?.dataset.tab==='fish')renderStore('fish')}
}}
function updateFishingRig(dt,snapshot){
  fishingRig.visible=snapshot.active;const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x),hand=player.position.clone().add(new THREE.Vector3(0,2.35,0)).addScaledVector(right,.52),rodTip=hand.clone().addScaledVector(f,2.35).addScaledVector(right,.32);rodTip.y+=1.25;placeCylinder(fishingRod,hand,rodTip);placeCylinder(rodGrip,hand.clone().addScaledVector(f,-.12).add(new THREE.Vector3(0,-.25,0)),hand.clone().addScaledVector(f,.46).add(new THREE.Vector3(0,.18,0)));
  const waterDistance=snapshot.phase==='hooked'?clamp(snapshot.distance,5,30):14,end=player.position.clone().addScaledVector(f,waterDistance).addScaledVector(right,(snapshot.direction||.25)*Math.min(5,waterDistance*.25));end.y=waveHeight(end.x,end.z,STATE.time,currentSeaState())+.16;bobber.position.copy(end);bobber.visible=!['ready','landed','lost'].includes(snapshot.phase);bobber.rotation.z=Math.sin(STATE.time*6)*.08;const pulse=snapshot.phase==='bite'?1+Math.sin(STATE.time*24)*.34:1+Math.sin(STATE.time*3)*.08;bobberRipple.scale.setScalar(pulse);bobberRipple.material.opacity=snapshot.phase==='bite'?.8:.36;
  for(let i=0;i<linePointCount;i++){const t=i/(linePointCount-1),p=rodTip.clone().lerp(end,t);p.y-=Math.sin(Math.PI*t)*(snapshot.phase==='hooked'?.16:.7);linePositions[i*3]=p.x;linePositions[i*3+1]=p.y;linePositions[i*3+2]=p.z}lineGeo.attributes.position.needsUpdate=true;fishingLine.visible=!['ready','landed','lost'].includes(snapshot.phase);
  if(catchDisplay.visible){catchDisplayTimer-=dt;catchDisplay.position.copy(player.position).addScaledVector(right,1.55).add(new THREE.Vector3(0,2.35,0));catchDisplay.rotation.y=heading+Math.PI/2+Math.sin(STATE.time*3)*.12;catchDisplay.rotation.z=Math.sin(STATE.time*2.4)*.09;if(catchDisplayTimer<=0)catchDisplay.visible=false}
}
function updateFishing(dt){
  if(!fishing.active)return;speed*=Math.exp(-4.5*dt);lateral*=Math.exp(-5*dt);fishingSnapshot=fishing.update(dt,{time:STATE.time,region:nearestRegion().r.name,seaState:currentSeaState()},{reel:liveControls.drift||liveControls.throttle>.15,slack:liveControls.brake>.15,rod:liveControls.steer});handleFishingEvents();updateFishingRig(dt,fishingSnapshot);
  const species=fishingSnapshot.target?.species,phaseText={ready:'READY TO CAST',waiting:'WAITING FOR BITE',bite:'BITE · STRIKE NOW',hooked:'FISH ON',landed:'CATCH LANDED',lost:'LINE EMPTY'}[fishingSnapshot.phase]||fishingSnapshot.phase.toUpperCase();$('#fishingPhase').textContent=phaseText;$('#fishTarget').textContent=species?`${species.koName} · ${species.name}`:`${nearestRegion().r.name} FISHING`;$('#fishingPrompt').textContent=fishingSnapshot.phase==='ready'?'Q · CAST':fishingSnapshot.phase==='bite'?'Q · HOOK NOW':fishingSnapshot.phase==='hooked'?'SPACE / ↑ REEL · ← → COUNTER · ↓ GIVE LINE':'G · STOW ROD';$('#lineTensionFill').style.width=`${clamp(fishingSnapshot.tension/fishingSnapshot.tackle.line*100,0,100)}%`;$('#lineTensionFill').dataset.zone=fishingSnapshot.tension>fishingSnapshot.tackle.line*.86?'danger':fishingSnapshot.tension<12?'loose':'safe';$('#fishStaminaFill').style.width=`${clamp(fishingSnapshot.stamina/140*100,0,100)}%`;$('#fishDistance').textContent=`${fishingSnapshot.distance.toFixed(1)} M`;$('#tackleName').textContent=fishingSnapshot.tackle.name;document.body.dataset.fishingPhase=fishingSnapshot.phase;
}

function activityText(value){return value?.[i18n.lang==='ko'?'ko':'en']||value?.en||''}
function toggleWorldActivity(){
  if(!STATE.started)return;
  if(cityLife.mode!=='water')return toast('월드 활동은 제트스키에 승선한 뒤 시작하세요');
  if(worldActivities.active){const result=worldActivities.cancel();activityMarker.visible=false;$('#activityHud').classList.add('hidden');document.body.dataset.activityState='cancelled';audioDirector.cue('activityFail',.45);toast(`${activityText(result.activity.title)} · CANCELLED`);return}
  if(fishing.active)return toast('낚시 장비를 먼저 수납하세요');
  const definition=worldActivities.forRegion(nearestRegion().r.name);worldActivities.start(definition.id,STATE.time);STATE.mode='FREE ROAM';$('#mode').textContent=STATE.mode;audioDirector.cue('activityStart',.8);toast(`${activityText(definition.title)} · START`);renderWorldActivity();
}
function renderWorldActivity(snapshot=worldActivities.snapshot({x:px,z:pz,time:STATE.time})){
  const hud=$('#activityHud');if(!snapshot.active){hud.classList.add('hidden');activityMarker.visible=false;document.body.dataset.activityState='idle';return}
  const target=snapshot.target,time=Math.ceil(snapshot.timeRemaining),minutes=Math.floor(time/60),seconds=String(time%60).padStart(2,'0'),speedWarning=target.maxSpeed!=null&&Math.abs(speed)>target.maxSpeed?` · SLOW ≤ ${Math.round(target.maxSpeed*3.6)} KM/H`:'';
  hud.classList.remove('hidden');hud.dataset.urgent=String(snapshot.timeRemaining<25);$('#activityType').textContent=`${snapshot.type} · H CANCEL`;$('#activityTitle').textContent=activityText(snapshot.title);$('#activityObjective').textContent=activityText(snapshot.label)+speedWarning;$('#activityStep').textContent=`STEP ${snapshot.step+1} / ${snapshot.total}`;$('#activityDistance').textContent=`${Math.round(snapshot.distance)} M`;$('#activityTime').textContent=`${minutes}:${seconds}`;$('#activityFill').style.width=`${Math.round(snapshot.progress*100)}%`;
  activityMarker.visible=true;activityMarker.position.set(target.x,waveHeight(target.x,target.z,STATE.time,currentSeaState())+.28,target.z);const markerScale=target.radius/18;activityRing.scale.setScalar(markerScale);activityBeam.scale.set(target.radius/10,1,target.radius/10);activityRing.rotation.z=STATE.time*.38;activityArrow.position.y=9+Math.sin(STATE.time*2.2)*1.3;activityRingMat.opacity=.62+Math.sin(STATE.time*3)*.14;document.body.dataset.activityState='active';document.body.dataset.activityId=snapshot.id;document.body.dataset.activityStep=`${snapshot.step+1}/${snapshot.total}`;document.body.dataset.activityDistance=String(Math.round(snapshot.distance));
}
function updateWorldActivity(dt){
  const result=worldActivities.update({x:px,z:pz,time:STATE.time,speed,dt});
  if(result?.type==='step'){audioDirector.cue('activityStep',.75);toast(`${activityText(result.activity.title)} · STEP ${result.step+1}`)}
  if(result?.type==='completed'){metrics.activitiesCompleted++;award(result.activity.reward);affinityGain(80);maybeCosmeticDrop();audioDirector.cue('activityComplete',1);toast(`${activityText(result.activity.title)} · +${result.activity.reward.credits.toLocaleString()} CR`);saveProfile()}
  if(result?.type==='failed'){audioDirector.cue('activityFail',.9);toast(`${activityText(result.activity.title)} · TIME EXPIRED`)}
  renderWorldActivity();
}

const keys={},keyMap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'drift',ShiftLeft:'boost',ShiftRight:'boost'};
function rebuildKeyMap(){for(const code of Object.keys(keyMap))delete keyMap[code];for(const [action,codes] of Object.entries(controlBindings))for(const code of codes)keyMap[code]=action;for(const [action,codes] of Object.entries(DEFAULT_BINDINGS).filter(([action])=>['up','down','left','right'].includes(action)))for(const code of codes.filter(code=>code.startsWith('Arrow')))keyMap[code]=action;document.body.dataset.controlBindings=Object.entries(controlBindings).map(([action,codes])=>`${action}:${codes.join('+')}`).join('|')}
rebuildKeyMap();
let inputEventCount=0;
function setControlKey(event,pressed){const k=keyMap[event.code];if(!k)return false;keys[k]=pressed;if(pressed)lastInputDevice='keyboard';inputEventCount++;document.body.dataset.lastControl=`${event.code}:${pressed?'down':'up'}`;document.body.dataset.inputEvents=String(inputEventCount);event.preventDefault();return true}
function clearControlKeys(){Object.keys(keys).forEach(k=>keys[k]=false)}
function startRaceSession(){if(cityLife.mode!=='water')return toast('레이스는 제트스키에 승선한 뒤 시작하세요');STATE.mode='RACE';STATE.lap=1;lastProgress=0;raceT=0;STATE.finished=false;resetPlayer();rivalRace.start(STATE.time,11);$('#mode').textContent='RACE';document.body.dataset.racePhase='countdown';toast('RIVAL GRID READY')}
function toggleRaceMode(){if(fishing.active||cityLife.mode!=='water')return;if(STATE.mode==='RACE'){STATE.mode='FREE ROAM';$('#mode').textContent=STATE.mode;$('#raceCountdown')?.classList.add('hidden');$('#rivalHud')?.classList.add('hidden');competitors.forEach(entry=>entry.marker.visible=false);toast(STATE.mode)}else startRaceSession()}
function navigateGamepadMenu(action){const buttons=[...document.querySelectorAll('#menu button:not([disabled])')].filter(button=>button.offsetParent!==null),active=document.activeElement,index=Math.max(0,buttons.indexOf(active)),step={menuLeft:-1,menuRight:1,menuUp:-4,menuDown:4}[action]||0,next=buttons[clamp(index+step,0,buttons.length-1)];next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest',inline:'nearest'});audioDirector.cue('uiClick',.18)}
function updateInput(){
  const pad=gamepadDirector.poll(),keyboardSteer=(keys.left?1:0)-(keys.right?1:0);
  liveControls.throttle=Math.max(keys.up?1:0,pad.throttle);liveControls.brake=Math.max(keys.down?1:0,pad.brake);liveControls.steer=keyboardSteer||-pad.steer;liveControls.drift=Boolean(keys.drift||pad.drift);liveControls.boost=Boolean(keys.boost||pad.boost);
  if(STATE.started&&pad.boost&&!previousPadBoost)audioDirector.cue('boostIgnite',.7);if(STATE.started&&pad.drift&&!previousPadDrift)audioDirector.cue('driftStart',.55);if(STATE.started&&!pad.drift&&previousPadDrift)audioDirector.cue('driftRelease',.25);previousPadBoost=pad.boost;previousPadDrift=pad.drift;
  if(pad.active)lastInputDevice='gamepad';
  for(const event of gamepadDirector.drainEvents()){
    if(event.type==='connected'){if(STATE.started)toast('GAMEPAD CONNECTED');continue}
    if(event.type==='disconnected'){if(STATE.started)toast('GAMEPAD DISCONNECTED');continue}
    if(event.type!=='action')continue;lastInputDevice='gamepad';document.body.dataset.lastControl=`gamepad:${event.action}`;inputEventCount++;document.body.dataset.inputEvents=String(inputEventCount);
    if(!STATE.started){if(['menuUp','menuDown','menuLeft','menuRight'].includes(event.action))navigateGamepadMenu(event.action);else if(event.action==='confirm'){const focused=document.activeElement;if(focused?.matches?.('#menu button'))focused.click();else startGame()}else if(event.action==='toggleFishing')startGame();continue}
    if(event.action==='item'&&!fishing.active)(cityLife.mode==='water'?useItem():handleLifeInteraction());if(event.action==='fishingAction')(cityLife.mode==='water'?fishingAction():handleLifeInteraction());if(event.action==='activity'){const nearDock=Math.hypot(px-CITY_DOCK.water.x,pz-CITY_DOCK.water.z)<=CITY_DOCK.disembarkRadius;if(cityLife.mode!=='water'||nearDock)toggleOnFoot();else toggleWorldActivity()}if(event.action==='camera')STATE.camera=(STATE.camera+1)%3;if(event.action==='mode')toggleRaceMode();if(event.action==='toggleFishing')toggleFishing();if(event.action==='skill0'&&!fishing.active&&cityLife.mode==='water')activateSkill(0);if(event.action==='skill1'&&!fishing.active&&cityLife.mode==='water')activateSkill(1);
  }
  document.body.dataset.inputDevice=lastInputDevice;document.body.dataset.gamepadConnected=pad.connected?'true':'false';document.body.dataset.gamepadName=pad.id||'';document.body.dataset.gamepadIndex=pad.index==null?'':String(pad.index);
  const status=$('#gamepadSettingsStatus');if(status)status.textContent=pad.connected?pad.id:'연결된 패드 없음';
  const badge=$('#gamepadStatus');if(badge){badge.classList.toggle('show',pad.connected);badge.textContent=pad.connected?`GAMEPAD · ${lastInputDevice==='gamepad'?'ACTIVE':'READY'}`:'GAMEPAD · WAITING'}
}
addEventListener('keydown',e=>{if(remapAction){e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape')remapAction=null;else if(!['Tab','Enter'].includes(e.code)){const arrowFallback={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[remapAction],rightShift=remapAction==='boost'?'ShiftRight':null;controlBindings[remapAction]=[...new Set([e.code,arrowFallback,rightShift].filter(Boolean))];remapAction=null;rebuildKeyMap();saveAccessibility()}if(document.querySelector('.tab.active')?.dataset.tab==='settings')renderSettings($('#store'));return}setControlKey(e,true);const panelOpen=$('#lifePanel')?.dataset.open==='true';if(/^Digit[1-4]$/.test(e.code)&&panelOpen){const button=$(`#lifeActionList [data-life-action]:nth-child(${Number(e.code.slice(-1))})`);if(button)performLifeAction(button.dataset.lifeAction);return}if(/^Digit[1-4]$/.test(e.code)&&!fishing.active&&cityLife.mode==='water')activateSkill(Number(e.code.slice(-1))-1);if(e.code==='KeyE'&&!fishing.active)handleLifeInteraction();if(e.code==='KeyX')toggleOnFoot();if(e.code==='Escape'&&panelOpen)closeLifePanel();if(e.code==='KeyF')toggleRaceMode();if(e.code==='KeyG')toggleFishing();if(e.code==='KeyH')toggleWorldActivity();if(e.code==='KeyQ')fishingAction();if(e.code==='KeyC')STATE.camera=(STATE.camera+1)%3;if(e.code==='KeyR'&&cityLife.mode==='water'){if(fishing.active)toggleFishing();resetPlayer()}},true);
addEventListener('keyup',e=>{setControlKey(e,false)},true);
addEventListener('blur',clearControlKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearControlKeys()});
renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Tidal Racer game controls');renderer.domElement.addEventListener('pointerdown',()=>renderer.domElement.focus({preventScroll:true}));

let px=0,pz=250,heading=Math.PI,speed=0,lateral=0,vertical=0,py=.5,yawRate=0,pitch=0,roll=0,raceT=0,lastProgress=0;
function currentSeaState(){const region=nearestRegion().r.name;return seaStateFor(region,STATE.event?.name||'')}
function activateSkill(slot){
  if(!STATE.started||cityLife.mode!=='water')return;const s=selectedSkills[slot],now=STATE.time,last=skillLast.get(s.id)||-999;
  if(now-last<s.cool)return toast(`${s.name} ${(s.cool-(now-last)).toFixed(1)}s`);
  skillLast.set(s.id,now);metrics.skillUses++;affinityGain(12);
  if(s.id===0){speed+=11;STATE.boost=clamp(STATE.boost+20,0,100)}
  if(s.id===1)STATE.stability=1.8;
  if(s.id===2)competitors.forEach(a=>{if(a.o.position.distanceTo(player.position)<90)a.speed*=.84});
  if(s.id===3)STATE.boost=clamp(STATE.boost+35,0,100);
  saveProfile();toast(s.name);
}
function randomOwnedItem(){const owned=[...inventory].filter(([,n])=>n>0);return owned.length?ITEMS[owned[Math.floor(Math.random()*owned.length)][0]]:null}
function useItem(){
  if(!STATE.started)return;const it=STATE.item||randomOwnedItem();if(!it)return toast('ITEM EMPTY');
  if(!STATE.item){const n=inventory.get(it.id)||0;if(n>0)inventory.set(it.id,n-1)}
  STATE.item=null;$('#itemName').textContent='EMPTY';$('#itemDesc').textContent='아이템 부표를 획득하세요';
  if(['NITRO','TWIN TURBO','BOOST CELL'].includes(it.name)){speed+=it.name==='TWIN TURBO'?14:9;STATE.boost=clamp(STATE.boost+(it.name==='BOOST CELL'?45:22),0,100)}
  else if(['AEGIS','FOAM WALL'].includes(it.name))STATE.shield=true;
  else if(['SPRAY CLOAK','GHOST WAKE'].includes(it.name)){STATE.cloak=true;setTimeout(()=>STATE.cloak=false,4200)}
  else if(it.name==='EMP BURST')competitors.forEach(a=>{if(a.o.position.distanceTo(player.position)<150)a.speed*=.78});
  else if(it.name==='GOLDEN BUOY'){STATE.credits+=1500;creditsUI()}
  else STATE.boost=clamp(STATE.boost+12,0,100);
  metrics.itemUses++;saveProfile();toast(it.name);
}
function triggerEvent(){
  metrics.events++;const e=EVENTS[Math.floor(Math.random()*EVENTS.length)];STATE.event=e;STATE.eventEnd=STATE.time+e.dur;STATE.nextEvent=STATE.eventEnd+18+Math.random()*22;
  $('#eventTitle').textContent=e.name;$('#eventText').textContent=e.desc;$('#event').classList.add('show');
  if(e.name==='NIGHT MARKET')STATE.discount=.72;
  if(e.name==='TREASURE WAKE'){STATE.item=ITEMS[20];$('#itemName').textContent='GOLDEN BUOY';$('#itemDesc').textContent='즉시 1,500 CR'}
  saveProfile();
}
function endEvent(){STATE.event=null;STATE.discount=1;$('#event').classList.remove('show');renderStore(document.querySelector('.tab.active')?.dataset.tab||'shop')}
function navigationPosition(){const facility=cityLife.mode==='interior'?cityLife.currentFacility():null;return facility?facility.exterior:{x:px,z:pz}}
function nearestRegion(){const point=navigationPosition();let best=REGIONS[0],bd=Infinity;for(const r of REGIONS){const d=Math.hypot(point.x-r.x,point.z-r.z);if(d<bd){bd=d;best=r}}return{r:best,d:bd}}
function updateStreaming(){
  const point=navigationPosition();updateRegionStreaming(point.x,point.z);
  const {r}=nearestRegion();
  if(!visitedRegions.has(r.name)){visitedRegions.add(r.name);metrics.regionsVisited=visitedRegions.size;award({xp:90,rep:25});toast(`DISCOVERED · ${r.name}`)}
  if($('#region').textContent!==r.name){$('#region').textContent=r.name;toast(r.name)}
  const st=streamingState(),el=$('#streamStatus');if(el){el.textContent=`${st.loaded}/${st.total} · ${competitors.length+1}/12`;el.classList.toggle('done',st.loaded===st.total&&competitors.length===11&&st.items===34&&st.clouds===42)}
}
function resetPlayer(){const start=route.getPointAt(0),tangent=route.getTangentAt(.0001);px=start.x;pz=start.z;heading=Math.atan2(tangent.x,tangent.z);speed=0;lateral=0;vertical=0;py=.5;yawRate=0;pitch=0;roll=0;if(player){player.position.set(px,py,pz);player.rotation.set(0,heading,0)}}
function snapCameraToPlayer(){if(!player)return;const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x),off=f.clone().multiplyScalar(-8.2).add(right.multiplyScalar(-.52)).add(new THREE.Vector3(0,3.35,0));camera.position.copy(player.position).add(off);camera.lookAt(player.position.clone().addScaledVector(f,6.8).add(new THREE.Vector3(0,1.1,0)));camera.fov=55;camera.updateProjectionMatrix()}

function updatePhysics(dt){
  const gridLocked=STATE.mode==='RACE'&&!rivalRace.canDrive(STATE.time),throttle=fishing.active||gridLocked?0:liveControls.throttle-liveControls.brake,steer=fishing.active||gridLocked?0:liveControls.steer,boostOn=!fishing.active&&!gridLocked&&liveControls.boost&&STATE.boost>0;
  if(boostOn)STATE.boost=Math.max(0,STATE.boost-26*dt);else STATE.boost=Math.min(100,STATE.boost+(liveControls.drift?7:2.2)*dt);
  speed+=throttle*craft.accel*(boostOn?1.55:1)*dt;speed-=Math.sign(speed)*Math.min(Math.abs(speed),(.17+.004*Math.abs(speed))*Math.abs(speed)*dt);speed=clamp(speed,-7,craft.max*(boostOn?1.28:1));
  const speedRatio=clamp(Math.abs(speed)/Math.max(1,craft.max),0,1),reverseSign=speed<-.5?-.68:1;
  const steerAuthority=(.42+speedRatio*.66)*(liveControls.drift?1.32:.82)*craft.turn;
  const targetYaw=steer*steerAuthority*reverseSign;yawRate=lerp(yawRate,targetYaw,1-Math.exp(-(3.3+speedRatio)*dt));heading+=yawRate*dt;
  lateral+=(steer*speed*.043*(liveControls.drift?1.85:.58)-lateral*(liveControls.drift?1.28:3.05))*dt;px+=Math.sin(heading)*speed*dt+Math.cos(heading)*lateral*dt;pz+=Math.cos(heading)*speed*dt-Math.sin(heading)*lateral*dt;
  const sea=currentSeaState(),forwardX=Math.sin(heading),forwardZ=Math.cos(heading),rightX=Math.cos(heading),rightZ=-Math.sin(heading);
  const wh=waveHeight(px,pz,STATE.time,sea),front=waveHeight(px+forwardX*4.4,pz+forwardZ*4.4,STATE.time,sea),back=waveHeight(px-forwardX*3.1,pz-forwardZ*3.1,STATE.time,sea),left=waveHeight(px-rightX*1.45,pz-rightZ*1.45,STATE.time,sea),right=waveHeight(px+rightX*1.45,pz+rightZ*1.45,STATE.time,sea);
  const planingLift=Math.min(.52,Math.abs(speed)*.011),targetY=wh+.62+planingLift,submersion=targetY-py;
  if(submersion>0)vertical+=submersion*(14.5+craft.stability*2.8)*dt;else vertical-=7.4*dt;
  const crestKick=Math.max(0,front-wh-.32)*speedRatio*(1.25+sea*.38);vertical+=crestKick*dt;
  vertical*=Math.exp(-(submersion>0?4.3*craft.stability*STATE.stability:1.05)*dt);py+=vertical*dt;STATE.stability=lerp(STATE.stability,1,1-Math.exp(-1.5*dt));
  pitch=lerp(pitch,Math.atan2(front-back,7.5),.19);roll=lerp(roll,Math.atan2(right-left,2.9)-steer*.105,.16);
  metrics.distance+=Math.abs(speed)*dt;if(liveControls.drift&&Math.abs(speed)>5)metrics.driftSeconds+=dt;
  player.position.set(px,py,pz);player.rotation.set(pitch,heading,roll);animateCraftCharacter(player,{time:STATE.time,speed,maxSpeed:craft.max,steer,drift:liveControls.drift,boost:boostOn,wave:roll,vertical,victory:STATE.time<STATE.victoryUntil});emitWake(dt);updateWake(dt);
}
function updateOnFoot(dt){
  const panelOpen=$('#lifePanel')?.dataset.open==='true',move=panelOpen?0:liveControls.throttle-liveControls.brake,turn=panelOpen?0:liveControls.steer,profile=cityLife.profile;
  const exhausted=profile.energy<15||profile.hunger<12,running=!exhausted&&liveControls.boost&&move>.1,turnDirection=move<-.08?-1:1;
  heading-=turn*2.45*turnDirection*dt;const targetPace=move*(running?6.5:3.65)*(exhausted?.64:1),pace=lerp(footMotionSpeed,targetPace,1-Math.exp(-8*dt));footMotionSpeed=pace;
  px+=Math.sin(heading)*pace*dt;pz+=Math.cos(heading)*pace*dt;const bounds=cityLife.bounds();px=clamp(px,bounds.minX,bounds.maxX);pz=clamp(pz,bounds.minZ,bounds.maxZ);py=bounds.y;
  cityLife.tick(dt,{running});animateFootAvatar(footAvatar,{time:STATE.time,speed:pace,running});placeFootAvatar();updateLifeHud();
  if(player&&cityLife.parkedCraft){const parked=cityLife.parkedCraft,sea=currentSeaState(),surface=waveHeight(parked.x,parked.z,STATE.time,sea);player.position.set(parked.x,surface+.58,parked.z);player.rotation.x=Math.sin(STATE.time*.92)*.018;player.rotation.y=parked.heading;player.rotation.z=Math.sin(STATE.time*1.24)*.025}
}
function completeRace(rank){
  if(STATE.finished)return;STATE.finished=true;STATE.races++;metrics.races++;if(rank===1){STATE.wins++;metrics.wins++;STATE.streak++}else STATE.streak=0;
  const credits=1200+Math.max(0,13-rank)*220,xp=420+Math.max(0,13-rank)*55,rep=rank===1?180:Math.max(35,120-rank*7);
  award({credits,xp,rep});affinityGain(rank===1?130:70);STATE.rating=Math.max(900,STATE.rating+(rank===1?28:Math.max(-18,10-rank*2)));
  STATE.victoryUntil=STATE.time+3.6;speed*=.18;toast(`RACE COMPLETE · #${rank} · +${credits} CR · +${xp} XP`);saveProfile();
  setTimeout(()=>{STATE.victoryUntil=0;startRaceSession();snapCameraToPlayer()},3600);
}
let lastRacePhase='idle',lastCountdownValue=0;
function renderRivalRaceHud(snapshot,drafting=false){
  const countdown=$('#raceCountdown'),hud=$('#rivalHud');if(STATE.mode!=='RACE'){countdown?.classList.add('hidden');hud?.classList.add('hidden');return}
  const countdownValue=snapshot.phase==='countdown'?String(snapshot.countdown):snapshot.goFlash?'GO!':'';if(countdownValue){countdown.classList.remove('hidden');countdown.textContent=countdownValue}else countdown.classList.add('hidden');if(snapshot.countdown&&snapshot.countdown!==lastCountdownValue)audioDirector.cue('uiClick',.32);if(snapshot.phase==='go'&&lastRacePhase!=='go')audioDirector.cue('raceStart',1);lastCountdownValue=snapshot.countdown;lastRacePhase=snapshot.phase;
  hud.classList.remove('hidden');const closest=snapshot.closest,gap=closest?Math.abs(closest.gapMeters):0,entry=closest?competitors[closest.index]:null;$('#rivalName').textContent=entry?.rider.name||'RIVAL FIELD';$('#rivalGap').textContent=closest?`${closest.gapMeters>=0?'AHEAD':'BEHIND'} · ${gap.toFixed(gap<10?1:0)} M`:'NO CONTACT';$('#rivalPosition').textContent=`P${snapshot.playerRank} / 12`;$('#rivalPressure').textContent=drafting?'SLIPSTREAM + BOOST':snapshot.phase==='countdown'?'GRID LOCKED':gap<35?'OVERTAKE RANGE':'RACE PACE';hud.classList.toggle('drafting',drafting);document.body.dataset.racePhase=snapshot.phase;document.body.dataset.raceRank=String(snapshot.playerRank);document.body.dataset.raceClosest=entry?.rider.id||'';document.body.dataset.raceGap=gap.toFixed(1);document.body.dataset.raceDrafting=drafting?'true':'false';
}
function updateRace(dt){
  const lodCounts={LOD0:1,LOD1:0,LOD2:0},trackLength=route.getLength();let snapshot=null,drafting=false,visibleRivals=0;
  if(STATE.mode==='RACE'){
    let nearestT=lastProgress,best=Infinity;for(let i=0;i<=120;i++){const raw=lastProgress-.06+i*.001;if(rivalRace.playerLap===1&&lastProgress<.12&&raw<0)continue;const t=(raw+1)%1,p=route.getPointAt(t),d=Math.hypot(px-p.x,pz-p.z);if(d<best){best=d;nearestT=t}}lastProgress=nearestT;snapshot=rivalRace.update(STATE.time,dt,{playerT:nearestT,playerSpeed:speed,rivalCrafts:competitors.map(entry=>entry.craft)});STATE.lap=snapshot.playerLap;raceT+=dt;
  }
  for(const [idx,a] of competitors.entries()){
    const driver=snapshot?.rivals[idx];if(driver){a.t=driver.t;a.lane=driver.lane;a.speed=driver.speed}else{a.speed=lerp(a.speed,a.craft.max*.68,.015);a.t=(a.t+a.speed/trackLength*dt)%1}
    const p=route.getPointAt(a.t),tan=route.getTangentAt(a.t),side=new THREE.Vector3(-tan.z,0,tan.x).multiplyScalar(a.lane);a.o.position.copy(p).add(side);const wy=waveHeight(a.o.position.x,a.o.position.z,STATE.time,currentSeaState());a.o.position.y=wy+.5;a.o.rotation.y=Math.atan2(tan.x,tan.z);const distance=a.o.position.distanceTo(player.position),inView=STATE.mode==='RACE'&&distance<165,showMarker=inView&&(distance<38||idx===snapshot?.closest?.index);a.marker.visible=showMarker;if(inView)visibleRivals++;if(showMarker){const scale=clamp(1.35-distance/260,.72,1.2);a.marker.scale.set(6.8*scale,1.5*scale,1)}const lodBias=distance<18||idx===snapshot?.closest?.index?0:125,lod=updateCraftLod(a.o,distance+lodBias);lodCounts[lod]++;const steer=driver?clamp((driver.laneTarget-driver.lane)*.2,-1,1):Math.sin(STATE.time*.55+idx)*.2;animateCraftCharacter(a.o,{time:STATE.time+idx*.27,speed:a.speed,maxSpeed:a.craft.max,steer,drift:Math.abs(steer)>.72&&a.speed>24,boost:driver&&driver.targetSpeed>a.craft.max*.88,wave:wy*.08});
    if(snapshot&&rivalRace.canDrive(STATE.time)){const ahead=driver.progress-snapshot.playerProgress;if(ahead>0&&ahead*trackLength<42&&distance<36){drafting=true;STATE.boost=Math.min(100,STATE.boost+4.5*dt)}if(distance<4.1&&rivalRace.registerContact(idx,STATE.time)){speed*=.72;lateral+=(idx%2?-1:1)*2.2;audioDirector.cue('impact',.82);toast(`${a.rider.name} · CONTACT`)}}
  }
  document.body.dataset.riderLods=`${lodCounts.LOD0},${lodCounts.LOD1},${lodCounts.LOD2}`;document.body.dataset.visibleRivals=String(visibleRivals);
  if(snapshot){$('#lap').textContent=`${Math.min(3,snapshot.playerLap)} / 3`;$('#position').textContent=`${snapshot.playerRank} / 12`;renderRivalRaceHud(snapshot,drafting);if(snapshot.result?.type==='player-finished')completeRace(snapshot.result.position)}else{renderRivalRaceHud({});$('#position').textContent='— / 12'}
}
function updateItems(dt){
  for(const b of itemBoxes){
    if(b.userData.cool>0){b.userData.cool-=dt;b.visible=false;continue}
    b.visible=true;b.rotation.y+=dt*1.8;b.rotation.x+=dt*.7;b.position.y=4.5+Math.sin(STATE.time*2+b.position.x)*1.3;
    if(b.position.distanceTo(player.position)<9){const it=ITEMS[Math.floor(Math.random()*ITEMS.length)];STATE.item=it;metrics.itemPickups++;affinityGain(6);maybeCosmeticDrop();saveProfile();$('#itemName').textContent=it.name;$('#itemDesc').textContent=it.desc;b.userData.cool=12;b.visible=false;toast('ITEM · '+it.name)}
  }
}
function updateSkills(){selectedSkills.forEach((s,i)=>{const p=clamp((STATE.time-(skillLast.get(s.id)||-999))/s.cool,0,1),el=$(`#skill-${i} i`);if(el)el.style.width=(p*100)+'%'})}
function updateCamera(){
  if(cityLife.mode!=='water'){
    const ground=cityLife.bounds().y,target=new THREE.Vector3(px,ground+1.65,pz),f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x),off=f.clone().multiplyScalar(-6.6).add(right.multiplyScalar(.72)).add(new THREE.Vector3(0,3.15,0));
    camera.position.lerp(target.clone().add(off),.13);camera.lookAt(target.clone().addScaledVector(f,2.7));camera.fov=lerp(camera.fov,58,.12);camera.updateProjectionMatrix();return;
  }
  if(STATE.time<STATE.victoryUntil){const a=STATE.time*1.15;const target=player.position.clone().add(new THREE.Vector3(0,2.4,0));camera.position.lerp(target.clone().add(new THREE.Vector3(Math.sin(a)*8.5,4.2,Math.cos(a)*8.5)),.1);camera.lookAt(target);return}
  const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x);
  if(fishing.active){const target=bobber.visible?bobber.position.clone():player.position.clone().addScaledVector(f,7);const focus=player.position.clone().lerp(target,.58);focus.y+=.7;const off=f.clone().multiplyScalar(-7.2).add(right.clone().multiplyScalar(4.4)).add(new THREE.Vector3(0,4.8,0));camera.position.lerp(player.position.clone().add(off),.075);camera.lookAt(focus);camera.fov=lerp(camera.fov,52,.075);camera.updateProjectionMatrix();return}
  let off=STATE.camera===0?f.clone().multiplyScalar(-8.2).add(right.clone().multiplyScalar(-.52)).add(new THREE.Vector3(0,3.35,0)):STATE.camera===1?f.clone().multiplyScalar(-18).add(new THREE.Vector3(0,7.4,0)):f.clone().multiplyScalar(-5.25).add(new THREE.Vector3(0,2.55,0));
  const speedN=clamp(Math.abs(speed)/Math.max(1,craft.max),0,1.35),boosting=liveControls.boost&&STATE.boost>0;
  if(boosting&&!accessibility.reducedEffects)off.add(right.multiplyScalar(Math.sin(STATE.time*18)*.075));
  camera.position.lerp(player.position.clone().add(off),.075);camera.position.y+=accessibility.reducedEffects?0:Math.sin(STATE.time*28)*.01*speedN;camera.lookAt(player.position.clone().add(f.multiplyScalar(6.8+Math.abs(speed)*.24)).add(new THREE.Vector3(0,1.1,0)));camera.fov=lerp(camera.fov,55+Math.min(9,Math.abs(speed)*.16)+(boosting&&!accessibility.reducedEffects?2:0),.075);camera.updateProjectionMatrix();
}
function drawMap(){
  const c=$('#minimap'),ctx=c.getContext('2d'),W=c.width,H=c.height,s=.044;ctx.clearRect(0,0,W,H);ctx.fillStyle='#06151ddf';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#8defff40';ctx.lineWidth=2;ctx.beginPath();
  route.getPoints(300).forEach((p,i)=>{const x=W/2+p.x*s,y=H/2+p.z*s;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  for(const r of REGIONS){ctx.beginPath();ctx.fillStyle='#71957c70';ctx.arc(W/2+r.x*s,H/2+r.z*s,Math.max(4,r.r*s),0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#fff';for(const a of competitors){ctx.beginPath();ctx.arc(W/2+a.o.position.x*s,H/2+a.o.position.z*s,2,0,Math.PI*2);ctx.fill()}
  const activitySnapshot=worldActivities.snapshot({x:px,z:pz,time:STATE.time});if(activitySnapshot.active){const pulse=4+Math.sin(STATE.time*4)*1.4;ctx.strokeStyle='#ffd38e';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(W/2+activitySnapshot.target.x*s,H/2+activitySnapshot.target.z*s,pulse,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#74ebff';ctx.beginPath();ctx.arc(W/2+activitySnapshot.target.x*s,H/2+activitySnapshot.target.z*s,2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#ff755f';ctx.beginPath();ctx.arc(W/2+px*s,H/2+pz*s,4,0,Math.PI*2);ctx.fill();
}
function updateWorld(dt){
  cityLife.tickClock(dt);cityLifeWorld.animate(STATE.time);updateLifeHud();
  updateStreaming();if(STATE.time>STATE.nextEvent&&!STATE.event)triggerEvent();if(STATE.event&&STATE.time>STATE.eventEnd)endEvent();
  const storm=STATE.event?.name==='STORM CELL',sea=currentSeaState();updateWaterSurface(STATE.time,sea,px,pz);
  const seaLabel=sea>=1.55?'HEAVY':sea>=1.22?'ROUGH':sea>=.95?'ROLLING':'SHELTERED';const seaHud=$('#seaStateHud');if(seaHud)seaHud.textContent=`SEA STATE · ${seaLabel}`;
  const speedN=clamp(Math.abs(speed)/Math.max(1,craft.max),0,1.35),boosting=liveControls.boost&&STATE.boost>0;updateMarineLife(STATE.time,px,pz,sea,speedN);updateAmbientTraffic(STATE.time,dt,sea);
  updatePresentation(STATE.time,speedN,boosting&&!accessibility.reducedEffects,storm);
  if(speedFx){speedFx.style.opacity=accessibility.reducedEffects?'0':String(clamp((speedN-.48)*.5+(boosting?.28:0),0,.48));speedFx.style.setProperty('--speed-turn',`${-yawRate*5}deg`)}
  const day=cityLife.profile.worldHour/24,solar=Math.sin((cityLife.profile.worldHour-6)/12*Math.PI),daylight=clamp((solar+.12)/.32,0,1);
  scene.fog.density=lerp(scene.fog.density,storm ? .00042 : lerp(.00015,.000088,daylight),.03);sunLight.intensity=lerp(sunLight.intensity,storm ? .72 : .18+daylight*1.54,.035);renderer.toneMappingExposure=lerp(renderer.toneMappingExposure,storm ? .45 : (fishing.active?.55:.42)+daylight*.18,.025);
  const elevation=-7+Math.max(0,solar)*59,az=THREE.MathUtils.degToRad(-72+day*360);sunDir.setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-elevation),az);sky.material.uniforms.sunPosition.value.copy(sunDir);sky.material.uniforms.rayleigh.value=1.1+daylight*1.15;water.material.uniforms.sunDirection.value.copy(sunDir).normalize();updateSunFocus(px,pz);document.body.dataset.worldTime=formatLifeHour(cityLife.profile.worldHour);document.body.dataset.daylight=daylight.toFixed(2);
  clouds.forEach((c,i)=>{c.position.x+=dt*(4+(i%5));if(c.position.x>3500)c.position.x=-3500});
}

function startGame(){if(STATE.started)return;void audioDirector.unlock();while(competitorCursor<11)spawnCompetitor(competitorCursor);STATE.started=true;document.body.classList.add('game-active');$('#menu').classList.add('hidden');$('#hud').classList.remove('hidden');refreshPlayer();updateWakeStyle();configurePost(STATE.quality);if(STATE.mode==='RACE')startRaceSession();else resetPlayer();renderer.toneMappingExposure=.58;sunLight.intensity=1.72;snapCameraToPlayer();creditsUI();updateLifeHud();saveProfile();competitors.forEach(a=>a.o.visible=true);scheduleWorldStreaming();scheduleGameplayStreaming();requestAnimationFrame(()=>renderer.domElement.focus({preventScroll:true}))}
$('#startBtn').onclick=startGame;
let last=performance.now(),saveTick=0,sceneStatsTick=0,careerTick=0,firstFrame=true;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.033,(now-last)/1000);last=now;STATE.time+=dt;updateInput();
  if(STATE.started){
    if(cityLife.mode==='water'){updatePhysics(dt);if(!fishing.active){updateRace(dt);updateItems(dt)}updateFishing(dt);updateWorldActivity(dt)}else updateOnFoot(dt);updateSkills();updateCamera();updateWorld(dt);drawMap();
    $('#speed').textContent=cityLife.mode==='water'?Math.round(Math.abs(speed)*3.6):Math.round(Math.abs(footMotionSpeed)*3.6);$('#rpm').textContent=cityLife.mode==='water'?Math.round(1800+Math.abs(speed)/Math.max(1,craft.max)*7600):'WALK';$('#boostFill').style.width=(cityLife.mode==='water'?STATE.boost:cityLife.profile.energy)+'%';
    saveTick+=dt;if(saveTick>8){saveTick=0;saveProfile();updateMetaHud()}
    sceneStatsTick+=dt;if(sceneStatsTick>1){sceneStatsTick=0;const stats=sceneDiagnostics();document.body.dataset.sceneMeshes=String(stats.visibleMeshes);document.body.dataset.shadowCasters=String(stats.shadowCasters);document.body.dataset.sceneBreakdown=`${stats.characters},${stats.traffic},${stats.marine},${stats.environment}`}
    careerTick+=dt;if(careerTick>.18){careerTick=0;updateCareer()}
  }else{if(speedFx)speedFx.style.opacity='0';updatePresentation(STATE.time,0,false,false);player.position.lerp(new THREE.Vector3(1.6,.55,0),.12);player.rotation.y=lerp(player.rotation.y,Math.PI+Math.sin(STATE.time*.22)*.16,.05);player.rotation.x=lerp(player.rotation.x,0,.08);player.rotation.z=lerp(player.rotation.z,0,.08);animateCraftCharacter(player,{time:STATE.time,speed:0,maxSpeed:craft.max,steer:Math.sin(STATE.time*.35)*.08,menu:true,wave:Math.sin(STATE.time*.7)*.08});const orbit=STATE.time*.10;camera.position.lerp(new THREE.Vector3(8.8+Math.sin(orbit)*1.1,4.5,11.8+Math.cos(orbit)*1.1),.04);camera.lookAt(1.2,2.25,.25);updateMarineLife(STATE.time,player.position.x,player.position.z,.82,0);if(!firstFrame)updateWaterSurface(STATE.time,.82,player.position.x,player.position.z)}
  renderer.info.reset();composer.render();performanceGovernor.sample(dt,STATE.started);
  if(firstFrame){
    firstFrame=false;boot(100,'ready','Menu ready — world continues streaming');
    window.__tidalBoot?.ready?.({bootMs:performance.now()-bootStarted});
    idle(()=>{scheduleCompetitorStreaming();scheduleWorldStreaming();scheduleGameplayStreaming();deferEnvironmentMap();deferAssetManifest()},350);
  }
}
const runtimeHandle={STATE,get rider(){return rider},get craft(){return craft},get player(){return player},get onFootPlayer(){return footAvatar},get heading(){return heading},get speed(){return cityLife.mode==='water'?speed:footMotionSpeed},get controls(){return {...liveControls,device:lastInputDevice,keyboard:{...keys}}},get gamepad(){return gamepadDirector.snapshot()},get race(){return rivalRace.snapshot(STATE.time)},get fishing(){return fishing.snapshot()},get career(){return career.snapshot(careerMetrics())},get activity(){return worldActivities.snapshot({x:px,z:pz,time:STATE.time})},get life(){return cityLife.snapshot()},get seaState(){return currentSeaState()},get streaming(){return {...streamingState(),rivals:competitors.length}},get performance(){return performanceGovernor.snapshot()},get scene(){return sceneDiagnostics()},bootStarted};
window.__tidalV18=runtimeHandle;window.__tidalV16=runtimeHandle;
const V18_IDENTITY={
  ko:{title:'Tidal Racer V18 — Fast Boot / 한국어 / English',eyebrow:'V18 · FAST BOOT · 한국어 / ENGLISH · WORLD STREAMING',hero:'필수 엔진과 Golden Coast를 먼저 표시하고, 나머지 해역·라이벌·환경 자원을 작은 배치로 나눠 뒤에서 스트리밍한다. 기존 한국어/영어, 거친 파도, 캐릭터, 적응형 오디오 기능은 그대로 유지한다.'},
  en:{title:'Tidal Racer V18 — Fast Boot / Korean / English',eyebrow:'V18 · FAST BOOT · KOREAN / ENGLISH · WORLD STREAMING',hero:'Show the essential engine and Golden Coast first, then stream the remaining regions, rivals and environment assets in small background batches while preserving bilingual UI, rough water, characters and adaptive audio.'},
};
function applyV18Identity(lang=i18n.lang){const c=V18_IDENTITY[lang]||V18_IDENTITY.en;document.title=c.title;const e=$('.hero .eyebrow'),p=$('.hero p');if(e)e.textContent=c.eyebrow;if(p)p.textContent=c.hero}
addEventListener('tidal-language-change',e=>applyV18Identity(e.detail?.lang));
boot(88,'language','Korean and English UI ready');
i18n.attach();applyV18Identity();renderCareerHud();
boot(93,'audio','Adaptive audio hooks ready');
audioDirector.attach();
requestAnimationFrame(frame);
addEventListener('resize',()=>{resizeEngine(STATE.quality);performanceGovernor.resize()});
