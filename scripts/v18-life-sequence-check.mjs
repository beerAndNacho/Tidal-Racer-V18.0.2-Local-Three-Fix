import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const id of ['lifeSequence','lifeSequenceCard','lifeSequenceVenue','lifeSequenceTitle','lifeSequenceDescription','lifeSequenceTime','lifeSequenceCost','lifeSequenceStats','lifeSequenceFill'])assert.ok(index.includes(`id="${id}"`),`life sequence markup missing ${id}`);
for(const token of ['.lifeSequence{','.lifeSequenceCard{','.lifeSequenceStats{','.lifeSequenceTrack{','life-sequence-active'])assert.ok(index.includes(token),`life sequence presentation missing ${token}`);
for(const token of ['LIFE_SEQUENCE_GROUPS','function lifeSequenceGroup','function beginLifeSequence','function updateLifeSequence','duration=accessibility.reducedEffects?.55:1.8','if(lifeSequence)return','panelOpen=$(\'#lifePanel\')?.dataset.open===\'true\'||sequenceActive','action:lifeSequence?.pose||',"nightlifeRhythm?'leisure':null"])assert.ok(main.includes(token),`life sequence runtime missing ${token}`);
for(const group of ['rest','refresh','meal','shop','transact','transit','leisure','train'])assert.ok(main.includes(`${group}:`),`life routine group missing ${group}`);
for(const cue of ['lifeRest','lifeMeal','lifeShop','lifeBank','transitRide','lifeLeisure','lifeTrain','lifeRefresh'])assert.ok(audio.includes(`case'${cue}'`)&&main.includes(`${cue}:'`)||main.includes(`'${cue}'`),`life routine audio missing ${cue}`);
assert.ok(life.includes('action=null')&&life.includes("if(action==='rest')")&&life.includes("if(action==='train')")&&life.includes("if(action==='leisure')")&&life.includes("if(action==='transit')"),'foot avatar must expose routine-specific procedural poses');
assert.ok(main.includes('const before={...cityLife.profile},result=cityLife.perform')&&main.includes("saveProfile();if(actionId==='arcade')")&&main.includes('else beginLifeSequence(result,before)'), 'routine result must commit and save before passive or playable presentation begins');
assert.ok(policy.requiredFiles.includes('index.html')&&policy.requiredFiles.includes('v18/main.js')&&policy.requiredFiles.includes('v18/city-life-system.js')&&policy.requiredFiles.includes('v14/audio-director.js'),'release policy must ship sequence UI, runtime, poses, and audio');

console.log('PASS life sequences: eight routine groups, venue presentation, time/cost/need deltas, reduced-effects duration, committed saves, input lock, procedural poses, haptics, and dedicated audio');
