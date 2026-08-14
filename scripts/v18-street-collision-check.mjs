import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COAST_PARKING_SPOTS } from '../v18/city-traffic-system.js';

const life=fs.readFileSync('v18/city-life-system.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['CITY_STREET_COLLIDERS','CITY_CAMERA_COLLIDERS','GOLDEN_CITY={centerX:620*.36,roadZ:620*.66}','colliderAt(position,radius=.42','resolveWalkMove(from,to,radius=.42)','traceFootCamera(from,to,radius=.22,steps=18)','const xOnly=','zOnly=','street-and-interior-furniture-v2'])assert.ok(life.includes(token),`street collision system missing ${token}`);
for(const family of ['-planter-','-bollard-','street-tree-','street-planter-','promenade-bench-','marina-cafe-table-','quay-bin-','street-litter-bin-','fire-hydrant-','utility-cabinet-','safety-cone-','parked-vehicle-'])assert.ok(life.includes(family),`authored collider family missing ${family}`);
assert.ok(main.includes('cityLife.resolveWalkMove({x:startX,z:startZ},{x:nextX,z:nextZ})')&&main.includes("cityLife.mode==='interior'?'interior-object':'street-object'")&&main.includes('dataset.footCollisionObject=resolved.obstacle?.id'),'runtime must consume collision resolution and expose diagnostics');
assert.ok(main.includes('cityLife.traceFootCamera({x:target.x,z:target.z},{x:desired.x,z:desired.z})')&&main.includes('dataset.footCameraObject=cameraTrace.obstacle?.id'),'camera must trace against tall street objects and expose the occluder');

const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CityLifeDirector:TestLife,CITY_DOCK,CITY_FACILITIES,CITY_STREET_COLLIDERS}=new Function('COAST_PARKING_SPOTS',`${core};return {CityLifeDirector,CITY_DOCK,CITY_FACILITIES,CITY_STREET_COLLIDERS};`)(COAST_PARKING_SPOTS);
const simulation=new TestLife();
simulation.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});
assert.ok(CITY_STREET_COLLIDERS.length>=95,`expected dense authored street collision field, got ${CITY_STREET_COLLIDERS.length}`);
for(const spot of COAST_PARKING_SPOTS)assert.ok(CITY_STREET_COLLIDERS.some(collider=>collider.id==='parked-vehicle-'+spot.id&&collider.x===spot.x&&collider.z===spot.z),'parked vehicle collider must share rendered spot '+spot.id);
for(const facility of CITY_FACILITIES)assert.equal(simulation.walkCollisionAt({x:facility.exterior.x+4.9,z:379.5}),null,`${facility.id} doorway must stay unobstructed`);
const bench=CITY_STREET_COLLIDERS.find(item=>item.id==='promenade-bench-0');
const blocked=simulation.resolveWalkMove({x:bench.x-4,z:bench.z},{x:bench.x,z:bench.z});
assert.ok(blocked.collided&&blocked.obstacle?.id===bench.id&&Math.abs(blocked.x-(bench.x-4))<.001,'direct movement into a bench must be rejected');
const sliding=simulation.resolveWalkMove({x:bench.x-4,z:bench.z-2},{x:bench.x,z:bench.z});
assert.ok(sliding.collided&&sliding.obstacle?.id===bench.id&&Math.abs(sliding.x-bench.x)<.001&&Math.abs(sliding.z-(bench.z-2))<.001,'diagonal collision must preserve the longer clear axis for sliding');
const open=simulation.resolveWalkMove({x:230,z:436},{x:232,z:438});
assert.ok(!open.collided,'Golden Coast dock boarding approach must stay open');
const tree=CITY_STREET_COLLIDERS.find(item=>item.id==='street-tree-0'),cameraTrace=simulation.traceFootCamera({x:tree.x,z:tree.z+4},{x:tree.x,z:tree.z-4});
assert.ok(cameraTrace.collided&&cameraTrace.obstacle?.id===tree.id&&cameraTrace.z>tree.z,'camera trace must stop on the player side of a tall street obstacle');
assert.ok(policy.requiredFiles.includes('v18/city-life-system.js')&&policy.requiredFiles.includes('v18/main.js'),'release policy must ship collision model and runtime integration');

console.log(`PASS street collisions: ${CITY_STREET_COLLIDERS.length} authored props, open doors and dock, boundary diagnostics, blocked penetration, and axis-separated sliding`);
