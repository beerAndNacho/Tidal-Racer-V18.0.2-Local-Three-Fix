import fs from 'node:fs';

const source=fs.readFileSync('scripts/build-release.mjs','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('commercial build requires sale-ready audit',source.includes("if(!audit.saleReady&&!preview)")&&source.includes('COMMERCIAL BUILD BLOCKED'));
add('preview channel is explicit',source.includes("process.argv.includes('--preview')")&&source.includes("preview?'preview':'commercial'"));
add('existing builds are never overwritten',source.includes('Refusing to overwrite existing build'));
add('runtime and licensed assets are dependency allowlisted',['index.html','v18','assets','collectThreeRuntimeFiles(root)','threeRuntimeFiles'].every(item=>source.includes(item))&&!source.includes("const extraFolders=['vendor/three/examples/jsm']"));
add('Windows and Unix local launchers ship with dependencies',['run_local.bat','run_local.sh','prepare_vendor.py','serve_local.py'].every(item=>source.includes(item)));
add('public promotion kit ships with package',['docs/PRESS_KIT.md','docs/promo/THREADS_KO.md','docs/promo/THREADS_CAMPAIGN_KO.md','docs/promo/PROVENANCE.md','docs/promo/tidal-racer-launch-key-art.png'].every(item=>source.includes(item)));
add('relative vendor modules are preflighted',source.includes('missingLocalModules')&&source.includes('PACKAGE MODULE PREFLIGHT FAILED'));
add('package smoke test runs inside output',source.includes("scripts/package-smoke-check.mjs")&&source.includes('cwd:output'));
add('every packaged file gets SHA-256',source.includes("createHash('sha256')")&&source.includes('PACKAGE_MANIFEST.json'));
add('audit report ships with build',source.includes("copyFile('release/RELEASE_AUDIT.json')"));
add('approved legal documents ship only in commercial channel',source.includes("if(!preview)for(const legalFile")&&['release/EULA.md','release/PRIVACY.md','release/SUPPORT_POLICY.md'].every(item=>source.includes(item)));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} release build checks PASS`);process.exit(failed?1:0);
