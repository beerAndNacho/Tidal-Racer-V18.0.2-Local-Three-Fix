const startedAt = performance.now();
const root = document.querySelector('#bootLoader');
const fill = document.querySelector('#bootProgressFill');
const pct = document.querySelector('#bootPercent');
const label = document.querySelector('#bootLabel');
const detail = document.querySelector('#bootDetail');
const streamStatus = document.querySelector('#streamStatus');

const copy = {
  ko: {
    title: '오픈 아키펠라고 준비 중',
    phases: {
      shell: '화면 준비', runtime: '로컬 그래픽 엔진 확인', modules: '게임 모듈 연결', renderer: '렌더러 준비', post: '후처리 준비',
      sky: '하늘과 조명 준비', water: '거친 수면 준비', coast: 'Golden Coast 생성', props: '핵심 레이스 자원 준비',
      interface: '메뉴와 진행 시스템 준비', player: '라이더와 제트스키 준비', rivals: '라이벌 시스템 준비', language:'한국어·영어 UI 준비', audio:'적응형 오디오 준비', ready: '플레이 준비 완료',
    },
    detail: 'Three.js를 로컬 폴더에서 불러옵니다. CDN을 기다리지 않습니다.',
    error: '초기화에 실패했습니다.',
    missing: '로컬 Three.js 런타임이 없거나 불완전합니다. 브라우저를 닫고 run_local.bat을 다시 실행하세요.',
    timeout: '로컬 모듈 초기화가 비정상적으로 오래 걸립니다. F12 콘솔의 첫 번째 오류를 확인하세요.',
    stream: '월드 스트리밍',
  },
  en: {
    title: 'PREPARING OPEN ARCHIPELAGO',
    phases: {
      shell: 'Preparing interface', runtime: 'Checking local graphics runtime', modules: 'Linking game modules', renderer: 'Renderer ready', post: 'Post-processing ready',
      sky: 'Sky and lighting ready', water: 'Rough-water surface ready', coast: 'Building Golden Coast', props: 'Preparing core race assets',
      interface: 'Menus and progression ready', player: 'Rider and craft ready', rivals: 'Rival system ready', language:'Korean and English UI ready', audio:'Adaptive audio ready', ready: 'Ready to play',
    },
    detail: 'Three.js loads from this folder. No runtime CDN wait is required.',
    error: 'Initialization failed.',
    missing: 'The local Three.js runtime is missing or incomplete. Close the browser and run run_local.bat again.',
    timeout: 'Local module initialization is taking abnormally long. Check the first error in the F12 console.',
    stream: 'WORLD STREAMING',
  },
};

function detectLanguage(){
  const requested = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem('tidal-racer-language'); } catch {}
  if(requested==='ko'||requested==='en')return requested;
  if(saved==='ko'||saved==='en')return saved;
  return navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let lang = detectLanguage();
let lastProgress = 3;
let readyAt = 0;
let streamTimer = 0;

function localPhase(key, fallback){return copy[lang].phases[key] || fallback || key;}
function setStaticCopy(){
  const titleEl=document.querySelector('#bootTitle');
  if(titleEl)titleEl.textContent=copy[lang].title;
  if(detail&&!readyAt)detail.textContent=copy[lang].detail;
}
function report(value, phase='modules', phaseDetail=''){
  lastProgress = Math.max(lastProgress, Math.min(100, Math.round(value)));
  if(fill)fill.style.width = `${lastProgress}%`;
  if(pct)pct.textContent = `${lastProgress}%`;
  if(label)label.textContent = localPhase(phase);
  if(detail && phaseDetail)detail.textContent = phaseDetail;
  performance.mark?.(`tidal-${phase}-${lastProgress}`);
}
function background(key, message){
  if(streamStatus && !streamStatus.classList.contains('done')){
    streamStatus.textContent = `${copy[lang].stream} · ${message}`;
    streamStatus.classList.add('show');
  }
}
function updateStreamingBadge(){
  const state = window.__tidalV18?.streaming;
  if(!state || !streamStatus)return;
  const done = state.loaded===state.total && state.rivals===11 && state.items===34 && state.clouds===42;
  streamStatus.textContent = done
    ? (lang==='ko' ? '월드 스트리밍 완료' : 'WORLD STREAMING COMPLETE')
    : `${lang==='ko'?'월드':'WORLD'} ${state.loaded}/${state.total} · AI ${state.rivals+1}/12 · FX ${state.items+state.clouds}/76`;
  streamStatus.classList.add('show');
  streamStatus.classList.toggle('done',done);
  if(done){clearInterval(streamTimer);setTimeout(()=>streamStatus.classList.remove('show'),1800);}
}
function ready(meta={}){
  if(readyAt)return;
  readyAt=performance.now();
  report(100,'ready',`${Math.round(meta.bootMs ?? readyAt-startedAt)} ms · Three.js LOCAL`);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    root?.classList.add('done');
    document.body.classList.add('game-ready');
    setTimeout(()=>root?.remove(),650);
  }));
  streamTimer=setInterval(updateStreamingBadge,350);
  updateStreamingBadge();
  window.__tidalBootMetrics={startedAt,readyAt,bootMs:readyAt-startedAt,firstContentMs:performance.now()-startedAt,runtime:'local'};
}
function addRetryButton(){
  if(document.querySelector('#bootRetry'))return;
  const button=document.createElement('button');
  button.id='bootRetry';button.type='button';button.textContent=lang==='ko'?'다시 확인':'RETRY';
  Object.assign(button.style,{marginTop:'16px',padding:'10px 16px',border:'1px solid rgba(255,255,255,.18)',borderRadius:'9px',background:'linear-gradient(90deg,#ffd38e,#74ebff)',color:'#07151b',fontWeight:'900',cursor:'pointer'});
  button.addEventListener('click',()=>location.reload());
  root?.querySelector('.bootPanel')?.appendChild(button);
}
function fail(error,kind='runtime'){
  console.error('Tidal Racer bootstrap failed',error);
  root?.classList.add('error');root?.setAttribute('data-error-kind',kind);
  if(label)label.textContent=copy[lang].error;
  if(detail)detail.textContent=String(error?.message||error);
  addRetryButton();
}

