import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const lifeSource=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8');
const core=lifeSource.slice(lifeSource.indexOf('const clamp='),lifeSource.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_DOCK,CITY_FACILITIES,CITY_INTERIOR_COLLIDERS,CITY_INTERIOR_CAMERA_COLLIDERS,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const {CITY_DOCK,CITY_FACILITIES,CITY_INTERIOR_COLLIDERS,CITY_INTERIOR_CAMERA_COLLIDERS,CityLifeDirector}=runtime;

assert.equal(Object.keys(CITY_INTERIOR_CAMERA_COLLIDERS).length,9,'every enterable venue needs a camera collider set');
const physicalCount=Object.values(CITY_INTERIOR_COLLIDERS).flat().length,cameraCount=Object.values(CITY_INTERIOR_CAMERA_COLLIDERS).flat().length;
assert.ok(cameraCount>=18&&cameraCount<physicalCount,`camera blockers should select tall furniture only: ${cameraCount}/${physicalCount}`);
assert.ok(Object.values(CITY_INTERIOR_CAMERA_COLLIDERS).flat().every(collider=>!/-table-|cold-crate|ice-chest|treadmill|planter/.test(collider.id)),'low furniture should not over-constrain the elevated camera');

const director=new CityLifeDirector();director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});assert.equal(director.enter('grocery').ok,true);
const grocery=CITY_FACILITIES.find(item=>item.id==='grocery'),trace=director.traceFootCamera({x:grocery.interior.x,z:grocery.interior.z+6.8},{x:grocery.interior.x,z:grocery.interior.z-9});
assert.ok(trace.collided&&trace.space==='interior'&&/grocery-shelf/.test(trace.obstacle?.id),'camera ray should stop before a tall grocery shelf');
assert.ok(trace.z>grocery.interior.z-9,'collision should keep the camera on the visible side of furniture');

const boundary=director.traceFootCamera({x:grocery.interior.x,z:grocery.interior.z+6.8},{x:grocery.interior.x+100,z:grocery.interior.z+100});
assert.ok(boundary.collided&&boundary.boundary,'interior camera must remain inside authored room bounds');
director.mode='water';const water=director.traceFootCamera({x:0,z:0},{x:50,z:50});
assert.ok(!water.collided&&water.x===50&&water.space==='water','water camera must remain outside the on-foot collision path');

for(const token of ['CITY_INTERIOR_CAMERA_COLLIDERS','this.mode===\'interior\'?CITY_INTERIOR_CAMERA_COLLIDERS','space:this.mode'])assert.ok(lifeSource.includes(token),'interior camera runtime missing '+token);
for(const token of ['traceFootCamera({x:target.x','dataset.footCameraCollision','dataset.footCameraObject','dataset.footCameraSpace'])assert.ok(main.includes(token),'camera telemetry integration missing '+token);
console.log('PASS interior camera: nine venue sets, tall-only blocker selection, shelf occlusion, safe-side trace, room bounds, water bypass, smooth shared camera path, object telemetry, and space telemetry');
