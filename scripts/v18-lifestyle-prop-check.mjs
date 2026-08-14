import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8');
const readme=fs.readFileSync('README.md','utf8');
const contributing=fs.readFileSync('CONTRIBUTING.md','utf8');
const workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
const literal=life.match(/export const FOOT_LIFESTYLE_PROP_ACTIONS=Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(literal,'lifestyle prop action map must be exported and deterministic');
const actions=Function(`return (${literal[1]})`)();

assert.equal(Object.keys(actions).length,36,'every authored lifestyle, public-space, kiosk, and courier sequence needs a contextual object');
assert.deepEqual(new Set(Object.values(actions)),new Set(['pillow','remote','phone','towel','meal','cup','grocery-bag','bank-card','glow-sticks','dumbbells','delivery-box']),'eleven distinct prop groups should cover rest, hygiene, meals, shopping, finance, leisure, training, and courier work');
for(const action of ['sleep','shower','home_meal','coffee','groceries','deposit_1000','withdraw_5000','live_music','dance','cardio','strength','stretch'])assert.ok(actions[action],`missing contextual prop for ${action}`);
for(const action of ['plaza_rest','plaza_performance','plaza_view'])assert.ok(actions[action],`missing public-space prop for ${action}`);
for(const action of ['dockside_flat_white','salted_caramel_cold_brew','citrus_tonic_coffee','harbor_sun_kit','waterproof_postcards','angler_trail_pack','grilled_mackerel_wrap','spicy_squid_cup','tide_market_noodles'])assert.ok(actions[action],`missing plaza kiosk prop for ${action}`);
for(const token of ['function buildFootLifestyleProps','function setFootLifestyleProp','disposeFootAvatarEnhancements',"bones['hand.L']","bones['hand.R']",'foot-prop-meal-bowl','foot-prop-cup-body','foot-prop-grocery-bag-body','foot-prop-bank-card-chip','foot-prop-dumbbell-plate','foot-prop-glow-stick','foot-prop-phone-screen','foot-prop-pillow-body','foot-prop-delivery-box-body',"group.visible=id===active",'footGeneratedRoot','geometry.dispose()','material.dispose()','dataset.footLifestyleProp','eleven-context-prop-groups-v1'])assert.ok(life.includes(token),`lifestyle prop runtime missing ${token}`);
assert.ok(main.includes('actionId:lifeSequence?.id||')&&main.includes("deliveryRun?.carryingParcel?'delivery_carry'")&&main.includes("nightlifeRhythm?'dance':null"),'life sequence, courier, or playable dance must send its exact action id to the avatar prop director');
assert.ok(main.includes('disposeFootAvatarEnhancements(footAvatar);scene.remove(footAvatar)'),'rider changes must dispose only generated avatar enhancements before replacement');
for(const [source,token] of [[smoke,'contextual lifestyle props'],[readme,'Contextual lifestyle props'],[contributing,'v18-lifestyle-prop-check.mjs'],[workflow,'v18-lifestyle-prop-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);

console.log('PASS lifestyle props: 36 routine mappings, eleven hand-bone prop groups, meal, drink, shopping, banking, hygiene, rest, leisure, training, courier, public-space and plaza-kiosk visuals, exact action routing, telemetry, docs, smoke, and CI');
