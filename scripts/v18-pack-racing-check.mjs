import fs from 'node:fs';
import assert from 'node:assert/strict';
import { RACE_RULES, RivalRaceDirector } from '../v18/race-system.js';

const main=fs.readFileSync('v18/main.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),tests=[];const check=(name,fn)=>{try{fn();tests.push({name,ok:true})}catch(error){tests.push({name,ok:false,error:error.message})}};
check('three authored racing lines',()=>assert.deepEqual(RACE_RULES.laneCenters,[-7.4,0,7.4]));
check('pack and overtake distances are bounded',()=>{assert.ok(RACE_RULES.overtakeLookaheadMeters>=30&&RACE_RULES.overtakeLookaheadMeters<=50);assert.ok(RACE_RULES.packRangeMeters>=50&&RACE_RULES.packRangeMeters<=70)});
check('rivals carry aggression and lane-decision state',()=>{const race=new RivalRaceDirector({trackLength:1600});const start=race.start(0,11);assert.ok(start.rivals.every(rival=>rival.aggression>=.4&&Number.isFinite(rival.laneDecisionAt)&&'blockedBy'in rival))});
check('blocked rivals identify traffic and choose an alternate line',()=>{const race=new RivalRaceDirector({trackLength:1600});race.start(0,11);race.rivals.forEach((rival,index)=>{rival.progress=.1+index*.08;rival.lane=index===0||index===1?0:index%2?-7.4:7.4;rival.laneTarget=rival.lane;rival.speed=36});race.rivals[0].progress=.2;race.rivals[1].progress=.21;race.rivals[0].lane=race.rivals[1].lane=0;const snapshot=race.update(4,.033,{playerT:.05,playerSpeed:38,playerLane:-7.4,rivalCrafts:Array.from({length:11},()=>({max:45}))});const blocked=snapshot.rivals[0];assert.equal(blocked.blockedBy,1);assert.ok(blocked.overtaking);assert.ok(Math.abs(blocked.laneTarget)>=7)});
check('snapshot reports nearby pack and active overtakes',()=>{const race=new RivalRaceDirector({trackLength:1600});race.start(0,11);const snapshot=race.update(4,.033,{playerT:.02,playerSpeed:34,playerLane:0,rivalCrafts:Array.from({length:11},()=>({max:44}))});assert.ok(Number.isInteger(snapshot.packNearby)&&snapshot.packNearby>=1);assert.ok(Number.isInteger(snapshot.overtaking)&&snapshot.overtaking>=0)});
check('player lane is fed into rival decision making',()=>assert.ok(main.includes('playerRaceLane=clamp(')&&main.includes('playerLane:playerRaceLane')));
check('rival craft render speed-scaled V wakes',()=>assert.ok(main.includes("group.name='rival-v-wake'")&&main.includes('rivalWakeStripGeometry(side)')&&main.includes('visibleRivalWakes')));
check('slipstream checks longitudinal and lateral alignment',()=>assert.ok(main.includes('aheadMeters>4&&aheadMeters<46')&&main.includes('laneGap<4.8')&&main.includes('draftStrength=Math.max')));
check('pack HUD publishes live tactical telemetry',()=>assert.ok(main.includes('snapshot.packNearby')&&main.includes('snapshot.overtaking')&&main.includes('dataset.raceDraftStrength')&&main.includes('dataset.racePack')));
check('rank changes and slipstream have audio and haptics',()=>assert.ok(main.includes("audioDirector.cue('slipstream'")&&main.includes("audioDirector.cue('rivalPass'")&&audio.includes("case'slipstream'")&&audio.includes("case'rivalPass'")));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}${test.error?` — ${test.error}`:''}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 pack racing checks PASS`);process.exit(failed?1:0);
