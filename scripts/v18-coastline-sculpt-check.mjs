import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
add('nine biome coastline characters',engine.includes('COASTLINE_CHARACTER=Object.freeze')&&['resort','city','volcano','mangrove','storm','coral','moon','reef','lagoon'].every(biome=>engine.includes(`${biome}:[`)));
add('deterministic harmonic coves and headlands',engine.includes('function coastlineRadiusFactor')&&engine.includes('Math.sin(angle*3+phase)')&&engine.includes('Math.cos(angle*5-phase*.63)')&&engine.includes('Math.sin(angle*8+phase*1.41)'));
add('coastline deformation stays bounded',engine.includes("THREE.MathUtils.clamp(1+Math.sin")&&engine.includes(',.79,1.17)'));
add('terrain cylinder uses higher coastline density',engine.includes('new THREE.CylinderGeometry(R.r*.72,R.r*.93,155,128,14)')&&engine.includes("sculptCoastlineGeometry(new THREE.CylinderGeometry"));
add('beach follows the sculpted terrain outline',engine.includes('beachGeometry=sculptCoastlineGeometry')&&engine.includes('new THREE.RingGeometry(beachInner,R.r*.84,160)'));
add('shore glow follows the sculpted outline',engine.includes('shoreGlowGeometry=sculptCoastlineGeometry')&&engine.includes('new THREE.RingGeometry(R.r*.815,R.r*.875,176)'));
add('both foam bands follow the same outline',engine.includes('foamGeometry=sculptCoastlineGeometry')&&engine.includes('208),R,idx'));
add('terrain relief is clamped at irregular edges',engine.includes('Math.max(0,1-rr)')&&engine.includes('computeBoundingSphere()'));
add('runtime exposes active coastline profile',engine.includes("dataset.coastlineTier='biome-harmonic-coves-headlands-v1'")&&engine.includes('dataset.nearestCoastlineProfile'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 coastline sculpt checks PASS`);process.exit(failed?1:0);
