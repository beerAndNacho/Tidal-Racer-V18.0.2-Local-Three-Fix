const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export class PerformanceGovernor{
  constructor({renderer,composer,quality='balanced',basePixelRatio=globalThis.devicePixelRatio||1,targetFps=55}={}){
    this.renderer=renderer;this.composer=composer;this.quality=quality;this.basePixelRatio=clamp(basePixelRatio,1,2);this.targetFps=targetFps;this.scale=1;this.emaFps=60;this.emaCalls=0;this.emaTriangles=0;this.lowTimer=0;this.highTimer=0;this.cooldown=0;this.diagnosticTimer=0;this.adjustments=0;this.lastReason='initial';
    if(this.renderer?.info)this.renderer.info.autoReset=false;
    this.apply('initial');
  }
  get minScale(){return this.quality==='ultra'?.78:.66}
  setQuality(quality){this.quality=quality;this.scale=Math.max(this.scale,this.minScale);this.apply('quality-change')}
  resize(){this.apply('resize')}
  apply(reason='adaptive'){
    const width=globalThis.innerWidth||1280,height=globalThis.innerHeight||720,ratio=clamp(this.basePixelRatio*this.scale,1,2);
    this.renderer?.setPixelRatio?.(ratio);this.renderer?.setSize?.(width,height,false);this.composer?.setPixelRatio?.(ratio);this.composer?.setSize?.(width,height);this.lastReason=reason;
    if(globalThis.document?.body){document.body.dataset.renderScale=this.scale.toFixed(2);document.body.dataset.pixelRatio=ratio.toFixed(2);document.body.dataset.performanceTier=this.scale<.78?'performance':this.scale<.96?'balanced':'quality'}
  }
  sample(dt,active=true){
    if(!Number.isFinite(dt)||dt<=0||dt>.2)return this.snapshot();
    const fps=1/dt;this.emaFps+=clamp(dt*2.4,.035,.18)*(fps-this.emaFps);this.cooldown=Math.max(0,this.cooldown-dt);this.diagnosticTimer+=dt;
    const calls=this.renderer?.info?.render?.calls||0,triangles=this.renderer?.info?.render?.triangles||0,blend=clamp(dt*4,.05,.2);this.emaCalls+=blend*(calls-this.emaCalls);this.emaTriangles+=blend*(triangles-this.emaTriangles);const overBudget=this.emaCalls>4_500||this.emaTriangles>2_400_000,low=active&&(this.emaFps<48||overBudget),high=active&&this.emaFps>58&&!overBudget;
    this.lowTimer=low?this.lowTimer+dt:Math.max(0,this.lowTimer-dt*1.8);this.highTimer=high?this.highTimer+dt:Math.max(0,this.highTimer-dt);
    if(this.cooldown<=0&&this.lowTimer>3.2&&this.scale>this.minScale){this.scale=clamp(this.scale-.1,this.minScale,1);this.lowTimer=0;this.highTimer=0;this.cooldown=4.5;this.adjustments++;this.apply(overBudget?'geometry-budget':'frame-budget')}
    else if(this.cooldown<=0&&this.highTimer>9&&this.scale<1){this.scale=clamp(this.scale+.06,this.minScale,1);this.lowTimer=0;this.highTimer=0;this.cooldown=6;this.adjustments++;this.apply('headroom')}
    if(this.diagnosticTimer>.5){this.diagnosticTimer=0;if(globalThis.document?.body){document.body.dataset.fps=this.emaFps.toFixed(1);document.body.dataset.frameMs=(1000/Math.max(1,this.emaFps)).toFixed(1);document.body.dataset.drawCalls=String(calls);document.body.dataset.averageDrawCalls=String(Math.round(this.emaCalls));document.body.dataset.triangles=String(triangles);document.body.dataset.performanceBudget=overBudget?'over':'within'}}
    return this.snapshot();
  }
  snapshot(){return{fps:this.emaFps,scale:this.scale,quality:this.quality,adjustments:this.adjustments,reason:this.lastReason,calls:this.renderer?.info?.render?.calls||0,averageCalls:this.emaCalls,triangles:this.renderer?.info?.render?.triangles||0}}
}
