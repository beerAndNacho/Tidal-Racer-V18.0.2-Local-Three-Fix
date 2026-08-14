import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CITY_CITIZENS } from '../v18/city-population-system.js';
import { CITIZEN_COPY, CITIZEN_FAVORS, CitizenRelationshipDirector, applyCitizenLocalization } from '../v18/citizen-relationship-system.js';

assert.equal(Object.keys(CITIZEN_COPY).length,18,'all eighteen citizens need corrected localized copy');
assert.equal(CITIZEN_FAVORS.length,8,'eight authored community favors should span city and core activities');
const localized=applyCitizenLocalization(CITY_CITIZENS.map(citizen=>({...citizen})));
assert.ok(localized.every(citizen=>citizen.role.ko&&citizen.role.en&&citizen.lines.length===2&&citizen.lines.every(line=>line.ko&&line.en)),'all localized citizen roles and lines must be bilingual');
assert.ok(localized.every(citizen=>!/\?{2,}|�/.test(citizen.role.ko+citizen.lines.map(line=>line.ko).join(''))),'localized citizen copy must not contain replacement or placeholder corruption');

const director=new CitizenRelationshipDirector();
let talk=director.talk('mina-park');assert.equal(talk.relation.affinity,5);director.talk('mina-park');talk=director.talk('mina-park');
assert.ok(talk.offered&&talk.favor.id==='dispatch-hand','repeated conversation should unlock the citizen’s authored favor');
assert.equal(director.record('job',{jobId:'market-stocker'}),null,'unrelated actions must not progress a favor');
let progress=director.record('job',{jobId:'dock-crew'});assert.equal(progress.type,'ready');assert.equal(progress.state.progress,1);
talk=director.talk('mina-park');assert.ok(talk.claimed&&talk.reward.credits===650&&talk.reward.rep===14,'returning to the citizen should claim the authored reward');
assert.equal(director.snapshot().completed,1);assert.equal(director.snapshot().active,null);

director.talk('leo-costa');director.talk('leo-costa');talk=director.talk('leo-costa');assert.equal(talk.favor.id,'safe-finish');
assert.equal(director.record('race',{position:7}),null,'race favors must enforce their placement requirement');
progress=director.record('race',{position:4});assert.equal(progress.type,'ready');
const restored=new CitizenRelationshipDirector(director.serialize());assert.deepEqual(restored.serialize(),director.serialize(),'relationships, active favors, progress, and completed count must survive save restore');

const main=fs.readFileSync('v18/main.js','utf8'),ui=fs.readFileSync('v18/citizen-relationship-ui.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new CitizenRelationshipDirector','applyCitizenLocalization(CITY_CITIZENS)','citizenRelations:citizenRelations.serialize()','citizenRelations.restore(p.citizenRelations)','function recordCitizenEvent','function performCitizenRelationship','recordCitizenEvent(\'job\'','recordCitizenEvent(\'fish\'','recordCitizenEvent(\'race\'','recordCitizenEvent(\'visit\'','COMMUNITY FAVOR'])assert.ok(main.includes(token),`citizen relationship runtime missing ${token}`);
assert.ok(index.includes('id="lifeRelationStatus"')&&ui.includes('mapJournalCard.relationship'),'community HUD and journal styling must exist');
for(const cue of ['citizenFavorOffer','citizenFavorProgress','citizenFavorReady','citizenFavorComplete','citizenTrust'])assert.ok(audio.includes(`case'${cue}'`),`missing relationship audio cue ${cue}`);
for(const file of ['v18/citizen-relationship-system.js','v18/citizen-relationship-ui.js'])assert.ok(policy.requiredFiles.includes(file)&&policy.sourceFiles.includes(file),`release policy must ship ${file}`);
console.log('PASS citizen relationships: corrected bilingual copy, persistent trust, single active favor, event filters, ready/claim loop, rewards, HUD, map journal, audio, and packaging');
