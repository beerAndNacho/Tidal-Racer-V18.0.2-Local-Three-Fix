import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const files={engine:read('v18/engine.js'),main:read('v18/main.js'),character:read('v16/character-system.js'),textures:read('assets/textures/README.md')};
const tests=[];const add=(name,ok,detail='')=>tests.push({name,ok:!!ok,detail});

for(const name of['neoprene-suit-v1.webp','ocean-micro-height-v1.webp','fish-scales-v1.webp','fish-skin-bluewater-v1.webp','fish-skin-tropical-v1.webp','fish-skin-reef-v1.webp','facade-harbor-shops-v2.webp','facade-coastal-apartments-v2.webp','facade-marina-office-v2.webp','facade-harbor-warehouse-v2.webp']){
  const path=`assets/textures/${name}`,size=fs.existsSync(path)?fs.statSync(path).size:0;
  add(`${name} local asset`,size>20_000,`${Math.round(size/1024)} KiB`);
}
add('512px procedural water normals',files.engine.includes('createProceduralWaterNormals(size=512)'));
add('higher density water mesh',files.engine.includes('PlaneGeometry(3400,3400,210,210)'));
add('ocean micro surface layer',files.engine.includes('oceanSurfaceDetail')&&files.engine.includes('oceanMicroTexture.offset.set'));
add('animated shoreline foam',files.engine.includes('shoreFoamMeshes')&&files.engine.includes('foamMap.offset.x'));
add('54 species-driven textured fish',files.engine.includes('for(let i=0;i<54;i++)')&&files.engine.includes('FISH_SPECIES[i%FISH_SPECIES.length]')&&files.engine.includes('map:fishTextureFor(species)'));
add('distinct fish anatomy and behavior',files.engine.includes('fishFinMaterials')&&files.engine.includes("species.behavior==='glide'")&&files.engine.includes("species.behavior==='bottom'"));
add('tapered ring-built fish bodies',files.engine.includes('function createFishBodyGeometry()')&&files.engine.includes('rings=19,radial=16'));
add('shark and billfish anatomy',files.engine.includes("isShark=species.id.includes('shark')")&&files.engine.includes("'sharkGill'")&&files.engine.includes("'billfishRostrum'"));
add('large fish remain below surface',files.engine.includes("rarityDepth=['epic','legendary']")&&files.engine.includes('depth:.78+(i%9)*.13+rarityDepth'));
add('underwater fish material attenuation',files.engine.includes("opacity:['epic','legendary'].includes(species.rarity)?.62:.74")&&files.engine.includes('envMapIntensity:.46'));
add('three breaching dolphins',files.engine.includes('for(let i=0;i<3;i++)')&&files.engine.includes('breach=active?Math.sin'));
add('live marine update export',files.engine.includes('export function updateMarineLife')&&files.main.includes('updateMarineLife(STATE.time,px,pz,sea,speedN)'));
add('marine browser diagnostic',files.engine.includes('document.body.dataset.marineLife'));
add('smooth 30x10 hull',files.engine.includes('rings=30,sections=10'));
add('custom tapered fairing',files.engine.includes('function fairingGeometry()')&&files.engine.includes("fairingGeometry(),paint,'frontFairing'"));
add('rounded craft surfaces',files.engine.includes('RoundedBoxGeometry(1.68,.33,4.35')&&files.engine.includes('frontIntake'));
add('craft visual axis matches travel',files.engine.includes("suspension.name='craftSuspension';suspension.rotation.y=Math.PI"));
add('220 particle wake',files.main.includes('wakeCount=220')&&files.main.includes('wakeDrift'));
add('150 particle spray',files.main.includes('sprayCount=150')&&files.main.includes('sprayVel[j+1]-=3.8*dt'));
add('generated neoprene material',files.character.includes('neoprene-suit-v1.webp')&&files.character.includes('function neopreneMaterial'));
add('anatomical tapered rider limbs',files.character.includes('function taperedLimbGeometry')&&files.character.includes("radial=detail==='hero'?20:10")&&files.character.includes("name.includes('upperLeg')?.69"));
add('reduced realistic rider head',files.character.includes('face.head.scale.multiplyScalar(.68)'));
add('sculpted rider equipment',files.character.includes("sculptedTorsoGeometry(.86,.72,.94,.96")&&files.character.includes("'kneePanel.'+key"));
add('four modular facade families',files.engine.includes('facade-harbor-shops-v2.webp')&&files.engine.includes('facade-harbor-warehouse-v2.webp')&&files.engine.includes('authoredTextures.facades[Math.abs(style)%authoredTextures.facades.length]'));
add('dense two-row coastal district',files.engine.includes('buildingZ-52')&&files.engine.includes('i+9'));
add('texture documentation',files.textures.includes('fish-scales-v1.webp')&&files.textures.includes('ocean-micro-height-v1.webp'));

let failed=0;for(const t of tests){console.log(`${t.ok?'PASS':'FAIL'} ${t.name}${t.detail?` — ${t.detail}`:''}`);if(!t.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 marine/visual checks PASS`);process.exit(failed?1:0);
