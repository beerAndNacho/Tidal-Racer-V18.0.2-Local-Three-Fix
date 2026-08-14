import fs from 'node:fs';
import { DEFAULT_GAMEPAD_SETTINGS, GamepadDirector, normalizeAxis } from '../v18/input-system.js';

const tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)}),button=(value=0)=>({value,pressed:value>.55});
const makePad=({index=0,id='QA Standard Pad',axes=[0,0,0,0],values={},vibrationActuator}={})=>{const buttons=Array.from({length:16},()=>button());for(const [key,val] of Object.entries(values))buttons[Number(key)]=button(val);return{connected:true,index,id,mapping:'standard',axes,buttons,vibrationActuator}};
const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};

add('default settings are commercially sensible',DEFAULT_GAMEPAD_SETTINGS.deadzone>=.1&&DEFAULT_GAMEPAD_SETTINGS.deadzone<=.2&&DEFAULT_GAMEPAD_SETTINGS.vibration===true);
add('axis deadzone removes stick drift',normalizeAxis(.1,.14,1)===0&&normalizeAxis(-.1,.14,1)===0);
add('axis normalization preserves direction and range',normalizeAxis(.7,.14,1)>0&&normalizeAxis(-.7,.14,1)<0&&normalizeAxis(1,.14,1)===1);
add('sensitivity curve changes response',normalizeAxis(.55,.14,1.5)>normalizeAxis(.55,.14,.5));

const director=new GamepadDirector({storage});
add('no controller is a safe disconnected state',director.poll([]).connected===false);
let pad=makePad({axes:[.62,0,0,0],values:{7:.76,6:.18,0:1,5:1}}),state=director.poll([pad]),events=director.drainEvents();
add('standard pad connects with identity',state.connected&&state.id==='QA Standard Pad'&&events.some(event=>event.type==='connected'));
add('left stick and analog triggers are sampled',state.steer>.4&&state.throttle===.76&&state.brake===.18);
add('held drift and boost are sampled',state.drift===true&&state.boost===true&&state.active===true);
add('buttons held during connection do not trigger actions',!events.some(event=>event.type==='action'));

pad=makePad({values:{2:1}});director.poll([pad]);events=director.drainEvents();
add('X button creates fishing edge action',events.filter(event=>event.action==='fishingAction').length===1);
director.poll([pad]);events=director.drainEvents();add('held edge action does not repeat',events.length===0);
director.poll([makePad()]);director.drainEvents();director.poll([makePad({values:{2:1}})]);events=director.drainEvents();add('released button can trigger again',events.filter(event=>event.action==='fishingAction').length===1);

state=director.poll([makePad({values:{12:1,15:1}})]);director.drainEvents();
add('d-pad supplies digital throttle and steering fallback',state.throttle===1&&state.steer===1);

director.updateSettings({deadzone:-2,sensitivity:9,vibration:false});
add('settings are clamped and persisted',director.settings.deadzone===.05&&director.settings.sensitivity===1.5&&director.settings.vibration===false&&memory.has('tidal-racer-gamepad-v1'));
const restored=new GamepadDirector({storage});add('settings restore across sessions',restored.settings.deadzone===.05&&restored.settings.sensitivity===1.5&&restored.settings.vibration===false);

let rumble=null;const hapticDirector=new GamepadDirector({storage:{getItem:()=>null,setItem(){}}}),hapticPad=makePad({vibrationActuator:{playEffect:(type,options)=>{rumble={type,options};return Promise.resolve('complete')}}});hapticDirector.poll([hapticPad]);hapticDirector.drainEvents();
add('dual-rumble haptics receive bounded magnitudes',hapticDirector.pulse(.8,160)===true&&rumble.type==='dual-rumble'&&rumble.options.strongMagnitude===.8&&rumble.options.duration===160);
hapticDirector.updateSettings({vibration:false});add('vibration setting disables haptics',hapticDirector.pulse(1,100)===false);
state=director.poll([]);events=director.drainEvents();add('disconnect clears all live controls',!state.connected&&!state.drift&&!state.boost&&state.steer===0&&events.some(event=>event.type==='disconnected'));

const main=fs.readFileSync('v18/main.js','utf8'),html=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
add('main loop merges gamepad before physics',main.includes('updateInput();const dt=STATE.paused?0:rawDt')&&main.indexOf('updateInput();const dt=STATE.paused?0:rawDt')<main.lastIndexOf('updatePhysics(dt)')&&main.includes('liveControls.throttle-liveControls.brake'));
add('gamepad actions cover menu, racing, fishing and activities',['confirm','menuUp','menuDown','menuLeft','menuRight','item','fishingAction','activity','camera','mode','toggleFishing','skill0','skill1'].every(action=>main.includes(`event.action==='${action}'`)||main.includes(`'${action}'`))&&main.includes('navigateGamepadMenu'));
add('controller can start the game without a keyboard',main.includes("event.action==='confirm'")&&main.includes("event.action==='toggleFishing')startGame()")&&main.includes("$('#startBtn').onclick=startGame"));
add('gamepad settings and visible status UI exist',html.includes('id="gamepadStatus"')&&main.includes('data-gamepad="deadzone"')&&main.includes('data-gamepad="sensitivity"')&&main.includes('data-gamepad="vibration"'));
add('adaptive audio observes analog boost and brake',audio.includes("window.__tidalV18?.controls?.boost")&&audio.includes("window.__tidalV18?.controls?.brake"));
add('release package requires input system',policy.requiredFiles.includes('v18/input-system.js')&&policy.sourceFiles.includes('v18/input-system.js'));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} V18 gamepad checks PASS`);process.exit(failed?1:0);
