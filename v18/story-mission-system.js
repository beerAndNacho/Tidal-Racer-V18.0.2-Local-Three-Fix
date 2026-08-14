const label=(ko,en)=>({ko,en});
const clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

const objective=(id,event,target,name,brief,waypoint,options={})=>({id,event,target,name:label(...name),brief:label(...brief),waypoint:{...waypoint},metric:options.metric||'count',filters:{...(options.filters||{})}});
const mission=(id,chapter,title,giver,intro,outro,reward,objectives)=>({id,chapter,title:label(...title),giver,intro:label(...intro),outro:label(...outro),reward,objectives});

export const TIDEBOUND_STORIES=Object.freeze([
  mission('first-current',1,['첫 조류','FIRST CURRENT'],'MINA PARK',
    ['골든 코스트에 이름을 남기려면 먼저 기체와 사람을 알아야 해요.','If you want a name on this coast, learn your craft and its people first.'],
    ['첫 항적은 기록됐어요. 이제 이 도시는 당신을 낯선 사람으로 보지 않을 겁니다.','Your first wake is on record. The city will not see you as a stranger now.'],
    {credits:2800,xp:720,rep:120},[
      objective('visit-workshop','visit',1,['마리나 작업장 방문','VISIT MARINA WORKS'],['기체 상태와 튜닝 단말을 확인하세요.','Inspect your craft and the tuning terminal.'],{x:7,z:384,mode:'land'},{filters:{facilityId:'marina-workshop'}}),
      objective('meet-noah','talk',1,['정비사 노아와 대화','TALK TO NOAH REED'],['해안 산책로에서 제트 정비사를 찾으세요.','Find the jet mechanic on the waterfront.'],{x:145,z:410,mode:'land',npcId:'noah-reed'},{filters:{npcId:'noah-reed'}}),
      objective('finish-race','race',1,['첫 공식 레이스 완주','FINISH YOUR FIRST RACE'],['12인 그리드에서 8위 이내로 완주하세요.','Finish eighth or better in the 12-rider grid.'],{x:230,z:523,mode:'water'},{filters:{maxPosition:8}}),
    ]),
  mission('market-current',2,['시장에 흐르는 물','THE CURRENT THROUGH MARKET'],'HANA CHOI',
    ['좋은 어획은 바다에서 끝나지 않아요. 신선도와 사람의 손을 거쳐 가치가 됩니다.','A good catch does not end at sea. Freshness and people turn it into value.'],
    ['오늘 저녁 메뉴에 당신의 항적이 들어가겠네요. 바다와 도시가 연결됐어요.','Your wake is on tonight’s menu. Sea and city are connected now.'],
    {credits:4200,xp:980,rep:170},[
      objective('land-two','fish',2,['신선한 어획 2마리','LAND TWO FRESH CATCHES'],['어종과 지역에 상관없이 두 마리를 냉장 보관하세요.','Store two catches in your insulated locker.'],{x:230,z:523,mode:'water'}),
      objective('auction-value','fishSale',1200,['어시장 순수익 1,200 CR','EARN 1,200 CR AT AUCTION'],['골든 코스트 어시장에서 어획을 정산하세요.','Settle catches at the Golden Coast fish auction.'],{x:331,z:384,mode:'land'},{metric:'value'}),
      objective('chef-bowl','life',1,['마리나 키친과 협업','WORK WITH MARINA KITCHEN'],['해산물 덮밥을 주문해 현지 유통을 확인하세요.','Order the seafood bowl and see the local supply chain.'],{x:169,z:384,mode:'land'},{filters:{facilityId:'restaurant',actionId:'seafood_bowl'}}),
    ]),
  mission('mayday-line',3,['메이데이 선','THE MAYDAY LINE'],'LEO COSTA',
    ['골든 코스트 앞바다에서 구조 신호가 끊겼습니다. 빠른 기체보다 침착한 조종이 필요해요.','A rescue signal dropped off Golden Coast. Calm control matters more than raw speed.'],
    ['속도를 증명한 게 아니라 돌아올 수 있다는 걸 증명했어요. 구조대가 기억할 겁니다.','You proved more than speed. You proved you can bring people home.'],
    {credits:5600,xp:1250,rep:240},[
      objective('golden-rescue','activity',1,['해안 구조 작전 완료','COMPLETE COASTAL RESCUE'],['골든 코스트에서 H로 구조 활동을 시작하세요.','Start the Golden Coast rescue activity with H.'],{x:520,z:620,mode:'water'},{filters:{activityId:'golden-rescue'}}),
      objective('debrief-leo','talk',1,['구조대원 레오에게 보고','DEBRIEF WITH LEO COSTA'],['산책로의 구조대원에게 결과를 전달하세요.','Report the result to the rescue officer on the promenade.'],{x:250,z:410,mode:'land',npcId:'leo-costa'},{filters:{npcId:'leo-costa'}}),
    ]),
  mission('storm-voice',4,['폭풍의 목소리','VOICE OF THE STORM'],'YURI TAN',
    ['폭풍 해역의 생태 신호가 달라졌어요. 구조 송신기와 희귀 어종 기록이 모두 필요합니다.','Storm Strait ecology is shifting. We need both transponder and rare-catch evidence.'],
    ['폭풍은 소음이 아니었어요. 읽을 수 있는 신호였고, 당신이 그걸 가져왔습니다.','The storm was not noise. It was a signal, and you brought it home.'],
    {credits:7600,xp:1650,rep:330},[
      objective('storm-mayday','activity',1,['폭풍 조난 대응 완료','COMPLETE STORM MAYDAY'],['Storm Strait에서 MAYDAY 활동을 완료하세요.','Complete the MAYDAY activity in Storm Strait.'],{x:1770,z:1380,mode:'water'},{filters:{activityId:'storm-mayday'}}),
      objective('storm-rare','fish',1,['폭풍 해역 희귀 어종','LAND A RARE STORM CATCH'],['Storm Strait에서 RARE 이상 어종을 잡으세요.','Land a rare-or-better fish in Storm Strait.'],{x:1250,z:1080,mode:'water'},{filters:{region:'STORM STRAIT',rarities:['rare','epic','legendary']}}),
      objective('research-yuri','talk',1,['유리에게 생태 자료 전달','DELIVER DATA TO YURI TAN'],['해양 생물 연구원에게 기록을 전달하세요.','Deliver the records to the marine biologist.'],{x:310,z:410,mode:'land',npcId:'yuri-tan'},{filters:{npcId:'yuri-tan'}}),
    ]),
  mission('city-after-dark',5,['잠들지 않는 해안','COAST AFTER DARK'],'NIA OKAFOR',
    ['레이스가 끝난 뒤의 도시도 기록할 가치가 있어요. 사람과 음악, 돈의 흐름을 따라가 보세요.','The city after racing deserves a story too. Follow its people, music, and money.'],
    ['사람들은 이제 당신의 순위만 말하지 않아요. 이 도시에서 어떻게 사는지도 이야기합니다.','People no longer talk only about your rank. They talk about how you live here.'],
    {credits:6800,xp:1480,rep:300},[
      objective('live-set','life',1,['블루 웨이브 라이브 공연','ATTEND THE BLUE WAVE LIVE SET'],['라운지에서 라이브 공연을 즐기세요.','Attend a live performance at the lounge.'],{x:385,z:384,mode:'land'},{filters:{facilityId:'nightlife',actionId:'live_music'}}),
      objective('talk-nia','talk',1,['기자 니아와 인터뷰','INTERVIEW WITH NIA OKAFOR'],['도시 기자에게 밤의 해안 이야기를 전하세요.','Tell the city reporter what the coast is like after dark.'],{x:360,z:410,mode:'land',npcId:'nia-okafor'},{filters:{npcId:'nia-okafor'}}),
      objective('bank-earnings','life',1,['수익 5,000 CR 예치','BANK 5,000 CR'],['타이달 은행에 5,000 CR을 예치하세요.','Deposit 5,000 CR at Tidal Bank.'],{x:277,z:384,mode:'land'},{filters:{facilityId:'bank',actionId:'deposit_5000'}}),
    ]),
  mission('crown-current',6,['크라운 조류','THE CROWN CURRENT'],'MINA PARK',
    ['마지막 증명은 한 분야의 최고가 되는 게 아니에요. 항만과 레이스, 바다를 하나로 묶는 겁니다.','The final proof is not mastering one discipline. It is binding harbor, race, and sea into one current.'],
    ['당신은 이 군도를 소유하지 않았어요. 대신 신뢰를 얻었습니다. 그게 타이드바운드의 진짜 크라운입니다.','You did not own the archipelago. You earned its trust. That is the true Tidebound crown.'],
    {credits:12500,xp:2600,rep:600},[
      objective('harbor-contract','harborComplete',1,['항만 의뢰 완수·보고','COMPLETE A HARBOR CONTRACT'],['항만 의뢰를 수락하고 모든 목표를 마친 뒤 보고하세요.','Accept, complete, and report a Harbor Network contract.'],{x:223,z:384,mode:'land'}),
      objective('race-win','race',1,['12인 레이스 우승','WIN THE 12-RIDER RACE'],['라이벌 그리드에서 1위로 완주하세요.','Finish first against the full rival grid.'],{x:230,z:523,mode:'water'},{filters:{maxPosition:1}}),
      objective('legend-auction','fishSale',5000,['어획 경매 5,000 CR 정산','SETTLE 5,000 CR AT AUCTION'],['최고의 어획을 모아 한 번의 흐름으로 정산하세요.','Build a premium catch portfolio and settle 5,000 CR total.'],{x:331,z:384,mode:'land'},{metric:'value'}),
    ]),
]);

