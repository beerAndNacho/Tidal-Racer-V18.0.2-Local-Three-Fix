import fs from 'node:fs';

const generator=fs.readFileSync('scripts/generate-rider-glbs.mjs','utf8'),provenance=JSON.parse(fs.readFileSync('assets/glb/riders/provenance.json','utf8')),manifest=JSON.parse(fs.readFileSync('assets/manifest.json','utf8')),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('generator identifies anatomical wet-gear V3 authoring pass',generator.includes('original character atelier v3 anatomical wet-gear pass'));
add('materials include wet neoprene physical response',generator.includes('wet_neoprene_panels')&&generator.includes('sheenRoughness')&&generator.includes('specularIntensity'));
add('torso transitions include glute, lumbar, trapezius and clavicle volumes',['glute-transition-','lumbar-transition','trapezius-bridge','clavicle-'].every(signal=>generator.includes(signal)));
add('life vest includes functional webbing, buckles and back protector',['vest-webbing-','vest-buckle-','vest-back-protector'].every(signal=>generator.includes(signal)));
add('face includes eye whites, irises, catchlights and lips',['eye_white','iris-','eye-catchlight-','upper-lip','lower-lip'].every(signal=>generator.includes(signal)));
add('hands and boots include finger, thumb, ankle and toe geometry',['glove-finger-','glove-thumb-','ankle-cuff-','boot-toe-cap-'].every(signal=>generator.includes(signal)));
add('provenance records V3 pass for all sixteen riders',provenance.version===2&&provenance.authoringPass==='anatomical wet-gear v3'&&provenance.files.length===16);
add('manifest publishes V5 authored fallback metadata',manifest.characterRig.fallback==='v18 project-authored anatomical wet-gear v5 articulated rig');

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 authored rider V3 checks PASS`);process.exit(failed?1:0);
