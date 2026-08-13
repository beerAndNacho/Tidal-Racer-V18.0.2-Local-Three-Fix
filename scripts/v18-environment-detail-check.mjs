import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('storefronts have authored ground-floor glazing',engine.includes('storefrontPanels')&&engine.includes("const door=new THREE.Mesh(new THREE.PlaneGeometry"));
add('Golden Coast has a V5 street-detail root',engine.includes("root.name='coastal-street-detail-v5'")&&engine.includes('addCoastalStreetDetails(group,centerX,roadZ)'));
add('quayside uses instanced bollards',engine.includes("bollards.name='quayside-bollards'")&&engine.includes('InstancedMesh(new THREE.CylinderGeometry(.18,.24,1.35,10)'));
add('road surface has drains and parking bays',engine.includes("drains.name='storm-drains'")&&engine.includes("parkingLines.name='parking-bay-lines'"));
add('road surface has physical repair variation',engine.includes("roadPatches.name='asphalt-repair-patches'")&&engine.includes("cracks.name='asphalt-crack-lines'"));
add('road furniture includes metal manholes',engine.includes("manholes.name='road-manhole-covers'")&&engine.includes('metalness:.58'));
add('road wetness uses clearcoat puddle instances',engine.includes("puddles.name='road-rain-puddles'")&&engine.includes('clearcoatRoughness:.04'));
add('two pedestrian crossings are instanced',engine.includes("crossings.name='pedestrian-crossings'")&&engine.includes('crossing<2')&&engine.includes('stripe<10'));
add('marina cafe furniture adds street life',engine.includes("tables.name='marina-cafe-tables'")&&engine.includes("umbrellas.name='marina-cafe-umbrellas'"));
add('street planters and shrubs are instanced',engine.includes("planters.name='street-planters'")&&engine.includes("shrubs.name='street-shrubs'"));
add('street furniture includes bins, hydrants and utility cabinets',["bins.name='street-litter-bins'","hydrants.name='street-fire-hydrants'","cabinets.name='street-utility-cabinets'"].every(signal=>engine.includes(signal)));
add('promenade has bike racks and road safety cones',engine.includes("racks.name='promenade-bike-racks'")&&engine.includes("cones.name='road-safety-cones'"));
add('Harbor City has intersecting PBR roads',engine.includes("root.name='harbor-city-infrastructure-v4'")&&engine.includes('eastWest')&&engine.includes('northSouth'));
add('Harbor City container yard is color-varied and instanced',engine.includes("containers.name='harbor-container-yard'")&&engine.includes('containers.setColorAt'));
add('Harbor City has three batched gantry cranes',engine.includes('for(let i=0;i<3;i++')&&engine.includes("batchStaticMeshes(crane,'harbor-crane-batch')"));
add('Mangrove Delta has boardwalks and aerial roots',engine.includes("root.name='mangrove-wetland-v4'")&&engine.includes("roots.name='mangrove-aerial-roots'"));
add('Coral Expanse has a colored landmark garden',engine.includes("root.name='coral-garden-v4'")&&engine.includes("corals.name='coral-landmark-field'"));
add('Moon Archipelago has stalls, canopies and emissive lanterns',engine.includes("root.name='moon-market-v4'")&&engine.includes("stalls.name='moon-market-stalls'")&&engine.includes("lanterns.name='moon-market-lanterns'"));
add('all new regional sets are connected to biome creation',['addHarborCityInfrastructure(detailRoot,R.r)','addMangroveWetland(detailRoot,R.r)','addCoralGarden(detailRoot,R.r)','addMoonMarket(detailRoot,R.r)'].every(signal=>engine.includes(signal)));
add('new dense fixtures use InstancedMesh draw-call control',(engine.match(/new THREE\.InstancedMesh/g)||[]).length>=19);
add('browser diagnostics identify every V4 environment tier',['streetDetail','harborDetail','mangroveDetail','coralDetail','moonDetail'].every(signal=>engine.includes(`dataset.${signal}`)));
add('camera grade preserves facade contrast',engine.includes("c=(c-.5)*(1.045+.042*uStrength)+.5")&&engine.includes('renderer.toneMappingExposure=0.86'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 environment detail checks PASS`);process.exit(failed?1:0);
