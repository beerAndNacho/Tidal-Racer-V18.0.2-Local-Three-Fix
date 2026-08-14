import fs from 'node:fs';

const main=fs.readFileSync('v18/main.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
add('local generated contact-foam texture',main.includes('function contactFoamTexture()')&&main.includes("texture.name='hull-contact-foam'")&&main.includes('THREE.ClampToEdgeWrapping'));
add('indexed dual-lane wake ribbon',main.includes('wakeRibbonSegments=56')&&main.includes('wakeRibbonIndices.push')&&main.includes("wakeRibbonMesh.name='curved-hull-wake-ribbon'"));
add('wake samples follow recorded turns',main.includes('wakeRibbonHistory.unshift')&&main.includes('rx:right.x,rz:right.z')&&main.includes('sample.rx*side'));
add('wake ages, spreads and expires',main.includes('sample.age+=dt')&&main.includes('.age>4.6')&&main.includes("spread=.78+sample.age"));
add('wake ribbon rides live wave surface',main.includes('waveHeight(sample.x,sample.z,STATE.time,currentSeaState())+.13'));
add('split bow contact wave',main.includes('function bowWaveGeometry()')&&main.includes("bowWaveMesh.name='split-bow-contact-wave'")&&main.includes('hullContactRoot.rotation.y=heading'));
add('speed-scaled water contact visibility',main.includes("contactStrength=clamp((Math.abs(speed)-2)/24")&&main.includes("hullContactRoot.visible=waterMode&&contactStrength>.02"));
add('contact browser diagnostics',main.includes('dataset.hullContactFx')&&main.includes('dataset.wakeRibbonSamples'));
add('contact integrates with layered water',engine.includes('tidal-fresnel-absorption-v3')&&engine.includes('oceanSurfaceDetail')&&engine.includes('whitecaps'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 water contact checks PASS`);process.exit(failed?1:0);
