const q = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const REGION_MOODS = {
  'GOLDEN COAST': { root: 110.00, tempo: 116, mode: [0, 4, 7, 9], warmth: 1.0 },
  'VOLCANO BAY': { root: 82.41, tempo: 124, mode: [0, 3, 7, 10], warmth: .62 },
  'MANGROVE DELTA': { root: 98.00, tempo: 104, mode: [0, 3, 5, 10], warmth: .78 },
  'HARBOR CITY': { root: 123.47, tempo: 122, mode: [0, 4, 7, 11], warmth: .82 },
  'STORM STRAIT': { root: 73.42, tempo: 136, mode: [0, 3, 7, 8], warmth: .42 },
  'CORAL EXPANSE': { root: 130.81, tempo: 118, mode: [0, 4, 7, 9], warmth: .95 },
  'MOON ARCHIPELAGO': { root: 92.50, tempo: 96, mode: [0, 3, 7, 10], warmth: .55 },
  'BLACK REEF': { root: 69.30, tempo: 128, mode: [0, 1, 7, 10], warmth: .28 },
  'SKYWATER LAGOON': { root: 164.81, tempo: 112, mode: [0, 4, 7, 11], warmth: .9 },
};

const CHORD_PROGRESSIONS = {
  'GOLDEN COAST': [[0,4,7,11],[9,12,16,19],[5,9,12,16],[7,11,14,18]],
  'VOLCANO BAY': [[0,3,7,10],[8,12,15,19],[5,8,12,15],[10,13,17,20]],
  'MANGROVE DELTA': [[0,3,7,10],[5,8,12,15],[10,14,17,21],[3,7,10,14]],
  'HARBOR CITY': [[0,4,7,11],[7,11,14,18],[9,12,16,19],[5,9,12,16]],
  'STORM STRAIT': [[0,3,7,8],[8,12,15,19],[10,13,17,20],[1,5,8,12]],
  'CORAL EXPANSE': [[0,4,7,9],[5,9,12,16],[9,12,16,19],[7,11,14,18]],
  'MOON ARCHIPELAGO': [[0,3,7,10],[10,14,17,21],[5,8,12,15],[7,10,14,17]],
  'BLACK REEF': [[0,1,7,10],[10,13,17,20],[6,10,13,17],[1,5,8,12]],
  'SKYWATER LAGOON': [[0,4,7,11],[11,14,18,21],[5,9,12,16],[7,11,14,18]],
};

const EVENT_CUES = {
  'TIDAL SURGE': 'danger', 'STORM CELL': 'danger', 'ROGUE WAVE': 'danger',
  'CARGO CONVOY': 'industrial', 'NIGHT MARKET': 'market', 'TREASURE WAKE': 'reward',
  'BUOY SPRINT': 'race', 'GOLDEN CURRENT': 'reward', 'PIRATE RUN': 'danger',
};

