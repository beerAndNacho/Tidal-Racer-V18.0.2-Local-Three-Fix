import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CityDeliveryDirector, CITY_DELIVERY_CONTRACT } from '../v18/city-delivery-system.js';

const ready={day:3,mode:'interior',facilityId:'grocery',needs:{energy:88,hunger:82}};
assert.equal(CITY_DELIVERY_CONTRACT.checkpoints.length,6,'courier route should contain pickup, business drops, crossing gates, and plaza finish');
assert.deepEqual(CITY_DELIVERY_CONTRACT.checkpoints.map(point=>point.kind),['pickup','drop','drop','crossing','crossing','drop']);
assert.ok(CITY_DELIVERY_CONTRACT.checkpoints[3].z<CITY_DELIVERY_CONTRACT.checkpoints[4].z,'ordered crossing gates should guide the player from the north curb to the south curb');

const director=new CityDeliveryDirector();
assert.equal(director.quote({...ready,mode:'foot'}).ok,false,'contract must be accepted at the Coast Market desk');
assert.equal(director.quote({...ready,needs:{energy:34,hunger:82}}).requirements[0][0],'energy','readiness requirements must be enforced');
assert.equal(director.start(ready).ok,true);
assert.equal(director.snapshot().run.checkpointIndex,0);
director.update({dt:1,mode:'foot',position:CITY_DELIVERY_CONTRACT.checkpoints[1]});
assert.equal(director.snapshot().run.checkpointIndex,0,'later stops cannot be completed out of order');

for(const point of CITY_DELIVERY_CONTRACT.checkpoints)director.update({dt:2,mode:'foot',position:{x:point.x,z:point.z}});
const events=director.drainEvents(),complete=events.find(event=>event.type==='completed');
assert.ok(complete&&complete.result.reward.credits>CITY_DELIVERY_CONTRACT.basePay,'fast completion should award base pay plus a time bonus');
assert.equal(complete.result.delivered,3,'all three business drops should settle');
assert.equal(director.profile.completed,1);
assert.equal(director.quote(ready).worked,true,'a completed route cannot be farmed again on the same day');

const resumed=new CityDeliveryDirector();resumed.start({...ready,day:4});resumed.update({dt:7,mode:'foot',position:CITY_DELIVERY_CONTRACT.checkpoints[0]});
const restored=new CityDeliveryDirector(resumed.serialize());
assert.equal(restored.snapshot().run.carryingParcel,true,'active carried cargo should survive save restore');
assert.equal(restored.snapshot().run.checkpointIndex,1,'ordered route progress should survive save restore');
assert.ok(restored.snapshot().run.remaining<CITY_DELIVERY_CONTRACT.duration);

const timedOut=new CityDeliveryDirector();timedOut.start({...ready,day:5});timedOut.update({dt:CITY_DELIVERY_CONTRACT.duration+1,mode:'foot',position:{x:-99,z:-99}});
assert.equal(timedOut.profile.failed,1);assert.equal(timedOut.profile.lastResult.reason,'time-expired');
const boarded=new CityDeliveryDirector();boarded.start({...ready,day:6});boarded.update({dt:1,mode:'water',position:{x:230,z:507}});
assert.equal(boarded.profile.lastResult.reason,'boarded-craft','boarding a craft cannot bypass the foot route');
const cancelled=new CityDeliveryDirector();cancelled.start({...ready,day:7});cancelled.cancel();
assert.equal(cancelled.profile.cancelled,1);assert.equal(cancelled.snapshot().active,false);

const main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8')),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
for(const token of ['new CityDeliveryDirector','cityDelivery:cityDelivery.serialize()','cityDelivery.restore(p.cityDelivery)','function cityDeliveryOfferCard','data-city-delivery-start','function updateCityDelivery','player-courier-checkpoint','deliverySnapshot=cityDelivery.snapshot','tone:\'delivery\'',"event.code!=='KeyJ'","event.action==='activity'&&cityDelivery.active","gamepadDirector.pulse(.28,75)"])assert.ok(main.includes(token),'player delivery runtime missing '+token);
for(const token of ['delivery_carry:\'delivery-box\'','foot-prop-delivery-box-body','foot-prop-delivery-box-tape','foot-prop-delivery-box-label',"action==='delivery'"])assert.ok(life.includes(token),'player parcel presentation missing '+token);
for(const cue of ['deliveryStart','deliveryCheckpoint','deliveryComplete','deliveryFail'])assert.ok(audio.includes(`case'${cue}'`),'delivery audio cue missing '+cue);
for(const token of ["dataset.deliveryState==='active'","deliveryUrgent?118:106",'courierDegrees','dataset.audioDeliveryMix'])assert.ok(audio.includes(token),'adaptive courier score missing '+token);
for(const token of ['id="deliveryHud"','id="deliveryTime"','J / Y CANCEL','cityDeliveryOffer','mapJournalCard.delivery'])assert.ok(index.includes(token),'delivery UI missing '+token);
assert.ok(policy.requiredFiles.includes('v18/city-delivery-system.js')&&policy.sourceFiles.includes('v18/city-delivery-system.js'),'release policy must package player delivery system');
for(const [source,token] of [[smoke,'playable player courier contract'],[workflow,'v18-player-delivery-check.mjs'],[readme,'Playable Coast Courier contract'],[readme,'gamepad `Y/Activity` cancel'],[contributing,'v18-player-delivery-check.mjs']])assert.ok(source.includes(token),'delivery verification wiring missing '+token);
console.log('PASS player courier: market acceptance, readiness and daily gates, ordered no-skip route, signal crossing, carried parcel, timer, fast bonus, reward, fail/cancel, active save restore, world/minimap/chart guidance, HUD, input, audio, docs, CI, smoke, and release packaging');
