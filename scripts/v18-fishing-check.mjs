import fs from 'node:fs';

const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const {FishingDirector,FISH_SPECIES,FISH_RARITIES,FISHING_TACKLE}=await import('../v18/fishing-system.js');
const main=fs.readFileSync('v18/main.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),html=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8');
const tests=[],add=(name,ok)=>tests.push({name,ok:!!ok});

add('27 unique fish species',FISH_SPECIES.length===27&&new Set(FISH_SPECIES.map(x=>x.id)).size===27);
add('all nine regions have fish',new Set(FISH_SPECIES.flatMap(x=>x.regions)).size===9);
add('five rarity tiers represented',Object.keys(FISH_RARITIES).every(r=>FISH_SPECIES.some(x=>x.rarity===r)));
add('four progressive tackle tiers',FISHING_TACKLE.length===4&&FISHING_TACKLE.every((x,i)=>i===0||x.unlock>FISHING_TACKLE[i-1].unlock));

const rolls=[0,.2,.3,.4,.2,.6,.3,.8,.2,.4],director=new FishingDirector({random:()=>rolls.shift()??.2,storageKey:'test-fishing'});
director.enter('GOLDEN COAST');director.action({region:'GOLDEN COAST',seaState:1});
add('enter and cast state transition',director.phase==='waiting'&&director.active);
director.update(10,{time:10});add('timed bite with regional target',director.phase==='bite'&&director.target?.species?.regions.includes('GOLDEN COAST'));
director.action();add('hook transition creates fight',director.phase==='hooked'&&director.stamina>0&&director.distance>0);

let landed=false;
for(let i=0;i<4000&&director.phase==='hooked';i++){
  const rod=-Math.sign(director.direction),t=director.tension;
  director.update(.025,{time:11+i*.025},{reel:t>14&&t<director.tackle.line*.78,slack:t>director.tackle.line*.82,rod});
}
landed=director.phase==='landed';
add('skillful reel loop can land a fish',landed&&director.profile.total===1&&director.catchResult?.value>0);
add('catch profile persists',memory.has('test-fishing')&&Object.keys(director.profile.discovered).length===1);
add('game input integration',main.includes("e.code==='KeyG'")&&main.includes("e.code==='KeyQ'")&&main.includes('updateFishing(dt)'));
add('tension HUD and catch card',html.includes('id="fishingHud"')&&html.includes('id="lineTensionFill"')&&html.includes('id="catchCard"'));
add('fish codex UI',html.includes('data-tab="fish"')&&main.includes("if(tab==='fish')"));
add('species visuals wired to marine life',engine.includes("import { FISH_SPECIES }")&&engine.includes('document.body.dataset.fishSpecies'));
add('dedicated fishing sound cues',audio.includes("case'fishingCast'")&&audio.includes("case'fishingBite'")&&audio.includes("case'fishingCatch'"));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 fishing checks PASS`);process.exit(failed?1:0);
