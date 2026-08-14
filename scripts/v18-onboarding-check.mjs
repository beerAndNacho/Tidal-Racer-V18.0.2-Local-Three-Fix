import assert from 'node:assert/strict';
import fs from 'node:fs';
import { OnboardingDirector, COAST_LICENSE_STEPS, COAST_LICENSE_REWARD } from '../v18/onboarding-system.js';

assert.equal(COAST_LICENSE_STEPS.length,8,'coast license must cover the complete first-session loop');
assert.deepEqual(COAST_LICENSE_STEPS.map(step=>step.metric),['distance','steer','boost','roam','disembark','city','board','fish']);
assert.ok(COAST_LICENSE_STEPS.every(step=>step.title.ko&&step.title.en&&step.instruction.ko&&step.instruction.en&&step.prompt.keyboard&&step.prompt.gamepad&&step.target>0),'every lesson needs bilingual copy, keyboard/gamepad prompts, and a goal');

const director=new OnboardingDirector(null,{enabled:true});assert.equal(director.snapshot().status,'active');assert.equal(director.snapshot().step.id,'throttle');
director.update({distance:100});director.update({distance:136});assert.equal(director.snapshot().step.id,'steer');
for(let i=0;i<12;i++)director.update({dt:.1,steer:.7,speed:12});assert.equal(director.snapshot().step.id,'boost');
for(let i=0;i<8;i++)director.update({dt:.1,boosting:true,speed:18});assert.equal(director.snapshot().step.id,'roam');
director.update({mode:'FREE ROAM'});assert.equal(director.snapshot().step.id,'disembark');assert.equal(director.snapshot().step.waypoint,'dock-water');
director.update({travelMode:'foot'});assert.equal(director.snapshot().step.id,'city');assert.equal(director.record('wrong'),null);director.record('citizenTalk');assert.equal(director.snapshot().step.id,'board');
director.update({travelMode:'water'});assert.equal(director.snapshot().step.id,'fish');director.update({fishCaught:4});director.update({fishCaught:5});assert.equal(director.snapshot().status,'complete');
assert.deepEqual(director.claimReward(),COAST_LICENSE_REWARD);assert.equal(director.claimReward(),null,'completion reward must be claimable only once');

const saved=director.serialize(),restored=new OnboardingDirector(saved,{enabled:false});assert.deepEqual(restored.serialize(),saved,'lesson progress and reward claim must survive save/restore');
restored.reset({distance:800,fishCaught:12});assert.equal(restored.snapshot().status,'active');assert.equal(restored.snapshot().step.id,'throttle');assert.equal(restored.profile.rewardClaimed,true,'restarting lessons must not reset the one-time reward');
assert.ok(restored.skip());assert.equal(restored.snapshot().status,'dismissed');const existingPlayer=new OnboardingDirector(null,{enabled:false});assert.equal(existingPlayer.snapshot().status,'dismissed','existing saves must not be interrupted');

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new OnboardingDirector','onboarding:onboarding.serialize()','onboarding.restore(p.onboarding)','function updateOnboarding','function coastLicenseWaypoint','coast-license-waypoint','get onboarding(){return onboarding.snapshot()}'])assert.ok(main.includes(token),`onboarding runtime missing ${token}`);
for(const event of ["onboarding.record('lifeAction')","onboarding.record('citizenTalk')"])assert.ok(main.includes(event),`city bridge missing ${event}`);
for(const id of ['onboardingHud','onboardingStep','onboardingTitle','onboardingInstruction','onboardingPrompt','onboardingDistance','onboardingFill','onboardingSkip','pauseTutorialBtn'])assert.ok(index.includes(`id="${id}"`),`onboarding UI missing ${id}`);
assert.ok(audio.includes("case'tutorialStep'")&&audio.includes("case'tutorialComplete'"),'tutorial progression needs distinct audio');
assert.ok(policy.requiredFiles.includes('v18/onboarding-system.js')&&policy.sourceFiles.includes('v18/onboarding-system.js'),'release policy must ship onboarding');

console.log('PASS Coast License onboarding: 8 bilingual action lessons, keyboard/gamepad prompts, dock world/minimap guidance, city and fishing bridges, persistence, skip/restart, and one-time reward');