window.__tidalBoot={report,background,ready,fail,get language(){return lang;}};

async function fetchWithTimeout(path, timeoutMs=2500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(path,{cache:'no-store',signal:controller.signal});}
  finally{clearTimeout(timer);}
}

async function verifyLocalRuntime(){
  report(12,'runtime',lang==='ko'?'로컬 Three.js 파일을 확인합니다.':'Checking local Three.js files.');
  const required=[
    './vendor/three/build/three.module.js',
    './vendor/three/build/three.core.js',
    './vendor/three/examples/jsm/objects/Water.js',
    './vendor/three/examples/jsm/postprocessing/EffectComposer.js',
  ];
  const results=await Promise.all(required.map(async(path)=>{
    try{const response=await fetchWithTimeout(path);return {path,ok:response.ok,status:response.status};}
    catch(error){return {path,ok:false,error};}
  }));
  const failed=results.filter(result=>!result.ok);
  if(failed.length){
    console.table(results.map(({path,ok,status,error})=>({path,ok,status,error:String(error?.message||'')})));
    throw new Error(`${copy[lang].missing}\n${failed.map(item=>item.path).join('\n')}`);
  }
  report(18,'modules',lang==='ko'?'로컬 모듈 그래프를 연결합니다.':'Linking the local module graph.');
}

setStaticCopy();
report(6,'shell',copy[lang].detail);

let importStarted=false;
let readyWatchdog=0;
async function startMainImport(reason='timer'){
  if(importStarted)return;
  importStarted=true;
  document.documentElement.dataset.bootTrigger=reason;
  try{
    await verifyLocalRuntime();
    readyWatchdog=setTimeout(()=>{
      if(!readyAt)fail(new Error(copy[lang].timeout),'local-module-timeout');
    },12000);
    await import('./main.js?v=1802');
  }catch(error){
    clearTimeout(readyWatchdog);
    fail(error,/vendor\/three/.test(String(error?.message||error))?'local-runtime-missing':'module-import');
  }
}

// Use both a timer and rAF so minimized/background tabs cannot remain at a static percentage.
const fallbackTimer=setTimeout(()=>startMainImport('timeout-fallback'),40);
if(document.visibilityState==='visible')requestAnimationFrame(()=>{clearTimeout(fallbackTimer);startMainImport('animation-frame');});
addEventListener('pageshow',()=>startMainImport('pageshow'),{once:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')startMainImport('visibilitychange');},{once:true});

addEventListener('error',(event)=>{if(!readyAt&&event.error)fail(event.error,'window-error');});
addEventListener('unhandledrejection',(event)=>{if(!readyAt)fail(event.reason||new Error('Unhandled promise rejection'),'unhandled-rejection');});
addEventListener('tidal-language-change',(event)=>{
  lang=event.detail?.lang||lang;setStaticCopy();
  const retry=document.querySelector('#bootRetry');if(retry)retry.textContent=lang==='ko'?'다시 확인':'RETRY';
  updateStreamingBadge();
});
