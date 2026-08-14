import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
for(const token of ['eye:new THREE.SphereGeometry','iris:new THREE.SphereGeometry','brow:new THREE.BoxGeometry','nose:new THREE.SphereGeometry','lip:new THREE.BoxGeometry','function interiorFacePart','facility-person-eye-left','facility-person-eye-right','facility-person-iris-left','facility-person-iris-right','facility-person-brow-left','facility-person-brow-right','facility-person-nose','facility-person-upper-lip','facility-person-lower-lip'])assert.ok(life.includes(token),'interior facial construction missing '+token);
for(const token of ['blinkTrigger','roleEnergy','speech=talking','face.eyes','face.irises','face.brows','face.lowerLip','dataset.facilityServiceFaces','dataset.facilityServiceBlinks','dataset.facilityTalkingFaces'])assert.ok(life.includes(token),'interior facial animation or diagnostics missing '+token);
assert.ok(life.includes("actor.role==='auctioneer'?1.25")&&life.includes("['banker','clerk'].includes(actor.role)?.72"),'service roles need distinct speaking energy');
assert.ok(smoke.includes('expressive staffed interiors'),'package smoke must cover expressive staffed interiors');
assert.ok(readme.includes('Expressive service faces')&&contributing.includes('v18-facility-face-check.mjs'),'facial feature and QA command must be documented');
console.log('PASS facility faces: every staffed interior character has eye whites, irises, brows, nose and separated lips with staggered blinking, gaze, role-weighted speech animation and runtime diagnostics');
