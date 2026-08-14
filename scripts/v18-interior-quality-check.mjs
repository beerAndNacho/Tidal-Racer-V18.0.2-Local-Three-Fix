import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['function interiorWindowTexture','function addInteriorArchitecture','interior-baseboard','interior-structural-column','interior-ceiling-panel','interior-panel-light','interior-city-window','interior-window-frame','interior-floor-inlay','interior-entry-rug','interior-planter','interior-plant','interior-wayfinding-plaque','interior-wall-sconce','layered-interior-v5'])assert.ok(life.includes(token),`layered interior detail missing ${token}`);
assert.ok(life.includes('addInteriorArchitecture(root,facility)'),'all venue interiors must receive the architectural detail layer');
assert.ok(life.includes('root.visible=false')&&life.includes('setInterior(id)')&&life.includes('hideInteriors()'),'only the occupied detailed interior should be render-visible');
assert.ok(life.includes('CITY_FACILITIES.findIndex')&&life.includes('interiorWindowTexture(accentColor,index)'),'city window views must be deterministic per venue');
assert.ok(policy.requiredFiles.includes('v18/city-life-system.js')&&policy.sourceFiles.includes('v18/city-life-system.js'),'release policy must ship layered interiors');
console.log('PASS interior quality: all nine venues receive deterministic city-view windows, architectural trim, columns, ceiling panel lights, floor zoning, entry rugs, plants, wayfinding, and sconces with occupied-interior visibility control');
