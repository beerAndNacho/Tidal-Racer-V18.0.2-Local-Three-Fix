const label=(ko,en)=>({ko,en}),clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const CITIZEN_COPY=Object.freeze({
  'mina-park':{role:label('항만 배차 담당','HARBOR DISPATCHER'),lines:[label('오늘 항만 일은 조수가 바뀌기 전에 처리하는 게 좋아요.','Today’s harbor work is best handled before the tide turns.'),label('좋은 근무 기록은 항만 전체의 신뢰를 올려 줍니다.','A clean result raises trust across the whole harbor.')]},
  'leo-costa':{role:label('해안 구조대','COAST RESCUE'),lines:[label('바람이 강해지면 구조 부표부터 확인하세요.','Check the rescue buoys first when the wind rises.'),label('어떤 경기보다 무사히 돌아오는 게 중요합니다.','Coming home safe matters more than any race.')]},
  'hana-choi':{role:label('마리나 셰프','MARINA CHEF'),lines:[label('좋은 생선은 잡은 해역과 시간이 맛을 결정해요.','A catch tastes different depending on its water and hour.'),label('희귀 어종은 팔기 전에 기록부터 남겨 주세요.','Log a rare fish before you sell the story short.')]},
  'noah-reed':{role:label('제트 정비사','JET MECHANIC'),lines:[label('선체가 흔들리면 속도보다 조향 입력부터 줄이세요.','If the hull starts dancing, ease steering before speed.'),label('부스트는 직선보다 물길을 읽고 쓰는 겁니다.','Boost is about reading water, not just finding a straight.')]},
  'yuri-tan':{role:label('해양 생물 연구원','MARINE BIOLOGIST'),lines:[label('산호 해역의 어종은 해 질 무렵 더 활발해져요.','Coral species become more active toward sunset.'),label('어획 기록을 모으면 군도의 변화를 볼 수 있어요.','Catch records reveal how the archipelago is changing.')]},
  'mateo-silva':{role:label('거리 음악가','STREET MUSICIAN'),lines:[label('밤의 항구에서는 엔진 소리도 리듬처럼 들려요.','At night, even the engines sound like rhythm.'),label('블루 웨이브 라운지는 해가 진 뒤가 진짜예요.','Blue Wave Lounge only becomes itself after sunset.')]},
  'sofia-kim':{role:label('레이스 팬','RACE FAN'),lines:[label('마지막 랩에서는 슬립스트림을 놓치지 마세요.','Do not waste the slipstream on the final lap.'),label('오늘 포디움의 주인공은 누가 될까요?','Who takes the podium today?')]},
  'eli-brooks':{role:label('아침 러너','MORNING RUNNER'),lines:[label('해 뜨기 전 산책로가 가장 조용합니다.','The promenade is calmest before sunrise.'),label('진짜 체력은 부스트 게이지보다 천천히 채워져요.','Real stamina refills slower than a boost gauge.')]},
  'ara-song':{role:label('은행 상담원','BANK ADVISER'),lines:[label('큰 보상은 지갑과 계좌로 나눠 두세요.','Split large rewards between your wallet and account.'),label('항만 평판은 돈으로 바로 살 수 없어요.','Harbor Standing is one thing credits cannot buy outright.')]},
  'kai-morgan':{role:label('자유 낚시인','FREE ANGLER'),lines:[label('블랙 리프에서는 낮은 장력부터 시작하세요.','Start with lower line tension at Black Reef.'),label('큰 물고기는 힘보다 리듬으로 잡는 겁니다.','Big fish are landed with rhythm, not brute force.')]},
  'jiho-lee':{role:label('해안 배달원','COAST COURIER'),lines:[label('도시 일과 항만 의뢰를 묶으면 시간을 아낄 수 있어요.','Bundle city errands with harbor work to save daylight.'),label('골든 코스트에서는 지름길보다 타이밍이 빠릅니다.','In Golden Coast, timing beats shortcuts.')]},
  'lena-volkov':{role:label('야간 사진가','NIGHT PHOTOGRAPHER'),lines:[label('비가 그친 뒤 젖은 길의 네온 반사가 최고예요.','Neon on wet pavement is worth waiting for.'),label('문 아키펠라고의 새벽빛을 꼭 보세요.','Do not miss dawn over Moon Archipelago.')]},
  'omar-haddad':{role:label('시장 상인','MARKET TRADER'),lines:[label('오늘은 커피보다 신선 식재료가 먼저 나갔어요.','Fresh groceries moved faster than coffee today.'),label('좋은 어획은 항구 소문보다 빨리 팔립니다.','A good catch sells faster than harbor gossip.')]},
  'ren-ito':{role:label('피트니스 코치','FITNESS COACH'),lines:[label('레이스 전에는 강도보다 회복이 먼저입니다.','Recovery matters more than intensity before a race.'),label('배고픈 상태로 훈련하면 집중력이 먼저 떨어져요.','Training hungry costs focus before strength.')]},
  'maya-rivera':{role:label('섬 안내인','ISLAND GUIDE'),lines:[label('각 해역은 날씨와 물결의 성격이 모두 달라요.','Every region has its own weather and water character.'),label('새로 발견한 해역도 항만 자산이 됩니다.','Newly discovered waters become useful harbor intelligence.')]},
  'jun-perry':{role:label('라운지 스태프','LOUNGE CREW'),lines:[label('라이브 세트는 오늘 밤 여덟 시에 시작해요.','The live set starts at eight tonight.'),label('레이스가 끝난 뒤에도 도시는 멈추지 않아요.','The city does not stop when the race does.')]},
  'nia-okafor':{role:label('도시 기자','CITY REPORTER'),lines:[label('사람들은 우승보다 새로운 항적 이야기를 오래 기억해요.','People remember a new wake story longer than a win.'),label('항만청 게시판이 요즘 가장 바쁜 뉴스 데스크예요.','The harbor board is the busiest news desk in town.')]},
  'theo-ng':{role:label('야간 경비','NIGHT WATCH'),lines:[label('늦은 시간에는 부두 가장자리를 조심하세요.','Watch the dock edge after dark.'),label('항구는 새벽 전에 조용해질 뿐 잠들지는 않습니다.','The harbor grows quiet before dawn, never asleep.')]}
});

