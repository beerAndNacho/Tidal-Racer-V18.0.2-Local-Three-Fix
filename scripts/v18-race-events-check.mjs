import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RaceEventDirector, RACE_EVENTS, formatRaceTime } from '../v18/race-event-system.js';
import { RivalRaceDirector } from '../v18/race-system.js';

assert.equal(RACE_EVENTS.length,7,'championship must ship seven regional race events');
assert.equal(new Set(RACE_EVENTS.map(event=>event.region)).size,7,'every championship event needs a distinct regional identity');
assert.ok(RACE_EVENTS.every(event=>event.points.length>=6&&event.laps>=2&&event.reward.credits>0),'every event needs a closed-course definition, laps, and rewards');
assert.deepEqual(RACE_EVENTS.map(event=>event.unlockRep),[0,200,450,800,1200,1600,2200],'reputation progression must be intentional and monotonic');

const director=new RaceEventDirector();
assert.equal(director.selected.id,'golden-circuit');
assert.equal(director.available(0).filter(event=>event.unlocked).length,1);
assert.deepEqual(director.select('moonlight-cup',2199),{ok:false,reason:'locked',event:RACE_EVENTS[6],required:2200});
assert.equal(director.select('mangrove-technical',500).ok,true);
assert.equal(director.start(10).event.id,'mangrove-technical');
const finish=director.finish({position:1,elapsed:125.432});
assert.ok(finish.ok&&finish.reward.credits>RACE_EVENTS[2].reward.credits&&finish.personalBest,'winner should receive a placement bonus and personal best');
assert.equal(director.finish({position:1,elapsed:120}).ok,false,'the same result cannot pay twice');
const restored=new RaceEventDirector(director.serialize());
assert.equal(restored.selected.id,'mangrove-technical');
assert.deepEqual(restored.available(500)[2].record,{attempts:1,wins:1,bestPosition:1,bestTime:125.432});
restored.start(200);const slower=restored.finish({position:4,elapsed:130});assert.equal(slower.personalBest,false);assert.equal(slower.record.bestTime,125.432);
assert.equal(formatRaceTime(125.432),'02:05.432');

const rival=new RivalRaceDirector({trackLength:2200,totalLaps:3});rival.start(0,11);const configured=rival.configure({trackLength:4100,totalLaps:2});assert.deepEqual(configured,{trackLength:4100,totalLaps:2});assert.equal(rival.snapshot().active,false);

const policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
assert.ok(policy.requiredFiles.includes('v18/race-event-system.js')&&policy.sourceFiles.includes('v18/race-event-system.js'),'release policy must ship the championship system');
const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8');
for(const token of ['new RaceEventDirector','raceRoutes=new Map','raceEvents:raceEvents.serialize()','raceEvents.restore(p.raceEvents)','function renderRaceEventMenu','function startRaceSession(eventId','rivalRace.configure({trackLength:activeRaceRoute.getLength()','const course=STATE.mode===\'RACE\'?activeRaceRoute:route','function showRaceResult','function retryRaceEvent','function changeRaceEvent','function finishToFreeRoam'])assert.ok(main.includes(token),`championship runtime missing ${token}`);
for(const id of ['raceEventMenu','raceEventGrid','raceEventCloseBtn','raceResultPanel','raceResultRank','raceResultTitle','raceResultCredits','raceResultXp','raceResultRep','raceResultRetryBtn','raceResultEventsBtn','raceResultFreeBtn'])assert.ok(index.includes(`id="${id}"`),`championship UI missing ${id}`);
assert.ok(!main.includes('setTimeout(()=>{STATE.victoryUntil=0;startRaceSession()'),'race completion must not force an automatic restart');
assert.ok(main.includes("event.action==='confirm'")&&main.includes('navigateRaceOverlay')&&main.includes("event.code==='Escape'"),'championship overlays need keyboard and gamepad controls');
assert.ok(audio.includes("case'raceSelect'")&&audio.includes("case'raceComplete'"),'championship selection and completion need audio cues');
console.log('PASS regional championships: 7 unique courses, reputation gates, dynamic race configuration, scaled one-shot rewards, saved records, and personal best timing');
