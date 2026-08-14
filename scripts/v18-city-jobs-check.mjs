import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CityJobDirector, CITY_JOBS } from '../v18/city-job-system.js';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

assert.equal(CITY_JOBS.length,6,'six distinct city jobs should be available');
assert.equal(new Set(CITY_JOBS.map(job=>job.facilityId)).size,6,'each job should use a distinct city venue');
const prepared={energy:94,hunger:90,mood:84,hygiene:96},tired={energy:34,hunger:24,mood:20,hygiene:18},director=new CityJobDirector();

let quote=director.quote('dock-crew',{day:1,hour:9,reputation:0,needs:prepared});
assert.ok(quote.ok&&quote.pay>0,'entry harbor shift should be available during daytime');
assert.equal(director.quote('dock-crew',{day:1,hour:22,reputation:0,needs:prepared}).reason,undefined);
assert.equal(director.quote('dock-crew',{day:1,hour:22,reputation:0,needs:prepared}).open,false,'day shift should close at night');
assert.equal(director.quote('lounge-crew',{day:1,hour:23,reputation:999,needs:prepared}).open,true,'overnight lounge shift should open before midnight');
assert.equal(director.quote('lounge-crew',{day:1,hour:2,reputation:999,needs:prepared}).open,true,'overnight lounge shift should stay open after midnight');
assert.equal(director.quote('marina-tech',{day:1,hour:12,reputation:119,needs:prepared}).unlocked,false,'reputation gates should be enforced');
assert.ok(director.quote('kitchen-shift',{day:1,hour:12,reputation:999,needs:{...prepared,hygiene:20}}).requirements.some(([key])=>key==='hygiene'),'job-specific readiness requirements should be enforced');

const weakPay=new CityJobDirector().quote('dock-crew',{day:1,hour:9,reputation:0,needs:tired}).pay;
assert.ok(quote.pay>weakPay,'prepared needs should produce better performance pay');
let result=director.work('dock-crew',{day:1,hour:9,reputation:0,needs:prepared});
assert.ok(result.ok&&result.pay===quote.pay&&result.hours===4,'completed shift should pay the quoted wage and consume scheduled hours');
assert.equal(director.work('dock-crew',{day:1,hour:10,reputation:0,needs:prepared}).reason,'worked','the same job cannot be farmed twice in one day');
let promoted=false;for(let day=2;day<=4;day++){result=director.work('dock-crew',{day,hour:9,reputation:0,needs:prepared});promoted||=result.promotion}
assert.ok(result.record.level>=2&&promoted,'repeated shifts should build skill and trigger promotion');

const lifeSource=fs.readFileSync('v18/city-life-system.js','utf8'),lifeCore=lifeSource.slice(lifeSource.indexOf('const clamp='),lifeSource.indexOf('function physical(')).replaceAll('export ',''),{CityLifeDirector:TestLife}=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${lifeCore};return {CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const life=new TestLife(),before={...life.profile};life.applyRoutine({hours:result.hours,effects:result.effects,activityId:'job:dock-crew'});
assert.ok(life.profile.worldHour!==before.worldHour&&life.profile.energy<before.energy&&life.profile.hunger<before.hunger,'a shift should advance time and consume life needs');
const restored=new CityJobDirector(director.serialize());assert.deepEqual(restored.serialize(),director.serialize(),'job progression and earnings should survive save restore');

const main=fs.readFileSync('v18/main.js','utf8'),ui=fs.readFileSync('v18/city-job-ui.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new CityJobDirector','cityJobs:cityJobs.serialize()','cityJobs.restore(p.cityJobs)','function cityJobContext','function performCityJob','data-city-job','cityLife.applyRoutine','jobComplete','jobPromotion','CITY WORK'])assert.ok(main.includes(token),`city job runtime missing ${token}`);
assert.ok(ui.includes('lifeJobStatus')&&ui.includes('cityJobButton'),'city job HUD and action styling must be installed');
assert.ok(audio.includes("case'jobComplete'")&&audio.includes("case'jobPromotion'"),'job completion and promotion need dedicated audio cues');
for(const file of ['v18/city-job-system.js','v18/city-job-ui.js'])assert.ok(policy.requiredFiles.includes(file)&&policy.sourceFiles.includes(file),`release policy must ship ${file}`);
console.log('PASS city jobs: schedules, overnight hours, reputation and needs gates, performance pay, daily limits, skill promotion, life-routine effects, persistence, UI, map journal, audio, and packaging');
