import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('marine hull has spline chines and rub rails',engine.includes("function craftSplineTube")&&engine.includes("craftSplineTube(side,'chine')")&&engine.includes("craftSplineTube(side,'rubRail')"));
add('bow includes bumper and tow eye',engine.includes("'bowBumper'")&&engine.includes("'bowTowEye'"));
add('hero footwells have molded traction ribs',engine.includes("detail==='hero'")&&engine.includes('footwellRib'));
add('seat has piping and stitched seams',engine.includes('seatPiping')&&engine.includes('seatSeam'));
add('cockpit uses rounded console and live authored dash texture',engine.includes('function craftDashTexture')&&engine.includes("'dashScreen'")&&engine.includes('new RoundedBoxGeometry(1.04,.84,.72'));
add('cockpit has transmissive windshield',engine.includes("'windshield'")&&engine.includes('transmission:.34')&&engine.includes('clearcoatRoughness:.04'));
add('handlebars carry mirrors',engine.includes('mirrorStalk')&&engine.includes('mirrorHousing')&&engine.includes('mirrorGlass'));
add('craft carries navigation and bow lights',engine.includes('bowLamp')&&engine.includes('navLight'));
add('stern has sealed jet nozzle',engine.includes("'jetNozzleSeal'")&&engine.includes("'jetNozzle'"));
add('runtime publishes V5 craft visual tier',engine.includes("dataset.craftVisual='marine-craft-pbr-v5-sculpted-cockpit'"));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 craft visual checks PASS`);process.exit(failed?1:0);
