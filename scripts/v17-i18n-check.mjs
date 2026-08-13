import fs from 'node:fs';

const files = {
  index: fs.readFileSync('index.html','utf8'),
  main: fs.readFileSync('v18/main.js','utf8'),
  i18n: fs.readFileSync('v17/i18n.js','utf8'),
  locale: fs.readFileSync('v17/locale-data.js','utf8'),
  v16: fs.readFileSync('v18/main.js','utf8'),
  engine: fs.readFileSync('v18/engine.js','utf8'),
  audio: fs.readFileSync('v14/audio-director.js','utf8'),
  readme: fs.readFileSync('README.md','utf8'),
  docs: fs.readFileSync('docs/LOCALIZATION.md','utf8'),
};

function sectionCount(source, start, end, pattern) {
  const a=source.indexOf(start), b=source.indexOf(end,a+start.length);
  if(a<0||b<0)return 0;
  return (source.slice(a,b).match(pattern)||[]).length;
}

const checks = [
  ['V18 title', files.index.includes('V18.0.2')&&files.index.includes('Race, Fish, Explore')],
  ['V18 runtime entry', files.index.includes('./v18/bootstrap.js')],
  ['V16 systems retained', files.main.includes("../v16/wave-model.js")&&files.main.includes('audioDirector')],
  ['Language controller attached', files.main.includes("../v17/i18n.js")&&files.main.includes('i18n.attach()')],
  ['Korean switch', files.index.includes('data-lang="ko"')],
  ['English switch', files.index.includes('data-lang="en"')],
  ['Persistent language key', files.locale.includes("tidal-racer-language")],
  ['URL lang parameter', files.i18n.includes("searchParams.set('lang',lang)")],
  ['Direct query selection', files.i18n.includes("get('lang')")],
  ['HTML lang update', files.i18n.includes('document.documentElement.lang=this.lang')],
  ['L key toggle', files.i18n.includes("event.code==='KeyL'")],
  ['Korean UI dictionary', files.locale.includes("controls: '조작법'")],
  ['English UI dictionary', files.locale.includes("controls: 'CONTROLS'")],
  ['30 English item localizations', sectionCount(files.locale,'const ITEM_EN = [','const SKILL_EN',/\['/g)===30],
  ['8 English skill localizations', sectionCount(files.locale,'const SKILL_EN = [','const EVENT_EN',/(?:^|,)\s*'/gm)===8],
  ['12 English event localizations', sectionCount(files.locale,'const EVENT_EN = [','const EVENT_NAME_KO',/(?:^|,)\s*'/gm)===12],
  ['16 Korean rider profiles', sectionCount(files.locale,'const RIDER_KO = {','const ORIGINAL',/^  [a-z]+:\{/gm)===16],
  ['Dynamic store rerender', files.i18n.includes("activeTab.click()")],
  ['Dynamic toast localization', files.i18n.includes('translateToast()')],
  ['Dynamic rider-card localization', files.i18n.includes('applyRiderCard()')],
  ['Item description localization', files.i18n.includes('applyItem()')],
  ['Event localization', files.i18n.includes('applyEvent()')],
  ['Sea-state localization', files.i18n.includes('applySeaState()')],
  ['Region bilingual label', files.index.includes('data-local-name') && files.i18n.includes('applyRegion()')],
  ['Language controls documented', files.readme.includes('?lang=ko') && files.readme.includes('?lang=en')],
  ['Localization guide', files.docs.includes('Canonical gameplay identifiers')],
  ['True left steering retained', files.v16.includes("targetYaw=steer*steerAuthority*reverseSign")],
  ['Rough-water model retained', files.v16.includes('waveHeight(px,pz,STATE.time,sea)')],
  ['Visibility tuning retained', files.engine.includes('toneMappingExposure=0.86') || files.engine.includes('toneMappingExposure=.86')],
  ['Adaptive audio retained', files.audio.includes('REGION_MOODS') && files.audio.includes('updateEngine')],
];

let fail=0;
for(const [name,ok] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}`);
  if(!ok)fail++;
}
console.log(`\n${checks.length-fail}/${checks.length} PASS`);
process.exit(fail?1:0);
