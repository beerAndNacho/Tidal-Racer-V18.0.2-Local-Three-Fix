import fs from 'node:fs';

const main=fs.readFileSync('v18/main.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
add('hooked target reuses species specimen geometry',main.includes('function fishingTargetFor(species)')&&main.includes('const source=buildCatchSpecimen(species),target=source.clone(true)'));
add('per-species targets are cached',main.includes('fishingTargetCache=new Map()')&&main.includes('fishingTargetCache.has(species.id)')&&main.includes('fishingTargetCache.set(species.id,target)'));
add('bite and hooked phases reveal the target',main.includes("['bite','hooked'].includes(snapshot.phase)")&&main.includes('activeFishingTarget.visible=true'));
add('target follows the line endpoint and live waves',main.includes('surface=waveHeight(end.x,end.z,STATE.time,currentSeaState())')&&main.includes('activeFishingTarget.position.set(end.x,surface-depth+breachHeight,end.z)'));
add('fish direction responds to fight direction',main.includes('targetDirection=f.clone().addScaledVector(right,(snapshot.direction||0)*.58)')&&main.includes('activeFishingTarget.rotation.y=Math.atan2'));
add('fight target animates tail, wings and serpent body',main.includes('data.tail.rotation.y=Math.sin')&&main.includes('data.wings.forEach')&&main.includes('data.segments.forEach'));
add('jump species breach when fought near the craft',main.includes("jumping=['jump','acrobat'].includes(targetSpecies.behavior)")&&main.includes('snapshot.distance<17')&&main.includes('breachHeight=breaching?'));
add('breach splash is surface-locked',main.includes("hookedFishSplash.name='hooked-fish-breach-splash'")&&main.includes('hookedFishSplash.position.set(end.x,surface+.04,end.z)'));
add('fight target browser diagnostics',main.includes('dataset.fishingTargetVisual')&&main.includes('dataset.fishingTargetBehavior')&&main.includes('dataset.fishingTargetBreach'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 fishing target visual checks PASS`);process.exit(failed?1:0);
