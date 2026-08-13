import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ids=['rhea','kai','sol','mina','jax','nari','omar','yuna','theo','amara','ren','luz','haneul','mako','ivy','zane'];
const main=read('v18/main.js');
const html=read('index.html');
const checks=[];
const check=(name,ok)=>{checks.push([name,Boolean(ok)]);console.log(`${ok?'PASS':'FAIL'} ${name}`)};

for(const id of ids){
  const file=path.join(root,'assets','portraits',`rider-${id}-portrait-v1.webp`);
  check(`${id} portrait is production-sized`,fs.existsSync(file)&&fs.statSync(file).size>10_000);
}
check('portrait URL helper is versioned',main.includes('riderPortraitUrl=id=>`./assets/portraits/rider-${id}-portrait-v1.webp`'));
check('all rider choices render image assets',main.includes("b.className='choice riderChoice'")&&main.includes('<img src="${riderPortraitUrl(r.id)}"'));
check('selected rider portrait updates',main.includes('portrait.src=riderPortraitUrl(r.id)')&&main.includes('portrait.alt=`${r.name} rider portrait`'));
check('profile portrait is present',html.includes('id="riderPortrait"')&&html.includes('class="riderBioLayout"'));
check('portrait cards have production styling',html.includes('.riderChoice img{')&&html.includes('.riderPortraitWrap img{'));
check('portrait provenance is documented',fs.existsSync(path.join(root,'assets','portraits','README.md')));

const failed=checks.filter(([,ok])=>!ok);
console.log(`\n${checks.length-failed.length}/${checks.length} checks passed`);
if(failed.length)process.exitCode=1;
