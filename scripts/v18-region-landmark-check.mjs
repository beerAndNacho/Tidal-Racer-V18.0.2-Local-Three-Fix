import fs from 'node:fs';
import { REGIONS } from '../data-v12.js';

const engine=fs.readFileSync('v18/engine.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
add('all nine regions remain defined',REGIONS.length===9&&new Set(REGIONS.map(region=>region.biome)).size===9);
add('separate distant landmark root',engine.includes('function addRegionalIdentityLandmarks')&&engine.includes("landmarkRoot.name=`regional-identity-${R.biome}`")&&engine.includes('group.userData.landmarkRoot=landmarkRoot'));
add('Golden Coast sail silhouette',engine.includes('sail-hotel-and-beacon')&&engine.includes('resort-sail-tower')&&engine.includes('resort-sail-crown'));
add('Harbor City working skyline',engine.includes('container-crane-skyline')&&engine.includes('harbor-gantry-crane-')&&engine.includes('crane-jib'));
add('Volcano Bay caldera, lava and smoke',engine.includes('caldera-and-lava-scars')&&engine.includes('volcano-caldera')&&engine.includes('volcano-lava-scar')&&engine.includes('volcano-smoke-'));
add('Mangrove Delta giant rooted canopy',engine.includes('giant-root-canopy')&&engine.includes('mangrove-root-arch-')&&engine.includes('mangrove-giant-trunk'));
add('Storm Strait animated turbine array',engine.includes('storm-wind-array')&&engine.includes('storm-turbine-rotor')&&engine.includes("animator.type==='rotor'"));
add('Coral Expanse giant coral crown',engine.includes('giant-coral-crown')&&engine.includes('coral-spire-')&&engine.includes('coral-fan-'));
add('Moon Archipelago crescent gate',engine.includes('moon-gate-and-lantern-spire')&&engine.includes('moon-crescent-gate')&&engine.includes('moon-spire-lantern'));
add('Black Reef obsidian needle field',engine.includes('obsidian-needle-field')&&engine.includes('black-reef-needle-')&&engine.includes('black-reef-arch'));
add('Skywater Lagoon limestone waterfall gate',engine.includes('limestone-gate-waterfall')&&engine.includes('lagoon-stone-gate')&&engine.includes('lagoon-waterfall'));
add('landmarks stream to 3.2 km beyond detail props',engine.includes('landmarkRoot.visible=distance<3200')&&engine.includes('detailRoot.visible=distance<1350'));
add('runtime publishes region identity telemetry',engine.includes('dataset.regionalLandmarkTier')&&engine.includes('dataset.nearestRegionIdentity')&&engine.includes('dataset.visibleRegionalLandmarks')&&engine.includes('dataset.regionalLandmarkParts'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 regional landmark checks PASS`);process.exit(failed?1:0);
