import fs from 'node:fs';
import { RACE_RULES, RivalRaceDirector } from '../v18/race-system.js';

const tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)}),crafts=Array.from({length:11},(_,index)=>({max:40+index%5}));
const race=new RivalRaceDirector({trackLength:1000,totalLaps:3}),start=race.start(10,11);
add('race starts with eleven opponents',start.rivals.length===11&&start.playerRank===12);
add('all opponents form a nearby staggered grid',start.rivals.every(rival=>rival.progress*1000>0&&rival.progress*1000<80)&&new Set(start.rivals.map(rival=>Math.sign(rival.lane))).size===2);
add('countdown locks driving for 3.2 seconds',start.phase==='countdown'&&!race.canDrive(12)&&race.canDrive(13.21));
const frozen=race.update(12,.033,{playerT:0,playerSpeed:0,rivalCrafts:crafts});add('rivals stay frozen during countdown',frozen.rivals.every(rival=>rival.speed===0));
const moving=race.update(13.4,.033,{playerT:.001,playerSpeed:10,rivalCrafts:crafts});add('rivals accelerate after GO',moving.phase==='go'&&moving.rivals.every(rival=>rival.speed>0&&rival.targetSpeed>0));
add('rival pace stays inside craft-aware limits',moving.rivals.every((rival,index)=>rival.targetSpeed>=crafts[index].max*.61&&rival.targetSpeed<=crafts[index].max*.96));
const packRace=new RivalRaceDirector({trackLength:5000,totalLaps:3});packRace.start(0,11);for(let i=0;i<900;i++)packRace.update(4+i/30,1/30,{playerT:0,playerSpeed:0,rivalCrafts:crafts});add('AFK player does not lose the rival pack',Math.max(...packRace.rivals.map(rival=>(rival.progress-packRace.playerProgress)*5000))<=RACE_RULES.maxVisibleLeadMeters+.01);
for(let i=0;i<120;i++)race.update(13.4+i/30,1/30,{playerT:.16,playerSpeed:35,rivalCrafts:crafts});const pressure=race.snapshot(17.4);add('AI lanes evolve for overtaking pressure',pressure.rivals.some(rival=>Math.abs(rival.lane-rival.laneTarget)>.01));
add('closest-rival gap is reported in meters',Number.isFinite(pressure.closest.gapMeters));
const beforeContact=pressure.rivals[0].speed;add('contact slows a rival once',race.registerContact(0,20)&&race.rivals[0].speed<beforeContact);add('contact cooldown prevents repeated hits',race.registerContact(0,20.2)===false&&race.registerContact(0,20+RACE_RULES.contactCooldown+.01)===true);

const finishRace=new RivalRaceDirector({trackLength:100000,totalLaps:3});finishRace.start(0,11);finishRace.update(4,.016,{playerT:.9,playerSpeed:40,rivalCrafts:crafts});let lap=finishRace.update(4.1,.016,{playerT:.05,playerSpeed:40,rivalCrafts:crafts});add('forward finish-line crossing increments lap',lap.playerLap===2);finishRace.update(5,.016,{playerT:.9,playerSpeed:40,rivalCrafts:crafts});finishRace.update(5.1,.016,{playerT:.05,playerSpeed:40,rivalCrafts:crafts});finishRace.update(6,.016,{playerT:.9,playerSpeed:40,rivalCrafts:crafts});const finish=finishRace.update(6.1,.016,{playerT:.05,playerSpeed:40,rivalCrafts:crafts});add('three completed laps emit player result',finish.result?.type==='player-finished'&&finish.finished===true&&finish.result.position>=1&&finish.result.position<=12);

const main=fs.readFileSync('v18/main.js','utf8'),html=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
add('main integrates race director with measured event route length',main.includes('new RivalRaceDirector({trackLength:activeRaceRoute.getLength()')&&main.includes('rivalRace.configure({trackLength:activeRaceRoute.getLength()')&&main.includes('rivalRace.update(STATE.time,dt'));
add('first-lap route search cannot wrap player a lap ahead',main.includes("rivalRace.playerLap===1&&lastProgress<.12&&raw<0")&&main.includes("const course=STATE.mode==='RACE'?activeRaceRoute:route"));
add('countdown locks player physics',main.includes("gridLocked=STATE.mode==='RACE'&&!rivalRace.canDrive"));
add('rivals have visible world-space name markers',main.includes('createRivalMarker')&&main.includes('rival-marker-')&&main.includes('visibleRivals'));
add('dense rival pack uses contact-and-target-biased LOD',main.includes("const lodBias=distance<18||idx===snapshot?.closest?.index?0:125"));
add('full eleven-rival field is guaranteed before play',main.includes('while(competitorCursor<11)spawnCompetitor(competitorCursor)'));
add('contact and slipstream affect gameplay',main.includes('rivalRace.registerContact')&&(main.includes("audioDirector.cue('impact'")||main.includes("audioDirector.cue(damage.ok?'craftDamage':'impact'"))&&main.includes('SLIPSTREAM ${Math.round(draftStrength*100)}%'));
add('race HUD exposes countdown, gap and position',['raceCountdown','rivalHud','rivalName','rivalGap','rivalPosition','rivalPressure'].every(id=>html.includes(`id="${id}"`)));
add('runtime exposes race diagnostics',main.includes('get race(){return{...rivalRace.snapshot'));
add('release package requires race system',policy.requiredFiles.includes('v18/race-system.js')&&policy.sourceFiles.includes('v18/race-system.js'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 rival race checks PASS`);process.exit(failed?1:0);
