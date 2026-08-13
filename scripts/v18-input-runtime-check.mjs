import fs from 'node:fs';

const main=fs.readFileSync('v18/main.js','utf8');
const tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
const cameraBlock=main.slice(main.indexOf('function updateCamera()'),main.indexOf('function drawMap()'));
const worldBlock=main.slice(main.indexOf('function updateWorld(dt)'),main.indexOf("$('#startBtn').onclick"));

add('all four arrow keys mapped',[
  "ArrowUp:'up'","ArrowDown:'down'","ArrowLeft:'left'","ArrowRight:'right'",
].every(token=>main.includes(token)));
add('keyboard listeners run in capture phase',main.includes("addEventListener('keydown'")&&main.includes('},true);')&&main.includes("addEventListener('keyup'"));
add('control events prevent browser scrolling',main.includes('event.preventDefault()'));
add('game canvas is keyboard focusable',main.includes('renderer.domElement.tabIndex=0'));
add('start transfers focus to game canvas',main.includes("requestAnimationFrame(()=>renderer.domElement.focus({preventScroll:true}))"));
add('input diagnostics exposed',main.includes('dataset.lastControl')&&main.includes('dataset.inputEvents'));
add('camera has no out-of-scope sea reference',!cameraBlock.includes('updateMarineLife')&&!cameraBlock.includes(',sea,'));
add('marine update uses scoped sea value',worldBlock.includes("const storm=STATE.event?.name==='STORM CELL',sea=currentSeaState()")&&worldBlock.includes('updateMarineLife(STATE.time,px,pz,sea,speedN)'));
add('runtime exposes merged keyboard and gamepad state',main.includes('get controls(){return {...liveControls')&&main.includes('keyboard:{...keys}'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 input/runtime checks PASS`);process.exit(failed?1:0);
