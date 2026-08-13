import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { inspectRiderGlb } from './rider-glb-validator.mjs';

const root=process.cwd(),arg=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:null},sourceArg=arg('--source'),metadataArg=arg('--metadata'),dryRun=process.argv.includes('--dry-run');
if(!sourceArg||!metadataArg){console.error('Usage: node scripts/import-rider-assets.mjs --source <folder> --metadata <json> [--dry-run]');process.exit(2)}
const source=path.resolve(sourceArg),metadataFile=path.resolve(metadataArg),manifestFile=path.join(root,'assets/manifest.json');
if(!fs.existsSync(source)||!fs.statSync(source).isDirectory())throw new Error(`Source folder not found: ${source}`);
if(!fs.existsSync(metadataFile))throw new Error(`Metadata file not found: ${metadataFile}`);
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8')),entries=manifest.assets.filter(asset=>asset.category==='rider');
if(entries.length!==16)throw new Error(`Expected 16 rider manifest entries, found ${entries.length}`);
const common=metadata.common||{},requiredCommon=['source','license','licenseUrl','acquisitionDate'];for(const key of requiredCommon)if(!common[key]||/REPLACE_WITH/i.test(common[key]))throw new Error(`Metadata common.${key} is missing or placeholder`);
if(Number.isNaN(Date.parse(common.acquisitionDate)))throw new Error('Metadata common.acquisitionDate must be a valid date');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),validated=[];
for(const asset of entries){
  const riderId=asset.id.replace(/^rider-/,'').replace(/-hero$/,''),fileName=path.basename(asset.url),input=path.join(source,fileName),rights=metadata.riders?.[riderId];
  if(!fs.existsSync(input))throw new Error(`Missing rider file: ${fileName}`);
  for(const key of['copyrightHolder','reference'])if(!rights?.[key]||/REPLACE_WITH/i.test(rights[key]))throw new Error(`Metadata riders.${riderId}.${key} is missing or placeholder`);
  const validation=inspectRiderGlb(input,manifest.characterRig);if(!validation.ok)throw new Error(`${fileName} failed rig validation: ${validation.failures.join('; ')}`);
  const target=path.join(root,asset.url.replace(/^\.\//,''));if(fs.existsSync(target))throw new Error(`Refusing to overwrite existing rider: ${target}`);
  validated.push({asset,riderId,input,target,rights,sha256:hash(input),stats:validation.stats});
}
console.log(`VALIDATED ${validated.length}/16 rider GLBs`);for(const item of validated)console.log(`PASS ${item.riderId} ${item.sha256.slice(0,12)} ${JSON.stringify(item.stats)}`);
if(dryRun){console.log('DRY RUN: no files or manifest changed');process.exit(0)}
for(const item of validated){fs.mkdirSync(path.dirname(item.target),{recursive:true});fs.copyFileSync(item.input,item.target);Object.assign(item.asset,{enabled:true,source:common.source,license:common.license,licenseUrl:common.licenseUrl,acquisitionDate:common.acquisitionDate,copyrightHolder:item.rights.copyrightHolder,reference:item.rights.reference,sha256:item.sha256})}
const temporary=`${manifestFile}.import-${Date.now()}.tmp`;fs.writeFileSync(temporary,JSON.stringify(manifest,null,2)+'\n');fs.renameSync(temporary,manifestFile);console.log('IMPORT COMPLETE: 16 riders copied, hashed and enabled atomically in the manifest');
