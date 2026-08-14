import fs from 'node:fs';
import path from 'node:path';

const slash=value=>value.replaceAll('\\','/');
const walkFiles=dir=>{
  if(!fs.existsSync(dir))return[];
  const files=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);entry.isDirectory()?files.push(...walkFiles(file)):files.push(file)}return files;
};
const projectAddonSeeds=root=>{
  const sources=['v18','v17','v16','v14'].flatMap(folder=>walkFiles(path.join(root,folder))).filter(file=>/\.js$/i.test(file)),seeds=new Set();
  for(const file of sources){const text=fs.readFileSync(file,'utf8');for(const match of text.matchAll(/['"]three\/addons\/([^'"]+)['"]/g))seeds.add(`vendor/three/examples/jsm/${match[1]}`)}
  return[...seeds];
};

export function collectThreeRuntimeFiles(root=process.cwd()){
  const vendorRoot=path.join(root,'vendor','three'),selected=new Set([
    'vendor/three/LICENSE','vendor/three/package.json','vendor/three/build/three.module.js','vendor/three/build/three.core.js',
    ...projectAddonSeeds(root),
  ]),pending=[...selected].filter(file=>/\.(?:js|mjs)$/i.test(file));
  for(const folder of['vendor/three/examples/jsm/libs/draco','vendor/three/examples/jsm/libs/basis'])for(const file of walkFiles(path.join(root,folder)))selected.add(slash(path.relative(root,file)));
  while(pending.length){
    const relative=pending.pop(),absolute=path.join(root,relative);if(!fs.existsSync(absolute))throw new Error(`Missing Three.js runtime dependency: ${relative}`);
    const source=fs.readFileSync(absolute,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)){const dependency=slash(path.relative(root,path.resolve(path.dirname(absolute),match[1])));if(!dependency.startsWith('vendor/three/')||selected.has(dependency))continue;if(!fs.existsSync(path.join(root,dependency)))throw new Error(`Missing Three.js transitive dependency: ${dependency} from ${relative}`);selected.add(dependency);if(/\.(?:js|mjs)$/i.test(dependency))pending.push(dependency)}}
  const files=[...selected].sort();for(const relative of files)if(!fs.existsSync(path.join(root,relative)))throw new Error(`Missing selected Three.js runtime file: ${relative}`);
  return files;
}

export function threeRuntimeBytes(root=process.cwd()){return collectThreeRuntimeFiles(root).reduce((sum,file)=>sum+fs.statSync(path.join(root,file)).size,0)}