export function applyCitizenLocalization(citizens=[]){for(const citizen of citizens){const copy=CITIZEN_COPY[citizen.id];if(copy){citizen.role=clone(copy.role);citizen.lines=clone(copy.lines)}}return citizens}

export const CITIZEN_FAVORS=Object.freeze([
  {id:'dispatch-hand',citizenId:'mina-park',title:label('부두 인력 지원','DOCKSIDE HELP'),brief:label('항만 갑판 근무를 한 번 완료하세요.','Complete one Harbor Deck Crew shift.'),event:'job',filter:{jobId:'dock-crew'},target:1,reward:{credits:650,rep:14}},
  {id:'safe-finish',citizenId:'leo-costa',title:label('안전한 완주','SAFE FINISH'),brief:label('지역 챔피언십을 5위 안에 완주하세요.','Finish a regional championship in the top five.'),event:'race',filter:{positionMax:5},target:1,reward:{credits:900,rep:18}},
  {id:'local-table',citizenId:'hana-choi',title:label('지역 식탁 조사','LOCAL TABLE'),brief:label('마리나 식당에서 식사하세요.','Eat a meal at Marina Table.'),event:'life',filter:{facilityId:'restaurant'},target:1,reward:{credits:480,rep:10}},
  {id:'service-bay',citizenId:'noah-reed',title:label('정비소 보조','SERVICE BAY HAND'),brief:label('마리나 정비 보조 근무를 완료하세요.','Complete one Marina Technician shift.'),event:'job',filter:{jobId:'marina-tech'},target:1,reward:{credits:780,rep:16}},
  {id:'field-samples',citizenId:'yuri-tan',title:label('해양 표본 기록','FIELD SAMPLES'),brief:label('물고기 두 마리를 잡아 기록하세요.','Land and log two fish.'),event:'fish',filter:{},target:2,reward:{credits:760,rep:20}},
  {id:'night-set',citizenId:'mateo-silva',title:label('라이브 공연 응원','NIGHT SET'),brief:label('블루 웨이브 라운지에서 라이브 공연을 즐기세요.','Attend the live set at Blue Wave Lounge.'),event:'life',filter:{facilityId:'nightlife',actionId:'live_music'},target:1,reward:{credits:520,rep:12}},
  {id:'rainy-day-fund',citizenId:'ara-song',title:label('비상금 만들기','RAINY DAY FUND'),brief:label('은행 계좌에 자금을 한 번 입금하세요.','Make one deposit into your bank account.'),event:'life',filter:{actionPrefix:'deposit_'},target:1,reward:{credits:600,rep:12}},
  {id:'front-page',citizenId:'nia-okafor',title:label('항만청 취재','FRONT PAGE LEAD'),brief:label('항만청을 방문해 현장을 확인하세요.','Visit the Harbor Office for a field report.'),event:'visit',filter:{facilityId:'harbor-office'},target:1,reward:{credits:700,rep:15}}
].map(favor=>Object.freeze({...favor,title:Object.freeze(favor.title),brief:Object.freeze(favor.brief),filter:Object.freeze(favor.filter),reward:Object.freeze(favor.reward)})));

