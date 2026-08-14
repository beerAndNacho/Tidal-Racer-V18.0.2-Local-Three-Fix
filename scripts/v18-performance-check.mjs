import fs from 'node:fs';
import { PerformanceGovernor } from '../v18/performance-governor.js';

const main=fs.readFileSync('v18/main.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
const renderer={ratio:1,size:[],info:{autoReset:true,render:{calls:420,triangles:780000}},setPixelRatio(value){this.ratio=value},setSize(w,h){this.size=[w,h]}};
const composer={ratio:1,size:[],setPixelRatio(value){this.ratio=value},setSize(w,h){this.size=[w,h]}};
const governor=new PerformanceGovernor({renderer,composer,basePixelRatio:2,targetFps:55});
for(let i=0;i<230;i++)governor.sample(1/30,true);
add('sustained low FPS downshifts resolution',governor.scale<1&&renderer.ratio<2&&governor.adjustments>0);
const lowScale=governor.scale;renderer.info.render.calls=260;renderer.info.render.triangles=420000;for(let i=0;i<1500;i++)governor.sample(1/72,true);
add('sustained headroom restores resolution',governor.scale>lowScale);
add('balanced floor protects legibility',governor.minScale===.66);
governor.setQuality('ultra');add('ultra floor remains higher',governor.minScale===.78);
renderer.info.render.calls=6200;for(let i=0;i<260;i++)governor.sample(1/60,true);add('geometry budget triggers downshift',governor.snapshot().reason==='geometry-budget'||governor.scale<1);
add('whole-frame renderer statistics enabled',renderer.info.autoReset===false&&main.includes('renderer.info.reset();composer.render();capturePhotoFrame();performanceGovernor.sample(rawDt,STATE.started&&!STATE.paused)'));
add('quality and resize integration',main.includes('performanceGovernor.setQuality(STATE.quality)')&&main.includes('performanceGovernor.resize()'));
add('runtime diagnostics exposed',main.includes('get performance(){return performanceGovernor.snapshot()}'));
add('scene complexity diagnostics exposed',main.includes('get scene(){return sceneDiagnostics()}')&&engine.includes('export function sceneDiagnostics()'));
add('region detail LOD protects draw-call budget',engine.includes("detailRoot.name='region-detail'")&&engine.includes('detailRoot.visible=distance<1350'));
add('static facade parts are GPU batched',engine.includes("mergeGeometries")&&engine.includes("batchStaticMeshes(buildingRoot,'facade-batch')"));
add('balanced water reflections are frame paced',engine.includes("waterReflectionInterval=quality==='ultra'?1:2")&&engine.includes('nativeWaterBeforeRender'));
add('dynamic local shadow budget',engine.includes("document.body.dataset.shadowFocus='dynamic-640m-v2'"));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 performance checks PASS`);process.exit(failed?1:0);
