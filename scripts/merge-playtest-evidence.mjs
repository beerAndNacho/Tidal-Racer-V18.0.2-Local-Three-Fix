import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PLAYTEST_BROWSER_MINIMUMS, PLAYTEST_CHECK_KEYS } from '../v18/playtest-evidence-system.js';

export function validatePlaytestSessions(sessions=[]){
  const errors=[],validBrowsers=Object.keys(PLAYTEST_BROWSER_MINIMUMS);
  if(!Array.isArray(sessions))return{ok:false,errors:['sessions must be an array'],sessions:[]};
  const clean=sessions.map(session=>({...session}));
  for(const browser of validBrowsers){
    const matches=clean.filter(session=>session.browser===browser);
    if(matches.length!==1){errors.push(browser+' requires exactly one session');continue}
    const session=matches[0],minimum=PLAYTEST_BROWSER_MINIMUMS[browser];
    if(Number.parseInt(session.browserVersion,10)<minimum)errors.push(browser+' version must be '+minimum+'+');
    if(!(Number(session.durationMinutes)>=30))errors.push(browser+' duration must be at least 30 minutes');
    if(session.passed!==true)errors.push(browser+' session is not marked passed');
    if(Number(session.crashes)!==0)errors.push(browser+' runtime errors/crashes must be zero');
    if(!(Number(session.bootSeconds)>0&&Number(session.bootSeconds)<=15))errors.push(browser+' boot time must be 0-15 seconds');
    if(!(Number(session.p50FrameMs)>0&&Number(session.p95FrameMs)>0&&Number(session.p95FrameMs)<=40))errors.push(browser+' frame metrics fail the 40ms p95 budget');
    for(const key of PLAYTEST_CHECK_KEYS)if(session[key]!==true)errors.push(browser+' missing '+key);
    for(const key of ['tester','signature','signedAt','gpu','gpuClass','os'])if(!session[key]||/REPLACE_WITH|^Unknown$/i.test(String(session[key])))errors.push(browser+' missing '+key);
    if(Number.isNaN(Date.parse(session.signedAt)))errors.push(browser+' signedAt is invalid');
    if(!['integrated','discrete'].includes(session.gpuClass))errors.push(browser+' GPU class is invalid');
  }
  if(clean.length!==validBrowsers.length||clean.filter(session=>validBrowsers.includes(session.browser)).length!==validBrowsers.length)errors.push('matrix must contain exactly the three required browser sessions');
  if(!clean.some(session=>session.gpuClass==='integrated'))errors.push('at least one integrated GPU session is required');
  return{ok:errors.length===0,errors,sessions:clean};
}

export function playtestSessionSha256(session){
  return crypto.createHash('sha256').update(JSON.stringify(session)).digest('hex');
}

export function mergeEvidenceDocuments(documents=[]){
  const sessions=[],sourceEvidence=[];for(const document of documents){if(document?.productVersion!=='18.0.2')throw new Error('Evidence productVersion must be 18.0.2');if(!Array.isArray(document.sessions)||document.sessions.length!==1)throw new Error('Each evidence document must contain exactly one session');const session=document.sessions[0],actual=playtestSessionSha256(session),recorded=document.integrity?.algorithm==='SHA-256'?document.integrity.sessionSha256:'';if(!recorded||recorded!==actual)throw new Error('Evidence SHA-256 is missing or does not match for '+(session.browser||'Unknown'));sessions.push(session);sourceEvidence.push({browser:session.browser,sessionSha256:actual})}
  const validated=validatePlaytestSessions(sessions);if(!validated.ok)throw new Error('PLAYTEST MATRIX BLOCKED\n- '+validated.errors.join('\n- '));
  return{version:1,productVersion:'18.0.2',generatedAt:new Date().toISOString(),sourceEvidence,sessions:validated.sessions};
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const args=process.argv.slice(2),outputIndex=args.indexOf('--output'),output=outputIndex>=0?args[outputIndex+1]:'release/playtest-matrix.json',inputs=args.filter((arg,index)=>arg!=='--output'&&index!==outputIndex+1);
  if(inputs.length!==3){console.error('Usage: node scripts/merge-playtest-evidence.mjs chrome.json edge.json firefox.json --output release/playtest-matrix.json');process.exit(2)}
  try{const matrix=mergeEvidenceDocuments(inputs.map(file=>JSON.parse(fs.readFileSync(file,'utf8'))));fs.writeFileSync(output,JSON.stringify(matrix,null,2)+'\n');console.log('PLAYTEST MATRIX OK: '+output+' · 3/3 browsers · integrated GPU included')}catch(error){console.error(error.message);process.exit(1)}
}