const favorById=id=>CITIZEN_FAVORS.find(favor=>favor.id===id),favorForCitizen=id=>CITIZEN_FAVORS.find(favor=>favor.citizenId===id);
const cleanRelation=value=>({affinity:Math.max(0,Math.floor(Number(value?.affinity)||0)),talks:Math.max(0,Math.floor(Number(value?.talks)||0)),tier:Math.max(0,Math.min(3,Math.floor(Number(value?.tier)||0)))});
const tierFor=affinity=>affinity>=60?3:affinity>=30?2:affinity>=12?1:0;
const matches=(favor,event,payload)=>{if(favor.event!==event)return false;for(const [key,value] of Object.entries(favor.filter)){if(key==='positionMax'){if((Number(payload.position)||99)>value)return false}else if(key==='actionPrefix'){if(!String(payload.actionId||'').startsWith(value))return false}else if(payload[key]!==value)return false}return true};

export class CitizenRelationshipDirector{
  constructor(saved=null){this.profile={relations:{},favors:{},activeFavorId:null,completed:0};this.restore(saved)}
  relation(citizenId){const relation=cleanRelation(this.profile.relations[citizenId]);relation.tier=tierFor(relation.affinity);return relation}
  talk(citizenId){
    const relation=this.relation(citizenId),first=relation.talks===0,oldTier=relation.tier;relation.talks++;relation.affinity+=first?5:2;relation.tier=tierFor(relation.affinity);this.profile.relations[citizenId]=relation;
    const favor=favorForCitizen(citizenId),state=favor?this.profile.favors[favor.id]:null;
    if(favor&&this.profile.activeFavorId===favor.id&&state?.status==='ready'){this.profile.favors[favor.id]={...state,status:'claimed'};this.profile.activeFavorId=null;this.profile.completed++;relation.affinity+=8;relation.tier=tierFor(relation.affinity);this.profile.relations[citizenId]=relation;return{relation:{...relation},tierUp:relation.tier>oldTier,claimed:true,favor,reward:{...favor.reward}}}
    if(favor&&!this.profile.activeFavorId&&state?.status!=='claimed'&&relation.affinity>=8){this.profile.favors[favor.id]={status:'active',progress:0};this.profile.activeFavorId=favor.id;return{relation:{...relation},tierUp:relation.tier>oldTier,offered:true,favor}}
    return{relation:{...relation},tierUp:relation.tier>oldTier};
  }
  record(event,payload={}){
    const favor=favorById(this.profile.activeFavorId),state=favor?this.profile.favors[favor.id]:null;if(!favor||state?.status!=='active'||!matches(favor,event,payload))return null;
    state.progress=Math.min(favor.target,(state.progress||0)+(Math.max(1,Math.floor(Number(payload.count)||1))));if(state.progress>=favor.target)state.status='ready';this.profile.favors[favor.id]=state;return{type:state.status==='ready'?'ready':'progress',favor,state:{...state}};
  }
  active(){const favor=favorById(this.profile.activeFavorId);if(!favor)return null;return{favor,state:{...(this.profile.favors[favor.id]||{status:'active',progress:0})}}}
  serialize(){return{version:1,relations:Object.fromEntries(Object.entries(this.profile.relations).map(([id,value])=>[id,cleanRelation(value)])),favors:clone(this.profile.favors),activeFavorId:favorById(this.profile.activeFavorId)?.id||null,completed:Math.max(0,Math.floor(Number(this.profile.completed)||0))}}
  restore(saved){if(!saved||typeof saved!=='object')return this.serialize();this.profile.relations={};for(const [id,value] of Object.entries(saved.relations||{}))if(CITIZEN_COPY[id])this.profile.relations[id]=cleanRelation(value);this.profile.favors={};for(const [id,value] of Object.entries(saved.favors||{}))if(favorById(id))this.profile.favors[id]={status:['active','ready','claimed'].includes(value?.status)?value.status:'active',progress:Math.max(0,Math.floor(Number(value?.progress)||0))};this.profile.activeFavorId=favorById(saved.activeFavorId)?.id||null;this.profile.completed=Math.max(0,Math.floor(Number(saved.completed)||0));return this.serialize()}
  snapshot(){const active=this.active();return{...this.serialize(),active,relations:Object.fromEntries(Object.keys(CITIZEN_COPY).map(id=>[id,this.relation(id)]))}}
}
