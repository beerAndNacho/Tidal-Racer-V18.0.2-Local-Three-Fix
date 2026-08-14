import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SaveSlotDirector, SAVE_SCHEMA_VERSION, SAVE_SLOT_COUNT } from '../v18/save-slot-system.js';

class MemoryStorage{
  constructor(seed={}){this.data=new Map(Object.entries(seed).map(([key,value])=>[key,String(value)]))}
  getItem(key){return this.data.has(key)?this.data.get(key):null}
  setItem(key,value){this.data.set(key,String(value))}
  removeItem(key){this.data.delete(key)}
}

const payload=(credits=24000)=>({state:{credits,xp:1750},fishing:{total:3,discovered:{mackerel:2}},worldActivities:{completed:{'golden-rescue':1},best:{'golden-rescue':88}},workshop:{equipped:'wave-runner'},story:{chapterIndex:1,state:'active'}});
const storage=new MemoryStorage(),saves=new SaveSlotDirector({storage,prefix:'test-slot',metaKey:'test-meta',legacyKey:'test-legacy'});
assert.equal(SAVE_SCHEMA_VERSION,4);assert.equal(SAVE_SLOT_COUNT,3);assert.equal(saves.activeSlot,1);assert.equal(saves.listSlots().length,3);assert.ok(saves.listSlots().every(slot=>!slot.hasSave));

let result=saves.write(payload(),{playSeconds:125});assert.ok(result.ok);assert.equal(result.envelope.revision,1);assert.equal(saves.load().payload.state.credits,24000);assert.equal(saves.summary(1).level,2);assert.equal(saves.summary(1).playSeconds,125);
result=saves.write(payload(31000),{playSeconds:240});assert.equal(result.envelope.revision,2);assert.equal(saves.load().payload.state.credits,31000);
const validPrimary=storage.getItem('test-slot-1');storage.setItem('test-slot-1',validPrimary.replace('31000','99999'));const recovered=saves.load();assert.ok(recovered.recovered);assert.equal(recovered.source,'backup');assert.equal(recovered.payload.state.credits,24000,'checksum mismatch must recover the previous valid revision');
result=saves.write(payload(36000),{playSeconds:300});assert.equal(result.envelope.revision,2,'saving after fallback recovery must continue the valid revision chain');assert.equal(saves.load().payload.state.credits,36000);

saves.setActive(2);saves.write(payload(8800),{playSeconds:12});assert.equal(saves.load(1).payload.state.credits,36000);assert.equal(saves.load(2).payload.state.credits,8800);assert.equal(saves.summary(2).active,true);assert.equal(saves.summary(1).active,false);
const exported=saves.exportSlot(2);assert.ok(exported.includes('"format": "tidal-racer-save"'));const importedStorage=new MemoryStorage(),imported=new SaveSlotDirector({storage:importedStorage,prefix:'import-slot',metaKey:'import-meta',legacyKey:'none'});assert.ok(imported.importSlot(exported,3).ok);assert.equal(imported.load(3).payload.state.credits,8800);assert.equal(imported.load(3).playSeconds,12);
const tampered=exported.replace('8800','9999');assert.equal(imported.importSlot(tampered,1).ok,false,'tampered exports must fail checksum validation');

const beforeReset=saves.load(2).payload.state.credits;saves.reset(2);assert.equal(saves.load(2),null);assert.ok(saves.summary(2).hasArchive);assert.ok(saves.restoreArchive(2).ok);assert.equal(saves.load(2).payload.state.credits,beforeReset);
const damagedPrimary=storage.getItem('test-slot-2');saves.write(payload(9900),{slot:2,playSeconds:20});storage.setItem('test-slot-2',storage.getItem('test-slot-2').replace('9900','9901'));saves.reset(2);assert.ok(saves.restoreArchive(2).ok,'reset must archive the valid backup when the primary checksum is damaged');assert.equal(saves.load(2).payload.state.credits,beforeReset);

const legacyStorage=new MemoryStorage({
  'tidal-racer-v13-profile':JSON.stringify({state:{credits:7777,xp:0},story:{chapterIndex:0}}),
  'tidal-racer-v18-fishing':JSON.stringify({total:9,discovered:{tuna:1},best:{},byRegion:{}}),
  'tidal-racer-world-activities-v1':JSON.stringify({completed:{'moon-relay':2},best:{}})
});
const migrated=new SaveSlotDirector({storage:legacyStorage});const migratedSave=migrated.load(1);assert.ok(migratedSave);assert.equal(migratedSave.payload.state.credits,7777);assert.equal(migratedSave.payload.fishing.total,9);assert.equal(migratedSave.payload.worldActivities.completed['moon-relay'],2);assert.ok(legacyStorage.getItem('tidal-racer-v13-profile'),'legacy data must remain untouched after migration');

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),fishing=fs.readFileSync('v18/fishing-system.js','utf8'),activities=fs.readFileSync('v18/world-activity-system.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
for(const token of ['new SaveSlotDirector','fishing:fishing.serialize()','worldActivities:worldActivities.serialize()','saveSlots.write(payload','function togglePause','STATE.paused','get save(){return'])assert.ok(main.includes(token),`main save runtime missing ${token}`);
for(const id of ['saveSlots','saveExportBtn','saveImportBtn','saveNewBtn','saveImportInput','pauseMenu','pauseResumeBtn','pauseSaveBtn','pauseTitleBtn','saveIndicator'])assert.ok(index.includes(`id="${id}"`),`save/pause UI missing ${id}`);
assert.ok(fishing.includes('serialize(){')&&fishing.includes('restore(saved)')&&activities.includes('serialize(){')&&activities.includes('restore(saved)'),'fishing and activities must participate in unified saves');
assert.ok(audio.includes('setPaused(paused)')&&audio.includes('this.paused?0'),'pause must attenuate engine and audio buses');
assert.ok(policy.requiredFiles.includes('v18/save-slot-system.js')&&policy.sourceFiles.includes('v18/save-slot-system.js'),'release policy must ship the save-slot module');

console.log('PASS save slots: 3 isolated slots, schema v4, checksum tamper detection, rolling backup recovery, legacy migration, archive restore, import/export, unified progression, pause UI, and audio pause');
