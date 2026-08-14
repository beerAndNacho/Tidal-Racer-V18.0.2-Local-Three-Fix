import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PlaytestEvidenceDirector, PLAYTEST_CHECK_KEYS, detectPlaytestBrowser, detectPlaytestOs } from '../v18/playtest-evidence-system.js';
import { mergeEvidenceDocuments, playtestSessionSha256, validatePlaytestSessions } from './merge-playtest-evidence.mjs';

assert.deepEqual(detectPlaytestBrowser('Mozilla/5.0 Chrome/132.0.0.0 Safari/537.36'),{browser:'Chrome',browserVersion:'132'});
assert.deepEqual(detectPlaytestBrowser('Mozilla/5.0 Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0'),{browser:'Edge',browserVersion:'132'});
assert.deepEqual(detectPlaytestBrowser('Mozilla/5.0 Firefox/128.0'),{browser:'Firefox',browserVersion:'128'});
assert.equal(detectPlaytestOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64)','Win32'),'Windows NT 10.0');

const director=new PlaytestEvidenceDirector({minimumMinutes:.1});
director.markBootComplete(8200);director.start();
for(let index=0;index<360;index++)director.recordFrame(index%40===0?.026:1/60,true);
for(const key of PLAYTEST_CHECK_KEYS)director.setCheck(key,true);
const identity={browser:'Chrome',browserVersion:'132',os:'Windows 11',gpu:'Intel Iris Xe',gpuClass:'integrated',tester:'QA Tester',signature:'QA Tester / confirmed',notes:'Completed the required route.'};
const evidence=director.evidence(identity),session=evidence.sessions[0];
assert.equal(evidence.validation.ready,true);
assert.equal(session.passed,true);assert.equal(session.crashes,0);assert.ok(session.durationMinutes>=.1);assert.ok(session.p95FrameMs<=40);assert.equal(session.bootSeconds,8.2);
assert.ok(session.diagnostics.frameCount===360&&session.diagnostics.maxFrameMs>=26);

const unsigned=new PlaytestEvidenceDirector({minimumMinutes:0});unsigned.markBootComplete(1000);unsigned.start();unsigned.recordFrame(1/60,true);for(const key of PLAYTEST_CHECK_KEYS)unsigned.setCheck(key,true);
assert.equal(unsigned.evidence({...identity,signature:''}).sessions[0].passed,false,'unsigned evidence must never pass');
assert.equal(unsigned.evidence({...identity,browserVersion:'123'}).sessions[0].passed,false,'browser below the release minimum must never pass');
const errored=new PlaytestEvidenceDirector({minimumMinutes:0});errored.markBootComplete(1000);errored.start();errored.recordFrame(1/60,true);for(const key of PLAYTEST_CHECK_KEYS)errored.setCheck(key,true);errored.recordError('error','synthetic runtime error');
assert.equal(errored.evidence(identity).sessions[0].passed,false,'a runtime error must fail the session');
const completeSession=browser=>({...session,browser,browserVersion:String(browser==='Firefox'?126:124),durationMinutes:30,gpuClass:browser==='Chrome'?'integrated':'discrete'});
const completeSessions=['Chrome','Edge','Firefox'].map(completeSession);
assert.equal(validatePlaytestSessions(completeSessions).ok,true);
const completeDocuments=completeSessions.map(item=>({productVersion:'18.0.2',sessions:[item],integrity:{algorithm:'SHA-256',sessionSha256:playtestSessionSha256(item)}}));
assert.equal(mergeEvidenceDocuments(completeDocuments).sessions.length,3);
assert.throws(()=>mergeEvidenceDocuments(completeDocuments.map((document,index)=>index?document:{...document,sessions:[{...document.sessions[0],p95FrameMs:39}]})),/SHA-256/,'edited evidence must fail integrity validation');
assert.equal(validatePlaytestSessions(completeSessions.map(item=>({...item,gpuClass:'discrete'}))).ok,false,'matrix needs integrated GPU evidence');

const main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8')),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
for(const token of ['new PlaytestEvidenceDirector','playtestEvidence.recordFrame','playtestEvidence.markBootComplete','function renderQaPanel','function exportQaEvidence','webglRendererInfo','beginQaSession',"crypto.subtle.digest('SHA-256'"])assert.ok(main.includes(token),'runtime QA evidence integration missing '+token);
for(const token of ['id="qaPanel"','id="qaExport"','data-qa-check="gamepadVerified"','QA EVIDENCE · F10'])assert.ok(index.includes(token),'QA panel missing '+token);
assert.ok(policy.requiredFiles.includes('v18/playtest-evidence-system.js')&&policy.sourceFiles.includes('v18/playtest-evidence-system.js'),'release policy must package QA evidence module');
assert.ok(smoke.includes('signed local playtest evidence recorder'),'package smoke must cover QA evidence module');
assert.ok(workflow.includes('v18-playtest-evidence-check.mjs'),'CI must run QA evidence checks');
assert.ok(fs.readFileSync('docs/PLAYTEST_PROTOCOL.md','utf8').includes('Five manual gates'),'manual QA protocol must define the signed verification procedure');
console.log('PASS playtest evidence: browser and OS detection, uncapped frame histogram, p50/p95, boot time, runtime errors, five manual gates, tester signature, integrated GPU confirmation, local export, UI, release package, smoke, and CI');
