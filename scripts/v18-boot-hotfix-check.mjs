import fs from 'node:fs';
const index=fs.readFileSync('index.html','utf8');
const boot=fs.readFileSync('v18/bootstrap.js','utf8');
const checks=[
  ['V18.0.2 title',index.includes('V18.0.2')&&index.includes('Race, Fish, Explore')],
  ['inline favicon',index.includes('rel="icon"')&&!index.includes('/favicon.ico')],
  ['import map before bootstrap',index.indexOf('type="importmap"')>=0&&index.indexOf('type="importmap"')<index.indexOf('src="./v18/bootstrap.js"')],
  ['no premature modulepreload',!index.includes('modulepreload')],
  ['static copy is null-safe',boot.includes("const titleEl=document.querySelector('#bootTitle')")&&boot.includes('if(titleEl)titleEl.textContent')],
  ['initial progress executes',boot.includes("report(6,'shell'")],
  ['runtime check advances progress',boot.includes("report(12,'runtime'")&&boot.includes("report(18,'modules'")],
  ['background-tab fallback',boot.includes("setTimeout(()=>startMainImport('timeout-fallback'),40)")],
  ['local module watchdog',boot.includes('12000')&&boot.includes('local-module-timeout')],
  ['visible failure state',boot.includes("root?.classList.add('error')")],
  ['retry button',boot.includes("button.id='bootRetry'")],
  ['unhandled rejection diagnostic',boot.includes("addEventListener('unhandledrejection'")],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
console.log(`\n${checks.length-fail}/${checks.length} V18.0.2 boot checks PASS`);process.exit(fail?1:0);
