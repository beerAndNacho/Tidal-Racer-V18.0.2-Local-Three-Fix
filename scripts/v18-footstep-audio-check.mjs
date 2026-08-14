import assert from 'node:assert/strict';
import fs from 'node:fs';

const main=fs.readFileSync('v18/main.js','utf8');
const audio=fs.readFileSync('v14/audio-director.js','utf8');
const policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));

for(const token of ['footstepTravel=0','footstepIndex=0','const moved=Math.hypot(px-startX,pz-startZ)','footstepTravel+=moved','const stride=running?1.48:1.12','footstepTravel%=stride','dataset.footSurface'])assert.ok(main.includes(token),`distance-synchronized footsteps missing ${token}`);
assert.ok(main.includes("latestWeather.surfaceWetness>.28?'Wet':'Street'"),'outdoor footsteps must respond to persistent surface wetness');
assert.ok(main.includes("['marina-workshop','fish-market'].includes(cityLife.facilityId)")&&main.includes("metal?'Metal':'Interior'"),'interior footsteps must distinguish industrial and general venue floors');
assert.ok(main.includes("audioDirector.cue(`footstep${surface}`,running?.64:.44)")&&main.includes("if(running&&footstepIndex%2===0)gamepadDirector.pulse(.055,26)"),'stride events must drive pace-scaled sound and restrained running haptics');
assert.ok(main.includes("if(!accessibility.captions||name.startsWith('footstep'))return"),'repetitive footsteps must not spam accessibility captions');
for(const cue of ['footstepStreet','footstepWet','footstepInterior','footstepMetal'])assert.ok(audio.includes(`case'${cue}'`),`audio synthesis missing ${cue}`);
assert.ok(audio.includes("&&this.cityContext.mode==='water')this.cue('boostIgnite',.7)"),'on-foot sprint must not trigger the watercraft boost ignition cue');
assert.ok(policy.requiredFiles.includes('v18/main.js')&&policy.requiredFiles.includes('v14/audio-director.js'),'release policy must ship footsteps and their synthesis');

console.log('PASS footstep audio: actual-distance cadence, walk/run stride, dry/wet/indoor/metal surfaces, restrained haptics, caption suppression, and no false sprint boost cue');
