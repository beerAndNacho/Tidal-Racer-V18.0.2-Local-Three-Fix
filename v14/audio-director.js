const q = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function courierScoreProfile({active=false,urgent=false}={}){
  const delivery=Boolean(active),deliveryUrgent=delivery&&Boolean(urgent);
  return{active:delivery,urgent:deliveryUrgent,tempo:delivery?(deliveryUrgent?118:106):0,intensity:delivery?(deliveryUrgent?.74:.56):null,mode:delivery?(deliveryUrgent?'courier-urgent':'courier'):'ambient'};
}

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
    this.scene='menu'; this.region='GOLDEN COAST'; this.intensity=.15; this.speed=0; this.rpm=1800;this.paused=false;
    this.weather={rain:0,wind:0,storm:0};this.cityContext={mode:'water',facilityId:null,hour:12,plazaDistance:Infinity,plazaProximity:0,plazaPerformance:false,waterfront:0};
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
  setPaused(paused){this.paused=Boolean(paused);if(!this.ctx)return;const t=this.ctx.currentTime;this.musicBus?.gain.setTargetAtTime(this.paused?this.volumes.music*.18:this.musicEnabled?this.volumes.music:0,t,.08);this.sfxBus?.gain.setTargetAtTime(this.paused?this.volumes.sfx*.24:this.volumes.sfx,t,.06);this.engineBus?.gain.setTargetAtTime(this.paused?0:this.volumes.engine,t,.06);this.ambientBus?.gain.setTargetAtTime(this.paused?this.volumes.ambient*.16:this.volumes.ambient,t,.08)}
  setWeather(snapshot={}){this.weather.rain=clamp(Number(snapshot.rain)||0,0,1);this.weather.wind=clamp(Number(snapshot.wind)||0,0,1);this.weather.storm=clamp(Number(snapshot.storm)||0,0,1)}
  setCityContext({mode='water',facilityId=null,hour=12,plazaDistance=Infinity,plazaPerformance=false,waterfront=0}={}){
    const normalizedMode=['water','foot','interior'].includes(mode)?mode:'water',normalizedHour=((Number(hour)||0)%24+24)%24,distance=Number.isFinite(Number(plazaDistance))?Math.max(0,Number(plazaDistance)):Infinity,rawProximity=normalizedMode==='foot'?clamp(1-distance/135,0,1):0,plazaProximity=rawProximity*rawProximity*(3-2*rawProximity),waterfrontMix=normalizedMode==='foot'?clamp(Number(waterfront)||0,0,1):0;
    this.cityContext={mode:normalizedMode,facilityId:facilityId||null,hour:normalizedHour,plazaDistance:distance,plazaProximity,plazaPerformance:Boolean(plazaPerformance)&&normalizedMode==='foot',waterfront:waterfrontMix};
    if(typeof document!=='undefined'){document.body.dataset.audioTravelMode=this.cityContext.mode;document.body.dataset.audioVenue=this.cityContext.facilityId||'coast';document.body.dataset.audioPlazaMix=plazaProximity.toFixed(2);document.body.dataset.audioWaterfrontMix=waterfrontMix.toFixed(2);document.body.dataset.audioPlazaPerformance=this.cityContext.plazaPerformance?'live':'quiet';document.body.dataset.audioGullZone=waterfrontMix>.28?'near':'far'}
  }
  updateBadge(){let el=q('#audioStatus');if(!el){el=document.createElement('div');el.id='audioStatus';el.className='glass';Object.assign(el.style,{position:'fixed',right:'14px',top:'54px',zIndex:'41',padding:'7px 11px',borderRadius:'999px',fontSize:'8px',letterSpacing:'.08em',pointerEvents:'none'});document.body.appendChild(el)}el.classList.toggle('locked',!this.unlocked);el.dataset.audioState=!this.unlocked?'locked':this.musicEnabled?'running':'muted';el.dataset.musicStep=String(this.musicStep);el.textContent=!this.unlocked?'♪ CLICK / KEY TO ENABLE AUDIO':this.musicEnabled?`♪ ADAPTIVE SCORE · ${this.region}`:'♪ MUSIC OFF'}
  onKeyDown(e){
    if(e.code==='KeyM'){this.toggleMusic();return}
    if(this.paused)return;
    if(this.keyState.has(e.code))return;this.keyState.add(e.code);
    if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&this.cityContext.mode==='water')this.cue('boostIgnite',.7);
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
    const fishing=document.body.classList.contains('fishing-active'),courier=courierScoreProfile({active:document.body.dataset.deliveryState==='active',urgent:q('#deliveryHud')?.dataset.urgent==='true'}),delivery=courier.active,deliveryUrgent=courier.urgent,city=this.cityContext,cityTarget=city.mode==='interior'?(city.facilityId==='nightlife'?.52:city.facilityId==='gym'?.4:.25):city.mode==='foot'?.32+(city.plazaPerformance?city.plazaProximity*.12:0):null;
    const target=this.paused?.1:this.scene==='menu'?.24:fishing?.22:delivery?courier.intensity:cityTarget??clamp(.36+speedN*.38+chase*.12+(boost?.16:0)+(this.eventActive?.14:0),.3,1);
    this.intensity+=(target-this.intensity)*.025;
    if(typeof document!=='undefined'){document.body.dataset.audioDeliveryMix=delivery?(deliveryUrgent?'urgent':'active'):'off';document.body.dataset.audioScoreTempo=String(courier.tempo)}
    if(this.musicFilter){const venueCutoff=delivery?4200+this.intensity*2100:city.mode==='interior'?(city.facilityId==='nightlife'?6200:city.facilityId==='home'?2100:3400):2600+this.intensity*3900;this.musicFilter.frequency.setTargetAtTime(venueCutoff,this.ctx.currentTime,.12)}
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
    const waterMode=this.cityContext.mode==='water';this.engine.g.gain.setTargetAtTime(this.paused||!waterMode?0:this.scene==='race'?.12+.17*speedN:.025,t,.06);this.engine.lp.frequency.setTargetAtTime(620+speedN*3300,t,.05);
    this.engine.lg.gain.setTargetAtTime(.62-.28*speedN,t,.06);this.engine.mg.gain.setTargetAtTime(.1+.28*speedN,t,.06);this.engine.hg.gain.setTargetAtTime(.02+.15*Math.pow(speedN,2),t,.06);
  }
  noiseBuffer(seconds=2){const n=Math.floor(this.ctx.sampleRate*seconds),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;return b}
  buildAmbience(){
    const ctx=this.ctx,buf=this.noiseBuffer(3);
    const water=ctx.createBufferSource(),wind=ctx.createBufferSource(),rain=ctx.createBufferSource(),street=ctx.createBufferSource(),crowd=ctx.createBufferSource(),room=ctx.createBufferSource(),shore=ctx.createBufferSource(),plazaCrowd=ctx.createBufferSource();water.buffer=wind.buffer=rain.buffer=street.buffer=crowd.buffer=room.buffer=shore.buffer=plazaCrowd.buffer=buf;water.loop=wind.loop=rain.loop=street.loop=crowd.loop=room.loop=shore.loop=plazaCrowd.loop=true;
    const wf=ctx.createBiquadFilter(),wif=ctx.createBiquadFilter(),rf=ctx.createBiquadFilter();wf.type='bandpass';wf.frequency.value=620;wf.Q.value=.7;wif.type='highpass';wif.frequency.value=1350;rf.type='bandpass';rf.frequency.value=3400;rf.Q.value=.42;
    const sf=ctx.createBiquadFilter(),cf=ctx.createBiquadFilter(),roomf=ctx.createBiquadFilter(),shoref=ctx.createBiquadFilter(),plazaf=ctx.createBiquadFilter();sf.type='bandpass';sf.frequency.value=540;sf.Q.value=.5;cf.type='bandpass';cf.frequency.value=1180;cf.Q.value=.7;roomf.type='lowpass';roomf.frequency.value=420;shoref.type='bandpass';shoref.frequency.value=360;shoref.Q.value=.55;plazaf.type='bandpass';plazaf.frequency.value=920;plazaf.Q.value=.8;
    const wg=ctx.createGain(),wig=ctx.createGain(),rg=ctx.createGain(),sg=ctx.createGain(),cg=ctx.createGain(),roomg=ctx.createGain(),shoreg=ctx.createGain(),plazag=ctx.createGain();wg.gain.value=.08;wig.gain.value=.01;rg.gain.value=.0001;sg.gain.value=cg.gain.value=roomg.gain.value=shoreg.gain.value=plazag.gain.value=.0001;
    water.connect(wf).connect(wg).connect(this.ambientBus);wind.connect(wif).connect(wig).connect(this.ambientBus);rain.connect(rf).connect(rg).connect(this.ambientBus);street.connect(sf).connect(sg).connect(this.ambientBus);crowd.connect(cf).connect(cg).connect(this.ambientBus);room.connect(roomf).connect(roomg).connect(this.ambientBus);shore.connect(shoref).connect(shoreg).connect(this.ambientBus);plazaCrowd.connect(plazaf).connect(plazag).connect(this.ambientBus);
    const hum=ctx.createOscillator(),humg=ctx.createGain();hum.type='sine';hum.frequency.value=58;humg.gain.value=.0001;hum.connect(humg).connect(this.ambientBus);
    for(const source of[water,wind,rain,street,crowd,room,shore,plazaCrowd])source.start();hum.start();this.ambient={water,wind,rain,street,crowd,room,shore,plazaCrowd,hum,wf,wif,rf,sf,cf,roomf,shoref,plazaf,wg,wig,rg,sg,cg,roomg,shoreg,plazag,humg};
  }
  updateAmbience(speedN){
    const t=this.ctx.currentTime,rain=this.weather.rain,wind=this.weather.wind,{mode,facilityId,hour,plazaProximity=0,plazaPerformance=false,waterfront=0}=this.cityContext,waterMode=mode==='water',interior=mode==='interior',rush=hour>=7&&hour<10||hour>=16&&hour<20,night=hour>=20||hour<5,crowdByVenue={restaurant:.034,nightlife:.072,grocery:.026,'fish-market':.038,gym:.023,'harbor-office':.018,bank:.012,'marina-workshop':.01,home:.003},humByVenue={'marina-workshop':.038,grocery:.023,'fish-market':.03,nightlife:.018,gym:.015,restaurant:.012,bank:.009,'harbor-office':.008,home:.004};
    this.ambient.wg.gain.setTargetAtTime(waterMode?.05+.17*speedN:mode==='foot'?.018:.004,t,.12);this.ambient.wig.gain.setTargetAtTime(waterMode?.012+.11*Math.pow(speedN,1.6)+wind*.075:mode==='foot'?.018+wind*.02:.002,t,.12);this.ambient.rg.gain.setTargetAtTime(.0001+rain*(waterMode?.035+rain*.065:mode==='foot'?.022+rain*.035:.007+rain*.012),t,.18);
    this.ambient.sg.gain.setTargetAtTime(mode==='foot'?.032+(rush?.022:0)+(night?.008:0):interior?.004:.0001,t,.2);this.ambient.cg.gain.setTargetAtTime(interior?(crowdByVenue[facilityId]||.008):mode==='foot'?(rush?.028:.016):.0001,t,.2);this.ambient.roomg.gain.setTargetAtTime(interior?.025:.0001,t,.18);this.ambient.humg.gain.setTargetAtTime(interior?(humByVenue[facilityId]||.008):.0001,t,.18);this.ambient.shoreg.gain.setTargetAtTime(waterMode?.018:mode==='foot'?.006+waterfront*.045:.0001,t,.24);this.ambient.plazag.gain.setTargetAtTime(mode==='foot'?.0001+plazaProximity*(.01+(plazaPerformance?.038:.007)):.0001,t,.24);
    this.ambient.wf.frequency.setTargetAtTime(520+speedN*1200,t,.1);this.ambient.rf.frequency.setTargetAtTime(2500+rain*1900,t,.16);this.ambient.sf.frequency.setTargetAtTime(night?430:620,t,.2);this.ambient.cf.frequency.setTargetAtTime(facilityId==='nightlife'?1480:1080,t,.2);this.ambient.shoref.frequency.setTargetAtTime(330+waterfront*190+wind*90,t,.25);this.ambient.plazaf.frequency.setTargetAtTime(plazaPerformance?1180:820,t,.25);this.ambient.hum.frequency.setTargetAtTime(facilityId==='marina-workshop'?72:facilityId==='nightlife'?64:58,t,.2);
  }
  startMusicClock(){if(this.musicTimer)return;this.nextBeat=this.ctx.currentTime+.05;const run=()=>{if(!this.ctx)return;while(this.nextBeat<this.ctx.currentTime+.16)this.scheduleBeat(this.nextBeat);this.musicTimer=setTimeout(run,35)};run()}
  scheduleBeat(t){
    const mood=REGION_MOODS[this.region]||REGION_MOODS['GOLDEN COAST'],progression=CHORD_PROGRESSIONS[this.region]||CHORD_PROGRESSIONS['GOLDEN COAST'];
    const fishing=document.body.classList.contains('fishing-active'),courier=courierScoreProfile({active:document.body.dataset.deliveryState==='active',urgent:q('#deliveryHud')?.dataset.urgent==='true'}),delivery=courier.active,deliveryUrgent=courier.urgent,city=this.cityContext,venueTempo=city.facilityId==='nightlife'?108:city.facilityId==='gym'?104:city.facilityId==='home'?78:88,plazaLive=city.mode==='foot'&&city.plazaPerformance&&city.plazaProximity>.04,tempo=this.scene==='menu'?94:fishing?82:delivery?courier.tempo:city.mode==='interior'?venueTempo:plazaLive?112:mood.tempo+(this.intensity>.72?8:0),beat=60/tempo,step=this.musicStep++,barStep=step%8,chord=progression[Math.floor(step/8)%progression.length],swing=barStep%2?beat*.035:0,status=q('#audioStatus');if(status){status.dataset.musicStep=String(this.musicStep);status.dataset.scoreMode=courier.mode}
    this.nextBeat=t+beat/2;if(city.mode==='foot'&&city.waterfront>.28&&barStep===1&&Math.floor(step/8)%6===2)this.gull(t+beat*.18,.008+.018*city.waterfront);if(!this.musicEnabled)return;
    if(barStep===0){
      for(const interval of chord.slice(0,4))this.tone(mood.root*Math.pow(2,interval/12),t,beat*3.65,'sine',.034+.012*mood.warmth,2600+1400*mood.warmth,.18,interval%2?4:-4);
    }
    if(barStep%2===0){const bassInterval=chord[barStep===6?2:0];this.tone(mood.root*Math.pow(2,bassInterval/12),t+swing,beat*.72,'triangle',.07+.018*this.intensity,720,.012)}
    const arpOrder=[0,2,1,3,1,2,3,2],arpInterval=chord[arpOrder[barStep]%chord.length];
    this.tone(mood.root*2*Math.pow(2,arpInterval/12),t+swing,beat*.34,barStep%2?'triangle':'sine',this.scene==='menu'?.028:.034+.012*this.intensity,3900,.008,barStep%2?5:-5);
    if(barStep===2||barStep===6){const degree=mood.mode[(Math.floor(step/2)+Math.floor(step/8))%mood.mode.length];this.tone(mood.root*2*Math.pow(2,degree/12),t+beat*.06,beat*.82,'triangle',.04+.018*this.intensity,4600,.025)}
    if(plazaLive){const liveRoot=146.83,liveDegrees=[0,7,10,12,7,15,10,7],liveGain=.006+.03*city.plazaProximity;if(barStep%2===0)this.tone(liveRoot*2*Math.pow(2,liveDegrees[barStep]/12),t+swing,beat*.42,'triangle',liveGain,5200,.012,barStep%4?7:-7);if(barStep===2||barStep===6)this.tone(liveRoot*Math.pow(2,(barStep===2?7:10)/12),t,beat*.86,'sine',liveGain*.72,1800,.02);if(barStep===0||barStep===4)this.drum(t,'kick',.018+.026*city.plazaProximity);if(barStep===4)this.drum(t,'snare',.012+.02*city.plazaProximity);if(barStep%2===1)this.drum(t,'hat',.006+.012*city.plazaProximity)}
    if(delivery){const courierDegrees=[12,7,10,14,12,17,10,7],degree=courierDegrees[barStep],courierGain=.018+this.intensity*.018+(deliveryUrgent?.009:0);if([1,3,5,6].includes(barStep))this.tone(mood.root*2*Math.pow(2,degree/12),t+swing+beat*.025,beat*.27,deliveryUrgent?'sawtooth':'square',courierGain,deliveryUrgent?5200:3900,.006,barStep%2?8:-8);if(barStep===7)this.tone(mood.root*4*Math.pow(2,7/12),t+beat*.06,beat*.18,'triangle',courierGain*.72,5600,.004)}
    if(((this.scene==='race'&&city.mode==='water')||city.facilityId==='nightlife'||delivery||this.intensity>.62)&&!fishing){if(barStep===0||barStep===4)this.drum(t,'kick',.052+.035*this.intensity);if(barStep===4)this.drum(t,'snare',.036+.018*this.intensity);if(barStep%2===1)this.drum(t,'hat',.014+.012*this.intensity+(deliveryUrgent?.008:0))}
    else if(barStep===0)this.drum(t,'kick',.022);
  }
  tone(freq,t,dur,type='sine',gain=.03,cutoff=2200,attack=.018,detune=0){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+attack);g.gain.setValueAtTime(Math.max(.0002,gain*.78),t+Math.max(attack+.02,dur*.68));g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(f).connect(g).connect(this.musicInput||this.musicBus);o.start(t);o.stop(t+dur+.04)}
  gull(t,gain=.015){for(const [offset,detune,level] of [[0,-11,1],[.045,9,.38]]){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter(),start=t+offset;o.type='sine';o.detune.value=detune;o.frequency.setValueAtTime(880,start);o.frequency.exponentialRampToValueAtTime(1480,start+.16);o.frequency.exponentialRampToValueAtTime(760,start+.56);f.type='bandpass';f.frequency.value=1250;f.Q.value=.8;g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain*level),start+.055);g.gain.exponentialRampToValueAtTime(.0001,start+.6);o.connect(f).connect(g).connect(this.ambientBus);o.start(start);o.stop(start+.64)}}
  drum(t,type,gain=.03){
    if(type==='kick'){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(this.musicBus);o.start(t);o.stop(t+.18);return}
    const s=this.ctx.createBufferSource(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();s.buffer=this.noiseBuffer(.2);f.type=type==='hat'?'highpass':'bandpass';f.frequency.value=type==='hat'?5200:1600;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+(type==='hat'?.05:.13));s.connect(f).connect(g).connect(this.musicBus);s.start(t);s.stop(t+.16);
  }
  cue(name,amount=.6){if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('tidal-audio-cue',{detail:{name}}));if(!this.ctx||!this.unlocked||!this.sfxEnabled)return;const t=this.ctx.currentTime,g=clamp(amount,0,1);
    const sweep=(a,b,d,type='sine',v=.12)=>{const o=this.ctx.createOscillator(),gg=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,b),t+d);gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(v*g,t+.008);gg.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gg).connect(this.sfxBus);o.start(t);o.stop(t+d+.02)};
    const noise=(d=.12,v=.08,hp=900)=>{const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),gg=this.ctx.createGain();s.buffer=this.noiseBuffer(d+.03);f.type='highpass';f.frequency.value=hp;gg.gain.setValueAtTime(v*g,t);gg.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f).connect(gg).connect(this.sfxBus);s.start(t);s.stop(t+d+.02)};
    switch(name){
      case'uiClick':sweep(720,520,.055,'sine',.035);break;case'uiConfirm':sweep(440,880,.12,'sine',.06);break;case'raceSelect':sweep(260,920,.18,'triangle',.075);break;case'checkpoint':sweep(620,1040,.08,'sine',.038);break;case'courseWarning':sweep(340,105,.28,'sawtooth',.085);break;case'courseRecover':sweep(130,640,.25,'triangle',.09);break;case'invalidLap':sweep(280,72,.34,'square',.07);break;case'raceStart':sweep(110,440,.32,'sawtooth',.09);setTimeout(()=>this.cue('boostIgnite',.45),110);break;case'raceComplete':this.cue('victory',amount);break;case'slipstream':noise(.2,.035,2800);sweep(160,540,.24,'sine',.055);break;case'rivalPass':sweep(amount>.65?380:620,amount>.65?980:240,.16,'triangle',.065);break;
      case'boostIgnite':sweep(80,920,.24,'sawtooth',.13);noise(.22,.09,1400);break;case'driftStart':noise(.2,.11,1700);sweep(210,130,.16,'triangle',.05);break;case'driftRelease':noise(.08,.035,2600);break;
      case'skill1':sweep(180,1100,.18,'sawtooth',.12);break;case'skill2':noise(.24,.1,2100);sweep(510,260,.22,'sine',.07);break;case'skill3':sweep(1200,90,.28,'square',.09);noise(.13,.07,900);break;case'skill4':sweep(260,1600,.3,'triangle',.11);break;
      case'itemPickup':sweep(650,1300,.11,'sine',.07);setTimeout(()=>this.cue('uiConfirm',.35),55);break;case'itemUse':sweep(320,760,.15,'square',.07);break;case'impact':noise(.2,.18,120);sweep(95,38,.2,'sawtooth',.09);break;
      case'rareDrop':sweep(520,1040,.22,'sine',.1);setTimeout(()=>{this.tone(1318.5,this.ctx.currentTime,.5,'sine',.07,4000);this.tone(1975.5,this.ctx.currentTime+.08,.55,'sine',.05,5000)},90);break;
      case'victory':for(const [i,f] of [523,659,784,1047].entries())setTimeout(()=>this.tone(f,this.ctx.currentTime,.55,'triangle',.07,4000),i*105);break;
      case'purchase':sweep(420,860,.1,'sine',.055);break;case'contract':sweep(330,990,.2,'triangle',.08);break;case'region':sweep(220,440,.24,'sine',.05);break;case'camera':sweep(900,720,.05,'sine',.025);break;case'modeSwitch':sweep(280,560,.1,'triangle',.045);break;
      case'danger':sweep(92,58,.42,'sawtooth',.11);noise(.35,.07,300);break;case'industrial':sweep(160,120,.18,'square',.065);break;case'market':sweep(700,980,.16,'sine',.05);break;case'reward':this.cue('rareDrop',.65);break;case'race':sweep(180,720,.2,'sawtooth',.08);break;case'event':sweep(260,520,.18,'triangle',.06);break;case'eventClear':sweep(520,300,.12,'sine',.035);break;
      case'weatherChange':sweep(260,460,.28,'sine',.045);noise(.25,.025,1800);break;case'thunder':noise(.82,.2,55);sweep(72,29,.75,'sawtooth',.13);break;
      case'activityStart':sweep(190,760,.24,'triangle',.09);setTimeout(()=>this.cue('uiConfirm',.42),115);break;case'activityStep':sweep(510,920,.12,'sine',.075);break;case'activityComplete':sweep(330,1320,.32,'triangle',.12);setTimeout(()=>this.cue('rareDrop',.48),145);break;case'activityFail':sweep(360,95,.28,'sawtooth',.08);break;
      case'harborAccept':sweep(240,760,.24,'triangle',.085);setTimeout(()=>this.cue('uiConfirm',.36),105);break;case'harborProgress':sweep(510,720,.09,'sine',.045);break;case'harborReady':sweep(260,980,.3,'triangle',.1);setTimeout(()=>this.cue('contract',.7),125);break;case'harborComplete':sweep(330,1320,.34,'triangle',.12);setTimeout(()=>this.cue('rareDrop',.55),135);break;case'harborExpired':sweep(320,72,.32,'sawtooth',.075);break;
      case'auctionSale':sweep(420,1080,.2,'triangle',.085);setTimeout(()=>sweep(760,1320,.14,'sine',.055),95);break;case'fishRelease':sweep(620,280,.28,'sine',.06);noise(.24,.035,1800);break;case'coolerFull':sweep(220,82,.24,'square',.07);setTimeout(()=>sweep(180,72,.18,'square',.045),115);break;
      case'workshopPurchase':sweep(180,720,.28,'sawtooth',.095);setTimeout(()=>this.cue('uiConfirm',.6),135);break;case'workshopUpgrade':noise(.16,.055,2400);sweep(340,980,.24,'triangle',.085);break;case'workshopRepair':noise(.22,.04,1500);sweep(210,620,.3,'sine',.075);setTimeout(()=>sweep(520,860,.14,'sine',.04),145);break;case'craftDamage':noise(.18,.12,520);sweep(105,42,.2,'sawtooth',.09);break;
      case'storyAccept':sweep(190,640,.26,'triangle',.09);setTimeout(()=>sweep(420,820,.16,'sine',.055),125);break;case'storyProgress':sweep(470,660,.08,'sine',.035);break;case'storyStage':sweep(360,920,.22,'triangle',.085);break;case'storyReady':sweep(260,1120,.32,'triangle',.11);setTimeout(()=>this.cue('uiConfirm',.42),150);break;case'storyComplete':sweep(220,880,.42,'triangle',.12);setTimeout(()=>sweep(520,1480,.32,'sine',.09),170);break;
      case'tutorialStep':sweep(420,880,.18,'triangle',.075);setTimeout(()=>this.cue('uiClick',.25),105);break;case'tutorialComplete':sweep(260,1040,.4,'triangle',.13);setTimeout(()=>sweep(520,1560,.34,'sine',.1),175);break;
      case'photoCapture':noise(.035,.08,4200);sweep(1180,620,.07,'square',.055);setTimeout(()=>sweep(420,880,.09,'sine',.035),85);break;
      case'navigationSet':sweep(380,980,.18,'triangle',.075);break;case'navigationArrive':sweep(420,1260,.28,'sine',.09);setTimeout(()=>this.cue('uiConfirm',.35),130);break;
      case'jobComplete':noise(.12,.035,2200);sweep(260,960,.28,'triangle',.09);setTimeout(()=>this.cue('uiConfirm',.38),120);break;case'jobPromotion':sweep(260,1180,.38,'triangle',.12);setTimeout(()=>this.cue('rareDrop',.5),145);break;
      case'deliveryStart':noise(.1,.028,1800);sweep(190,720,.26,'triangle',.085);setTimeout(()=>sweep(520,860,.1,'sine',.04),125);break;case'deliveryCheckpoint':noise(.055,.02,2800);sweep(540,1080,.14,'sine',.065);break;case'deliveryComplete':sweep(260,1040,.34,'triangle',.11);setTimeout(()=>this.cue('rareDrop',.5),145);break;case'deliveryFail':sweep(320,82,.31,'sawtooth',.075);noise(.18,.035,950);break;
      case'citizenTalk':sweep(390,610,.1,'sine',.045);setTimeout(()=>this.cue('uiClick',.18),72);break;
      case'citizenFavorOffer':sweep(250,820,.25,'triangle',.085);setTimeout(()=>this.cue('uiConfirm',.35),110);break;case'citizenFavorProgress':sweep(460,760,.1,'sine',.045);break;case'citizenFavorReady':sweep(280,1080,.32,'triangle',.105);setTimeout(()=>this.cue('contract',.5),135);break;case'citizenFavorComplete':sweep(320,1260,.34,'triangle',.12);setTimeout(()=>this.cue('rareDrop',.5),145);break;case'citizenTrust':sweep(420,980,.22,'sine',.08);break;
      case'footCollision':noise(.07,.035,420);sweep(86,58,.09,'sine',.025);break;
      case'footstepStreet':noise(.065,.038,520);sweep(92,58,.06,'sine',.022);break;
      case'footstepWet':noise(.11,.052,1550);sweep(118,62,.085,'sine',.025);break;
      case'footstepInterior':noise(.06,.026,1050);sweep(106,76,.055,'sine',.018);break;
      case'footstepMetal':noise(.075,.033,2250);sweep(230,142,.09,'triangle',.026);break;
      case'dockDisembark':noise(.28,.045,1650);sweep(155,92,.32,'sine',.065);setTimeout(()=>sweep(460,690,.1,'triangle',.035),180);break;case'dockBoard':noise(.16,.035,2400);sweep(180,620,.26,'sawtooth',.075);setTimeout(()=>this.cue('modeSwitch',.42),120);break;
      case'lifeRest':sweep(310,165,.42,'sine',.045);break;case'lifeMeal':noise(.07,.018,2800);sweep(420,650,.13,'sine',.038);break;
      case'lifeShop':noise(.08,.022,1900);sweep(520,780,.11,'triangle',.04);break;case'lifeBank':sweep(640,980,.1,'sine',.045);setTimeout(()=>this.cue('uiConfirm',.25),85);break;
      case'lifeLeisure':sweep(330,740,.26,'triangle',.055);break;case'lifeTrain':noise(.1,.035,620);sweep(120,210,.12,'sine',.035);break;case'lifeRefresh':noise(.16,.022,3600);sweep(510,760,.2,'sine',.035);break;case'arcadeShift':sweep(460,690,.055,'square',.03);break;case'arcadeHit':sweep(620,980,.075,'sine',.045);break;case'arcadeMiss':sweep(240,95,.14,'sawtooth',.05);break;case'arcadeComplete':sweep(330,880,.26,'triangle',.075);setTimeout(()=>sweep(440,1120,.2,'sine',.055),140);break;case'rhythmPerfect':sweep(760,1240,.09,'sine',.052);setTimeout(()=>sweep(980,1480,.07,'triangle',.026),58);break;case'rhythmGood':sweep(540,820,.075,'triangle',.038);break;case'rhythmMiss':noise(.1,.035,1300);sweep(210,105,.12,'sawtooth',.042);break;case'rhythmComplete':sweep(280,880,.28,'triangle',.075);setTimeout(()=>sweep(440,1320,.25,'sine',.06),130);break;
      case'trafficHorn':sweep(310,285,.18,'square',.055);setTimeout(()=>sweep(330,300,.13,'square',.04),165);break;case'trafficContact':noise(.16,.1,180);sweep(110,54,.17,'sawtooth',.065);break;
      case'transitBoard':sweep(310,620,.18,'triangle',.065);noise(.12,.025,1800);break;case'transitRide':noise(.3,.026,780);sweep(145,205,.34,'sine',.04);setTimeout(()=>sweep(520,760,.12,'triangle',.032),185);break;
      case'hullSlap':noise(.23,.075,720);sweep(105,48,.18,'sine',.06);break;case'cavitation':noise(.11,.045,1900);sweep(180,135,.08,'sawtooth',.035);break;
      case'fishingReady':sweep(280,520,.16,'triangle',.045);break;case'fishingStow':sweep(520,240,.12,'triangle',.035);break;case'fishingAction':sweep(460,690,.07,'sine',.032);break;case'fishingBait':sweep(410,610,.08,'triangle',.045);setTimeout(()=>sweep(690,920,.07,'sine',.035),75);break;case'fishingSonarHot':sweep(330,780,.12,'sine',.045);setTimeout(()=>sweep(520,1040,.1,'sine',.035),105);break;
      case'fishingCast':sweep(860,190,.38,'sine',.055);noise(.16,.035,2600);break;case'fishingBite':sweep(620,1180,.09,'square',.09);setTimeout(()=>this.cue('fishingAction',.65),85);break;case'fishingHook':sweep(180,920,.2,'sawtooth',.1);noise(.14,.055,1500);break;
      case'fishingCatch':sweep(390,1170,.3,'triangle',.11);setTimeout(()=>this.cue('rareDrop',.52),135);break;case'fishingSnap':noise(.11,.13,1600);sweep(780,75,.12,'square',.07);break;case'fishingLost':sweep(340,130,.22,'sine',.05);break;
    }
  }
}

export const audioDirector = new AudioDirector();
if(typeof window!=='undefined')window.__tidalAudio=audioDirector;
