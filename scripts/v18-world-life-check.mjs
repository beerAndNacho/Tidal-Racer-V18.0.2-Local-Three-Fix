import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8');
const tests=[],add=(name,ok)=>tests.push({name,ok:!!ok});

add('16 bidirectional coastal cars',engine.includes('for(let i=0;i<16;i++)')&&engine.includes('ambientRoadVehicles.push(car)')&&engine.includes('direction=i%2?1:-1'));
add('detailed car construction',engine.includes("'carBody'")&&engine.includes("'carCabin'")&&engine.includes("'headlamp'")&&engine.includes('trafficWheelGeometry'));
add('ten civilian watercraft',engine.includes('for(let i=0;i<10;i++)addAmbientBoat')&&engine.includes('ambientBoats.push(boat)'));
add('wave-following boats',engine.includes('surface=waveHeight(x,z,time,seaState)')&&engine.includes('boat.rotation.z=Math.sin'));
add('traffic world diagnostic',engine.includes('document.body.dataset.ambientTraffic'));
add('eighteen animated promenade pedestrians',engine.includes('for(let i=0;i<18;i++)')&&engine.includes('ambientPedestrians.push(person)')&&engine.includes('d.limbs.legs[0].rotation.x=stride'));
add('pedestrian world diagnostic',engine.includes('document.body.dataset.ambientPedestrians'));
add('live traffic update export',engine.includes('export function updateAmbientTraffic')&&main.includes('updateAmbientTraffic(STATE.time,dt,sea)'));
add('cleaner race guide proportions',engine.includes('CylinderGeometry(.28,.46,2.5,14)')&&engine.includes('guideDummy.position.y=.82'));
add('reduced reflection distortion',engine.includes('distortionScale:1.05')&&engine.includes('.96+speedN*.45'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 living-world checks PASS`);process.exit(failed?1:0);
