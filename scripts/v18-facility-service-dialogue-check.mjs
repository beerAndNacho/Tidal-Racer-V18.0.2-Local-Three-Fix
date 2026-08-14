import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',core+';return {CITY_DOCK,CITY_INTERIOR_PEOPLE,CITY_SERVICE_DIALOGUE,CityLifeDirector};')(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor),{CITY_DOCK,CITY_INTERIOR_PEOPLE,CITY_SERVICE_DIALOGUE,CityLifeDirector}=runtime;
const roles=new Set(Object.values(CITY_INTERIOR_PEOPLE).flat().map(person=>person.role));
assert.ok([...roles].every(role=>CITY_SERVICE_DIALOGUE[role]?.length),'missing service dialogue for one or more interior roles');
for(const [role,lines] of Object.entries(CITY_SERVICE_DIALOGUE))for(const line of lines)assert.ok(line.ko?.length>8&&line.en?.length>8,role+' needs complete bilingual advice');

const director=new CityLifeDirector();director.profile.worldHour=12;director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});assert.equal(director.enter('bank').ok,true,'bank service test must enter during business hours');
const firstView=director.servicePerson();assert.equal(firstView.actor.name,'Jun Perry','public venue should select its on-duty staff member');assert.equal(firstView.conversation,0,'new service conversation count must start at zero');
const first=director.talkService(),second=director.talkService();assert.ok(first.ok&&second.ok,'service conversation must be repeatable');assert.notDeepEqual(first.line,second.line,'multi-line staff advice must rotate');
const restored=new CityLifeDirector(director.serialize());restored.mode='interior';restored.facilityId='bank';assert.equal(restored.servicePerson().conversation,2,'service conversation count must persist through save data');assert.deepEqual(restored.talkService().line,first.line,'dialogue rotation must remain deterministic after restore');

for(const token of ['focusService(name,time','talking=focus?.name===actor.name','dataset.facilityServiceFocus'])assert.ok(life.includes(token),'service response animation missing '+token);
for(const token of ['facilityServiceCard','applyFacilityService','data-life-service-talk','cityLife.talkService()','cityLifeWorld.focusService','handleLifePanelNumberKey',"querySelectorAll('#lifeActionList [data-life-action]')","querySelector('[data-life-action]')?.focus"])assert.ok(main.includes(token),'service panel integration missing '+token);
for(const token of ['facilityServiceGreeting','data-facility-service-line','TALK AGAIN'])assert.ok(index.includes(token)||main.includes(token),'service presentation missing '+token);
console.log('PASS facility service dialogue: complete bilingual role coverage, named on-duty attendant, deterministic saved rotation, talk-again control, responsive gesture focus, and stable 1–4 action shortcuts');
