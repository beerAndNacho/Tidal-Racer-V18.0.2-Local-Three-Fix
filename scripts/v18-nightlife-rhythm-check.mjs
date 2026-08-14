import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NightlifeRhythmDirector, NIGHTLIFE_RHYTHM_RULES, NIGHTLIFE_RHYTHM_DIRECTIONS, nightlifeRhythmDirection } from '../v18/nightlife-rhythm-system.js';

const perfect=new NightlifeRhythmDirector();let snapshot=perfect.start({day:1});
assert.equal(snapshot.total,39,'24-second set should contain 39 readable notes');
assert.deepEqual(NIGHTLIFE_RHYTHM_DIRECTIONS,['left','down','up','right']);
assert.equal(nightlifeRhythmDirection(1,0),'left');
assert.notEqual(nightlifeRhythmDirection(1,0),nightlifeRhythmDirection(2,0),'daily patterns should visibly rotate');
assert.equal(nightlifeRhythmDirection(1,0),nightlifeRhythmDirection(5,0),'four-day rotation should repeat deterministically');
for(let index=0;index<snapshot.total;index++){perfect.update(perfect.noteTime(index)-perfect.elapsed);assert.equal(perfect.input(nightlifeRhythmDirection(1,index)),true,`note ${index} should accept exact-beat input`)}
snapshot=perfect.update(NIGHTLIFE_RHYTHM_RULES.duration-perfect.elapsed);
assert.ok(snapshot.complete&&snapshot.result.rank==='S','perfect set must complete at S rank');
assert.equal(snapshot.result.hits,snapshot.total);assert.equal(snapshot.result.perfects,snapshot.total);assert.equal(snapshot.result.misses,0);assert.equal(snapshot.result.accuracy,1);
assert.ok(snapshot.result.reward>0&&snapshot.result.reward<=NIGHTLIFE_RHYTHM_RULES.rewardCap,'reward must be positive and capped');
assert.ok(snapshot.result.personalBest&&snapshot.result.dailyBest,'first perfect set should establish both records');
const plays=perfect.profile.plays;assert.equal(perfect.finish(),snapshot.result);assert.equal(perfect.profile.plays,plays,'duplicate finish must not duplicate rewards or plays');
const restored=new NightlifeRhythmDirector(perfect.serialize());assert.equal(restored.profile.highScore,snapshot.result.score);assert.equal(restored.profile.totalPerfects,snapshot.total);

const failed=new NightlifeRhythmDirector();failed.start({day:2});assert.equal(failed.input('left'),false,'input before the timing window should be a stray');failed.update(failed.noteTime(0));const target=nightlifeRhythmDirection(2,0),wrong=NIGHTLIFE_RHYTHM_DIRECTIONS.find(direction=>direction!==target);assert.equal(failed.input(wrong),false,'wrong direction should miss the current note');const missSnapshot=failed.update(NIGHTLIFE_RHYTHM_RULES.duration);assert.ok(missSnapshot.complete&&missSnapshot.result.rank==='D'&&missSnapshot.result.misses===missSnapshot.total,'unplayed notes and wrong input should settle as misses');assert.equal(missSnapshot.result.strays,1);

const main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),html=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8')),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
for(const token of ['new NightlifeRhythmDirector','startNightlifeRhythm','nightlifeRhythmInput','updateNightlifeRhythm(dt)','closeNightlifeRhythm',"actionId==='dance'",'if(!arcadeChallenge&&!nightlifeRhythm)cityLife.tickClock(dt)',"nightlifeRhythm?'dance':null",'dataset.rhythmScore'])assert.ok(main.includes(token),`rhythm integration missing ${token}`);
for(const token of ['nightlifeRhythm:{plays:0','this.profile.nightlifeRhythm=','nightlifeRhythm:{...this.profile.nightlifeRhythm'])assert.ok(life.includes(token),`saved rhythm profile missing ${token}`);
for(const token of ['id="nightlifeRhythmChallenge"','id="rhythmTrack"','id="rhythmReceptors"','id="rhythmJudgement"','id="rhythmResult"','WASD / ARROWS / D-PAD'])assert.ok(html.includes(token),`rhythm presentation missing ${token}`);
for(const cue of ["case'rhythmPerfect'","case'rhythmGood'","case'rhythmMiss'","case'rhythmComplete'"])assert.ok(audio.includes(cue),`rhythm audio missing ${cue}`);
assert.ok(policy.requiredFiles.includes('v18/nightlife-rhythm-system.js')&&policy.sourceFiles.includes('v18/nightlife-rhythm-system.js'),'release policy must require the rhythm runtime');
for(const [source,token] of [[smoke,'playable nightlife rhythm'],[readme,'Playable dance floor'],[contributing,'v18-nightlife-rhythm-check.mjs'],[workflow,'v18-nightlife-rhythm-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);

console.log('PASS nightlife rhythm: deterministic 39-note daily sets, four inputs, perfect/good/okay/miss windows, wrong and stray handling, combo, S-D rank, bounded rewards, idempotent finish, saved records, keyboard/gamepad lock, frozen city clock, avatar dance props, neon UI, audio, policy, docs, smoke, and CI');
