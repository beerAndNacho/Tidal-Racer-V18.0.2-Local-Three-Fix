import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),tests=[];const add=(name,ok)=>tests.push({name,ok:!!ok});
const regions=['GOLDEN COAST','VOLCANO BAY','MANGROVE DELTA','HARBOR CITY','STORM STRAIT','CORAL EXPANSE','MOON ARCHIPELAGO','BLACK REEF','SKYWATER LAGOON'];
add('all nine water palettes authored',engine.includes('REGIONAL_WATER_PALETTES=Object.freeze')&&regions.every(region=>engine.includes(`'${region}':[`)));
add('480 streamed suspended particles',engine.includes('underwaterParticleCount=480')&&engine.includes("underwaterParticles.name='subsurface-suspended-matter'")&&engine.includes('Math.sqrt((i+.5)/underwaterParticleCount)*118'));
add('particles occupy layered near-surface depths',engine.includes('underwaterSeed[i*4+2]=.7+(i%31)/31*8.6')&&engine.includes('baseSurface-underwaterSeed[k+2]'));
add('subsurface animation is frame paced at 15 Hz',engine.includes('time-lastSubsurfaceUpdate<1/15')&&engine.includes('Math.round(centerX/120)*120'));
add('seven animated underwater light shafts',engine.includes('for(let i=0;i<7;i++')&&engine.includes('subsurface-light-shaft-')&&engine.includes('underwaterLightShafts[i]'));
add('shafts use subtle additive scattering',engine.includes('THREE.AdditiveBlending')&&engine.includes("opacity:.026")&&engine.includes('Math.max(0,1.25-seaState)*.016'));
add('regional shallow and deep water colors crossfade',engine.includes('tidalShallowColor?.value.lerp(shallow,.025)')&&engine.includes('tidalDeepColor?.value.lerp(deep,.025)'));
add('marine update drives matching regional subsurface',engine.includes('updateSubsurfaceEnvironment(time,centerX,centerZ,seaState,region)'));
add('runtime publishes subsurface telemetry',engine.includes('dataset.subsurfaceParticles')&&engine.includes('dataset.subsurfaceShafts')&&engine.includes('dataset.regionalWaterPalette')&&engine.includes('dataset.subsurfaceTier'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 subsurface environment checks PASS`);process.exit(failed?1:0);
