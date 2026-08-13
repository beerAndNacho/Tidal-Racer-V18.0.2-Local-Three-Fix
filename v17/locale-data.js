import { RIDERS, CRAFTS, SKILLS, ITEMS, EVENTS } from '../data-v12.js';
import { RARITIES, SEASON, CONTRACTS, COLLECTIONS, TITLES, GHOST_RIVALS } from '../systems-v13.js';
import { getCharacterProfile } from '../v16/character-catalog.js';

const LANGUAGE_KEY = 'tidal-racer-language';
const SUPPORTED = new Set(['ko', 'en']);
const q = (selector) => document.querySelector(selector);

const UI = {
  ko: {
    title: 'Tidal Racer V17 — 한국어 / English',
    eyebrow: 'V17 · 한국어 / ENGLISH · 거친 파도 · 캐릭터 심화',
    hero: '한국어와 영어를 게임 안에서 즉시 전환할 수 있는 버전. 과노출을 줄인 시네마틱 화면, 실제로 출렁이는 파도, 16명의 개성 있는 라이더, 적응형 BGM과 아이템·시즌·컬렉션 시스템을 하나의 오픈월드 수상 레이싱 경험으로 연결했다.',
    position: '순위', lap: '랩', credits: '크레딧', level: '레벨', reputation: '평판',
    item: '아이템 · E', empty: '없음', itemHint: '아이템 부표를 획득하세요', worldEvent: '월드 이벤트',
    speed: '속도', race: '레이스', freeRoam: '자유주행', rider: '라이더', craft: '제트스키',
    shop: '상점', inventory: '인벤토리', fish: '물고기 도감', fishing: '낚시', contracts: '계약', collection: '컬렉션', profile: '프로필',
    market: '거래소', rivals: '라이벌', skills: '스킬', events: '이벤트',
    start: '오픈 아키펠라고 입장', balanced: '균형', ultra: '울트라',
    controls: '조작법', throttle: '가속', brake: '감속 / 후진', left: '왼쪽', right: '오른쪽',
    drift: '드리프트', boost: '부스트', skill: '스킬', camera: '카메라', music: '음악', language: '언어',
    modeHint: 'F · 자유주행 / 레이스 전환 · L · 언어', affinity: '친밀도', studio: '캐릭터 스튜디오',
    buy: '구매', sell: '판매', equip: '장착', claim: '수령', done: '완료', owned: '보유', equipped: '장착 중',
    listed: '판매 등록', reward: '보상', rating: '레이팅', slot: '슬롯', made: '한정 제작',
    daily: '일일', weekly: '주간', discovered: '발견', acquired: '획득', purchased: '구매 완료',
    equippedToast: '장착', raceComplete: '레이스 완료', contractComplete: '계약 완료', titleUnlocked: '칭호 해금',
    marketPurchase: '거래소 구매', quality: '그래픽 품질', itemEmpty: '아이템 없음',
    languageChanged: '언어 · 한국어', wins: '승', streak: '연승', noShowcase: '쇼케이스 없음',
  },
  en: {
    title: 'Tidal Racer V17 — Korean / English',
    eyebrow: 'V17 · KOREAN / ENGLISH · ROUGH WATER · CHARACTER DEPTH',
    hero: 'A bilingual open-world water-racing build with instant Korean and English switching. Reduced glare, physically animated swell, 16 distinctive riders, adaptive music, items, seasons and collection systems now operate as one coherent experience.',
    position: 'POSITION', lap: 'LAP', credits: 'CREDITS', level: 'LEVEL', reputation: 'REP',
    item: 'ITEM · E', empty: 'EMPTY', itemHint: 'Collect an item buoy', worldEvent: 'WORLD EVENT',
    speed: 'SPEED', race: 'RACE', freeRoam: 'FREE ROAM', rider: 'RIDER', craft: 'JET SKI',
    shop: 'SHOP', inventory: 'INVENTORY', fish: 'FISH CODEX', fishing: 'FISHING', contracts: 'CONTRACTS', collection: 'COLLECTION', profile: 'PROFILE',
    market: 'MARKET', rivals: 'RIVALS', skills: 'SKILLS', events: 'EVENTS',
    start: 'ENTER OPEN ARCHIPELAGO', balanced: 'BALANCED', ultra: 'ULTRA',
    controls: 'CONTROLS', throttle: 'Throttle', brake: 'Brake / Reverse', left: 'Left', right: 'Right',
    drift: 'Drift', boost: 'Boost', skill: 'Skill', camera: 'Camera', music: 'Music', language: 'Language',
    modeHint: 'F · FREE ROAM / RACE · L · LANGUAGE', affinity: 'AFFINITY', studio: 'CHARACTER STUDIO',
    buy: 'BUY', sell: 'SELL', equip: 'EQUIP', claim: 'CLAIM', done: 'DONE', owned: 'OWNED', equipped: 'EQUIPPED',
    listed: 'LISTED', reward: 'REWARD', rating: 'RATING', slot: 'SLOT', made: 'MADE',
    daily: 'DAILY', weekly: 'WEEKLY', discovered: 'DISCOVERED', acquired: 'ACQUIRED', purchased: 'PURCHASED',
    equippedToast: 'EQUIPPED', raceComplete: 'RACE COMPLETE', contractComplete: 'CONTRACT COMPLETE', titleUnlocked: 'TITLE UNLOCKED',
    marketPurchase: 'MARKET PURCHASE', quality: 'QUALITY', itemEmpty: 'ITEM EMPTY',
    languageChanged: 'LANGUAGE · ENGLISH', wins: 'wins', streak: 'streak', noShowcase: 'NO SHOWCASE',
  },
};

