import fs from 'node:fs';
import crypto from 'node:crypto';

const engine=fs.readFileSync('v18/engine.js','utf8'),provenance=JSON.parse(fs.readFileSync('assets/textures/generated-provenance.json','utf8')),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)}),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
add('two V3 facade modules are registered',['facade-marina-mixed-use-v3.webp','facade-marina-service-v3.webp'].every(file=>engine.includes(file)));
add('generated texture provenance is project local',provenance.tool==='OpenAI built-in image generation'&&provenance.files.length===4);
for(const asset of provenance.files){const file=`assets/textures/${asset.file}`;add(`${asset.file} exists`,fs.existsSync(file));add(`${asset.file} hash matches`,fs.existsSync(file)&&sha(file)===asset.sha256);add(`${asset.file} records generation source`,/^exec-[a-f0-9-]+\.png$/.test(asset.source)&&asset.promptSummary.length>30)}
add('facade selection includes six authored variants',(engine.match(/facade-[a-z0-9-]+\.webp/g)||[]).length>=6);
add('photoreal V4 facade is loaded locally',engine.includes("facade-coastal-photoreal-v4.png")&&engine.includes('facadePhotoreal:localTexture'));
add('modern photoreal V4 facade breaks repetition',engine.includes("facade-harbor-modern-photoreal-v4.png")&&engine.includes('facadeModern:localTexture')&&engine.includes('style%3===1?authoredTextures.facadeModern'));
add('photoreal facade has color and micro relief',engine.includes('material.map=map')&&engine.includes('material.bumpMap=map')&&engine.includes("material.bumpScale=style%3===1?.045:.075"));
add('facade depth uses projected planes and real balconies',engine.includes("photoFacade.name='photorealFacadeV4'")&&engine.includes("slab.name='photorealBalconySlab'")&&engine.includes('balconyCount='));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 facade V3 checks PASS`);process.exit(failed?1:0);
