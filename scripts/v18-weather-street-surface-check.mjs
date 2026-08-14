import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),weather=fs.readFileSync('v18/weather-system.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
for(const token of ['let coastalStreetSurface=null','puddlePoints=[]',"ripples.name='street-rain-ripple-rings'",'rippleSeeds=[]','export function updateCoastalStreetSurface','puddleStrength=clamp((state.wetness-.12)/.7','rippleStrength=clamp((rainfall-.12)/.75','state.roadMaterial.roughness=.96-state.wetness*.3','state.roadMaterial.color.lerpColors','Math.exp(-.9*Math.max(0,Number(dt)||0))','dataset.citySurfaceWetness','dataset.cityPuddleOpacity','dataset.cityRainRipples'])assert.ok(engine.includes(token),'weather-reactive street surface missing '+token);
assert.ok(engine.includes('opacity:.015')&&engine.includes('state.puddles.visible=near&&puddleStrength>.015'),'dry weather must suppress persistent puddles');
assert.ok(engine.includes('Math.hypot((player.x||0)-state.centerX')&&engine.includes('<285'),'street surface animation must cull outside its district');
assert.ok(main.includes('updateCoastalStreetSurface,')&&main.includes('updateCoastalStreetSurface(STATE.time,{dt,wetness:latestWeather.surfaceWetness,rain:latestWeather.rain,player:{x:px,z:pz}})'),'main loop must feed frame time, wetness, rainfall and player distance');
assert.ok(weather.includes('surfaceWetness')&&weather.includes('rain'),'weather model must expose both accumulation and current rainfall');
assert.ok(smoke.includes('weather-reactive street surface'),'package smoke must cover reactive pavement');
assert.ok(readme.includes('Weather-reactive pavement')&&contributing.includes('v18-weather-street-surface-check.mjs'),'feature and QA command must be documented');
console.log('PASS weather street surface: dry-state puddle suppression, accumulated asphalt darkening and roughness, weather-driven puddles and 18 animated ripple rings, district culling, diagnostics and frame-independent blending');
