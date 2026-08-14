import fs from 'node:fs';
import { craftDriveForces, hullReentryImpact } from '../v18/craft-dynamics-system.js';

const main=fs.readFileSync('v18/main.js','utf8');
const audio=fs.readFileSync('v14/audio-director.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const base={speed:20,maxSpeed:40,accel:14,turn:1,stability:1,throttle:1,steer:0,seaState:1,spool:0,dt:1/60};
const checks=[];
const check=(name,ok,detail='')=>checks.push([name,Boolean(ok),detail]);

const launch=craftDriveForces(base);
check('progressive throttle spool',launch.spool>0&&launch.spool<.2,launch.spool.toFixed(3));
check('spooled thrust exceeds launch thrust',craftDriveForces({...base,spool:1}).thrust>launch.thrust);

const displacement=craftDriveForces({...base,speed:1,spool:1});
const planing=craftDriveForces({...base,speed:34,spool:1});
check('low-speed displacement state',displacement.planing<.05,displacement.planing.toFixed(3));
check('high-speed planing state',planing.planing>.95,planing.planing.toFixed(3));
check('planing reduces drag coefficient',planing.dragRate<craftDriveForces({...base,speed:34,maxSpeed:100,spool:1}).dragRate);

const calm=craftDriveForces({...base,speed:30,spool:1,seaState:.8});
const rough=craftDriveForces({...base,speed:30,spool:1,seaState:2});
check('rough sea reduces traction',rough.traction<calm.traction,`${rough.traction.toFixed(3)} < ${calm.traction.toFixed(3)}`);
check('rough sea reduces effective thrust',rough.thrust<calm.thrust);

const straight=craftDriveForces({...base,speed:38,spool:1,steer:0});
const hardTurn=craftDriveForces({...base,speed:38,spool:1,steer:1});
check('high-speed hard turn cavitates',hardTurn.cavitation>.2,hardTurn.cavitation.toFixed(3));
check('straight run avoids cavitation',straight.cavitation===0);
check('cavitation reduces thrust',hardTurn.thrust<straight.thrust);
check('reverse steering changes yaw sign',craftDriveForces({...base,speed:-3,spool:1,steer:1}).steerAuthority<0);

const noAir=hullReentryImpact({wasAirborne:false,submersion:.3,verticalSpeed:-7,speedRatio:.8,seaState:1.4});
const noContact=hullReentryImpact({wasAirborne:true,submersion:-.1,verticalSpeed:-7,speedRatio:.8,seaState:1.4});
const soft=hullReentryImpact({wasAirborne:true,submersion:.2,verticalSpeed:-2.8,speedRatio:.5,seaState:1});
const hard=hullReentryImpact({wasAirborne:true,submersion:.3,verticalSpeed:-6,speedRatio:.8,seaState:1.4});
check('no false impact while waterborne',!noAir.hit);
check('no false impact before water contact',!noContact.hit);
check('soft re-entry has feedback without damage',soft.hit&&!soft.hard&&soft.damage===0,soft.severity.toFixed(3));
check('hard re-entry causes scaled damage',hard.hit&&hard.hard&&hard.damage>0,`damage ${hard.damage.toFixed(2)}`);

check('runtime uses authored drive forces',main.includes("from './craft-dynamics-system.js'")&&main.includes('craftDriveForces({speed,maxSpeed:tuned.max'));
check('runtime uses hull re-entry impact',main.includes('hullReentryImpact({wasAirborne:craftAirborne')&&main.includes('emitHullImpactSpray(reentry.severity)'));
check('impact drives camera and haptics',main.includes('cameraImpact=Math.max(cameraImpact,reentry.severity)')&&main.includes("audioDirector.cue('hullSlap'")&&main.includes('gamepadDirector.pulse'));
check('cavitation has bounded feedback',main.includes('lastCavitationCue>.72')&&main.includes("audioDirector.cue('cavitation'"));
check('craft dynamics telemetry',main.includes('dataset.craftPlaning')&&main.includes('dataset.craftCavitation')&&main.includes('dataset.hullImpact')&&main.includes('dataset.throttleSpool'));
check('authored impact audio',audio.includes("case'hullSlap'")&&audio.includes("case'cavitation'"));
check('local V18 entry remains active',index.includes('./v18/bootstrap.js'));

let failed=0;
for(const [name,ok,detail] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}${detail?` — ${detail}`:''}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed}/${checks.length} V18 craft dynamics checks PASS`);
process.exit(failed?1:0);
