import assert from 'node:assert/strict';
import fs from 'node:fs';

const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const {FishingDirector,FISHING_BAITS,FISH_SPECIES,fishingBaitMatch,baitCondition}=await import('../v18/fishing-system.js');
const main=fs.readFileSync('v18/main.js','utf8'),html=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');

assert.equal(FISHING_BAITS.length,4,'four authored bait strategies are required');
assert.deepEqual(FISHING_BAITS.map(entry=>entry.unlock),[0,8,22,45],'bait unlocks must progress with fishing experience');
assert.equal(new Set(FISHING_BAITS.map(entry=>entry.zone)).size,4,'surface, shallow, mid and deep zones must all be represented');
assert.ok(FISHING_BAITS.every(entry=>entry.depth&&entry.behaviors.length),'each bait needs readable depth and target behaviors');

const popper=FISHING_BAITS.find(entry=>entry.id==='surface-popper'),jumper=FISH_SPECIES.find(entry=>entry.behavior==='jump'),bottom=FISH_SPECIES.find(entry=>entry.behavior==='bottom');
assert.ok(fishingBaitMatch(jumper,popper,6)>fishingBaitMatch(bottom,popper,6),'surface popper must favor jumping fish');
assert.ok(fishingBaitMatch(jumper,popper,6)>fishingBaitMatch(jumper,popper,13),'surface popper must reward dawn and dusk timing');
assert.equal(baitCondition(popper,6),'PRIME WINDOW','prime time must be explained to the player');
assert.equal(baitCondition(popper,13),'OFF WINDOW','off-time casts must have clear feedback');

const locked=new FishingDirector({random:()=>.3,storageKey:null});locked.enter('GOLDEN COAST');
assert.equal(locked.availableBaits.length,1,'new profiles start with one understandable bait');
locked.profile.total=50;assert.equal(locked.availableBaits.length,4,'experienced anglers unlock every strategy');
assert.equal(locked.cycleBait().id,'flash-minnow','bait cycling follows the authored progression');
locked.cast({region:'GOLDEN COAST',seaState:1,hour:12});
assert.equal(locked.cycleBait(),null,'bait cannot be changed after casting');
assert.equal(locked.target.bait.id,'flash-minnow','casts preserve their selected bait');
assert.equal(locked.target.depth,'8–22 M','casts preserve their target depth');

const legacy=new FishingDirector({storageKey:null});legacy.restore({total:9,earned:120,discovered:{},best:{},byRegion:{}});
assert.equal(legacy.bait.id,'shore-worm','old saves without bait data migrate safely');
legacy.restore({total:0,baitId:'deep-glow-jig',discovered:{},best:{},byRegion:{}});
assert.equal(legacy.bait.id,'shore-worm','locked bait ids cannot be injected through saves');

assert.ok(main.includes('cycleFishingBait()')&&main.includes("e.code==='KeyV'")&&main.includes("event.action==='camera'")&&main.includes('hour:cityLife.profile.worldHour'),'keyboard, gamepad and world time must be integrated');
assert.ok(main.includes('dataset.fishingBait')&&main.includes('dataset.fishingCondition')&&main.includes('dataset.fishingDepth'),'fishing strategy telemetry must be exposed');
assert.ok(html.includes('id="fishingBait"')&&html.includes('id="fishingDepth"')&&html.includes('id="fishingCondition"'),'HUD must show bait, depth and timing');
assert.ok(audio.includes("case'fishingBait'")&&main.includes("AUDIO_CAPTIONS.fishingBait='낚시 미끼 교체'"),'bait changes require sound and caption feedback');
assert.ok(smoke.includes('time-and-depth fishing strategy'),'package smoke must cover the feature');
assert.ok(readme.includes('Time-and-depth fishing strategy')&&contributing.includes('v18-fishing-strategy-check.mjs'),'feature and QA command must be documented');

console.log('15/15 V18 fishing strategy checks PASS');
