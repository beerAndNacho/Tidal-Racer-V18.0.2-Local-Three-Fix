import * as THREE from 'three';
import { COAST_CROSSWALKS, COAST_PARKING_SPOTS, coastSignalState } from './city-traffic-system.js';
import { grantLifestyleEffect, lifestyleBonuses as resolveLifestyleBonuses, lifestyleClock, pruneLifestyleEffects, lifestyleEffectFor } from './lifestyle-effect-system.js';

const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
const label=(ko,en)=>({ko,en});
const CITY_PARKING_COLLIDER_SPOTS=typeof COAST_PARKING_SPOTS==='undefined'?[]:COAST_PARKING_SPOTS;

export const CITY_DOCK=Object.freeze({
  water:{x:230,z:523},
  shore:{x:230,z:436},
  berth:{x:230,z:507,heading:Math.PI},
  boardRadius:12,
  disembarkRadius:102,
});

const action=(id,name,cost,hours,effects,description)=>({id,name,cost,hours,effects,description});
export const CITY_PANTRY_CAPACITY=18;
export const GROCERY_MEALS=6;
export const CITY_FACILITIES=Object.freeze([
  {
    id:'marina-workshop',name:label('타이달 마리나 웍스','TIDAL MARINA WORKS'),type:label('제트스키 정비·차고','MARINA WORKSHOP'),accent:0xffa95e,
    exterior:{x:7,z:379},interior:{x:7352,z:7000},
    actions:[
      action('marina_workshop',label('정비·튜닝 단말','SERVICE & TUNING TERMINAL'),0,.1,{},label('기체를 구매·교체하고 성능 부품과 냉장 보관함을 업그레이드합니다.','Buy or switch craft, service damage, and install performance or locker upgrades.')),
    ],
  },
  {
    id:'home',name:label('마리나 아파트','MARINA APARTMENT'),type:label('내 집','HOME'),accent:0x65d8cf,
    exterior:{x:61,z:379},interior:{x:7000,z:7000},
    actions:[
      action('sleep',label('푹 자기','SLEEP UNTIL MORNING'),0,8,{energy:100,hunger:-16,mood:10},label('다음 날 오전 7시까지 휴식합니다.','Rest until 7 AM the next day.')),
      action('shower',label('샤워하기','TAKE A SHOWER'),0,.45,{hygiene:100,energy:6,mood:4},label('위생과 컨디션을 회복합니다.','Restore hygiene and condition.')),
      action('home_meal',label('집밥 만들기','COOK A HOME MEAL'),0,1,{hunger:46,energy:6,mood:5},label('팬트리 식재료 한 끼분을 사용해 든든하게 식사합니다.','Use one pantry meal to cook a filling dinner at no extra cost.')),
      action('watch_tv',label('TV로 경기 보기','WATCH THE RACES'),0,1.2,{mood:14,energy:3,hunger:-4},label('소파에서 휴식하며 경기를 봅니다.','Relax on the sofa and watch racing.')),
    ],
  },
  {
    id:'grocery',name:label('코스트 마켓','COAST MARKET'),type:label('생활 상점','GROCERY'),accent:0xe6b85f,
    exterior:{x:115,z:379},interior:{x:7044,z:7000},
    actions:[
      action('groceries',label('일주일 식재료','WEEKLY GROCERIES'),680,.35,{hunger:12,mood:3},label('집에서 사용할 신선 식재료를 삽니다.','Buy fresh groceries for home.')),
      action('snack',label('간단한 간식','QUICK SNACK'),190,.2,{hunger:18,energy:3},label('간단히 허기를 달랩니다.','Take the edge off your hunger.')),
      action('coffee',label('커피','FRESH COFFEE'),260,.25,{energy:13,mood:5,hunger:3},label('잠깐 쉬며 에너지를 보충합니다.','Take a short break and regain energy.')),
    ],
  },
  {
    id:'restaurant',name:label('마리나 키친','MARINA KITCHEN'),type:label('음식점','RESTAURANT'),accent:0xf08a63,
    exterior:{x:169,z:379},interior:{x:7088,z:7000},
    actions:[
      action('breakfast',label('해안식 아침','COASTAL BREAKFAST'),390,.65,{hunger:36,energy:10,mood:6},label('달걀, 빵, 과일과 커피가 나옵니다.','Eggs, bread, fruit and coffee.')),
      action('seafood_bowl',label('해산물 덮밥','SEAFOOD RICE BOWL'),780,.85,{hunger:62,energy:8,mood:12},label('현지 해산물로 만든 대표 메뉴입니다.','The signature bowl made with local seafood.')),
      action('chef_course',label('셰프 코스','CHEF TASTING COURSE'),1450,1.5,{hunger:82,mood:24,energy:9},label('천천히 즐기는 다섯 가지 코스입니다.','A relaxed five-course tasting menu.')),
    ],
  },
  {
    id:'harbor-office',name:label('골든 코스트 항만청','GOLDEN COAST HARBOR OFFICE'),type:label('항만 의뢰망','HARBOR NETWORK'),accent:0x38c5c9,
    exterior:{x:223,z:379},interior:{x:7264,z:7000},
    actions:[
      action('harbor_board',label('오늘의 항만 의뢰','TODAY’S HARBOR CONTRACTS'),0,.1,{},label('레이스·낚시·구조·도시 생활을 연결하는 항만 의뢰를 확인합니다.','Review harbor work linking races, fishing, rescue, and city life.')),
      action('story_board',label('타이드바운드 스토리','TIDEBOUND STORIES'),0,.1,{},label('골든 코스트 사람들과 군도의 여섯 챕터 캠페인을 이어갑니다.','Continue a six-chapter campaign through the people and waters of the archipelago.')),
    ],
  },
  {
    id:'bank',name:label('타이달 은행','TIDAL BANK'),type:label('은행','BANK'),accent:0x6da8ff,
    exterior:{x:277,z:379},interior:{x:7132,z:7000},
    actions:[
      action('deposit_1000',label('1,000 CR 입금','DEPOSIT 1,000 CR'),0,.15,{},label('지갑에서 계좌로 안전하게 옮깁니다.','Move funds from your wallet to your account.')),
      action('withdraw_1000',label('1,000 CR 출금','WITHDRAW 1,000 CR'),0,.15,{},label('계좌에서 생활비를 인출합니다.','Withdraw spending money from your account.')),
      action('deposit_5000',label('5,000 CR 입금','DEPOSIT 5,000 CR'),0,.2,{},label('큰 금액을 계좌에 보관합니다.','Secure a larger amount in your account.')),
      action('withdraw_5000',label('5,000 CR 출금','WITHDRAW 5,000 CR'),0,.2,{},label('큰 금액을 지갑으로 인출합니다.','Withdraw a larger amount into your wallet.')),
    ],
  },
  {
    id:'fish-market',name:label('골든 코스트 어시장','GOLDEN COAST FISH AUCTION'),type:label('산지 경매장','FISH MARKET'),accent:0x52d9b5,
    exterior:{x:331,z:379},interior:{x:7308,z:7000},
    actions:[
      action('fish_auction',label('어획 경매 단말','CATCH AUCTION TERMINAL'),0,.1,{},label('냉장 보관함의 어획을 오늘 시세로 판매하거나 바다로 돌려보냅니다.','Sell cooler catches at today’s price or release them back to the sea.')),
    ],
  },
  {
    id:'nightlife',name:label('블루 웨이브 라운지','BLUE WAVE LOUNGE'),type:label('라이브·클럽','NIGHTLIFE'),accent:0xb878ff,
    exterior:{x:385,z:379},interior:{x:7176,z:7000},
    actions:[
      action('live_music',label('라이브 공연','LIVE MUSIC SET'),900,2,{mood:28,energy:-9,hunger:-5},label('지역 밴드의 라이브 공연을 즐깁니다.','Enjoy a live set by a local band.')),
      action('dance',label('댄스 플로어','DANCE FLOOR'),650,1.5,{mood:24,energy:-16,hunger:-7,hygiene:-8},label('음악과 조명 속에서 춤을 춥니다.','Dance under the lights and music.')),
      action('arcade',label('레이싱 아케이드','RACING ARCADE'),450,1,{mood:17,energy:-5},label('친선 타임어택에 도전합니다.','Try a friendly arcade time trial.')),
      action('mocktail',label('시그니처 무알코올 칵테일','SIGNATURE MOCKTAIL'),280,.4,{mood:9,hunger:7,energy:3},label('바에서 천천히 음료를 즐깁니다.','Enjoy a relaxed drink at the bar.')),
    ],
  },
  {
    id:'gym',name:label('하버 피트니스','HARBOR FITNESS'),type:label('체육관','GYM'),accent:0x72ef9e,
    exterior:{x:439,z:379},interior:{x:7220,z:7000},
    actions:[
      action('cardio',label('유산소 운동','CARDIO SESSION'),420,1,{energy:-15,mood:13,hunger:-10,hygiene:-12},label('지구력 중심으로 한 시간 운동합니다.','Train endurance for one hour.')),
      action('strength',label('근력 운동','STRENGTH SESSION'),520,1.2,{energy:-18,mood:15,hunger:-12,hygiene:-14},label('전신 근력 루틴을 수행합니다.','Complete a full-body strength routine.')),
      action('stretch',label('회복 스트레칭','RECOVERY STRETCH'),220,.55,{energy:8,mood:8,hygiene:-2},label('관절과 근육의 피로를 풉니다.','Release fatigue from joints and muscles.')),
    ],
  },
]);

const venueProgram=(id,actionId,name,description,costMultiplier=.85,effectMultiplier=1.1)=>Object.freeze({id,actionId,name,description,costMultiplier,effectMultiplier});
export const CITY_VENUE_PROGRAMS=Object.freeze({
  grocery:Object.freeze([
    venueProgram('coffee-morning','coffee',label('항구 커피 모닝','HARBOR COFFEE MORNING'),label('오늘의 신선 커피가 할인되고 활력 효과가 강화됩니다.','Fresh coffee is discounted today with a stronger energy lift.'),.75,1.14),
    venueProgram('market-basket-day','groceries',label('마켓 바스켓 데이','MARKET BASKET DAY'),label('팬트리 여섯 끼 장보기를 특별 가격에 제공합니다.','Stock six pantry meals at today’s market-basket price.'),.85,1.08),
    venueProgram('voyage-snack-deal','snack',label('항해 간식 행사','VOYAGE SNACK DEAL'),label('빠른 간식이 할인되고 포만감 효과가 강화됩니다.','Quick snacks cost less and restore more hunger today.'),.8,1.12),
  ]),
  restaurant:Object.freeze([
    venueProgram('sunrise-breakfast','breakfast',label('선라이즈 브렉퍼스트','SUNRISE BREAKFAST'),label('아침 메뉴 할인과 강화된 에너지 회복을 제공합니다.','The breakfast plate is discounted with improved recovery.'),.8,1.12),
    venueProgram('catch-of-the-day','seafood_bowl',label('오늘의 어획','CATCH OF THE DAY'),label('지역 어획 덮밥이 오늘의 대표 메뉴로 제공됩니다.','The local seafood bowl is today’s featured harbor plate.'),.85,1.13),
    venueProgram('chef-table-night','chef_course',label('셰프 테이블 나이트','CHEF TABLE NIGHT'),label('시그니처 코스를 예약 없이 특별 가격에 즐깁니다.','Enjoy the signature tasting course at a special walk-in price.'),.8,1.15),
  ]),
  nightlife:Object.freeze([
    venueProgram('local-live-night','live_music',label('로컬 라이브 나이트','LOCAL LIVE NIGHT'),label('지역 밴드 공연 입장료와 기분 회복이 강화됩니다.','Local-band admission costs less and grants a stronger mood lift.'),.8,1.14),
    venueProgram('neon-dance-session','dance',label('네온 댄스 세션','NEON DANCE SESSION'),label('댄스 플로어 커버 할인과 강화된 기분 효과를 제공합니다.','Dance-floor cover is discounted with a stronger mood effect.'),.82,1.12),
    venueProgram('arcade-ladder','arcade',label('아케이드 래더','ARCADE LADDER'),label('레이싱 아케이드 참가비가 할인됩니다.','The racing arcade ladder has a reduced entry fee today.'),.7,1.1),
  ]),
  gym:Object.freeze([
    venueProgram('cardio-club','cardio',label('카디오 클럽','CARDIO CLUB'),label('단체 유산소 세션 비용이 할인되고 기분 효과가 강화됩니다.','The group cardio session is discounted with a stronger mood gain.'),.78,1.12),
    venueProgram('strength-clinic','strength',label('스트렝스 클리닉','STRENGTH CLINIC'),label('트레이너 근력 세션을 특별 가격에 진행합니다.','Join a trainer-led strength clinic at a special price.'),.78,1.12),
    venueProgram('recovery-hour','stretch',label('리커버리 아워','RECOVERY HOUR'),label('회복 스트레칭 비용이 할인되고 에너지 회복이 강화됩니다.','Recovery stretching costs less and restores more energy.'),.68,1.16),
  ]),
});
export function cityVenueProgram(facilityId,day=1){
  const programs=CITY_VENUE_PROGRAMS[facilityId];if(!programs?.length)return null;return programs[(Math.max(1,Math.floor(day))-1)%programs.length];
}
export function cityVenueActionQuote(facilityId,item,day=1){
  if(!item)return null;const program=cityVenueProgram(facilityId,day),featured=program?.actionId===item.id;
  if(!featured)return{item,program,featured:false,standardCost:item.cost,savings:0};
  const cost=item.cost?Math.max(0,Math.round(item.cost*program.costMultiplier/10)*10):0,effects=Object.fromEntries(Object.entries(item.effects||{}).map(([key,value])=>[key,value>0?Math.round(value*program.effectMultiplier):value]));
  return{item:{...item,cost,effects},program,featured:true,standardCost:item.cost,savings:item.cost-cost};
}

export const CITY_FACILITY_HOURS=Object.freeze({
  'marina-workshop':[6,24],home:[0,24],grocery:[6,23],restaurant:[6,24],'harbor-office':[0,24],bank:[8,20],'fish-market':[5,21],nightlife:[18,4],gym:[5,24],
});
export const CITY_INTERIOR_PEOPLE=Object.freeze({
  'marina-workshop':[{name:'Mara Voss',role:'mechanic',kind:'staff',at:[7.2,-8.3],heading:2.8}],
  home:[{name:'Eli Ward',role:'resident',kind:'resident',at:[8.7,5.1],heading:-2.5}],
  grocery:[{name:'Sora Kim',role:'clerk',kind:'staff',at:[8.5,6.7],heading:3.05},{name:'Milo Chen',role:'shopper',kind:'queue',queue:1,at:[5.4,3.3],heading:.15}],
  restaurant:[{name:'Nadia Cruz',role:'server',kind:'staff',at:[4.8,-8.5],heading:.1},{name:'Iris Bell',role:'diner',kind:'guest',at:[-9.2,2.6],heading:1.2}],
  'harbor-office':[{name:'Omar Haddad',role:'dispatcher',kind:'staff',at:[7.2,6.8],heading:3.05},{name:'Theo Ng',role:'skipper',kind:'queue',queue:1,at:[7.2,3.7],heading:.05}],
  bank:[{name:'Jun Perry',role:'teller',kind:'staff',at:[7.4,-7.2],heading:.1},{name:'Lena Volkov',role:'customer',kind:'queue',queue:1,at:[10.2,-1.8],heading:3.1},{name:'Nia Okafor',role:'customer',kind:'queue',queue:2,at:[10.2,1],heading:3.1}],
  'fish-market':[{name:'Leo Costa',role:'auctioneer',kind:'staff',at:[7.3,6.7],heading:3.05},{name:'Kai Morgan',role:'buyer',kind:'queue',queue:1,at:[7.3,3.2],heading:.05}],
  nightlife:[{name:'Mateo Silva',role:'bartender',kind:'staff',at:[8.2,6.8],heading:3.1},{name:'Ren Ito',role:'guest',kind:'guest',at:[-5.1,3.5],heading:.4},{name:'Maya Rivera',role:'guest',kind:'guest',at:[-1.8,4.2],heading:-.4}],
  gym:[{name:'Ara Song',role:'trainer',kind:'staff',at:[9.8,6.2],heading:-2.7},{name:'Hana Choi',role:'member',kind:'guest',at:[-9.4,3.5],heading:.15}],
});
export const CITY_SERVICE_DIALOGUE=Object.freeze({
  mechanic:[label('선체 상태부터 보고, 속도보다 신뢰성을 먼저 맞추죠.','Let me inspect the hull first; reliability comes before speed.'),label('작업대에서 장착 부품과 정비 견적을 확인할 수 있어요.','The bench has your installed parts and service quote.')],
  resident:[label('오늘 일정이 길면 씻고 식사부터 챙겨요.','If today runs long, shower and eat before heading out.'),label('침대에서 자면 오전 7시에 새 하루를 시작해요.','Sleeping starts a fresh day at 07:00.')],
  clerk:[label('신선식품은 앞쪽, 항해 간식은 계산대 옆에 있어요.','Fresh food is up front; voyage snacks are beside the register.'),label('식료품을 사두면 집에서 비용 없이 식사할 수 있어요.','Stock groceries to prepare a free meal at home.')],
  shopper:[label('폭풍 예보가 있으면 물과 간식을 더 챙기는 게 좋아요.','I stock extra water and snacks when a storm is forecast.')],
  server:[label('따뜻한 식사는 체력과 기분을 함께 회복시켜요.','A hot meal restores both energy and morale.'),label('셰프 코스는 비싸지만 긴 항해 전에 가장 든든해요.','The chef course costs more, but it is best before a long voyage.')],
  diner:[label('오늘 해산물 볼이 특히 괜찮네요.','The seafood bowl is especially good today.')],
  dispatcher:[label('계약 보드에서 현재 항만 의뢰와 보상을 확인하세요.','Check the contract board for live harbor work and rewards.'),label('스토리 기록은 옆 데스크에서 이어갈 수 있어요.','You can continue the Tidebound log at the adjacent desk.')],
  skipper:[label('출항 전에는 날씨와 연료, 선체를 같이 봐야 해요.','Before departure, check weather, fuel, and hull together.')],
  teller:[label('현금은 지갑에, 큰 금액은 계좌에 나눠 두세요.','Keep spending cash in your wallet and larger funds in the account.'),label('입금과 출금은 즉시 처리되고 항해 기록에 저장됩니다.','Deposits and withdrawals process instantly and save to your voyage.')],
  customer:[label('레이스 상금은 바로 계좌에 옮기는 편이 안전해요.','I move race winnings into the account as soon as I dock.')],
  auctioneer:[label('어종, 무게, 신선도와 지역 수요가 오늘 가격을 정합니다.','Species, weight, freshness, and regional demand set today\'s price.'),label('희귀 어획은 바로 팔지 말고 수요 배수를 확인하세요.','Check the demand multiplier before selling a rare catch.')],
  buyer:[label('오늘은 큰 개체보다 신선한 연안 어종이 잘 팔려요.','Fresh coastal species are outselling the largest fish today.')],
  bartender:[label('라이브 음악과 무알코올 음료는 늦은 시간에도 준비돼요.','Live music and alcohol-free drinks are ready late into the night.'),label('라운지는 오전 4시에 닫고 오후 6시에 다시 열어요.','The lounge closes at 04:00 and reopens at 18:00.')],
  guest:[label('도시에서 쉬고 나면 다음 레이스가 훨씬 가볍게 느껴져요.','A night in the city makes the next race feel much lighter.')],
  trainer:[label('피곤할 때 무리하면 효율이 떨어져요. 회복 상태를 먼저 보세요.','Training while exhausted is inefficient; check recovery first.'),label('유산소는 지구력, 근력은 강한 조작을 버티는 데 도움이 돼요.','Cardio builds endurance; strength helps sustain hard handling.')],
  member:[label('짧은 스트레칭도 장거리 항해 뒤에는 차이가 커요.','Even a short stretch helps after a long voyage.')],
});
export function facilityOperatingStatus(id,hour=12){
  const schedule=CITY_FACILITY_HOURS[id]||[0,24],opens=schedule[0],closes=schedule[1],time=((Number(hour)||0)%24+24)%24,always=opens===0&&closes===24,open=always||(closes>opens?time>=opens&&time<closes:time>=opens||time<closes),nextOpenHours=open?0:(opens-time+24)%24;
  return{id,open,opens,closes,nextOpenHours,overnight:closes<opens,always};
}

