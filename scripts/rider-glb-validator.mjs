import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function inspectRiderGlb(file,rig){
  const failures=[],buffer=fs.readFileSync(file);
  if(buffer.length<20||buffer.readUInt32LE(0)!==0x46546c67)return{ok:false,failures:['invalid GLB magic or truncated header']};
  if(buffer.readUInt32LE(4)!==2)failures.push('GLB version must be 2');
  if(buffer.readUInt32LE(8)!==buffer.length)failures.push('declared GLB length does not match file size');
  const jsonLength=buffer.readUInt32LE(12),jsonType=buffer.readUInt32LE(16);
  if(jsonType!==0x4e4f534a||20+jsonLength>buffer.length)return{ok:false,failures:[...failures,'first GLB chunk is not valid JSON']};
  let gltf;
  try{gltf=JSON.parse(buffer.subarray(20,20+jsonLength).toString('utf8').replace(/[\u0000 ]+$/g,''))}
  catch{return{ok:false,failures:[...failures,'GLB JSON cannot be parsed']}}
  const nodeNames=new Set((gltf.nodes||[]).map(node=>node.name).filter(Boolean));
  const animationNames=new Set((gltf.animations||[]).map(animation=>animation.name).filter(Boolean));
  const missingBones=rig.requiredBones.filter(name=>!nodeNames.has(name));
  const missingAnimations=rig.requiredAnimations.filter(name=>!animationNames.has(name));
  if(missingBones.length)failures.push(`missing bones: ${missingBones.join(', ')}`);
  if(missingAnimations.length)failures.push(`missing animations: ${missingAnimations.join(', ')}`);
  const meshes=gltf.meshes||[],accessors=gltf.accessors||[],primitives=meshes.flatMap(mesh=>mesh.primitives||[]);
  const vertexCount=primitives.reduce((total,primitive)=>total+(accessors[primitive.attributes?.POSITION]?.count||0),0);
  const animationChannels=(gltf.animations||[]).reduce((total,animation)=>total+(animation.channels||[]).length,0);
  if(!(gltf.skins||[]).length)failures.push('no skin found');
  if(!meshes.length)failures.push('no mesh found');
  if(vertexCount<6000)failures.push(`insufficient LOD0 geometry: ${vertexCount} vertices (minimum 6000)`);
  if((gltf.materials||[]).length<6)failures.push(`insufficient material separation: ${(gltf.materials||[]).length} materials (minimum 6)`);
  if(primitives.length<18)failures.push(`insufficient mesh segmentation: ${primitives.length} primitives (minimum 18)`);
  if(animationChannels<42)failures.push(`insufficient authored animation channels: ${animationChannels} (minimum 42)`);
  return{
    ok:failures.length===0,
    failures,
    stats:{
      fileBytes:buffer.length,
      nodes:(gltf.nodes||[]).length,
      meshes:meshes.length,
      primitives:primitives.length,
      vertices:vertexCount,
      materials:(gltf.materials||[]).length,
      skins:(gltf.skins||[]).length,
      animations:(gltf.animations||[]).length,
      animationChannels
    }
  };
}

export function validateEnabledRiders(root=process.cwd(),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/manifest.json'),'utf8'))){
  return manifest.assets.filter(asset=>asset.category==='rider'&&asset.enabled!==false).map(asset=>{
    const file=path.join(root,asset.url.replace(/^\.\//,''));
    if(!fs.existsSync(file))return{id:asset.id,ok:false,failures:['file missing']};
    return{id:asset.id,...inspectRiderGlb(file,manifest[asset.requiredRig]||manifest.characterRig)};
  });
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const manifest=JSON.parse(fs.readFileSync('assets/manifest.json','utf8'));
  const fileArg=process.argv.find(argument=>argument.startsWith('--file='));
  const results=fileArg
    ? [{id:path.basename(fileArg.slice(7)),...inspectRiderGlb(path.resolve(fileArg.slice(7)),manifest.characterRig)}]
    : validateEnabledRiders();
  console.log(`PASS rider manifest defines ${manifest.characterRig.requiredBones.length} required bones and ${manifest.characterRig.requiredAnimations.length} required animations`);
  if(!results.length)console.log('PASS no unvalidated rider GLBs are enabled');
  for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.id}${result.ok?` ${JSON.stringify(result.stats)}`:` ${result.failures.join('; ')}`}`);
  process.exit(results.some(result=>!result.ok)?1:0);
}
