export const RIDERS = [
  {id:'rhea',name:'RHEA',style:'BALANCED',skin:0xc98d6d,suit:0xf15f45,accent:0xffffff,body:[1,1,1],passive:'FLOW STATE'},
  {id:'kai',name:'KAI',style:'AGGRESSIVE',skin:0xa86d4f,suit:0x2878ff,accent:0x101820,body:[1.05,1.05,.96],passive:'REDLINE'},
  {id:'sol',name:'SOL',style:'TECHNICAL',skin:0xe2b18f,suit:0x21b98f,accent:0xf5f5f5,body:[.95,1,.94],passive:'LATE APEX'},
  {id:'mina',name:'MINA',style:'DRIFT',skin:0xf0c7aa,suit:0xb45cff,accent:0x20202a,body:[.92,.98,.92],passive:'DEEP SLIDE'},
  {id:'jax',name:'JAX',style:'TANK',skin:0x805842,suit:0x3b424d,accent:0xff7d56,body:[1.14,1.05,1.12],passive:'HEAVY HULL'},
  {id:'nari',name:'NARI',style:'BOOST',skin:0xe1aa86,suit:0x00a7c7,accent:0xffffff,body:[.9,1.02,.9],passive:'AFTERBURN'},
  {id:'omar',name:'OMAR',style:'WAVE',skin:0x704736,suit:0xd9b434,accent:0x101010,body:[1.02,1.04,1],passive:'WAVE READER'},
  {id:'yuna',name:'YUNA',style:'ITEM',skin:0xf1c3a2,suit:0xff5b9e,accent:0xffffff,body:[.9,.97,.9],passive:'LUCKY DRAW'},
  {id:'theo',name:'THEO',style:'SPRINT',skin:0xc18b69,suit:0x7be456,accent:0x153026,body:[1,1.06,.94],passive:'LAUNCH CONTROL'},
  {id:'amara',name:'AMARA',style:'DEFENSE',skin:0x6d452f,suit:0x4a79c8,accent:0xf7e0bd,body:[1.08,1.02,1.06],passive:'AEGIS'},
  {id:'ren',name:'REN',style:'PRECISION',skin:0xd7a17f,suit:0xefefef,accent:0x232c33,body:[.96,1,.92],passive:'CLEAN WATER'},
  {id:'luz',name:'LUZ',style:'CHAOS',skin:0xba7958,suit:0xff834f,accent:0x3b1120,body:[.96,1.03,.95],passive:'WILDCARD'},
  {id:'haneul',name:'HANEUL',style:'AERIAL',skin:0xe6b28c,suit:0x65a7ff,accent:0xf0f4ff,body:[.93,1.06,.9],passive:'SKYLINE'},
  {id:'mako',name:'MAKO',style:'CURRENT',skin:0x9c684d,suit:0x15716e,accent:0xc9ffdc,body:[1.07,1,.99],passive:'CURRENT SENSE'},
  {id:'ivy',name:'IVY',style:'CONTROL',skin:0xf2cbb5,suit:0x7b55d9,accent:0x2b1747,body:[.91,.98,.9],passive:'TIGHT LINE'},
  {id:'zane',name:'ZANE',style:'HUNTER',skin:0x5d3b2e,suit:0x161c26,accent:0xffcc54,body:[1.1,1.07,1.05],passive:'LOCK ON'}
];

export const CRAFTS = [
  ['storm-x','STORM-X','BALANCED',0xff633f,44,21,1.00,1.00],['barracuda','BARRACUDA','TOP SPEED',0x1f7cff,51,18,.85,.94],['manta-r','MANTA-R','HANDLING',0x20d8a4,41,22,1.20,.96],['leviathan','LEVIATHAN','STABLE',0x313944,43,18,.82,1.20],['stingray','STINGRAY','DRIFT',0xb461ff,46,21,1.18,.88],['phoenix','PHOENIX','BOOST',0xffb52e,48,24,.96,.95],['orca','ORCA GT','ENDURANCE',0xf1f1f1,45,20,.90,1.28],['specter','SPECTER','STEALTH',0x242936,47,21,1.05,.91],['tsunami','TSUNAMI RX','WAVE',0x00a9a4,46,19,1.02,1.34],['volt','VOLT-9','SPRINT',0xf15427,49,25,.92,.90]
].map(x=>({id:x[0],name:x[1],type:x[2],color:x[3],max:x[4],accel:x[5],turn:x[6],stability:x[7]}));

export const SKILLS = [
  ['HYDRO DASH','순간 추진력을 얻고 웨이크 저항을 무시합니다.',8],['WAVE CUTTER','파도 충격과 수직 흔들림을 잠시 감소시킵니다.',11],['SHOCK PULSE','근접 라이벌의 추진력을 떨어뜨립니다.',14],['SLIPSTREAM','앞 차량의 항적에서 추가 가속을 얻습니다.',16],['AQUA SHIELD','아이템 충돌을 한 번 무효화합니다.',18],['PHASE CURRENT','횡류와 조향 저항을 잠시 무시합니다.',20],['TOW BURST','가장 가까운 앞 차량 방향으로 끌려갑니다.',17],['SONAR RUSH','아이템/이벤트 위치를 표시하고 부스트를 회복합니다.',22]
].map((x,i)=>({id:i,name:x[0],desc:x[1],cool:x[2]}));

