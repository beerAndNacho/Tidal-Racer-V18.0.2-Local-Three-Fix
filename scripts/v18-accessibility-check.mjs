import fs from 'node:fs';

const main=fs.readFileSync('v18/main.js','utf8');
const audio=fs.readFileSync('v14/audio-director.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const tests=[];
const add=(name,ok)=>tests.push({name,ok:Boolean(ok)});

add('settings tab is available',html.includes('data-tab="settings"')&&main.includes("tab==='settings'"));
add('five channel audio mixer is exposed',['master','music','sfx','engine','ambient'].every(channel=>main.includes(`${channel}:`))&&main.includes('data-volume='));
add('audio volumes persist',audio.includes("tidal-racer-audio-settings")&&audio.includes('setVolume(channel,value)'));
add('reduced effects setting persists',main.includes('reducedEffects:false')&&main.includes("classList.toggle('reduced-effects'"));
add('reduced effects disables camera shake',main.includes('accessibility.reducedEffects?0:Math.sin(STATE.time*28)'));
add('reduced effects disables speed presentation',main.includes('boosting&&!accessibility.reducedEffects')&&main.includes("speedFx.style.opacity=accessibility.reducedEffects?'0'"));
add('high contrast HUD mode exists',main.includes("classList.toggle('high-contrast'")&&html.includes('body.high-contrast #hud'));
add('audio captions are live and configurable',html.includes('id="audioCaption"')&&html.includes('aria-live="polite"')&&main.includes('AUDIO_CAPTIONS'));
add('audio cues dispatch caption events',audio.includes("new CustomEvent('tidal-audio-cue'"));
add('key bindings persist',main.includes('controls:controlBindings')&&main.includes('saved.controls'));
add('direction arrows are permanently retained',main.includes("code.startsWith('Arrow')")&&main.includes("['up','down','left','right'].includes(action)"));
add('key remapping and reset controls exist',main.includes('data-remap=')&&main.includes('data-reset-bindings')&&main.includes('remapAction'));

let failed=0;
for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}
console.log(`\n${tests.length-failed}/${tests.length} V18 accessibility checks PASS`);
process.exit(failed?1:0);
