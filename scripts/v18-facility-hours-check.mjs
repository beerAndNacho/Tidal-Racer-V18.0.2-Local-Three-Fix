import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CITY_FACILITIES,CITY_FACILITY_HOURS,CityLifeDirector,facilityOperatingStatus}=new Function(`${core};return {CITY_FACILITIES,CITY_FACILITY_HOURS,CityLifeDirector,facilityOperatingStatus};`)();

assert.equal(Object.keys(CITY_FACILITY_HOURS).length,9,'all nine city facilities need an operating schedule');
for(const id of ['home','harbor-office'])assert.equal(facilityOperatingStatus(id,3).open,true,`${id} must remain available around the clock`);
assert.equal(facilityOperatingStatus('nightlife',23).open,true,'overnight lounge must open before midnight');
assert.equal(facilityOperatingStatus('nightlife',2).open,true,'overnight lounge must remain open after midnight');
assert.equal(facilityOperatingStatus('nightlife',12).open,false,'overnight lounge must close during daytime');
assert.equal(facilityOperatingStatus('bank',12).open,true,'bank must open during daytime');
const closedBank=facilityOperatingStatus('bank',3);
assert.equal(closedBank.open,false,'bank must close overnight');
assert.equal(closedBank.nextOpenHours,5,'closed status must calculate time until opening across midnight');

const director=new CityLifeDirector();director.mode='foot';director.profile.worldHour=3;
const bank=CITY_FACILITIES.find(facility=>facility.id==='bank');
const closedContext=director.contextAt(bank.exterior);
assert.equal(closedContext.kind,'closed','a closed exterior door must expose a closed interaction');
const rejected=director.enter('bank');
assert.equal(rejected.reason,'closed','direct entry must also reject a closed venue');
director.profile.worldHour=12;
assert.equal(director.contextAt(bank.exterior).kind,'enter','the same door must become enterable during operating hours');
assert.equal(director.enter('bank').ok,true,'open venue entry must keep working');

for(const [id,hour] of [['marina-workshop',15.5],['restaurant',12],['nightlife',20],['bank',12],['fish-market',12]])assert.equal(facilityOperatingStatus(id,hour).open,true,`${id} must remain available at its authored story-safe hour`);

const main=fs.readFileSync('v18/main.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['CITY_FACILITY_HOURS','facilityOperatingStatus','storefrontLight.intensity=status.open','storefrontSign.material.color.setScalar','storefrontGlass.material.emissiveIntensity','dataset.facilityOpenCount'])assert.ok(life.includes(token),`facility world runtime missing ${token}`);
for(const token of ["context.kind==='closed'",'CLOSED · OPEN ${formatLifeHour(context.status.opens)}','dataset.facilityDoorState','hour:cityLife.profile.worldHour'])assert.ok(main.includes(token),`facility interaction runtime missing ${token}`);
assert.ok(policy.requiredFiles.includes('v18/city-life-system.js')&&policy.sourceFiles.includes('v18/city-life-system.js'),'city venue schedule runtime must remain release-required source');
console.log('PASS facility hours: nine schedules, overnight wrap, story-safe access, closed-door rejection and guidance, time-reactive portal, sign, window, and storefront lighting');
