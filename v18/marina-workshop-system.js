import { CRAFTS } from '../data-v12.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round2=value=>Math.round(value*100)/100;
const clone=value=>JSON.parse(JSON.stringify(value));
const craftById=new Map(CRAFTS.map(craft=>[craft.id,craft]));

export const CRAFT_PRICES=Object.freeze({
  'storm-x':0,'manta-r':16000,leviathan:18500,stingray:22000,phoenix:28500,
  orca:31500,specter:34000,tsunami:39000,volt:42000,barracuda:45000,
});

export const WORKSHOP_UPGRADES=Object.freeze({
  engine:{name:{ko:'파워트레인',en:'POWERTRAIN'},description:{ko:'최고 속도와 가속력을 높입니다.',en:'Raises top speed and acceleration.'},baseCost:2400,maxLevel:4},
  handling:{name:{ko:'벡터 노즐',en:'VECTOR NOZZLE'},description:{ko:'조향 반응과 선회력을 높입니다.',en:'Improves steering response and turning force.'},baseCost:2100,maxLevel:4},
  hull:{name:{ko:'강화 선체',en:'REINFORCED HULL'},description:{ko:'파도 안정성과 충돌 저항을 높입니다.',en:'Improves wave stability and impact resistance.'},baseCost:1900,maxLevel:4},
  cooler:{name:{ko:'냉장 보관함',en:'CATCH LOCKER'},description:{ko:'어획 보관 수량과 중량을 확장합니다.',en:'Expands catch count and weight capacity.'},baseCost:1700,maxLevel:4},
});

const emptyUpgrades=()=>({engine:0,handling:0,hull:0,cooler:0});

export class MarinaWorkshopDirector{
  constructor(saved){
    this.owned=new Set(['storm-x']);this.equipped='storm-x';this.upgrades={'storm-x':emptyUpgrades()};this.condition={'storm-x':100};this.history=[];this.totals={purchased:0,upgrades:0,services:0,spent:0,damageTaken:0};this.restore(saved);
  }

  isOwned(id){return this.owned.has(id)}
  _ensure(id){if(!craftById.has(id))return false;if(!this.upgrades[id])this.upgrades[id]=emptyUpgrades();if(!Number.isFinite(this.condition[id]))this.condition[id]=100;return true}
  _log(type,payload={}){this.history.unshift({id:`work-${Date.now()}-${this.history.length}`,type,...payload});this.history=this.history.slice(0,50)}

  purchasePrice(id){return CRAFT_PRICES[id]??null}
  purchase(id,wallet=0){
    if(!craftById.has(id))return{ok:false,reason:'craft',wallet};if(this.isOwned(id))return{ok:false,reason:'owned',wallet};const price=this.purchasePrice(id);if(price==null)return{ok:false,reason:'unlisted',wallet};const funds=Math.max(0,Math.floor(wallet));if(funds<price)return{ok:false,reason:'wallet',wallet:funds,price};
    this.owned.add(id);this._ensure(id);this.equipped=id;this.totals.purchased++;this.totals.spent+=price;this._log('purchase',{craftId:id,cost:price});return{ok:true,craft:craftById.get(id),wallet:funds-price,price,equipped:id};
  }

  equip(id){if(!this.isOwned(id)||!craftById.has(id))return{ok:false,reason:'locked'};this._ensure(id);this.equipped=id;this._log('equip',{craftId:id});return{ok:true,craft:craftById.get(id)}}

  upgradeQuote(category,id=this.equipped){
    const definition=WORKSHOP_UPGRADES[category];if(!definition||!this.isOwned(id))return null;this._ensure(id);const level=this.upgrades[id][category],next=level+1;if(next>definition.maxLevel)return{category,level,maxLevel:definition.maxLevel,maxed:true,cost:0};const craftPrice=this.purchasePrice(id)||12000,cost=Math.round((definition.baseCost*next+craftPrice*.018*next)/100)*100;return{category,level,next,maxLevel:definition.maxLevel,maxed:false,cost};
  }

  upgrade(category,wallet=0,id=this.equipped){
    const quote=this.upgradeQuote(category,id),funds=Math.max(0,Math.floor(wallet));if(!quote)return{ok:false,reason:'upgrade',wallet:funds};if(quote.maxed)return{ok:false,reason:'maxed',wallet:funds,quote};if(funds<quote.cost)return{ok:false,reason:'wallet',wallet:funds,quote};this.upgrades[id][category]=quote.next;this.totals.upgrades++;this.totals.spent+=quote.cost;this._log('upgrade',{craftId:id,category,level:quote.next,cost:quote.cost});return{ok:true,craftId:id,category,level:quote.next,wallet:funds-quote.cost,cost:quote.cost,performance:this.performance(id)};
  }

