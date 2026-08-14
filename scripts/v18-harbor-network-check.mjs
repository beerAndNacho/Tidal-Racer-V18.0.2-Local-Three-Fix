import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HarborNetworkDirector, HARBOR_CONTRACT_TEMPLATES, harborTierFor } from '../v18/harbor-network-system.js';

const clock=(day=1,hour=1)=>({day,hour});
const highStanding=1200;
function directorForDay(day){const director=new HarborNetworkDirector({seed:1802});director.standing=highStanding;director.refresh(clock(day),true);return director}
function findTemplate(templateId){for(let day=1;day<=80;day++){const director=directorForDay(day),offer=director.offers.find(item=>item.templateId===templateId);if(offer)return{day,director,offer}}throw new Error(`Template never offered: ${templateId}`)}
function satisfy(director,contract,at){
  for(const objective of contract.objectives){
    if(objective.uniqueField){for(let index=0;index<objective.target;index++)director.record(objective.event,{[objective.uniqueField]:`UNIQUE-${index}`,rarity:'legendary',value:objective.target,position:1,facilityId:objective.facilityId},at);continue}
    const repeats=objective.sumField?1:objective.target;for(let index=0;index<repeats;index++)director.record(objective.event,{position:1,rarity:'legendary',value:objective.target,weight:12,activityId:'test',facilityId:objective.facilityId||'restaurant',region:'GOLDEN COAST'},at);
  }
}

const deterministicA=directorForDay(7),deterministicB=directorForDay(7);assert.deepEqual(deterministicA.offers,deterministicB.offers,'same seed/day/standing must produce identical offers');
assert.equal(deterministicA.offers.length,3);assert.equal(new Set(deterministicA.offers.map(offer=>offer.templateId)).size,3,'daily offers must be unique');
const daySevenIds=deterministicA.offers.map(offer=>offer.id);deterministicA.refresh(clock(8));assert.notDeepEqual(deterministicA.offers.map(offer=>offer.id),daySevenIds,'offer ids must rotate with the day');

const discovered=new Set();for(let day=1;day<=80;day++)for(const offer of directorForDay(day).offers)discovered.add(offer.templateId);
assert.deepEqual([...discovered].sort(),HARBOR_CONTRACT_TEMPLATES.map(item=>item.id).sort(),'all contract templates must enter rotation');
for(const template of HARBOR_CONTRACT_TEMPLATES){
  const {day,director,offer}=findTemplate(template.id),at=clock(day,2),accepted=director.accept(offer.id,at);assert.equal(accepted.ok,true);
  assert.equal(director.accept(director.offers[0].id,at).reason,'active-contract','only one active contract is allowed');assert.equal(director.record('impossible-event',{},at),null,'unrelated events must not advance progress');
  satisfy(director,accepted.contract,at);assert.equal(director.active.status,'ready',`${template.id} must become ready`);const result=director.claim(at);
  assert.equal(result.ok,true);assert.ok(result.reward.credits>0);assert.ok(result.standing>highStanding);assert.equal(director.completed,1);
}

const island=findTemplate('island-chain'),islandAt=clock(island.day,3);island.director.accept(island.offer.id,islandAt);const regionObjective=island.director.active.objectives.find(item=>item.uniqueField==='region');
island.director.record('region',{region:'BLACK REEF'},islandAt);island.director.record('region',{region:'BLACK REEF'},islandAt);assert.equal(regionObjective.progress,1,'the same region cannot count twice');
island.director.record('region',{region:'CORAL EXPANSE'},islandAt);assert.equal(regionObjective.progress,2);

const persisted=new HarborNetworkDirector();persisted.refresh(clock(1));const persistedAccepted=persisted.accept(persisted.offers[0].id,clock(1,0)),restored=new HarborNetworkDirector();
restored.restore(persisted.serialize(),clock(1,1));assert.equal(restored.active.instanceId,persistedAccepted.contract.instanceId);assert.deepEqual(restored.serialize(),persisted.serialize(),'active contract must survive save/restore');
const expired=restored.tick(clock(3,23));assert.equal(expired.type,'expired');assert.equal(restored.active,null);assert.equal(restored.failed,1);

const ready=findTemplate('fresh-order'),readyAt=clock(ready.day,1),readyAccepted=ready.director.accept(ready.offer.id,readyAt);satisfy(ready.director,readyAccepted.contract,readyAt);assert.equal(ready.director.active.status,'ready');
assert.equal(ready.director.tick(clock(ready.day+10,23)),null,'ready contracts remain reportable after the deadline');assert.equal(ready.director.claim(clock(ready.day+10,23)).ok,true);
assert.equal(harborTierFor(0).id,'deckhand');assert.equal(harborTierFor(120).id,'coast-runner');assert.equal(harborTierFor(1200).id,'archipelago-envoy');

const main=fs.readFileSync('v18/main.js','utf8'),city=fs.readFileSync('v18/city-life-system.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of [`recordHarborEvent('race'`,`recordHarborEvent('fish'`,`recordHarborEvent('activity'`,`recordHarborEvent('life'`,`recordHarborEvent('region'`])assert.ok(main.includes(token),`main integration missing ${token}`);
assert.ok(main.includes('harbor:harborNetwork.serialize()')&&main.includes('harborNetwork.restore'));assert.ok(city.includes(`id:'harbor-office'`)&&city.includes('golden-coast-nine-facilities-v5'));
assert.ok(index.includes('id="harborHud"')&&index.includes('harborContractCard'));assert.ok(audio.includes(`case'harborReady'`)&&audio.includes(`case'harborComplete'`));
assert.ok(policy.requiredFiles.includes('v18/harbor-network-system.js')&&policy.sourceFiles.includes('v18/harbor-network-system.js'));
console.log(`PASS harbor network: ${HARBOR_CONTRACT_TEMPLATES.length} templates, deterministic rotation, persistence, deadlines, rewards, and five gameplay event bridges`);
