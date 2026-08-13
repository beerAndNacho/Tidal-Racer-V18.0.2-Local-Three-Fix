import assert from 'node:assert/strict';

const lang = process.argv[2] || 'en';
if(!['ko','en'].includes(lang))throw new Error('usage: node scripts/v17-module-check.mjs ko|en');

globalThis.location = { search:`?lang=${lang}`, href:`http://localhost:8080/?lang=${lang}` };
globalThis.localStorage = { getItem(){return null}, setItem(){} };
Object.defineProperty(globalThis,'navigator',{value:{language:'ko-KR'},configurable:true});

const { i18n } = await import(`../v17/i18n.js?module-check=${lang}-${Date.now()}`);
const { ITEMS, SKILLS, EVENTS } = await import('../data-v12.js');

assert.equal(i18n.lang,lang);
i18n.applyDataLanguage();

if(lang==='en'){
  assert.match(ITEMS[0].desc,/Homing projectile/);
  assert.equal(ITEMS[0].category,'Attack');
  assert.match(SKILLS[0].desc,/instant thrust/);
  assert.match(EVENTS[0].desc,/Swell grows/);
}else{
  assert.match(ITEMS[0].desc,/유도탄/);
  assert.equal(ITEMS[0].category,'공격');
  assert.match(SKILLS[0].desc,/추진력/);
  assert.match(EVENTS[0].desc,/너울/);
}
console.log(`PASS V18 module language ${lang}`);