const facilityById=id=>CITY_FACILITIES.find(item=>item.id===id);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const GOLDEN_CITY={centerX:620*.36,roadZ:620*.66};
export const CITY_FOOT_AREAS=Object.freeze([
  Object.freeze({id:'commercial-strip',minX:-35,maxX:488,minZ:379.5,maxZ:441}),
  Object.freeze({id:'east-waterfront-plaza',minX:472,maxX:630,minZ:379.5,maxZ:450}),
  Object.freeze({id:'east-overlook-pier',minX:520,maxX:600,minZ:447,maxZ:476}),
]);
export const cityFootAreaAt=position=>CITY_FOOT_AREAS.find(area=>position&&position.x>=area.minX&&position.x<=area.maxX&&position.z>=area.minZ&&position.z<=area.maxZ)||null;
export const CITY_PUBLIC_SPACE=Object.freeze({id:'east-waterfront',name:label('타이달 광장','TIDAL SQUARE'),type:label('동쪽 워터프런트','EAST WATERFRONT'),accent:0x74ebff});
const publicActivity=(id,name,description,hours,cost,effects,spots,radius=3.6,windows=null)=>Object.freeze({id,name,description,hours,cost,effects:Object.freeze({...effects}),spots:Object.freeze(spots.map(spot=>Object.freeze({...spot}))),radius,windows:windows?Object.freeze(windows.map(window=>Object.freeze([...window]))):null});
export const CITY_PUBLIC_ACTIVITIES=Object.freeze([
  publicActivity('plaza_rest',label('워터프런트 벤치에서 쉬기','REST AT THE WATERFRONT BENCH'),label('바다와 광장을 바라보며 잠시 쉬어 갑니다.','Pause beside the water and recover while the city moves around you.'),.35,0,{energy:8,mood:6,hunger:-1},[{x:505,z:423.7},{x:529,z:423.7},{x:579,z:423.7},{x:605,z:437.5}],3.5),
  publicActivity('plaza_performance',label('거리 공연 감상과 팁','WATCH THE STREET SET & TIP'),label('광장 연주자의 라이브 세트를 감상하고 100 CR의 팁을 건넵니다.','Enjoy the square musician\'s live set and leave a 100 CR tip.'),.4,100,{mood:13,energy:2,hunger:-2},[{x:606,z:425.3}],6,[[11,14],[18,23]]),
  publicActivity('plaza_view',label('전망경으로 바다 보기','USE THE HARBOR VIEWFINDER'),label('전망 부두에서 항로와 먼 섬들을 천천히 살펴봅니다.','Survey the shipping lanes and distant islands from the overlook pier.'),.2,0,{mood:7,energy:2},[{x:560,z:464.2}],3.1),
]);
export function cityPublicActivityStatus(activityId,hour=12){
  const activity=CITY_PUBLIC_ACTIVITIES.find(item=>item.id===activityId);if(!activity)return{available:false,activity:null,nextOpen:null};if(!activity.windows)return{available:true,activity,nextOpen:null};const time=((Number(hour)||0)%24+24)%24,available=activity.windows.some(([opens,closes])=>time>=opens&&time<closes),nextOpen=available?null:activity.windows.map(([opens])=>(opens-time+24)%24||24).sort((a,b)=>a-b)[0];return{available,activity,nextOpen:nextOpen==null?null:(time+nextOpen)%24};
}
const kioskItem=(id,name,cost,hours,effects,description)=>Object.freeze(action(id,name,cost,hours,Object.freeze({...effects}),description));
export const CITY_PLAZA_KIOSKS=Object.freeze([
  Object.freeze({id:'coast-coffee',name:label('코스트 커피','COAST COFFEE'),type:label('워터프런트 커피 스탠드','WATERFRONT COFFEE STAND'),accent:0xffc66f,spot:Object.freeze({x:500,z:399.4}),radius:4,schedule:Object.freeze([6,17]),dailyStock:8,menu:Object.freeze([
    kioskItem('dockside_flat_white',label('도크사이드 플랫화이트','DOCKSIDE FLAT WHITE'),160,.14,{energy:10,mood:5,hunger:3},label('부드러운 로컬 로스트로 잠깐 숨을 고릅니다.','Pause over a smooth local roast beside the harbor.')),
    kioskItem('salted_caramel_cold_brew',label('솔티드 캐러멜 콜드브루','SALTED CARAMEL COLD BREW'),190,.12,{energy:12,mood:6,hunger:2},label('바다 소금을 더한 차가운 시그니처 커피입니다.','A chilled signature coffee finished with coastal salt.')),
    kioskItem('citrus_tonic_coffee',label('시트러스 토닉 커피','CITRUS TONIC COFFEE'),210,.12,{energy:11,mood:8,hunger:2},label('감귤 향과 탄산을 더한 산뜻한 항구 음료입니다.','A bright harbor drink with citrus and tonic.')),
  ])}),
  Object.freeze({id:'tide-goods',name:label('타이드 굿즈','TIDE GOODS'),type:label('항구 생활용품점','HARBOR GOODS KIOSK'),accent:0x74ebff,spot:Object.freeze({x:536,z:399.4}),radius:4,schedule:Object.freeze([8,20]),dailyStock:5,menu:Object.freeze([
    kioskItem('harbor_sun_kit',label('하버 선 케어 키트','HARBOR SUN CARE KIT'),320,.16,{hygiene:7,mood:4},label('긴 항해를 위한 자외선 차단과 보습 키트입니다.','Sun protection and aftercare for a long day offshore.')),
    kioskItem('waterproof_postcards',label('방수 군도 엽서 세트','WATERPROOF ARCHIPELAGO POSTCARDS'),180,.18,{mood:9},label('여행 기록을 남길 수 있는 방수 엽서 세트입니다.','A waterproof postcard set for recording the voyage.')),
    kioskItem('angler_trail_pack',label('앵글러 트레일 팩','ANGLER TRAIL PACK'),260,.16,{energy:5,hunger:10,mood:3},label('부두 산책과 낚시 사이에 먹기 좋은 휴대식입니다.','A compact trail pack for the walk between pier and fishing grounds.')),
  ])}),
  Object.freeze({id:'night-bites',name:label('나이트 바이트','NIGHT BITES'),type:label('야간 길거리 음식','EVENING STREET FOOD'),accent:0xff79d1,spot:Object.freeze({x:572,z:399.4}),radius:4,schedule:Object.freeze([17,1]),dailyStock:6,menu:Object.freeze([
    kioskItem('grilled_mackerel_wrap',label('고등어 숯불 랩','GRILLED MACKEREL WRAP'),420,.28,{hunger:32,energy:5,mood:8},label('숯불 고등어와 채소를 갓 구운 랩에 담았습니다.','Charred mackerel and vegetables folded into a warm wrap.')),
    kioskItem('spicy_squid_cup',label('매콤 오징어 컵','SPICY SQUID CUP'),460,.3,{hunger:36,energy:4,mood:10},label('항구식 매운 소스에 볶은 오징어 야식입니다.','Late-night squid tossed in the harbor stall\'s spicy sauce.')),
    kioskItem('tide_market_noodles',label('타이드 마켓 누들','TIDE MARKET NOODLES'),520,.34,{hunger:43,energy:6,mood:11},label('해산물 육수와 제철 채소를 넣은 따뜻한 국수입니다.','Warm noodles with seafood broth and seasonal vegetables.')),
  ])}),
]);
export function cityPlazaKioskOffer(kioskId,day=1){const kiosk=CITY_PLAZA_KIOSKS.find(item=>item.id===kioskId);if(!kiosk)return null;return kiosk.menu[(Math.max(1,Math.floor(Number(day)||1))-1)%kiosk.menu.length]}
export function cityPlazaKioskStatus(kioskId,hour=12,day=1,remaining){
  const kiosk=CITY_PLAZA_KIOSKS.find(item=>item.id===kioskId);if(!kiosk)return{open:false,kiosk:null,offer:null,nextOpen:null,remaining:0,soldOut:true};const [opens,closes]=kiosk.schedule,time=((Number(hour)||0)%24+24)%24,open=closes>opens?time>=opens&&time<closes:time>=opens||time<closes,nextOpen=open?null:(time+(opens-time+24)%24)%24,stock=Number.isFinite(Number(remaining))?Math.max(0,Math.floor(Number(remaining))):kiosk.dailyStock;return{kiosk,offer:cityPlazaKioskOffer(kioskId,day),open,opens,closes,nextOpen,remaining:stock,soldOut:stock<=0};
}
export const CITY_TRANSIT=Object.freeze({id:'coast-shuttle',name:label('코스트 셔틀','COAST SHUTTLE'),type:label('해안 순환 대중교통','COASTAL PUBLIC TRANSIT'),accent:0x5fd9ff,fare:120,serviceStart:6,lastDeparture:22.5,headway:.5});
export const CITY_TRANSIT_STOPS=Object.freeze([
  Object.freeze({id:'coast-market-stop',name:label('코스트 마켓','COAST MARKET'),spot:Object.freeze({x:97,z:435.5}),arrival:Object.freeze({x:97,z:432.8,heading:Math.PI/2}),travelHours:.18}),
  Object.freeze({id:'auction-stop',name:label('어시장·은행','FISH AUCTION · BANK'),spot:Object.freeze({x:335,z:435.5}),arrival:Object.freeze({x:335,z:432.8,heading:Math.PI/2}),travelHours:.12}),
  Object.freeze({id:'tidal-square-stop',name:label('타이달 광장','TIDAL SQUARE'),spot:Object.freeze({x:480,z:435.5}),arrival:Object.freeze({x:480,z:432.8,heading:-Math.PI/2}),travelHours:.24}),
]);
export function cityTransitStatus(stopId,hour=12){
  const index=CITY_TRANSIT_STOPS.findIndex(stop=>stop.id===stopId),stop=CITY_TRANSIT_STOPS[index],destination=index>=0?CITY_TRANSIT_STOPS[(index+1)%CITY_TRANSIT_STOPS.length]:null,time=((Number(hour)||0)%24+24)%24;if(!stop)return{available:false,stop:null,destination:null,nextDeparture:null,nextService:CITY_TRANSIT.serviceStart,waitHours:null,travelHours:null};const {serviceStart,lastDeparture,headway}=CITY_TRANSIT;let nextDeparture=null;if(time>=serviceStart&&time<=lastDeparture){const slot=Math.max(0,Math.ceil((time-serviceStart-.02)/headway)),candidate=serviceStart+slot*headway;if(candidate<=lastDeparture)nextDeparture=candidate}const available=nextDeparture!=null,waitHours=available?Math.max(0,nextDeparture-time):null,nextService=available?nextDeparture:serviceStart;return{available,stop,destination,nextDeparture,nextService,waitHours,travelHours:stop.travelHours,fare:CITY_TRANSIT.fare};
}
export function cityTransitVehiclePosition(hour=12){const time=((Number(hour)||0)%24+24)%24,operating=time>=CITY_TRANSIT.serviceStart&&time<=CITY_TRANSIT.lastDeparture+.35,cycle=((time-CITY_TRANSIT.serviceStart)%1+1)%1,eastbound=cycle<.5,travel=eastbound?cycle*2:(cycle-.5)*2,x=eastbound?72+(510-72)*travel:510+(72-510)*travel;return{x,z:GOLDEN_CITY.roadZ+(eastbound?6.2:-6.2),heading:eastbound?0:Math.PI,eastbound,operating}}
const circleCollider=(id,x,z,radius)=>Object.freeze({id,shape:'circle',x,z,radius});
const boxCollider=(id,x,z,halfX,halfZ)=>Object.freeze({id,shape:'box',x,z,halfX,halfZ});
const CITY_STREET_LAMP_POSITIONS=Object.freeze([
  ...Array.from({length:9},(_,index)=>Object.freeze({x:34+index*54,z:GOLDEN_CITY.roadZ-19.7})),
  ...Array.from({length:7},(_,index)=>Object.freeze({x:47+index*62,z:GOLDEN_CITY.roadZ+23.3})),
]);
const CITY_SIGNAL_CROSSWALKS=Object.freeze([Object.freeze({id:'market-crossing',x:142,z:GOLDEN_CITY.roadZ}),Object.freeze({id:'marina-crossing',x:358,z:GOLDEN_CITY.roadZ})]);
const streetColliders=[
  ...CITY_FACILITIES.flatMap(facility=>[-1,1].map(side=>circleCollider(`${facility.id}-planter-${side<0?'left':'right'}`,facility.exterior.x+side*6.25,facility.exterior.z+1.32,.82))),
  ...CITY_FACILITIES.flatMap(facility=>[-1,1].map(side=>circleCollider(`${facility.id}-bollard-${side<0?'left':'right'}`,facility.exterior.x+side*7.25,facility.exterior.z+2.6,.24))),
  ...Array.from({length:8},(_,index)=>circleCollider(`street-tree-${index}`,GOLDEN_CITY.centerX-218+index*62,GOLDEN_CITY.roadZ-27,.62)),
  ...Array.from({length:8},(_,index)=>circleCollider(`street-planter-${index}`,GOLDEN_CITY.centerX-210+index*60,GOLDEN_CITY.roadZ-27,1.32)),
  ...Array.from({length:4},(_,index)=>boxCollider(`promenade-bench-${index}`,GOLDEN_CITY.centerX-196+index*124,GOLDEN_CITY.roadZ+26,2.35,.82)),
  ...Array.from({length:6},(_,index)=>circleCollider(`marina-cafe-table-${index}`,GOLDEN_CITY.centerX-160+index*64,GOLDEN_CITY.roadZ+24.5,1.42)),
  ...Array.from({length:7},(_,index)=>circleCollider(`quay-bin-${index}`,GOLDEN_CITY.centerX-205+index*68,GOLDEN_CITY.roadZ+24,.68)),
  ...Array.from({length:7},(_,index)=>boxCollider(`street-litter-bin-${index}`,GOLDEN_CITY.centerX-204+index*68,GOLDEN_CITY.roadZ+(index%2?26.4:-26.2),.7,.62)),
  ...Array.from({length:4},(_,index)=>circleCollider(`fire-hydrant-${index}`,GOLDEN_CITY.centerX-170+index*112,GOLDEN_CITY.roadZ-25.7,.46)),
  ...Array.from({length:5},(_,index)=>boxCollider(`utility-cabinet-${index}`,GOLDEN_CITY.centerX-192+index*96,GOLDEN_CITY.roadZ+27.2,.82,.55)),
  ...Array.from({length:10},(_,index)=>circleCollider(`safety-cone-${index}`,GOLDEN_CITY.centerX-62+index*2.7,GOLDEN_CITY.roadZ+10.6+index*.38,.43)),
  ...CITY_PARKING_COLLIDER_SPOTS.map(spot=>boxCollider('parked-vehicle-'+spot.id,spot.x,spot.z,3.35,1.82)),
  circleCollider('plaza-sculpture',552,417,6.4),
  circleCollider('plaza-performance-stage',606,420,4.5),
  ...[[500,394],[536,394],[572,394]].map(([x,z],index)=>boxCollider(`plaza-kiosk-${index}`,x,z,4.2,2.8)),
  ...CITY_TRANSIT_STOPS.map((stop,index)=>boxCollider(`transit-shelter-${index}`,stop.spot.x,439.1,3.8,.42)),
  ...[[492,438],[518,438],[586,438],[614,438]].map(([x,z],index)=>circleCollider(`plaza-planter-${index}`,x,z,1.55)),
  ...[[505,426],[529,426],[579,426],[605,440]].map(([x,z],index)=>boxCollider(`plaza-bench-${index}`,x,z,2.4,.78)),
  ...[[488,404],[516,446],[548,446],[580,446],[620,404]].map(([x,z],index)=>circleCollider(`plaza-lamp-${index}`,x,z,.38)),
  circleCollider('plaza-viewfinder',560,466,.58),
  ...CITY_STREET_LAMP_POSITIONS.map((position,index)=>circleCollider(`street-lamp-${index}`,position.x,position.z,.34)),
  ...CITY_SIGNAL_CROSSWALKS.flatMap(crossing=>[-1,1].map(direction=>circleCollider(`traffic-signal-${crossing.id}-${direction<0?'west':'east'}`,crossing.x-direction*5.4,GOLDEN_CITY.roadZ+(direction>0?20.5:-20.5),.36))),
];
export const CITY_STREET_COLLIDERS=Object.freeze(streetColliders);
const CITY_CAMERA_COLLIDERS=Object.freeze(CITY_STREET_COLLIDERS.filter(collider=>/planter|street-tree|street-lamp|traffic-signal|marina-cafe-table|utility-cabinet|parked-vehicle|plaza-(?:sculpture|kiosk|stage|lamp|viewfinder)/.test(collider.id)));
const INTERIOR_COLLIDER_LAYOUTS=Object.freeze({
  'marina-workshop':[['lift','box',-3,-2.2,4.8,2.9],['bench','box',5,-7.7,5.8,1.3],...[-7,-3.5,0,3.5,7].map((x,index)=>[`tool-${index}`,'circle',x,3.5,.68]),['rack-left','box',-10,-7.2,1.9,.9],['rack-right','box',10,-7.2,1.9,.9]],
  home:[['bed','box',-8,-5.1,3.3,2.45],['sofa','box',6,-4.8,2.8,1.45],['tv-console','box',6,1.8,2.8,.75],['kitchen','box',-6,2.1,3.8,1.15]],
  grocery:[...[-8.3,-4.5,-.7].map((z,index)=>[`shelf-${index}`,'box',0,z,5.8,.86]),['counter','box',7,5.4,4.4,1.3]],
  restaurant:[['counter','box',0,-7.4,6.4,1.5],...[-6,6].flatMap(x=>[-1,4].map((z,index)=>[`table-${x<0?'left':'right'}-${index}`,'circle',x,z,2.2]))],
  'harbor-office':[['dispatch-desk','box',0,5.2,6.4,1.14],['chart-table','box',0,-1.5,4.4,3],['locker-left','box',-10,-7.5,1.9,.9],['locker-right','box',10,-7.5,1.9,.9]],
  bank:[['teller-counter','box',0,-5.8,8.9,1.5],['atm-left','box',-8,3,1.35,.9],['atm-right','box',8,3,1.35,.9]],
  'fish-market':[['auction-counter','box',0,5.1,9.4,1.18],...[-8,-4,0,4,8].map((x,index)=>[`cold-crate-${index}`,'box',x,-3.4,1.8,1.55]),['ice-chest-left','box',-7,1,2.3,1.8],['ice-chest-right','box',7,1,2.3,1.8]],
  nightlife:[['bar','box',7,5.2,6,1.35],['speaker-left','box',-9,-7.4,1.3,1.15],['speaker-right','box',9,-7.4,1.3,1.15]],
  gym:[...[-6,6].flatMap(x=>[-4,2].map((z,index)=>[`treadmill-${x<0?'left':'right'}-${index}`,'box',x,z,1.8,2.9])),['weight-rack','box',0,-8,4.4,.9]],
});
const interiorColliderEntries=CITY_FACILITIES.map(facility=>{
  const colliders=[
    circleCollider(`${facility.id}-interior-planter-left`,facility.interior.x-11.5,facility.interior.z+7.8,.82),
    circleCollider(`${facility.id}-interior-planter-right`,facility.interior.x+11.5,facility.interior.z+7.8,.82),
    ...(INTERIOR_COLLIDER_LAYOUTS[facility.id]||[]).map(([id,shape,x,z,a,b])=>shape==='circle'?circleCollider(`${facility.id}-${id}`,facility.interior.x+x,facility.interior.z+z,a):boxCollider(`${facility.id}-${id}`,facility.interior.x+x,facility.interior.z+z,a,b)),
  ];
  return[facility.id,Object.freeze(colliders)];
});
export const CITY_INTERIOR_COLLIDERS=Object.freeze(Object.fromEntries(interiorColliderEntries));
export const CITY_INTERIOR_CAMERA_COLLIDERS=Object.freeze(Object.fromEntries(Object.entries(CITY_INTERIOR_COLLIDERS).map(([facilityId,colliders])=>[facilityId,Object.freeze(colliders.filter(collider=>/lift|bench|rack|shelf|counter|kitchen|console|desk|locker|atm|speaker|bar/.test(collider.id)))])));
function colliderAt(position,radius=.42,colliders=CITY_STREET_COLLIDERS){
  for(const collider of colliders){
    if(collider.shape==='circle'&&Math.hypot(position.x-collider.x,position.z-collider.z)<collider.radius+radius)return collider;
    if(collider.shape==='box'&&Math.abs(position.x-collider.x)<collider.halfX+radius&&Math.abs(position.z-collider.z)<collider.halfZ+radius)return collider;
  }
  return null;
}

