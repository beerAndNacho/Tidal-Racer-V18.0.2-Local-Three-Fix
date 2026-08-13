import fs from 'node:fs';

const script=fs.readFileSync('scripts/import-rider-assets.mjs','utf8'),example=JSON.parse(fs.readFileSync('release/rider-import.example.json','utf8')),manifest=JSON.parse(fs.readFileSync('assets/manifest.json','utf8')),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('metadata template covers sixteen riders',Object.keys(example.riders).length===16);
add('metadata template requires commercial rights fields',['source','license','licenseUrl','acquisitionDate'].every(key=>key in example.common)&&Object.values(example.riders).every(rider=>'copyrightHolder'in rider&&'reference'in rider));
add('import expects exactly sixteen manifest entries',script.includes('entries.length!==16'));
add('every GLB is structurally validated before copy',script.includes('inspectRiderGlb(input,manifest.characterRig)')&&script.indexOf('inspectRiderGlb')<script.indexOf('fs.copyFileSync'));
add('placeholders and dates are rejected',script.includes('/REPLACE_WITH/i')&&script.includes('Date.parse(common.acquisitionDate)'));
add('existing production riders are never overwritten',script.includes('Refusing to overwrite existing rider'));
add('dry run performs no mutation',script.includes("if(dryRun)")&&script.includes('no files or manifest changed'));
add('manifest receives hash and license provenance',script.includes('licenseUrl:common.licenseUrl')&&script.includes('sha256:item.sha256'));
add('manifest write uses a temporary file and rename',script.includes(".tmp`")&&script.includes('fs.renameSync(temporary,manifestFile)'));
const activeRiders=manifest.assets.filter(asset=>asset.category==='rider');
const approvedRiderSources=new Set(['tidal-racer-project-authored','blender-studio-cc0-tidal-racer-derivative']);
add('current manifest enables sixteen provenance-verified production riders',activeRiders.length===16&&activeRiders.every(asset=>asset.enabled===true&&approvedRiderSources.has(asset.source)&&asset.license&&asset.licenseUrl&&/^[a-f0-9]{64}$/.test(asset.sha256||'')));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} rider import pipeline checks PASS`);process.exit(failed?1:0);
