import { LANGUAGE_KEY, SUPPORTED, q, UI, REGION_KO, SEA_KO, STYLE_KO, PASSIVE_KO, CRAFT_TYPE_KO, RARITY_KO, GEAR_KO, POSE_KO, ITEM_EN, SKILL_EN, EVENT_EN, EVENT_NAME_KO, CONTRACT_KO, COLLECTION_KO, TITLE_KO, RIDER_KO, ORIGINAL, RIDERS, CRAFTS, SKILLS, ITEMS, EVENTS, RARITIES, SEASON, CONTRACTS, COLLECTIONS, TITLES, GHOST_RIVALS, getCharacterProfile } from './locale-data.js';

function formatToken(value=''){
  return String(value).split('-').map((x) => x ? x[0].toUpperCase()+x.slice(1) : '').join(' ');
}

class I18nController {
  constructor(){
    const requested = new URLSearchParams(location.search).get('lang');
    let saved = null;
    try { saved = localStorage.getItem(LANGUAGE_KEY); } catch {}
    const detected = navigator.language?.toLowerCase().startsWith('ko') ? 'ko' : 'en';
    this.lang = SUPPORTED.has(requested) ? requested : SUPPORTED.has(saved) ? saved : detected;
    this.observers=[];
    this.applying=false;
  }

  t(key){ return UI[this.lang]?.[key] ?? UI.en[key] ?? key; }
  region(name){ return this.lang==='ko' ? (REGION_KO[name] || name) : name; }
  seaState(name){ return this.lang==='ko' ? (SEA_KO[name] || name) : name; }
  eventName(name){ return this.lang==='ko' ? (EVENT_NAME_KO[name] || name) : name; }
  riderStyle(value){ return this.lang==='ko' ? (STYLE_KO[value] || value) : value; }
  passive(value){ return this.lang==='ko' ? (PASSIVE_KO[value] || value) : value; }
  craftType(value){ return this.lang==='ko' ? (CRAFT_TYPE_KO[value] || value) : value; }
  gear(value){ return this.lang==='ko' ? (GEAR_KO[value] || value) : formatToken(value).toUpperCase(); }
  pose(value){ return this.lang==='ko' ? (POSE_KO[value] || value) : formatToken(value).toUpperCase(); }

  applyDataLanguage(){
    ITEMS.forEach((item,i) => {
      if(this.lang==='en'){
        item.category=ITEM_EN[i]?.[0] || ORIGINAL.items[i].category;
        item.desc=ITEM_EN[i]?.[1] || ORIGINAL.items[i].desc;
      }else{
        item.category=ORIGINAL.items[i].category;
        item.desc=ORIGINAL.items[i].desc;
      }
    });
    SKILLS.forEach((skill,i) => { skill.desc=this.lang==='en' ? (SKILL_EN[i] || ORIGINAL.skills[i].desc) : ORIGINAL.skills[i].desc; });
    EVENTS.forEach((event,i) => { event.desc=this.lang==='en' ? (EVENT_EN[i] || ORIGINAL.events[i].desc) : ORIGINAL.events[i].desc; });
    RIDERS.forEach((r,i) => {
      r.style=this.lang==='ko' ? this.riderStyle(ORIGINAL.riders[i].style) : ORIGINAL.riders[i].style;
      r.passive=this.lang==='ko' ? this.passive(ORIGINAL.riders[i].passive) : ORIGINAL.riders[i].passive;
    });
    CRAFTS.forEach((c,i) => { c.type=this.lang==='ko' ? this.craftType(ORIGINAL.crafts[i].type) : ORIGINAL.crafts[i].type; });
    Object.entries(RARITIES).forEach(([key,value]) => { value.label=this.lang==='ko' ? RARITY_KO[key] : ORIGINAL.rarities[key]; });
    SEASON.name=this.lang==='ko' ? '라이징 타이드' : ORIGINAL.season;
    CONTRACTS.forEach((contract,i) => {
      contract.name=this.lang==='ko' ? (CONTRACT_KO[ORIGINAL.contracts[i].name] || ORIGINAL.contracts[i].name) : ORIGINAL.contracts[i].name;
      contract.cadence=this.lang==='ko' ? (ORIGINAL.contracts[i].cadence==='DAILY' ? this.t('daily') : this.t('weekly')) : ORIGINAL.contracts[i].cadence;
    });
    COLLECTIONS.forEach((set,i) => {
      set.name=this.lang==='ko' ? (COLLECTION_KO[ORIGINAL.collections[i].name] || ORIGINAL.collections[i].name) : ORIGINAL.collections[i].name;
      set.reward.title=this.lang==='ko' ? (TITLE_KO[ORIGINAL.collections[i].title] || ORIGINAL.collections[i].title) : ORIGINAL.collections[i].title;
    });
    TITLES.forEach((title,i) => { title.name=this.lang==='ko' ? (TITLE_KO[ORIGINAL.titles[i]] || ORIGINAL.titles[i]) : ORIGINAL.titles[i]; });
    GHOST_RIVALS.forEach((ghost,i) => { ghost.title=this.lang==='ko' ? (TITLE_KO[ORIGINAL.ghosts[i]] || ORIGINAL.ghosts[i]) : ORIGINAL.ghosts[i]; });
  }

