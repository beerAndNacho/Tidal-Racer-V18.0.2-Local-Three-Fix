import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RaceCourseDirector, RACE_COURSE_RULES } from '../v18/race-course-system.js';

const course=new RaceCourseDirector({checkpointCount:12,totalLaps:2,trackWidth:58});course.start();
let update=course.update(.016,{playerT:.09,distanceToCourse:4,playerSpeed:30});assert.deepEqual(update.passed,[1]);assert.equal(update.nextCheckpoint,2);
for(let checkpoint=2;checkpoint<=11;checkpoint++)update=course.update(.016,{playerT:checkpoint/12+.003,distanceToCourse:5,playerSpeed:34});
assert.equal(update.nextCheckpoint,12,'all sequential gates should arm the finish line');
course.update(.016,{playerT:.96,distanceToCourse:3,playerSpeed:34});update=course.update(.016,{playerT:.02,distanceToCourse:3,playerSpeed:34});assert.ok(update.validLap&&!update.invalidLap&&update.lap===2,'all gates plus a forward line crossing should validate the lap');

const shortcut=new RaceCourseDirector({checkpointCount:12,totalLaps:2});shortcut.start();shortcut.update(.016,{playerT:.9,distanceToCourse:2,playerSpeed:40});shortcut.update(.016,{playerT:.96,distanceToCourse:2,playerSpeed:40});update=shortcut.update(.016,{playerT:.02,distanceToCourse:2,playerSpeed:40});assert.ok(update.invalidLap&&!update.validLap&&update.invalidLaps===1,'skipping gates must invalidate the lap');

const recovery=new RaceCourseDirector();recovery.start();recovery.update(.016,{playerT:.09,distanceToCourse:2,playerSpeed:20});for(let i=0;i<12;i++)recovery.update(.1,{playerT:.1,distanceToCourse:90,playerSpeed:0});assert.ok(recovery.snapshot().warning&&!recovery.snapshot().recoveryAvailable);assert.equal(recovery.recover().ok,false,'recovery must not fire before the recovery delay');for(let i=0;i<24;i++)recovery.update(.1,{playerT:.1,distanceToCourse:90,playerSpeed:0});assert.ok(recovery.snapshot().recoveryAvailable);const recovered=recovery.recover();assert.ok(recovered.ok&&recovered.penalty===RACE_COURSE_RULES.recoveryPenalty&&recovered.t>0);assert.equal(recovery.elapsed(12.5),17.5);

const main=fs.readFileSync('v18/main.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new RaceCourseDirector','function refreshRaceCourseWorld','regional-race-course','raceGatePosts','raceChevrons','raceNextGate','raceCourse.update(dt','lapEligible:courseUpdate.validLap','function recoverRaceCourse','raceCourse.elapsed(','updateRaceCourseWorld()'])assert.ok(main.includes(token),`course runtime missing ${token}`);
for(const id of ['raceCourseHud','raceCourseLabel','raceCheckpoint','raceCheckpointDistance','raceCourseStatus','offCourseAlert','offCoursePrompt'])assert.ok(index.includes(`id="${id}"`),`course HUD missing ${id}`);
assert.ok(engine.includes('setGlobalRouteGuidesVisible')&&main.includes('setGlobalRouteGuidesVisible(false)'),'regional race must replace the legacy global route guides');
assert.ok(main.includes("event.code!=='KeyR'")&&main.includes("event.action==='activity'&&STATE.mode==='RACE'"),'keyboard and gamepad recovery inputs must be wired');
for(const cue of ['checkpoint','courseWarning','courseRecover','invalidLap'])assert.ok(audio.includes(`case'${cue}'`),`course audio missing ${cue}`);
assert.ok(policy.requiredFiles.includes('v18/race-course-system.js')&&policy.sourceFiles.includes('v18/race-course-system.js'),'release policy must ship race course rules');
console.log('PASS race course readability: 12 ordered gates, valid/invalid laps, off-course warning, delayed safe recovery, time penalty, world/minimap guidance, keyboard/gamepad input, and audio feedback');