  serviceQuote(id=this.equipped){
    if(!this.isOwned(id))return null;this._ensure(id);const missing=100-this.condition[id],price=this.purchasePrice(id)||12000,cost=missing<.5?0:Math.max(250,Math.round(missing*(48+price*.0018)/50)*50);return{craftId:id,condition:round2(this.condition[id]),missing:round2(missing),cost,pristine:cost===0};
  }

  service(wallet=0,id=this.equipped){
    const quote=this.serviceQuote(id),funds=Math.max(0,Math.floor(wallet));if(!quote)return{ok:false,reason:'craft',wallet:funds};if(quote.pristine)return{ok:false,reason:'pristine',wallet:funds,quote};if(funds<quote.cost)return{ok:false,reason:'wallet',wallet:funds,quote};this.condition[id]=100;this.totals.services++;this.totals.spent+=quote.cost;this._log('service',{craftId:id,cost:quote.cost,restored:quote.missing});return{ok:true,craftId:id,wallet:funds-quote.cost,cost:quote.cost,condition:100};
  }

  repair(amount=12,id=this.equipped,reason='field-repair'){
    if(!this.isOwned(id))return{ok:false,reason:'craft'};this._ensure(id);const before=this.condition[id];this.condition[id]=round2(clamp(before+Math.max(0,amount),0,100));const restored=round2(this.condition[id]-before);if(restored>0)this._log('repair',{craftId:id,reason,restored});return{ok:restored>0,craftId:id,restored,condition:this.condition[id]};
  }

  applyDamage(amount=0,id=this.equipped,reason='impact'){
    if(!this.isOwned(id))return{ok:false,reason:'craft'};this._ensure(id);const performance=this.performance(id),effective=round2(Math.max(0,amount)*(1-performance.damageResistance)),before=this.condition[id];this.condition[id]=round2(clamp(before-effective,0,100));const applied=round2(before-this.condition[id]);this.totals.damageTaken=round2(this.totals.damageTaken+applied);if(applied>.1)this._log('damage',{craftId:id,reason,applied,condition:this.condition[id]});return{ok:applied>0,craftId:id,reason,applied,condition:this.condition[id],warning:this.condition[id]<=25?'critical':this.condition[id]<=55?'service':null};
  }

  addWear(amount=.5,id=this.equipped,reason='race-wear'){return this.applyDamage(amount,id,reason)}

  performance(id=this.equipped){
    const base=craftById.get(id)||CRAFTS[0];this._ensure(base.id);const levels=this.upgrades[base.id],condition=clamp(this.condition[base.id],0,100),driveCondition=.76+condition*.0024,controlCondition=.88+condition*.0012;
    return{...base,max:round2(base.max*(1+levels.engine*.032)*driveCondition),accel:round2(base.accel*(1+levels.engine*.045)*(.84+condition*.0016)),turn:round2(base.turn*(1+levels.handling*.042)*controlCondition),stability:round2(base.stability*(1+levels.hull*.06)),damageResistance:round2(clamp(.05+levels.hull*.105,.05,.5)),condition:round2(condition),levels:{...levels},coolerBonus:{count:levels.cooler*2,kg:levels.cooler*25}};
  }

  snapshot(){
    const garage=CRAFTS.map(craft=>({craft:{...craft},owned:this.isOwned(craft.id),price:this.purchasePrice(craft.id),equipped:this.equipped===craft.id,condition:this.condition[craft.id]??100,levels:{...(this.upgrades[craft.id]||emptyUpgrades())}}));
    return{equipped:this.equipped,owned:[...this.owned],garage,performance:this.performance(),service:this.serviceQuote(),totals:{...this.totals},history:clone(this.history)};
  }

  serialize(){return{owned:[...this.owned],equipped:this.equipped,upgrades:clone(this.upgrades),condition:{...this.condition},history:clone(this.history),totals:{...this.totals}}}

  restore(saved){
    if(!saved||typeof saved!=='object')return this.serialize();const source=saved.profile||saved;if(Array.isArray(source.owned))for(const id of source.owned)if(craftById.has(id))this.owned.add(id);if(this.owned.has(source.equipped))this.equipped=source.equipped;
    if(source.upgrades&&typeof source.upgrades==='object')for(const [id,levels] of Object.entries(source.upgrades))if(craftById.has(id)&&levels&&typeof levels==='object'){this._ensure(id);for(const [category,definition] of Object.entries(WORKSHOP_UPGRADES))this.upgrades[id][category]=clamp(Math.floor(Number(levels[category])||0),0,definition.maxLevel)}
    if(source.condition&&typeof source.condition==='object')for(const [id,value] of Object.entries(source.condition))if(craftById.has(id)&&Number.isFinite(value))this.condition[id]=round2(clamp(value,0,100));if(Array.isArray(source.history))this.history=clone(source.history.slice(0,50));if(source.totals&&typeof source.totals==='object')for(const key of Object.keys(this.totals))if(Number.isFinite(source.totals[key]))this.totals[key]=Math.max(0,source.totals[key]);this._ensure(this.equipped);return this.serialize();
  }
}
