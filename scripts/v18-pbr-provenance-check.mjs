import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..'),engine=fs.readFileSync(path.join(root,'v18','engine.js'),'utf8'),notice=fs.readFileSync(path.join(root,'assets','THIRD_PARTY_NOTICES.md'),'utf8');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'assets','textures','polyhaven','provenance.json'),'utf8'));
const tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});

add('official CC0 provider metadata',provenance.provider==='Poly Haven'&&provenance.license==='CC0'&&provenance.licenseUrl==='https://polyhaven.com/license');
add('nine channel files recorded',provenance.files.length===9&&new Set(provenance.files.map(x=>x.assetId)).size===3);
for(const entry of provenance.files){const file=path.join(root,'assets','textures','polyhaven',entry.file),exists=fs.existsSync(file),hash=exists?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):'';add(`${entry.file} checksum`,exists&&fs.statSync(file).size>50_000&&hash===entry.sha256)}
add('PBR maps use linear color space',engine.includes("asphalt_03_nor_gl_1k.jpg',THREE.NoColorSpace")&&engine.includes("aerial_beach_02_arm_1k.jpg',THREE.NoColorSpace"));
add('packed ARM drives roughness and metalness',engine.includes('material.roughnessMap=map;material.metalnessMap=map'));
add('normal intensity budgeted per surface',engine.includes('normalScale:.58')&&engine.includes('normalScale:.48')&&engine.includes('normalScale:.36'));
add('shipped notice lists all active sets',['asphalt_03','anti_slip_concrete','aerial_beach_02'].every(id=>notice.includes(id)));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 PBR/provenance checks PASS`);process.exit(failed?1:0);
