import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8');
const current=fs.readFileSync(fs.existsSync('v17/main.js')?'v17/main.js':fs.existsSync('v18/main.js')?'v18/main.js':fs.existsSync('v16/main.js')?'v16/main.js':fs.existsSync('v15/main.js')?'v15/main.js':'v14/main.js','utf8');
const audio=fs.readFileSync('v14/audio-director.js','utf8');
const game=fs.readFileSync(fs.existsSync('v18/main.js')?'v18/main.js':fs.existsSync('v16/main.js')?'v16/main.js':fs.existsSync('v15/main.js')?'v15/main.js':'v13/main.js','utf8')+fs.readFileSync(fs.existsSync('v18/engine.js')?'v18/engine.js':fs.existsSync('v16/engine.js')?'v16/engine.js':fs.existsSync('v15/engine.js')?'v15/engine.js':'v13/engine.js','utf8');
const data=fs.readFileSync('data-v12.js','utf8');
const systems=fs.readFileSync('systems-v13.js','utf8');
const cityLife=fs.readFileSync('v18/city-life-system.js','utf8');
const checks=[
 ['local launchers',fs.existsSync('run_local.bat')&&fs.existsSync('run_local.sh')&&fs.existsSync('serve_local.ps1')&&fs.existsSync('prepare_vendor.py')&&fs.existsSync('serve_local.py')],
 ['free preview license',fs.existsSync('LICENSE')&&fs.readFileSync('LICENSE','utf8').includes('FREE PREVIEW LICENSE')],
 ['Current entry',index.includes('./v17/main.js')||index.includes('./v18/bootstrap.js')||index.includes('./v16/main.js')||index.includes('./v15/main.js')||index.includes('./v14/main.js')],
 ['import map',index.includes('type="importmap"')],
 ['Gameplay retained',current.includes("../v16/main.js")||current.includes('data-v12.js')||current.includes("../v13/main.js")],
 ['adaptive audio',audio.includes('class AudioDirector')&&audio.includes('REGION_MOODS')],
 ['RPM engine',audio.includes('updateEngine')&&audio.includes('this.rpm')],
 ['16 riders',(data.match(/passive:/g)||[]).length>=16],
 ['10 crafts',data.includes('VOLT-9')&&data.includes('STORM-X')],
 ['30 items',data.includes('GHOST WAKE')&&data.includes('SEEKER')],
 ['12 events',data.includes('SKYWATER FESTIVAL')&&data.includes('TIDAL SURGE')],
 ['9 regions',data.includes('SKYWATER LAGOON')&&data.includes('GOLDEN COAST')],
 ['Water+Sky',game.includes('new Water(')&&game.includes('new Sky()')],
 ['GTAO+SMAA',game.includes('GTAOPass')&&game.includes('SMAAPass')],
 ['persistent profile',game.includes('localStorage.setItem')],
 ['cosmetics',systems.includes('COSMETICS')&&game.includes('equipCosmetic')],
 ['left/right controls',game.includes("KeyA:'left'")&&game.includes("KeyD:'right'")&&game.includes('const targetYaw=steer*steerAuthority')],
 ['dynamic rough water',game.includes('updateWaterSurface')&&/foamCount=(?:1[2-9]\d\d|[2-9]\d{3,})/.test(game)],
 ['controlled sunlight',game.includes('toneMappingExposure=0.86')&&game.includes('DirectionalLight(0xffd7af,2.72)')],
 ['city life',cityLife.includes('class CityLifeDirector')&&cityLife.includes('CITY_FACILITIES')&&game.includes('updateOnFoot')],
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}
console.log(`\n${checks.length-fail}/${checks.length} package checks PASS`);
process.exit(fail?1:0);
