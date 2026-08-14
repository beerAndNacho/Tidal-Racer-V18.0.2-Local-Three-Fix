import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['INTERIOR_COLLIDER_LAYOUTS','CITY_INTERIOR_COLLIDERS','interior-planter-left','interior-planter-right',"this.mode==='interior'?CITY_INTERIOR_COLLIDERS[this.facilityId]",'street-and-interior-furniture-v2'])assert.ok(life.includes(token),`interior collision system missing ${token}`);
for(const family of ['lift','bed','sofa','shelf','counter','table','dispatch-desk','chart-table','teller-counter','cold-crate','ice-chest','speaker','treadmill','weight-rack'])assert.ok(life.includes(`'${family}`)||life.includes(family),`interior collider family missing ${family}`);
assert.ok(main.includes("cityLife.mode==='interior'?'interior-object':'street-object'"),'runtime collision diagnostics must distinguish venue furniture from street objects');

const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CityLifeDirector:TestLife,CITY_DOCK,CITY_FACILITIES,CITY_INTERIOR_COLLIDERS}=new Function(`${core};return {CityLifeDirector,CITY_DOCK,CITY_FACILITIES,CITY_INTERIOR_COLLIDERS};`)();
const total=Object.values(CITY_INTERIOR_COLLIDERS).reduce((sum,items)=>sum+items.length,0);
assert.ok(total>=60,`expected at least 60 authored interior colliders, got ${total}`);
const simulation=new TestLife();simulation.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});
for(const facility of CITY_FACILITIES){
  simulation.profile.worldHour=facility.id==='nightlife'?20:12;
  const entered=simulation.enter(facility.id);assert.ok(entered.ok,`${facility.id} must remain enterable`);
  assert.equal(simulation.walkCollisionAt(entered.position),null,`${facility.id} entry spawn must be clear`);
  const exit={x:facility.interior.x,z:facility.interior.z+8.8};assert.equal(simulation.walkCollisionAt(exit),null,`${facility.id} exit marker must be clear`);
  const candidates=[];for(let index=0;index<facility.actions.length;index++){const marker={x:facility.interior.x-7.5+index*5,z:facility.interior.z-4.6};for(const dx of[-2.4,0,2.4])for(const dz of[-2.4,0,2.4])candidates.push({x:marker.x+dx,z:marker.z+dz})}
  assert.ok(candidates.some(position=>!simulation.walkCollisionAt(position)&&simulation.contextAt(position)?.kind==='actions'),`${facility.id} action panel must remain reachable around authored furniture`);
  simulation.leave();
}
simulation.enter('home');const home=CITY_FACILITIES.find(item=>item.id==='home'),bed={x:home.interior.x-8,z:home.interior.z-5.1};
assert.equal(simulation.walkCollisionAt(bed)?.id,'home-bed','home bed center must block penetration');
const slide=simulation.resolveWalkMove({x:bed.x-5,z:bed.z-3.4},{x:bed.x,z:bed.z});
assert.ok(slide.collided&&slide.obstacle?.id==='home-bed'&&(Math.abs(slide.x-bed.x)<.01||Math.abs(slide.z-(bed.z-3.4))<.01),'interior diagonal movement must preserve a clear sliding axis');
assert.ok(policy.requiredFiles.includes('v18/city-life-system.js')&&policy.requiredFiles.includes('v18/main.js'),'release policy must ship interior collision data and integration');

console.log(`PASS interior collisions: ${total} authored furniture colliders across nine venues, clear spawns/exits/actions, blocked penetration, and axis sliding`);
