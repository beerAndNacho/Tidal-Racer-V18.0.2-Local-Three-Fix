import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PhotoModeDirector, PHOTO_FILTERS } from '../v18/photo-mode-system.js';

assert.equal(PHOTO_FILTERS.length,5,'photo mode must ship a useful filter palette');assert.ok(PHOTO_FILTERS.every(filter=>filter.id&&filter.name&&filter.css),'filters need stable ids, labels, and CSS/canvas recipes');
const director=new PhotoModeDirector(),target={x:10,y:2,z:-4},entered=director.enter({cameraPosition:{x:10,y:7,z:6},target,fov:58});assert.ok(entered.active);assert.ok(entered.distance>11&&entered.distance<12);assert.equal(entered.fov,58);assert.equal(entered.hudVisible,false);
const initial=director.position(target);assert.ok(Math.abs(Math.hypot(initial.x-target.x,initial.y-target.y,initial.z-target.z)-entered.distance)<1e-6,'orbit position must preserve camera distance');
director.update(1,{yaw:20,pitch:20,zoom:20,fov:20});let snapshot=director.snapshot();assert.ok(snapshot.pitch<=1.12&&snapshot.distance<=48&&snapshot.fov<=78,'camera controls must clamp upper bounds');
director.update(1,{pitch:-100,zoom:-100,fov:-100});snapshot=director.snapshot();assert.ok(snapshot.pitch>=-.18&&snapshot.distance>=3&&snapshot.fov>=28,'camera controls must clamp lower bounds');
const first=director.filter.id;for(let i=0;i<PHOTO_FILTERS.length;i++)director.cycleFilter();assert.equal(director.filter.id,first,'filter palette must wrap');assert.equal(director.toggleHud(),true);director.reset();assert.equal(director.snapshot().distance,12);assert.equal(director.exit().active,false);
const filename=director.captureFilename({region:'Golden Coast',rider:'RHEA / Captain'});assert.match(filename,/^tidal-racer-golden-coast-rhea-captain-\d{8}T\d{6}Z-01\.png$/);

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new PhotoModeDirector','function enterPhotoMode','function exitPhotoMode','function updatePhotoModeCamera','function capturePhotoFrame','renderer.domElement.toBlob','createImageBitmap','canvas.toBlob',"ctx.fillText('TIDAL RACER'","#TIDALRACER",'composer.render();capturePhotoFrame()','get photo(){return photoMode.snapshot()}'])assert.ok(main.includes(token),`photo runtime missing ${token}`);
for(const id of ['photoMode','photoFilterName','photoLens','photoLocation','photoCaptureBtn','photoFilterBtn','photoHudBtn','photoExitBtn','pausePhotoBtn'])assert.ok(index.includes(`id="${id}"`),`photo UI missing ${id}`);
assert.ok(index.includes('photo-hud-hidden')&&index.includes('photoReticle'),'clean frame and reticle styles must ship');assert.ok(main.includes("e.code==='KeyP'")&&main.includes("event.action==='confirm'")&&main.includes("event.action==='camera'"),'keyboard and gamepad photo controls must be connected');
assert.ok(audio.includes("case'photoCapture'")&&main.includes("photoCapture:'포토 모드 촬영'"),'capture needs distinct audio and caption');
assert.ok(policy.requiredFiles.includes('v18/photo-mode-system.js')&&policy.sourceFiles.includes('v18/photo-mode-system.js'),'release policy must ship photo mode');

console.log('PASS photo mode: bounded orbit camera, zoom/FOV, 5 filters, clean HUD, keyboard/gamepad controls, immediate WebGL capture, branded metadata PNG, audio, and runtime diagnostics');
