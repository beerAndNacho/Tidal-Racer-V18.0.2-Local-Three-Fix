import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { runReleaseAudit } from './release-audit.mjs';
import { collectThreeRuntimeFiles } from './three-runtime-files.mjs';

const root=process.cwd(),preview=process.argv.includes('--preview'),policy=JSON.parse(fs.readFileSync(path.join(root,'release/release-policy.json'),'utf8'));
const audit=runReleaseAudit({runTests:true,write:true});
if(!audit.saleReady&&!preview){
  const formatEvidence=evidence=>typeof evidence==='string'?evidence:JSON.stringify(evidence);
  const blocked=audit.checks.filter(check=>check.severity==='blocker'&&!check.ok).map(check=>`- ${check.id}: ${formatEvidence(check.evidence)}`).join('\n');
  console.error(`COMMERCIAL BUILD BLOCKED\n${blocked}\n\nUse --preview only for internal QA.`);
  process.exit(2);
}

const safeVersion=policy.version.replace(/[^0-9A-Za-z.-]/g,'-'),stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),channel=preview?'preview':'commercial';
const output=path.join(root,'release','builds',`tidal-racer-${safeVersion}-${channel}-${stamp}`);
if(fs.existsSync(output))throw new Error(`Refusing to overwrite existing build: ${output}`);
fs.mkdirSync(output,{recursive:true});

const files=['index.html','data-v12.js','systems-v13.js','README.md','README_LOCAL.txt','LICENSE','SECURITY.md','run_local.bat','run_local.sh','serve_local.ps1','prepare_vendor.py','serve_local.py','docs/PRESS_KIT.md','docs/PLAYTEST_PROTOCOL.md','docs/promo/THREADS_KO.md','docs/promo/THREADS_CAMPAIGN_KO.md','docs/promo/PROVENANCE.md','docs/promo/tidal-racer-launch-key-art.png'];
const folders=['assets','v18','v16','v17'];
const threeRuntimeFiles=collectThreeRuntimeFiles(root),extraFiles=['v14/audio-director.js',...threeRuntimeFiles];
const copyFile=relative=>{const source=path.join(root,relative),target=path.join(output,relative);if(!fs.existsSync(source))throw new Error(`Missing package input: ${relative}`);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target)};
for(const file of files)copyFile(file);
for(const folder of folders)fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true});
for(const file of [...new Set(extraFiles)])copyFile(file);
copyFile('release/release-policy.json');copyFile('release/RELEASE_AUDIT.json');
if(!preview)for(const legalFile of['release/EULA.md','release/PRIVACY.md','release/SUPPORT_POLICY.md'])copyFile(legalFile);

const localModuleRefs=[];
for(const relative of threeRuntimeFiles.filter(file=>file.endsWith('.js'))){const source=fs.readFileSync(path.join(output,relative),'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*\()\s*["'](\.[^"']+)["']/g))localModuleRefs.push(path.normalize(path.join(path.dirname(relative),match[1])))}
const missingLocalModules=[...new Set(localModuleRefs)].filter(relative=>!fs.existsSync(path.join(output,relative)));
if(missingLocalModules.length){console.error(`PACKAGE MODULE PREFLIGHT FAILED: ${missingLocalModules.join(', ')}`);process.exit(4)}

const smoke=spawnSync(process.execPath,[path.join(root,'scripts/package-smoke-check.mjs')],{cwd:output,encoding:'utf8'});
if(smoke.status!==0){console.error(smoke.stdout);console.error(smoke.stderr);process.exit(smoke.status||3)}

const packageFiles=[];
const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);entry.isDirectory()?walk(file):packageFiles.push(file)}};
walk(output);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const manifest={product:policy.product,version:policy.version,channel,createdAt:new Date().toISOString(),commercialRelease:audit.saleReady,auditSummary:audit.summary,files:packageFiles.sort().map(file=>({path:path.relative(output,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:hash(file)}))};
manifest.totalBytes=manifest.files.reduce((sum,file)=>sum+file.bytes,0);
fs.writeFileSync(path.join(output,'PACKAGE_MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`BUILD OK: ${path.relative(root,output)}`);
console.log(`CHANNEL=${channel} FILES=${manifest.files.length} SIZE=${(manifest.totalBytes/1048576).toFixed(2)} MiB SHA256_MANIFEST=true`);
console.log(smoke.stdout.trim());
