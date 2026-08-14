export const SAVE_SCHEMA_VERSION=4;
export const SAVE_SLOT_COUNT=3;

const DEFAULT_PREFIX='tidal-racer-v18-save-slot';
const DEFAULT_META_KEY='tidal-racer-v18-save-meta';
const DEFAULT_LEGACY_KEY='tidal-racer-v13-profile';
const DEFAULT_ANCILLARY_KEYS={fishing:'tidal-racer-v18-fishing',worldActivities:'tidal-racer-world-activities-v1'};

function asSlot(value){const slot=Math.floor(Number(value));return slot>=1&&slot<=SAVE_SLOT_COUNT?slot:1}
function utf8Bytes(value){return typeof TextEncoder!=='undefined'?new TextEncoder().encode(value):Array.from(unescape(encodeURIComponent(value)),char=>char.charCodeAt(0))}
export function saveChecksum(value){let hash=0x811c9dc5;for(const byte of utf8Bytes(value)){hash^=byte;hash=Math.imul(hash,0x01000193)>>>0}return hash.toString(16).padStart(8,'0')}
function envelopeBody(envelope){return JSON.stringify({schemaVersion:envelope.schemaVersion,slot:envelope.slot,savedAt:envelope.savedAt,playSeconds:envelope.playSeconds,revision:envelope.revision,payload:envelope.payload})}
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
function safeJson(raw){if(!raw)return null;try{return JSON.parse(raw)}catch{return null}}

