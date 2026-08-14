import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),population=fs.readFileSync('v18/city-population-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_FOOT_AREAS,cityFootAreaAt,CITY_STREET_COLLIDERS,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const {CITY_FOOT_AREAS,cityFootAreaAt,CITY_STREET_COLLIDERS,CityLifeDirector}=runtime;

assert.deepEqual(CITY_FOOT_AREAS.map(area=>area.id),['commercial-strip','east-waterfront-plaza','east-overlook-pier']);
assert.ok(cityFootAreaAt({x:480,z:430})&&cityFootAreaAt({x:610,z:440})&&cityFootAreaAt({x:560,z:470}),'commercial strip, plaza, and overlook pier must be walkable');
assert.equal(cityFootAreaAt({x:500,z:462}),null,'unmodeled water beside the pier must stay inaccessible');
const director=new CityLifeDirector();director.mode='foot';assert.deepEqual(director.bounds(),{minX:-35,maxX:630,minZ:379.5,maxZ:476,y:1.03});
let move=director.resolveWalkMove({x:480,z:430},{x:510,z:430});assert.equal(move.collided,false,'commercial strip must connect cleanly into the plaza');
move=director.resolveWalkMove({x:540,z:440},{x:540,z:462});assert.equal(move.collided,false,'plaza must connect cleanly onto the modeled overlook pier');
move=director.resolveWalkMove({x:510,z:440},{x:510,z:462});assert.ok(move.collided&&move.boundary&&move.z<=450,'water beside the pier must slide or stop at the authored public realm');
move=director.resolveWalkMove({x:540,z:417},{x:552,z:417});assert.ok(move.collided&&move.obstacle?.id==='plaza-sculpture','reflecting pool and tidal sculpture must block the avatar');
const camera=director.traceFootCamera({x:510,z:444},{x:510,z:468});assert.ok(camera.collided&&camera.obstacle?.id==='city-walkable-edge','foot camera must not cross the unmodeled water edge');
for(const id of ['plaza-sculpture','plaza-performance-stage','plaza-kiosk-0','plaza-planter-0','plaza-bench-0','plaza-lamp-0','plaza-viewfinder'])assert.ok(CITY_STREET_COLLIDERS.some(collider=>collider.id===id),`missing plaza collider ${id}`);

for(const token of ['function addEastWaterfrontPlaza','golden-coast-east-waterfront-plaza','east-plaza-paving','east-plaza-quay-apron','plaza-kiosk-sign','plaza-reflecting-water','plaza-tidal-sculpture','plaza-performance-stage','plaza-street-performer','plaza-point-light','plaza-viewfinder','east-plaza-entry-arch','function animateEastWaterfrontPlaza','dataset.cityEastPlaza','dataset.cityPlazaPerformance'])assert.ok(life.includes(token),`plaza world presentation missing ${token}`);
for(const token of ['[{x:486,z:405},{x:620,z:405}','[{x:520,z:435},{x:585,z:435}','PLAZA_RAIN_SHELTERS','agent.routeIndex>=4','clamp(agent.x+nx*travel,-35,630)','clamp(agent.z+nz*travel,379.5,476)'])assert.ok(population.includes(token),`plaza population routing missing ${token}`);
assert.ok(main.includes('dataset.cityPlazaPopulation'),'main telemetry must report residents currently using the east district');
for(const [source,token] of [[smoke,'expanded east waterfront plaza'],[readme,'East waterfront public realm'],[contributing,'v18-east-waterfront-plaza-check.mjs'],[workflow,'v18-east-waterfront-plaza-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);

console.log('PASS east waterfront plaza: three connected walk areas, safe irregular shoreline mask, collision-aware sculpture, stage, kiosks, furniture, lights and viewfinder, camera water-edge stop, two citizen loops, local rain shelters, live performer, reactive night lighting, telemetry, docs, smoke, and CI');
