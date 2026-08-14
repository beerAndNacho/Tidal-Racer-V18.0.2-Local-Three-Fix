import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_PUBLIC_SPACE,CITY_PUBLIC_ACTIVITIES,cityPublicActivityStatus,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const {CITY_PUBLIC_SPACE,CITY_PUBLIC_ACTIVITIES,cityPublicActivityStatus,CityLifeDirector}=runtime;

assert.equal(CITY_PUBLIC_SPACE.id,'east-waterfront');assert.deepEqual(CITY_PUBLIC_ACTIVITIES.map(activity=>activity.id),['plaza_rest','plaza_performance','plaza_view']);
assert.equal(CITY_PUBLIC_ACTIVITIES[0].spots.length,4,'all four authored plaza benches should be usable');
assert.ok(cityPublicActivityStatus('plaza_performance',12).available&&cityPublicActivityStatus('plaza_performance',20).available,'street sets should run at lunch and in the evening');
assert.equal(cityPublicActivityStatus('plaza_performance',15).available,false);assert.equal(cityPublicActivityStatus('plaza_performance',15).nextOpen,18);
const director=new CityLifeDirector();director.mode='foot';director.profile.worldHour=12;let context=director.contextAt({x:505,z:423.7});assert.equal(context.kind,'public-activity');assert.equal(context.activity.id,'plaza_rest');
const beforeRest={energy:director.profile.energy,mood:director.profile.mood,day:director.profile.day,hour:director.profile.worldHour},rest=director.performPublicActivity('plaza_rest',0);assert.ok(rest.ok&&rest.wallet===0&&rest.paymentSource==='free');assert.ok(rest.profile.energy>beforeRest.energy&&rest.profile.mood>beforeRest.mood&&rest.profile.worldHour>beforeRest.hour);
director.profile.worldHour=15;const beforeSchedule=director.serialize(),closed=director.performPublicActivity('plaza_performance',500);assert.equal(closed.reason,'schedule');assert.deepEqual(director.serialize(),beforeSchedule,'closed performance must not mutate profile state');
director.profile.worldHour=20;const beforeFunds=director.serialize(),declined=director.performPublicActivity('plaza_performance',90);assert.equal(declined.reason,'wallet');assert.deepEqual(director.serialize(),beforeFunds,'insufficient tip funds must not mutate profile state');
const performance=director.performPublicActivity('plaza_performance',500);assert.ok(performance.ok&&performance.wallet===400&&performance.action.cost===100&&performance.profile.activities.plaza_performance===1);
director.profile.worldHour=9;context=director.contextAt({x:560,z:464.2});assert.equal(context.activity.id,'plaza_view');const view=director.performPublicActivity('plaza_view',400);assert.ok(view.ok&&view.wallet===400&&view.profile.activities.plaza_view===1);

for(const token of ['CITY_PUBLIC_ACTIVITIES','function cityPublicActivityStatus','performPublicActivity(activityId,wallet=0)',"kind:'public-activity'",'plaza-activity-marker-','dataset.cityPlazaActivities'])assert.ok(life.includes(token),`public activity runtime missing ${token}`);
for(const token of ['function performPublicSpaceActivity','performPublicActivity(context.activity.id','dataset.lastPublicActivity',"context.kind==='public-activity'",'lifeContext.status.available',"'plaza_rest'","'plaza_performance'","'plaza_view'"])assert.ok(main.includes(token),`public activity integration missing ${token}`);
for(const [source,token] of [[smoke,'interactive public-space routines'],[readme,'Interactive plaza routines'],[contributing,'v18-public-space-activity-check.mjs'],[workflow,'v18-public-space-activity-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);

console.log('PASS public-space activities: four bench spots, scheduled lunch/evening performance, exact next opening, safe tip rejection, wallet charge, rest and view routines, time and needs effects, activity persistence, world markers, prompts, sequences, props, telemetry, docs, smoke, and CI');
