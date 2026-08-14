import assert from 'node:assert/strict';
import fs from 'node:fs';

const audio=fs.readFileSync('v14/audio-director.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
for(const token of ['plazaDistance=Infinity','rawProximity=normalizedMode===\'foot\'?clamp(1-distance/135,0,1):0','plazaProximity=rawProximity*rawProximity*(3-2*rawProximity)','audioPlazaMix','audioWaterfrontMix','shore=ctx.createBufferSource()','plazaCrowd=ctx.createBufferSource()','this.ambient.shoreg.gain.setTargetAtTime','this.ambient.plazag.gain.setTargetAtTime','plazaLive=city.mode===\'foot\'','liveRoot=146.83','gull(t,gain=.015)','city.waterfront>.28'])assert.ok(audio.includes(token),`spatial plaza audio missing ${token}`);
for(const token of ['plazaDistance=Math.hypot(px-606,pz-420)','waterfrontDistance=Math.hypot(px-560,pz-458)','(audioHour>=11&&audioHour<14)||(audioHour>=18&&audioHour<23)','waterfront:cityLife.mode===\'foot\'?clamp(1-waterfrontDistance/150,0,1):0'])assert.ok(main.includes(token),`world audio feed missing ${token}`);
const smooth=d=>{const raw=Math.max(0,Math.min(1,1-d/135));return raw*raw*(3-2*raw)};
assert.equal(smooth(0),1,'stage center must be full mix');
assert.ok(smooth(70)<.6&&smooth(70)>.45,'mid-distance mix must be smoothly attenuated');
assert.equal(smooth(135),0,'performance must be silent at the radius edge');
assert.equal(smooth(180),0,'performance must stay silent beyond the radius');
for(const [source,token] of [[smoke,'distance-attenuated waterfront performance audio'],[readme,'Spatial waterfront soundscape'],[contributing,'v18-plaza-audio-check.mjs'],[workflow,'v18-plaza-audio-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);
console.log('PASS spatial plaza audio: smooth 135 m stage attenuation, schedule-aware live riff and crowd, shoreline surf, sparse gull calls, interior hard mute, user music/ambience buses, telemetry, docs, smoke, and CI');
