import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8'),main=fs.readFileSync('v18/main.js','utf8'),locale=fs.readFileSync('v17/locale-data.js','utf8');
const cityLife=fs.readFileSync('v18/city-life-system.js','utf8'),cityJobs=fs.readFileSync('v18/city-job-system.js','utf8'),citizenRelations=fs.readFileSync('v18/citizen-relationship-system.js','utf8'),cityCopy=cityLife+cityJobs+citizenRelations;
assert.ok(/<meta\s+charset=["']?UTF-8/i.test(html.slice(0,1200)),'UTF-8 charset must be declared early');
assert.equal((html.match(/\uFFFD/g)||[]).length,0,'HTML must not contain replacement characters');
assert.equal((main.match(/\uFFFD/g)||[]).length,0,'runtime must not contain replacement characters');
for(const signal of ['쨌','留','?쒓','?댄','?쒖'])assert.ok(!html.includes(signal),`HTML contains mojibake signal ${signal}`);
assert.ok((html.match(/[가-힣]/g)||[]).length>=250,'HTML must retain substantial Korean interface copy');
for(const phrase of ['한국어','생활 활동','계속하기','지금 저장','튜토리얼 다시 시작','건너뛰기'])assert.ok(html.includes(phrase),`missing readable Korean UI phrase: ${phrase}`);
assert.ok(locale.includes("ko:")&&locale.includes("en:"),'bilingual locale catalog must ship');
assert.equal((cityCopy.match(/\uFFFD/g)||[]).length,0,'city life, jobs, and citizen copy must not contain replacement characters');
assert.ok((cityCopy.match(/[\uAC00-\uD7A3]/g)||[]).length>=650,'city systems must retain substantial Korean source copy');
for(const phrase of ['\uB9C8\uB9AC\uB098 \uC544\uD30C\uD2B8','\uD574\uC0B0\uBB3C \uB36E\uBC25','5,000 CR \uC785\uAE08','\uB77C\uC774\uBE0C \uACF5\uC5F0'])assert.ok(cityLife.includes(phrase),`missing readable city life phrase: ${phrase}`);
for(const phrase of ['\uD56D\uB9CC \uAC11\uD310 \uADFC\uBB34','\uB9C8\uB9AC\uB098 \uC815\uBE44 \uBCF4\uC870'])assert.ok(cityJobs.includes(phrase),`missing readable city job phrase: ${phrase}`);
for(const phrase of ['\uD56D\uB9CC \uBC30\uCC28 \uB2F4\uB2F9','\uBE44\uC0C1\uAE08 \uB9CC\uB4E4\uAE30'])assert.ok(citizenRelations.includes(phrase),`missing readable citizen phrase: ${phrase}`);

const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]),duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];assert.deepEqual(duplicates,[],'HTML ids must be unique');
const staticRefs=[...new Set([...main.matchAll(/\$\(["']#([A-Za-z][\w-]*)["']\)/g)].map(match=>match[1]))],createdAtRuntime=new Set(['audioStatus','gamepadSettingsStatus']),missing=staticRefs.filter(id=>!ids.includes(id)&&!createdAtRuntime.has(id));assert.deepEqual(missing,[],'runtime static #id references must resolve');
for(const tag of ['button','section','aside'])assert.equal((html.match(new RegExp(`<${tag}\\b`,'gi'))||[]).length,(html.match(new RegExp(`</${tag}>`,'gi'))||[]).length,`<${tag}> tags must be balanced`);
assert.ok(html.includes('<script type="module" src="./v18/bootstrap.js"></script>'),'current boot entry must remain intact');
assert.ok(!/(?:src|href)=["']https?:\/\//i.test(html),'runtime HTML must not depend on remote resources');

console.log(`PASS markup/localization: UTF-8, ${(html.match(/[가-힣]/g)||[]).length} Korean glyphs, ${ids.length} unique ids, ${staticRefs.length} runtime refs, balanced interactive tags, local boot entry`);
