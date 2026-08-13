import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),manifest=JSON.parse(fs.readFileSync('assets/manifest.json','utf8')),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('skinned GLBs use SkeletonUtils clone',engine.includes("import('three/addons/utils/SkeletonUtils.js')")&&engine.includes('this.cloneSkinned=clone'));
add('loaded GLBs are cached by asset id',engine.includes('this.cache=new Map()')&&engine.includes('this.cache.get(id)')&&engine.includes('this.cache.set(id,gltf)'));
add('authored animations survive spawn clone',engine.includes('obj.userData.gltfAnimations=gltf.animations||[]'));
add('hero asset id follows rider manifest convention',engine.includes('assets.spawn(`rider-${rider.id}-hero`)'));
add('premium rider attaches to craft suspension',engine.includes('suspension.add(obj)')&&engine.includes("obj.name=`premium-rider-${rider.id}`"));
add('procedural rig remains fallback until upgrade',engine.includes('proceduralRiderRoot=rig')&&engine.includes('if(fallback)fallback.visible=false'));
add('all seven required animation states are selected',['menu-idle','ride','hard-turn','drift','boost','landing','victory'].every(name=>engine.includes(`'${name}'`)));
add('animation changes crossfade',engine.includes("fadeIn(.18).play()")&&engine.includes("fadeOut(.18)"));
add('animation mixer uses bounded frame delta',engine.includes('Math.min(.05,time-premium.lastTime)')&&engine.includes('premium.mixer.update(dt)'));
add('premium animation replaces procedural animation',engine.includes('if(animatePremiumRider(craft,state))return;animateRiderRig'));
add('player refresh requests asynchronous upgrade',main.includes('upgradeCraftRider(candidate)')&&main.includes('candidate===player'));
add('premium runtime exposes diagnostics',engine.includes('dataset.premiumRider=')&&engine.includes('dataset.premiumRiderClips='));
add('manifest provides one hero slot per rider',manifest.assets.filter(asset=>asset.category==='rider'&&/-hero$/.test(asset.id)).length===16);

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} premium rider runtime checks PASS`);process.exit(failed?1:0);
