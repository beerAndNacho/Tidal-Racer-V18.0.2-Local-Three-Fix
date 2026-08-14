import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FISH_SPECIES } from '../v18/fishing-system.js';
import { FISHERY_RULES, FisheryEconomyDirector, fishMarketFor } from '../v18/fishery-economy-system.js';

const clock={day:7,hour:9.5},later={day:8,hour:18},species=FISH_SPECIES.find(item=>item.id==='red-sea-bream');
const market=fishMarketFor(clock),sameMarket=fishMarketFor(clock),nextMarket=fishMarketFor({day:8,hour:9.5});
assert.deepEqual(market,sameMarket,'daily market must be deterministic');
assert.equal(market.featured.length,3,'market must feature three daily demand species');
assert.equal(new Set(market.featured).size,3,'daily demand species must be unique');
assert.ok(Object.keys(market.prices).length===FISH_SPECIES.length&&Object.values(market.prices).every(price=>price.multiplier>=.75&&price.multiplier<=1.48),'every species needs a bounded daily quote');
assert.notDeepEqual(market.prices,nextMarket.prices,'the market must change across days');

const director=new FisheryEconomyDirector(),first=director.landCatch({species,weight:4.25,value:640,quality:1.05,region:'GOLDEN COAST',isRecord:true},clock);
assert.ok(first.ok&&first.kept&&director.catches.length===1,'a valid catch must enter the insulated locker');
const fresh=director.quote(first.catch,clock),aged=director.quote(first.catch,later);
assert.equal(fresh.freshness,1,'catches stay prime for the initial insulated window');
assert.ok(aged.freshness<fresh.freshness&&aged.net<fresh.net*1.55,'freshness must decay over game time and influence settlement');
assert.equal(fresh.fee,Math.ceil(fresh.gross*FISHERY_RULES.auctionFee),'auction fee must be disclosed and exact');

const sale=director.sell(first.catch.id,clock);
assert.ok(sale.ok&&sale.net===sale.gross-sale.fee&&director.catches.length===0,'individual auction settlement must remove the catch and return net proceeds');
assert.equal(director.totals.sold,1);assert.equal(director.journal[species.id].sold,1);

const releasedCatch=director.landCatch({species,weight:3.1,value:500,region:'GOLDEN COAST'},clock),released=director.release(releasedCatch.catch.id,clock);
assert.ok(released.ok&&released.rep>0&&director.journal[species.id].released===1,'manual release must grant conservation reputation and update the journal');

const batchSpecies=FISH_SPECIES.find(item=>item.id==='silver-mackerel'),capacity=new FisheryEconomyDirector();let overflow=null;
for(let index=0;index<FISHERY_RULES.capacityCount+1;index++)overflow=capacity.landCatch({species:batchSpecies,weight:.5,value:100+index,region:'GOLDEN COAST'},clock);
assert.equal(capacity.catches.length,FISHERY_RULES.capacityCount,'locker count must never exceed capacity');
assert.ok(overflow.autoReleased.length===1&&capacity.totals.released===1,'capacity overflow must release the lowest-value lot explicitly');
const batch=capacity.sellAll(clock);assert.ok(batch.ok&&batch.count===FISHERY_RULES.capacityCount&&batch.net>0&&capacity.catches.length===0,'sell-all must settle every stored lot');

const saved=director.serialize(),restored=new FisheryEconomyDirector(saved);
assert.deepEqual(restored.serialize(),saved,'catch locker, journal, ledger, and totals must round-trip through save data');

const main=fs.readFileSync('v18/main.js','utf8'),life=fs.readFileSync('v18/city-life-system.js','utf8'),index=fs.readFileSync('index.html','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
assert.ok(main.includes("import { FisheryEconomyDirector }")&&main.includes('fishery.landCatch')&&main.includes('renderFishAuction')&&main.includes('fishery:fishery.serialize()')&&main.includes('fishery.restore(p.fishery)'),'main runtime must integrate catch, market, and persistence');
assert.ok(!main.includes('award({credits:event.value'),'landing a fish must no longer print immediate money');
assert.ok(life.includes("id:'fish-market'")&&life.includes("'fish_auction'")&&life.includes("facility.id==='fish-market'"),'Golden Coast needs a physical fish auction facility and interior');
for(const id of ['catchLockerHud','catchLockerCount','catchLockerWeight','catchLockerValue','catchLockerFill'])assert.ok(index.includes(`id="${id}"`),`catch locker HUD missing ${id}`);
for(const token of ['data-fishery-action','data-fishery-sell','data-fishery-release'])assert.ok(main.includes(token),`auction interaction missing ${token}`);
for(const cue of ["case'auctionSale'","case'fishRelease'","case'coolerFull'"])assert.ok(audio.includes(cue),`fishery audio cue missing ${cue}`);
assert.ok(policy.requiredFiles.includes('v18/fishery-economy-system.js')&&policy.sourceFiles.includes('v18/fishery-economy-system.js'),'release policy must ship the fishery economy module');

console.log(`PASS fishery economy: ${FISH_SPECIES.length} species, ${FISHERY_RULES.capacityCount} lots/${FISHERY_RULES.capacityKg} kg, freshness, demand, ${Math.round(FISHERY_RULES.auctionFee*100)}% fee, sale, release, journal, save, city auction, HUD, audio`);
