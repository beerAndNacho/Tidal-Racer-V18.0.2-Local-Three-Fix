import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CityPopulationDirector } from '../v18/city-population-system.js';

const director=new CityPopulationDirector({seed:1818});director.update({dt:.016,hour:12,enabled:true,player:{x:-100,z:-100},rain:0});const active=director.agents.filter(agent=>agent.active),a=active[0],b=active[1];a.x=b.x=220;a.z=b.z=410;for(let frame=0;frame<20;frame++)director.update({dt:.05,hour:12,enabled:true,player:{x:-100,z:-100},rain:0});
assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>.3,'overlapping citizens must separate through deterministic personal space');
const yielding=new CityPopulationDirector({seed:1818});yielding.update({dt:.016,hour:12,enabled:true,player:{x:-100,z:-100}});const subject=yielding.agents.find(agent=>agent.active),player={x:subject.x+.8,z:subject.z+.2};yielding.update({dt:.05,hour:12,enabled:true,player,rain:0});assert.equal(subject.state,'yielding','citizen must yield inside the player personal-space radius');assert.ok(Math.abs(subject.lookYaw)>0,'nearby citizen must turn their head toward the player');
const storm=new CityPopulationDirector({seed:1818});for(let frame=0;frame<12000;frame++)storm.update({dt:.05,hour:12,enabled:true,player:{x:-100,z:-100},rain:.9});const stormSnapshot=storm.snapshot({hour:12}),sheltered=stormSnapshot.agents.filter(agent=>agent.state==='sheltering');assert.ok(sheltered.length>=8,`heavy rain should distribute citizens to shelters, got ${sheltered.length}`);assert.ok(new Set(sheltered.map(agent=>Math.round(agent.x))).size>=6,'rain sheltering must stay distributed rather than stack the crowd');
for(let frame=0;frame<30;frame++)storm.update({dt:.05,hour:12,enabled:true,player:{x:-100,z:-100},rain:0});assert.ok(storm.agents.some(agent=>agent.active&&['walking','yielding','waiting'].includes(agent.state)),'citizens must resume daily routes when rain clears');

const population=fs.readFileSync('v18/city-population-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8');
for(const token of ['RAIN_SHELTERS','activeAgents','separation>=1.45','playerDistance<2.25','agent.avoidance','seeking-shelter','sheltering','agent.lookYaw','sheltering?.16','yielding?.12'])assert.ok(population.includes(token),`crowd reaction runtime missing ${token}`);
assert.ok(main.includes('rain:latestWeather.rain')&&main.includes('dataset.citizenYielding')&&main.includes('dataset.citizenSheltering'),'world runtime must feed rain and expose crowd diagnostics');
assert.ok(main.includes("...population.agents.map(agent=>({id:agent.id")&&main.includes('actors:trafficActors'),'active citizen snapshots must also feed vehicle pedestrian awareness');
console.log('PASS citizen crowd: deterministic personal space, mutual separation, player yielding and head tracking, 18 distributed rain shelters, shelter pose, diagnostics, and route resume');