UI.ko.modeHint='F · 자유주행 / 레이스 · H · 월드 활동 · L · 언어';
UI.en.modeHint='F · FREE ROAM / RACE · H · WORLD ACTIVITY · L · LANGUAGE';

const REGION_KO = {
  'GOLDEN COAST': '골든 코스트', 'VOLCANO BAY': '볼케이노 베이', 'MANGROVE DELTA': '맹그로브 델타',
  'HARBOR CITY': '하버 시티', 'STORM STRAIT': '스톰 스트레이트', 'CORAL EXPANSE': '코럴 익스팬스',
  'MOON ARCHIPELAGO': '문 아키펠라고', 'BLACK REEF': '블랙 리프', 'SKYWATER LAGOON': '스카이워터 라군',
};
const SEA_KO = { SHELTERED: '잔잔함', ROLLING: '출렁임', ROUGH: '거친 파도', HEAVY: '강한 너울' };
const STYLE_KO = { BALANCED:'균형', AGGRESSIVE:'공격', TECHNICAL:'테크니컬', DRIFT:'드리프트', TANK:'중량', BOOST:'부스트', WAVE:'파도', ITEM:'아이템', SPRINT:'스프린트', DEFENSE:'방어', PRECISION:'정밀', CHAOS:'변칙', AERIAL:'공중', CURRENT:'해류', CONTROL:'컨트롤', HUNTER:'추격' };
const PASSIVE_KO = { 'FLOW STATE':'플로우 스테이트', REDLINE:'레드라인', 'LATE APEX':'레이트 에이펙스', 'DEEP SLIDE':'딥 슬라이드', 'HEAVY HULL':'헤비 헐', AFTERBURN:'애프터번', 'WAVE READER':'웨이브 리더', 'LUCKY DRAW':'럭키 드로우', 'LAUNCH CONTROL':'런치 컨트롤', AEGIS:'이지스', 'CLEAN WATER':'클린 워터', WILDCARD:'와일드카드', SKYLINE:'스카이라인', 'CURRENT SENSE':'커런트 센스', 'TIGHT LINE':'타이트 라인', 'LOCK ON':'록 온' };
const CRAFT_TYPE_KO = { BALANCED:'균형형', 'TOP SPEED':'최고속형', HANDLING:'핸들링형', STABLE:'안정형', DRIFT:'드리프트형', BOOST:'부스트형', ENDURANCE:'지구력형', STEALTH:'스텔스형', WAVE:'파도형', SPRINT:'스프린트형' };
const RARITY_KO = { common:'일반', rare:'희귀', epic:'영웅', legendary:'전설', mythic:'신화' };
const GEAR_KO = { technical:'기술형', 'street-armored':'스트리트 아머', 'minimal-tech':'미니멀 테크', 'drift-layered':'드리프트 레이어', 'armored-vest':'중장갑 조끼', 'speed-shell':'스피드 셸', 'ocean-vest':'오션 베스트', 'utility-tech':'유틸리티 테크', 'sprint-vest':'스프린트 베스트', guardian:'가디언', precision:'프리시전', asymmetric:'비대칭 기어', aerial:'에어리얼', 'current-vest':'커런트 베스트', 'couture-tech':'쿠튀르 테크', hunter:'헌터' };
const POSE_KO = { salute:'경례', fist:'주먹 세리머니', point:'포인트', wave:'손 흔들기', chest:'가슴 두드리기', 'double-fist':'양팔 승리', crossed:'팔짱', dance:'댄스' };

