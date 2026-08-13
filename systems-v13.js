export const RARITIES={
  common:{label:'COMMON',weight:55,color:'#9fb4bd',mult:1},
  rare:{label:'RARE',weight:25,color:'#62b8ff',mult:1.5},
  epic:{label:'EPIC',weight:12,color:'#b67cff',mult:2.3},
  legendary:{label:'LEGENDARY',weight:6,color:'#ffcc65',mult:3.6},
  mythic:{label:'MYTHIC',weight:2,color:'#ff6d8d',mult:5.5}
};

export const SEASON={id:'S01',name:'RISING TIDE',maxLevel:40,endsLabel:'PRE-SEASON',xpPerLevel:1200};

export const COSMETICS=[
  ['paint-coral','CORAL STRIKE','paint','rare','#ff6954','sunset-set',3200,false],
  ['wake-aqua','AQUA VEIL','wake','rare','#65ecff','sunset-set',3600,false],
  ['suit-sunset','SUNSET SUIT','suit','epic','#ff9e5d','sunset-set',5200,false],
  ['helmet-pearl','PEARL VISOR','helmet','epic','#eef7ff','sunset-set',5600,false],
  ['paint-black','BLACK TIDE','paint','legendary','#171a23','black-tide',7800,true],
  ['wake-violet','VOID WAKE','wake','legendary','#a36aff','black-tide',8400,true],
  ['suit-abyss','ABYSS SUIT','suit','epic','#28263f','black-tide',6100,true],
  ['helmet-obsidian','OBSIDIAN HELM','helmet','legendary','#10131a','black-tide',9000,true],
  ['paint-volcano','MAGMA SHELL','paint','legendary','#ff4d2f','magma-set',9200,true],
  ['wake-magma','MAGMA WAKE','wake','mythic','#ff6b2f','magma-set',12800,true],
  ['suit-volcano','VOLCANIC SUIT','suit','epic','#6b231b','magma-set',6500,true],
  ['helmet-magma','EMBER CROWN','helmet','legendary','#ff9d3f','magma-set',9800,true],
  ['paint-moon','MOON SILVER','paint','epic','#bcc9df','moon-set',5800,false],
  ['wake-moon','LUNAR TRAIL','wake','epic','#9ed2ff','moon-set',6400,false],
  ['suit-moon','MOONRUNNER','suit','rare','#4b5d89','moon-set',3800,false],
  ['helmet-moon','LUNAR VISOR','helmet','epic','#d6e4ff','moon-set',6200,false],
  ['paint-harbor','HARBOR CHROME','paint','rare','#5d7988','harbor-set',3500,false],
  ['wake-gold','GOLDEN WAKE','wake','legendary','#ffd36d','founder-set',9800,true],
  ['suit-founder','FOUNDER SUIT','suit','legendary','#f2c879','founder-set',9600,true],
  ['helmet-founder','FOUNDER HELM','helmet','mythic','#ffe8a6','founder-set',14500,true],
  ['paint-neon','NEON CURRENT','paint','epic','#25d4ff','neon-set',6100,false],
  ['wake-neon','ION WAKE','wake','epic','#58ffca','neon-set',6700,false],
  ['suit-neon','ION SUIT','suit','rare','#1a8f8b','neon-set',4200,false],
  ['helmet-neon','ION HELM','helmet','epic','#4af6de','neon-set',6600,false]
].map((x,i)=>({id:x[0],name:x[1],slot:x[2],rarity:x[3],color:x[4],set:x[5],price:x[6],limited:x[7],supply:x[7]?120+((i*37)%380):null,tradable:x[3]!=='common'}));

export const COLLECTIONS=[
  {id:'sunset-set',name:'SUNSET LEGACY',items:['paint-coral','wake-aqua','suit-sunset','helmet-pearl'],reward:{credits:6000,title:'GOLDEN HOUR'}},
  {id:'black-tide',name:'BLACK TIDE',items:['paint-black','wake-violet','suit-abyss','helmet-obsidian'],reward:{credits:9500,title:'ABYSS RIDER'}},
  {id:'magma-set',name:'VOLCANO CROWN',items:['paint-volcano','wake-magma','suit-volcano','helmet-magma'],reward:{credits:12000,title:'MAGMA KING'}},
  {id:'moon-set',name:'MOON ARCHIPELAGO',items:['paint-moon','wake-moon','suit-moon','helmet-moon'],reward:{credits:7500,title:'LUNAR ACE'}},
  {id:'neon-set',name:'ION CURRENT',items:['paint-neon','wake-neon','suit-neon','helmet-neon'],reward:{credits:8000,title:'ION CHASER'}}
];

export const CONTRACTS=[
  {id:'distance-5k',name:'OPEN WATER',metric:'distance',target:5000,reward:{credits:1800,xp:420},cadence:'DAILY'},
  {id:'skill-12',name:'SKILL CHAIN',metric:'skillUses',target:12,reward:{credits:1600,xp:380},cadence:'DAILY'},
  {id:'pickup-10',name:'SALVAGE ROUTE',metric:'itemPickups',target:10,reward:{credits:1400,xp:340},cadence:'DAILY'},
  {id:'regions-5',name:'ISLAND HOPPER',metric:'regionsVisited',target:5,reward:{credits:2200,xp:550},cadence:'WEEKLY'},
  {id:'drift-45',name:'DEEP SLIDE',metric:'driftSeconds',target:45,reward:{credits:2100,xp:520},cadence:'WEEKLY'},
  {id:'races-3',name:'CUP RUNNER',metric:'races',target:3,reward:{credits:2400,xp:620},cadence:'WEEKLY'},
  {id:'wins-1',name:'TAKE THE CROWN',metric:'wins',target:1,reward:{credits:3800,xp:900},cadence:'WEEKLY'}
];

export const TITLES=[
  {id:'rookie',name:'ROOKIE WAVE',rep:0},
  {id:'coast-runner',name:'COAST RUNNER',rep:350},
  {id:'archipelago-ace',name:'ARCHIPELAGO ACE',rep:900},
  {id:'storm-hunter',name:'STORM HUNTER',rep:1800},
  {id:'tide-legend',name:'TIDE LEGEND',rep:3200}
];

export const GHOST_RIVALS=[
  {name:'AstraK',title:'TIDE LEGEND',rating:2148,craft:'PHOENIX',cosmetic:'wake-gold'},
  {name:'MakoZero',title:'STORM HUNTER',rating:2077,craft:'TSUNAMI RX',cosmetic:'wake-violet'},
  {name:'BlueHarbor',title:'ARCHIPELAGO ACE',rating:1985,craft:'MANTA-R',cosmetic:'wake-aqua'},
  {name:'NeoCurrent',title:'ARCHIPELAGO ACE',rating:1944,craft:'VOLT-9',cosmetic:'wake-neon'},
  {name:'VolcanicRhea',title:'COAST RUNNER',rating:1876,craft:'STORM-X',cosmetic:'wake-magma'}
];

export const MARKET_SEED=COSMETICS.filter(c=>c.tradable).map((c,i)=>({id:c.id,ask:Math.floor(c.price*(.82+(i%5)*.09)),trend:(i%3-1)*(3+i%4),stock:c.limited?Math.max(2,Math.floor(c.supply/18)):12+(i%7)}));

export const SCORECARD_TARGETS=[
  ['그래픽 상품성','graphics',10],['게임 플레이 반복성','repeatability',10],['캐릭터 애착','attachment',10],['수집 욕구','collection',10],['사회적 과시','social',10],['아이템 희소성','scarcity',10],['거래소 필요성','market',10]
].map(x=>({label:x[0],key:x[1],target:x[2]}));
