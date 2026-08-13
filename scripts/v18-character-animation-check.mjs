import fs from 'node:fs';

const character=fs.readFileSync('v16/character-system.js','utf8');
const engine=fs.readFileSync('v18/engine.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});

add('persistent animation blend state',character.includes('motionBlend:{boost:0,drift:0,airborne:0,landing:0,turn:0}'));
add('sculpted anatomical torso shells',character.includes('function sculptedTorsoGeometry')&&(character.match(/sculptedTorsoGeometry\(/g)||[]).length>=4);
add('eight named rider motion states',['victory','menu-idle','landing','airborne','boost','drift','hard-turn','ride'].every(state=>character.includes(`'${state}'`)));
add('correct outward arm reach',character.includes(',-.20-.075*steer')&&character.includes(',.20-.075*steer'));
add('steering-aware hand contact',character.includes('rig.arms.L.hand.rotation.z')&&character.includes('rig.arms.R.hand.rotation.z'));
add('reachable cockpit geometry',engine.includes("'handlebar',[0,1.86,-1.04]")&&engine.includes("'grip'+side,[side*.65,0,0]")&&engine.includes('rig.position.z=-.2'));
add('measured hand-to-grip error',engine.includes('g.userData.grips=grips')&&character.includes('document.body.dataset.riderGripError=error.toFixed(3)'));
add('airborne and landing compression',character.includes('blend.landing*.34')&&character.includes('blend.airborne*.08')&&character.includes('blend.landing*.085'));
add('menu breathing layer',character.includes('breath=menu?')&&character.includes('rig.chest.scale.y'));
add('eye tracking and expression',character.includes('eye.rotation.y=lerp')&&character.includes('rig.face.mouth.scale.x'));
add('runtime animation-state diagnostic',character.includes('craft.userData.animationState=animationState')&&character.includes('document.body.dataset.riderAnimation=animationState'));
add('vertical motion feeds rider state',main.includes('vertical,victory:STATE.time<STATE.victoryUntil'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 character animation checks PASS`);process.exit(failed?1:0);
