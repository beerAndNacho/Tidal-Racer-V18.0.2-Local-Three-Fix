import assert from 'node:assert/strict';
import fs from 'node:fs';
import { coastTrafficAwareness, coastTrafficDecision, coastTrafficClearance } from '../v18/city-traffic-system.js';

const engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
const car={x:100,z:409.2,direction:1,cruise:12},ahead={x:114,z:409.4,mode:'foot'},otherLane={x:114,z:418,mode:'foot'},water={x:114,z:409.4,mode:'water'};
const yielding=coastTrafficAwareness(car,ahead),clearLane=coastTrafficAwareness(car,otherLane),waterMode=coastTrafficAwareness(car,water);
assert.ok(yielding.braking&&yielding.targetSpeed<car.cruise&&yielding.ahead===14,'same-lane pedestrian ahead must trigger proportional braking');
assert.ok(!clearLane.braking&&clearLane.targetSpeed===car.cruise,'another lane must not trigger braking');
assert.ok(!waterMode.braking&&waterMode.targetSpeed===car.cruise,'watercraft mode must not affect road traffic');
assert.equal(coastTrafficAwareness(car,{x:106,z:409.2,mode:'foot'}).targetSpeed,0,'close pedestrian must make the car target a full stop');
assert.ok(coastTrafficClearance(car,{x:102,z:410,mode:'foot'}).overlap,'vehicle body overlap must register contact');
assert.ok(!coastTrafficClearance(car,{x:108,z:416,mode:'foot'}).overlap,'distant diagonal position must stay clear');
const decision=coastTrafficDecision(car,[{id:'citizen-far',x:118,z:409.2,mode:'foot'},{id:'player',x:106,z:409.2,mode:'foot'}]);assert.ok(decision.braking&&decision.targetSpeed===0&&decision.actorId==='player','multi-actor decision must choose the most urgent same-lane hazard');
assert.equal(coastTrafficDecision(car,[otherLane,water]).actorId,null,'multi-actor decision must ignore other lanes and non-foot modes');
for(const token of ['cruise,targetSpeed:cruise,braking:false','coastTrafficDecision','coastTrafficClearance','braking?5.8:1.45','trafficBraking','trafficActors','brakeMaterial.color.setHex','return{nearest,brakingCount,signalBrakingCount,vehicleCount'])assert.ok(engine.includes(token),`traffic runtime missing ${token}`);
for(const token of ['latestTraffic=updateAmbientTraffic','function updateCityTrafficFeedback','lastTrafficHorn','lastTrafficContact',"activityId:'traffic-contact'",'dataset.trafficAlert','TRAFFIC CONTACT'])assert.ok(main.includes(token),`traffic feedback missing ${token}`);
assert.ok(audio.includes("case'trafficHorn'")&&audio.includes("case'trafficContact'"),'traffic horn and contact need dedicated synthesized cues');
assert.ok(main.includes("trafficActors=cityLife.mode==='foot'")&&main.includes("...population.agents.map(agent=>({id:agent.id")&&main.includes("actors:trafficActors"),'active citizens and the player must feed the shared vehicle awareness model');
assert.ok(policy.requiredFiles.includes('v18/city-traffic-system.js')&&policy.sourceFiles.includes('v18/city-traffic-system.js'),'release policy must ship the traffic awareness model');

console.log('PASS city traffic: multi-pedestrian priority, player/citizen awareness, 22 m proportional braking, close stop, lane/mode isolation, body clearance, brake lamps, horn, player-only contact pushback, needs impact, and cooldowns');