  setText(selector, value){ const el=q(selector); if(el && el.textContent!==value) el.textContent=value; }

  applyStatic(){
    document.documentElement.lang=this.lang;
    document.title=this.t('title');
    this.setText('.hero .eyebrow',this.t('eyebrow'));
    this.setText('.hero p',this.t('hero'));
    const topLabels=document.querySelectorAll('#hud .top .stat small');
    [this.t('position'),this.t('lap'),this.t('credits'),this.t('level'),this.t('reputation')].forEach((text,i)=>{if(topLabels[i])topLabels[i].textContent=text});
    this.setText('.itemSlot .micro',this.t('item'));
    this.setText('.speed .micro',this.t('speed'));
    if(!q('#event')?.classList.contains('show'))this.setText('#eventTitle',this.t('worldEvent'));
    this.setText('#modeHintText',this.t('modeHint'));
    const controls=q('.controls');
    if(controls) controls.innerHTML=`<b>${this.t('controls')}</b><br><kbd>W</kbd>/<kbd>↑</kbd> ${this.t('throttle')} · <kbd>S</kbd>/<kbd>↓</kbd> ${this.t('brake')}<br><kbd>A</kbd>/<kbd>←</kbd> ${this.t('left')} · <kbd>D</kbd>/<kbd>→</kbd> ${this.t('right')}<br><kbd>SPACE</kbd> ${this.t('drift')} · <kbd>SHIFT</kbd> ${this.t('boost')}<br><kbd>G</kbd> ${this.t('fishing')} · <kbd>Q</kbd> ${this.lang==='ko'?'캐스팅/챔질':'Cast/Hook'} · <kbd>H</kbd> ${this.lang==='ko'?'월드 활동':'World Activity'} · <kbd>F</kbd> ${this.t('freeRoam')} · <kbd>C</kbd> ${this.t('camera')} · <kbd>M</kbd> ${this.t('music')}`;
    const panelHeadings=document.querySelectorAll('#menu .panel > h3');
    if(panelHeadings[0])panelHeadings[0].textContent=this.t('rider');
    if(panelHeadings[1])panelHeadings[1].textContent=this.t('craft');
    document.querySelectorAll('.tab').forEach((tab)=>{tab.textContent=this.t(tab.dataset.tab)});
    this.setText('#startBtn',this.t('start'));
    const qualityButtons=document.querySelectorAll('[data-quality]');
    if(qualityButtons[0])qualityButtons[0].textContent=this.t('balanced');
    if(qualityButtons[1])qualityButtons[1].textContent=this.t('ultra');
    const bio=q('#riderBio');if(bio)bio.dataset.studioLabel=this.t('studio');
    const languageSwitch=q('#languageSwitch');
    if(languageSwitch){
      languageSwitch.setAttribute('aria-label',this.t('language'));
      languageSwitch.querySelectorAll('[data-lang]').forEach((button)=>button.classList.toggle('active',button.dataset.lang===this.lang));
    }
  }

  applyRiderButtons(){
    document.querySelectorAll('#riders .choice').forEach((button,i)=>{
      const small=button.querySelector('small'),original=ORIGINAL.riders[i];
      if(small&&original)small.textContent=`${this.lang==='ko'?this.riderStyle(original.style):original.style} · ${this.lang==='ko'?this.passive(original.passive):original.passive}`;
    });
    document.querySelectorAll('#crafts .choice').forEach((button,i)=>{
      const small=button.querySelector('small'),original=ORIGINAL.crafts[i];
      if(small&&original)small.textContent=this.lang==='ko'?this.craftType(original.type):original.type;
    });
    document.querySelectorAll('#skills .skill b').forEach((label,i)=>{if(SKILLS[i])label.textContent=SKILLS[i].name});
  }

