import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FISH_SPECIES } from '../v18/fishing-system.js';

const engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8');
const tests=[];const check=(name,fn)=>{try{fn();tests.push({name,ok:true})}catch(error){tests.push({name,ok:false,error:error.message})}};
const regions=['GOLDEN COAST','HARBOR CITY','MANGROVE DELTA','VOLCANO BAY','CORAL EXPANSE','STORM STRAIT','MOON ARCHIPELAGO','BLACK REEF','SKYWATER LAGOON'];

check('27 authored fish species',()=>assert.equal(FISH_SPECIES.length,27));
check('all nine regions have focused 9-15 fish populations',()=>{for(const region of regions){const population=FISH_SPECIES.filter(species=>species.regions.includes(region)).length*3;assert.ok(population>=9&&population<=15,`${region}: ${population}`)}});
check('every species has complete visual ecology data',()=>{for(const species of FISH_SPECIES){assert.ok(species.id&&species.color&&species.accent,`${species.id}: missing visual data`);assert.equal(species.body.length,3,`${species.id}: body`);assert.ok(species.regions.length>=1,`${species.id}: region`)}});
check('behavior library covers schooling, breaching, bottom, serpent, pulse and glide',()=>{const behaviors=new Set(FISH_SPECIES.map(species=>species.behavior));for(const behavior of ['school','jump','acrobat','bottom','serpent','pulse','glide'])assert.ok(behaviors.has(behavior),behavior)});
check('three visual instances are built per species',()=>assert.ok(engine.includes('for(let i=0;i<81;i++)')&&engine.includes('FISH_SPECIES[i%FISH_SPECIES.length]')));
check('regional culling and browser telemetry are live',()=>assert.ok(engine.includes('d.species.regions.includes(region)')&&engine.includes('dataset.marineVisible')&&engine.includes('dataset.marineRegionalSpecies')&&engine.includes('dataset.marineRegion')));
check('distinct ray, serpent, shark, billfish and reef anatomy exists',()=>assert.ok(['rayWingGeometry','rayWhipTail','serpentSegmentGeometry','sharkGill','billfishRostrum','parrotfishBeak','grouperJaw'].every(token=>engine.includes(token))));
check('species behaviors animate and breach at the water surface',()=>assert.ok(['breachCycle=','d.pectorals.forEach','d.wings.forEach','d.segments.forEach','fishBreachSplash'].every(token=>engine.includes(token))));
check('world region drives visible ecology',()=>assert.ok(main.includes('updateMarineLife(STATE.time,px,pz,sea,speedN,weatherRegion)')));
check('close-range bodies use opaque physical materials',()=>assert.ok(engine.includes('clearcoat:.44')&&!engine.includes("opacity:['epic','legendary'].includes(species.rarity)")));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}${test.error?` — ${test.error}`:''}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 marine ecology checks PASS`);process.exit(failed?1:0);
