import fs from 'node:fs';

const example=JSON.parse(fs.readFileSync('release/playtest-matrix.example.json','utf8')),audit=fs.readFileSync('scripts/release-audit.mjs','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8')),tests=[],add=(name,ok)=>tests.push({name,ok:Boolean(ok)}),sessions=example.sessions;
add('example covers every required browser',policy.requiredBrowserTargets.every(target=>sessions.some(session=>target.startsWith(session.browser))));
add('each session requires 30 minutes',sessions.every(session=>session.durationMinutes===30));
add('integrated GPU evidence is represented',sessions.some(session=>session.gpuClass==='integrated'));
add('performance metrics are explicit',sessions.every(session=>['bootSeconds','p50FrameMs','p95FrameMs','crashes'].every(key=>key in session)));
add('save, controls, gamepad, accessibility and gameplay verification are explicit',sessions.every(session=>['saveLoadRecovered','controlsVerified','gamepadVerified','accessibilityVerified','activityAndFishingVerified'].every(key=>key in session)));
add('tester signature fields are required',sessions.every(session=>['tester','signedAt','signature'].every(key=>key in session)));
add('audit enforces version and duration',audit.includes('version>=minimum')&&audit.includes('Number(session.durationMinutes)>=30'));
add('audit enforces crash and p95 limits',audit.includes('Number(session.crashes)===0')&&audit.includes('Number(session.p95FrameMs)<=40'));
add('audit independently verifies evidence SHA-256',audit.includes('sourceEvidence')&&audit.includes("createHash('sha256').update(JSON.stringify(session))"));
add('audit rejects duplicate or extra sessions and hashes',audit.includes('sessions.length!==requiredSessionCount')&&audit.includes('sourceEvidence.length!==requiredSessionCount')&&audit.includes('browserSessions.length!==1')&&audit.includes('browserEvidence.length!==1'));
add('audit rejects unknown machine identity',audit.includes("['integrated','discrete'].includes(session.gpuClass)")&&audit.includes("session.os&&!/REPLACE_WITH|^Unknown$/i.test(session.os)")&&audit.includes("session.gpu&&!/REPLACE_WITH|^Unknown$/i.test(session.gpu)"));
add('audit does not accept the placeholder example',sessions.every(session=>session.passed===false)&&audit.includes("release/playtest-matrix.json"));

let failed=0;for(const test of tests){console.log(`${test.ok?'PASS':'FAIL'} ${test.name}`);if(!test.ok)failed++}console.log(`\n${tests.length-failed}/${tests.length} playtest evidence checks PASS`);process.exit(failed?1:0);