export class CityLifeDirector{
  constructor(saved){
    this.mode='water';this.facilityId=null;this.parkedCraft=null;this.lastExterior={...CITY_DOCK.shore};
    this.profile={energy:88,hunger:82,mood:76,hygiene:92,bankBalance:5000,bankLedger:[],pantryMeals:0,kioskInventory:{day:1,stock:Object.fromEntries(CITY_PLAZA_KIOSKS.map(kiosk=>[kiosk.id,kiosk.dailyStock]))},kioskPurchases:{},transit:{rides:0,paid:0,lastRoute:null},arcade:{plays:0,highScore:0,totalRewards:0,dailyBest:{}},nightlifeRhythm:{plays:0,highScore:0,totalRewards:0,totalPerfects:0,dailyBest:{}},worldHour:15.5,day:1,visits:{},activities:{},lifestyleEffects:[]};
    this.restore(saved);
  }
  restore(saved){
    if(!saved||typeof saved!=='object')return this.serialize();
    const source=saved.profile||saved;
    for(const key of['energy','hunger','mood','hygiene'])if(Number.isFinite(source[key]))this.profile[key]=clamp(source[key]);
    for(const key of['bankBalance','worldHour','day'])if(Number.isFinite(source[key]))this.profile[key]=Math.max(0,source[key]);if(Number.isFinite(source.pantryMeals))this.profile.pantryMeals=Math.floor(clamp(source.pantryMeals,0,CITY_PANTRY_CAPACITY));
    this.profile.visits={...(source.visits||{})};this.profile.activities={...(source.activities||{})};this.profile.kioskPurchases={...(source.kioskPurchases||{})};this.profile.transit={rides:Math.max(0,Math.floor(source.transit?.rides)||0),paid:Math.max(0,Math.floor(source.transit?.paid)||0),lastRoute:source.transit?.lastRoute&&typeof source.transit.lastRoute==='object'?{from:String(source.transit.lastRoute.from||''),to:String(source.transit.lastRoute.to||''),day:Math.max(1,Math.floor(source.transit.lastRoute.day)||1),hour:Math.max(0,Number(source.transit.lastRoute.hour)||0)%24}:null};const savedKioskStock=source.kioskInventory?.stock||{};this.profile.kioskInventory={day:Math.max(1,Math.floor(source.kioskInventory?.day)||Math.floor(this.profile.day)||1),stock:Object.fromEntries(CITY_PLAZA_KIOSKS.map(kiosk=>[kiosk.id,Number.isFinite(savedKioskStock[kiosk.id])?Math.floor(clamp(savedKioskStock[kiosk.id],0,kiosk.dailyStock)):kiosk.dailyStock]))};this.profile.bankLedger=(Array.isArray(source.bankLedger)?source.bankLedger:[]).filter(entry=>entry&&typeof entry.type==='string'&&Number.isFinite(entry.amount)&&Number.isFinite(entry.balance)).slice(-24).map(entry=>({type:entry.type,amount:Math.round(entry.amount),balance:Math.max(0,Math.round(entry.balance)),reference:String(entry.reference||'ACCOUNT').slice(0,48),day:Math.max(1,Math.floor(entry.day)||1),hour:Math.max(0,Number(entry.hour)||0)%24}));this.profile.arcade={plays:Math.max(0,Math.floor(source.arcade?.plays)||0),highScore:Math.max(0,Math.floor(source.arcade?.highScore)||0),totalRewards:Math.max(0,Math.floor(source.arcade?.totalRewards)||0),dailyBest:{...(source.arcade?.dailyBest||{})}};this.profile.nightlifeRhythm={plays:Math.max(0,Math.floor(source.nightlifeRhythm?.plays)||0),highScore:Math.max(0,Math.floor(source.nightlifeRhythm?.highScore)||0),totalRewards:Math.max(0,Math.floor(source.nightlifeRhythm?.totalRewards)||0),totalPerfects:Math.max(0,Math.floor(source.nightlifeRhythm?.totalPerfects)||0),dailyBest:{...(source.nightlifeRhythm?.dailyBest||{})}};this.profile.lifestyleEffects=pruneLifestyleEffects(source.lifestyleEffects,lifestyleClock(this.profile));this.ensureKioskInventory();
    return this.serialize();
  }
  serialize(){return{profile:{...this.profile,visits:{...this.profile.visits},activities:{...this.profile.activities},kioskInventory:{day:this.profile.kioskInventory.day,stock:{...this.profile.kioskInventory.stock}},kioskPurchases:{...this.profile.kioskPurchases},transit:{...this.profile.transit,lastRoute:this.profile.transit.lastRoute?{...this.profile.transit.lastRoute}:null},bankLedger:this.profile.bankLedger.map(entry=>({...entry})),arcade:{...this.profile.arcade,dailyBest:{...this.profile.arcade.dailyBest}},nightlifeRhythm:{...this.profile.nightlifeRhythm,dailyBest:{...this.profile.nightlifeRhythm.dailyBest}},lifestyleEffects:this.profile.lifestyleEffects.map(effect=>({...effect}))}}}
  ensureKioskInventory(){const day=Math.max(1,Math.floor(this.profile.day)||1);if(this.profile.kioskInventory?.day!==day)this.profile.kioskInventory={day,stock:Object.fromEntries(CITY_PLAZA_KIOSKS.map(kiosk=>[kiosk.id,kiosk.dailyStock]))};else for(const kiosk of CITY_PLAZA_KIOSKS)if(!Number.isFinite(this.profile.kioskInventory.stock[kiosk.id]))this.profile.kioskInventory.stock[kiosk.id]=kiosk.dailyStock;return this.profile.kioskInventory}
  plazaKioskStatus(kioskId){const inventory=this.ensureKioskInventory();return cityPlazaKioskStatus(kioskId,this.profile.worldHour,this.profile.day,inventory.stock[kioskId])}
  recordBankEntry(type,amount,reference,balance=this.profile.bankBalance){const entry={type,amount:Math.round(amount),balance:Math.max(0,Math.round(balance)),reference:String(reference||'ACCOUNT').slice(0,48),day:Math.max(1,Math.floor(this.profile.day)||1),hour:this.profile.worldHour};this.profile.bankLedger.push(entry);if(this.profile.bankLedger.length>24)this.profile.bankLedger.splice(0,this.profile.bankLedger.length-24);return entry}
  lifestyleBonuses(){const now=lifestyleClock(this.profile);this.profile.lifestyleEffects=pruneLifestyleEffects(this.profile.lifestyleEffects,now);return resolveLifestyleBonuses(this.profile.lifestyleEffects,now)}
  grantLifestyle(actionId){const now=lifestyleClock(this.profile),definition=lifestyleEffectFor(actionId);this.profile.lifestyleEffects=grantLifestyleEffect(actionId,this.profile.lifestyleEffects,now);return definition?this.lifestyleBonuses().active.find(item=>item.actionId===actionId)||null:null}
  tick(dt,{running=false}={}){
    if(this.mode==='water')return;
    const lifestyle=this.lifestyleBonuses();
    this.profile.hunger=clamp(this.profile.hunger-dt*(running?.018:.006)*lifestyle.hungerDrain);
    this.profile.energy=clamp(this.profile.energy-dt*(running?.026:.004)*lifestyle.energyDrain);
    this.profile.hygiene=clamp(this.profile.hygiene-dt*(running?.012:.002));
    if(this.profile.hunger<18||this.profile.energy<14)this.profile.mood=clamp(this.profile.mood-dt*.009);
  }
  tickClock(dt){
    const total=this.profile.worldHour+Math.max(0,dt)/90,days=Math.floor(total/24);this.profile.worldHour=total%24;this.profile.day+=days;
    this.ensureKioskInventory();this.lifestyleBonuses();
  }
  advance(hours){
    const lifestyle=this.lifestyleBonuses(),before=this.profile.worldHour,total=before+Math.max(0,hours);this.profile.day+=Math.floor(total/24);this.profile.worldHour=total%24;
    this.profile.hunger=clamp(this.profile.hunger-hours*1.25*lifestyle.hungerDrain);this.profile.energy=clamp(this.profile.energy-hours*.35*lifestyle.energyDrain);this.profile.hygiene=clamp(this.profile.hygiene-hours*.22);this.ensureKioskInventory();this.lifestyleBonuses();
  }
  socialize(npcId,{mood=3,hours=.08}={}){
    this.advance(hours);this.profile.mood=clamp(this.profile.mood+mood);const key=`socialize:${npcId}`;this.profile.activities[key]=(this.profile.activities[key]||0)+1;return{ok:true,npcId,profile:this.serialize().profile};
  }
  applyRoutine({hours=0,effects={},activityId='routine'}={}){this.advance(hours);for(const [key,value] of Object.entries(effects))if(['energy','hunger','mood','hygiene'].includes(key))this.profile[key]=clamp(this.profile[key]+value);this.profile.activities[activityId]=(this.profile.activities[activityId]||0)+1;return this.serialize().profile}
  performPublicActivity(activityId,wallet=0){
    const status=cityPublicActivityStatus(activityId,this.profile.worldHour),activity=status.activity,balance=Math.max(0,Math.floor(wallet));if(this.mode!=='foot'||!activity)return{ok:false,reason:'activity',wallet:balance};if(!status.available)return{ok:false,reason:'schedule',activity,status,wallet:balance};if(balance<activity.cost)return{ok:false,reason:'wallet',activity,wallet:balance};const before={...this.profile},nextWallet=balance-activity.cost;this.advance(activity.hours);for(const [key,value] of Object.entries(activity.effects))if(['energy','hunger','mood','hygiene'].includes(key))this.profile[key]=clamp(this.profile[key]+value);this.profile.activities[activity.id]=(this.profile.activities[activity.id]||0)+1;const item=action(activity.id,activity.name,activity.cost,activity.hours,{...activity.effects},activity.description);return{ok:true,facility:CITY_PUBLIC_SPACE,activity,action:item,wallet:nextWallet,bankBalance:this.profile.bankBalance,bankDebit:0,paymentSource:activity.cost?'wallet':'free',standardCost:activity.cost,savings:0,lifestyleEffect:null,profile:this.serialize().profile,before};
  }
  purchasePlazaKiosk(kioskId,wallet=0){
    const balance=Math.max(0,Math.floor(wallet));if(this.mode!=='foot')return{ok:false,reason:'mode',wallet:balance};const status=this.plazaKioskStatus(kioskId),kiosk=status.kiosk,item=status.offer;if(!kiosk||!item)return{ok:false,reason:'kiosk',wallet:balance};if(!status.open)return{ok:false,reason:'schedule',kiosk,item,status,wallet:balance};if(status.soldOut)return{ok:false,reason:'stock',kiosk,item,status,wallet:balance};let nextWallet=balance,bank=this.profile.bankBalance;if(nextWallet+bank<item.cost)return{ok:false,reason:'funds',kiosk,item,status,wallet:balance,bankBalance:bank};const before={...this.profile},walletDebit=Math.min(nextWallet,item.cost),bankDebit=item.cost-walletDebit;nextWallet-=walletDebit;bank-=bankDebit;const paymentSource=bankDebit>0?(walletDebit>0?'split':'bank'):'wallet';this.profile.bankBalance=bank;if(bankDebit>0)this.recordBankEntry('card',-bankDebit,item.name.en,bank);this.profile.kioskInventory.stock[kiosk.id]=Math.max(0,status.remaining-1);this.advance(item.hours);for(const [key,value] of Object.entries(item.effects||{}))if(['energy','hunger','mood','hygiene'].includes(key))this.profile[key]=clamp(this.profile[key]+value);this.profile.activities[item.id]=(this.profile.activities[item.id]||0)+1;this.profile.kioskPurchases[kiosk.id]=(this.profile.kioskPurchases[kiosk.id]||0)+1;const remaining=this.profile.kioskInventory.stock[kiosk.id]??kiosk.dailyStock;return{ok:true,facility:kiosk,kiosk,action:item,offer:item,wallet:nextWallet,bankBalance:bank,bankDebit,paymentSource,standardCost:item.cost,savings:0,remaining,lifestyleEffect:null,profile:this.serialize().profile,before};
  }
  rideCityTransit(stopId,wallet=0){
    const balance=Math.max(0,Math.floor(wallet)),status=cityTransitStatus(stopId,this.profile.worldHour);if(this.mode!=='foot')return{ok:false,reason:'mode',wallet:balance};if(!status.stop)return{ok:false,reason:'stop',wallet:balance};if(!status.available)return{ok:false,reason:'schedule',status,wallet:balance};const fare=CITY_TRANSIT.fare,bankBefore=this.profile.bankBalance;if(balance+bankBefore<fare)return{ok:false,reason:'funds',status,wallet:balance,bankBalance:bankBefore};let nextWallet=balance,bank=bankBefore;const walletDebit=Math.min(nextWallet,fare),bankDebit=fare-walletDebit;nextWallet-=walletDebit;bank-=bankDebit;const paymentSource=bankDebit>0?(walletDebit>0?'split':'bank'):'wallet',before={...this.profile},elapsed=status.waitHours+status.travelHours;this.profile.bankBalance=bank;if(bankDebit>0)this.recordBankEntry('transit',-bankDebit,`COAST SHUTTLE · ${status.destination.name.en}`,bank);this.advance(elapsed);this.profile.energy=clamp(this.profile.energy+3);this.profile.mood=clamp(this.profile.mood+2);this.profile.activities.coast_shuttle=(this.profile.activities.coast_shuttle||0)+1;this.profile.transit.rides++;this.profile.transit.paid+=fare;this.profile.transit.lastRoute={from:status.stop.id,to:status.destination.id,day:this.profile.day,hour:this.profile.worldHour};const item=action('coast_shuttle',label(`${status.destination.name.ko}(으)로 셔틀 타기`,`RIDE TO ${status.destination.name.en}`),fare,elapsed,{energy:3,mood:2},label('다음 코스트 셔틀을 기다린 뒤 해안 순환 노선으로 이동합니다.','Wait for the next Coast Shuttle and ride the coastal loop.'));return{ok:true,facility:CITY_TRANSIT,transit:status,action:item,wallet:nextWallet,bankBalance:bank,bankDebit,paymentSource,standardCost:fare,savings:0,lifestyleEffect:null,position:{...status.destination.arrival},profile:this.serialize().profile,before};
  }
  waitAtHome(mode='hour',wallet=0){
    const facility=this.currentFacility();if(this.mode!=='interior'||facility?.id!=='home')return{ok:false,reason:'home',wallet};const targets={morning:7,evening:18},target=targets[mode],hours=mode==='hour'?1:(target-this.profile.worldHour+24)%24||24,names={hour:label('한 시간 쉬기','REST FOR ONE HOUR'),morning:label('아침까지 기다리기','WAIT UNTIL MORNING'),evening:label('저녁까지 기다리기','WAIT UNTIL EVENING')},descriptions={hour:label('집에서 잠시 쉬며 한 시간을 보냅니다.','Spend a quiet hour resting at home.'),morning:label('다가오는 오전 7시까지 집에서 쉽니다.','Rest at home until the upcoming 07:00.'),evening:label('다가오는 오후 6시까지 집에서 쉽니다.','Rest at home until the upcoming 18:00.')},before={...this.profile};this.advance(hours);this.profile.energy=clamp(this.profile.energy+Math.min(14,hours*1.2));this.profile.mood=clamp(this.profile.mood+Math.min(8,hours*.6));const id=`wait_${mode}`,item=action(id,names[mode],0,hours,{energy:this.profile.energy-before.energy,hunger:this.profile.hunger-before.hunger,mood:this.profile.mood-before.mood,hygiene:this.profile.hygiene-before.hygiene},descriptions[mode]);this.profile.activities[id]=(this.profile.activities[id]||0)+1;return{ok:true,facility,action:item,wallet:Math.max(0,Math.floor(wallet)),bankBalance:this.profile.bankBalance,profile:this.serialize().profile};
  }
  canDisembark({x,z,speed=0}){return this.mode==='water'&&distance({x,z},CITY_DOCK.water)<=CITY_DOCK.disembarkRadius&&Math.abs(speed)<4}
  disembark({x,z,heading=0,speed=0}){
    if(!this.canDisembark({x,z,speed}))return{ok:false,reason:'dock'};
    const shore={...CITY_DOCK.shore},berth={...CITY_DOCK.berth};
    this.mode='foot';this.parkedCraft=berth;this.facilityId=null;this.lastExterior=shore;
    return{ok:true,position:{...shore},heading:Math.PI};
  }
  canBoard(position){return this.mode==='foot'&&this.parkedCraft&&distance(position,this.lastExterior)<=CITY_DOCK.boardRadius}
  board(position){
    if(!this.canBoard(position))return{ok:false,reason:'craft-distance'};
    const parked={...this.parkedCraft};this.mode='water';this.facilityId=null;this.parkedCraft=null;return{ok:true,parked};
  }
  enter(id){
    const facility=facilityById(id),status=facilityOperatingStatus(id,this.profile.worldHour);if(this.mode!=='foot'||!facility)return{ok:false};if(!status.open)return{ok:false,reason:'closed',facility,status};
    this.mode='interior';this.facilityId=id;this.lastExterior={x:facility.exterior.x,z:facility.exterior.z+4.8};
    this.profile.visits[id]=(this.profile.visits[id]||0)+1;
    return{ok:true,facility,position:{x:facility.interior.x,z:facility.interior.z+6.8},heading:Math.PI};
  }
  leave(){
    const facility=facilityById(this.facilityId);if(this.mode!=='interior'||!facility)return{ok:false};
    this.mode='foot';this.facilityId=null;return{ok:true,position:{...this.lastExterior},heading:0};
  }
  currentFacility(){return facilityById(this.facilityId)}
  venueProgram(id=this.facilityId){return cityVenueProgram(id,this.profile.day)}
  quoteAction(actionId){const facility=this.currentFacility(),item=facility?.actions.find(candidate=>candidate.id===actionId);return cityVenueActionQuote(facility?.id,item,this.profile.day)}
  facilityStatus(id){return facilityOperatingStatus(id,this.profile.worldHour)}
  facilityGuide(position,heading=0){
    if(this.mode!=='foot'||!position)return null;const nearest=CITY_FACILITIES.map(facility=>({facility,status:this.facilityStatus(facility.id),distance:distance(position,facility.exterior)})).sort((a,b)=>a.distance-b.distance)[0];if(!nearest)return null;const dx=nearest.facility.exterior.x-position.x,dz=nearest.facility.exterior.z-position.z,bearing=Math.atan2(dx,dz),delta=((bearing-heading+Math.PI*3)%(Math.PI*2))-Math.PI,index=(Math.round(delta/(Math.PI/4))+8)%8,arrows=['↑','↗','→','↘','↓','↙','←','↖'],directions=['ahead','ahead-right','right','behind-right','behind','behind-left','left','ahead-left'];return{...nearest,bearing,relativeAngle:delta,direction:directions[index],arrow:arrows[index]};
  }
  servicePerson(){
    const facility=this.currentFacility(),actors=CITY_INTERIOR_PEOPLE[facility?.id]||[],actor=actors.find(person=>person.kind==='staff')||actors[0];if(!facility||!actor)return null;const lines=CITY_SERVICE_DIALOGUE[actor.role]||[label('필요한 서비스를 안내해 드릴게요.','I can guide you through the available services.')],count=this.profile.activities[`service-talk:${actor.name}`]||0;return{facility,actor,line:lines[Math.max(0,count-1)%lines.length],conversation:count};
  }
  talkService(){
    const service=this.servicePerson();if(this.mode!=='interior'||!service)return{ok:false,reason:'service'};const lines=CITY_SERVICE_DIALOGUE[service.actor.role]||[service.line],key=`service-talk:${service.actor.name}`,count=this.profile.activities[key]||0;this.profile.activities[key]=count+1;return{ok:true,facility:service.facility,actor:service.actor,line:lines[count%lines.length],conversation:count+1};
  }
  bounds(){
    if(this.mode==='interior'){const origin=this.currentFacility()?.interior||{x:0,z:0};return{minX:origin.x-12.7,maxX:origin.x+12.7,minZ:origin.z-9.4,maxZ:origin.z+9.4,y:.46}}
    return{minX:-35,maxX:630,minZ:379.5,maxZ:476,y:1.03};
  }
  walkCollisionAt(position,radius=.42){const colliders=this.mode==='foot'?CITY_STREET_COLLIDERS:this.mode==='interior'?CITY_INTERIOR_COLLIDERS[this.facilityId]||[]:[];return colliderAt(position,radius,colliders)}
  resolveWalkMove(from,to,radius=.42){
    const bounds=this.bounds();let bounded={x:clamp(to.x,bounds.minX,bounds.maxX),z:clamp(to.z,bounds.minZ,bounds.maxZ)},boundary=bounded.x!==to.x||bounded.z!==to.z;
    if(this.mode==='water')return{...bounded,collided:boundary,boundary,obstacle:null};
    if(this.mode==='foot'&&!cityFootAreaAt(bounded)){const candidates=[{x:bounded.x,z:clamp(from.z,bounds.minZ,bounds.maxZ)},{x:clamp(from.x,bounds.minX,bounds.maxX),z:bounded.z}].filter(cityFootAreaAt);boundary=true;if(!candidates.length)return{x:clamp(from.x,bounds.minX,bounds.maxX),z:clamp(from.z,bounds.minZ,bounds.maxZ),collided:true,boundary:true,obstacle:{id:'city-walkable-edge',shape:'boundary'}};bounded=candidates.sort((a,b)=>distance(from,b)-distance(from,a))[0]}
    const obstacle=this.walkCollisionAt(bounded,radius);if(!obstacle)return{...bounded,collided:boundary,boundary,obstacle:null};
    const xOnly={x:bounded.x,z:clamp(from.z,bounds.minZ,bounds.maxZ)},zOnly={x:clamp(from.x,bounds.minX,bounds.maxX),z:bounded.z},xBlock=this.mode==='foot'&&!cityFootAreaAt(xOnly)?{id:'city-walkable-edge'}:this.walkCollisionAt(xOnly,radius),zBlock=this.mode==='foot'&&!cityFootAreaAt(zOnly)?{id:'city-walkable-edge'}:this.walkCollisionAt(zOnly,radius),xDistance=xBlock?-1:distance(from,xOnly),zDistance=zBlock?-1:distance(from,zOnly),slide=xDistance>=zDistance?xOnly:zOnly;
    if(xDistance<0&&zDistance<0)return{x:clamp(from.x,bounds.minX,bounds.maxX),z:clamp(from.z,bounds.minZ,bounds.maxZ),collided:true,boundary,obstacle};
    return{...slide,collided:true,boundary,obstacle};
  }
  traceFootCamera(from,to,radius=.22,steps=18){
    if(this.mode==='water')return{x:to.x,z:to.z,collided:false,boundary:false,obstacle:null,space:'water'};
    const colliders=this.mode==='interior'?CITY_INTERIOR_CAMERA_COLLIDERS[this.facilityId]||[]:CITY_CAMERA_COLLIDERS,bounds=this.bounds(),safeBounds={minX:bounds.minX+.45,maxX:bounds.maxX-.45,minZ:bounds.minZ+.45,maxZ:bounds.maxZ-.45},target={x:clamp(to.x,safeBounds.minX,safeBounds.maxX),z:clamp(to.z,safeBounds.minZ,safeBounds.maxZ)},boundary=target.x!==to.x||target.z!==to.z;let safe={x:clamp(from.x,safeBounds.minX,safeBounds.maxX),z:clamp(from.z,safeBounds.minZ,safeBounds.maxZ)};
    for(let index=1;index<=steps;index++){const alpha=index/steps,candidate={x:from.x+(target.x-from.x)*alpha,z:from.z+(target.z-from.z)*alpha},areaObstacle=this.mode==='foot'&&!cityFootAreaAt(candidate)?{id:'city-walkable-edge',shape:'boundary'}:null,obstacle=areaObstacle||colliderAt(candidate,radius,colliders);if(obstacle)return{...safe,collided:true,boundary:boundary||Boolean(areaObstacle),obstacle,space:this.mode};safe=candidate}
    return{...target,collided:boundary,boundary,obstacle:null,space:this.mode};
  }
  contextAt(position){
    if(this.mode==='water')return null;
    if(this.mode==='foot'){
      if(this.canBoard(position))return{kind:'board',distance:distance(position,this.lastExterior)};
      let kioskNearest=null;for(const kiosk of CITY_PLAZA_KIOSKS){const d=distance(position,kiosk.spot);if(d<=kiosk.radius&&(!kioskNearest||d<kioskNearest.distance))kioskNearest={kind:'plaza-kiosk',kiosk,status:this.plazaKioskStatus(kiosk.id),distance:d}}if(kioskNearest)return kioskNearest;
      let publicNearest=null;for(const activity of CITY_PUBLIC_ACTIVITIES)for(const spot of activity.spots){const d=distance(position,spot);if(d<=activity.radius&&(!publicNearest||d<publicNearest.distance)){const status=cityPublicActivityStatus(activity.id,this.profile.worldHour);publicNearest={kind:'public-activity',activity,status,spot,distance:d}}}if(publicNearest)return publicNearest;
      let transitNearest=null;for(const stop of CITY_TRANSIT_STOPS){const d=distance(position,stop.spot);if(d<=4.2&&(!transitNearest||d<transitNearest.distance))transitNearest={kind:'city-transit',stop,status:cityTransitStatus(stop.id,this.profile.worldHour),distance:d}}if(transitNearest)return transitNearest;
      let nearest=null;for(const facility of CITY_FACILITIES){const d=distance(position,facility.exterior),status=this.facilityStatus(facility.id);if(d<5.4&&(!nearest||d<nearest.distance))nearest={kind:status.open?'enter':'closed',facility,status,distance:d}}
      return nearest;
    }
    const facility=this.currentFacility();if(!facility)return null;
    const origin=facility.interior,exit={x:origin.x,z:origin.z+8.8},exitDistance=distance(position,exit);
    if(exitDistance<3.4)return{kind:'exit',facility,distance:exitDistance};
    const spots=facility.actions.map((item,index)=>({kind:'actions',facility,action:item,index,distance:distance(position,{x:origin.x-7.5+index*5,z:origin.z-4.6})})).sort((a,b)=>a.distance-b.distance);
    return spots[0]?.distance<3.5?{kind:'actions',facility,distance:spots[0].distance}:null;
  }
  perform(actionId,wallet=0){
    const facility=this.currentFacility(),quote=this.quoteAction(actionId),item=quote?.item;
    if(!item)return{ok:false,reason:'action',wallet};
    if(actionId==='home_meal'&&this.profile.pantryMeals<1)return{ok:false,reason:'pantry',wallet};
    if(actionId==='groceries'&&this.profile.pantryMeals>CITY_PANTRY_CAPACITY-GROCERY_MEALS)return{ok:false,reason:'pantry-space',wallet};
    let nextWallet=Math.max(0,Math.floor(wallet)),bank=this.profile.bankBalance,bankDebit=0,paymentSource='wallet',ledgerEntry=null;
    const transfer=actionId.match(/^(deposit|withdraw)_(1000|5000)$/);
    if(transfer){
      const amount=Number(transfer[2]);
      if(transfer[1]==='deposit'){if(nextWallet<amount)return{ok:false,reason:'wallet',wallet:nextWallet};nextWallet-=amount;bank+=amount;paymentSource='deposit';ledgerEntry={type:'deposit',amount,reference:item.name.en}}
      else{if(bank<amount)return{ok:false,reason:'bank',wallet:nextWallet};bank-=amount;nextWallet+=amount;paymentSource='withdrawal';ledgerEntry={type:'withdrawal',amount:-amount,reference:item.name.en}}
    }else{
      if(nextWallet+bank<item.cost)return{ok:false,reason:'funds',wallet:nextWallet,bankBalance:bank};
      const walletDebit=Math.min(nextWallet,item.cost);nextWallet-=walletDebit;bankDebit=item.cost-walletDebit;if(bankDebit>0){bank-=bankDebit;paymentSource=walletDebit>0?'split':'bank';ledgerEntry={type:'card',amount:-bankDebit,reference:item.name.en}}
    }
    const elapsed=actionId==='sleep'?((7-this.profile.worldHour+24)%24||24):item.hours;this.profile.bankBalance=bank;if(ledgerEntry)this.recordBankEntry(ledgerEntry.type,ledgerEntry.amount,ledgerEntry.reference,bank);this.advance(elapsed);
    for(const [key,value] of Object.entries(item.effects||{})){
      if(value===100)this.profile[key]=100;else this.profile[key]=clamp(this.profile[key]+value);
    }
    let pantryDelta=0;if(actionId==='groceries'){pantryDelta=GROCERY_MEALS;this.profile.pantryMeals+=pantryDelta}else if(actionId==='home_meal'){pantryDelta=-1;this.profile.pantryMeals--}
    this.profile.activities[actionId]=(this.profile.activities[actionId]||0)+1;const lifestyleEffect=this.grantLifestyle(actionId);
    return{ok:true,facility,action:elapsed===item.hours?item:{...item,hours:elapsed},venueProgram:quote.program,featuredProgram:quote.featured,standardCost:quote.standardCost,savings:quote.savings,wallet:nextWallet,bankBalance:bank,bankDebit,paymentSource,pantryDelta,lifestyleEffect,profile:this.serialize().profile};
  }
  snapshot(){return{mode:this.mode,facilityId:this.facilityId,facility:this.currentFacility(),parkedCraft:this.parkedCraft,lifestyle:this.lifestyleBonuses(),profile:this.serialize().profile}}
}

