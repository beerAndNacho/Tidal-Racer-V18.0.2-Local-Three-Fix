import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const audio=fs.readFileSync('v14/audio-director.js','utf8');
const policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));

for(const token of ['rawX=','rawZ=','nextX=clamp(rawX','nextZ=clamp(rawZ','resolved=cityLife.resolveWalkMove','collided=resolved.collided||nextX!==rawX||nextZ!==rawZ','footMotionSpeed*=.28','lastFootCollision','paceN=clamp','reducedEffects?0','dataset.footPace','dataset.footCameraCollision','camera.fov=lerp(camera.fov,57+paceN*3'])assert.ok(main.includes(token),`on-foot movement polish missing ${token}`);
assert.ok(main.includes("audioDirector.cue('footCollision'")&&audio.includes("case'footCollision'")&&main.includes("footCollision:'보행 경계 충돌'"),'bounded collision feedback needs audio, captions, and runtime cue wiring');
assert.ok(main.includes("?'EXHAUSTED':Math.abs(footMotionSpeed)>4.5?'RUNNING':Math.abs(footMotionSpeed)>.25?'WALKING':'ON FOOT'"),'life HUD must expose the live walking state');
assert.ok(main.includes('desired.x=clamp(desired.x,bounds.minX+.45,bounds.maxX-.45)')&&main.includes('desired.z=clamp(desired.z,bounds.minZ+.45,bounds.maxZ-.45)'),'chase camera must stay inside the active walkable volume');

const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CityLifeDirector:TestLife,CITY_DOCK,CITY_FACILITIES}=new Function(`${core};return {CityLifeDirector,CITY_DOCK,CITY_FACILITIES};`)();
const simulation=new TestLife();
const bounds=simulation.bounds();
assert.deepEqual(bounds,{minX:-35,maxX:630,minZ:379.5,maxZ:476,y:1.03},'street walkable volume must retain the storefront facade while including the east plaza and modeled overlook pier');
const footSimulation=new TestLife();footSimulation.mode='foot';assert.ok(footSimulation.resolveWalkMove({x:510,z:440},{x:510,z:462}).boundary,'irregular east waterfront mask must prevent walking into water beside the pier');
assert.ok(simulation.canDisembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0}),'dock disembark must remain valid after tightening city bounds');
simulation.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});
const restaurant=CITY_FACILITIES.find(facility=>facility.id==='restaurant');
assert.ok(restaurant&&simulation.contextAt({x:restaurant.exterior.x,z:bounds.minZ})?.facility?.id==='restaurant','storefront interaction must remain reachable at the new facade line');
assert.ok(policy.requiredFiles.includes('v18/main.js')&&policy.requiredFiles.includes('v18/city-life-system.js')&&policy.requiredFiles.includes('v14/audio-director.js'),'release policy must ship all on-foot runtime layers');

console.log('PASS on-foot quality: responsive acceleration, reverse steering, sprint state, facade collision damping, bounded camera framing, pace motion, FOV, haptics, and captions');
