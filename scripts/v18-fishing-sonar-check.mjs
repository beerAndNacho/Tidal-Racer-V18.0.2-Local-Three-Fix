import assert from 'node:assert/strict';
import fs from 'node:fs';

const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const {REGIONS}=await import('../data-v12.js'),{FishingDirector,FISHING_HABITATS,fishingHabitatAt}=await import('../v18/fishing-system.js');
const main=fs.readFileSync('v18/main.js','utf8'),html=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');

assert.equal(FISHING_HABITATS.length,36,'nine regions need four authored fishing habitats each');
assert.ok(REGIONS.every(region=>FISHING_HABITATS.filter(entry=>entry.region===region.name).length===4),'every region must have a complete habitat set');
assert.ok(REGIONS.every(region=>new Set(FISHING_HABITATS.filter(entry=>entry.region===region.name).map(entry=>entry.zone)).size===4),'surface, shallow, mid and deep zones must exist in every region');
assert.equal(new Set(FISHING_HABITATS.map(entry=>entry.id)).size,36,'habitat ids must be unique');

const shelf=FISHING_HABITATS.find(entry=>entry.region==='GOLDEN COAST'&&entry.zone==='shallow'),hot=fishingHabitatAt('GOLDEN COAST',shelf.x,shelf.z,'shallow'),cold=fishingHabitatAt('GOLDEN COAST',3000,3000,'shallow');
assert.ok(hot.status==='HOT SCHOOL'&&hot.strength===1&&hot.distance<.001,'arriving at a habitat must produce a full-strength hot school');
assert.ok(cold.status==='SPARSE WATER'&&cold.strength===0,'distant water must be honestly labeled sparse');

const warmDirector=new FishingDirector({random:()=>.5,storageKey:null});warmDirector.enter('GOLDEN COAST',{x:shelf.x,z:shelf.z});warmDirector.cast({region:'GOLDEN COAST',hour:12,x:shelf.x,z:shelf.z});const warmTimer=warmDirector.timer;
const coldDirector=new FishingDirector({random:()=>.5,storageKey:null});coldDirector.enter('GOLDEN COAST',{x:3000,z:3000});coldDirector.cast({region:'GOLDEN COAST',hour:12,x:3000,z:3000});
assert.ok(warmTimer<coldDirector.timer*.62,'hot schools must materially reduce bite wait');
assert.equal(warmDirector.target.habitat.id,shelf.id,'a cast must lock its habitat evidence');

const selector=new FishingDirector({storageKey:null});selector.profile.total=50;selector.enter('GOLDEN COAST',{x:0,z:0});selector.cycleBait();
assert.equal(selector.sonar.zone,'mid','changing bait must retarget sonar to the new depth zone');

assert.ok(main.includes('fishing.scan({region,x:px,z:pz})')&&main.includes('hour:cityLife.profile.worldHour,x:px,z:pz'),'live position must feed sonar and casts');
assert.ok(html.includes('id="fishingSonar"')&&html.includes('id="sonarStatus"')&&html.includes('id="sonarBearing"')&&html.includes('id="sonarRange"'),'HUD must expose the fish finder and navigation readout');
assert.ok(main.includes('drawFishingSonar(fishingSnapshot)')&&main.includes('quadraticCurveTo')&&main.includes('dataset.fishingSonarStrength'),'animated echoes and sonar telemetry must be wired');
assert.ok(audio.includes("case'fishingSonarHot'")&&main.includes("AUDIO_CAPTIONS.fishingSonarHot='어군 밀집 구역 감지'"),'hot schools need audible and captioned confirmation');
assert.ok(main.includes('function setFishingHabitatWaypoint()')&&main.includes("navigation.setWaypoint({x:sonar.x,z:sonar.z},label)")&&main.includes("e.code==='KeyH'")&&main.includes("event.action==='activity'&&fishing.active"),'keyboard and gamepad must route the selected habitat into navigation');
assert.ok(smoke.includes('position-based habitat sonar'),'package smoke must cover the sonar loop');
assert.ok(readme.includes('Position-based habitat sonar')&&contributing.includes('v18-fishing-sonar-check.mjs'),'feature and QA command must be documented');

console.log('16/16 V18 fishing sonar checks PASS');
