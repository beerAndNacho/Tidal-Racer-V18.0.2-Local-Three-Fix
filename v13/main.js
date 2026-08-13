import { THREE, scene, camera, renderer, composer, configurePost, sunLight, sky, sunDir, water, regionGroups, route, craftModel, itemBoxes, clouds, resizeEngine } from './engine.js';
import { RIDERS, CRAFTS, SKILLS, ITEMS, EVENTS, REGIONS } from '../data-v12.js';
import { RARITIES, SEASON, COSMETICS, COLLECTIONS, CONTRACTS, TITLES, GHOST_RIVALS, MARKET_SEED } from '../systems-v13.js';

const $=s=>document.querySelector(s),clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const STATE={started:false,time:0,lap:1,credits:24000,boost:58,item:null,mode:'RACE',camera:0,quality:'balanced',event:null,eventEnd:0,nextEvent:25,shield:false,cloak:false,stability:1,discount:1,xp:0,level:1,reputation:0,seasonXp:0,wins:0,races:0,streak:0,rating:1450,finished:false};
let rider=RIDERS[0],craft=CRAFTS[0],selectedSkills=[SKILLS[0],SKILLS[1],SKILLS[2],SKILLS[3]];
const inventory=new Map([[2,2],[1,1],[14,1],[27,1]]),skillLast=new Map(SKILLS.map(s=>[s.id,-999]));
const cosmeticOwned=new Set(['paint-coral','wake-aqua']);
const equipped={paint:'paint-coral',wake:'wake-aqua',suit:null,helmet:null};
const claimedContracts=new Set(),claimedCollections=new Set(),visitedRegions=new Set(['GOLDEN COAST']);
const affinity=new Map(RIDERS.map(r=>[r.id,{xp:0,level:1}]));
const metrics={distance:0,skillUses:0,itemPickups:0,itemUses:0,regionsVisited:1,driftSeconds:0,races:0,wins:0,events:0};
const market=MARKET_SEED.map(x=>({...x}));
const SAVE_KEY='tidal-racer-v13-profile';

