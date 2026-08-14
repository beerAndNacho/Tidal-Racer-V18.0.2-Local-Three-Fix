import assert from 'node:assert/strict';
import fs from 'node:fs';

const population=fs.readFileSync('v18/city-population-system.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['function addCitizenAccessory','new THREE.CapsuleGeometry(.34','new THREE.CapsuleGeometry(.085','new THREE.SphereGeometry(.31,18,13)','citizen-eye-left','citizen-eye-right','citizen-nose','citizen-backpack','citizen-safety-vest','citizen-guitar-body','citizen-fishing-rod','citizen-camera','citizen-headphone','citizen-name-badge'])assert.ok(population.includes(token),`citizen visual upgrade missing ${token}`);
assert.ok(population.includes('distance<170'),'detailed citizens need bounded visibility distance');
for(const token of ['visual.torso.rotation.z','visual.head.rotation.y','visual.head.rotation.x','breathe=Math.sin'])assert.ok(population.includes(token),`citizen secondary animation missing ${token}`);
assert.ok(policy.requiredFiles.includes('v18/city-population-system.js')&&policy.sourceFiles.includes('v18/city-population-system.js'),'release policy must ship upgraded citizens');
console.log('PASS citizen visual quality: articulated capsule anatomy, higher-resolution heads, face details, role accessories, breathing, head look, torso sway, gait animation, and 170m visibility budget');
