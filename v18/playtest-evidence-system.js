const CHECK_KEYS=['saveLoadRecovered','controlsVerified','gamepadVerified','accessibilityVerified','activityAndFishingVerified'];
const MINIMUM_BROWSER_VERSIONS={Chrome:124,Edge:124,Firefox:126};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=(value,digits=2)=>Number(Number(value||0).toFixed(digits));

export function detectPlaytestBrowser(userAgent=''){
  const ua=String(userAgent);
  let match=ua.match(/Edg\/([0-9]+)/);if(match)return{browser:'Edge',browserVersion:match[1]};
  match=ua.match(/Firefox\/([0-9]+)/);if(match)return{browser:'Firefox',browserVersion:match[1]};
  match=ua.match(/(?:Chrome|Chromium)\/([0-9]+)/);if(match)return{browser:'Chrome',browserVersion:match[1]};
  return{browser:'Unknown',browserVersion:'0'};
}

export function detectPlaytestOs(userAgent='',platform=''){
  const ua=String(userAgent),p=String(platform);
  const windows=ua.match(/Windows NT ([0-9.]+)/);if(windows)return'Windows NT '+windows[1];
  const mac=ua.match(/Mac OS X ([0-9_]+)/);if(mac)return'macOS '+mac[1].replaceAll('_','.');
  if(/Linux/i.test(ua)||/Linux/i.test(p))return'Linux';
  return p||'Unknown';
}

export class PlaytestEvidenceDirector{
  constructor({productVersion='18.0.2',minimumMinutes=30,maxBootSeconds=15,maxP95FrameMs=40}={}){
    this.productVersion=productVersion;this.minimumMinutes=minimumMinutes;this.maxBootSeconds=maxBootSeconds;this.maxP95FrameMs=maxP95FrameMs;this.bootSeconds=0;this.reset();
  }
  reset(){
    this.active=false;this.elapsedSeconds=0;this.frameCount=0;this.frameTotalMs=0;this.frameMaxMs=0;this.histogram=new Uint32Array(402);this.errors=[];this.checks=Object.fromEntries(CHECK_KEYS.map(key=>[key,false]));this.startedAt=null;this.lastExportAt=null;return this.snapshot();
  }
  markBootComplete(milliseconds){if(!this.bootSeconds&&Number(milliseconds)>0)this.bootSeconds=round(Number(milliseconds)/1000,3);return this.bootSeconds}
  start(){this.reset();this.active=true;this.startedAt=new Date().toISOString();return this.snapshot()}
  stop(){this.active=false;return this.snapshot()}
  recordFrame(dt,playing=true){
    if(!this.active||!playing||!Number.isFinite(dt)||dt<=0)return this.snapshot();
    const seconds=clamp(dt,0,.5),milliseconds=seconds*1000,index=Math.min(this.histogram.length-1,Math.floor(milliseconds*2));
    this.elapsedSeconds+=seconds;this.frameCount++;this.frameTotalMs+=milliseconds;this.frameMaxMs=Math.max(this.frameMaxMs,milliseconds);this.histogram[index]++;return this.snapshot();
  }
  recordError(type,message){
    if(!this.active)return this.snapshot();
    this.errors.push({type:String(type||'runtime-error').slice(0,48),message:String(message||'Unknown runtime error').slice(0,500),atSeconds:round(this.elapsedSeconds,2)});
    return this.snapshot();
  }
  setCheck(key,value=true){if(CHECK_KEYS.includes(key))this.checks[key]=Boolean(value);return this.snapshot()}
  percentile(ratio){
    if(!this.frameCount)return 0;const target=Math.max(1,Math.ceil(this.frameCount*clamp(ratio,0,1)));let count=0;
    for(let index=0;index<this.histogram.length;index++){count+=this.histogram[index];if(count>=target)return round(index/2,2)}
    return round(this.frameMaxMs,2);
  }
  metrics(){
    return{durationMinutes:round(this.elapsedSeconds/60,2),frameCount:this.frameCount,p50FrameMs:this.percentile(.5),p95FrameMs:this.percentile(.95),meanFrameMs:this.frameCount?round(this.frameTotalMs/this.frameCount,2):0,maxFrameMs:round(this.frameMaxMs,2),bootSeconds:this.bootSeconds,crashes:this.errors.length};
  }
  snapshot(){return{active:this.active,startedAt:this.startedAt,lastExportAt:this.lastExportAt,checks:{...this.checks},errors:this.errors.slice(),...this.metrics()}}
  readiness(identity={}){
    const metrics=this.metrics(),missing=[];
    if(metrics.durationMinutes<this.minimumMinutes)missing.push('30-minute active session');
    if(!(metrics.bootSeconds>0&&metrics.bootSeconds<=this.maxBootSeconds))missing.push('boot time <= '+this.maxBootSeconds+'s');
    if(!(metrics.p95FrameMs>0&&metrics.p95FrameMs<=this.maxP95FrameMs))missing.push('p95 frame time <= '+this.maxP95FrameMs+'ms');
    if(metrics.crashes!==0)missing.push('zero runtime errors');
    for(const key of CHECK_KEYS)if(!this.checks[key])missing.push(key);
    if(!['Chrome','Edge','Firefox'].includes(identity.browser))missing.push('supported browser');
    const minimum=MINIMUM_BROWSER_VERSIONS[identity.browser]||Infinity;if(!(Number.parseInt(identity.browserVersion,10)>=minimum))missing.push((identity.browser||'browser')+' '+minimum+'+');
    if(!identity.gpu||identity.gpu==='Unknown')missing.push('GPU model');
    if(!identity.os||identity.os==='Unknown')missing.push('operating system');
    if(!['integrated','discrete'].includes(identity.gpuClass))missing.push('GPU class confirmation');
    if(!String(identity.tester||'').trim())missing.push('tester name');
    if(!String(identity.signature||'').trim())missing.push('tester signature');
    return{ready:missing.length===0,missing,metrics};
  }
  evidence(identity={}){
    const gate=this.readiness(identity),session={browser:identity.browser||'Unknown',browserVersion:String(identity.browserVersion||'0'),os:String(identity.os||'Unknown'),gpu:String(identity.gpu||'Unknown'),gpuClass:String(identity.gpuClass||'unconfirmed'),durationMinutes:gate.metrics.durationMinutes,tester:String(identity.tester||'').trim(),signedAt:new Date().toISOString(),signature:String(identity.signature||'').trim(),passed:gate.ready,crashes:gate.metrics.crashes,bootSeconds:gate.metrics.bootSeconds,p50FrameMs:gate.metrics.p50FrameMs,p95FrameMs:gate.metrics.p95FrameMs,...this.checks,notes:String(identity.notes||'').slice(0,2000),diagnostics:{frameCount:gate.metrics.frameCount,meanFrameMs:gate.metrics.meanFrameMs,maxFrameMs:gate.metrics.maxFrameMs,runtimeErrors:this.errors.slice()}};
    this.lastExportAt=session.signedAt;return{version:1,productVersion:this.productVersion,sessions:[session],validation:{ready:gate.ready,missing:gate.missing}};
  }
}

export const PLAYTEST_CHECK_KEYS=Object.freeze([...CHECK_KEYS]);
export const PLAYTEST_BROWSER_MINIMUMS=Object.freeze({...MINIMUM_BROWSER_VERSIONS});
