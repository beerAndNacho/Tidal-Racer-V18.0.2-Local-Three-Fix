import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const map=JSON.parse(fs.readFileSync(path.join(root,'release/product-data-map.json'),'utf8'));
const privacy=fs.readFileSync(path.join(root,'release/PRIVACY.md'),'utf8');
const eula=fs.readFileSync(path.join(root,'release/EULA.md'),'utf8');
const support=fs.readFileSync(path.join(root,'release/SUPPORT_POLICY.md'),'utf8');
const approval=JSON.parse(fs.readFileSync(path.join(root,'release/commercial-approval.json'),'utf8'));
const publisher=JSON.parse(fs.readFileSync(path.join(root,'release/publisher.json'),'utf8'));
const sourceFiles=['index.html','v18/bootstrap.js','v18/engine.js','v18/main.js','v18/save-slot-system.js','v18/input-system.js','v14/audio-director.js','v17/i18n.js','v17/locale-data.js'];
const source=sourceFiles.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
const tests=[];
const add=(name,ok,evidence='')=>tests.push({name,ok:Boolean(ok),evidence});

add('engineering data map identifies current build',map.product==='Tidal Racer'&&map.version==='18.0.2'&&map.reviewStatus.includes('legal approval pending'));
add('no publisher account or remote data services',[map.accountRequired,map.publisherTelemetry,map.publisherAnalytics,map.publisherCrashReporting,map.publisherAdvertising,map.publisherCloudSave,map.cookiesUsedByGame].every(value=>value===false));
add('local runtime network boundary',map.networkBehavior.localOriginOnly===true&&map.networkBehavior.launcherHost==='127.0.0.1'&&map.networkBehavior.externalExecutableRuntime===false);
add('no transmission APIs in current runtime',!/(?:XMLHttpRequest|WebSocket|sendBeacon|document\.cookie|navigator\.share)\b/.test(source));
add('runtime fetches are limited to boot and local manifest',sourceFiles.filter(file=>fs.readFileSync(path.join(root,file),'utf8').includes('fetch(')).every(file=>['v18/bootstrap.js','v18/engine.js'].includes(file)));
for(const key of ['tidal-racer-v18-save-meta','tidal-racer-v18-save-slot','tidal-racer-v13-profile','tidal-racer-audio-settings','tidal-racer-accessibility-v1','tidal-racer-gamepad-v1','tidal-racer-language'])add('documented storage key '+key,source.includes(key),key);
add('save JSON export and import are implemented',source.includes("format:'tidal-racer-save'")&&source.includes('saveSlots.importSlot')&&source.includes("type:'application/json'"));
add('photo PNG export is implemented',source.includes('link.download=filename')&&source.includes("},'image/png')"));
add('privacy notice matches no-account local model',/does not\s+require an account/.test(privacy)&&/does not\s+send gameplay telemetry/.test(privacy)&&privacy.includes('127.0.0.1'));
add('privacy notice covers local data and deletion',privacy.includes('three save slots')&&privacy.includes('site data')&&/Exported\s+JSON and PNG/.test(privacy));
add('external GitHub and storefront surfaces separated',privacy.includes('governed by GitHub')&&privacy.includes('future commercial storefront'));
add('legal documents remain visibly unapproved',[privacy,eula,support].every(text=>text.includes('DRAFT - NOT APPROVED FOR COMMERCIAL RELEASE')));
add('approval flags cannot silently pass',['eulaApproved','privacyApproved','supportPolicyApproved','refundDisclosureApproved','ageRatingApproved','trademarkReviewCompleted','marketingRightsReviewed'].every(key=>approval[key]===false)&&approval.price===0);
add('publisher identity remains intentionally unresolved',Object.values(publisher).some(value=>/REPLACE_WITH/.test(value)));

let failed=0;
for(const test of tests){
  console.log((test.ok?'PASS':'FAIL')+' '+test.name+(test.evidence?' - '+test.evidence:''));
  if(!test.ok)failed++;
}
console.log('\n'+(tests.length-failed)+'/'+tests.length+' legal data-flow checks PASS');
process.exit(failed?1:0);