const itemDefs = [
['SEEKER','공격','앞 차량을 추적하는 유도탄',900],['AEGIS','방어','1회 피격을 방어하는 실드',750],['NITRO','가속','짧은 강력한 가속',650],['EMP BURST','방해','근거리 라이벌의 전자장비를 방해',1300],['WAKE MINE','함정','뒤에 항적 지뢰 설치',850],['MAGNET','유틸','근처 아이템 부표를 끌어당김',700],['REPAIR FOAM','회복','충돌 감속 페널티 감소',600],['SPRAY CLOAK','방어','잠시 타깃 잠금 해제',1500],['ROGUE WAVE','월드','전방에 큰 파도 생성',1800],['POSITION SWAP','전략','앞 차량과 위치를 일부 교환',2200],['CURRENT LOCK','방해','상대 조향을 둔화',1200],['TWIN TURBO','가속','부스트 두 번 연속 충전',1450],['TOW HOOK','추격','앞 차량 쪽으로 가속',950],['SONAR DECOY','방어','유도탄을 다른 타깃으로 유도',800],['BOOST CELL','가속','부스트 게이지 45 회복',500],['WAVE BRAKE','방어','거친 파도 구간 안정화',950],['SPRAY BOMB','방해','시야 방해 물안개 생성',1100],['VORTEX','월드','작은 회오리 수역 생성',1600],['JUMP JET','기동','선수를 들어 점프 보정',1050],['REVERSE PULSE','방해','근접 상대를 뒤로 밀어냄',1550],['GOLDEN BUOY','경제','즉시 크레딧 획득',0],['RACE LINE','유틸','최적 주행선 가이드 강화',720],['TIDAL MAP','유틸','월드 이벤트 위치 공개',740],['ANCHOR DROP','함정','느려지는 장애물 부표 설치',1020],['FOAM WALL','방어','뒤에 포말 장벽 생성',1220],['SURGE BATTERY','가속','스킬 쿨다운 일부 회복',1350],['HARBOR PASS','경제','항구 상점 할인 효과',1800],['DRIFT CORE','기동','드리프트 중 속도 손실 감소',1280],['SHIELD BREAKER','공격','실드에 강한 탄환',1650],['GHOST WAKE','전략','짧게 충돌 판정을 약화',1950]
];
export const ITEMS=itemDefs.map((x,i)=>({id:i,name:x[0],category:x[1],desc:x[2],price:x[3]}));

export const EVENTS=[
['TIDAL SURGE','전 해역의 너울이 커지고 부스트 충전량이 증가합니다.',24],['CARGO CONVOY','Harbor City에 화물선 호송 루트가 열립니다.',28],['STORM CELL','Storm Strait에 강한 횡풍과 비가 생성됩니다.',24],['BUOY SPRINT','연속 보너스 부표를 통과하면 크레딧을 획득합니다.',22],['TREASURE WAKE','황금 아이템 부표가 지도에 생성됩니다.',25],['ROGUE WAVE','Volcano Bay를 가로지르는 대형 너울이 발생합니다.',20],['NIGHT MARKET','Moon Archipelago 상점 가격이 잠시 할인됩니다.',35],['RESCUE RUN','난파선 구조 지점을 빠르게 통과하면 보상을 획득합니다.',30],['HARBOR RUSH','도시 수로에 제한시간 스프린트가 시작됩니다.',26],['CURRENT REVERSAL','Mangrove Delta의 횡류 방향이 반대로 바뀝니다.',22],['BLACK REEF HUNT','Black Reef에 희귀 상자가 출현합니다.',32],['SKYWATER FESTIVAL','Skywater Lagoon에 점프 링과 보너스 게이트가 생성됩니다.',34]
].map((x,i)=>({id:i,name:x[0],desc:x[1],dur:x[2]}));

export const REGIONS=[
  ['GOLDEN COAST',0,0,620,0x668a60,'resort'],['VOLCANO BAY',1150,-980,720,0x3d4d41,'volcano'],['MANGROVE DELTA',-1250,-920,700,0x3c7458,'mangrove'],['HARBOR CITY',-1350,1040,760,0x65757b,'city'],['STORM STRAIT',1250,1080,760,0x4e6269,'storm'],['CORAL EXPANSE',2500,-150,820,0x507f70,'coral'],['MOON ARCHIPELAGO',-2550,160,820,0x4f6072,'moon'],['BLACK REEF',-1050,-2450,780,0x343d3c,'reef'],['SKYWATER LAGOON',1200,-2500,820,0x50877b,'lagoon']
].map(x=>({name:x[0],x:x[1],z:x[2],r:x[3],color:x[4],biome:x[5]}));

export const ROUTE_POINTS=[
  [230,530],[230,465],[680,480],[970,-460],[1220,-980],[720,-1510],[1160,-2340],[1650,-2580],[2250,-980],[2600,-140],[1900,620],[1280,1120],[470,1450],[-420,1530],[-1250,1120],[-1850,690],[-2500,180],[-2100,-500],[-1370,-980],[-1020,-1740],[-1150,-2420],[-420,-2050],[0,-1180],[230,530]
];