const ITEM_EN = [
  ['Attack','Homing projectile that tracks the racer ahead.'], ['Defense','A shield that blocks one incoming hit.'], ['Boost','A short burst of powerful acceleration.'],
  ['Disrupt','Disables nearby rivals for a moment.'], ['Trap','Drops a wake mine behind the craft.'], ['Utility','Pulls nearby item buoys toward the rider.'],
  ['Recovery','Reduces the slowdown penalty after collisions.'], ['Defense','Breaks target lock for a short time.'], ['World','Creates a large wave in front of the rider.'],
  ['Strategy','Partially swaps position with the racer ahead.'], ['Disrupt','Slows an opponent’s steering response.'], ['Boost','Charges two consecutive turbo bursts.'],
  ['Pursuit','Accelerates toward the racer ahead.'], ['Defense','Redirects homing projectiles to a decoy.'], ['Boost','Restores 45 points of boost energy.'],
  ['Defense','Stabilizes the craft through rough water.'], ['Disrupt','Creates a dense spray cloud that blocks vision.'], ['World','Creates a small vortex zone on the water.'],
  ['Mobility','Lifts the bow and improves jump control.'], ['Disrupt','Pushes nearby rivals backward.'], ['Economy','Awards credits instantly.'],
  ['Utility','Strengthens the optimal racing-line guide.'], ['Utility','Reveals world-event locations.'], ['Trap','Drops a slowing anchor buoy.'],
  ['Defense','Creates a foam wall behind the craft.'], ['Boost','Partially refreshes skill cooldowns.'], ['Economy','Grants a harbor-shop discount.'],
  ['Mobility','Reduces speed loss while drifting.'], ['Attack','A projectile specialized in breaking shields.'], ['Strategy','Temporarily weakens collision detection.'],
];
const SKILL_EN = [
  'Gain instant thrust and ignore wake resistance for a moment.', 'Reduce wave impact and vertical instability for a short time.',
  'Reduce the propulsion of nearby rivals.', 'Gain extra acceleration while riding in a rival’s wake.',
  'Block one incoming item hit.', 'Ignore cross-current and steering resistance temporarily.',
  'Pull the craft toward the nearest racer ahead.', 'Reveal item and event locations while restoring boost.',
];
const EVENT_EN = [
  'Swell grows across every region and boost charging increases.', 'A cargo-escort route opens in Harbor City.',
  'Strong crosswinds and rain form over Storm Strait.', 'Pass consecutive bonus buoys to earn credits.',
  'A golden item buoy appears on the world map.', 'A massive swell crosses Volcano Bay.',
  'Moon Archipelago shops offer temporary discounts.', 'Reach rescue points around a wreck before time expires.',
  'A timed sprint begins through the city canals.', 'The cross-current in Mangrove Delta reverses direction.',
  'Rare crates appear around Black Reef.', 'Jump rings and bonus gates appear in Skywater Lagoon.',
];
const EVENT_NAME_KO = {
  'TIDAL SURGE':'타이달 서지', 'CARGO CONVOY':'화물선 호송', 'STORM CELL':'폭풍 전선', 'BUOY SPRINT':'부표 스프린트',
  'TREASURE WAKE':'보물 항적', 'ROGUE WAVE':'거대 너울', 'NIGHT MARKET':'야시장', 'RESCUE RUN':'구조 작전',
  'HARBOR RUSH':'항구 러시', 'CURRENT REVERSAL':'역방향 해류', 'BLACK REEF HUNT':'블랙 리프 사냥', 'SKYWATER FESTIVAL':'스카이워터 축제',
};
const CONTRACT_KO = {
  'OPEN WATER':'오픈 워터', 'SKILL CHAIN':'스킬 체인', 'SALVAGE ROUTE':'인양 루트', 'ISLAND HOPPER':'아일랜드 호퍼',
  'DEEP SLIDE':'딥 슬라이드', 'CUP RUNNER':'컵 러너', 'TAKE THE CROWN':'왕관 쟁탈',
};
const COLLECTION_KO = { 'SUNSET LEGACY':'선셋 레거시', 'BLACK TIDE':'블랙 타이드', 'VOLCANO CROWN':'볼케이노 크라운', 'MOON ARCHIPELAGO':'문 아키펠라고', 'ION CURRENT':'아이온 커런트' };
const TITLE_KO = { 'ROOKIE WAVE':'루키 웨이브', 'COAST RUNNER':'코스트 러너', 'ARCHIPELAGO ACE':'아키펠라고 에이스', 'STORM HUNTER':'스톰 헌터', 'TIDE LEGEND':'타이드 레전드', 'GOLDEN HOUR':'골든 아워', 'ABYSS RIDER':'어비스 라이더', 'MAGMA KING':'마그마 킹', 'LUNAR ACE':'루나 에이스', 'ION CHASER':'아이온 체이서' };

