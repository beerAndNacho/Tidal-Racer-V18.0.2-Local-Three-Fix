import assert from 'node:assert/strict';
import fs from 'node:fs';

const audio=fs.readFileSync('v14/audio-director.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['this.cityContext={mode:\'water\'','setCityContext({mode=\'water\'','audioTravelMode','audioVenue','street=ctx.createBufferSource()','crowd=ctx.createBufferSource()','room=ctx.createBufferSource()','hum=ctx.createOscillator()','crowdByVenue','humByVenue','rush=hour>=7','facilityId===\'nightlife\'','facilityId===\'marina-workshop\''])assert.ok(audio.includes(token),`adaptive city ambience missing ${token}`);
assert.ok(audio.includes("const waterMode=this.cityContext.mode==='water'")&&audio.includes('this.paused||!waterMode?0'),'on-foot and indoor contexts must hard-mute the synthesized craft engine');
assert.ok(audio.includes("city.mode==='interior'?venueTempo")&&audio.includes("city.facilityId==='home'?78:88"),'interiors need venue-aware score tempo');
assert.ok(audio.includes("city.facilityId==='nightlife'?6200")&&audio.includes("city.mode==='foot'?.32"),'music filtering and intensity must react to venue and walking mode');
assert.ok(main.includes('audioDirector.setCityContext({mode:cityLife.mode,facilityId:cityLife.facilityId,hour:audioHour,plazaDistance,plazaPerformance:'),'the world loop must feed travel mode, venue, time, plaza range, show schedule, and waterfront range to audio');
assert.ok(policy.requiredFiles.includes('v14/audio-director.js')&&policy.sourceFiles.includes('v14/audio-director.js'),'release policy must ship adaptive city audio');
console.log('PASS city audio: water/foot/interior context, engine hard mute ashore, street traffic, time-of-day crowds, room tone, venue hum, venue tempo/filter/intensity, and local release integration');
