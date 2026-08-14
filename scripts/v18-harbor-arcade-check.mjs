import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HarborArcadeDirector, HARBOR_ARCADE_RULES, arcadeGateLane } from '../v18/harbor-arcade-system.js';

assert.equal(HARBOR_ARCADE_RULES.duration,22,'arcade run should be a compact 22-second challenge');
assert.equal(HARBOR_ARCADE_RULES.lanes,3);
assert.equal(HARBOR_ARCADE_RULES.rewardCap,700,'arcade reward needs a safe economy cap');
assert.deepEqual(Array.from({length:12},(_,index)=>arcadeGateLane(1,index)),[1,0,1,2,1,2,0,1,0,2,1,0]);
assert.notDeepEqual(Array.from({length:12},(_,index)=>arcadeGateLane(1,index)),Array.from({length:12},(_,index)=>arcadeGateLane(2,index)),'daily gate routes should rotate');

const bounds=new HarborArcadeDirector();bounds.start({day:1});assert.equal(bounds.move(-1),true);assert.equal(bounds.move(-1),false);assert.equal(bounds.snapshot().lane,0);bounds.move(1);bounds.move(1);assert.equal(bounds.move(1),false);assert.equal(bounds.snapshot().lane,2,'lane movement must stay inside the three-lane track');

const perfect=new HarborArcadeDirector();perfect.start({day:3});
for(let index=0;perfect.gateTime(index)<HARBOR_ARCADE_RULES.duration;index++){
  const target=arcadeGateLane(3,index);while(perfect.lane<target)perfect.move(1);while(perfect.lane>target)perfect.move(-1);perfect.update(perfect.gateTime(index)-perfect.elapsed+.001);perfect.drainEvents();
}
perfect.update(HARBOR_ARCADE_RULES.duration-perfect.elapsed+.01);const perfectResult=perfect.snapshot().result;
assert.ok(perfectResult&&perfectResult.accuracy===1&&perfectResult.rank==='S','perfect lane reading should earn an S rank');
assert.ok(perfectResult.hits>=28&&perfectResult.misses===0&&perfectResult.bestCombo===perfectResult.hits);
assert.ok(perfectResult.reward>0&&perfectResult.reward<=700);
assert.ok(perfectResult.personalBest&&perfectResult.dailyBest);
const playsAfterFinish=perfect.serialize().plays;perfect.update(5);assert.equal(perfect.serialize().plays,playsAfterFinish,'finished runs must not duplicate profile rewards');

const imperfect=new HarborArcadeDirector();imperfect.start({day:2});imperfect.update(30);const missResult=imperfect.snapshot().result;
assert.ok(missResult.accuracy<.6&&missResult.rank!=='S'&&missResult.score<perfectResult.score,'unplayed lane changes should score materially below a perfect run');
const restored=new HarborArcadeDirector(perfect.serialize());assert.deepEqual(restored.serialize(),perfect.serialize(),'plays, high score, daily best, and rewards must survive restore');
assert.equal(restored.snapshot().profile.dailyBest['3'],perfectResult.score);

const main=fs.readFileSync('v18/main.js','utf8'),city=fs.readFileSync('v18/city-life-system.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new HarborArcadeDirector','startArcadeChallenge','updateArcadeChallenge(dt)','arcadeMove(-1)','arcadePadLatch','actionId===\'arcade\'','dataset.arcadeScore','if(!arcadeChallenge&&!nightlifeRhythm)cityLife.tickClock(dt)'])assert.ok(main.includes(token),'arcade runtime missing '+token);
assert.ok(!main.includes('clockRollback'),'arcade time must pause at the source rather than being advanced and rolled back');
for(const token of ['arcade:{plays:0','arcade:{...this.profile.arcade,dailyBest'])assert.ok(city.includes(token),'arcade save integration missing '+token);
for(const token of ["case'arcadeShift'","case'arcadeHit'","case'arcadeMiss'","case'arcadeComplete'"])assert.ok(audio.includes(token),'arcade audio missing '+token);
for(const id of ['arcadeChallenge','arcadeTrack','arcadePlayer','arcadeScore','arcadeCombo','arcadeResult','arcadeContinue'])assert.ok(index.includes(`id="${id}"`),'arcade UI missing '+id);
assert.ok(index.includes('A / D')&&index.includes('LEFT STICK / D-PAD'));
assert.ok(policy.requiredFiles.includes('v18/harbor-arcade-system.js')&&policy.sourceFiles.includes('v18/harbor-arcade-system.js'),'release policy must require the arcade runtime');
console.log('PASS harbor arcade: deterministic daily routes, bounded three-lane input, perfect and missed runs, combo scoring, rank, capped reward, no duplicate finish, saved records, keyboard/gamepad lock, source-paused city clock, UI, audio, and packaging');
