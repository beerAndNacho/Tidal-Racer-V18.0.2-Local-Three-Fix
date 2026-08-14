import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CITY_DOCK,CityLifeDirector}=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',core+';return {CITY_DOCK,CityLifeDirector};')(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const atHome=hour=>{const director=new CityLifeDirector();director.profile.worldHour=hour;director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});assert.equal(director.enter('home').ok,true);return director};

const morning=atHome(15.5),beforeHunger=morning.profile.hunger,result=morning.waitAtHome('morning',1234);
assert.ok(result.ok,'morning wait must work at home');assert.equal(result.action.hours,15.5,'morning wait must calculate real elapsed hours');assert.equal(result.profile.worldHour,7);assert.equal(result.profile.day,2,'morning wait must roll to the next day');assert.equal(result.wallet,1234,'waiting must not charge the wallet');assert.ok(result.profile.hunger<beforeHunger,'waiting must simulate hunger');
const evening=atHome(23),eveningResult=evening.waitAtHome('evening');assert.equal(eveningResult.action.hours,19);assert.equal(eveningResult.profile.worldHour,18);assert.equal(eveningResult.profile.day,2,'evening wait must cross midnight');
const oneHour=atHome(10),oneHourResult=oneHour.waitAtHome('hour');assert.equal(oneHourResult.action.hours,1);assert.equal(oneHourResult.profile.worldHour,11);assert.equal(oneHour.profile.activities.wait_hour,1,'wait usage must persist in life activities');
const street=new CityLifeDirector();assert.equal(street.waitAtHome('hour').reason,'home','time skipping must be restricted to the apartment interior');

const lateSleep=atHome(23),lateResult=lateSleep.perform('sleep');assert.equal(lateResult.action.hours,8);assert.equal(lateResult.profile.worldHour,7);assert.equal(lateResult.profile.day,2);
const earlySleep=atHome(2),earlyResult=earlySleep.perform('sleep');assert.equal(earlyResult.action.hours,5,'02:00 sleep must reach the upcoming 07:00 rather than add a fixed eight hours');assert.equal(earlyResult.profile.worldHour,7);assert.equal(earlyResult.profile.day,1);

for(const token of ["waitAtHome(mode='hour'",'targets={morning:7,evening:18}',"actionId==='sleep'?((7-this.profile.worldHour+24)%24||24)"])assert.ok(life.includes(token),'home time runtime missing '+token);
for(const token of ['homeWaitCard','data-life-wait','performHomeWait','wait_morning','wait_evening'])assert.ok(main.includes(token),'home wait integration missing '+token);
assert.ok(index.includes('homeWaitSection')&&index.includes('grid-template-columns:repeat(3,1fr)'),'home wait UI must expose responsive controls');
console.log('PASS home time: one-hour rest, morning/evening targets, midnight rollover, needs and wallet rules, saved usage, home-only safety, and accurate upcoming-07:00 sleep');