function matches(filters,payload){
  if(filters.facilityId&&payload.facilityId!==filters.facilityId)return false;if(filters.actionId&&payload.actionId!==filters.actionId)return false;if(filters.npcId&&payload.npcId!==filters.npcId)return false;if(filters.activityId&&payload.activityId!==filters.activityId)return false;if(filters.region&&payload.region!==filters.region)return false;if(filters.maxPosition&&Number(payload.position)>filters.maxPosition)return false;if(filters.rarities&&!filters.rarities.includes(payload.rarity))return false;return true;
}

export class StoryMissionDirector{
  constructor(saved){this.activeId=null;this.stage=0;this.progress=0;this.completed=[];this.log=[];this.restore(saved)}
  get active(){return TIDEBOUND_STORIES.find(item=>item.id===this.activeId)||null}
  get available(){return TIDEBOUND_STORIES.find(item=>!this.completed.includes(item.id)&&item.id!==this.activeId)||null}
  get objective(){return this.active?.objectives[this.stage]||null}
  get ready(){return Boolean(this.active&&this.stage>=this.active.objectives.length)}
  _log(type,payload={}){this.log.unshift({type,at:Date.now(),...payload});this.log=this.log.slice(0,80)}
  accept(id=this.available?.id){const definition=TIDEBOUND_STORIES.find(item=>item.id===id);if(this.active||!definition||definition.id!==this.available?.id)return{ok:false,reason:this.active?'active':'locked'};this.activeId=id;this.stage=0;this.progress=0;this._log('accept',{missionId:id});return{ok:true,mission:clone(definition),objective:clone(this.objective)}}
  record(event,payload={}){
    const mission=this.active,objective=this.objective;if(!mission||!objective||objective.event!==event||!matches(objective.filters,payload))return null;const amount=objective.metric==='value'?Math.max(0,Number(payload.value)||0):Math.max(1,Number(payload.count)||1),before=this.progress;this.progress=clamp(this.progress+amount,0,objective.target);if(this.progress===before)return null;
    if(this.progress<objective.target){this._log('progress',{missionId:mission.id,objectiveId:objective.id,progress:this.progress});return{type:'progress',mission:clone(mission),objective:clone(objective),progress:this.progress}}
    const completedObjective=objective;this.stage++;this.progress=0;this._log('stage',{missionId:mission.id,objectiveId:completedObjective.id,stage:this.stage});if(this.ready){this._log('ready',{missionId:mission.id});return{type:'ready',mission:clone(mission),objective:clone(completedObjective)}}return{type:'stage',mission:clone(mission),objective:clone(completedObjective),next:clone(this.objective),stage:this.stage};
  }
  claim(){if(!this.ready)return{ok:false,reason:'not-ready'};const mission=this.active;this.completed.push(mission.id);this.activeId=null;this.stage=0;this.progress=0;this._log('complete',{missionId:mission.id});return{ok:true,mission:clone(mission),reward:{...mission.reward},campaignComplete:this.completed.length===TIDEBOUND_STORIES.length,next:clone(this.available)}}
  snapshot(){
    const active=this.active,available=this.available,objective=this.objective,state=this.ready?'ready':active?'active':available?'available':'complete',mission=active||available||TIDEBOUND_STORIES.at(-1),waypoint=this.ready?{x:223,z:384,mode:'land',label:label('항만 스토리 데스크에 보고','REPORT TO HARBOR STORIES')}:state==='available'?{x:223,z:384,mode:'land',label:label('새 스토리 챕터 시작','BEGIN NEW STORY CHAPTER')}:(objective?{...objective.waypoint,label:objective.name}:null);
    return{state,mission:mission?clone(mission):null,objective:objective?{...clone(objective),progress:this.progress}:null,stage:this.stage,completed:[...this.completed],campaignProgress:this.completed.length/TIDEBOUND_STORIES.length,waypoint,log:clone(this.log)};
  }
  serialize(){return{activeId:this.activeId,stage:this.stage,progress:this.progress,completed:[...this.completed],log:clone(this.log)}}
  restore(saved){if(!saved||typeof saved!=='object')return this.serialize();const validIds=new Set(TIDEBOUND_STORIES.map(item=>item.id));this.completed=Array.isArray(saved.completed)?[...new Set(saved.completed.filter(id=>validIds.has(id)))]:[];if(validIds.has(saved.activeId)&&!this.completed.includes(saved.activeId))this.activeId=saved.activeId;const mission=this.active;this.stage=mission?clamp(Math.floor(Number(saved.stage)||0),0,mission.objectives.length):0;this.progress=mission&&!this.ready?clamp(Number(saved.progress)||0,0,this.objective.target):0;if(Array.isArray(saved.log))this.log=clone(saved.log.slice(0,80));return this.serialize()}
}
