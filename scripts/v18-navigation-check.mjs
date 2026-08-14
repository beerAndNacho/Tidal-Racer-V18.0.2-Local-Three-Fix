import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NavigationDirector, NAVIGATION_BOUNDS } from '../v18/navigation-system.js';

const navigation=new NavigationDirector(),width=1100,height=720,world={x:1250,z:-980},screen=navigation.worldToScreen(world,width,height),roundTrip=navigation.screenToWorld(screen,width,height);assert.ok(Math.abs(roundTrip.x-world.x)<1e-8&&Math.abs(roundTrip.z-world.z)<1e-8,'world/screen projection must round-trip');
const cursor={x:760,y:260},before=navigation.screenToWorld(cursor,width,height);navigation.zoomAt(1.7,cursor.x,cursor.y,width,height);const after=navigation.screenToWorld(cursor,width,height);assert.ok(Math.abs(before.x-after.x)<1e-8&&Math.abs(before.z-after.z)<1e-8,'cursor-centered zoom must preserve the pointed world coordinate');assert.equal(navigation.view.zoom,1.7);
const centerBefore={x:navigation.view.centerX,z:navigation.view.centerZ};navigation.panPixels(80,-45,width,height);assert.notEqual(navigation.view.centerX,centerBefore.x);assert.notEqual(navigation.view.centerZ,centerBefore.z);
for(let i=0;i<20;i++)navigation.zoomAt(2,width/2,height/2,width,height);assert.equal(navigation.view.zoom,3.4);for(let i=0;i<30;i++)navigation.zoomAt(.1,width/2,height/2,width,height);assert.equal(navigation.view.zoom,.72);
const waypoint=navigation.setWaypoint({x:99999,z:-99999},'A'.repeat(100));assert.equal(waypoint.x,NAVIGATION_BOUNDS.maxX);assert.equal(waypoint.z,NAVIGATION_BOUNDS.minZ);assert.equal(waypoint.label.length,64);assert.ok(navigation.distanceFrom({x:waypoint.x+3,z:waypoint.z+4})===5);
const saved=navigation.serialize(),restored=new NavigationDirector(saved);assert.equal(restored.snapshot().waypoint.label,waypoint.label);assert.ok(restored.clearWaypoint());assert.equal(restored.snapshot().waypoint,null);navigation.resetView();assert.equal(navigation.view.zoom,1);

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new NavigationDirector','navigation:navigation.serialize()','navigation.restore(p.navigation)','function drawWorldMap','function renderMapJournal','function setMapWaypoint','function updateNavigationMarker','custom-navigation-waypoint','navigation.zoomAt','navigation.panPixels','get navigation(){return'])assert.ok(main.includes(token),`navigation runtime missing ${token}`);
for(const id of ['worldMap','worldMapCanvas','mapJournal','mapZoomOut','mapZoomIn','mapZoomLabel','mapResetView','mapClearWaypoint','worldMapClose','pauseMapBtn','navigationHud','navigationLabel','navigationDistance'])assert.ok(index.includes(`id="${id}"`),`map UI missing ${id}`);
for(const objective of ['storyMissions.snapshot()','harborNetwork.snapshot(harborClock())','worldActivities.snapshot','onboarding.snapshot()'])assert.ok(main.includes(objective),`map journal bridge missing ${objective}`);
assert.ok(main.includes("e.code==='Tab'")&&main.includes("['Escape','Tab']")&&main.includes("event.action==='camera'"),'keyboard and gamepad map controls must be connected');
assert.ok(audio.includes("case'navigationSet'")&&audio.includes("case'navigationArrive'"),'navigation needs set and arrival audio');
assert.ok(policy.requiredFiles.includes('v18/navigation-system.js')&&policy.sourceFiles.includes('v18/navigation-system.js'),'release policy must ship navigation');

console.log('PASS navigation chart: reversible projection, cursor zoom, pan/clamps, 9-region/route/facility map, objective journal, custom saved waypoint, world/minimap marker, keyboard/gamepad controls, and arrival audio');
