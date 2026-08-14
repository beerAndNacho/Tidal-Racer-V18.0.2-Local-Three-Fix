import { FISH_SPECIES } from './fishing-system.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round2=value=>Math.round(value*100)/100;
const speciesById=new Map(FISH_SPECIES.map(species=>[species.id,species]));
const rarityReleaseRep={common:1,uncommon:2,rare:5,epic:9,legendary:16};

export const FISHERY_RULES=Object.freeze({
  capacityCount:24,
  capacityKg:320,
  maxCapacityCount:32,
  maxCapacityKg:420,
  auctionFee:.08,
  fullFreshHours:6,
  freshnessDecayPerHour:.0225,
  minimumFreshness:.28,
  ledgerLimit:60,
});

function absoluteHour(clock={}){
  const day=Math.max(1,Math.floor(Number(clock.day)||1)),hour=clamp(Number(clock.hour)||0,0,23.999);
  return (day-1)*24+hour;
}

function hash32(value){
  let hash=2166136261;
  for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}
  return hash>>>0;
}

function noise(value){return hash32(value)/4294967295}
function clone(value){return JSON.parse(JSON.stringify(value))}

export function fishMarketFor(clock={},region='GOLDEN COAST'){
  const day=Math.max(1,Math.floor(Number(clock.day)||1)),seed=`${region}|${day}`;
  const featured=[...FISH_SPECIES].sort((a,b)=>hash32(`${seed}|featured|${a.id}`)-hash32(`${seed}|featured|${b.id}`)).slice(0,3).map(species=>species.id),featuredSet=new Set(featured);
  const prices={};
  for(const species of FISH_SPECIES){
    const local=species.regions.includes(region),featuredBonus=featuredSet.has(species.id)?.22:0;
    const multiplier=clamp(.82+noise(`${seed}|price|${species.id}`)*.42+(local?-.025:.035)+featuredBonus,.75,1.48);
    const previous=clamp(.82+noise(`${region}|${Math.max(1,day-1)}|price|${species.id}`)*.42+(local?-.025:.035),.75,1.48);
    prices[species.id]={multiplier:round2(multiplier),trend:Math.round((multiplier/previous-1)*100),featured:featuredSet.has(species.id)};
  }
  return{day,region,featured,prices,fee:FISHERY_RULES.auctionFee};
}

export class FisheryEconomyDirector{
  constructor(saved){
    this.sequence=0;
    this.catches=[];
    this.journal={};
    this.ledger=[];
    this.totals={landed:0,sold:0,released:0,auctionNet:0,fees:0};
    this.capacityBonus={count:0,kg:0};
    this.restore(saved);
  }

  get capacityCount(){return clamp(FISHERY_RULES.capacityCount+(Number(this.capacityBonus.count)||0),FISHERY_RULES.capacityCount,FISHERY_RULES.maxCapacityCount)}
  get capacityKg(){return clamp(FISHERY_RULES.capacityKg+(Number(this.capacityBonus.kg)||0),FISHERY_RULES.capacityKg,FISHERY_RULES.maxCapacityKg)}
  setCapacityBonus({count=0,kg=0}={}){this.capacityBonus={count:Math.max(0,Math.floor(count)),kg:Math.max(0,Number(kg)||0)};return{count:this.capacityCount,kg:this.capacityKg}}

  freshness(item,clock={}){
    const age=Math.max(0,absoluteHour(clock)-(Number(item.caughtAt)||0));
    if(age<=FISHERY_RULES.fullFreshHours)return 1;
    return round2(clamp(1-(age-FISHERY_RULES.fullFreshHours)*FISHERY_RULES.freshnessDecayPerHour,FISHERY_RULES.minimumFreshness,1));
  }

  quote(item,clock={},marketRegion='GOLDEN COAST'){
    const market=fishMarketFor(clock,marketRegion),price=market.prices[item.speciesId]||{multiplier:1,trend:0,featured:false},freshness=this.freshness(item,clock);
    const gross=Math.max(1,Math.round(item.baseValue*price.multiplier*(.52+freshness*.48))),fee=Math.ceil(gross*FISHERY_RULES.auctionFee),net=Math.max(1,gross-fee);
    return{gross,fee,net,freshness,multiplier:price.multiplier,trend:price.trend,featured:price.featured,marketDay:market.day,marketRegion};
  }

  _journalEntry(speciesId){
    if(!this.journal[speciesId])this.journal[speciesId]={caught:0,sold:0,released:0,bestWeight:0,firstDay:null,regions:{},auctionNet:0};
    return this.journal[speciesId];
  }

  _recordRelease(item,reason,clock){
    const entry=this._journalEntry(item.speciesId),rep=rarityReleaseRep[item.rarity]||1;
    entry.released++;this.totals.released++;
    this.ledger.unshift({id:`ledger-${this.sequence++}`,type:'release',reason,catchId:item.id,speciesId:item.speciesId,weight:item.weight,rep,at:absoluteHour(clock)});
    this.ledger=this.ledger.slice(0,FISHERY_RULES.ledgerLimit);
    return rep;
  }

  _remove(id){const index=this.catches.findIndex(item=>item.id===id);if(index<0)return null;return this.catches.splice(index,1)[0]}