const RIDER_KO = {
  rhea:{origin:'서울 · 대한민국',role:'전술 팀장',tagline:'잔잔한 물결, 흔들림 없는 판단.',bio:'압박이 오기 전에 흐름을 읽는 침착한 팀 리더. 균형 잡힌 라인과 정교한 가속을 선호한다.'},
  kai:{origin:'로스앤젤레스 · 미국',role:'스트리트 스프린터',tagline:'먼저 밀어붙이고, 더 빠르게 빠져나간다.',bio:'폭발적인 출발과 위험한 추월을 즐기는 본능형 공격수. 핸들 앞으로 몸을 던지며 모든 틈을 노린다.'},
  sol:{origin:'바르셀로나 · 스페인',role:'라인 엔지니어',tagline:'속도는 곧 기하학이다.',bio:'완벽한 진입각에 집착하는 기술형 라이더. 조용하고 분석적이며 정밀한 코스에서 압도적이다.'},
  mina:{origin:'오사카 · 일본',role:'드리프트 아티스트',tagline:'항적 위에 나만의 서명을 남긴다.',bio:'모든 코너를 안무처럼 다룬다. 낮은 무게중심과 유연한 자세로 긴 슬라이드를 자연스럽게 이어간다.'},
  jax:{origin:'케이프타운 · 남아프리카공화국',role:'거친 바다 전문가',tagline:'파도가 먼저 움직이고, 나는 끝까지 버틴다.',bio:'거친 너울에서도 중심을 잃지 않는 강력한 지구력형 라이더. 체중과 선체 안정성으로 불가능한 라인을 지킨다.'},
  nari:{origin:'부산 · 대한민국',role:'부스트 스페셜리스트',tagline:'숨을 참고, 다음 순간 사라진다.',bio:'항구 레이싱 속에서 성장해 엔진 소리만으로 가속 타이밍을 읽는다. 가벼운 선체 운용과 날카로운 부스트가 강점이다.'},
  omar:{origin:'알렉산드리아 · 이집트',role:'파도 분석가',tagline:'물은 다음에 올 것을 먼저 말해준다.',bio:'너울과 바람의 결을 읽는다. 평소에는 안정적이지만 바다가 거칠어질수록 진가가 드러난다.'},
  yuna:{origin:'싱가포르',role:'아이템 전술가',tagline:'행운은 준비된 사람의 편이다.',bio:'타이밍과 아이템, 루트 판단으로 승부하는 시스템형 선수. 물 밖에서는 표현력이 풍부하고 레이스에서는 계산적이다.'},
  theo:{origin:'리우데자네이루 · 브라질',role:'런치 컨트롤',tagline:'첫 5초 안에 승부를 끝낸다.',bio:'스타트 라인을 위해 사는 운동형 라이더. 공격적인 체중 이동으로 폭발적인 출발과 과감한 회복을 만든다.'},
  amara:{origin:'라고스 · 나이지리아',role:'수비 팀장',tagline:'눈에 보이게 버티고, 끝까지 서 있어라.',bio:'인내심 있는 포지셔닝과 방어 도구로 공간을 통제한다. 중심이 안정적이고 좀처럼 흔들리지 않는다.'},
  ren:{origin:'밴쿠버 · 캐나다',role:'정밀 파일럿',tagline:'낭비되는 움직임은 없다.',bio:'입력이 깨끗하고 상체 움직임이 적은 미니멀 라이더. 압박 속에서도 일정한 주행을 유지한다.'},
  luz:{origin:'멕시코시티 · 멕시코',role:'와일드카드',tagline:'계획보다 본능이 빠르다.',bio:'리듬을 끊임없이 바꿔 상대의 실수를 유도한다. 비대칭 장비와 역동적인 자세로 존재감을 드러낸다.'},
  haneul:{origin:'제주 · 대한민국',role:'공중 기동 전문가',tagline:'가장 빠른 라인은 때로 수면 위에 있다.',bio:'해안 너울을 뛰어넘으며 성장했다. 긴 팔다리와 유연한 자세로 착수를 흡수하고 공중에서 방향을 바꾼다.'},
  mako:{origin:'오클랜드 · 뉴질랜드',role:'해류 사냥꾼',tagline:'바다와 싸우지 말고 이용하라.',bio:'서핑 감각과 기계적 절제를 결합한다. 횡류에서는 유연하게, 선체가 물을 잡는 순간에는 단단하게 움직인다.'},
  ivy:{origin:'런던 · 영국',role:'컨트롤 스페셜리스트',tagline:'라인을 지배하면 레이스를 지배한다.',bio:'패션 감각이 살아 있는 테크니컬 슈트를 입은 규율형 전술가. 자세가 작고 반응이 빠르다.'},
  zane:{origin:'두바이 · 아랍에미리트',role:'추격자',tagline:'표적을 정하고 거리를 지운다.',bio:'추격과 심리 압박에 특화된 라이더. 넓은 자세와 어두운 장비 때문에 실제보다 더 가까이 느껴진다.'},
};

