import fs from 'node:fs';

const citizens=fs.readFileSync('v18/city-population-system.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),rider=fs.readFileSync('v16/character-system.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
add('citizen eyes have whites and colored irises',citizens.includes('eyeWhite=material(0xf0eee8)')&&citizens.includes('citizen-eye-left')&&citizens.includes('citizen-iris-'));
add('citizens have animated brows and separate lips',citizens.includes('citizen-brow-')&&citizens.includes('citizen-upper-lip')&&citizens.includes('citizen-lower-lip')&&citizens.includes('visual.face.lowerLip.position.y'));
add('citizen blinks are staggered and brief',citizens.includes('agent.index*1.731')&&citizens.includes('),34)')&&citizens.includes('1-blink*.94'));
add('citizen pupils follow nearby player gaze',citizens.includes('gaze=clamp(agent.lookYaw/8')&&citizens.includes('irisNode.position.x=irisNode.userData.baseX+gaze'));
add('talking faces move mouth and eyebrows',citizens.includes('speech=talking?Math.abs(Math.sin')&&citizens.includes('talking?.045')&&citizens.includes('citizenTalkingFaces'));
add('rain shelter state adds a squint',citizens.includes('squint=sheltering?.22')&&citizens.includes('1-blink*.92-squint'));
add('face details do not cast tiny expensive shadows',citizens.includes("node.castShadow=!/citizen-(?:eye|iris|brow|nose|upper-lip|lower-lip)/"));
add('on-foot avatar discovers neck and head bones',life.includes("'spine','chest','neck','head'")&&life.includes('bones.head'));
add('on-foot avatar adds dynamic eyelids to authored face',life.includes('foot-eyelid-')&&life.includes("root.getObjectByName('head-anatomy')")&&life.includes('eyelids.length===2'));
add('on-foot head gaze and blink animate',life.includes("if(name==='head')")&&life.includes('const blink=Math.pow')&&life.includes('lid.scale.y=.08+blink*.86'));
add('mounted procedural rider retains facial animation',rider.includes('rig.face.eyes.length')&&rider.includes('rig.face.mouth')&&rider.includes('rig.face.brows'));
add('facial runtime telemetry exposed',citizens.includes('dataset.citizenFacialActors')&&citizens.includes('dataset.citizenBlinking')&&life.includes('dataset.footFacialRig')&&life.includes('dataset.footBlink'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 character expression checks PASS`);process.exit(failed?1:0);
