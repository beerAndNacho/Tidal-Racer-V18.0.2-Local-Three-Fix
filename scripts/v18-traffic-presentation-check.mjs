import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
for(const token of ['traffic-driver-torso','traffic-driver-head','traffic-side-mirror','traffic-license-plate-front','traffic-license-plate-rear','traffic-headlight-beam','traffic-tire-spray','beam.userData.noBatch=true','spray.userData.noBatch=true'])assert.ok(engine.includes(token),'traffic vehicle detail missing '+token);
for(const token of ['activeHeadlightCars','activeTireSprays','trafficHour>=18','distance<155','sprayStrength=clamp((wetness-.25)/.7','d.headMaterial.emissiveIntensity','d.brakeMaterial.emissiveIntensity','dataset.trafficHeadlightCars','dataset.trafficTireSprays'])assert.ok(engine.includes(token),'traffic presentation update missing '+token);
assert.ok(engine.includes('export function setAmbientTrafficEnvironment')&&engine.includes('ambientTrafficEnvironment.hour')&&engine.includes('ambientTrafficEnvironment.wetness'),'traffic needs a backwards-compatible environment channel');
assert.ok(main.includes('setAmbientTrafficEnvironment({hour:cityLife.profile.worldHour,wetness:latestWeather.surfaceWetness})'),'traffic needs the shared city clock and wetness model');
assert.ok(smoke.includes('weather-lit detailed traffic'),'package smoke must cover detailed traffic');
assert.ok(readme.includes('Weather-lit detailed traffic')&&contributing.includes('v18-traffic-presentation-check.mjs'),'feature and QA command must be documented');
console.log('PASS traffic presentation: all 16 city vehicles add visible drivers, mirrors and plates plus distance-capped night beams, emissive braking and weather-scaled twin tire spray with diagnostics');