const ORIGINAL = {
  items: ITEMS.map((x) => ({ category:x.category, desc:x.desc })),
  skills: SKILLS.map((x) => ({ desc:x.desc })),
  events: EVENTS.map((x) => ({ desc:x.desc })),
  riders: RIDERS.map((x) => ({ style:x.style, passive:x.passive })),
  crafts: CRAFTS.map((x) => ({ type:x.type })),
  rarities: Object.fromEntries(Object.entries(RARITIES).map(([k,v]) => [k,v.label])),
  season: SEASON.name,
  contracts: CONTRACTS.map((x) => ({ name:x.name, cadence:x.cadence })),
  collections: COLLECTIONS.map((x) => ({ name:x.name, title:x.reward.title })),
  titles: TITLES.map((x) => x.name),
  ghosts: GHOST_RIVALS.map((x) => x.title),
};


export { LANGUAGE_KEY, SUPPORTED, q, UI, REGION_KO, SEA_KO, STYLE_KO, PASSIVE_KO, CRAFT_TYPE_KO, RARITY_KO, GEAR_KO, POSE_KO, ITEM_EN, SKILL_EN, EVENT_EN, EVENT_NAME_KO, CONTRACT_KO, COLLECTION_KO, TITLE_KO, RIDER_KO, ORIGINAL, RIDERS, CRAFTS, SKILLS, ITEMS, EVENTS, RARITIES, SEASON, CONTRACTS, COLLECTIONS, TITLES, GHOST_RIVALS, getCharacterProfile };
