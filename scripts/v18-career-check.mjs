import fs from 'node:fs';
import { CareerDirector, CAREER_CHAPTERS } from '../v18/career-system.js';

const main=fs.readFileSync('v18/main.js','utf8'),html=fs.readFileSync('index.html','utf8'),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)}),metrics={distance:100,regionsVisited:1,fishCaught:0,rareFish:0,skillUses:0,itemPickups:0,races:0,wins:0,activitiesCompleted:0};
const career=new CareerDirector();career.start(metrics);
add('eight authored career chapters',CAREER_CHAPTERS.length===8&&CAREER_CHAPTERS.every(chapter=>chapter.objectives.length&&chapter.reward.credits>0));
add('career progress starts from activation baseline',career.snapshot({...metrics,distance:749}).objectives[0].value===649);
add('incomplete objective does not advance',career.update({...metrics,distance:749})===null&&career.index===0);
const first=career.update({...metrics,distance:750});add('completed chapter advances sequentially',first?.chapter.id==='first-wake'&&career.index===1&&career.current.id==='coastline-survey');
const saved=career.serialize(),restored=new CareerDirector();restored.restore(saved,{...metrics,distance:750});add('career state persists baseline and chapter',restored.index===1&&restored.completed.includes('first-wake')&&restored.baseline.distance===750);
const fast=new CareerDirector(),state={distance:0,regionsVisited:0,fishCaught:0,rareFish:0,skillUses:0,itemPickups:0,races:0,wins:0,activitiesCompleted:0};fast.start(state);while(fast.current){for(const objective of fast.current.objectives)state[objective.metric]+=objective.target;fast.update(state)}
add('final chapter reaches complete state',fast.snapshot(state).status==='complete'&&fast.completed.length===CAREER_CHAPTERS.length);
add('career rewards wired into player economy',main.includes('award(result.chapter.reward)')&&main.includes('career:career.serialize()'));
add('race exploration fishing metrics connected',main.includes('metrics.fishCaught++')&&main.includes('regionsVisited:visitedRegions.size')&&main.includes('metrics.races++'));
add('world activities gate late career mastery',CAREER_CHAPTERS.filter(chapter=>chapter.objectives.some(objective=>objective.metric==='activitiesCompleted')).length===2&&main.includes('activitiesCompleted:metrics.activitiesCompleted'));
add('career HUD has progress and reward',html.includes('id="careerHud"')&&html.includes('id="careerFill"')&&html.includes('id="careerReward"'));
add('runtime career diagnostics exposed',main.includes('get career(){return career.snapshot(careerMetrics())}')&&main.includes('dataset.careerProgress'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 career checks PASS`);process.exit(failed?1:0);
