import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CITY_CITIZENS, CityPopulationDirector } from '../v18/city-population-system.js';

assert.equal(CITY_CITIZENS.length,18,'the authored city population must contain 18 residents');
assert.equal(new Set(CITY_CITIZENS.map(citizen=>citizen.id)).size,18,'citizen ids must be unique');
assert.ok(CITY_CITIZENS.every(citizen=>citizen.role.ko&&citizen.role.en&&citizen.lines.length>=2&&citizen.lines.every(line=>line.ko&&line.en)),'all citizens require bilingual roles and dialogue');

const director=new CityPopulationDirector({seed:1818}),noon=director.update({dt:.016,hour:12,enabled:true,player:{x:230,z:410}});
assert.ok(noon.activeCount>=10,'the commercial district should be populated at midday');assert.equal(noon.total,18);
const first=director.agents.find(agent=>agent.active),before={x:first.x,z:first.z};for(let index=0;index<40;index++)director.update({dt:.05,hour:12,enabled:true,player:{x:-100,z:-100}});
assert.ok(Math.hypot(first.x-before.x,first.z-before.z)>.1,'active citizens must move along authored routes');
const context=director.contextAt({x:first.x,z:first.z});assert.equal(context.kind,'npc');assert.equal(context.npc.id,first.profile.id);

const firstTalk=director.talk(first.profile.id,{day:1,hour:12});assert.equal(firstTalk.ok,true);assert.equal(firstTalk.mood,4);
const spam=director.talk(first.profile.id,{day:1,hour:12.1});assert.equal(spam.reason,'cooldown','dialogue rewards need a game-time cooldown');
const nextTalk=director.talk(first.profile.id,{day:1,hour:12.4});assert.equal(nextTalk.ok,true);assert.notDeepEqual(nextTalk.line,firstTalk.line,'dialogue should rotate');
const restored=new CityPopulationDirector();restored.restore(director.serialize());assert.deepEqual(restored.serialize(),director.serialize(),'dialogue history and cooldown must persist');

const lateNight=new CityPopulationDirector(),night=lateNight.update({dt:.016,hour:3,enabled:true});assert.ok(night.activeCount<noon.activeCount,'population density must react to time of day');
const hidden=lateNight.update({dt:.016,hour:12,enabled:false});assert.equal(hidden.activeCount,0,'population simulation must deactivate outside on-foot city mode');
for(const agent of director.agents)assert.ok(agent.x>=-35&&agent.x<=630&&agent.z>=379.5&&agent.z<=476,'citizen routes must stay inside the expanded Golden Coast public-realm bounds');
assert.ok(director.agents.some(agent=>agent.routeIndex>=4),'the scheduled population must include east-plaza and overlook-pier routes');

const main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
assert.ok(main.includes('buildCityPopulationWorld(THREE,scene,cityPopulation)')&&main.includes('cityPopulationWorld.update'));assert.ok(main.includes('population:cityPopulation.serialize()')&&main.includes('cityPopulation.restore(p.population)'));
assert.ok(main.includes("lifeContext?.kind==='npc'")&&main.includes('performCitizenInteraction'));assert.ok(life.includes('socialize(npcId')&&life.includes('socialize:${npcId}'));
assert.ok(audio.includes(`case'citizenTalk'`)&&main.includes("citizenTalk:'시민과 대화'"));assert.ok(policy.requiredFiles.includes('v18/city-population-system.js')&&policy.sourceFiles.includes('v18/city-population-system.js'));
assert.ok(fs.readFileSync('index.html','utf8').includes('id="lifePrompt"'),'citizen interaction reuses the accessible life prompt');

console.log('PASS living city population: 18 bilingual residents, scheduled density, commercial, east-plaza and overlook-pier walking, proximity dialogue, cooldown, persistence, and runtime integration');
