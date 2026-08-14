import assert from 'node:assert/strict';
import fs from 'node:fs';
import { StoryMissionDirector, TIDEBOUND_STORIES } from '../v18/story-mission-system.js';

assert.equal(TIDEBOUND_STORIES.length,6,'campaign must contain six authored chapters');
assert.ok(TIDEBOUND_STORIES.every((mission,index)=>mission.chapter===index+1&&mission.title.ko&&mission.title.en&&mission.intro.ko&&mission.intro.en&&mission.outro.ko&&mission.outro.en&&mission.giver&&mission.objectives.length>=2&&mission.reward.credits>0),'every chapter needs bilingual narrative, a named giver, sequential objectives, and rewards');
const objectiveIds=TIDEBOUND_STORIES.flatMap(mission=>mission.objectives.map(objective=>objective.id));assert.equal(new Set(objectiveIds).size,objectiveIds.length,'objective ids must be unique');assert.ok(TIDEBOUND_STORIES.flatMap(mission=>mission.objectives).every(objective=>objective.name.ko&&objective.name.en&&objective.brief.ko&&objective.brief.en&&Number.isFinite(objective.waypoint.x)&&Number.isFinite(objective.waypoint.z)),'every objective needs bilingual copy and an authored waypoint');
for(const event of ['visit','talk','race','fish','fishSale','life','activity','harborComplete'])assert.ok(TIDEBOUND_STORIES.some(mission=>mission.objectives.some(objective=>objective.event===event)),`campaign must bridge ${event}`);

const director=new StoryMissionDirector();let snapshot=director.snapshot();assert.equal(snapshot.state,'available');assert.equal(snapshot.mission.id,'first-current');assert.deepEqual(snapshot.waypoint.x,223);
const accepted=director.accept();assert.ok(accepted.ok&&director.active.id==='first-current'&&director.objective.id==='visit-workshop');assert.equal(director.record('visit',{facilityId:'bank'}),null,'wrong payload must not progress a story');
let event=director.record('visit',{facilityId:'marina-workshop'});assert.equal(event.type,'stage');assert.equal(event.next.id,'meet-noah');assert.equal(director.record('talk',{npcId:'yuri-tan'}),null);event=director.record('talk',{npcId:'noah-reed'});assert.equal(event.type,'stage');assert.equal(director.record('race',{position:9}),null,'first race objective requires eighth or better');event=director.record('race',{position:8});assert.equal(event.type,'ready');assert.equal(director.snapshot().state,'ready');
const claim=director.claim();assert.ok(claim.ok&&claim.reward.credits===2800&&claim.next.id==='market-current'&&director.completed.includes('first-current'));assert.equal(director.snapshot().state,'available');

director.accept();director.record('fish',{count:1,rarity:'common',region:'GOLDEN COAST'});event=director.record('fish',{count:1,rarity:'common',region:'GOLDEN COAST'});assert.equal(event.type,'stage');assert.equal(director.objective.id,'auction-value');assert.equal(director.record('fishSale',{value:700}).type,'progress');event=director.record('fishSale',{value:500});assert.equal(event.type,'stage');assert.equal(director.objective.id,'chef-bowl');event=director.record('life',{facilityId:'restaurant',actionId:'seafood_bowl'});assert.equal(event.type,'ready');

const saved=director.serialize(),restored=new StoryMissionDirector(saved);assert.deepEqual(restored.serialize(),saved,'active chapter, stage, progress, completion, and log must survive save/restore');
const finalState=new StoryMissionDirector({completed:TIDEBOUND_STORIES.map(mission=>mission.id)});assert.equal(finalState.snapshot().state,'complete');assert.equal(finalState.snapshot().waypoint,null);

const main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new StoryMissionDirector','story:storyMissions.serialize()','storyMissions.restore(p.story)','function recordStoryEvent','function renderStoryBoard','function renderStoryHud','function updateStoryWaypoint','tidebound-story-waypoint','get story(){return storyMissions.snapshot()'])assert.ok(main.includes(token),`story runtime missing ${token}`);
for(const event of ['talk','race','fish','fishSale','life','activity','harborComplete','visit'])assert.ok(main.includes(`recordStoryEvent('${event}'`),`main event bridge missing ${event}`);
assert.ok(life.includes("'story_board'")&&life.includes('TIDEBOUND STORIES'),'Harbor Office needs a separate story desk');
for(const id of ['storyHud','storyChapter','storyTitle','storyObjective','storySpeaker','storyStep','storyDistance','storyFill'])assert.ok(index.includes(`id="${id}"`),`story HUD missing ${id}`);
assert.ok(index.includes("data-view='story'")&&index.includes('storyMissionCard'),'story board presentation must ship');
for(const cue of ["case'storyAccept'","case'storyProgress'","case'storyStage'","case'storyReady'","case'storyComplete'"])assert.ok(audio.includes(cue),`story audio missing ${cue}`);
assert.ok(policy.requiredFiles.includes('v18/story-mission-system.js')&&policy.sourceFiles.includes('v18/story-mission-system.js'));

console.log(`PASS Tidebound Stories: ${TIDEBOUND_STORIES.length} bilingual chapters, sequential filters, ${objectiveIds.length} objectives, 8 gameplay bridges, world/minimap waypoint, dialogue, rewards, save, Harbor desk, HUD, and audio`);