class AudioDirector {
  constructor(){
    this.ctx=null; this.unlocked=false; this.enabled=true; this.musicEnabled=true; this.sfxEnabled=true;
    this.master=null; this.musicBus=null; this.sfxBus=null; this.engineBus=null; this.ambientBus=null; this.compressor=null;
    this.musicInput=null;this.musicFilter=null;this.musicDelay=null;this.musicFeedback=null;this.musicDelayWet=null;
    this.engine={}; this.ambient={}; this.musicTimer=null; this.musicStep=0; this.nextBeat=0;
    this.scene='menu'; this.region='GOLDEN COAST'; this.intensity=.15; this.speed=0; this.rpm=1800;
    this.keyState=new Set(); this.lastSpeed=0; this.lastSpeedAt=performance.now(); this.lastItem='EMPTY'; this.lastToast=''; this.eventActive=false;
    this.volumes={master:.82,music:.68,sfx:.82,engine:.58,ambient:.42};try{Object.assign(this.volumes,JSON.parse(localStorage.getItem('tidal-racer-audio-settings')||'null')||{})}catch{}
    this._raf=0;
  }
  ensure(){
    if(this.ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    this.ctx=new AC({latencyHint:'interactive'});
    this.master=this.ctx.createGain(); this.master.gain.value=this.volumes.master;
    this.compressor=this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value=-12;this.compressor.knee.value=18;this.compressor.ratio.value=4;this.compressor.attack.value=.004;this.compressor.release.value=.18;
    this.master.connect(this.compressor).connect(this.ctx.destination);
    this.musicBus=this.ctx.createGain();this.sfxBus=this.ctx.createGain();this.engineBus=this.ctx.createGain();this.ambientBus=this.ctx.createGain();
    this.musicBus.gain.value=this.musicEnabled?this.volumes.music:0;this.sfxBus.gain.value=this.volumes.sfx;this.engineBus.gain.value=this.volumes.engine;this.ambientBus.gain.value=this.volumes.ambient;
    [this.musicBus,this.sfxBus,this.engineBus,this.ambientBus].forEach(n=>n.connect(this.master));
    this.musicInput=this.ctx.createGain();this.musicFilter=this.ctx.createBiquadFilter();this.musicDelay=this.ctx.createDelay(.65);this.musicFeedback=this.ctx.createGain();this.musicDelayWet=this.ctx.createGain();
    this.musicFilter.type='lowpass';this.musicFilter.frequency.value=3400;this.musicFilter.Q.value=.45;this.musicDelay.delayTime.value=.235;this.musicFeedback.gain.value=.17;this.musicDelayWet.gain.value=.18;
    this.musicInput.connect(this.musicFilter);this.musicFilter.connect(this.musicBus);this.musicFilter.connect(this.musicDelay);this.musicDelay.connect(this.musicFeedback).connect(this.musicDelay);this.musicDelay.connect(this.musicDelayWet).connect(this.musicBus);
    this.buildEngine(); this.buildAmbience();
    return true;
  }
  async unlock(){
    if(this.unlocked&&this.ctx?.state==='running')return true;
    if(!this.ensure()){this.updateBadge();return;}
    try{await this.ctx.resume()}catch(error){console.warn('Audio unlock failed',error)}
    this.unlocked=this.ctx.state==='running';this.updateBadge();
    if(!this.unlocked)return false;
    this.engineBus.gain.setTargetAtTime(this.volumes.engine,this.ctx.currentTime,.05);this.ambientBus.gain.setTargetAtTime(this.volumes.ambient,this.ctx.currentTime,.05);
    this.startMusicClock();this.cue('uiConfirm',.5);
    return true;
  }
  attach(){
    const unlock=()=>{void this.unlock().then(ok=>{if(!ok)return;removeEventListener('pointerdown',unlock,true);removeEventListener('keydown',unlock,true);removeEventListener('click',unlock,true)})};
    addEventListener('pointerdown',unlock,true);addEventListener('keydown',unlock,true);addEventListener('click',unlock,true);
    addEventListener('keydown',e=>this.onKeyDown(e),true);addEventListener('keyup',e=>this.onKeyUp(e),true);addEventListener('blur',()=>this.keyState.clear());
    document.addEventListener('click',e=>{if(e.target.closest('button'))this.cue('uiClick',.25)});
    this.observeDom();this._raf=requestAnimationFrame(()=>this.tick());
  }
  toggleMusic(){this.musicEnabled=!this.musicEnabled;if(this.musicBus&&this.ctx)this.musicBus.gain.setTargetAtTime(this.musicEnabled?this.volumes.music:0,this.ctx.currentTime,.05);this.updateBadge()}
  setVolume(channel,value){if(!(channel in this.volumes))return;this.volumes[channel]=clamp(Number(value)||0,0,1);try{localStorage.setItem('tidal-racer-audio-settings',JSON.stringify(this.volumes))}catch{}if(!this.ctx)return;const node={master:this.master,music:this.musicBus,sfx:this.sfxBus,engine:this.engineBus,ambient:this.ambientBus}[channel];if(node)node.gain.setTargetAtTime(channel==='music'&&!this.musicEnabled?0:this.volumes[channel],this.ctx.currentTime,.04)}
  updateBadge(){let el=q('#audioStatus');if(!el){el=document.createElement('div');el.id='audioStatus';el.className='glass';Object.assign(el.style,{position:'fixed',right:'14px',top:'54px',zIndex:'41',padding:'7px 11px',borderRadius:'999px',fontSize:'8px',letterSpacing:'.08em',pointerEvents:'none'});document.body.appendChild(el)}el.classList.toggle('locked',!this.unlocked);el.dataset.audioState=!this.unlocked?'locked':this.musicEnabled?'running':'muted';el.dataset.musicStep=String(this.musicStep);el.textContent=!this.unlocked?'♪ CLICK / KEY TO ENABLE AUDIO':this.musicEnabled?`♪ ADAPTIVE SCORE · ${this.region}`:'♪ MUSIC OFF'}
  onKeyDown(e){
    if(e.code==='KeyM'){this.toggleMusic();return}
    if(this.keyState.has(e.code))return;this.keyState.add(e.code);
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')this.cue('boostIgnite',.7);
    if(e.code==='Space')this.cue('driftStart',.55);
    if(/^Digit[1-4]$/.test(e.code))this.cue(`skill${e.code.slice(-1)}`,.8);
    if(e.code==='KeyE')this.cue('itemUse',.75);
    if(e.code==='KeyF')this.cue('modeSwitch',.5);
    if(e.code==='KeyC')this.cue('camera',.35);
    if(e.code==='KeyG')this.cue('fishingReady',.45);
    if(e.code==='KeyQ'&&document.body.classList.contains('fishing-active'))this.cue('fishingAction',.5);
  }
  onKeyUp(e){this.keyState.delete(e.code);if(e.code==='Space')this.cue('driftRelease',.25)}
  observeDom(){
    const menu=q('#menu');if(menu)new MutationObserver(()=>{const racing=menu.classList.contains('hidden');this.setScene(racing?'race':'menu');if(racing)this.cue('raceStart',1)}).observe(menu,{attributes:true,attributeFilter:['class']});
    const region=q('#region');if(region)new MutationObserver(()=>this.setRegion(region.textContent.trim())).observe(region,{childList:true,characterData:true,subtree:true});
    const event=q('#event');if(event)new MutationObserver(()=>{const active=event.classList.contains('show');if(active&&!this.eventActive){this.eventActive=true;this.eventCue(q('#eventTitle')?.textContent?.trim()||'WORLD EVENT')}else if(!active&&this.eventActive){this.eventActive=false;this.cue('eventClear',.45)}}).observe(event,{attributes:true,attributeFilter:['class']});
    const item=q('#itemName');if(item)new MutationObserver(()=>{const name=item.textContent.trim();if(name&&name!=='EMPTY'&&name!==this.lastItem)this.cue('itemPickup',.7);this.lastItem=name}).observe(item,{childList:true,characterData:true,subtree:true});
    const toast=q('#toast');if(toast)new MutationObserver(()=>{const t=toast.textContent.trim();if(t&&t!==this.lastToast){this.lastToast=t;this.toastCue(t)}}).observe(toast,{childList:true,characterData:true,subtree:true});
    const flash=q('#dropFlash');if(flash)new MutationObserver(()=>{if(flash.classList.contains('show'))this.cue('rareDrop',1)}).observe(flash,{attributes:true,attributeFilter:['class']});
    this.updateBadge();
  }
  setScene(scene){this.scene=scene;this.musicStep=0;this.nextBeat=(this.ctx?.currentTime||0)+.05;if(scene==='menu')this.intensity=.24;this.updateBadge()}
  setRegion(name){if(!name||name===this.region)return;this.region=name;this.cue('region',.7);this.musicStep=0;this.updateBadge()}
  eventCue(name){const type=EVENT_CUES[name]||'event';this.cue(type,.95);this.intensity=Math.max(this.intensity,.72)}
  toastCue(t){
    if(/RACE COMPLETE|1ST|VICTORY|WIN/.test(t))this.cue('victory',1);
    else if(/DROP|LEGENDARY|MYTHIC|TITLE UNLOCKED/.test(t))this.cue('rareDrop',1);
    else if(/구매|PURCHASE|BUY/.test(t))this.cue('purchase',.7);
    else if(/CONTRACT COMPLETE|COMPLETE/.test(t))this.cue('contract',.75);
    else if(/ITEM ·/.test(t))this.cue('itemPickup',.65);
  }
  tick(){
    this._raf=requestAnimationFrame(()=>this.tick());
    if(!this.ctx||!this.unlocked)return;
    this.speed=Number(q('#speed')?.textContent||0);this.rpm=Number(q('#rpm')?.textContent||1800);
    const pos=(q('#position')?.textContent||'12').split('/')[0];const rank=Number(pos)||12;
    const speedN=clamp(this.speed/170,0,1);const chase=clamp((13-rank)/12,0,1);const boost=Boolean(window.__tidalV18?.controls?.boost||this.keyState.has('ShiftLeft')||this.keyState.has('ShiftRight'));
    const fishing=document.body.classList.contains('fishing-active');
    const target=this.scene==='menu'?.24:fishing?.22:clamp(.36+speedN*.38+chase*.12+(boost?.16:0)+(this.eventActive?.14:0),.3,1);
    this.intensity+=(target-this.intensity)*.025;
    if(this.musicFilter)this.musicFilter.frequency.setTargetAtTime(2600+this.intensity*3900,this.ctx.currentTime,.12);
    this.updateEngine(speedN);this.updateAmbience(speedN);this.detectImpact();
  }
  detectImpact(){const now=performance.now();if(now-this.lastSpeedAt<120)return;const drop=this.lastSpeed-this.speed,braking=Boolean(window.__tidalV18?.controls?.brake>.1||this.keyState.has('KeyS')||this.keyState.has('ArrowDown'));if(this.lastSpeed>65&&drop>28&&!braking)this.cue('impact',clamp(drop/70,.45,1));this.lastSpeed=this.speed;this.lastSpeedAt=now}
  buildEngine(){
    const ctx=this.ctx;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;const g=ctx.createGain();g.gain.value=.001;g.connect(lp).connect(this.engineBus);
    const low=ctx.createOscillator(),mid=ctx.createOscillator(),hi=ctx.createOscillator();low.type='sawtooth';mid.type='square';hi.type='triangle';
    const lg=ctx.createGain(),mg=ctx.createGain(),hg=ctx.createGain();lg.gain.value=.55;mg.gain.value=.18;hg.gain.value=.05;low.connect(lg).connect(g);mid.connect(mg).connect(g);hi.connect(hg).connect(g);[low,mid,hi].forEach(o=>o.start());
    this.engine={low,mid,hi,lg,mg,hg,g,lp};
  }
  updateEngine(speedN){
    const t=this.ctx.currentTime,r=clamp(this.rpm||1800,900,11000),base=28+r/155;
    this.engine.low.frequency.setTargetAtTime(base,t,.035);this.engine.mid.frequency.setTargetAtTime(base*2.02,t,.035);this.engine.hi.frequency.setTargetAtTime(base*4.04,t,.035);
    this.engine.g.gain.setTargetAtTime(this.scene==='race'?.12+.17*speedN:.025,t,.06);this.engine.lp.frequency.setTargetAtTime(620+speedN*3300,t,.05);
    this.engine.lg.gain.setTargetAtTime(.62-.28*speedN,t,.06);this.engine.mg.gain.setTargetAtTime(.1+.28*speedN,t,.06);this.engine.hg.gain.setTargetAtTime(.02+.15*Math.pow(speedN,2),t,.06);
  }
  noiseBuffer(seconds=2){const n=Math.floor(this.ctx.sampleRate*seconds),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;return b}
  buildAmbience(){
    const ctx=this.ctx,buf=this.noiseBuffer(3);
    const water=ctx.createBufferSource(),wind=ctx.createBufferSource();water.buffer=buf;wind.buffer=buf;water.loop=wind.loop=true;
    const wf=ctx.createBiquadFilter(),wif=ctx.createBiquadFilter();wf.type='bandpass';wf.frequency.value=620;wf.Q.value=.7;wif.type='highpass';wif.frequency.value=1350;
    const wg=ctx.createGain(),wig=ctx.createGain();wg.gain.value=.08;wig.gain.value=.01;water.connect(wf).connect(wg).connect(this.ambientBus);wind.connect(wif).connect(wig).connect(this.ambientBus);water.start();wind.start();this.ambient={water,wind,wf,wif,wg,wig};
  }
  updateAmbience(speedN){const t=this.ctx.currentTime;this.ambient.wg.gain.setTargetAtTime(.05+.17*speedN,t,.12);this.ambient.wig.gain.setTargetAtTime(.012+.11*Math.pow(speedN,1.6),t,.12);this.ambient.wf.frequency.setTargetAtTime(520+speedN*1200,t,.1)}
  startMusicClock(){if(this.musicTimer)return;this.nextBeat=this.ctx.currentTime+.05;const run=()=>{if(!this.ctx)return;while(this.nextBeat<this.ctx.currentTime+.16)this.scheduleBeat(this.nextBeat);this.musicTimer=setTimeout(run,35)};run()}
  scheduleBeat(t){
    const mood=REGION_MOODS[this.region]||REGION_MOODS['GOLDEN COAST'],progression=CHORD_PROGRESSIONS[this.region]||CHORD_PROGRESSIONS['GOLDEN COAST'];
    const fishing=document.body.classList.contains('fishing-active'),tempo=this.scene==='menu'?94:fishing?82:mood.tempo+(this.intensity>.72?8:0),beat=60/tempo,step=this.musicStep++,barStep=step%8,chord=progression[Math.floor(step/8)%progression.length],swing=barStep%2?beat*.035:0,status=q('#audioStatus');if(status)status.dataset.musicStep=String(this.musicStep);
    this.nextBeat=t+beat/2;if(!this.musicEnabled)return;
    if(barStep===0){
      for(const interval of chord.slice(0,4))this.tone(mood.root*Math.pow(2,interval/12),t,beat*3.65,'sine',.034+.012*mood.warmth,2600+1400*mood.warmth,.18,interval%2?4:-4);
    }
    if(barStep%2===0){const bassInterval=chord[barStep===6?2:0];this.tone(mood.root*Math.pow(2,bassInterval/12),t+swing,beat*.72,'triangle',.07+.018*this.intensity,720,.012)}
    const arpOrder=[0,2,1,3,1,2,3,2],arpInterval=chord[arpOrder[barStep]%chord.length];
    this.tone(mood.root*2*Math.pow(2,arpInterval/12),t+swing,beat*.34,barStep%2?'triangle':'sine',this.scene==='menu'?.028:.034+.012*this.intensity,3900,.008,barStep%2?5:-5);
    if(barStep===2||barStep===6){const degree=mood.mode[(Math.floor(step/2)+Math.floor(step/8))%mood.mode.length];this.tone(mood.root*2*Math.pow(2,degree/12),t+beat*.06,beat*.82,'triangle',.04+.018*this.intensity,4600,.025)}
    if((this.scene==='race'||this.intensity>.45)&&!fishing){if(barStep===0||barStep===4)this.drum(t,'kick',.052+.035*this.intensity);if(barStep===4)this.drum(t,'snare',.036+.018*this.intensity);if(barStep%2===1)this.drum(t,'hat',.014+.012*this.intensity)}
    else if(barStep===0)this.drum(t,'kick',.022);
  }
  tone(freq,t,dur,type='sine',gain=.03,cutoff=2200,attack=.018,detune=0){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+attack);g.gain.setValueAtTime(Math.max(.0002,gain*.78),t+Math.max(attack+.02,dur*.68));g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f).connect(g).connect(this.musicInput||this.musicBus);o.start(t);o.stop(t+dur+.04)}
  drum(t,type,gain=.03){
    if(type==='kick'){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(this.musicBus);o.start(t);o.stop(t+.18);return}
    const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noiseBuffer(.2);f.type=type==='hat'?'highpass':'bandpass';f.frequency.value=type==='hat'?5200:1600;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+(type==='hat'?.05:.13));s.connect(f).connect(g).connect(this.musicBus);s.start(t);s.stop(t+.16);
  }
  cue(name,amount=.6){if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('tidal-audio-cue',{detail:{name}}));if(!this.ctx||!this.unlocked||!this.sfxEnabled)return;const t=this.ctx.currentTime,g=clamp(amount,0,1);
    const sweep=(a,b,d,type='sine',v=.12)=>{const o=this.ctx.createOscillator(),gg=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,b),t+d);gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(v*g,t+.008);gg.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gg).connect(this.sfxBus);o.start(t);o.stop(t+d+.02)};
    const noise=(d=.12,v=.08,hp=900)=>{const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),gg=this.ctx.createGain();s.buffer=this.noiseBuffer(d+.03);f.type='highpass';f.frequency.value=hp;gg.gain.setValueAtTime(v*g,t);gg.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f).connect(gg).connect(this.sfxBus);s.start(t);s.stop(t+d+.02)};
    switch(name){
      case'uiClick':sweep(720,520,.055,'sine',.035);break;case'uiConfirm':sweep(440,880,.12,'sine',.06);break;case'raceStart':sweep(110,440,.32,'sawtooth',.09);setTimeout(()=>this.cue('boostIgnite',.45),110);break;
      case'boostIgnite':sweep(80,920,.24,'sawtooth',.13);noise(.22,.09,1400);break;case'driftStart':noise(.2,.11,1700);sweep(210,130,.16,'triangle',.05);break;case'driftRelease':noise(.08,.035,2600);break;
      case'skill1':sweep(180,1100,.18,'sawtooth',.12);break;case'skill2':noise(.24,.1,2100);sweep(510,260,.22,'sine',.07);break;case'skill3':sweep(1200,90,.28,'square',.09);noise(.13,.07,900);break;case'skill4':sweep(260,1600,.3,'triangle',.11);break;
      case'itemPickup':sweep(650,1300,.11,'sine',.07);setTimeout(()=>this.cue('uiConfirm',.35),55);break;case'itemUse':sweep(320,760,.15,'square',.07);break;case'impact':noise(.2,.18,120);sweep(95,38,.2,'sawtooth',.09);break;
      case'rareDrop':sweep(520,1040,.22,'sine',.1);setTimeout(()=>{this.tone(1318.5,this.ctx.currentTime,.5,'sine',.07,4000);this.tone(1975.5,this.ctx.currentTime+.08,.55,'sine',.05,5000)},90);break;
      case'victory':for(const [i,f] of [523,659,784,1047].entries())setTimeout(()=>this.tone(f,this.ctx.currentTime,.55,'triangle',.07,4000),i*105);break;
      case'purchase':sweep(420,860,.1,'sine',.055);break;case'contract':sweep(330,990,.2,'triangle',.08);break;case'region':sweep(220,440,.24,'sine',.05);break;case'camera':sweep(900,720,.05,'sine',.025);break;case'modeSwitch':sweep(280,560,.1,'triangle',.045);break;
      case'danger':sweep(92,58,.42,'sawtooth',.11);noise(.35,.07,300);break;case'industrial':sweep(160,120,.18,'square',.065);break;case'market':sweep(700,980,.16,'sine',.05);break;case'reward':this.cue('rareDrop',.65);break;case'race':sweep(180,720,.2,'sawtooth',.08);break;case'event':sweep(260,520,.18,'triangle',.06);break;case'eventClear':sweep(520,300,.12,'sine',.035);break;
      case'activityStart':sweep(190,760,.24,'triangle',.09);setTimeout(()=>this.cue('uiConfirm',.42),115);break;case'activityStep':sweep(510,920,.12,'sine',.075);break;case'activityComplete':sweep(330,1320,.32,'triangle',.12);setTimeout(()=>this.cue('rareDrop',.48),145);break;case'activityFail':sweep(360,95,.28,'sawtooth',.08);break;
      case'fishingReady':sweep(280,520,.16,'triangle',.045);break;case'fishingStow':sweep(520,240,.12,'triangle',.035);break;case'fishingAction':sweep(460,690,.07,'sine',.032);break;
      case'fishingCast':sweep(860,190,.38,'sine',.055);noise(.16,.035,2600);break;case'fishingBite':sweep(620,1180,.09,'square',.09);setTimeout(()=>this.cue('fishingAction',.65),85);break;case'fishingHook':sweep(180,920,.2,'sawtooth',.1);noise(.14,.055,1500);break;
      case'fishingCatch':sweep(390,1170,.3,'triangle',.11);setTimeout(()=>this.cue('rareDrop',.52),135);break;case'fishingSnap':noise(.11,.13,1600);sweep(780,75,.12,'square',.07);break;case'fishingLost':sweep(340,130,.22,'sine',.05);break;
    }
  }
}

export const audioDirector = new AudioDirector();
if(typeof window!=='undefined')window.__tidalAudio=audioDirector;
