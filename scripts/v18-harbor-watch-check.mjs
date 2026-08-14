import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HarborWatchDirector, HARBOR_WATCH_INCIDENTS, HARBOR_WATCH_LEVELS, HARBOR_WATCH_ZONE } from '../v18/harbor-watch-system.js';

const drive=(director,seconds,context={})=>{let snapshot;for(let time=0;time<seconds;time+=.25)snapshot=director.update({dt:.25,time,...context});return snapshot};

const clear=new HarborWatchDirector();
assert.equal(clear.snapshot().tier,0);
assert.equal(clear.snapshot().outstandingFine,0);
assert.equal(HARBOR_WATCH_LEVELS.length,4);
assert.equal(HARBOR_WATCH_ZONE.name.en,'GOLDEN MARINA NO-WAKE ZONE');

const raceExempt=new HarborWatchDirector();
drive(raceExempt,20,{mode:'water',gameMode:'RACE',x:230,z:523,speed:38,boosting:true});
assert.equal(raceExempt.snapshot().tier,0,'championship routes must not trigger harbor enforcement');
const rescueExempt=new HarborWatchDirector();
drive(rescueExempt,20,{mode:'water',gameMode:'FREE',x:230,z:523,speed:38,boosting:true,exempt:true});
assert.equal(rescueExempt.snapshot().tier,0,'rescue and mayday routes must be exempt');
const grace=new HarborWatchDirector();
drive(grace,2.25,{mode:'water',gameMode:'FREE',x:230,z:523,speed:38,boosting:true});
assert.equal(grace.snapshot().tier,0,'a brief speed spike inside the grace period must not create a case');

const patrol=new HarborWatchDirector();
drive(patrol,4,{mode:'water',gameMode:'FREE',x:230,z:523,speed:24,boosting:true});
assert.equal(patrol.snapshot().tier,1,'first reckless marina run should create an advisory');
drive(patrol,11,{mode:'water',gameMode:'FREE',x:230,z:523,speed:24,boosting:true});
assert.ok(patrol.snapshot().tier>=2,'repeated unsafe wake should escalate to an intercept');
assert.ok(patrol.snapshot().outstandingFine>0);
assert.equal(patrol.snapshot().patrols>=1,true);
assert.ok(patrol.drainEvents().some(event=>event.type==='escalated'));

drive(patrol,4.5,{mode:'water',gameMode:'FREE',x:230,z:523,speed:0,boosting:false});
assert.equal(patrol.snapshot().settleReady,true,'four-second heave-to must unlock settlement');
const fine=patrol.snapshot().outstandingFine;
assert.equal(patrol.settle(fine-1).reason,'wallet');
const settled=patrol.settle(fine+500);
assert.equal(settled.ok,true);
assert.equal(settled.wallet,500);
assert.equal(patrol.snapshot().tier,0);
assert.equal(patrol.snapshot().profile.finesPaid,1);
assert.equal(patrol.snapshot().profile.totalFines,fine);

const restored=new HarborWatchDirector();
restored.reportIncident('patrol-contact',5);
restored.reportIncident('boosted-marina',13);
const serialized=restored.serialize(),copy=new HarborWatchDirector(serialized);
assert.deepEqual(copy.serialize(),serialized,'active notice and profile must survive save/load');
assert.equal(copy.snapshot().heaveToSeconds,0,'partial settlement holds must never survive reload');

const compliant=new HarborWatchDirector();
drive(compliant,121,{mode:'water',gameMode:'FREE',x:230,z:523,speed:4,boosting:false});
const reward=compliant.drainEvents().find(event=>event.type==='good-standing');
assert.deepEqual(reward?.reward,{credits:180,rep:18});
assert.equal(compliant.snapshot().profile.complianceAwards,1);

assert.equal(HARBOR_WATCH_INCIDENTS['unsafe-wake'].name.en,'UNSAFE MARINA WAKE');
assert.equal(HARBOR_WATCH_INCIDENTS['patrol-contact'].severity,34);

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8');
for(const token of ['new HarborWatchDirector','harborWatch.update','harborWatch.settle','function updateHarborWatch','harborWatch.serialize','harborWatch.restore','buildHarborPatrolCraft','updateHarborWatchPatrols','HARBOR_WATCH_ZONE.radius*scale','NO-WAKE · HARBOR WATCH'])assert.ok(main.includes(token),'runtime harbor watch integration missing '+token);
for(const token of ['id="harborWatchHud"','id="harborWatchTier"','id="harborWatchFine"','id="harborWatchFill"'])assert.ok(index.includes(token),'harbor watch HUD missing '+token);
for(const token of ["case'watchAdvisory'","case'watchIntercept'","case'watchClear'","case'watchSettled'"])assert.ok(audio.includes(token),'harbor watch audio missing '+token);
console.log('PASS harbor watch: no-wake grace, race exemption, repeat escalation, patrol tiers, heave-to settlement, insufficient funds, save/load, clean-operation reward, runtime HUD, visuals, input and audio integration');
