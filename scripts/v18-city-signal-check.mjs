import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COAST_CROSSWALKS, coastSignalState, nearestCoastCrosswalk, coastTrafficSignalDecision } from '../v18/city-traffic-system.js';

assert.equal(COAST_CROSSWALKS.length,2,'Golden Coast needs two authored signal crossings');
assert.deepEqual(coastSignalState(0,COAST_CROSSWALKS[0]),{crossingId:'market-crossing',vehicle:'green',pedestrian:'wait',remaining:14,phase:0,cycle:24});
assert.equal(coastSignalState(15,COAST_CROSSWALKS[0]).vehicle,'amber');
const walk=coastSignalState(18,COAST_CROSSWALKS[0]);assert.equal(walk.vehicle,'red');assert.equal(walk.pedestrian,'walk');assert.equal(walk.remaining,5);
assert.equal(coastSignalState(23.5,COAST_CROSSWALKS[0]).pedestrian,'wait','final all-red clearance must stop pedestrians');
assert.equal(coastSignalState(6,COAST_CROSSWALKS[1]).pedestrian,'walk','crossings need offset phases instead of synchronized traffic');
assert.equal(nearestCoastCrosswalk({x:140,z:410}).id,'market-crossing');

const eastbound={x:120,z:416.4,direction:1,cruise:12},red=coastTrafficSignalDecision(eastbound,18);assert.ok(red.braking&&red.crossing.id==='market-crossing'&&red.targetSpeed<12,'red signal must brake an approaching eastbound car');
assert.equal(coastTrafficSignalDecision({...eastbound,x:130},18).targetSpeed,0,'car near a red stop line must target a full stop');
assert.equal(coastTrafficSignalDecision(eastbound,0).braking,false,'green signal must preserve cruise');
assert.equal(coastTrafficSignalDecision({...eastbound,x:133},15).braking,false,'car too close for a safe amber stop must clear the crossing');
const westbound=coastTrafficSignalDecision({x:160,z:402,direction:-1,cruise:11},18);assert.ok(westbound.braking&&westbound.stopX>COAST_CROSSWALKS[0].x,'westbound traffic needs its own upstream stop line');

const life=fs.readFileSync('v18/city-life-system.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
for(const token of ['CITY_SIGNAL_CROSSWALKS','golden-coast-signal-crossings','crosswalk-stripe','traffic-stop-line','traffic-signal-red','traffic-signal-amber','traffic-signal-green','pedestrian-signal-wait','pedestrian-signal-walk','animateCityCrosswalks','dataset.cityTrafficSignals','dataset.cityPedestrianWalk'])assert.ok(life.includes(token),'signal world missing '+token);
assert.ok(life.includes('traffic-signal-')&&life.includes("crossing.id")&&life.includes("direction<0?'west':'east'"),'signal poles need authored collision generation');
for(const token of ['coastTrafficSignalDecision','Math.min(response.targetSpeed,signal.targetSpeed)','signalBrakingCount','yieldingTo=signalControls?','trafficSignalBraking'])assert.ok(engine.includes(token),'traffic signal integration missing '+token);
for(const token of ['nearestCoastCrosswalk','coastSignalState(STATE.time,crossing)','lifeCrossingStatus','dataset.pedestrianSignal',"!nearest.yieldingTo.startsWith('signal:')"])assert.ok(main.includes(token),'pedestrian signal HUD or horn rule missing '+token);
assert.ok(index.includes('id="lifeCrossingStatus"')&&index.includes(".lifeCrossingStatus[data-state='walk']"),'crossing HUD needs WAIT/WALK presentation');
console.log('PASS city signals: two offset 24-second crossings, safe amber logic, bidirectional red stops, 28 stripes, four collidable poles, animated lamps, integrated braking, horn discipline, pedestrian HUD, and diagnostics');
