import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const bootstrap=read('v18/bootstrap.js');
const engine=read('v18/engine.js');
const launcher=read('run_local.bat');
const powerShellServer=read('serve_local.ps1');
const prepare=read('prepare_vendor.py');
const server=read('serve_local.py');

const checks=[
  ['V18.0.2 local title',index.includes('V18.0.2')&&index.includes('Race, Fish, Explore')],
  ['local Three import map',index.includes('./vendor/three/build/three.module.js')&&index.includes('./vendor/three/examples/jsm/')],
  ['no CDN import map',!index.includes('cdn.jsdelivr.net/npm/three')&&!index.includes('unpkg.com/three')],
  ['local runtime verification',bootstrap.includes('verifyLocalRuntime')&&bootstrap.includes('./vendor/three/build/three.module.js')],
  ['missing runtime message',bootstrap.includes('run_local.bat')&&bootstrap.includes('local-runtime-missing')],
  ['finite module watchdog',bootstrap.includes('12000')&&bootstrap.includes('local-module-timeout')],
  ['launcher verifies bundled runtime',launcher.includes('serve_local.ps1')&&powerShellServer.includes('vendor\\three\\package.json')&&powerShellServer.includes('0.185.0')],
  ['browser starts only after verification',launcher.includes('if errorlevel 1')&&powerShellServer.indexOf('ConvertFrom-Json')<powerShellServer.indexOf('Start-Process $Url')],
  ['official version pinned',prepare.includes('VERSION = "0.185.0"')],
  ['multiple package mirrors',prepare.includes('registry.npmjs.org')&&prepare.includes('registry.npmmirror.com')&&prepare.includes('registry.yarnpkg.com')],
  ['parallel mirror race',prepare.includes('ThreadPoolExecutor')&&prepare.includes('as_completed')&&prepare.includes('timeout=8')],
  ['manual archive fallback',prepare.includes('LOCAL_ARCHIVE_CANDIDATES')&&prepare.includes('ARCHIVE_NAME')],
  ['npm pack fallback',prepare.includes('npm", "pack"')||prepare.includes('npm, "pack"')],
  ['selective runtime install',prepare.includes('package_dir / "build"')&&prepare.includes('package_dir / "examples" / "jsm"')],
  ['server refuses incomplete runtime',server.includes('vendor_ready')&&server.includes('raise SystemExit(2)')],
  ['procedural water normals stay local',engine.includes('createProceduralWaterNormals')&&!engine.includes('threejs.org/examples/textures/waternormals')],
  ['local Draco path',engine.includes("./vendor/three/examples/jsm/libs/draco/")],
  ['local Basis path',engine.includes("./vendor/three/examples/jsm/libs/basis/")],
  ['GTAO lazy loaded',engine.includes("import('three/addons/postprocessing/GTAOPass.js')")],
  ['asset loaders lazy loaded',engine.includes("import('three/addons/loaders/GLTFLoader.js')")],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} V18.0.2 local-runtime checks PASS`);
process.exit(failed?1:0);