  currentRiderId(){
    const runtime=window.__tidalV16;
    if(runtime?.rider?.id)return runtime.rider.id;
    const name=q('#riderBioName')?.textContent?.trim();
    return RIDERS.find((r)=>r.name===name)?.id || 'rhea';
  }

  applyRiderCard(){
    const id=this.currentRiderId(),base=getCharacterProfile(id),ko=RIDER_KO[id];
    const display=this.lang==='ko' ? (ko||base) : base;
    this.setText('#riderBioRole',display.role);
    this.setText('#riderBioOrigin',display.origin);
    this.setText('#riderBioTagline',display.tagline);
    this.setText('#riderBioText',display.bio);
    this.setText('#riderBioBuild',`${Math.round(base.build.height*100)} · ${this.gear(base.gear)}`);
    this.setText('#riderBioPose',this.pose(base.victory));
    const affinity=q('#riderBioAffinity');
    if(affinity){const lv=affinity.textContent.match(/\d+/)?.[0]||'1';affinity.textContent=`${this.t('affinity')} LV ${lv}`;}
  }

  applyRegion(){
    const el=q('#region');if(!el)return;
    const canonical=el.textContent.trim().split(' · ')[0];
    el.dataset.localName=this.lang==='ko' ? (REGION_KO[canonical]||'') : '';
  }

  applySeaState(){
    const el=q('#seaStateHud');if(!el)return;
    const match=el.textContent.match(/(SHELTERED|ROLLING|ROUGH|HEAVY)/);
    const state=match?.[1]||'ROLLING';
    const value=this.lang==='ko' ? `바다 상태 · ${this.seaState(state)}` : `SEA STATE · ${state}`;
    if(el.dataset.localized!==value)el.dataset.localized=value;
  }

  applyMode(){
    const el=q('#mode');if(!el)return;
    const state=window.__tidalV16?.STATE?.mode || (el.textContent.includes('FREE')?'FREE ROAM':'RACE');
    const value=state==='FISHING'?this.t('fishing'):state==='FREE ROAM'?this.t('freeRoam'):this.t('race');
    if(el.textContent!==value)el.textContent=value;
  }

  applyItem(){
    const name=q('#itemName')?.textContent?.trim();
    if(!name)return;
    if(name==='EMPTY'||name==='없음'){
      this.setText('#itemName',this.t('empty'));
      this.setText('#itemDesc',this.t('itemHint'));
      return;
    }
    const item=ITEMS.find((x)=>x.name===name);
    if(item)this.setText('#itemDesc',item.desc);
  }

  applyEvent(){
    const active=window.__tidalV16?.STATE?.event;
    if(!active){if(!q('#event')?.classList.contains('show'))this.setText('#eventTitle',this.t('worldEvent'));return;}
    this.setText('#eventTitle',this.eventName(active.name));
    this.setText('#eventText',active.desc);
  }

