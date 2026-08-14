import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const runtime=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_PLAZA_KIOSKS,cityPlazaKioskOffer,cityPlazaKioskStatus,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const {CITY_PLAZA_KIOSKS,cityPlazaKioskOffer,cityPlazaKioskStatus,CityLifeDirector}=runtime;

assert.deepEqual(CITY_PLAZA_KIOSKS.map(kiosk=>kiosk.id),['coast-coffee','tide-goods','night-bites']);
assert.ok(CITY_PLAZA_KIOSKS.every(kiosk=>kiosk.menu.length===3&&kiosk.dailyStock>=5),'each kiosk needs three rotating offers and bounded daily stock');
assert.notEqual(cityPlazaKioskOffer('coast-coffee',1).id,cityPlazaKioskOffer('coast-coffee',2).id,'featured offer must rotate by day');
assert.ok(cityPlazaKioskStatus('coast-coffee',8,1).open&&!cityPlazaKioskStatus('coast-coffee',18,1).open,'coffee stand must obey daytime hours');
assert.ok(cityPlazaKioskStatus('night-bites',20,1).open&&cityPlazaKioskStatus('night-bites',.5,1).open&&!cityPlazaKioskStatus('night-bites',10,1).open,'night food hours must cross midnight safely');
assert.equal(cityPlazaKioskStatus('night-bites',10,1).nextOpen,17);

const director=new CityLifeDirector();director.mode='foot';director.profile.worldHour=10;let context=director.contextAt({x:500,z:399.4});assert.equal(context.kind,'plaza-kiosk');assert.equal(context.kiosk.id,'coast-coffee');const offer=context.status.offer,beforeBank=director.profile.bankBalance,beforeEnergy=director.profile.energy;
const purchase=director.purchasePlazaKiosk('coast-coffee',0);assert.ok(purchase.ok&&purchase.paymentSource==='bank'&&purchase.bankDebit===offer.cost&&purchase.wallet===0);assert.equal(purchase.bankBalance,beforeBank-offer.cost);assert.equal(purchase.remaining,7);assert.ok(purchase.profile.energy>beforeEnergy);assert.equal(purchase.profile.kioskPurchases['coast-coffee'],1);assert.equal(purchase.profile.bankLedger.at(-1).reference,offer.name.en);
const saved=director.serialize(),restored=new CityLifeDirector(saved);assert.equal(restored.profile.kioskInventory.stock['coast-coffee'],7);assert.equal(restored.profile.kioskPurchases['coast-coffee'],1);

const broke=new CityLifeDirector();broke.mode='foot';broke.profile.worldHour=10;broke.profile.bankBalance=0;const beforeFunds=broke.serialize(),declined=broke.purchasePlazaKiosk('coast-coffee',0);assert.equal(declined.reason,'funds');assert.deepEqual(broke.serialize(),beforeFunds,'insufficient funds must not mutate profile or stock');
const closed=new CityLifeDirector();closed.mode='foot';closed.profile.worldHour=18;const beforeClosed=closed.serialize(),closedResult=closed.purchasePlazaKiosk('coast-coffee',500);assert.equal(closedResult.reason,'schedule');assert.deepEqual(closed.serialize(),beforeClosed,'closed kiosk must not mutate profile or stock');
const soldOut=new CityLifeDirector();soldOut.mode='foot';soldOut.profile.worldHour=10;soldOut.profile.kioskInventory.stock['coast-coffee']=0;const beforeSoldOut=soldOut.serialize(),soldResult=soldOut.purchasePlazaKiosk('coast-coffee',500);assert.equal(soldResult.reason,'stock');assert.deepEqual(soldOut.serialize(),beforeSoldOut,'sold-out kiosk must not mutate profile');
director.advance(24);assert.equal(director.profile.day,2);assert.equal(director.profile.kioskInventory.day,2);assert.equal(director.profile.kioskInventory.stock['coast-coffee'],8,'daily stock must replenish only after the day changes');

for(const token of ['CITY_PLAZA_KIOSKS','cityPlazaKioskOffer','cityPlazaKioskStatus','purchasePlazaKiosk(kioskId,wallet=0)','kioskInventory:{day:1','kioskPurchases:{}',"kind:'plaza-kiosk'",'plazaKioskMenuTexture','plaza-kiosk-daily-menu-board','plaza-kiosk-order-marker-','dataset.cityPlazaKiosks','dataset.cityKioskStock'])assert.ok(life.includes(token),`plaza kiosk runtime missing ${token}`);
for(const token of ['function performPlazaKioskPurchase','purchasePlazaKiosk(context.kiosk.id','dataset.lastKioskPurchase',"context.kind==='plaza-kiosk'",'kioskInventory:cityLife.profile.kioskInventory','kioskMeta=result.kiosk','dataset.kioskPurchases'])assert.ok(main.includes(token),`plaza kiosk integration missing ${token}`);
for(const [source,token] of [[smoke,'persistent daily plaza kiosk economy'],[readme,'Playable daily plaza kiosks'],[contributing,'v18-plaza-kiosk-check.mjs'],[workflow,'v18-plaza-kiosk-check.mjs']])assert.ok(source.includes(token),`release verification wiring missing ${token}`);
console.log('PASS plaza kiosk economy: three physical vendors, nine rotating offers, overnight-safe schedules, saved bounded daily stock, day reset, sold-out state, wallet/bank/split payment, ledger, needs effects, prompts, props, world menu boards, markers, telemetry, docs, smoke, and CI');
