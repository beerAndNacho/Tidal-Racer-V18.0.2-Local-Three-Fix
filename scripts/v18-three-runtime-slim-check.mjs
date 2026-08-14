import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { collectThreeRuntimeFiles,threeRuntimeBytes } from './three-runtime-files.mjs';

const files=collectThreeRuntimeFiles(),selected=new Set(files),build=fs.readFileSync('scripts/build-release.mjs','utf8'),audit=fs.readFileSync('scripts/release-audit.mjs','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
assert.ok(files.length>=35&&files.length<=60,'runtime closure must be bounded and reviewable');
assert.ok(threeRuntimeBytes()<6*1048576,'selected Three.js runtime must remain below 6 MiB');
for(const required of['vendor/three/LICENSE','vendor/three/package.json','vendor/three/build/three.module.js','vendor/three/build/three.core.js','vendor/three/examples/jsm/objects/Water.js','vendor/three/examples/jsm/objects/Sky.js','vendor/three/examples/jsm/postprocessing/GTAOPass.js','vendor/three/examples/jsm/loaders/GLTFLoader.js','vendor/three/examples/jsm/loaders/DRACOLoader.js','vendor/three/examples/jsm/loaders/KTX2Loader.js','vendor/three/examples/jsm/libs/meshopt_decoder.module.js'])assert.ok(selected.has(required),`missing required runtime file: ${required}`);
assert.ok(files.some(file=>file.includes('/libs/draco/')&&file.endsWith('.wasm')),'Draco decoder wasm must ship');
assert.ok(files.some(file=>file.includes('/libs/basis/')&&file.endsWith('.wasm')),'Basis transcoder wasm must ship');
assert.ok(!selected.has('vendor/three/build/three.webgpu.js')&&!selected.has('vendor/three/examples/jsm/exporters/GLTFExporter.js'),'unused WebGPU and authoring modules must not ship');
for(const relative of files.filter(file=>/\.js$/i.test(file))){const source=fs.readFileSync(relative,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)){const dependency=path.relative(process.cwd(),path.resolve(path.dirname(relative),match[1])).replaceAll('\\','/');assert.ok(selected.has(dependency),`unclosed dependency: ${dependency} from ${relative}`)}}
assert.ok(build.includes("import { collectThreeRuntimeFiles }")&&build.includes('const threeRuntimeFiles=collectThreeRuntimeFiles(root)'),'release builder must use the dependency closure');
assert.ok(build.includes('for(const file of [...new Set(extraFiles)])copyFile(file)')&&!build.includes("const extraFolders=['vendor/three/examples/jsm']"),'release builder must copy files instead of the whole examples tree');
assert.ok(audit.includes("import { collectThreeRuntimeFiles }")&&audit.includes('dependency-closed Three.js runtime'),'size audit must measure the same runtime closure');
assert.ok(smoke.includes('dependency-closed Three.js runtime'),'package smoke must cover the slim runtime policy');
assert.ok(readme.includes('Dependency-closed Three.js package')&&contributing.includes('v18-three-runtime-slim-check.mjs'),'packaging feature and QA command must be documented');

console.log('11/11 V18 Three.js runtime slimming checks PASS');