function physical(color,roughness=.45,metalness=.05,emissive=0){
  return new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.36,clearcoatRoughness:.18,emissive,emissiveIntensity:emissive?1.1:0});
}
function box(parent,name,size,position,material,rotationY=0){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.rotation.y=rotationY;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function cylinder(parent,name,radius,height,position,material,segments=20){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,segments),material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const INTERIOR_PERSON_GEOMETRY=Object.freeze({
  torso:new THREE.CapsuleGeometry(.32,.48,5,10),pelvis:new THREE.CapsuleGeometry(.23,.14,4,9),limb:new THREE.CapsuleGeometry(.078,.46,4,8),head:new THREE.SphereGeometry(.29,16,12),hair:new THREE.SphereGeometry(.305,14,10),neck:new THREE.CylinderGeometry(.1,.12,.18,9),shoe:new THREE.BoxGeometry(.22,.14,.36),
  eye:new THREE.SphereGeometry(.047,10,8),iris:new THREE.SphereGeometry(.025,9,7),brow:new THREE.BoxGeometry(.11,.025,.022),nose:new THREE.SphereGeometry(.043,9,7),lip:new THREE.BoxGeometry(.105,.025,.022),
});
function interiorPersonPart(parent,name,geometry,material,position){
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function interiorFacePart(parent,name,geometry,material,position){
  const mesh=interiorPersonPart(parent,name,geometry,material,position);mesh.castShadow=false;mesh.receiveShadow=false;return mesh;
}
function addInteriorPerson(root,facility,actor,index){
  const group=new THREE.Group();group.name=`facility-person-${facility.id}-${index}`;const staff=actor.kind==='staff',accent=physical(facility.accent,.55,.03),skin=physical([0x8d5524,0xc68642,0xe0ac69,0xf1c27d,0xffdbac][index%5],.78,.01),shirt=staff?accent:physical([0x2c6673,0x8a4d58,0x4e6d4c,0x65558a][index%4],.72,.02),pants=physical([0x17232d,0x29343d,0x453b37][index%3],.82,.02),dark=physical(0x171b1e,.62,.08),eyeWhite=physical(0xf5f2e9,.28,.01),iris=physical([0x355c66,0x5f4935,0x3f6b4f,0x59627c][(index+facility.id.length)%4],.34,.02),lip=physical([0x873d46,0xa45358,0x70404a][index%3],.48,.01);
  const torso=interiorPersonPart(group,'facility-person-torso',INTERIOR_PERSON_GEOMETRY.torso,shirt,[0,1.46,0]);torso.scale.set(1+(index%3)*.035,.94,.86);interiorPersonPart(group,'facility-person-pelvis',INTERIOR_PERSON_GEOMETRY.pelvis,pants,[0,1,0]);interiorPersonPart(group,'facility-person-neck',INTERIOR_PERSON_GEOMETRY.neck,skin,[0,1.97,0]);
  const head=new THREE.Group();head.name='facility-person-head';head.position.y=2.26;interiorPersonPart(head,'facility-person-face',INTERIOR_PERSON_GEOMETRY.head,skin,[0,0,0]);const hair=interiorPersonPart(head,'facility-person-hair',INTERIOR_PERSON_GEOMETRY.hair,dark,[0,.09,0]);hair.scale.set(1.03,.62,1.03);
  const eyes=[interiorFacePart(head,'facility-person-eye-left',INTERIOR_PERSON_GEOMETRY.eye,eyeWhite,[-.08,.05,.267]),interiorFacePart(head,'facility-person-eye-right',INTERIOR_PERSON_GEOMETRY.eye,eyeWhite,[.08,.05,.267])];for(const eye of eyes)eye.scale.set(1.12,.78,.45);
  const irises=[interiorFacePart(head,'facility-person-iris-left',INTERIOR_PERSON_GEOMETRY.iris,iris,[-.08,.05,.303]),interiorFacePart(head,'facility-person-iris-right',INTERIOR_PERSON_GEOMETRY.iris,iris,[.08,.05,.303])];for(const pupil of irises)pupil.scale.set(.9,.88,.42);
  const brows=[interiorFacePart(head,'facility-person-brow-left',INTERIOR_PERSON_GEOMETRY.brow,dark,[-.08,.135,.285]),interiorFacePart(head,'facility-person-brow-right',INTERIOR_PERSON_GEOMETRY.brow,dark,[.08,.135,.285])];brows[0].rotation.z=-.07;brows[1].rotation.z=.07;
  const nose=interiorFacePart(head,'facility-person-nose',INTERIOR_PERSON_GEOMETRY.nose,skin,[0,-.005,.292]);nose.scale.set(.68,1.15,.6);
  const upperLip=interiorFacePart(head,'facility-person-upper-lip',INTERIOR_PERSON_GEOMETRY.lip,lip,[0,-.097,.286]),lowerLip=interiorFacePart(head,'facility-person-lower-lip',INTERIOR_PERSON_GEOMETRY.lip,lip,[0,-.125,.284]);upperLip.scale.set(.92,.72,.62);lowerLip.scale.set(.86,.66,.6);group.add(head);
  const arms=[],legs=[];for(const side of[-1,1]){const arm=new THREE.Group();arm.name=`facility-person-arm-${side<0?'left':'right'}`;arm.position.set(side*.4,1.77,0);interiorPersonPart(arm,'facility-person-upper-arm',INTERIOR_PERSON_GEOMETRY.limb,shirt,[0,-.31,0]);group.add(arm);arms.push(arm);const leg=new THREE.Group();leg.name=`facility-person-leg-${side<0?'left':'right'}`;leg.position.set(side*.18,.99,0);interiorPersonPart(leg,'facility-person-lower-leg',INTERIOR_PERSON_GEOMETRY.limb,pants,[0,-.32,0]);interiorPersonPart(leg,'facility-person-shoe',INTERIOR_PERSON_GEOMETRY.shoe,dark,[0,-.67,.08]);group.add(leg);legs.push(leg)}
  if(staff){interiorPersonPart(group,'facility-staff-badge',new THREE.BoxGeometry(.13,.1,.025),accent,[.2,1.68,.27]);if(['clerk','server','bartender'].includes(actor.role))interiorPersonPart(group,'facility-staff-apron',new THREE.BoxGeometry(.52,.72,.045),dark,[0,1.28,.27])}
  if(['mechanic','auctioneer','trainer'].includes(actor.role)){interiorPersonPart(head,'facility-staff-cap',new THREE.CylinderGeometry(.27,.29,.11,12),dark,[0,.31,0]);interiorPersonPart(head,'facility-staff-cap-brim',new THREE.BoxGeometry(.3,.04,.28),dark,[0,.27,.2])}
  if(actor.role==='mechanic'){const tool=interiorPersonPart(arms[1],'facility-staff-tool',new THREE.CylinderGeometry(.025,.04,.62,7),accent,[0,-.7,.08]);tool.rotation.z=-.22}
  if(actor.role==='auctioneer'){const gavel=interiorPersonPart(arms[1],'facility-staff-gavel',new THREE.CylinderGeometry(.035,.035,.48,7),dark,[0,-.64,.1]);gavel.rotation.z=-.35;interiorPersonPart(arms[1],'facility-staff-gavel-head',new THREE.BoxGeometry(.3,.13,.13),accent,[.08,-.84,.1])}
  if(actor.role==='trainer')interiorPersonPart(group,'facility-staff-whistle',new THREE.TorusGeometry(.07,.016,6,12),accent,[0,1.73,.3]);
  const [dx,dz]=actor.at,baseY=.19,baseZ=facility.interior.z+dz;group.position.set(facility.interior.x+dx,baseY,baseZ);group.rotation.y=actor.heading||0;group.scale.setScalar(.88+(index%3)*.025);group.userData={actor,phase:index*1.73+facility.interior.x*.001,baseY,baseZ,baseHeading:actor.heading||0};root.add(group);return{group,arms,legs,head,torso,actor,face:{eyes,irises,brows,upperLip,lowerLip}};
}
function addInteriorPeople(root,facility){
  const people=(CITY_INTERIOR_PEOPLE[facility.id]||[]).map((actor,index)=>addInteriorPerson(root,facility,actor,index));root.userData.servicePeople=people;root.userData.serviceFacility=facility.id;root.userData.serviceState='staffed';return people;
}
function animateInteriorPeople(root,time,focus=null){
  const people=root.userData.servicePeople||[];let facialActors=0,blinking=0,talkingFaces=0;for(const visual of people){const {group,arms,legs,head,torso,actor,face}=visual,phase=group.userData.phase,pulse=Math.sin(time*2.1+phase),staff=actor.kind==='staff',queue=actor.kind==='queue',dance=root.userData.serviceFacility==='nightlife'&&actor.kind==='guest',training=actor.role==='member',talking=focus?.name===actor.name&&time<focus.until;group.position.y=group.userData.baseY+Math.sin(time*1.35+phase)*.012+(dance?Math.abs(pulse)*.035:0);group.position.z=group.userData.baseZ+(queue?Math.sin(time*.55+phase)*.045:0);group.rotation.y=group.userData.baseHeading+Math.sin(time*.62+phase)*(talking?.02:queue?.025:dance?.12:.045);head.rotation.y=talking?Math.sin(time*1.35+phase)*.04:Math.sin(time*.82+phase)*(staff?.12:.18);head.rotation.x=talking?Math.sin(time*2.4+phase)*.04:staff?-.025+Math.sin(time*1.25+phase)*.018:0;torso.rotation.z=talking?Math.sin(time*1.4+phase)*.015:dance?pulse*.06:Math.sin(time*.9+phase)*.008;
    if(face){facialActors++;const blinkTrigger=Math.max(0,(Math.sin(time*(.67+(phase%1)*.035)+phase*2.31)-.91)/.09),blink=blinkTrigger*blinkTrigger,gazeX=(talking?Math.sin(time*.74+phase)*.18:Math.sin(time*.31+phase)*.32),gazeY=talking?.018+Math.sin(time*.88+phase)*.008:Math.sin(time*.37+phase)*.012,roleEnergy=actor.role==='auctioneer'?1.25:['server','bartender'].includes(actor.role)?1.06:['banker','clerk'].includes(actor.role)?.72:.9,speech=talking?(.18+Math.abs(Math.sin(time*6.4+phase))*roleEnergy):0;if(blink>.18)blinking++;if(talking)talkingFaces++;for(const eye of face.eyes)eye.scale.y=.78*Math.max(.07,1-blink*.94);for(let eyeIndex=0;eyeIndex<face.irises.length;eyeIndex++){const pupil=face.irises[eyeIndex];pupil.position.x=(eyeIndex? .08:-.08)+gazeX*.018;pupil.position.y=.05+gazeY;pupil.scale.y=.88*Math.max(.08,1-blink*.95)}face.brows[0].position.y=.135+(talking?.012+speech*.009:Math.sin(time*.42+phase)*.004);face.brows[1].position.y=.135+(talking?.012+speech*.009:Math.sin(time*.42+phase)*.004);face.brows[0].rotation.z=-.07-(talking?speech*.035:0);face.brows[1].rotation.z=.07+(talking?speech*.035:0);face.upperLip.scale.y=.72+(talking?speech*.08:0);face.lowerLip.position.y=-.125-speech*.025;face.lowerLip.scale.y=.66+speech*.38}
    if(talking){arms[0].rotation.x=-.54+pulse*.16;arms[1].rotation.x=-.2-pulse*.09;arms[0].rotation.z=.18;arms[1].rotation.z=-.08;legs[0].rotation.x=0;legs[1].rotation.x=0}
    else if(training){arms[0].rotation.x=arms[1].rotation.x=-.82+pulse*.36;arms[0].rotation.z=.38;arms[1].rotation.z=-.38;legs[0].rotation.x=pulse*.34;legs[1].rotation.x=-pulse*.34}
    else if(dance){arms[0].rotation.x=-.48+pulse*.28;arms[1].rotation.x=-.38-pulse*.22;arms[0].rotation.z=.32;arms[1].rotation.z=-.32;legs[0].rotation.x=pulse*.18;legs[1].rotation.x=-pulse*.18}
    else{arms[0].rotation.x=staff?-.34+pulse*.11:queue?.06:pulse*.04;arms[1].rotation.x=staff?-.2-pulse*.08:queue?.04:-pulse*.04;arms[0].rotation.z=staff?.08:0;arms[1].rotation.z=staff?-.08:0;legs[0].rotation.x=queue?pulse*.018:0;legs[1].rotation.x=queue?-pulse*.018:0}
  }return{actors:people.length,staff:people.filter(person=>person.actor.kind==='staff').length,queue:people.filter(person=>person.actor.kind==='queue').length,facialActors,blinking,talkingFaces};
}
function signTexture(title,subtitle,accent){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const context=canvas.getContext('2d');
  context.fillStyle='#071119';context.fillRect(0,0,1024,256);context.fillStyle=accent;context.fillRect(0,0,18,256);context.fillRect(0,238,1024,18);
  context.fillStyle='#f4fbff';context.font='900 74px Segoe UI, sans-serif';context.fillText(title,52,112);context.fillStyle=accent;context.font='800 33px Segoe UI, sans-serif';context.fillText(subtitle,54,174);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function venueProgramTexture(facility,day=1){
  const program=cityVenueProgram(facility.id,day);if(!program)return null;const featured=facility.actions.find(item=>item.id===program.actionId),quote=cityVenueActionQuote(facility.id,featured,day),accent=`#${facility.accent.toString(16).padStart(6,'0')}`,canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,1024,0);
  gradient.addColorStop(0,'#060b10');gradient.addColorStop(.58,'#11202a');gradient.addColorStop(1,'#071119');context.fillStyle=gradient;context.fillRect(0,0,1024,128);context.fillStyle=accent;context.fillRect(0,0,12,128);context.fillRect(0,119,1024,9);
  context.fillStyle='#9fb2bc';context.font='800 18px Segoe UI, sans-serif';context.fillText(`TODAY  •  DAY ${Math.max(1,Math.floor(day))}`,32,28,220);context.fillStyle='#f7fbff';context.font='900 39px Segoe UI, sans-serif';context.fillText(program.name.en,32,77,580);
  context.fillStyle=accent;context.font='800 19px Segoe UI, sans-serif';context.fillText(featured?.name?.en||'FEATURED PROGRAM',32,105,650);context.textAlign='right';context.fillStyle='#ffffff';context.font='900 29px Segoe UI, sans-serif';context.fillText(quote?.item?.cost?`${quote.item.cost.toLocaleString('en-US')} CR`:'FEATURED',994,78,250);context.textAlign='left';
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.userData={programId:program.id,day:Math.max(1,Math.floor(day)),facilityId:facility.id};return texture;
}
function addPortalMarker(parent,x,z,accent){
  const material=new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.58,depthWrite:false,toneMapped:false}),ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,.11,10,44),material);
  ring.name='life-portal-marker';ring.position.set(x,1.04,z+1.2);ring.rotation.x=Math.PI/2;ring.userData.baseY=ring.position.y;parent.add(ring);return ring;
}
function addMarinaDock(root){
  const marina=new THREE.Group();marina.name='golden-coast-marina-berth';root.add(marina);const concrete=physical(0x808487,.86,.05),deck=physical(0x826e55,.82,.04),edge=physical(0x30393d,.36,.62),rubber=physical(0x141a1d,.72,.08),ropeMaterial=new THREE.MeshStandardMaterial({color:0xc9b98f,roughness:.92,metalness:0,transparent:true,opacity:.68}),lampMaterial=new THREE.MeshStandardMaterial({color:0xffd79e,roughness:.26,metalness:.02,emissive:0xffb45f,emissiveIntensity:.12}),floating=new THREE.Group();floating.name='marina-floating-finger';marina.add(floating);
  box(marina,'marina-shore-apron',[12,.42,7.5],[CITY_DOCK.shore.x,.81,CITY_DOCK.shore.z+2.8],concrete);for(let index=0;index<11;index++){const z=443.5+index*5.7,panel=box(floating,`marina-deck-panel-${index}`,[6.1,.28,5.45],[CITY_DOCK.shore.x,.73,z],deck);panel.castShadow=index%2===0;for(const side of[-1,1])box(floating,'marina-rub-rail',[.23,.5,5.5],[CITY_DOCK.shore.x+side*3.12,.59,z],rubber)}
  const beacons=[];for(let index=0;index<6;index++){const z=445+index*11.2;for(const side of[-1,1]){cylinder(floating,'marina-pile',.18,4.1,[CITY_DOCK.shore.x+side*3.55,.35,z],edge,12);const bulb=interiorPersonPart(floating,'marina-berth-lamp',new THREE.SphereGeometry(.14,10,8),lampMaterial,[CITY_DOCK.shore.x+side*3.55,2.48,z]);bulb.castShadow=false;const light=new THREE.PointLight(0xffbd72,0,15,2);light.name='marina-berth-light';light.position.copy(bulb.position);light.castShadow=false;floating.add(light);beacons.push({bulb,light,phase:index*.83+(side>0?.4:0)})}}
  for(const z of[449,471,493,504])for(const side of[-1,1]){const cleat=box(floating,'marina-mooring-cleat',[.46,.13,.15],[CITY_DOCK.shore.x+side*2.48,.99,z],edge);cleat.rotation.y=Math.PI/2}
  const ropeCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(CITY_DOCK.shore.x-2.45,1.06,503.8),new THREE.Vector3(CITY_DOCK.shore.x-1.8,.65,505.6),new THREE.Vector3(CITY_DOCK.berth.x-1.05,.88,CITY_DOCK.berth.z)]),rope=new THREE.Mesh(new THREE.TubeGeometry(ropeCurve,18,.035,6,false),ropeMaterial);rope.name='marina-mooring-line';rope.castShadow=false;floating.add(rope);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.075,10,28),new THREE.MeshStandardMaterial({color:0xf3eee0,roughness:.72,metalness:.01}));ring.name='marina-life-ring';ring.position.set(CITY_DOCK.shore.x-3.36,2.1,459);ring.rotation.y=Math.PI/2;floating.add(ring);for(const offset of[-.29,.29])box(ring,'marina-life-ring-band',[.16,.12,.16],[offset,0,0],new THREE.MeshStandardMaterial({color:0xff5b43,roughness:.65}));
  marina.userData={floating,beacons,rope,baseY:floating.position.y,qualityTier:'authored-berth-transition-v1'};return marina;
}
function animateMarinaDock(root,time,focus){
  if(!root)return;const {floating,beacons=[],rope}=root.userData,night=focus?.hour>=18||focus?.hour<6,near=Math.hypot((focus?.x||0)-CITY_DOCK.shore.x,(focus?.z||0)-CITY_DOCK.shore.z)<190;floating.position.y=root.userData.baseY+Math.sin(time*.72)*.035;for(const beacon of beacons){const pulse=.88+Math.sin(time*1.7+beacon.phase)*.12;beacon.bulb.material.emissiveIntensity=night?.72*pulse:.12;beacon.light.intensity=night&&near?3.8*pulse:0}rope.material.opacity=focus?.mode==='foot'||focus?.mode==='interior'?.68:.24;document.body.dataset.marinaBerth=focus?.mode==='foot'?'occupied':focus?.mode==='interior'?'occupied-indoor':'approach';document.body.dataset.marinaDockLights=String(night&&near?beacons.length:0);
}
function addStorefrontArchitecture(group,facility,index){
  const architectureStart=group.children.length,{x,z}=facility.exterior,floors=2+index%3,floorHeight=3.15,upperBase=10.15,upperHeight=floors*floorHeight,roofY=upperBase+upperHeight,setback=.42+(index%2)*.34;
  const wallColors=[0x918b82,0x756f68,0xa09789,0x7d8584,0x8b8177,0x6f777a],wall=physical(wallColors[index%wallColors.length],.9,.015),trim=physical(index%2?0x303b40:0x3d3834,.38,.42),reveal=physical(0x10171b,.58,.16),rail=physical(0x242d31,.3,.62),service=physical(0x687276,.47,.5),roof=physical(0x5d6261,.82,.08),windowPanes=[],roofBeacons=[];
  box(group,'storefront-upper-massing',[14.9,upperHeight,7.4],[x,upperBase+upperHeight/2,z-4.45-setback],wall);
  box(group,'storefront-cornice',[15.7,.38,.72],[x,upperBase+.12,z-.55-setback],trim);
  box(group,'storefront-roof-coping-front',[15.35,.62,.38],[x,roofY+.28,z-.72-setback],trim);box(group,'storefront-roof-coping-rear',[15.35,.62,.34],[x,roofY+.28,z-8.15-setback],trim);
  for(const side of[-1,1])box(group,'storefront-roof-coping-side',[.34,.62,7.15],[x+side*7.5,roofY+.28,z-4.45-setback],trim);
  for(let row=0;row<floors;row++){
    const rowY=upperBase+1.65+row*floorHeight,faceZ=z-.55-setback;
    box(group,'storefront-recessed-window-reveal',[13.65,2.42,.12],[x,rowY,faceZ-.15],reveal);
    for(let column=0;column<3;column++){
      const paneMaterial=new THREE.MeshPhysicalMaterial({color:index%2?0x31505a:0x3e5054,roughness:.12,metalness:.05,transmission:.16,transparent:true,opacity:.82,clearcoat:1,clearcoatRoughness:.08,emissive:index%3===0?0xffc383:0xa9cbe0,emissiveIntensity:.035}),pane=box(group,'storefront-upper-window-pane',[3.72,2.03,.055],[x+(column-1)*4.38,rowY,faceZ+.015],paneMaterial);pane.castShadow=false;windowPanes.push(pane);
    }
    for(const divider of[-6.72,-2.19,2.19,6.72])box(group,'storefront-upper-window-frame',[.14,2.52,.24],[x+divider,rowY,faceZ+.11],trim);
    box(group,'storefront-upper-window-lintel',[13.7,.14,.26],[x,rowY+1.25,faceZ+.11],trim);box(group,'storefront-upper-window-sill',[13.7,.16,.34],[x,rowY-1.25,faceZ+.14],trim);
  }
  const balconyLevel=index%3===2?Math.min(1,floors-1):0,balconyY=upperBase+.44+balconyLevel*floorHeight,balconyZ=z+.18-setback;
  box(group,'storefront-balcony-slab',[11.6,.24,1.75],[x,balconyY,balconyZ],roof);for(const height of[.55,1.15])box(group,'storefront-balcony-rail',[11.35,.08,.08],[x,balconyY+height,balconyZ+.82],rail);for(let post=0;post<9;post++)box(group,'storefront-balcony-baluster',[.07,1.18,.07],[x-5.45+post*1.36,balconyY+.59,balconyZ+.82],rail);for(const side of[-1,1])box(group,'storefront-balcony-side-rail',[.08,1.18,1.55],[x+side*5.68,balconyY+.59,balconyZ],rail);
  let fireEscapeCount=0;if(index%3===1){const levels=Math.min(floors,3);for(let level=0;level<levels;level++){const y=upperBase+.38+level*floorHeight,platformX=x+4.9;box(group,'storefront-fire-escape-platform',[3.35,.18,1.2],[platformX,y,z+.02-setback],rail);box(group,'storefront-fire-escape-guard',[3.35,1.1,.08],[platformX,y+.56,z+.57-setback],rail);for(const side of[-1,1])box(group,'storefront-fire-escape-side-guard',[.08,1.1,1.05],[platformX+side*1.64,y+.56,z+.02-setback],rail);if(level<levels-1){const stair=box(group,'storefront-fire-escape-stair',[4.05,.16,.56],[x+3.35,y+1.6,z+.07-setback],rail);stair.rotation.z=-.66;for(let tread=0;tread<7;tread++){const step=box(group,'storefront-fire-escape-tread',[.62,.08,1.02],[x+1.75+tread*.52,y+.43+tread*.38,z+.07-setback],rail);step.rotation.z=-.03}}fireEscapeCount++}}
  cylinder(group,'storefront-rain-drainpipe',.1,roofY-1.05,[x-6.86,(roofY+1.05)/2,z-.18-setback],service,10);for(const meter of[0,1]){const unit=box(group,'storefront-utility-meter',[.72,.9,.22],[x+6.82,2.3+meter*1.08,z-.28-setback],service);unit.castShadow=false;cylinder(group,'storefront-utility-conduit',.055,1.15,[x+6.82,3.3+meter*1.08,z-.3-setback],service,8)}
  let rooftopEquipment=0;for(let unit=0;unit<2;unit++){const unitX=x-2.8+unit*5.5;box(group,'storefront-rooftop-hvac',[2.25,1.18,1.75],[unitX,roofY+.78,z-3.1-setback],service);for(const slat of[-.62,-.22,.22,.62])box(group,'storefront-rooftop-hvac-slat',[.08,.72,.08],[unitX+slat,roofY+.78,z-2.2-setback],reveal);cylinder(group,'storefront-rooftop-vent',.32,1.25,[unitX,roofY+1.55,z-5.55-setback],service,14);rooftopEquipment+=2}
  if(index%3===0){const tankY=roofY+2.25;cylinder(group,'storefront-rooftop-water-tank',1.28,2.45,[x+3.6,tankY,z-5.45-setback],physical(0x3b4f55,.48,.34),18);for(const side of[-1,1])for(const depth of[-1,1])box(group,'storefront-water-tank-leg',[.13,1.15,.13],[x+3.6+side*.72,roofY+.62,z-5.45-setback+depth*.72],rail);rooftopEquipment+=1}
  const mastX=x+(index%2?2.5:-2.5);cylinder(group,'storefront-rooftop-antenna',.06,3.4,[mastX,roofY+2.15,z-6.7-setback],rail,8);for(const y of[roofY+2.55,roofY+3.2])box(group,'storefront-antenna-crossbar',[1.35,.055,.055],[mastX,y,z-6.7-setback],rail);const dish=cylinder(group,'storefront-rooftop-dish',.44,.13,[mastX+.72,roofY+1.85,z-6.62-setback],service,18);dish.rotation.x=Math.PI/2;dish.rotation.z=.28;rooftopEquipment+=2;
  if(floors===4){const beaconMaterial=physical(0xff493f,.18,.16,0xff2a20),beacon=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),beaconMaterial);beacon.name='storefront-rooftop-safety-beacon';beacon.position.set(mastX,roofY+3.9,z-6.7-setback);beacon.castShadow=false;group.add(beacon);roofBeacons.push(beacon)}
  const architectureNodes=group.children.slice(architectureStart);Object.assign(group.userData,{architectureTier:'layered-coastal-architecture-v1',architectureNodes,architectureWindows:windowPanes,architectureRoofBeacons:roofBeacons,architectureFloors:floors,architectureRooftopEquipment:rooftopEquipment,architectureFireEscapes:fireEscapeCount});return{architectureStart,nodes:architectureNodes};
}
function animateStorefrontArchitecture(group,time,{hour=12,distance=0}={}){
  const nodes=group.userData.architectureNodes||[],windows=group.userData.architectureWindows||[],beacons=group.userData.architectureRoofBeacons||[],visible=distance<460,night=hour>=18.5||hour<6.25,phaseHour=Math.floor((((Number(hour)||0)%24)+24)%24*2);for(const node of nodes)node.visible=visible;let litWindows=0;for(let index=0;index<windows.length;index++){const pane=windows[index],occupied=visible&&night&&(group.userData.detailIndex*7+index*3+phaseHour)%5!==0;pane.material.emissiveIntensity=occupied?.72+Math.sin(time*.8+index*.71)*.08:.035;pane.material.opacity=occupied?.94:.78;if(occupied)litWindows++}for(let index=0;index<beacons.length;index++)beacons[index].material.emissiveIntensity=visible&&night?.8+Math.max(0,Math.sin(time*2.8+index))*.9:.04;return{visible,windows:windows.length,litWindows,rooftopEquipment:group.userData.architectureRooftopEquipment||0,fireEscapes:group.userData.architectureFireEscapes||0};
}
function addStorefrontInfillDistrict(root){
  const district=new THREE.Group();district.name='golden-coast-mixed-use-infill';root.add(district);const blocks=[],cables=[],facadeColors=[0x6e716d,0x82786c,0x6c777a,0x918779],accents=[0xb4674d,0x4f7f7b,0xb49750,0x54748a],cableMaterial=new THREE.MeshStandardMaterial({color:0x151b1e,roughness:.58,metalness:.28});
  for(let index=0;index<CITY_FACILITIES.length-1;index++){
    const left=CITY_FACILITIES[index],right=CITY_FACILITIES[index+1],x=(left.exterior.x+right.exterior.x)/2,z=left.exterior.z,width=30+(index%2)*2,height=16+(index%4)*3.15,floors=Math.max(2,Math.floor((height-6)/3.1)),block=new THREE.Group();block.name='city-infill-block-'+index;block.position.set(x,0,z);district.add(block);
    const wall=physical(facadeColors[index%facadeColors.length],.9,.015),trim=physical(index%2?0x343b3c:0x453f3a,.42,.34),dark=physical(0x10171a,.6,.13),metal=physical(0x4c585b,.38,.52),accent=physical(accents[index%accents.length],.38,.12,accents[index%accents.length]),windowPanes=[];
    box(block,'infill-building-shell',[width,height,10],[0,height/2,-5],wall);box(block,'infill-ground-course',[width+.55,.52,.64],[0,1.12,-.08],trim);box(block,'infill-cornice',[width+.65,.42,.72],[0,5.72,-.12],trim);box(block,'infill-roof-parapet-front',[width+.35,.7,.42],[0,height+.34,-.25],trim);box(block,'infill-roof-parapet-rear',[width+.35,.7,.34],[0,height+.34,-9.72],trim);
    const loadingX=index%2?-width*.27:width*.27;box(block,'infill-loading-bay-reveal',[7.25,4.35,.18],[loadingX,3.25,.02],dark);box(block,'infill-roller-service-door',[6.65,3.72,.12],[loadingX,3.18,.14],metal);for(let slat=0;slat<8;slat++)box(block,'infill-roller-door-slat',[6.5,.055,.05],[loadingX,1.62+slat*.43,.225],trim);box(block,'infill-loading-awning',[7.5,.18,1.6],[loadingX,5.4,.6],accent);box(block,'infill-loading-curb',[7.4,.22,1.65],[loadingX,1.1,.72],physical(0x8b8780,.9,.01));
    const shopX=-loadingX*.82;box(block,'infill-shop-window-reveal',[9.25,3.65,.15],[shopX,3.18,.02],dark);for(const column of[-1,0,1]){const pane=new THREE.MeshPhysicalMaterial({color:0x2e4a50,roughness:.14,metalness:.04,transmission:.14,transparent:true,opacity:.84,clearcoat:.92,emissive:accents[index%accents.length],emissiveIntensity:.08}),window=box(block,'infill-ground-window-pane',[2.65,3.15,.055],[shopX+column*2.95,3.12,.14],pane);window.castShadow=false;windowPanes.push(window)}for(const divider of[-4.48,-1.48,1.48,4.48])box(block,'infill-ground-window-frame',[.12,3.5,.24],[shopX+divider,3.15,.24],trim);box(block,'infill-business-sign-band',[9.8,.72,.24],[shopX,5.35,.2],accent);
    for(let floor=0;floor<floors;floor++){const y=7.15+floor*3.08;if(y>height-1.25)break;box(block,'infill-upper-window-reveal',[width-2.1,2.18,.11],[0,y,-.03],dark);for(let column=0;column<5;column++){const paneMaterial=new THREE.MeshPhysicalMaterial({color:index%2?0x304850:0x3a4a4b,roughness:.15,metalness:.04,transmission:.1,transparent:true,opacity:.8,clearcoat:.82,emissive:index%3===0?0xffc58a:0xb4d2dd,emissiveIntensity:.03}),pane=box(block,'infill-upper-window-pane',[4.55,1.82,.052],[(column-2)*(width-3)/5,y,.08],paneMaterial);pane.castShadow=false;windowPanes.push(pane)}for(let divider=0;divider<6;divider++)box(block,'infill-upper-window-frame',[.12,2.25,.22],[-(width-2.1)/2+divider*(width-2.1)/5,y,.17],trim);box(block,'infill-window-sill',[width-2,.13,.3],[0,y-1.12,.2],trim)}
    const fineStart=block.children.length;for(const side of[-1,1]){box(block,'infill-service-alley-pad',[2.45,.08,9.1],[side*(width/2+1.28),1.02,-4.45],physical(0x5d5c58,.94,.01));box(block,'infill-alley-depth-wall',[2.55,5.6,.18],[side*(width/2+1.28),3.8,-9.05],dark);const dumpster=box(block,'infill-commercial-dumpster',[1.75,1.45,1.25],[side*(width/2+1.2),1.78,-3.15],physical(index%2?0x385749:0x43545c,.68,.22));dumpster.rotation.y=side*.08;box(block,'infill-dumpster-lid',[1.82,.12,1.3],[side*(width/2+1.2),2.55,-3.2],metal);for(let crate=0;crate<3;crate++)box(block,'infill-delivery-crate',[.72,.58,.7],[side*(width/2+1.3)+(crate-1)*.64,1.35+(crate%2)*.58,-5.4],physical(crate%2?0x806448:0x586b5b,.8,.03));cylinder(block,'infill-service-pipe',.07,4.8,[side*(width/2+.5),3.42,-.18],metal,8)}
    const roofUnit=box(block,'infill-rooftop-air-handler',[3.1,1.35,2.15],[index%2?-6:6,height+.92,-4.6],metal);for(const slat of[-.85,-.42,0,.42,.85])box(block,'infill-rooftop-air-slat',[.08,.86,.08],[roofUnit.position.x+slat,height+.92,-3.5],dark);cylinder(block,'infill-rooftop-exhaust',.44,1.55,[index%2?5.2:-5.2,height+1.12,-6.6],metal,16);cylinder(block,'infill-cable-mast',.07,3.2,[index%2?10:-10,height+1.9,-7.1],metal,8);
    const bulbMaterial=new THREE.MeshStandardMaterial({color:0xffd7a0,roughness:.24,metalness:.02,emissive:0xffae58,emissiveIntensity:.08}),serviceBulb=box(block,'infill-service-security-bulb',[.5,.18,.3],[loadingX,5.12,.42],bulbMaterial),serviceLight=new THREE.PointLight(0xffb769,0,18,2);serviceLight.name='infill-service-security-light';serviceLight.position.set(loadingX,4.9,.72);serviceLight.castShadow=false;block.add(serviceLight);
    const fineNodes=block.children.slice(fineStart);block.userData={position:{x,z},height,windowPanes,fineNodes,serviceBulb,serviceLight,index};blocks.push(block);
  }
  for(let index=0;index<blocks.length-1;index++){const from=blocks[index],to=blocks[index+1],start=new THREE.Vector3(from.position.x+(index%2?10:-10),from.userData.height+3.45,from.position.z-7.1),end=new THREE.Vector3(to.position.x+((index+1)%2?10:-10),to.userData.height+3.45,to.position.z-7.1),mid=new THREE.Vector3((start.x+end.x)/2,Math.min(start.y,end.y)-2.2,start.z-.15),curve=new THREE.CatmullRomCurve3([start,mid,end]),wire=new THREE.Mesh(new THREE.TubeGeometry(curve,18,.035,5,false),cableMaterial);wire.name='infill-sagging-utility-cable';wire.castShadow=false;district.add(wire);cables.push(wire)}
  district.userData={blocks,cables,qualityTier:'mixed-use-service-corridor-v1'};return district;
}
function animateStorefrontInfill(root,time,focus){
  const hour=((Number(focus?.hour)||0)%24+24)%24,night=hour>=18.5||hour<6.25;let visibleBlocks=0,visibleFineProps=0,litWindows=0,serviceLights=0;for(const block of root.userData.blocks){const distance=focus?Math.hypot(focus.x-block.userData.position.x,focus.z-block.userData.position.z):0,visible=!focus||distance<520,fineVisible=visible&&(!focus||distance<230);block.visible=visible;if(visible)visibleBlocks++;for(const node of block.userData.fineNodes)node.visible=fineVisible;if(fineVisible)visibleFineProps+=block.userData.fineNodes.length;for(let index=0;index<block.userData.windowPanes.length;index++){const pane=block.userData.windowPanes[index],occupied=visible&&night&&(block.userData.index*11+index*3+Math.floor(hour*2))%6!==0;pane.material.emissiveIntensity=occupied?.5+Math.sin(time*.55+index*.37)*.055:.025;if(occupied)litWindows++}const serviceOn=night&&fineVisible&&distance<125;block.userData.serviceBulb.material.emissiveIntensity=night?.86:.08;block.userData.serviceLight.intensity=serviceOn?4.2:0;if(serviceOn)serviceLights++}const cableVisible=!focus||Math.hypot(focus.x-223,focus.z-379)<600;for(const cable of root.userData.cables)cable.visible=cableVisible;document.body.dataset.cityInfillBlocks=String(visibleBlocks);document.body.dataset.cityInfillFineProps=String(visibleFineProps);document.body.dataset.cityInfillLitWindows=String(litWindows);document.body.dataset.cityInfillServiceLights=String(serviceLights);document.body.dataset.cityUtilityCables=cableVisible?String(root.userData.cables.length):'0';return{visibleBlocks,visibleFineProps,litWindows,serviceLights};
}
function addStorefrontDetail(group,facility,index){
  const detailStart=group.children.length;
  const {x,z}=facility.exterior,accent=physical(facility.accent,.34,.12,facility.accent),metal=physical(0x2b3439,.28,.64),concrete=physical(index%2?0x8c8982:0xa29b90,.88,.02),warm=new THREE.MeshBasicMaterial({color:index%2?0xffd5a1:0xbbeaff,toneMapped:false,transparent:true,opacity:.18}),dark=physical(0x10171b,.62,.16);
  const buildingShell=box(group,'storefront-building-shell',[15.8,10.4,4.6],[x,5.2,z-2.5],concrete);
  box(group,'storefront-upper-band',[16.25,.42,.48],[x,9.85,z-.58],metal);box(group,'storefront-lower-sill',[15.5,.36,.72],[x,1.02,z-.2],metal);
  box(group,'storefront-interior-glow',[10.5,3.05,.08],[x-.9,2.72,z-.78],warm);
  for(const offset of[-4.1,0,4.1])box(group,'storefront-window-mullion',[.13,3.55,.22],[x-1+offset,2.72,z-.39],metal);
  box(group,'storefront-transom',[11,.14,.25],[x-.9,4.35,z-.36],metal);
  box(group,'storefront-pavement-pad',[16.8,.13,4.9],[x,.96,z+2.05],physical(0x88847d,.94,.01));
  box(group,'storefront-entry-mat',[2.5,.045,1.55],[x+4.9,1.04,z+1.1],dark);
  box(group,'storefront-address-plaque',[1.25,.68,.13],[x+6.25,4.22,z-.25],accent);
  const hangingArm=box(group,'storefront-hanging-arm',[1.7,.1,.1],[x-6.6,6.18,z+.55],metal);hangingArm.rotation.z=.05;
  box(group,'storefront-hanging-sign',[1.75,1.42,.13],[x-7.25,5.62,z+.55],accent);
  for(const side of[-1,1]){
    cylinder(group,'storefront-planter',.68,.78,[x+side*6.25,1.42,z+1.32],physical(0x33393b,.72,.16),16);
    const leaves=cylinder(group,'storefront-planter-leaves',.58,1.38,[x+side*6.25,2.12,z+1.32],physical(side<0?0x496b4d:0x3f6453,.9,.01),10);leaves.scale.set(.76,1,.76);
    cylinder(group,'storefront-bollard',.12,1.12,[x+side*7.25,1.54,z+2.6],metal,10);
  }
  const shelfZ=z-.04;
  if(['grocery','fish-market'].includes(facility.id)){
    for(let row=0;row<2;row++)box(group,'storefront-display-shelf',[8.4,.11,.65],[x-1,1.45+row*1.25,shelfZ],metal);
    for(let item=0;item<8;item++)box(group,'storefront-display-crate',[.68,.52,.48],[x-4.4+item*.98,1.78+(item%2)*1.25,z+.02],physical(item%3===0?0xd7a75e:item%3===1?0x6d9b74:0xb96e5d,.72,.02));
  }else if(['restaurant','nightlife'].includes(facility.id)){
    for(const side of[-1,1]){cylinder(group,'storefront-cafe-table',.72,.12,[x-1+side*3.2,1.82,shelfZ],physical(0x77543b,.67,.04),20);cylinder(group,'storefront-table-pedestal',.1,1.42,[x-1+side*3.2,1.43,shelfZ],metal,10)}
    for(const side of[-1,1])box(group,'storefront-chair',[1.15,1.3,.55],[x-1+side*3.2,1.68,z-.45],physical(0x47545b,.78,.02));
  }else if(facility.id==='gym'){
    for(const side of[-1,1]){cylinder(group,'storefront-display-weight',.72,.25,[x-1+side*2.8,2.28,shelfZ],metal,16);cylinder(group,'storefront-display-bar',.12,4.2,[x-1,2.28,shelfZ],metal,10).rotation.z=Math.PI/2}
  }else if(facility.id==='marina-workshop'){
    box(group,'storefront-display-hull',[7.5,1.15,1.6],[x-1,2.08,shelfZ],accent);box(group,'storefront-tool-wall',[8.8,2.7,.16],[x-1,2.8,z-.16],dark);
  }else{
    for(const side of[-1,1]){box(group,'storefront-display-plinth',[2.3,.55,1.15],[x-1+side*3,1.4,shelfZ],dark);cylinder(group,'storefront-display-object',.46,1.5,[x-1+side*3,2.42,shelfZ],accent,14)}
  }
  const vent=box(group,'storefront-air-unit',[2.2,1.05,.58],[x+5.55,8.45,z-.22],metal);for(const offset of[-.55,-.18,.18,.55])box(group,'storefront-air-slat',[.07,.72,.08],[x+5.55+offset,8.45,z+.09],dark);
  const architecture=addStorefrontArchitecture(group,facility,index),nearfieldNodes=group.children.slice(detailStart,architecture.architectureStart).filter(node=>node!==buildingShell);group.userData.detailTier='premium-nearfield-v5';group.userData.detailIndex=index;group.userData.nearfieldNodes=nearfieldNodes;group.userData.architectureNodes=[buildingShell,...architecture.nodes];return vent;
}
function addStorefront(root,facility,index=0){
  const group=new THREE.Group();group.name=`life-storefront-${facility.id}`;const {x,z}=facility.exterior,accent=`#${facility.accent.toString(16).padStart(6,'0')}`;
  addStorefrontDetail(group,facility,index);
  box(group,'storefront-frame',[14.6,5.6,.42],[x,3.52,z-.35],physical(0x172329,.5,.24));
  const glass=box(group,'storefront-glass',[10.8,3.35,.16],[x-.9,2.65,z-.57],new THREE.MeshPhysicalMaterial({color:0x24454e,roughness:.08,metalness:.06,transmission:.18,transparent:true,opacity:.82,clearcoat:1,emissive:facility.accent,emissiveIntensity:.14}));
  box(group,'life-door',[2.3,3.75,.25],[x+4.9,2.22,z-.68],physical(0x10232a,.16,.18,facility.accent));
  box(group,'awning',[15.4,.22,2.05],[x,5.2,z+.35],physical(facility.accent,.34,.1));
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(12.8,3.2),new THREE.MeshBasicMaterial({map:signTexture(facility.name.en,facility.type.en,accent),toneMapped:false}));sign.position.set(x,7.15,z-.08);group.add(sign);
  const programMap=venueProgramTexture(facility,1),programFrame=programMap?box(group,'storefront-program-marquee-frame',[11.55,1.38,.16],[x-.9,5.2,z+1.41],physical(0x111a20,.32,.46)):null,programSign=programMap?new THREE.Mesh(new THREE.PlaneGeometry(11.2,1.18),new THREE.MeshBasicMaterial({map:programMap,toneMapped:false})):null;if(programSign){programSign.name='storefront-daily-program-sign';programSign.position.set(x-.9,5.2,z+1.505);group.add(programSign)}
  const light=new THREE.PointLight(facility.accent,7,16,2);light.name='life-storefront-light';light.position.set(x,5.6,z+1.5);group.add(light);
  group.userData.portal=addPortalMarker(group,x+4.9,z+.2,facility.accent);root.add(group);
  Object.assign(group.userData,{facilityId:facility.id,facilityPosition:{x,z},storefrontLight:light,storefrontSign:sign,storefrontGlass:glass,storefrontProgramFrame:programFrame,storefrontProgramSign:programSign,programDay:programMap?.userData.day||0,programId:programMap?.userData.programId||'',open:true});
}
function actionMarker(root,x,z,accent,index){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1,.085,8,32),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.62,depthWrite:false,toneMapped:false}));
  ring.name='life-action-marker';ring.position.set(x,.51,z);ring.rotation.x=Math.PI/2;ring.userData={phase:index*.7,baseY:.51};root.add(ring);return ring;
}
function interiorWindowTexture(accent,index=0){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,0,384);gradient.addColorStop(0,index%2?'#142a3d':'#1b2840');gradient.addColorStop(.58,'#253b48');gradient.addColorStop(1,'#d49366');context.fillStyle=gradient;context.fillRect(0,0,768,384);
  context.fillStyle='#101b23';for(let building=0;building<15;building++){const width=42+(building%4)*13,height=90+(building*37)%185,x=building*54-16;context.fillRect(x,384-height,width,height);context.fillStyle=building%3===0?accent:'#f5c478';for(let row=0;row<4;row++)for(let col=0;col<2;col++)if((row+col+building)%3)context.fillRect(x+9+col*17,400-height+row*27,7,11);context.fillStyle='#101b23'}
  context.fillStyle='rgba(255,255,255,.16)';context.fillRect(0,315,768,2);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function addInteriorArchitecture(root,facility){
  const {x,z}=facility.interior,index=CITY_FACILITIES.findIndex(item=>item.id===facility.id),accentColor=`#${facility.accent.toString(16).padStart(6,'0')}`,trim=physical(0x343d42,.48,.34),dark=physical(0x141c21,.62,.18),stone=physical(index%2?0x8f8980:0xa19b90,.83,.02),accent=physical(facility.accent,.28,.12),leaf=physical(0x3d6551,.88,.01),glow=new THREE.MeshBasicMaterial({color:facility.accent,toneMapped:false,transparent:true,opacity:.32});
  for(const wallZ of[z-10.48,z+10.2])box(root,'interior-baseboard',[27.1,.24,.18],[x,.58,wallZ],trim);for(const wallX of[x-13.48,x+13.48])box(root,'interior-baseboard',[.18,.24,20.5],[wallX,.58,z],trim);
  for(const side of[-1,1]){box(root,'interior-structural-column',[.62,7.2,.62],[x+side*12.65,4.1,z-7],stone);box(root,'interior-structural-column',[.62,7.2,.62],[x+side*12.65,4.1,z+7],stone)}
  for(const offset of[-8.1,-2.7,2.7,8.1]){box(root,'interior-ceiling-panel',[4.35,.1,1.15],[x+offset,7.72,z],glow);const light=new THREE.PointLight(facility.accent,3.5,12,2);light.name='interior-panel-light';light.position.set(x+offset,7.15,z);root.add(light)}
  const windowMaterial=new THREE.MeshBasicMaterial({map:interiorWindowTexture(accentColor,index),toneMapped:false});for(const side of[-1,1]){const view=new THREE.Mesh(new THREE.PlaneGeometry(7.2,3.6),windowMaterial);view.name='interior-city-window';view.position.set(x+side*7.7,4.4,z-10.51);root.add(view);box(root,'interior-window-frame',[7.6,.15,.14],[x+side*7.7,6.25,z-10.32],trim);box(root,'interior-window-frame',[7.6,.15,.14],[x+side*7.7,2.55,z-10.32],trim);box(root,'interior-window-frame',[.16,3.8,.14],[x+side*7.7,4.4,z-10.32],trim)}
  box(root,'interior-floor-inlay',[23,.035,1.3],[x,.44,z+7.1],accent);box(root,'interior-entry-rug',[4.1,.055,3.1],[x,.47,z+7.9],dark);
  for(const side of[-1,1]){cylinder(root,'interior-planter',.72,.78,[x+side*11.5,.9,z+7.8],dark,16);const plant=cylinder(root,'interior-plant',.62,1.85,[x+side*11.5,2.15,z+7.8],leaf,9);plant.scale.set(.72,1,.72)}
  for(const side of[-1,1]){box(root,'interior-wayfinding-plaque',[3.6,1.05,.14],[x+side*7.6,5.85,z+10.26],accent);box(root,'interior-wall-sconce',[.42,.72,.26],[x+side*11.25,5.05,z-10.28],glow)}
  root.userData.architectureTier='layered-interior-v5';
}
function furnishInterior(root,facility){
  const origin=facility.interior,{x,z}=origin,wall=physical(0x243039,.78,.02),floor=physical(0x766e61,.72,.03),dark=physical(0x151d22,.48,.18),accent=physical(facility.accent,.32,.12,facility.id==='nightlife'?facility.accent:0),wood=physical(0x70513a,.7,.02),fabric=physical(0x48535b,.82,.01);
  box(root,'interior-floor',[28,.42,22],[x,.2,z],floor);box(root,'interior-back-wall',[28,7.8,.42],[x,4.1,z-10.8],wall);box(root,'interior-left-wall',[.42,7.8,22],[x-13.8,4.1,z],wall);box(root,'interior-right-wall',[.42,7.8,22],[x+13.8,4.1,z],wall);box(root,'interior-ceiling',[28,.3,22],[x,8,z],dark);addInteriorArchitecture(root,facility);
  box(root,'exit-frame',[4.3,4.8,.36],[x,2.6,z+10.5],accent);box(root,'exit-door',[3.2,4.25,.24],[x,2.35,z+10.25],dark);
  const title=new THREE.Mesh(new THREE.PlaneGeometry(10.5,2.4),new THREE.MeshBasicMaterial({map:signTexture(facility.name.en,facility.type.en,`#${facility.accent.toString(16).padStart(6,'0')}`),toneMapped:false}));title.position.set(x,6.15,z-10.55);root.add(title);
  if(facility.id==='marina-workshop'){
    box(root,'workshop-lift',[9,.55,5.2],[x-3,.65,z-2.2],new THREE.MeshPhysicalMaterial({color:0x424c52,roughness:.35,metalness:.55,clearcoat:.4}));box(root,'workshop-bench',[11,1.25,2],[x+5,1,z-7.7],dark);for(const offset of[-7,-3.5,0,3.5,7])cylinder(root,'workshop-tool',.52,1.1,[x+offset,.8,z+3.5],accent,16);for(const side of[-1,1])box(root,'parts-rack',[3.2,5.5,1.3],[x+side*10,3,z-7.2],dark);box(root,'diagnostic-display',[8.5,3.4,.3],[x+5,3.2,z-9.8],accent);
  }else if(facility.id==='home'){
    box(root,'bed-frame',[6,.6,4.3],[x-8,.75,z-5.1],wood);box(root,'mattress',[5.7,.65,4],[x-8,1.35,z-5.1],fabric);box(root,'sofa',[5,1.4,2.2],[x+6,1.1,z-4.8],fabric);box(root,'tv-console',[5,.8,1],[x+6,.75,z+1.8],dark);box(root,'television',[4.4,2.5,.25],[x+6,2.25,z+1.4],dark);box(root,'kitchen',[7,2.2,1.8],[x-6,1.3,z+2.1],wood);
  }else if(facility.id==='grocery'){
    for(let row=-1;row<=1;row++)box(root,'market-shelf',[11,2.6,1.2],[x,1.65,z-4.5+row*3.8],wood);box(root,'market-counter',[8,1.25,2],[x+7,1,z+5.4],dark);
  }else if(facility.id==='restaurant'){
    box(root,'restaurant-counter',[12,1.25,2.2],[x,1,z-7.4],wood);for(const side of[-1,1])for(let row=0;row<2;row++){cylinder(root,'dining-table',1.3,.22,[x+side*6,1.25,z-1+row*5],wood);for(const offset of[-1.8,1.8])cylinder(root,'dining-stool',.48,.8,[x+side*6+offset,.8,z-1+row*5],fabric)}
  }else if(facility.id==='harbor-office'){
    box(root,'dispatch-desk',[12,1.3,2.4],[x,1,z+5.2],wood);box(root,'contract-wall',[18,4.8,.5],[x,3.2,z-9.8],dark);box(root,'chart-table',[8,1.1,5.5],[x,1,z-1.5],accent);for(const side of[-1,1])box(root,'harbor-locker',[3.2,5.5,1.3],[x+side*10,3,z-7.5],dark);for(const offset of[-6,0,6])box(root,'contract-card',[4.4,2.1,.12],[x+offset,4,z-9.45],accent);
  }else if(facility.id==='bank'){
    box(root,'teller-counter',[17,1.4,2.2],[x,1.05,z-5.8],wood);for(const offset of[-6,-2,2,6])box(root,'teller-glass',[.12,2.2,2.8],[x+offset,2.55,z-5.7],new THREE.MeshPhysicalMaterial({color:0x9bc8d2,roughness:.08,transmission:.4,transparent:true,opacity:.58}));for(const side of[-1,1])box(root,'atm',[2.2,3.2,1.2],[x+side*8,1.9,z+3],dark);
  }else if(facility.id==='fish-market'){
    box(root,'auction-counter',[18,1.35,2.2],[x,1.02,z+5.1],dark);box(root,'auction-display',[13,3.8,.35],[x,3.1,z-9.8],accent);for(const offset of[-8,-4,0,4,8])box(root,'cold-crate',[3.2,1.25,2.7],[x+offset,.82,z-3.4],new THREE.MeshPhysicalMaterial({color:0x8daeb2,roughness:.34,metalness:.24,clearcoat:.72}));for(const side of[-1,1])box(root,'ice-chest',[4.2,1.15,3.2],[x+side*7,.72,z+1],new THREE.MeshPhysicalMaterial({color:0xc8e3e4,roughness:.22,metalness:.08,clearcoat:.88}));
  }else if(facility.id==='nightlife'){
    box(root,'dance-floor',[11,.15,8],[x,.54,z-2],accent);box(root,'night-bar',[11,1.3,2.1],[x+7,1,z+5.2],dark);for(const side of[-1,1])box(root,'speaker',[2.1,4.2,1.8],[x+side*9,2.4,z-7.4],dark);for(const side of[-1,1]){const light=new THREE.PointLight(side<0?0xff3b9a:0x3bdcff,18,22,2);light.name='nightlife-light';light.position.set(x+side*7,6,z-1);light.userData.phase=side;root.add(light)}
  }else if(facility.id==='gym'){
    for(const side of[-1,1])for(let row=0;row<2;row++){box(root,'treadmill',[3,.35,5],[x+side*6,.65,z-4+row*6],dark);box(root,'treadmill-console',[2.3,1.5,.4],[x+side*6,1.65,z-6.1+row*6],accent)}box(root,'weight-rack',[8,2.8,1.2],[x,1.65,z-8],dark);
  }
  addInteriorPeople(root,facility);
  facility.actions.forEach((item,index)=>actionMarker(root,x-7.5+index*5,z-4.6,facility.accent,index));
  const exit=actionMarker(root,x,z+8.8,0xffffff,9);exit.name='life-exit-marker';
}
function signalLamp(parent,name,color,position){
  const material=new THREE.MeshStandardMaterial({color:0x161a1c,roughness:.32,metalness:.18,emissive:color,emissiveIntensity:.05}),lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),material);lamp.name=name;lamp.position.set(...position);parent.add(lamp);return lamp;
}
function addCityCrosswalks(root){
  const crossingRoot=new THREE.Group();crossingRoot.name='golden-coast-signal-crossings';root.add(crossingRoot);const crossings=[],stripeMaterial=new THREE.MeshStandardMaterial({color:0xe7e4d9,roughness:.82,metalness:.01}),poleMaterial=physical(0x27343a,.3,.7),housingMaterial=physical(0x12191d,.38,.42);
  for(const crossing of COAST_CROSSWALKS){
    const group=new THREE.Group();group.name=`city-crosswalk-${crossing.id}`;crossingRoot.add(group);for(let index=0;index<14;index++)box(group,'crosswalk-stripe',[4,.045,.74],[crossing.x,.795,GOLDEN_CITY.roadZ-14.3+index*2.2],stripeMaterial);for(const direction of[-1,1])box(group,'traffic-stop-line',[.45,.05,10.8],[crossing.x-direction*5.4,.8,GOLDEN_CITY.roadZ+(direction>0?7.2:-7.2)],stripeMaterial);
    const heads=[];for(const direction of[-1,1]){const stopX=crossing.x-direction*5.4,curbZ=GOLDEN_CITY.roadZ+(direction>0?20.5:-20.5),head=new THREE.Group();head.name=`traffic-signal-head-${direction<0?'west':'east'}`;cylinder(head,'traffic-signal-pole',.16,5.3,[0,3.44,0],poleMaterial,12);box(head,'traffic-signal-housing',[.72,1.72,.48],[0,6.2,-direction*.25],housingMaterial);const red=signalLamp(head,'traffic-signal-red',0xff3028,[0,6.72,-direction*.5]),amber=signalLamp(head,'traffic-signal-amber',0xffb52e,[0,6.2,-direction*.5]),green=signalLamp(head,'traffic-signal-green',0x46e88d,[0,5.68,-direction*.5]);box(head,'pedestrian-signal-housing',[.62,.9,.35],[0,4.55,direction*.24],housingMaterial);const wait=signalLamp(head,'pedestrian-signal-wait',0xff5448,[-.16,4.55,direction*.44]),walk=signalLamp(head,'pedestrian-signal-walk',0x5bf2a0,[.16,4.55,direction*.44]);head.position.set(stopX,0,curbZ);group.add(head);heads.push({red,amber,green,wait,walk})}
    crossings.push({crossing,group,heads});
  }
  crossingRoot.userData={crossings,qualityTier:'signal-crossings-v1'};return crossingRoot;
}
function animateCityCrosswalks(root,time){
  const states=[];for(const entry of root.userData.crossings||[]){const state=coastSignalState(time,entry.crossing);states.push(state);for(const head of entry.heads){head.red.material.emissiveIntensity=state.vehicle==='red'?3.2:.04;head.amber.material.emissiveIntensity=state.vehicle==='amber'?3:.04;head.green.material.emissiveIntensity=state.vehicle==='green'?2.8:.04;head.wait.material.emissiveIntensity=state.pedestrian==='wait'?2.7:.04;head.walk.material.emissiveIntensity=state.pedestrian==='walk'?3.1:.04}}document.body.dataset.cityTrafficSignals=states.map(state=>`${state.crossingId}:${state.vehicle}:${state.pedestrian}`).join(',');document.body.dataset.cityPedestrianWalk=String(states.filter(state=>state.pedestrian==='walk').length);return states;
}
function addCityStreetLighting(root){
  const lightingRoot=new THREE.Group();lightingRoot.name='golden-coast-street-lighting';root.add(lightingRoot);const lamps=[],poleMaterial=physical(0x263238,.3,.72),armMaterial=physical(0x36454c,.28,.76),warm=0xffc981;
  for(const collider of CITY_STREET_COLLIDERS.filter(item=>item.id.startsWith('street-lamp-'))){
    const index=Number(collider.id.split('-').at(-1)),side=collider.z>GOLDEN_CITY.roadZ?1:-1,group=new THREE.Group();group.name=collider.id;group.position.set(collider.x,0,collider.z);lightingRoot.add(group);
    cylinder(group,'street-lamp-pole',.15,6.6,[0,4.28,0],poleMaterial,12);box(group,'street-lamp-arm',[.2,.18,2.2],[0,7.48,-side*1.02],armMaterial);box(group,'street-lamp-housing',[.72,.22,.46],[0,7.35,-side*2.02],armMaterial);
    const bulbMaterial=new THREE.MeshStandardMaterial({color:0xffdfaa,roughness:.22,metalness:.02,emissive:warm,emissiveIntensity:.08}),bulb=box(group,'street-lamp-bulb',[.5,.08,.32],[0,7.2,-side*2.02],bulbMaterial),light=new THREE.PointLight(warm,0,27,2);light.name='street-lamp-light';light.position.set(0,7.05,-side*2.02);light.castShadow=false;group.add(light);
    const poolMaterial=new THREE.MeshBasicMaterial({color:warm,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),pool=new THREE.Mesh(new THREE.CircleGeometry(5.4,28),poolMaterial);pool.name='street-lamp-light-pool';pool.rotation.x=-Math.PI/2;pool.position.set(0,1.015,-side*2.02);group.add(pool);
    const reflectionMaterial=new THREE.MeshBasicMaterial({color:0xffd79a,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}),reflection=new THREE.Mesh(new THREE.PlaneGeometry(1.25,8.5),reflectionMaterial);reflection.name='street-lamp-wet-reflection';reflection.rotation.x=-Math.PI/2;reflection.position.set(0,1.02,-side*4.8);group.add(reflection);lamps.push({group,bulb,light,pool,reflection,x:collider.x,z:collider.z});
  }
  const studMaterial=new THREE.MeshBasicMaterial({color:0xffd694,transparent:true,opacity:.08,depthWrite:false,toneMapped:false}),studGeometry=new THREE.BoxGeometry(.18,.035,.34),studs=new THREE.InstancedMesh(studGeometry,studMaterial,48),matrix=new THREE.Matrix4();studs.name='golden-coast-road-studs';for(let index=0;index<48;index++){const lane=index%2?-3.4:3.4,x=GOLDEN_CITY.centerX-214+Math.floor(index/2)*18.2;matrix.makeTranslation(x,1.015,GOLDEN_CITY.roadZ+lane);studs.setMatrixAt(index,matrix)}lightingRoot.add(studs);lightingRoot.userData={lamps,studs,qualityTier:'time-weather-reactive-v1'};return lightingRoot;
}
function animateCityStreetLighting(root,focus){
  const hour=((Number(focus?.hour)||0)%24+24)%24,wetness=clamp(Number(focus?.wetness)||0,0,1),darkness=hour>=18?clamp((hour-18)/2,0,1):hour<7?clamp((7-hour)/2,0,1):0,lamps=root.userData.lamps||[];let visible=0,active=0;
  for(const lamp of lamps){const range=focus?Math.hypot(focus.x-lamp.x,focus.z-lamp.z):0,near=!focus||range<230,lit=near&&darkness>.02&&range<125;lamp.group.visible=near;if(near)visible++;if(lit)active++;lamp.light.visible=lit;lamp.light.intensity=lit?(8+wetness*5)*darkness:0;lamp.bulb.material.emissiveIntensity=.06+darkness*2.5;lamp.pool.material.opacity=near?darkness*(.045+wetness*.08):0;lamp.reflection.visible=near&&wetness>.05&&darkness>.02;lamp.reflection.material.opacity=darkness*wetness*.24}
  root.userData.studs.material.opacity=.035+darkness*(.18+wetness*.16);document.body.dataset.cityStreetLights=`${active}/${visible}/${lamps.length}`;document.body.dataset.cityWetReflections=wetness>.05&&darkness>.02?'active':'inactive';document.body.dataset.cityNightFactor=darkness.toFixed(2);return{active,visible,total:lamps.length,darkness,wetness};
}
function plazaSignTexture(title,subtitle,accent='#74ebff'){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const context=canvas.getContext('2d'),gradient=context.createLinearGradient(0,0,768,256);gradient.addColorStop(0,'#08131a');gradient.addColorStop(1,'#142a35');context.fillStyle=gradient;context.fillRect(0,0,768,256);context.fillStyle=accent;context.fillRect(0,0,13,256);context.fillRect(0,242,768,14);context.fillStyle='#f4fbff';context.font='900 55px Segoe UI, sans-serif';context.fillText(title,38,112,690);context.fillStyle=accent;context.font='800 26px Segoe UI, sans-serif';context.fillText(subtitle,40,166,680);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function plazaKioskMenuTexture(kiosk,day=1,remaining=kiosk.dailyStock){
  const offer=cityPlazaKioskOffer(kiosk.id,day),canvas=document.createElement('canvas');canvas.width=320;canvas.height=460;const context=canvas.getContext('2d'),accent=`#${kiosk.accent.toString(16).padStart(6,'0')}`,[opens,closes]=kiosk.schedule;context.fillStyle='#071118';context.fillRect(0,0,320,460);context.fillStyle=accent;context.fillRect(0,0,320,14);context.fillRect(0,446,320,14);context.strokeStyle=accent;context.lineWidth=4;context.strokeRect(12,26,296,408);context.fillStyle='#8da7b4';context.font='800 17px Segoe UI, sans-serif';context.fillText(`DAY ${Math.max(1,Math.floor(day))} · FEATURED`,28,67);context.fillStyle='#f4fbff';context.font='900 31px Segoe UI, sans-serif';const words=offer.name.en.split(' '),lines=[];let line='';for(const word of words){const next=`${line} ${word}`.trim();if(context.measureText(next).width>264&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);lines.slice(0,3).forEach((value,index)=>context.fillText(value,28,126+index*39));context.fillStyle=accent;context.font='900 38px Segoe UI, sans-serif';context.fillText(`${offer.cost.toLocaleString()} CR`,28,278);context.fillStyle='#d4e2e8';context.font='800 19px Segoe UI, sans-serif';context.fillText(`${Math.max(0,remaining)} LEFT TODAY`,28,324);context.fillStyle='#8299a4';context.font='700 16px Segoe UI, sans-serif';context.fillText(`OPEN ${String(opens).padStart(2,'0')}:00 — ${String(closes).padStart(2,'0')}:00`,28,365);context.fillStyle='#f4fbff';context.font='800 18px Segoe UI, sans-serif';context.fillText('E · ORDER AT COUNTER',28,410);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;texture.userData={day:Math.max(1,Math.floor(day)),offerId:offer.id,remaining:Math.max(0,remaining)};return texture;
}
function addPlazaKioskService(plaza,definition,index){
  const roles=['server','clerk','bartender'],names=['Mina','Theo','Jae'],facility={id:`plaza-${definition.id}`,accent:definition.accent,interior:{x:0,z:0}},vendor=addInteriorPerson(plaza,facility,{kind:'staff',role:roles[index],name:names[index],at:[definition.spot.x,394.6],heading:0},20+index),customer=addInteriorPerson(plaza,facility,{kind:'queue',role:'customer',name:`${definition.id}-customer`,at:[definition.spot.x+1.65,402.2],heading:Math.PI},30+index);
  vendor.group.name=`plaza-kiosk-vendor-${definition.id}`;vendor.group.position.y=vendor.group.userData.baseY=1.01;vendor.group.scale.setScalar(.93);customer.group.name=`plaza-kiosk-customer-${definition.id}`;customer.group.position.y=customer.group.userData.baseY=1.01;customer.group.scale.setScalar(.91);customer.group.userData.queueBaseX=customer.group.position.x;customer.group.userData.queueBaseZ=customer.group.position.z;
  let product=null;if(index===0){product=interiorPersonPart(vendor.arms[1],'plaza-kiosk-delivery-cup',new THREE.CylinderGeometry(.06,.05,.18,12),physical(0xf3eee2,.34,.02),[0,-.69,.14]);interiorPersonPart(product,'plaza-kiosk-cup-lid',new THREE.CylinderGeometry(.064,.064,.018,12),physical(0x253138,.38,.16),[0,.098,0])}else if(index===1){product=interiorPersonPart(vendor.arms[1],'plaza-kiosk-delivery-bag',new THREE.BoxGeometry(.27,.28,.14),physical(0x9f744a,.82,.01),[0,-.72,.14]);interiorPersonPart(product,'plaza-kiosk-bag-mark',new THREE.BoxGeometry(.13,.08,.012),physical(definition.accent,.38,.08),[0,.02,.077])}else{product=interiorPersonPart(vendor.arms[1],'plaza-kiosk-delivery-bowl',new THREE.CylinderGeometry(.1,.14,.09,14),physical(0xe8edf0,.36,.02),[0,-.7,.14]);interiorPersonPart(product,'plaza-kiosk-bowl-food',new THREE.SphereGeometry(.085,12,8),physical(0xd16f42,.78,.01),[0,.07,0])}product.visible=false;
  const serviceLight=new THREE.PointLight(definition.accent,0,16,2.2);serviceLight.name=`plaza-kiosk-service-light-${definition.id}`;serviceLight.position.set(definition.spot.x,4.25,398.1);serviceLight.castShadow=false;plaza.add(serviceLight);return{vendor,customer,product,serviceLight,index,definition};
}
function animatePlazaKioskService(service,status,time,focus,serviceFocus,darkness){
  const {vendor,customer,product,serviceLight,index,definition}=service,active=status.open&&!status.soldOut,range=focus?Math.hypot(focus.x-definition.spot.x,focus.z-definition.spot.z):99,greeting=active&&range<9,delivery=serviceFocus?.id===definition.id&&time<serviceFocus.until,phase=index*1.71,blink=Math.max(0,(Math.sin(time*.71+phase*2.3)-.92)/.08),speech=greeting?Math.abs(Math.sin(time*5.8+phase))*.2:0;
  vendor.group.visible=status.open;customer.group.visible=active&&status.remaining>1&&((Math.floor((focus?.hour||0)*2)+index)%3!==0);serviceLight.visible=status.open&&darkness>.02;serviceLight.intensity=serviceLight.visible?(3.2+darkness*5.6)*(active?1:.18):0;product.visible=delivery;
  if(vendor.group.visible){vendor.group.position.y=vendor.group.userData.baseY+Math.sin(time*1.45+phase)*.012;vendor.head.rotation.y=clamp(Math.atan2((focus?.x||definition.spot.x)-definition.spot.x,Math.max(.4,(focus?.z||399)-394.6)),-.58,.58);vendor.head.rotation.x=greeting?-.04:Math.sin(time*.7+phase)*.018;vendor.torso.rotation.z=Math.sin(time*.85+phase)*.009;for(const eye of vendor.face.eyes)eye.scale.y=.78*Math.max(.08,1-blink*.93);for(const iris of vendor.face.irises)iris.scale.y=.88*Math.max(.09,1-blink*.94);vendor.face.lowerLip.position.y=-.125-speech*.024;vendor.face.lowerLip.scale.y=.66+speech*.34;if(delivery){vendor.arms[0].rotation.x=-.86;vendor.arms[1].rotation.x=-.98;vendor.arms[0].rotation.z=.17;vendor.arms[1].rotation.z=-.12}else if(status.soldOut){vendor.arms[0].rotation.x=vendor.arms[1].rotation.x=-.42;vendor.arms[0].rotation.z=-.65;vendor.arms[1].rotation.z=.65}else if(greeting){vendor.arms[0].rotation.x=-.62+Math.sin(time*2.5+phase)*.12;vendor.arms[1].rotation.x=-.3;vendor.arms[0].rotation.z=.22;vendor.arms[1].rotation.z=-.08}else{vendor.arms[0].rotation.x=-.3+Math.sin(time*1.7+phase)*.08;vendor.arms[1].rotation.x=-.22-Math.sin(time*1.7+phase)*.06;vendor.arms[0].rotation.z=.08;vendor.arms[1].rotation.z=-.08}}
  if(customer.group.visible){const step=Math.sin(time*1.55+phase);customer.group.position.x=customer.group.userData.queueBaseX+Math.sin(time*.32+phase)*.09;customer.group.position.z=customer.group.userData.queueBaseZ+Math.sin(time*.45+phase)*.04;customer.head.rotation.y=Math.sin(time*.55+phase)*.12;customer.arms[0].rotation.x=.04+step*.035;customer.arms[1].rotation.x=.02-step*.035;customer.legs[0].rotation.x=step*.025;customer.legs[1].rotation.x=-step*.025}
  return{staff:vendor.group.visible?1:0,queue:customer.group.visible?1:0,greeting:greeting?1:0,delivery:delivery?1:0};
}
function addEastWaterfrontPlaza(root){
  const plaza=new THREE.Group();plaza.name='golden-coast-east-waterfront-plaza';root.add(plaza);const stone=physical(0xaaa79e,.9,.015),stoneDark=physical(0x737b7b,.76,.08),metal=physical(0x334247,.28,.68),wood=physical(0x74543b,.74,.025),leaf=physical(0x426c50,.9,.01),waterMaterial=new THREE.MeshPhysicalMaterial({color:0x3f9cad,roughness:.08,metalness:.04,transmission:.18,transparent:true,opacity:.66,clearcoat:1,clearcoatRoughness:.05,emissive:0x1b6473,emissiveIntensity:.12});
  box(plaza,'east-plaza-paving',[154,.34,71],[551,.82,414.5],stone);box(plaza,'east-plaza-quay-apron',[83,.32,30],[560,.81,461],physical(0x8f8d85,.88,.02));box(plaza,'east-plaza-connector',[30,.3,25],[481,.81,414],stone);
  for(let index=0;index<13;index++){const stripe=box(plaza,'east-plaza-paving-inlay',[.22,.028,64],[484+index*11.2,1.006,414.5],index%3===0?physical(0x4f8b8e,.65,.08):stoneDark);stripe.receiveShadow=false}for(let index=0;index<7;index++)box(plaza,'east-plaza-cross-inlay',[144,.025,.16],[551,1.008,385+index*9.6],index%2?stoneDark:physical(0x759c97,.72,.03));
  const plazaKiosks=[];for(let index=0;index<CITY_PLAZA_KIOSKS.length;index++){const definition=CITY_PLAZA_KIOSKS[index],x=definition.spot.x,accent=definition.accent,kiosk=new THREE.Group();kiosk.name=`east-plaza-kiosk-${index}`;plaza.add(kiosk);box(kiosk,'plaza-kiosk-shell',[8,4.6,5.2],[x,3.18,394],physical(index%2?0x34515a:0x4d4942,.56,.18));box(kiosk,'plaza-kiosk-counter',[7.5,1.1,1.2],[x,1.62,396.35],wood);box(kiosk,'plaza-kiosk-canopy',[9,.2,6.3],[x,5.55,394.3],physical(accent,.34,.12));const sign=new THREE.Mesh(new THREE.PlaneGeometry(6.6,2.2),new THREE.MeshBasicMaterial({map:plazaSignTexture(definition.name.en,['LOCAL ROAST','HARBOR CRAFT','EVENING STREET FOOD'][index],`#${accent.toString(16).padStart(6,'0')}`),toneMapped:false}));sign.name='plaza-kiosk-sign';sign.position.set(x,4.12,396.66);kiosk.add(sign);const menuTexture=plazaKioskMenuTexture(definition,1,definition.dailyStock),menuBoards=[];for(const side of[-1,1]){const board=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.8),new THREE.MeshBasicMaterial({map:menuTexture,toneMapped:false}));board.name='plaza-kiosk-daily-menu-board';board.position.set(x+side*2.55,2.6,396.72);kiosk.add(board);menuBoards.push(board)}const statusMaterial=new THREE.MeshStandardMaterial({color:accent,roughness:.22,emissive:accent,emissiveIntensity:1.5}),statusLight=box(kiosk,'plaza-kiosk-open-light',[2.2,.12,.12],[x,3.66,396.76],statusMaterial),service=addPlazaKioskService(plaza,definition,index);kiosk.userData={definition,sign,menuBoards,statusLight,service,menuDay:1,remaining:definition.dailyStock};plazaKiosks.push(kiosk)}
  for(const [x,z] of[[492,438],[518,438],[586,438],[614,438]]){cylinder(plaza,'plaza-planter',1.35,.9,[x,1.42,z],physical(0x4d5555,.72,.22),18);const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(1.45,1),leaf);crown.name='plaza-planter-crown';crown.position.set(x,2.65,z);crown.scale.set(1,.72,1);crown.castShadow=true;plaza.add(crown)}
  for(const [x,z,heading] of[[505,426,0],[529,426,0],[579,426,Math.PI],[605,440,Math.PI]]){const bench=new THREE.Group();bench.name='plaza-view-bench';bench.position.set(x,0,z);bench.rotation.y=heading;plaza.add(bench);box(bench,'plaza-bench-seat',[4.5,.22,1.2],[0,1.35,0],wood);box(bench,'plaza-bench-back',[4.5,1.25,.18],[0,1.85,-.48],wood);for(const side of[-1,1])box(bench,'plaza-bench-leg',[.22,1,.8],[side*1.75,.88,0],metal)}
  const pool=new THREE.Mesh(new THREE.CylinderGeometry(6.1,6.5,.24,48),stoneDark);pool.name='plaza-reflecting-pool';pool.position.set(552,1.12,417);pool.receiveShadow=true;plaza.add(pool);const poolWater=new THREE.Mesh(new THREE.CylinderGeometry(5.72,5.72,.08,48),waterMaterial);poolWater.name='plaza-reflecting-water';poolWater.position.set(552,1.28,417);plaza.add(poolWater);const sculpture=new THREE.Group();sculpture.name='plaza-tidal-sculpture';sculpture.position.set(552,1.42,417);plaza.add(sculpture);const sculptureMaterial=new THREE.MeshStandardMaterial({color:0x74c8d2,roughness:.23,metalness:.72,emissive:0x2bb6c8,emissiveIntensity:.12});for(let index=0;index<3;index++){const arc=new THREE.Mesh(new THREE.TorusGeometry(2.2+index*.58,.15,12,48,Math.PI*1.35),sculptureMaterial);arc.name='plaza-tidal-arc';arc.position.y=2.1+index*.85;arc.rotation.set(Math.PI/2,index*.42,-.58+index*.28);arc.castShadow=true;sculpture.add(arc)}
  const stage=new THREE.Group();stage.name='plaza-performance-stage';plaza.add(stage);cylinder(stage,'plaza-stage-deck',4.25,.42,[606,1.22,420],physical(0x3d4450,.46,.34),32);for(const side of[-1,1]){cylinder(stage,'plaza-stage-truss',.11,5.2,[606+side*3.7,3.62,418.7],metal,10);const speaker=box(stage,'plaza-stage-speaker',[1.15,2.3,1.1],[606+side*3.15,2.4,421.1],physical(0x12191d,.42,.36));speaker.castShadow=true}box(stage,'plaza-stage-light-bar',[7.6,.18,.18],[606,6.18,418.7],metal);
  const performer=new THREE.Group();performer.name='plaza-street-performer';performer.position.set(606,1.44,420);stage.add(performer);const performerMaterial=physical(0xb878ff,.62,.04),performerDark=physical(0x20252c,.7,.08),torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.62,6,10),performerMaterial);torso.name='plaza-performer-torso';torso.position.y=1.46;performer.add(torso);const performerHead=new THREE.Mesh(new THREE.SphereGeometry(.29,16,11),physical(0xc68642,.76,.01));performerHead.name='plaza-performer-head';performerHead.position.y=2.45;performer.add(performerHead);const performerArms=[];for(const side of[-1,1]){const pivot=new THREE.Group(),arm=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.55,5,8),performerMaterial);arm.position.y=-.34;pivot.position.set(side*.42,1.83,0);pivot.add(arm);performer.add(pivot);performerArms.push(pivot);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.09,.58,5,8),performerDark);leg.position.set(side*.18,.65,0);performer.add(leg)}const instrument=box(performer,'plaza-performer-keytar',[.95,.28,.17],[.18,1.35,.38],physical(0x74ebff,.3,.26,0x247f91));instrument.rotation.z=-.18;
  const lampPositions=[[488,404],[516,446],[548,446],[580,446],[620,404]],lamps=[];for(let index=0;index<lampPositions.length;index++){const [x,z]=lampPositions[index];cylinder(plaza,'plaza-light-pole',.15,6.4,[x,4.08,z],metal,12);const bulbMaterial=new THREE.MeshStandardMaterial({color:0xffe0ad,roughness:.2,emissive:0xffbd72,emissiveIntensity:.08}),bulb=new THREE.Mesh(new THREE.SphereGeometry(.22,12,9),bulbMaterial);bulb.name='plaza-light-bulb';bulb.position.set(x,7.35,z);plaza.add(bulb);const light=new THREE.PointLight(0xffc27d,0,29,2);light.name='plaza-point-light';light.position.copy(bulb.position);light.castShadow=false;plaza.add(light);lamps.push({bulb,light,phase:index*.7})}
  const railMaterial=physical(0x46565b,.3,.7);for(let index=0;index<9;index++){const x=522+index*9.5;cylinder(plaza,'plaza-pier-rail-post',.09,2.05,[x,1.93,475],railMaterial,8)}for(const y of[1.42,2.18]){const rail=box(plaza,'plaza-pier-end-rail',[78,.1,.1],[560,y,475],railMaterial);rail.castShadow=true}for(const side of[-1,1])for(let index=0;index<4;index++)cylinder(plaza,'plaza-pier-side-post',.09,2.05,[520+side*40,1.93,451+index*7.5],railMaterial,8);
  const viewfinder=new THREE.Group();viewfinder.name='plaza-viewfinder';viewfinder.position.set(560,0,466);plaza.add(viewfinder);cylinder(viewfinder,'plaza-viewfinder-pedestal',.13,2.6,[0,2.23,0],metal,10);const viewer=box(viewfinder,'plaza-viewfinder-head',[.72,.42,.82],[0,3.65,.12],physical(0x52646a,.28,.68));viewer.rotation.x=-.12;for(const side of[-1,1])cylinder(viewfinder,'plaza-viewfinder-lens',.11,.18,[side*.18,3.7,.58],physical(0x1b252a,.16,.44),12).rotation.x=Math.PI/2;
  const arch=new THREE.Group();arch.name='east-plaza-entry-arch';plaza.add(arch);for(const side of[-1,1])box(arch,'plaza-entry-column',[.7,7,.7],[478,4.45+0,414+side*7],metal);box(arch,'plaza-entry-header',[.72,.8,15],[478,7.9,414],metal);const banner=new THREE.Mesh(new THREE.PlaneGeometry(11.8,2.5),new THREE.MeshBasicMaterial({map:plazaSignTexture('TIDAL SQUARE','EAST WATERFRONT · OPEN DAILY','#74ebff'),toneMapped:false}));banner.name='plaza-entry-banner';banner.position.set(478.38,6.2,414);banner.rotation.y=Math.PI/2;arch.add(banner);
  const flags=[];for(let index=0;index<8;index++){const flag=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.72),new THREE.MeshStandardMaterial({color:index%2?0xff79d1:0x74ebff,roughness:.62,side:THREE.DoubleSide,emissive:index%2?0x40102f:0x123c48,emissiveIntensity:.16}));flag.name='plaza-promenade-flag';flag.position.set(490+index*17.5,6.2,448);flag.userData.phase=index*.73;plaza.add(flag);flags.push(flag)}
  const activityMarkers=[];for(const activity of CITY_PUBLIC_ACTIVITIES)for(let index=0;index<activity.spots.length;index++){const spot=activity.spots[index],material=new THREE.MeshBasicMaterial({color:activity.id==='plaza_performance'?0xff79d1:activity.id==='plaza_view'?0xffd277:0x74ebff,transparent:true,opacity:.56,depthWrite:false,toneMapped:false}),marker=new THREE.Mesh(new THREE.TorusGeometry(.78,.065,8,28),material);marker.name=`plaza-activity-marker-${activity.id}`;marker.position.set(spot.x,1.09,spot.z);marker.rotation.x=Math.PI/2;marker.userData={activityId:activity.id,phase:index*.81+activityMarkers.length*.37,baseY:1.09};plaza.add(marker);activityMarkers.push(marker)}
  const kioskMarkers=[];for(let index=0;index<CITY_PLAZA_KIOSKS.length;index++){const kiosk=CITY_PLAZA_KIOSKS[index],material=new THREE.MeshBasicMaterial({color:kiosk.accent,transparent:true,opacity:.62,depthWrite:false,toneMapped:false}),marker=new THREE.Mesh(new THREE.TorusGeometry(.86,.075,8,30),material);marker.name=`plaza-kiosk-order-marker-${kiosk.id}`;marker.position.set(kiosk.spot.x,1.09,kiosk.spot.z);marker.rotation.x=Math.PI/2;marker.userData={kioskId:kiosk.id,phase:index*.93,baseY:1.09};plaza.add(marker);kioskMarkers.push(marker)}
  plaza.userData={lamps,flags,performer,performerArms,performerHead,sculpture,poolWater,activityMarkers,plazaKiosks,kioskMarkers,qualityTier:'east-waterfront-public-realm-v2'};return plaza;
}
function animateEastWaterfrontPlaza(root,time,focus){
  if(!root)return;const distanceToPlaza=focus?Math.hypot(focus.x-552,focus.z-423):0,near=!focus||distanceToPlaza<390,hour=((Number(focus?.hour)||0)%24+24)%24,day=Math.max(1,Math.floor(focus?.day||1)),darkness=hour>=18?clamp((hour-18)/2,0,1):hour<7?clamp((7-hour)/2,0,1):0,wetness=clamp(Number(focus?.wetness)||0,0,1),performanceLive=near&&(hour>=11&&hour<14||hour>=18&&hour<23);root.visible=near;const {lamps,flags,performer,performerArms,performerHead,sculpture,poolWater,activityMarkers,plazaKiosks,kioskMarkers}=root.userData;for(const lamp of lamps){const pulse=.94+Math.sin(time*1.25+lamp.phase)*.06;lamp.light.intensity=darkness>0&&distanceToPlaza<210?(7.5+wetness*3)*darkness*pulse:0;lamp.bulb.material.emissiveIntensity=.08+darkness*2.4*pulse}for(const flag of flags){flag.rotation.y=Math.sin(time*1.3+flag.userData.phase)*.18;flag.rotation.z=Math.sin(time*1.8+flag.userData.phase)*.055}
  let openKiosks=0,kioskStaff=0,kioskQueue=0,kioskGreeting=0,kioskDeliveries=0;const kioskStock=[],serviceFocus=root.userData.kioskServiceFocus;for(const kioskGroup of plazaKiosks){const definition=kioskGroup.userData.definition,savedRemaining=focus?.kioskInventory?.day===day?focus?.kioskInventory?.stock?.[definition.id]:definition.dailyStock,status=cityPlazaKioskStatus(definition.id,hour,day,savedRemaining);if(kioskGroup.userData.menuDay!==day||kioskGroup.userData.remaining!==status.remaining){const previousMap=kioskGroup.userData.menuBoards[0]?.material.map,nextMap=plazaKioskMenuTexture(definition,day,status.remaining);for(const board of kioskGroup.userData.menuBoards){board.material.map=nextMap;board.material.needsUpdate=true}previousMap?.dispose();kioskGroup.userData.menuDay=day;kioskGroup.userData.remaining=status.remaining}const active=status.open&&!status.soldOut;if(active)openKiosks++;kioskGroup.userData.sign.material.color.setScalar(active?1:status.open?.45:.2);kioskGroup.userData.statusLight.material.emissiveIntensity=active?1.8:status.open?.22:.035;kioskGroup.userData.statusLight.material.color.setHex(active?definition.accent:0x283239);const service=animatePlazaKioskService(kioskGroup.userData.service,status,time,focus,serviceFocus,darkness);kioskStaff+=service.staff;kioskQueue+=service.queue;kioskGreeting+=service.greeting;kioskDeliveries+=service.delivery;kioskStock.push(`${definition.id}:${status.remaining}`)}if(serviceFocus&&time>=serviceFocus.until){root.userData.kioskServiceFocus=null;document.body.dataset.cityKioskService=''}
  let availableActivities=0;for(const marker of activityMarkers){const available=cityPublicActivityStatus(marker.userData.activityId,hour).available;marker.visible=near&&available;if(available)availableActivities++;marker.rotation.z=time*.34+marker.userData.phase;marker.position.y=marker.userData.baseY+Math.sin(time*2.1+marker.userData.phase)*.035;marker.material.opacity=.43+Math.sin(time*2.6+marker.userData.phase)*.13}for(const marker of kioskMarkers){const definition=CITY_PLAZA_KIOSKS.find(item=>item.id===marker.userData.kioskId),remaining=focus?.kioskInventory?.day===day?focus?.kioskInventory?.stock?.[definition.id]:definition.dailyStock,status=cityPlazaKioskStatus(definition.id,hour,day,remaining);marker.visible=near&&status.open&&!status.soldOut;marker.rotation.z=time*.42+marker.userData.phase;marker.position.y=marker.userData.baseY+Math.sin(time*2.3+marker.userData.phase)*.045}
  performer.visible=performanceLive;if(performanceLive){const beat=Math.sin(time*5.4);performer.position.y=1.44+Math.abs(beat)*.045;performer.rotation.y=Math.sin(time*.48)*.16;performerArms[0].rotation.x=-.72+beat*.24;performerArms[0].rotation.z=.28;performerArms[1].rotation.x=-.38-beat*.3;performerArms[1].rotation.z=-.22;performerHead.rotation.y=Math.sin(time*1.2)*.16}sculpture.rotation.y=time*.055;for(const node of sculpture.children)node.material.emissiveIntensity=.1+darkness*.65+Math.sin(time*1.1+node.position.y)*.06;poolWater.material.opacity=.52+wetness*.18+Math.sin(time*.7)*.025;poolWater.rotation.y=time*.015;document.body.dataset.cityEastPlaza=near?'active':'culled';document.body.dataset.cityPlazaLights=String(darkness>0&&distanceToPlaza<210?lamps.length:0);document.body.dataset.cityPlazaPerformance=performanceLive?'live':'quiet';document.body.dataset.cityPlazaActivities=String(availableActivities);document.body.dataset.cityPlazaKiosks=`${openKiosks}/${plazaKiosks.length}`;document.body.dataset.cityKioskStock=kioskStock.join(',');document.body.dataset.cityKioskStaff=String(kioskStaff);document.body.dataset.cityKioskQueue=String(kioskQueue);document.body.dataset.cityKioskGreeting=String(kioskGreeting);document.body.dataset.cityKioskDelivery=String(kioskDeliveries);document.body.dataset.cityPlazaDistance=Math.round(distanceToPlaza).toString();
}
function transitStopTexture(stop,index){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const context=canvas.getContext('2d');context.fillStyle='#07131b';context.fillRect(0,0,512,512);context.fillStyle='#5fd9ff';context.fillRect(0,0,512,18);context.fillRect(0,494,512,18);context.fillStyle='#dcebf2';context.font='900 28px Segoe UI, sans-serif';context.fillText('COAST SHUTTLE · STOP '+(index+1),28,64);context.fillStyle='#ffffff';context.font='900 42px Segoe UI, sans-serif';context.fillText(stop.name.en,28,128,456);context.fillStyle='#7f9aa8';context.font='800 21px Segoe UI, sans-serif';context.fillText('EVERY 30 MIN · 06:00—22:30',28,174);context.fillStyle='#5fd9ff';context.font='900 54px Segoe UI, sans-serif';context.fillText('120 CR',28,250);for(let routeIndex=0;routeIndex<CITY_TRANSIT_STOPS.length;routeIndex++){const routeStop=CITY_TRANSIT_STOPS[routeIndex],y=318+routeIndex*50;context.fillStyle=routeIndex===index?'#5fd9ff':'#607783';context.beginPath();context.arc(40,y-7,10,0,Math.PI*2);context.fill();context.fillStyle=routeIndex===index?'#ffffff':'#9eb1bb';context.font='800 20px Segoe UI, sans-serif';context.fillText(routeStop.name.en,66,y)}const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function addCityTransitWorld(root){
  const transitRoot=new THREE.Group();transitRoot.name='golden-coast-public-transit';root.add(transitRoot);const metal=physical(0x344650,.3,.66),glass=new THREE.MeshPhysicalMaterial({color:0x77b7ca,roughness:.12,metalness:.08,transmission:.3,transparent:true,opacity:.56,clearcoat:1}),bench=physical(0x76573e,.76,.04),stops=[];
  for(let index=0;index<CITY_TRANSIT_STOPS.length;index++){const stop=CITY_TRANSIT_STOPS[index],group=new THREE.Group();group.name=`city-transit-stop-${stop.id}`;group.position.set(stop.spot.x,0,439.1);transitRoot.add(group);for(const side of[-1,1])cylinder(group,'transit-shelter-post',.1,4.5,[side*3.3,3.25,0],metal,10);box(group,'transit-shelter-roof',[7.2,.18,2.4],[0,5.55,-.4],metal);const back=box(group,'transit-shelter-glass',[6.8,3.9,.09],[0,3.25,.35],glass);back.castShadow=false;box(group,'transit-stop-bench',[4.4,.22,.78],[0,1.43,-.25],bench);for(const side of[-1,1])box(group,'transit-stop-bench-leg',[.18,1,.55],[side*1.65,.92,-.25],metal);const routeBoard=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshBasicMaterial({map:transitStopTexture(stop,index),toneMapped:false,side:THREE.DoubleSide}));routeBoard.name='transit-live-route-board';routeBoard.position.set(-2.15,3.35,-.72);group.add(routeBoard);const pole=cylinder(group,'transit-stop-pole',.09,4,[4.15,3,0],metal,10),sign=box(group,'transit-stop-sign',[1.2,1.2,.1],[4.15,5.1,0],physical(CITY_TRANSIT.accent,.3,.18,CITY_TRANSIT.accent));sign.material.emissiveIntensity=.3;const marker=new THREE.Mesh(new THREE.TorusGeometry(.85,.075,8,30),new THREE.MeshBasicMaterial({color:CITY_TRANSIT.accent,transparent:true,opacity:.58,depthWrite:false,toneMapped:false}));marker.name=`transit-stop-marker-${stop.id}`;marker.position.set(0,1.09,-3.6);marker.rotation.x=Math.PI/2;marker.userData={baseY:1.09,phase:index*.9};group.add(marker);stops.push({stop,group,marker,routeBoard,sign,pole})}
  const shuttle=new THREE.Group();shuttle.name='coast-shuttle-vehicle';transitRoot.add(shuttle);const body=box(shuttle,'coast-shuttle-body',[8,2.4,3.2],[0,2.25,0],physical(0x1e6d85,.3,.5)),lower=box(shuttle,'coast-shuttle-lower-body',[8.3,.85,3.35],[0,1.25,0],physical(0x12232b,.38,.56));for(const side of[-1,1]){const window=box(shuttle,'coast-shuttle-window',[5.2,1.15,.08],[0,2.65,side*1.65],glass);window.castShadow=false;for(const x of[-3,3]){const wheel=cylinder(shuttle,'coast-shuttle-wheel',.58,.34,[x,.86,side*1.7],physical(0x121619,.68,.12),14);wheel.rotation.x=Math.PI/2}}box(shuttle,'coast-shuttle-route-band',[5.5,.24,.08],[0,3.55,1.71],physical(CITY_TRANSIT.accent,.26,.18,CITY_TRANSIT.accent));const door=box(shuttle,'coast-shuttle-door',[1.35,1.9,.1],[2.15,2.05,1.72],physical(0x18343e,.25,.38,CITY_TRANSIT.accent)),driverHead=new THREE.Mesh(INTERIOR_PERSON_GEOMETRY.head,physical(0xc68642,.76,.01));driverHead.name='coast-shuttle-driver';driverHead.scale.setScalar(.72);driverHead.position.set(3.05,2.65,.55);shuttle.add(driverHead);const headlights=[];for(const side of[-1,1]){const lamp=box(shuttle,'coast-shuttle-headlamp',[.12,.28,.38],[4.18,1.65,side*1.05],physical(0xffe4b0,.18,.16,0xffd68a));lamp.material.emissiveIntensity=.3;headlights.push(lamp)}transitRoot.userData={stops,shuttle,door,headlights,body,lower,qualityTier:'coast-shuttle-transit-v1'};return transitRoot;
}
function animateCityTransitWorld(root,time,focus){
  const hour=((Number(focus?.hour)||0)%24+24)%24,vehicle=cityTransitVehiclePosition(hour),{operating,eastbound,x,z}=vehicle,dark=hour>=19||hour<6,{stops,shuttle,door,headlights}=root.userData;let visibleStops=0,nearestStop=null;
  for(const visual of stops){const range=focus?Math.hypot(focus.x-visual.stop.spot.x,focus.z-visual.stop.spot.z):0,visible=!focus||range<245,status=cityTransitStatus(visual.stop.id,hour);visual.group.visible=visible;if(visible)visibleStops++;visual.marker.visible=visible&&focus?.mode==='foot';visual.marker.rotation.z=time*.48+visual.marker.userData.phase;visual.marker.position.y=visual.marker.userData.baseY+Math.sin(time*2.3+visual.marker.userData.phase)*.045;visual.marker.material.opacity=status.available?.6:.22;visual.sign.material.emissiveIntensity=(status.available?.55:.08)+(dark?.5:0);if(!nearestStop||range<nearestStop.range)nearestStop={stop:visual.stop,status,range}}
  const shuttleRange=focus?Math.hypot(focus.x-x,focus.z-z):0;shuttle.visible=operating&&(!focus||shuttleRange<390);shuttle.position.set(x,1.02,z);shuttle.rotation.y=eastbound?0:Math.PI;const stopping=CITY_TRANSIT_STOPS.some(stop=>Math.abs(x-stop.spot.x)<11);door.material.emissiveIntensity=stopping?1.8:.16;for(const lamp of headlights)lamp.material.emissiveIntensity=dark?2.4:.22;document.body.dataset.cityTransitVehicle=shuttle.visible?(eastbound?'eastbound':'westbound'):'off-service';document.body.dataset.cityTransitStops=`${visibleStops}/${stops.length}`;document.body.dataset.cityTransitBoarding=stopping?'approaching-stop':'en-route';document.body.dataset.cityTransitNext=nearestStop?.status.available?`${nearestStop.stop.id}@${nearestStop.status.nextDeparture.toFixed(2)}`:`${nearestStop?.stop.id||'none'}@06.00`;return{operating,visibleStops,stopping};
}

