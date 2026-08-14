import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const lifeSource=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
const core=lifeSource.slice(lifeSource.indexOf('const clamp='),lifeSource.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_DOCK,CITY_PANTRY_CAPACITY,GROCERY_MEALS,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const {CITY_DOCK,CITY_PANTRY_CAPACITY,GROCERY_MEALS,CityLifeDirector}=runtime;
assert.equal(CITY_PANTRY_CAPACITY,18,'pantry capacity must be bounded');
assert.equal(GROCERY_MEALS,6,'a grocery trip should add six prepared servings');

const enter=(director,id)=>{director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});assert.equal(director.enter(id).ok,true);return director};
const empty=enter(new CityLifeDirector(),'home'),noMeal=empty.perform('home_meal',2000);
assert.equal(noMeal.reason,'pantry','home meal must require stocked groceries');
assert.equal(noMeal.wallet,2000,'failed cooking must not charge the wallet');

const shopper=enter(new CityLifeDirector(),'grocery'),stocked=shopper.perform('groceries',2000);
assert.ok(stocked.ok&&stocked.wallet===1320,'groceries must charge the authored 680 CR price');
assert.equal(stocked.profile.pantryMeals,6,'groceries must persist six servings');
assert.equal(stocked.pantryDelta,6,'purchase result must report pantry gain');

const restored=new CityLifeDirector(shopper.serialize());
assert.equal(restored.profile.pantryMeals,6,'pantry stock must round-trip through saves');
enter(restored,'home');const cooked=restored.perform('home_meal',stocked.wallet);
assert.ok(cooked.ok&&cooked.wallet===stocked.wallet,'home cooking must have no extra wallet charge');
assert.equal(cooked.profile.pantryMeals,5,'home cooking must consume one serving');
assert.equal(cooked.pantryDelta,-1,'cooking result must report pantry consumption');
assert.equal(cooked.lifestyleEffect?.id,'home-nourished','home cooking must retain its lifestyle preparation bonus');

const full=enter(new CityLifeDirector(),'grocery');full.profile.pantryMeals=12;
const lastSpace=full.perform('groceries',5000),blocked=full.perform('groceries',lastSpace.wallet);
assert.equal(lastSpace.profile.pantryMeals,18,'one pack should fill exactly six free slots');
assert.equal(blocked.reason,'pantry-space','full pantry must reject another purchase before charging');
assert.equal(blocked.wallet,lastSpace.wallet,'rejected restock must preserve wallet balance');
assert.equal(new CityLifeDirector({profile:{pantryMeals:99}}).profile.pantryMeals,18,'restored pantry stock must clamp to capacity');

for(const token of ['function pantryStatusCard','data-pantry=','+6 PANTRY','PANTRY EMPTY','dataset.pantryMeals','result.pantryDelta'])assert.ok(main.includes(token),'pantry UI integration missing '+token);
for(const token of ['id="lifePantryStatus"','lifePantryCard','HOME PANTRY'])assert.ok(index.includes(token),'pantry presentation missing '+token);
console.log('PASS pantry economy: grocery price, six-meal stock, home consumption, no double charge, bounded capacity, failed-action safety, save restore, lifestyle bonus, UI, sequence feedback, and telemetry');
