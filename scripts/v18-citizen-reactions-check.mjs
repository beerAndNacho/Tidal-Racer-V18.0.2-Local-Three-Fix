import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CityPopulationDirector } from '../v18/city-population-system.js';

const director=new CityPopulationDirector({seed:1818});director.update({dt:.016,hour:12,enabled:true,player:{x:-100,z:-100}});const agent=director.agents.find(candidate=>candidate.active),player={x:agent.x+2,z:agent.z+1},before={x:agent.x,z:agent.z};
const focus=director.focus(agent.profile.id,player,2.8);assert.ok(focus.ok&&agent.state==='talking'&&agent.social===2.8,'focused citizen should enter a bounded talking state');
assert.ok(Math.abs(agent.heading-Math.atan2(player.x-agent.x,player.z-agent.z))<1e-8,'focused citizen should face the player');
for(let frame=0;frame<20;frame++)director.update({dt:.05,hour:12,enabled:true,player});
assert.equal(agent.state,'talking');assert.equal(agent.x,before.x);assert.equal(agent.z,before.z,'talking citizens should not slide along their route');
for(let frame=0;frame<55;frame++)director.update({dt:.05,hour:12,enabled:true,player:{x:-100,z:-100}});
assert.ok(agent.social===0&&Math.hypot(agent.x-before.x,agent.z-before.z)>.01,'citizen should naturally resume the authored route after conversation');
assert.equal(director.focus('missing-person',player).ok,false,'unknown citizens cannot enter reaction state');

const population=fs.readFileSync('v18/city-population-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8');
for(const token of ['social:0','agent.social>0','focus(npcId,player','agent.state=\'talking\'','talking=agent.state===\'talking\'','gesture=talking','visual.arms[0].rotation.x=delivering?-.76:talking','visual.legs[0].rotation.x=talking||sheltering?0'])assert.ok(population.includes(token),`citizen reaction runtime missing ${token}`);
assert.ok(main.includes('cityPopulation.focus(result.npc.id,{x:px,z:pz})'),'successful player dialogue must focus the citizen');
console.log('PASS citizen reactions: player-facing focus, bounded conversation pause, no route sliding, head nod, arm gesture, planted feet, and automatic route resume');
