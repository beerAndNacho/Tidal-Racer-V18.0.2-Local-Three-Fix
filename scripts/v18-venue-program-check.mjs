import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const lifeSource=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
const core=lifeSource.slice(lifeSource.indexOf('const clamp='),lifeSource.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_DOCK,CITY_FACILITIES,CITY_VENUE_PROGRAMS,cityVenueProgram,cityVenueActionQuote,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const {CITY_DOCK,CITY_FACILITIES,CITY_VENUE_PROGRAMS,cityVenueProgram,cityVenueActionQuote,CityLifeDirector}=runtime;

assert.deepEqual(Object.keys(CITY_VENUE_PROGRAMS),['grocery','restaurant','nightlife','gym'],'four repeat-visit venues should have daily programs');
assert.ok(Object.values(CITY_VENUE_PROGRAMS).every(programs=>programs.length===3),'each programmed venue needs a three-day rotation');
assert.equal(cityVenueProgram('restaurant',1).id,'sunrise-breakfast');
assert.equal(cityVenueProgram('restaurant',2).id,'catch-of-the-day');
assert.equal(cityVenueProgram('restaurant',3).id,'chef-table-night');
assert.equal(cityVenueProgram('restaurant',5).id,'catch-of-the-day','program rotation must repeat deterministically');
assert.equal(cityVenueProgram('home',2),null,'non-commercial home routine must not receive artificial discounts');

const restaurant=CITY_FACILITIES.find(item=>item.id==='restaurant'),seafood=restaurant.actions.find(item=>item.id==='seafood_bowl'),featured=cityVenueActionQuote('restaurant',seafood,2);
assert.ok(featured.featured&&featured.item.cost===660&&featured.savings===120,'catch-of-the-day should apply a rounded authored discount');
assert.ok(featured.item.effects.hunger>seafood.effects.hunger&&featured.item.effects.energy>seafood.effects.energy,'featured positive effects should strengthen');
const ordinary=cityVenueActionQuote('restaurant',seafood,1);
assert.ok(!ordinary.featured&&ordinary.item.cost===780&&ordinary.savings===0,'non-featured menu prices must remain stable');

const nightlife=CITY_FACILITIES.find(item=>item.id==='nightlife'),dance=nightlife.actions.find(item=>item.id==='dance'),danceNight=cityVenueActionQuote('nightlife',dance,2);
assert.ok(danceNight.item.effects.mood>dance.effects.mood,'daily nightlife program should strengthen its positive mood effect');
assert.equal(danceNight.item.effects.energy,dance.effects.energy,'program must not amplify negative fatigue costs');

const director=new CityLifeDirector();director.profile.day=2;director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});assert.equal(director.enter('restaurant').ok,true);
const result=director.perform('seafood_bowl',1000);
assert.ok(result.ok&&result.featuredProgram&&result.venueProgram.id==='catch-of-the-day','runtime purchase must report the active featured program');
assert.equal(result.wallet,340);assert.equal(result.standardCost,780);assert.equal(result.savings,120);
assert.equal(result.action.cost,660,'routine receipt must use the discounted price');

for(const token of ['function venueProgramCard','data-venue-program','featuredProgram','TODAY ','dataset.venueProgram','programMeta'])assert.ok(main.includes(token),'venue program integration missing '+token);
for(const token of ['venueProgramCard','featuredProgram','FEATURED'])assert.ok(index.includes(token)||main.includes(token),'venue program presentation missing '+token);
console.log('PASS venue programs: four venues, three-day deterministic rotation, rounded discounts, positive-only effect boosts, ordinary-price stability, runtime quote, wallet charge, receipt savings, panel highlight, and telemetry');
