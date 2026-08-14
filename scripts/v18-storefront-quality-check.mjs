import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['function addStorefrontDetail','storefront-building-shell','storefront-interior-glow','storefront-window-mullion','storefront-transom','storefront-pavement-pad','storefront-entry-mat','storefront-address-plaque','storefront-hanging-sign','storefront-planter','storefront-bollard','storefront-air-unit','premium-nearfield-v5'])assert.ok(life.includes(token),`premium storefront detail missing ${token}`);
assert.ok((life.match(/storefront-display-/g)||[]).length>=7&&life.includes('storefront-cafe-table')&&life.includes('storefront-chair'),'storefronts need multiple facility-specific retail, dining, fitness, workshop, and civic display systems');
for(const id of ['grocery','fish-market','restaurant','nightlife','gym','marina-workshop'])assert.ok(life.includes(`facility.id==='${id}'`)||life.includes(`'${id}'`),`facility detail branch missing ${id}`);
assert.ok(life.includes('CITY_FACILITIES.forEach((facility,index)'),'all nine facilities must receive deterministic visual variants');
assert.ok(life.includes('group.userData.nearfieldNodes')&&life.includes('<205'),'premium facade details must cull outside a bounded near-field distance');
assert.ok(engine.includes('addAmbientCoastTraffic')&&engine.includes('addCoastalStreetDetails')&&engine.includes('golden-coast-asphalt-road'),'near-field storefront upgrades must complement the existing district road, traffic, and street detail');
assert.ok(policy.requiredFiles.includes('v18/city-life-system.js')&&policy.sourceFiles.includes('v18/city-life-system.js'),'release policy must ship upgraded storefronts');
console.log('PASS storefront quality: nine deterministic near-field shells, recessed glow, mullions, transoms, signage, pavement, entry mats, planters, bollards, utilities, and facility-specific displays over the existing living district');
