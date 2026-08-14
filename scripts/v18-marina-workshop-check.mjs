import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CRAFTS } from '../data-v12.js';
import { CRAFT_PRICES, WORKSHOP_UPGRADES, MarinaWorkshopDirector } from '../v18/marina-workshop-system.js';
import { FisheryEconomyDirector } from '../v18/fishery-economy-system.js';

assert.equal(CRAFTS.length,10);assert.ok(CRAFTS.every(craft=>Number.isFinite(CRAFT_PRICES[craft.id])),'all ten craft need explicit prices');assert.equal(Object.keys(WORKSHOP_UPGRADES).length,4);assert.ok(Object.values(WORKSHOP_UPGRADES).every(definition=>definition.maxLevel===4),'all workshop paths need four authored levels');

const workshop=new MarinaWorkshopDirector();assert.deepEqual(workshop.snapshot().owned,['storm-x']);assert.equal(workshop.equipped,'storm-x');
const denied=workshop.purchase('barracuda',1000);assert.equal(denied.ok,false);assert.equal(denied.reason,'wallet');
const purchase=workshop.purchase('manta-r',20000);assert.ok(purchase.ok&&purchase.wallet===4000&&workshop.isOwned('manta-r')&&workshop.equipped==='manta-r','purchase must charge, own, and equip a craft');

const base=workshop.performance(),engine=workshop.upgrade('engine',100000),handling=workshop.upgrade('handling',100000),hull=workshop.upgrade('hull',100000),cooler=workshop.upgrade('cooler',100000),tuned=workshop.performance();
assert.ok(engine.ok&&handling.ok&&hull.ok&&cooler.ok);assert.ok(tuned.max>base.max&&tuned.accel>base.accel&&tuned.turn>base.turn&&tuned.stability>base.stability,'four upgrade paths must affect real performance');assert.ok(tuned.damageResistance>base.damageResistance);assert.deepEqual(tuned.coolerBonus,{count:2,kg:25});

for(let level=1;level<4;level++)assert.ok(workshop.upgrade('engine',100000).ok);assert.equal(workshop.upgrade('engine',100000).reason,'maxed');
const beforeImpact=workshop.performance(),damage=workshop.applyDamage(20,'manta-r','test-impact'),damaged=workshop.performance();assert.ok(damage.ok&&damage.applied<20&&damaged.condition<100&&damaged.max<beforeImpact.max,'hull resistance must reduce damage while condition lowers effective performance');
const serviceQuote=workshop.serviceQuote(),service=workshop.service(serviceQuote.cost);assert.ok(service.ok&&service.wallet===0&&workshop.performance().condition===100,'paid service must fully restore condition');
workshop.applyDamage(12);const fieldRepair=workshop.repair(5);assert.ok(fieldRepair.ok&&fieldRepair.restored===5,'field repair must restore a bounded amount without erasing all wear');

const fishery=new FisheryEconomyDirector(),capacity=fishery.setCapacityBonus(workshop.performance().coolerBonus);assert.equal(capacity.count,26);assert.equal(capacity.kg,345);for(let level=1;level<4;level++)workshop.upgrade('cooler',100000);const maxCapacity=fishery.setCapacityBonus(workshop.performance().coolerBonus);assert.equal(maxCapacity.count,32);assert.equal(maxCapacity.kg,420,'locker upgrade must reach but not exceed the authored maximum');

const saved=workshop.serialize(),restored=new MarinaWorkshopDirector(saved);assert.deepEqual(restored.serialize(),saved,'ownership, equipped craft, upgrades, condition, history, and totals must survive save/restore');

const main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new MarinaWorkshopDirector','workshop:workshop.serialize()','workshop.restore(p.workshop)','function effectiveCraft()','workshop.applyDamage','workshop.addWear','workshop.repair(18','renderWorkshop','renderCraftGrid'])assert.ok(main.includes(token),`runtime integration missing ${token}`);
for(const attribute of ['data-workshop-action','data-workshop-upgrade','data-workshop-craft'])assert.ok(main.includes(attribute),`workshop interaction missing ${attribute}`);
assert.ok(life.includes("id:'marina-workshop'")&&life.includes("'marina_workshop'")&&life.includes('golden-coast-nine-facilities-v5'),'Golden Coast must contain a physical ninth marina facility and interior');
assert.ok(index.includes('id="craftCondition"')&&index.includes("data-view='workshop'")&&index.includes('workshopSummary'),'condition HUD and workshop panel styles must ship');
for(const cue of ["case'workshopPurchase'","case'workshopUpgrade'","case'workshopRepair'","case'craftDamage'"])assert.ok(audio.includes(cue),`workshop audio missing ${cue}`);
assert.ok(policy.requiredFiles.includes('v18/marina-workshop-system.js')&&policy.sourceFiles.includes('v18/marina-workshop-system.js'));

console.log(`PASS marina workshop: ${CRAFTS.length} priced craft, ownership, four 4-level upgrade paths, damage, condition performance, service, repair, ${maxCapacity.count} lot/${maxCapacity.kg} kg locker, save, city facility, HUD, and audio`);