  translateStore(){
    const root=q('#store');if(!root)return;
    const buttons=root.querySelectorAll('button');
    const buttonMap=this.lang==='ko'
      ? {BUY:this.t('buy'),SELL:this.t('sell'),EQUIP:this.t('equip'),CLAIM:this.t('claim'),DONE:this.t('done')}
      : {구매:this.t('buy'),판매:this.t('sell'),장착:this.t('equip'),수령:this.t('claim'),완료:this.t('done')};
    buttons.forEach((button)=>{const key=button.textContent.trim();if(buttonMap[key])button.textContent=buttonMap[key]});
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(!node.nodeValue?.trim())continue;
      let text=node.nodeValue;
      if(this.lang==='ko'){
        text=text.replace(/\bEQUIPPED\b/g,this.t('equipped')).replace(/\bOWNED\b|\bowned\b/g,this.t('owned')).replace(/\bLISTED\b/g,this.t('listed')).replace(/\bREWARD\b/g,this.t('reward')).replace(/\bRATING\b/g,this.t('rating')).replace(/\bSLOT\b/g,this.t('slot')).replace(/\bmade\b/g,this.t('made')).replace(/\bNO SHOWCASE\b/g,this.t('noShowcase')).replace(/\bwins\b/g,this.t('wins')).replace(/\bstreak\b/g,this.t('streak'));
      }
      if(node.nodeValue!==text)node.nodeValue=text;
    }
  }

  refreshGeneratedUI(){
    this.applyRiderButtons();
    this.applyRiderCard();
    const activeTab=q('.tab.active');if(activeTab)activeTab.click();
    queueMicrotask(()=>this.translateStore());
    this.applyItem();this.applyEvent();this.applyRegion();this.applySeaState();this.applyMode();
    const season=q('#seasonLabel');if(season){const level=season.textContent.match(/LV\s*\d+/)?.[0]||'LV 1';season.textContent=`${SEASON.id} ${SEASON.name} · ${level}`;}
  }

  translateToast(){
    const el=q('#toast');if(!el||!el.textContent.trim())return;
    let text=el.textContent.trim();
    if(this.lang==='ko'){
      text=text.replace(/^DISCOVERED · /,`${this.t('discovered')} · `).replace(/^RACE COMPLETE/,this.t('raceComplete')).replace(/^CONTRACT COMPLETE$/,this.t('contractComplete')).replace(/ TITLE UNLOCKED$/,` ${this.t('titleUnlocked')}`).replace(/^MARKET PURCHASE · /,`${this.t('marketPurchase')} · `).replace(/^QUALITY · /,`${this.t('quality')} · `).replace(/^ITEM EMPTY$/,this.t('itemEmpty')).replace(/ 획득$/,` ${this.t('acquired')}`).replace(/ 구매$/,` ${this.t('purchased')}`).replace(/ 장착$/,` ${this.t('equippedToast')}`);
      for(const [en,ko] of Object.entries(REGION_KO))if(text===en)text=ko;
      if(text==='FREE ROAM')text=this.t('freeRoam');if(text==='RACE')text=this.t('race');
    }else{
      text=text.replace(/^발견 · /,`${this.t('discovered')} · `).replace(/^레이스 완료/,this.t('raceComplete')).replace(/^계약 완료$/,this.t('contractComplete')).replace(/ 칭호 해금$/,` ${this.t('titleUnlocked')}`).replace(/^거래소 구매 · /,`${this.t('marketPurchase')} · `).replace(/^그래픽 품질 · /,`${this.t('quality')} · `).replace(/^아이템 없음$/,this.t('itemEmpty')).replace(/ 획득$/,` ${this.t('acquired')}`).replace(/ 구매 완료$/,` ${this.t('purchased')}`).replace(/ 장착$/,` ${this.t('equippedToast')}`);
      for(const [en,ko] of Object.entries(REGION_KO))if(text===ko)text=en;
      if(text==='자유주행')text=this.t('freeRoam');if(text==='레이스')text=this.t('race');
    }
    if(el.textContent!==text)el.textContent=text;
  }

  observe(selector,handler,options={childList:true,characterData:true,subtree:true}){
    const el=q(selector);if(!el)return;
    const observer=new MutationObserver(()=>{if(!this.applying)handler.call(this)});
    observer.observe(el,options);this.observers.push(observer);
  }

  setLanguage(lang,{announce=true}={}){
    if(!SUPPORTED.has(lang))return;
    this.lang=lang;
    try { localStorage.setItem(LANGUAGE_KEY,lang); } catch {}
    const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
    this.applying=true;
    this.applyDataLanguage();this.applyStatic();this.refreshGeneratedUI();
    this.applying=false;
    window.dispatchEvent(new CustomEvent('tidal-language-change',{detail:{lang}}));
    if(announce){
      const toast=q('#toast');
      if(toast){toast.textContent=this.t('languageChanged');toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1400);}
    }
  }

  toggle(){ this.setLanguage(this.lang==='ko'?'en':'ko'); }

  attach(){
    q('#languageSwitch')?.querySelectorAll('[data-lang]').forEach((button)=>button.addEventListener('click',()=>this.setLanguage(button.dataset.lang)));
    addEventListener('keydown',(event)=>{if(event.code==='KeyL'&&!event.repeat){event.preventDefault();this.toggle()}},true);
    this.setLanguage(this.lang,{announce:false});
    this.observe('#toast',this.translateToast);
    this.observe('#itemName',this.applyItem);this.observe('#itemDesc',this.applyItem);
    this.observe('#event',this.applyEvent,{attributes:true,attributeFilter:['class'],childList:true,subtree:true,characterData:true});
    this.observe('#region',this.applyRegion);this.observe('#seaStateHud',this.applySeaState);
    this.observe('#mode',this.applyMode);this.observe('#riderBioName',this.applyRiderCard);
    this.observe('#store',this.translateStore);
  }
}

export const i18n = new I18nController();
