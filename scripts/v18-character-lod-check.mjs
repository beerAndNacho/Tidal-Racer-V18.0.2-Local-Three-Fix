import fs from 'node:fs';

const character=fs.readFileSync('v16/character-system.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('hero neoprene has wet cloth response',character.includes('clearcoat:.34')&&character.includes('sheen:.24')&&character.includes("visualTier='procedural-pbr-v4-anatomical'"));
add('long sleeve forearms remove bare tube look',character.includes("'foreArm.'+key,.66*profile.build.arm,.122,suit,detail"));
add('hero has anatomical joint volumes',['deltoid.','elbowVolume.','kneeVolume.','shinGuard.'].every(name=>character.includes(name)));
add('hero has sealed collar and shoulder yoke',character.includes("'sealedCollar'")&&character.includes("'shoulderYoke'"));
add('hero hands use runtime grip contact solver',character.includes('function solveGripContact')&&character.includes("hand.parent.worldToLocal(target)")&&character.includes("menu?.22:.38"));
add('distant rival proxy is purpose built',engine.includes('function buildDistantCraftProxy')&&engine.includes("proxy.name='LOD2-distant-rider'"));
add('LOD2 retains rider and craft silhouette',['lod2Hull','lod2Torso','lod2Vest','lod2Helmet','lod2ArmL','lod2LegL'].every(name=>engine.includes(name)));
add('rival LOD uses hysteresis',engine.includes("previous==='LOD2'?125:155")&&engine.includes("far?'LOD2':'LOD1'"));
add('distant proxy has cheap animation',engine.includes('if(proxy?.visible)')&&engine.includes('rider.rotation.z=THREE.MathUtils.lerp'));
add('race loop updates LOD from player distance and importance',main.includes('const distance=a.o.position.distanceTo(player.position)')&&main.includes('updateCraftLod(a.o,distance+lodBias)'));
add('runtime exposes rider LOD counts',main.includes('document.body.dataset.riderLods='));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 character LOD checks PASS`);process.exit(failed?1:0);
