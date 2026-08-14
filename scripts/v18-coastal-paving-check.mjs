import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const asset='assets/textures/coastal-paving-photoreal-v1.webp',engine=fs.readFileSync('v18/engine.js','utf8'),provenance=JSON.parse(fs.readFileSync('assets/textures/generated-provenance.json','utf8')),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
assert.ok(fs.existsSync(asset),'generated coastal paving asset must exist');
assert.ok(fs.statSync(asset).size>150000&&fs.statSync(asset).size<450000,'texture must retain detail without breaking the package budget');
const entry=provenance.files.find(item=>item.file==='coastal-paving-photoreal-v1.webp'),hash=crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex');
assert.ok(entry&&entry.sha256===hash,'generated texture hash and provenance must match');
assert.equal(provenance.tool,'OpenAI built-in image generation','generation tool must remain explicit');
assert.ok(entry.source&&entry.promptSummary&&entry.output.includes('1024x1024'),'source, prompt summary and output dimensions are required');
assert.ok(engine.includes("paving:localTexture('./assets/textures/coastal-paving-photoreal-v1.webp')"),'runtime must load the authored paving texture');
assert.ok(engine.includes('authoredPbr.paving=')&&engine.includes('authoredPbr.concrete.normalMap')&&engine.includes('authoredPbr.concrete.packedMap'),'paving must retain normal and material response maps');
assert.ok(engine.includes("kind==='paving')map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping"),'mirrored wrapping must suppress generated edge seams');
assert.ok(engine.includes('golden-coast-authored-paving-walk')&&engine.includes('golden-coast-authored-paving-quay'),'walk and quay must use named authored surfaces');
assert.ok(engine.includes("dataset.cityPaving='generated-photoreal-v1'"),'paving tier telemetry must be exposed');
assert.ok(smoke.includes('generated coastal paving'),'package smoke must cover the surface');
assert.ok(readme.includes('Generated coastal paving')&&contributing.includes('v18-coastal-paving-check.mjs'),'feature and QA command must be documented');

console.log('12/12 V18 coastal paving checks PASS');
