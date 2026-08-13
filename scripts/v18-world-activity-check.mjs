import fs from 'node:fs';
import { WORLD_ACTIVITIES, WorldActivityDirector } from '../v18/world-activity-system.js';

const main=fs.readFileSync('v18/main.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),html=fs.readFileSync('index.html','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)});
add('all nine regions have an activity',WORLD_ACTIVITIES.length===9&&new Set(WORLD_ACTIVITIES.map(item=>item.region)).size===9);
add('activities have multi-step routes',WORLD_ACTIVITIES.every(item=>item.steps.length>=3));
add('activities have timed commercial rewards',WORLD_ACTIVITIES.every(item=>item.timeLimit>=100&&item.reward.credits>=1800&&item.reward.xp>=500&&item.reward.rep>=90));
add('localized activity copy is complete',WORLD_ACTIVITIES.every(item=>item.title.ko&&item.title.en&&item.description.ko&&item.description.en&&item.steps.every(step=>step.label.ko&&step.label.en)));
add('activity types are varied',new Set(WORLD_ACTIVITIES.map(item=>item.type)).size>=7);

const director=new WorldActivityDirector(),rescue=WORLD_ACTIVITIES[0];
add('director starts regional activity',director.start(rescue.id,10)?.type==='started'&&director.snapshot({time:10}).active);
let result=director.update({x:rescue.steps[0].x,z:rescue.steps[0].z,time:11,speed:5,dt:1});add('reaching a target advances step',result?.type==='step'&&director.snapshot({time:11}).step===1);
result=director.update({x:rescue.steps[1].x,z:rescue.steps[1].z,time:12,speed:30,dt:1});add('controlled-speed target rejects excessive speed',result===null&&director.snapshot({time:12}).step===1);
director.update({x:rescue.steps[1].x,z:rescue.steps[1].z,time:13,speed:8,dt:1});result=director.update({x:rescue.steps[2].x,z:rescue.steps[2].z,time:14,speed:8,dt:1});add('final target completes and records best time',result?.type==='completed'&&director.profile.completed[rescue.id]===1&&director.profile.best[rescue.id]===4);
const survey=WORLD_ACTIVITIES.find(item=>item.id==='coral-survey'),holdDirector=new WorldActivityDirector();holdDirector.start(survey.id,0);for(let i=1;i<=2;i++)holdDirector.update({x:survey.steps[0].x,z:survey.steps[0].z,time:i,speed:2,dt:1});add('survey hold objective accumulates without early completion',holdDirector.snapshot({time:2}).step===0&&holdDirector.snapshot({time:2}).holdProgress===2);holdDirector.update({x:survey.steps[0].x,z:survey.steps[0].z,time:3,speed:2,dt:1});add('survey hold objective advances at required duration',holdDirector.snapshot({time:3}).step===1);
const timeoutDirector=new WorldActivityDirector();timeoutDirector.start(rescue.id,0);add('activity fails on deadline',timeoutDirector.update({x:0,z:0,time:rescue.timeLimit,speed:0,dt:1})?.type==='failed');
add('HUD and 3D marker are integrated',html.includes('id="activityHud"')&&main.includes("activityMarker.name='world-activity-marker'")&&main.includes('renderWorldActivity'));
add('H starts or cancels world activity',main.includes("e.code==='KeyH'")&&main.includes('toggleWorldActivity()'));
add('activity rewards join progression',main.includes('metrics.activitiesCompleted++')&&main.includes('award(result.activity.reward)')&&main.includes('affinityGain(80)'));
add('activity audio feedback is complete',['activityStart','activityStep','activityComplete','activityFail'].every(cue=>audio.includes(`case'${cue}'`)&&main.includes(cue)));
add('runtime exposes activity diagnostics',main.includes('get activity(){return worldActivities.snapshot'));
add('active objective is drawn on the minimap',main.includes('activitySnapshot.target.x')&&main.includes("ctx.strokeStyle='#ffd38e'"));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 world activity checks PASS`);process.exit(failed?1:0);