function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1500)}
function levelFromXp(xp){return 1+Math.floor(xp/1000)}
function seasonLevel(){return Math.min(SEASON.maxLevel,1+Math.floor(STATE.seasonXp/SEASON.xpPerLevel))}
function currentTitle(){return [...TITLES].reverse().find(t=>STATE.reputation>=t.rep)?.name||TITLES[0].name}
function progressValue(metric){return metric==='regionsVisited'?visitedRegions.size:(metrics[metric]||0)}
function cosmeticById(id){return COSMETICS.find(c=>c.id===id)}
function saveProfile(){
  const payload={state:{credits:STATE.credits,xp:STATE.xp,reputation:STATE.reputation,seasonXp:STATE.seasonXp,wins:STATE.wins,races:STATE.races,streak:STATE.streak,rating:STATE.rating},inventory:[...inventory],cosmetics:[...cosmeticOwned],equipped,claimedContracts:[...claimedContracts],claimedCollections:[...claimedCollections],visited:[...visitedRegions],affinity:[...affinity],metrics};
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
    Object.assign(metrics,p.metrics||{});
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

function renderStore(tab='shop'){
  const root=$('#store');root.innerHTML='';
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
}

function equipCosmetic(c){if(!cosmeticOwned.has(c.id))return;equipped[c.slot]=c.id;refreshPlayer();updateWakeStyle();saveProfile();toast(`${c.name} 장착`)}

RIDERS.forEach((r,i)=>{const b=document.createElement('button');b.className='choice'+(i===0?' active':'');b.innerHTML=`<b>${r.name}</b><small>${r.style} · ${r.passive}</small>`;b.onclick=()=>{rider=r;toast(`${r.name} · AFFINITY LV ${(affinity.get(r.id)||{level:1}).level}`);[...$('#riders').children].forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('#riders').appendChild(b)});
CRAFTS.forEach((c,i)=>{const b=document.createElement('button');b.className='choice'+(i===0?' active':'');b.innerHTML=`<b>${c.name}</b><small>${c.type}</small>`;b.onclick=()=>{craft=c;[...$('#crafts').children].forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('#crafts').appendChild(b)});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');renderStore(t.dataset.tab)});
document.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-quality]').forEach(x=>x.classList.remove('active'));b.classList.add('active');STATE.quality=b.dataset.quality;configurePost(STATE.quality);toast(`QUALITY · ${STATE.quality.toUpperCase()}`)});
selectedSkills.forEach((s,i)=>{const d=document.createElement('div');d.className='skill glass';d.id='skill-'+i;d.innerHTML=`<span>${i+1}</span><b>${s.name}</b><i></i>`;$('#skills').appendChild(d)});
renderStore();creditsUI();

let player=craftModel(craft,rider,visualLoadout());scene.add(player);
const competitors=[];
for(let i=0;i<11;i++){const rr=RIDERS[(i+1)%RIDERS.length],cc=CRAFTS[(i+1)%CRAFTS.length],o=craftModel(cc,rr);scene.add(o);competitors.push({o,t:(i+1)/12,lane:(i%4-1.5)*10,speed:.014+(i%5)*.0013})}
function refreshPlayer(){scene.remove(player);player=craftModel(craft,rider,visualLoadout());scene.add(player)}

const wakeGeo=new THREE.BufferGeometry(),wakeCount=110,wakePos=new Float32Array(wakeCount*3),wakeLife=new Float32Array(wakeCount);
wakeGeo.setAttribute('position',new THREE.BufferAttribute(wakePos,3));
const wakeMat=new THREE.PointsMaterial({color:0x65ecff,size:2.6,transparent:true,opacity:.68,depthWrite:false,blending:THREE.AdditiveBlending});
const wakePoints=new THREE.Points(wakeGeo,wakeMat);scene.add(wakePoints);
let wakeHead=0,wakeTimer=0;
function updateWakeStyle(){wakeMat.color.set(cosmeticById(equipped.wake)?.color||'#65ecff')}
function emitWake(dt){
  wakeTimer-=dt;if(wakeTimer>0||Math.abs(speed)<3)return;wakeTimer=.028;
  const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x);
  for(const side of [-1,1]){const i=wakeHead++%wakeCount,p=player.position.clone().add(f.clone().multiplyScalar(-3.2)).add(right.clone().multiplyScalar(side*(1+Math.random()*.55)));wakePos[i*3]=p.x;wakePos[i*3+1]=p.y+.05;wakePos[i*3+2]=p.z;wakeLife[i]=1}
  wakeGeo.attributes.position.needsUpdate=true;
}
function updateWake(dt){for(let i=0;i<wakeCount;i++)if(wakeLife[i]>0){wakeLife[i]=Math.max(0,wakeLife[i]-dt*.42);wakePos[i*3+1]+=.015}wakeMat.opacity=.48+Math.min(.32,Math.abs(speed)*.006);wakeGeo.attributes.position.needsUpdate=true}
updateWakeStyle();

const keys={},keyMap={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'drift',ShiftLeft:'boost',ShiftRight:'boost'};
addEventListener('keydown',e=>{const k=keyMap[e.code];if(k){keys[k]=true;e.preventDefault()}if(/^Digit[1-4]$/.test(e.code))activateSkill(Number(e.code.slice(-1))-1);if(e.code==='KeyE')useItem();if(e.code==='KeyF'){STATE.mode=STATE.mode==='RACE'?'FREE ROAM':'RACE';$('#mode').textContent=STATE.mode;toast(STATE.mode)}if(e.code==='KeyC')STATE.camera=(STATE.camera+1)%3;if(e.code==='KeyR')resetPlayer()});
addEventListener('keyup',e=>{const k=keyMap[e.code];if(k){keys[k]=false;e.preventDefault()}});
addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));