export function buildCityLifeWorld(scene){
  const exteriorRoot=new THREE.Group();exteriorRoot.name='city-life-exteriors';scene.add(exteriorRoot);const portals=[];
  CITY_FACILITIES.forEach((facility,index)=>{addStorefront(exteriorRoot,facility,index);portals.push(facility.exterior)});
  const infillDistrict=addStorefrontInfillDistrict(exteriorRoot);
  const crossingRoot=addCityCrosswalks(exteriorRoot);
  const streetLightingRoot=addCityStreetLighting(exteriorRoot);
  const marinaDock=addMarinaDock(exteriorRoot);
  const eastWaterfrontPlaza=addEastWaterfrontPlaza(exteriorRoot);
  const cityTransitWorld=addCityTransitWorld(exteriorRoot);
  const dockMarker=addPortalMarker(exteriorRoot,CITY_DOCK.shore.x,CITY_DOCK.shore.z,0x74ebff);dockMarker.name='life-dock-marker';
  const interiors=new Map();for(const facility of CITY_FACILITIES){const root=new THREE.Group();root.name=`city-life-interior-${facility.id}`;root.visible=false;furnishInterior(root,facility);scene.add(root);interiors.set(facility.id,root)}
  document.body.dataset.cityLifeWorld='golden-coast-nine-facilities-v5';document.body.dataset.cityStorefrontDetail='premium-nearfield-v5';document.body.dataset.cityArchitecture='layered-coastal-architecture-v1';document.body.dataset.cityInfillDistrict='mixed-use-service-corridor-v1';document.body.dataset.cityInteriorDetail='layered-interior-v5';document.body.dataset.cityCollision='street-and-interior-furniture-v2';let serviceFocus=null;
  return{
    exteriorRoot,interiors,dockMarker,streetLightingRoot,crossingRoot,marinaDock,eastWaterfrontPlaza,cityTransitWorld,infillDistrict,
    setInterior(id){for(const [key,root] of interiors)root.visible=key===id},
    hideInteriors(){for(const root of interiors.values())root.visible=false},
    focusService(name,time,duration=2.8){serviceFocus={name,until:time+duration}},
    focusKiosk(id,time,duration=2.8){eastWaterfrontPlaza.userData.kioskServiceFocus={id,until:time+duration};document.body.dataset.cityKioskService=id},
    animate(time,focus=null){
      let openCount=0,programSigns=0,featuredProgramSigns=0,architectureBuildings=0,architectureWindows=0,architectureLitWindows=0,rooftopEquipment=0,fireEscapes=0,programDay=Math.max(1,Math.floor(focus?.day||1));if(focus)for(const group of exteriorRoot.children){const position=group.userData.facilityPosition,nodes=group.userData.nearfieldNodes;if(!position||!nodes)continue;const distance=Math.hypot(focus.x-position.x,focus.z-position.z),nearVisible=distance<205;for(const node of nodes)node.visible=nearVisible;const architecture=animateStorefrontArchitecture(group,time,{hour:focus.hour,distance});if(architecture.visible){architectureBuildings++;architectureWindows+=architecture.windows;architectureLitWindows+=architecture.litWindows;rooftopEquipment+=architecture.rooftopEquipment;fireEscapes+=architecture.fireEscapes}const facility=CITY_FACILITIES.find(item=>item.id===group.userData.facilityId),status=facilityOperatingStatus(group.userData.facilityId,focus.hour),night=focus.hour>=19||focus.hour<6;group.userData.open=status.open;if(status.open)openCount++;group.userData.storefrontLight.intensity=status.open?(night?9:5.5):.2;group.userData.storefrontSign.material.color.setScalar(status.open?1:.22);group.userData.storefrontGlass.material.emissiveIntensity=status.open?(night?.24:.12):.004;group.userData.portal.material.color.setHex(status.open?facility.accent:0xff6659);group.userData.portal.material.opacity=status.open?.78:.3;const programSign=group.userData.storefrontProgramSign;if(programSign){programSigns++;if(group.userData.programDay!==programDay){const nextMap=venueProgramTexture(facility,programDay),previousMap=programSign.material.map;programSign.material.map=nextMap;programSign.material.needsUpdate=true;previousMap?.dispose();group.userData.programDay=nextMap?.userData.day||programDay;group.userData.programId=nextMap?.userData.programId||''}programSign.visible=nearVisible;group.userData.storefrontProgramFrame.visible=nearVisible;programSign.material.color.setScalar(status.open?1:.18);programSign.scale.y=status.open?1+Math.sin(time*1.7+position.x)*.018:1;if(status.open&&nearVisible)featuredProgramSigns++}}
      document.body.dataset.facilityOpenCount=String(openCount);document.body.dataset.cityProgramSigns=String(programSigns);document.body.dataset.cityFeaturedPrograms=String(featuredProgramSigns);document.body.dataset.cityProgramDay=String(programDay);document.body.dataset.cityArchitectureBuildings=String(architectureBuildings);document.body.dataset.cityArchitectureWindows=String(architectureWindows);document.body.dataset.cityArchitectureLitWindows=String(architectureLitWindows);document.body.dataset.cityRooftopEquipment=String(rooftopEquipment);document.body.dataset.cityFireEscapes=String(fireEscapes);
      animateCityCrosswalks(crossingRoot,time);
      animateCityStreetLighting(streetLightingRoot,focus);
      animateMarinaDock(marinaDock,time,focus);
      animateEastWaterfrontPlaza(eastWaterfrontPlaza,time,focus);
      animateCityTransitWorld(cityTransitWorld,time,focus);
      animateStorefrontInfill(infillDistrict,time,focus);
      exteriorRoot.traverse(node=>{if(node.name==='life-portal-marker'){node.rotation.z=time*.42;node.position.y=node.userData.baseY+Math.sin(time*2.2+node.position.x)*.08}});
      let serviceActors=0,serviceStaff=0,queueActors=0,serviceFaces=0,serviceBlinks=0,talkingFaces=0;for(const root of interiors.values())if(root.visible){const service=animateInteriorPeople(root,time,serviceFocus);serviceActors+=service.actors;serviceStaff+=service.staff;queueActors+=service.queue;serviceFaces+=service.facialActors;serviceBlinks+=service.blinking;talkingFaces+=service.talkingFaces;root.traverse(node=>{if(node.name==='life-action-marker'||node.name==='life-exit-marker'){node.rotation.z=time*.55;node.material.opacity=.46+Math.sin(time*3+node.userData.phase)*.16}else if(node.name==='nightlife-light'){node.intensity=13+Math.sin(time*4.2+node.userData.phase)*7}})}document.body.dataset.facilityServiceActors=String(serviceActors);document.body.dataset.facilityServiceStaff=String(serviceStaff);document.body.dataset.facilityQueueActors=String(queueActors);document.body.dataset.facilityServiceFaces=String(serviceFaces);document.body.dataset.facilityServiceBlinks=String(serviceBlinks);document.body.dataset.facilityTalkingFaces=String(talkingFaces);document.body.dataset.facilityServiceFocus=serviceFocus&&time<serviceFocus.until?serviceFocus.name:'';
    },
  };
}