  landCatch(result,clock={}){
    const species=result?.species||speciesById.get(result?.speciesId);if(!species)return{ok:false,reason:'species'};
    const weight=round2(clamp(Number(result.weight)||species.minKg,species.minKg,species.maxKg)),baseValue=Math.max(1,Math.round(Number(result.value)||species.baseValue)),caughtAt=absoluteHour(clock);
    const item={id:`catch-${++this.sequence}`,speciesId:species.id,rarity:species.rarity,weight,baseValue,region:result.region||species.regions[0],caughtAt,quality:round2(clamp(Number(result.quality)||1,.5,1.5)),record:Boolean(result.isRecord)};
    this.catches.push(item);const journal=this._journalEntry(species.id);journal.caught++;journal.bestWeight=Math.max(journal.bestWeight,weight);journal.firstDay=journal.firstDay??Math.max(1,Math.floor(Number(clock.day)||1));journal.regions[item.region]=(journal.regions[item.region]||0)+1;this.totals.landed++;
    const autoReleased=[];
    while(this.catches.length>this.capacityCount||this.catches.reduce((sum,entry)=>sum+entry.weight,0)>this.capacityKg){
      const lowest=[...this.catches].sort((a,b)=>a.baseValue-b.baseValue||a.caughtAt-b.caughtAt)[0],removed=this._remove(lowest.id),rep=this._recordRelease(removed,'capacity',clock);autoReleased.push({...removed,rep});
    }
    return{ok:true,kept:this.catches.some(entry=>entry.id===item.id),catch:clone(item),autoReleased:clone(autoReleased),releaseRep:autoReleased.reduce((sum,entry)=>sum+entry.rep,0),snapshot:this.snapshot(clock)};
  }

  sell(id,clock={},marketRegion='GOLDEN COAST'){
    const item=this.catches.find(entry=>entry.id===id);if(!item)return{ok:false,reason:'catch'};
    const quote=this.quote(item,clock,marketRegion);this._remove(id);const journal=this._journalEntry(item.speciesId);journal.sold++;journal.auctionNet+=quote.net;this.totals.sold++;this.totals.auctionNet+=quote.net;this.totals.fees+=quote.fee;
    this.ledger.unshift({id:`ledger-${this.sequence++}`,type:'sale',catchId:item.id,speciesId:item.speciesId,weight:item.weight,gross:quote.gross,fee:quote.fee,net:quote.net,freshness:quote.freshness,marketRegion,at:absoluteHour(clock)});this.ledger=this.ledger.slice(0,FISHERY_RULES.ledgerLimit);
    return{ok:true,item:clone(item),...quote};
  }

  sellAll(clock={},marketRegion='GOLDEN COAST'){
    const sales=[];for(const item of [...this.catches]){const result=this.sell(item.id,clock,marketRegion);if(result.ok)sales.push(result)}
    return{ok:sales.length>0,count:sales.length,gross:sales.reduce((sum,sale)=>sum+sale.gross,0),fee:sales.reduce((sum,sale)=>sum+sale.fee,0),net:sales.reduce((sum,sale)=>sum+sale.net,0),sales};
  }

  release(id,clock={}){
    const item=this._remove(id);if(!item)return{ok:false,reason:'catch'};const rep=this._recordRelease(item,'player',clock);return{ok:true,item:clone(item),rep};
  }

  snapshot(clock={},marketRegion='GOLDEN COAST'){
    const market=fishMarketFor(clock,marketRegion),catches=this.catches.map(item=>{const species=speciesById.get(item.speciesId),quote=this.quote(item,clock,marketRegion);return{...clone(item),species:species?{id:species.id,name:species.name,koName:species.koName,accent:species.accent}:null,...quote}}).sort((a,b)=>b.net-a.net);
    const weight=round2(catches.reduce((sum,item)=>sum+item.weight,0)),featured=market.featured.map(id=>{const species=speciesById.get(id),price=market.prices[id];return{id,name:species?.name||id,koName:species?.koName||id,...price}});
    return{catches,count:catches.length,weight,capacityCount:this.capacityCount,capacityKg:this.capacityKg,estimatedNet:catches.reduce((sum,item)=>sum+item.net,0),appraisedValue:catches.reduce((sum,item)=>sum+item.baseValue,0),market:{...market,featured},journal:clone(this.journal),discovered:Object.keys(this.journal).length,totalSpecies:FISH_SPECIES.length,totals:{...this.totals},ledger:clone(this.ledger)};
  }

  serialize(){return{sequence:this.sequence,catches:clone(this.catches),journal:clone(this.journal),ledger:clone(this.ledger),totals:{...this.totals}}}

  restore(saved){
    if(!saved||typeof saved!=='object')return this.serialize();const source=saved.profile||saved;
    if(Number.isFinite(source.sequence))this.sequence=Math.max(0,Math.floor(source.sequence));
    if(Array.isArray(source.catches))this.catches=source.catches.filter(item=>item&&speciesById.has(item.speciesId)&&Number.isFinite(item.weight)&&Number.isFinite(item.baseValue)&&Number.isFinite(item.caughtAt)).slice(-FISHERY_RULES.maxCapacityCount).map(item=>({...item,weight:round2(Math.max(0,item.weight)),baseValue:Math.max(1,Math.round(item.baseValue))}));
    if(source.journal&&typeof source.journal==='object')this.journal=clone(source.journal);
    if(Array.isArray(source.ledger))this.ledger=clone(source.ledger.slice(0,FISHERY_RULES.ledgerLimit));
    if(source.totals&&typeof source.totals==='object')for(const key of Object.keys(this.totals))if(Number.isFinite(source.totals[key]))this.totals[key]=Math.max(0,source.totals[key]);
    return this.serialize();
  }
}