let px=0,pz=250,heading=Math.PI,speed=0,lateral=0,vertical=0,py=.5,yawRate=0,pitch=0,roll=0,raceT=0,lastProgress=0;
function waveHeight(x,z,t){const storm=STATE.event?.name==='STORM CELL'||STATE.event?.name==='TIDAL SURGE',amp=storm?1.7:1;return(Math.sin(x*.012+t*.85)*.52+Math.sin(z*.008-t*.62+x*.005)*.42+Math.sin((x+z)*.031+t*1.8)*.14)*amp}
function activateSkill(slot){
  if(!STATE.started)return;const s=selectedSkills[slot],now=STATE.time,last=skillLast.get(s.id)||-999;
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
function nearestRegion(){let best=REGIONS[0],bd=Infinity;for(const r of REGIONS){const d=Math.hypot(px-r.x,pz-r.z);if(d<bd){bd=d;best=r}}return{r:best,d:bd}}
function updateStreaming(){
  for(const rg of regionGroups){const d=Math.hypot(px-rg.region.x,pz-rg.region.z);rg.group.visible=d<3100}
  const {r}=nearestRegion();
  if(!visitedRegions.has(r.name)){visitedRegions.add(r.name);metrics.regionsVisited=visitedRegions.size;award({xp:90,rep:25});toast(`DISCOVERED · ${r.name}`)}
  if($('#region').textContent!==r.name){$('#region').textContent=r.name;toast(r.name)}
}
function resetPlayer(){px=0;pz=250;heading=Math.PI;speed=0;lateral=0;vertical=0;py=.5;yawRate=0}

function updatePhysics(dt){
  const throttle=(keys.up?1:0)-(keys.down?1:0),steer=(keys.left?1:0)-(keys.right?1:0),boostOn=keys.boost&&STATE.boost>0;
  if(boostOn)STATE.boost=Math.max(0,STATE.boost-26*dt);else STATE.boost=Math.min(100,STATE.boost+(keys.drift?7:2.2)*dt);
  speed+=throttle*craft.accel*(boostOn?1.55:1)*dt;speed-=Math.sign(speed)*Math.min(Math.abs(speed),(.17+.004*Math.abs(speed))*Math.abs(speed)*dt);speed=clamp(speed,-7,craft.max*(boostOn?1.28:1));
  const targetYaw=-steer*(.34+Math.abs(speed)*.012)*(keys.drift?.52:1)*craft.turn;yawRate=lerp(yawRate,targetYaw,1-Math.exp(-3.8*dt));heading+=yawRate*dt;
  lateral+=(steer*speed*.038*(keys.drift?1.7:.5)-lateral*(keys.drift?1.35:3.2))*dt;px+=Math.sin(heading)*speed*dt+Math.cos(heading)*lateral*dt;pz+=Math.cos(heading)*speed*dt-Math.sin(heading)*lateral*dt;
  const wh=waveHeight(px,pz,STATE.time),targetY=wh+.55;vertical+=(targetY-py)*16*dt;vertical*=Math.exp(-6.2*dt*craft.stability*STATE.stability);py+=vertical*dt;STATE.stability=lerp(STATE.stability,1,1-Math.exp(-1.5*dt));
  const front=waveHeight(px+Math.sin(heading)*3,pz+Math.cos(heading)*3,STATE.time),back=waveHeight(px-Math.sin(heading)*2.6,pz-Math.cos(heading)*2.6,STATE.time),left=waveHeight(px-Math.cos(heading)*1.1,pz+Math.sin(heading)*1.1,STATE.time),right=waveHeight(px+Math.cos(heading)*1.1,pz-Math.sin(heading)*1.1,STATE.time);
  pitch=lerp(pitch,Math.atan2(front-back,5.6),.15);roll=lerp(roll,Math.atan2(right-left,2.2)+steer*.08,.13);
  metrics.distance+=Math.abs(speed)*dt;if(keys.drift&&Math.abs(speed)>5)metrics.driftSeconds+=dt;
  player.position.set(px,py,pz);player.rotation.set(pitch,heading,roll);emitWake(dt);updateWake(dt);
}
function completeRace(rank){
  if(STATE.finished)return;STATE.finished=true;STATE.races++;metrics.races++;if(rank===1){STATE.wins++;metrics.wins++;STATE.streak++}else STATE.streak=0;
  const credits=1200+Math.max(0,13-rank)*220,xp=420+Math.max(0,13-rank)*55,rep=rank===1?180:Math.max(35,120-rank*7);
  award({credits,xp,rep});affinityGain(rank===1?130:70);STATE.rating=Math.max(900,STATE.rating+(rank===1?28:Math.max(-18,10-rank*2)));
  toast(`RACE COMPLETE · #${rank} · +${credits} CR · +${xp} XP`);saveProfile();
  setTimeout(()=>{STATE.lap=1;lastProgress=0;raceT=0;STATE.finished=false;resetPlayer()},1800);
}
function updateRace(dt){
  for(const a of competitors){a.t=(a.t+a.speed*dt)%1;const p=route.getPointAt(a.t),tan=route.getTangentAt(a.t),side=new THREE.Vector3(-tan.z,0,tan.x).multiplyScalar(a.lane);a.o.position.copy(p).add(side);a.o.position.y=waveHeight(a.o.position.x,a.o.position.z,STATE.time)+.5;a.o.rotation.y=Math.atan2(tan.x,tan.z)}
  let rank=1;
  if(STATE.mode==='RACE'){
    let nearestT=lastProgress,best=Infinity;
    for(let i=0;i<=80;i++){const t=(lastProgress-.04+i*.001+1)%1,p=route.getPointAt(t),d=p.distanceTo(new THREE.Vector3(px,0,pz));if(d<best){best=d;nearestT=t}}
    if(lastProgress>.92&&nearestT<.08){STATE.lap++;if(STATE.lap>3){for(const a of competitors)if(a.t>lastProgress)rank++;completeRace(clamp(rank,1,12))}}
    lastProgress=nearestT;$('#lap').textContent=`${Math.min(3,STATE.lap)} / 3`;raceT+=dt;
  }
  rank=1;for(const a of competitors)if(a.t>lastProgress)rank++;$('#position').textContent=`${clamp(rank,1,12)} / 12`;
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
  const f=new THREE.Vector3(Math.sin(heading),0,Math.cos(heading)),right=new THREE.Vector3(f.z,0,-f.x);
  let off=STATE.camera===0?f.clone().multiplyScalar(-12).add(right.clone().multiplyScalar(-1.2)).add(new THREE.Vector3(0,5.1,0)):STATE.camera===1?f.clone().multiplyScalar(-18).add(new THREE.Vector3(0,8.5,0)):f.clone().multiplyScalar(-6).add(new THREE.Vector3(0,3.1,0));
  camera.position.lerp(player.position.clone().add(off),.085);camera.lookAt(player.position.clone().add(f.multiplyScalar(16+Math.abs(speed)*.35)).add(new THREE.Vector3(0,1.4,0)));camera.fov=lerp(camera.fov,61+Math.min(13,Math.abs(speed)*.22),.08);camera.updateProjectionMatrix();
}
function drawMap(){
  const c=$('#minimap'),ctx=c.getContext('2d'),W=c.width,H=c.height,s=.044;ctx.clearRect(0,0,W,H);ctx.fillStyle='#06151ddf';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#8defff40';ctx.lineWidth=2;ctx.beginPath();
  route.getPoints(300).forEach((p,i)=>{const x=W/2+p.x*s,y=H/2+p.z*s;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
  for(const r of REGIONS){ctx.beginPath();ctx.fillStyle='#71957c70';ctx.arc(W/2+r.x*s,H/2+r.z*s,Math.max(4,r.r*s),0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#fff';for(const a of competitors){ctx.beginPath();ctx.arc(W/2+a.o.position.x*s,H/2+a.o.position.z*s,2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#ff755f';ctx.beginPath();ctx.arc(W/2+px*s,H/2+pz*s,4,0,Math.PI*2);ctx.fill();
}
function updateWorld(dt){
  updateStreaming();if(STATE.time>STATE.nextEvent&&!STATE.event)triggerEvent();if(STATE.event&&STATE.time>STATE.eventEnd)endEvent();
  water.material.uniforms.time.value+=dt;const storm=STATE.event?.name==='STORM CELL';scene.fog.density=lerp(scene.fog.density,storm?.0007:.00035,.03);sunLight.intensity=lerp(sunLight.intensity,storm?2.5:5.1,.03);
  const day=(STATE.time*.0025)%1,az=THREE.MathUtils.degToRad(225+day*18);sunDir.setFromSphericalCoords(1,THREE.MathUtils.degToRad(78+Math.sin(day*Math.PI*2)*3),az);sky.material.uniforms.sunPosition.value.copy(sunDir);water.material.uniforms.sunDirection.value.copy(sunDir).normalize();
  clouds.forEach((c,i)=>{c.position.x+=dt*(4+(i%5));if(c.position.x>3500)c.position.x=-3500});
}

$('#startBtn').onclick=()=>{STATE.started=true;$('#menu').classList.add('hidden');$('#hud').classList.remove('hidden');refreshPlayer();updateWakeStyle();configurePost(STATE.quality);resetPlayer();creditsUI();saveProfile()};
let last=performance.now(),saveTick=0;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.033,(now-last)/1000);last=now;STATE.time+=dt;
  if(STATE.started){
    updatePhysics(dt);updateRace(dt);updateItems(dt);updateSkills();updateCamera();updateWorld(dt);drawMap();
    $('#speed').textContent=Math.round(Math.abs(speed)*3.6);$('#rpm').textContent=Math.round(1800+Math.abs(speed)/Math.max(1,craft.max)*7600);$('#boostFill').style.width=STATE.boost+'%';
    saveTick+=dt;if(saveTick>8){saveTick=0;saveProfile();updateMetaHud()}
  }else{camera.position.lerp(new THREE.Vector3(105,64,310),.025);camera.lookAt(0,20,0);water.material.uniforms.time.value+=dt*.35}
  composer.render();
}
requestAnimationFrame(frame);
addEventListener('resize',()=>resizeEngine(STATE.quality));
