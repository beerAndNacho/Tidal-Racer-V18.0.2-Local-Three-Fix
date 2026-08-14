import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RivalTourDirector, TOUR_POINTS } from '../v18/rival-tour-system.js';

assert.deepEqual(TOUR_POINTS,[25,18,15,12,10,8,6,4,2,1,0,0]);
const rivals=Array.from({length:11},(_,index)=>({id:`rival-${index}`,name:`RIVAL ${index}`,craft:`CRAFT ${index}`,progress:1-index*.03})),player={id:'player',name:'RHEA',craft:'STORM-X'},tour=new RivalTourDirector();
let result=tour.settle({runId:'slot1-race1',eventId:'golden-circuit',player,rivals,finishOrder:[{type:'rival',index:0,position:1},{type:'player',position:2}]});
assert.ok(result.ok&&result.results.length===12,'a player finish must settle the complete twelve-rider field');
assert.equal(result.results[0].id,'rival-0');assert.equal(result.results[1].id,'player');assert.equal(result.results[2].id,'rival-1');
assert.equal(result.player.points,18);assert.equal(result.player.starts,1);assert.equal(result.featured.id,'rival-1');assert.equal(result.featured.points,15);
assert.equal(tour.settle({runId:'slot1-race1',eventId:'golden-circuit',player,rivals,finishOrder:[]}).ok,false,'a race cannot award tour points twice');
result=tour.settle({runId:'slot1-race2',eventId:'volcano-crucible',player,rivals,finishOrder:[{type:'player',position:1}]});assert.ok(result.ok);assert.equal(result.player.points,43);assert.equal(result.player.wins,1);assert.equal(result.player.podiums,2);assert.deepEqual(result.player.lastResults,[2,1]);
const saved=tour.serialize(),restored=new RivalTourDirector(saved),snapshot=restored.snapshot('player',[player,...rivals]);assert.equal(snapshot.standings.length,12);assert.equal(snapshot.player.points,43);assert.equal(snapshot.completedRounds,2);assert.deepEqual(snapshot.rounds,{'golden-circuit':1,'volcano-crucible':1});

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new RivalTourDirector','rivalTour:rivalTour.serialize()','rivalTour.restore(p.rivalTour)','function tourRoster','rivalTour.settle({runId','finishOrder:raceSnapshot.finishOrder','function renderRaceTourStrip','function renderRaceTourResult','function updateRivalTourHud'])assert.ok(main.includes(token),`rival tour runtime missing ${token}`);
for(const id of ['raceTourStrip','raceResultStandings','rivalTour'])assert.ok(index.includes(`id="${id}"`),`rival tour UI missing ${id}`);
assert.ok(policy.requiredFiles.includes('v18/rival-tour-system.js')&&policy.sourceFiles.includes('v18/rival-tour-system.js'),'release policy must ship rival tour');
console.log('PASS rival tour: full 12-rider settlement, persistent points/starts/wins/podiums/streak/recent form, duplicate protection, event rounds, selection/result/race HUD integration');
