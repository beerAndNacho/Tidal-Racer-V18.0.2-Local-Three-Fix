import fs from 'node:fs';
import { FISH_SPECIES } from '../v18/fishing-system.js';

const main=fs.readFileSync('v18/main.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
add('catch display builds from landed species',main.includes('function buildCatchSpecimen(species)')&&main.includes('activeCatchSpecimen=buildCatchSpecimen(species)'));
add('all 27 species share the authored data source',FISH_SPECIES.length===27&&main.includes('const [width,height,length]=species.body')&&main.includes('color:species.color'));
add('species specimen cache prevents repeated mesh construction',main.includes('catchSpecimenCache=new Map()')&&main.includes('catchSpecimenCache.has(species.id)')&&main.includes('catchSpecimenCache.set(species.id,specimen)'));
add('shark and billfish landing anatomy',main.includes('catchSharkSnout')&&main.includes('catchSharkGill-')&&main.includes('catchBillfishRostrum'));
add('ray and serpent landing anatomy',main.includes('catchRayWing-')&&main.includes('catchRayWhipTail')&&main.includes('catchSerpentSegment-'));
add('reef, tuna and luminous landing anatomy',main.includes('catchGrouperJaw')&&main.includes('catchParrotfishBeak')&&main.includes('catchTunaFinlet-')&&main.includes('catchPhotophore-'));
add('weight scales the landed specimen',main.includes('sizeByWeight=clamp(.82+Math.log10(1+weight)*.18')&&main.includes('lengthScale=Math.min(1.12'));
add('landed specimens remain animated',main.includes('data.tail.rotation.y=wriggle')&&main.includes('data.wings.forEach')&&main.includes('data.segments.forEach'));
add('rarity accent light and browser diagnostics',main.includes('catchAccentLight.color.set(species.accent)')&&main.includes('dataset.catchSpeciesVisual')&&main.includes('dataset.catchMorphology'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 catch presentation checks PASS`);process.exit(failed?1:0);
