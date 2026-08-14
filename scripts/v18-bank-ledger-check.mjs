import assert from 'node:assert/strict';
import fs from 'node:fs';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from '../v18/lifestyle-effect-system.js';

const lifeSource=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
const core=lifeSource.slice(lifeSource.indexOf('const clamp='),lifeSource.indexOf('function physical(')).replaceAll('export ','');
const {CITY_DOCK,CityLifeDirector}=new Function('grantLifestyleEffect','resolveLifestyleBonuses','lifestyleClock','pruneLifestyleEffects','lifestyleEffectFor',`${core};return {CITY_DOCK,CityLifeDirector};`)(grantLifestyleEffect,resolveLifestyleBonuses,lifestyleClock,pruneLifestyleEffects,lifestyleEffectFor);
const enter=(director,id)=>{director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});assert.equal(director.enter(id).ok,true);return director};

const diner=enter(new CityLifeDirector(),'restaurant'),split=diner.perform('seafood_bowl',200);
assert.ok(split.ok,'combined wallet and bank funds should authorize a venue purchase');
assert.equal(split.wallet,0,'split payment should consume available wallet funds first');
assert.equal(split.bankDebit,580,'bank card should cover only the remaining venue price');
assert.equal(split.bankBalance,4420,'card debit should reduce saved account balance');
assert.equal(split.paymentSource,'split','mixed payment source should be explicit');
assert.equal(split.profile.bankLedger.length,1,'card purchase should write one statement entry');
assert.equal(split.profile.bankLedger[0].amount,-580,'statement should store signed account movement');
assert.equal(split.profile.bankLedger[0].reference,'SEAFOOD RICE BOWL');

const cardOnly=enter(new CityLifeDirector(),'restaurant').perform('breakfast',0);
assert.ok(cardOnly.ok&&cardOnly.paymentSource==='bank'&&cardOnly.bankDebit===310,'bank card should support the active rounded daily-program price');

const broke=enter(new CityLifeDirector({profile:{bankBalance:100}}),'restaurant'),declined=broke.perform('chef_course',50);
assert.equal(declined.reason,'funds','combined insufficient funds must decline before the routine');
assert.equal(declined.wallet,50);assert.equal(declined.bankBalance,100);assert.equal(broke.profile.bankLedger.length,0,'declined payments must not enter the ledger');

const bank=enter(new CityLifeDirector(),'bank'),deposit=bank.perform('deposit_1000',2000),withdrawal=bank.perform('withdraw_1000',deposit.wallet);
assert.ok(deposit.ok&&withdrawal.ok,'bank transfer actions should remain available');
assert.deepEqual(bank.profile.bankLedger.map(entry=>entry.type),['deposit','withdrawal']);
assert.deepEqual(bank.profile.bankLedger.map(entry=>entry.amount),[1000,-1000]);
assert.equal(withdrawal.wallet,2000);assert.equal(withdrawal.bankBalance,5000,'paired transfer should conserve funds');

const restored=new CityLifeDirector(diner.serialize());
assert.deepEqual(restored.profile.bankLedger,diner.profile.bankLedger,'statement must round-trip through saves');
for(let index=0;index<30;index++)restored.recordBankEntry('card',-1,`TEST ${index}`,restored.profile.bankBalance);
assert.equal(restored.profile.bankLedger.length,24,'statement history must stay bounded at 24 entries');
assert.equal(restored.profile.bankLedger[0].reference,'TEST 6','bounded history should retain the newest entries');
assert.equal(new CityLifeDirector({profile:{bankLedger:[{type:'bad',amount:'x'}]}}).profile.bankLedger.length,0,'invalid saved statement entries must be ignored');

for(const token of ['function bankStatementCard','DEBIT ENABLED','dataset.lastPaymentSource','dataset.bankLedgerEntries','bankDebit.toLocaleString()'])assert.ok(main.includes(token),'bank runtime presentation missing '+token);
for(const token of ['bankStatementCard','RECENT ACCOUNT ACTIVITY','credit','debit'])assert.ok(index.includes(token)||main.includes(token),'bank statement UI missing '+token);
console.log('PASS bank ledger: wallet-first split debit, card-only payment, combined-fund decline safety, signed transfers, bounded saved statement, invalid-record filtering, account UI, sequence receipt, and telemetry');