export const FOOT_LIFESTYLE_PROP_ACTIONS=Object.freeze({
  sleep:'pillow',watch_tv:'remote',wait_hour:'phone',wait_morning:'phone',wait_evening:'phone',shower:'towel',
  home_meal:'meal',breakfast:'meal',seafood_bowl:'meal',chef_course:'meal',snack:'meal',coffee:'cup',mocktail:'cup',
  groceries:'grocery-bag',deposit_1000:'bank-card',deposit_5000:'bank-card',withdraw_1000:'bank-card',withdraw_5000:'bank-card',
  live_music:'glow-sticks',dance:'glow-sticks',cardio:'dumbbells',strength:'dumbbells',stretch:'towel',plaza_rest:'phone',plaza_performance:'glow-sticks',plaza_view:'phone',
  dockside_flat_white:'cup',salted_caramel_cold_brew:'cup',citrus_tonic_coffee:'cup',harbor_sun_kit:'grocery-bag',waterproof_postcards:'phone',angler_trail_pack:'grocery-bag',grilled_mackerel_wrap:'meal',spicy_squid_cup:'meal',tide_market_noodles:'meal',
  delivery_carry:'delivery-box',
});
function footPropRoot(hand,name,position=[0,-.12,-.08],rotation=[0,0,0]){
  if(!hand)return null;const group=new THREE.Group();group.name=name;group.position.set(...position);group.rotation.set(...rotation);group.visible=false;group.userData.footGeneratedRoot=true;hand.add(group);return group;
}
function footPropMesh(root,name,geometry,material,position=[0,0,0],rotation=[0,0,0]){
  if(!root)return null;const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.footGenerated=true;root.add(mesh);return mesh;
}
function buildFootLifestyleProps(bones){
  const left=bones['hand.L'],right=bones['hand.R'],ceramic=new THREE.MeshStandardMaterial({color:0xe8edf0,roughness:.34,metalness:.02}),paper=new THREE.MeshStandardMaterial({color:0xc79b5b,roughness:.86,metalness:0}),dark=new THREE.MeshStandardMaterial({color:0x172127,roughness:.44,metalness:.18}),metal=new THREE.MeshStandardMaterial({color:0x5b6870,roughness:.26,metalness:.68}),fabric=new THREE.MeshStandardMaterial({color:0x83c8c7,roughness:.93,metalness:0}),screen=new THREE.MeshStandardMaterial({color:0x152735,roughness:.16,metalness:.14,emissive:0x2b8ca8,emissiveIntensity:.48}),neonA=new THREE.MeshStandardMaterial({color:0x74e8ff,roughness:.24,metalness:.04,emissive:0x42d8ff,emissiveIntensity:2.1}),neonB=new THREE.MeshStandardMaterial({color:0xff79d1,roughness:.24,metalness:.04,emissive:0xff42b7,emissiveIntensity:2}),props={};
  const mealLeft=footPropRoot(left,'foot-lifestyle-prop-meal-left',[0,-.1,-.12],[.1,0,.08]);footPropMesh(mealLeft,'foot-prop-meal-bowl',new THREE.CylinderGeometry(.13,.17,.075,18),ceramic);footPropMesh(mealLeft,'foot-prop-meal-rim',new THREE.TorusGeometry(.145,.018,8,20),ceramic,[0,.043,0],[Math.PI/2,0,0]);footPropMesh(mealLeft,'foot-prop-meal-food',new THREE.SphereGeometry(.105,14,8),new THREE.MeshStandardMaterial({color:0xd58c4c,roughness:.82}),[0,.045,0]);
  const mealRight=footPropRoot(right,'foot-lifestyle-prop-meal-right',[0,-.12,-.08],[0,0,-.12]);footPropMesh(mealRight,'foot-prop-meal-utensil',new THREE.BoxGeometry(.025,.31,.018),metal,[0,-.03,0]);
  props.meal=[mealLeft,mealRight].filter(Boolean);
  const cup=footPropRoot(right,'foot-lifestyle-prop-cup',[0,-.11,-.09],[0,0,-.05]);footPropMesh(cup,'foot-prop-cup-body',new THREE.CylinderGeometry(.065,.055,.18,14),ceramic);footPropMesh(cup,'foot-prop-cup-lid',new THREE.CylinderGeometry(.071,.071,.018,14),dark,[0,.098,0]);footPropMesh(cup,'foot-prop-cup-straw',new THREE.CylinderGeometry(.008,.008,.21,7),neonA,[.025,.19,0],[.12,0,.08]);props.cup=[cup].filter(Boolean);
  const bag=footPropRoot(left,'foot-lifestyle-prop-grocery-bag',[0,-.28,-.05],[0,0,.04]);footPropMesh(bag,'foot-prop-grocery-bag-body',new THREE.BoxGeometry(.34,.38,.19),paper,[0,-.16,0]);footPropMesh(bag,'foot-prop-grocery-bag-handle',new THREE.TorusGeometry(.105,.014,7,18),paper,[0,.07,0],[Math.PI/2,0,0]);footPropMesh(bag,'foot-prop-grocery-produce',new THREE.SphereGeometry(.075,10,7),new THREE.MeshStandardMaterial({color:0x71a86a,roughness:.9}),[.08,.045,0]);props['grocery-bag']=[bag].filter(Boolean);
  const card=footPropRoot(right,'foot-lifestyle-prop-bank-card',[0,-.12,-.08],[-.12,.18,.32]);footPropMesh(card,'foot-prop-bank-card-body',new THREE.BoxGeometry(.21,.012,.13),new THREE.MeshStandardMaterial({color:0x4c8de8,roughness:.28,metalness:.16}));footPropMesh(card,'foot-prop-bank-card-chip',new THREE.BoxGeometry(.045,.018,.038),new THREE.MeshStandardMaterial({color:0xe8c26b,roughness:.28,metalness:.68}),[-.045,.012,0]);props['bank-card']=[card].filter(Boolean);
  const towel=footPropRoot(right,'foot-lifestyle-prop-towel',[0,-.2,-.08],[0,0,.12]);footPropMesh(towel,'foot-prop-towel-cloth',new THREE.BoxGeometry(.32,.46,.035),fabric,[0,-.18,0]);props.towel=[towel].filter(Boolean);
  const remote=footPropRoot(right,'foot-lifestyle-prop-remote',[0,-.13,-.08],[0,.16,.18]);footPropMesh(remote,'foot-prop-remote-body',new THREE.BoxGeometry(.085,.24,.045),dark);for(let index=0;index<3;index++)footPropMesh(remote,'foot-prop-remote-button',new THREE.SphereGeometry(.012,7,5),index===0?neonB:ceramic,[0,.065-index*.052,.027]);props.remote=[remote].filter(Boolean);
  const phone=footPropRoot(right,'foot-lifestyle-prop-phone',[0,-.13,-.08],[0,.08,.12]);footPropMesh(phone,'foot-prop-phone-body',new THREE.BoxGeometry(.105,.22,.026),dark);footPropMesh(phone,'foot-prop-phone-screen',new THREE.BoxGeometry(.087,.17,.009),screen,[0,.006,.018]);props.phone=[phone].filter(Boolean);
  const pillow=footPropRoot(left,'foot-lifestyle-prop-pillow',[.05,-.12,-.19],[.08,0,-.08]);footPropMesh(pillow,'foot-prop-pillow-body',new THREE.BoxGeometry(.46,.18,.34),new THREE.MeshStandardMaterial({color:0xdbe5e4,roughness:.96}),[.02,-.06,0]);props.pillow=[pillow].filter(Boolean);
  const dumbbells=[];for(const [hand,side] of [[left,-1],[right,1]]){const weight=footPropRoot(hand,`foot-lifestyle-prop-dumbbell-${side<0?'left':'right'}`,[0,-.12,-.08],[0,0,Math.PI/2]);footPropMesh(weight,'foot-prop-dumbbell-grip',new THREE.CylinderGeometry(.025,.025,.28,9),dark);for(const y of[-.17,.17]){footPropMesh(weight,'foot-prop-dumbbell-plate',new THREE.CylinderGeometry(.085,.085,.045,12),metal,[0,y,0]);footPropMesh(weight,'foot-prop-dumbbell-collar',new THREE.CylinderGeometry(.045,.045,.04,10),neonA,[0,y+(y<0?.04:-.04),0])}if(weight)dumbbells.push(weight)}props.dumbbells=dumbbells;
  const glow=[];for(const [hand,side,material] of [[left,-1,neonA],[right,1,neonB]]){const stick=footPropRoot(hand,`foot-lifestyle-prop-glow-stick-${side<0?'left':'right'}`,[0,-.12,-.08],[0,0,side*.12]);footPropMesh(stick,'foot-prop-glow-stick',new THREE.CylinderGeometry(.018,.018,.31,8),material);if(stick)glow.push(stick)}props['glow-sticks']=glow;
  const deliveryBox=footPropRoot(left,'foot-lifestyle-prop-delivery-box',[.21,-.2,-.19],[.08,-.08,.03]);footPropMesh(deliveryBox,'foot-prop-delivery-box-body',new THREE.BoxGeometry(.48,.34,.39),paper,[0,-.12,0]);footPropMesh(deliveryBox,'foot-prop-delivery-box-tape',new THREE.BoxGeometry(.085,.346,.398),new THREE.MeshStandardMaterial({color:0x61b8c5,roughness:.48,metalness:.04}),[0,-.12,0]);footPropMesh(deliveryBox,'foot-prop-delivery-box-label',new THREE.BoxGeometry(.2,.012,.13),ceramic,[.1,.056,-.03],[-Math.PI/2,0,.08]);props['delivery-box']=[deliveryBox].filter(Boolean);
  return props;
}
function setFootLifestyleProp(root,actionId){
  const props=root?.userData?.lifestyleProps;if(!props)return;const active=FOOT_LIFESTYLE_PROP_ACTIONS[actionId]||'none';if(root.userData.activeLifestyleProp===active)return;for(const [id,groups] of Object.entries(props))for(const group of groups)group.visible=id===active;root.userData.activeLifestyleProp=active;document.body.dataset.footLifestyleProp=active;document.body.dataset.footLifestyleAction=actionId||'none';
}
export function disposeFootAvatarEnhancements(root){
  if(!root)return 0;const meshes=[],groups=[];root.traverse(node=>{if(node.userData?.footGenerated)meshes.push(node);if(node.userData?.footGeneratedRoot)groups.push(node)});const geometries=new Set(),materials=new Set();for(const mesh of meshes){if(mesh.geometry)geometries.add(mesh.geometry);for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material)materials.add(material);mesh.parent?.remove(mesh)}for(const group of groups)group.parent?.remove(group);for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();if(root.userData){root.userData.lifestyleProps={};root.userData.activeLifestyleProp='none'}document.body.dataset.footLifestyleProp='none';document.body.dataset.footEnhancementDisposals=String(meshes.length);return meshes.length;
}
export function prepareFootAvatar(root){
  const bones={},base={};root.traverse(node=>{if(['upperArm.L','upperArm.R','foreArm.L','foreArm.R','hand.L','hand.R','upperLeg.L','upperLeg.R','lowerLeg.L','lowerLeg.R','boot.L','boot.R','spine','chest','neck','head'].includes(node.name)){bones[node.name]=node;base[node.name]=node.rotation.clone()}if(node.isMesh||node.isSkinnedMesh){node.castShadow=true;node.receiveShadow=true}});const eyelids=[],head=bones.head,premiumFace=root.getObjectByName('head-anatomy'),skinSource=premiumFace||root.getObjectByName('skull');if(head&&skinSource?.material){const premium=Boolean(premiumFace),skin=skinSource.material.clone(),eyeX=premium?.088:.142,eyeY=premium?.085:.043,eyeZ=premium?-.282:-.407,geometry=new THREE.SphereGeometry(premium?.052:.055,12,8);for(const side of[-1,1]){const lid=new THREE.Mesh(geometry,skin);lid.name=`foot-eyelid-${side}`;lid.position.set(side*eyeX,eyeY,eyeZ);lid.scale.set(1,.08,.34);lid.userData.baseY=eyeY;lid.userData.footGenerated=true;lid.castShadow=false;head.add(lid);eyelids.push(lid)}}
  root.userData.footRig={bones,base,walkPhase:0,eyelids,blinkSeed:(root.name.length||3)*.37};root.userData.lifestyleProps=buildFootLifestyleProps(bones);root.userData.activeLifestyleProp='none';document.body.dataset.footFacialRig=eyelids.length===2?'eyelids-head-gaze-v1':'head-gaze-v1';document.body.dataset.footLifestyleProps='eleven-context-prop-groups-v1';return root;
}
export function animateFootAvatar(root,{time=0,speed=0,running=false,action=null,actionId=null}={}){
  if(!root?.userData?.footRig)return;const {bones,base,eyelids,blinkSeed}=root.userData.footRig,moving=Math.abs(speed)>.08,pace=running?9.2:6.2,stride=moving?Math.sin(time*pace)*(running?.72:.48):0,bob=moving?Math.abs(Math.sin(time*pace))*(running?.08:.045):0;
  setFootLifestyleProp(root,actionId);
  root.userData.footBob=bob;
  for(const [name,bone] of Object.entries(bones)){const rest=base[name];bone.rotation.copy(rest);if(name==='upperLeg.L')bone.rotation.x+=stride;if(name==='upperLeg.R')bone.rotation.x-=stride;if(name==='lowerLeg.L')bone.rotation.x+=Math.max(0,-stride)*.72;if(name==='lowerLeg.R')bone.rotation.x+=Math.max(0,stride)*.72;if(name==='upperArm.L')bone.rotation.x-=stride*.62;if(name==='upperArm.R')bone.rotation.x+=stride*.62;if(name==='foreArm.L'||name==='foreArm.R')bone.rotation.x+=moving?.18:.08;if(name==='spine'||name==='chest')bone.rotation.z+=Math.sin(time*pace*.5)*(moving?.025:.008);if(name==='neck')bone.rotation.y+=Math.sin(time*(moving?.52:.34)+blinkSeed)*.035;if(name==='head'){bone.rotation.y+=Math.sin(time*(moving?.61:.39)+blinkSeed)*(.045+(action?.035:.075));bone.rotation.x+=action==='rest'?.08:running?-.025:Math.sin(time*.47+blinkSeed)*.012}}
  const blink=Math.pow(Math.max(0,Math.sin(time*.67+blinkSeed)),32);for(const lid of eyelids){lid.scale.y=.08+blink*.86;lid.position.y=lid.userData.baseY-blink*.006}document.body.dataset.footBlink=blink.toFixed(2);document.body.dataset.footGaze=(bones.head?.rotation.y||0).toFixed(3);
  if(action){const pulse=Math.sin(time*5.2),left=bones['upperArm.L'],right=bones['upperArm.R'],foreLeft=bones['foreArm.L'],foreRight=bones['foreArm.R'],spine=bones.spine,chest=bones.chest;if(action==='rest'){if(spine)spine.rotation.x+=.24;if(chest)chest.rotation.x+=.12;if(left)left.rotation.x+=.18;if(right)right.rotation.x+=.18}if(action==='meal'||action==='shop'||action==='transact'){if(right)right.rotation.x-=.82+pulse*.08;if(foreRight)foreRight.rotation.x-=.74;if(left)left.rotation.x-=action==='transact'?.52:.22;if(foreLeft)foreLeft.rotation.x-=action==='transact'?.48:.12}if(action==='delivery'){if(spine)spine.rotation.x-=.045;if(chest)chest.rotation.x-=.035;if(left){left.rotation.x-=.74;left.rotation.z+=.2}if(right){right.rotation.x-=.74;right.rotation.z-=.2}if(foreLeft)foreLeft.rotation.x-=.62;if(foreRight)foreRight.rotation.x-=.62}if(action==='transit'){if(spine)spine.rotation.x+=.16;if(chest)chest.rotation.x+=.08;if(left){left.rotation.x-=.42;left.rotation.z+=.18}if(right){right.rotation.x-=.42;right.rotation.z-=.18}if(foreLeft)foreLeft.rotation.x-=.52;if(foreRight)foreRight.rotation.x-=.52}if(action==='leisure'){if(left)left.rotation.z+=.34+pulse*.22;if(right)right.rotation.z-=.34+pulse*.22;if(spine)spine.rotation.z+=pulse*.12}if(action==='train'){if(left){left.rotation.x-=.55;left.rotation.z+=.45}if(right){right.rotation.x-=.55;right.rotation.z-=.45}if(foreLeft)foreLeft.rotation.x-=.72+pulse*.2;if(foreRight)foreRight.rotation.x-=.72+pulse*.2;if(chest)chest.rotation.x-=.08}if(action==='refresh'){if(left)left.rotation.x-=1.05;if(right)right.rotation.x-=1.05;if(foreLeft)foreLeft.rotation.x-=.48;if(foreRight)foreRight.rotation.x-=.48}}
}