export class SaveSlotDirector{
  constructor({storage=globalThis.localStorage,prefix=DEFAULT_PREFIX,metaKey=DEFAULT_META_KEY,legacyKey=DEFAULT_LEGACY_KEY,ancillaryKeys=DEFAULT_ANCILLARY_KEYS}={}){
    this.storage=storage;this.prefix=prefix;this.metaKey=metaKey;this.legacyKey=legacyKey;this.ancillaryKeys={...DEFAULT_ANCILLARY_KEYS,...ancillaryKeys};this.lastError=null;
    const meta=this.readMeta();this.activeSlot=asSlot(meta.activeSlot);this.migrateLegacy();
  }
  key(slot=this.activeSlot){return`${this.prefix}-${asSlot(slot)}`}
  backupKey(slot=this.activeSlot){return`${this.key(slot)}-backup`}
  archiveKey(slot=this.activeSlot){return`${this.key(slot)}-archive`}
  getItem(key){try{return this.storage?.getItem?.(key)||null}catch(error){this.lastError=error;return null}}
  setItem(key,value){try{this.storage?.setItem?.(key,value);return true}catch(error){this.lastError=error;return false}}
  removeItem(key){try{this.storage?.removeItem?.(key);return true}catch(error){this.lastError=error;return false}}
  readMeta(){return safeJson(this.getItem(this.metaKey))||{activeSlot:1,migratedLegacy:false}}
  writeMeta(patch={}){const meta={...this.readMeta(),...patch,updatedAt:new Date().toISOString()};this.setItem(this.metaKey,JSON.stringify(meta));return meta}
  setActive(slot){this.activeSlot=asSlot(slot);this.writeMeta({activeSlot:this.activeSlot});return this.activeSlot}
  validate(value){
    if(!value||typeof value!=='object'||value.schemaVersion!==SAVE_SCHEMA_VERSION||asSlot(value.slot)!==value.slot||!value.payload||typeof value.payload!=='object')return{valid:false,reason:'shape'};
    const expected=saveChecksum(envelopeBody(value));return expected===value.checksum?{valid:true,envelope:value}:{valid:false,reason:'checksum'};
  }
  parseRaw(raw){const parsed=safeJson(raw);if(!parsed)return{valid:false,reason:raw?'json':'empty'};return this.validate(parsed)}
  makeEnvelope(payload,{slot=this.activeSlot,playSeconds=0,revision=1,savedAt=new Date().toISOString()}={}){
    const envelope={schemaVersion:SAVE_SCHEMA_VERSION,slot:asSlot(slot),savedAt,playSeconds:Math.max(0,Number(playSeconds)||0),revision:Math.max(1,Math.floor(Number(revision)||1)),payload:clone(payload)||{}};envelope.checksum=saveChecksum(envelopeBody(envelope));return envelope;
  }
  write(payload,{slot=this.activeSlot,playSeconds=0}={}){
    slot=asSlot(slot);const currentRaw=this.getItem(this.key(slot)),current=this.parseRaw(currentRaw),backup=this.parseRaw(this.getItem(this.backupKey(slot)));if(current.valid)this.setItem(this.backupKey(slot),currentRaw);
    const previous=current.valid?current.envelope:backup.valid?backup.envelope:null,envelope=this.makeEnvelope(payload,{slot,playSeconds,revision:(previous?.revision||0)+1});const ok=this.setItem(this.key(slot),JSON.stringify(envelope));if(!ok)return{ok:false,error:this.lastError};this.setActive(slot);return{ok:true,envelope};
  }
  load(slot=this.activeSlot){
    slot=asSlot(slot);const current=this.parseRaw(this.getItem(this.key(slot)));if(current.valid)return{...current.envelope,recovered:false,source:'primary'};
    const backup=this.parseRaw(this.getItem(this.backupKey(slot)));if(backup.valid)return{...backup.envelope,recovered:true,source:'backup',primaryError:current.reason};
    return null;
  }
  summary(slot){
    slot=asSlot(slot);const current=this.parseRaw(this.getItem(this.key(slot))),backup=this.parseRaw(this.getItem(this.backupKey(slot))),candidate=current.valid?current.envelope:backup.valid?backup.envelope:null,payload=candidate?.payload||{},state=payload.state||{},story=payload.story||{},workshop=payload.workshop||{};
    return{slot,active:slot===this.activeSlot,hasSave:Boolean(candidate),recovered:!current.valid&&backup.valid,corrupted:Boolean(this.getItem(this.key(slot)))&&!current.valid&&!backup.valid,hasArchive:Boolean(this.getItem(this.archiveKey(slot))),savedAt:candidate?.savedAt||null,playSeconds:candidate?.playSeconds||0,revision:candidate?.revision||0,credits:Number(state.credits)||0,level:1+Math.floor((Number(state.xp)||0)/1000),storyChapter:Number(story.chapterIndex??story.index??0)+1,storyState:story.state||story.status||'available',craft:workshop.equipped||'wave-runner'};
  }
  listSlots(){return Array.from({length:SAVE_SLOT_COUNT},(_,index)=>this.summary(index+1))}
  reset(slot=this.activeSlot){slot=asSlot(slot);const currentRaw=this.getItem(this.key(slot)),backupRaw=this.getItem(this.backupKey(slot)),current=this.parseRaw(currentRaw),backup=this.parseRaw(backupRaw),raw=current.valid?currentRaw:backup.valid?backupRaw:currentRaw||backupRaw;if(raw)this.setItem(this.archiveKey(slot),raw);this.removeItem(this.key(slot));this.removeItem(this.backupKey(slot));return this.summary(slot)}
  restoreArchive(slot=this.activeSlot){slot=asSlot(slot);const raw=this.getItem(this.archiveKey(slot)),checked=this.parseRaw(raw);if(!checked.valid)return{ok:false,reason:checked.reason};const restored=this.makeEnvelope(checked.envelope.payload,{slot,playSeconds:checked.envelope.playSeconds,revision:checked.envelope.revision+1});const current=this.getItem(this.key(slot));if(current)this.setItem(this.backupKey(slot),current);if(!this.setItem(this.key(slot),JSON.stringify(restored)))return{ok:false,error:this.lastError};this.setActive(slot);return{ok:true,envelope:restored}}
  exportSlot(slot=this.activeSlot){slot=asSlot(slot);const loaded=this.load(slot);if(!loaded)return null;const envelope=this.makeEnvelope(loaded.payload,{slot,playSeconds:loaded.playSeconds,revision:loaded.revision,savedAt:loaded.savedAt});return JSON.stringify({product:'Tidal Racer',format:'tidal-racer-save',exportedAt:new Date().toISOString(),envelope},null,2)}
  importSlot(text,slot=this.activeSlot){
    slot=asSlot(slot);const document=safeJson(String(text||'')),candidate=document?.envelope||document,checked=this.validate(candidate);if(!checked.valid)return{ok:false,reason:checked.reason};return this.write(checked.envelope.payload,{slot,playSeconds:checked.envelope.playSeconds});
  }
  migrateLegacy(){
    const meta=this.readMeta();if(meta.migratedLegacy||this.listSlots().some(slot=>slot.hasSave)){if(!meta.migratedLegacy)this.writeMeta({migratedLegacy:true});return false}
    const legacy=safeJson(this.getItem(this.legacyKey));if(!legacy||typeof legacy!=='object'){this.writeMeta({migratedLegacy:true});return false}
    const payload=clone(legacy);for(const [name,key] of Object.entries(this.ancillaryKeys)){const value=safeJson(this.getItem(key));if(value&&payload[name]==null)payload[name]=value}
    const result=this.write(payload,{slot:1,playSeconds:0});this.writeMeta({activeSlot:1,migratedLegacy:true,migratedAt:new Date().toISOString(),migrationSucceeded:Boolean(result.ok)});return Boolean(result.ok)
  }
}
