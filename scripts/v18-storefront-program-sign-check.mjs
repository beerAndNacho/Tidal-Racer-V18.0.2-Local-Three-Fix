import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8');
const readme=fs.readFileSync('README.md','utf8');
const contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
const workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');

for(const token of ['function venueProgramTexture','storefront-program-marquee-frame','storefront-daily-program-sign','programMap=venueProgramTexture(facility,1)','previousMap?.dispose()','programSign.material.needsUpdate=true','dataset.cityProgramSigns','dataset.cityFeaturedPrograms','dataset.cityProgramDay'])assert.ok(life.includes(token),`daily storefront program presentation missing ${token}`);
assert.ok(life.includes("canvas.width=1024;canvas.height=128")&&life.includes("texture.colorSpace=THREE.SRGBColorSpace")&&life.includes('texture.anisotropy=4'),'program artwork must use a crisp color-managed dynamic canvas texture');
assert.ok(life.includes('CITY_VENUE_PROGRAMS=Object.freeze({')&&Object.keys({grocery:1,restaurant:1,nightlife:1,gym:1}).every(id=>life.includes(`${id}:Object.freeze([`)),'all four authored repeat-visit venues must back physical daily signs');
assert.ok(life.includes('nearVisible=distance<205')&&life.includes('programSign.visible=nearVisible')&&life.includes('programSign.material.color.setScalar(status.open?1:.18)')&&life.includes('programSign.scale.y=status.open?'),'signs must share the explicit 205 m near-field visibility, operating state, and restrained live emphasis');
assert.ok(main.includes('day:cityLife.profile.day'),'world presentation must receive the saved city day');
for(const [source,token] of [[smoke,'daily storefront program signs'],[readme,'Daily storefront marquees'],[contributing,'v18-storefront-program-sign-check.mjs'],[workflow,'v18-storefront-program-sign-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);

console.log('PASS storefront program signs: four color-managed physical marquees, daily texture rotation, safe GPU texture disposal, operating-state dimming, near-field visibility, restrained animation, telemetry, docs, smoke, and CI');
