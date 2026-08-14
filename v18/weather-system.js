const label=(ko,en)=>({ko,en});
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number(value)||0));
const clone=value=>JSON.parse(JSON.stringify(value));
const WEATHER_FIELDS=['rain','wind','fog','clouds','lightning','seaBonus'];

export const COASTAL_WEATHER=Object.freeze({
  clear:{id:'clear',name:label('맑은 해풍','CLEAR SEA BREEZE'),rain:0,wind:.2,fog:.06,clouds:.14,lightning:0,seaBonus:0,color:0x8ca6ae},
  haze:{id:'haze',name:label('해무','MARINE HAZE'),rain:0,wind:.12,fog:.58,clouds:.38,lightning:0,seaBonus:-.04,color:0x819296},
  sunshower:{id:'sunshower',name:label('햇비','COASTAL SUNSHOWER'),rain:.24,wind:.28,fog:.16,clouds:.42,lightning:0,seaBonus:.03,color:0x839ba3},
  drizzle:{id:'drizzle',name:label('해안 이슬비','COASTAL DRIZZLE'),rain:.42,wind:.4,fog:.34,clouds:.7,lightning:0,seaBonus:.08,color:0x687d85},
  rain:{id:'rain',name:label('항만 비','HARBOR RAIN'),rain:.72,wind:.62,fog:.48,clouds:.9,lightning:.12,seaBonus:.16,color:0x536b76},
  squall:{id:'squall',name:label('급변 돌풍','TIDAL SQUALL'),rain:1,wind:1,fog:.76,clouds:1,lightning:1,seaBonus:.38,color:0x344d5c},
});

const REGION_WEATHER={
  'GOLDEN COAST':[['clear',40],['haze',14],['sunshower',18],['drizzle',18],['rain',10]],
  'VOLCANO BAY':[['clear',35],['haze',22],['sunshower',8],['drizzle',13],['rain',17],['squall',5]],
  'MANGROVE DELTA':[['clear',18],['haze',24],['sunshower',10],['drizzle',24],['rain',20],['squall',4]],
  'HARBOR CITY':[['clear',25],['haze',16],['sunshower',10],['drizzle',23],['rain',21],['squall',5]],
  'STORM STRAIT':[['clear',8],['haze',8],['drizzle',18],['rain',28],['squall',38]],
  'CORAL EXPANSE':[['clear',48],['haze',8],['sunshower',24],['drizzle',12],['rain',8]],
  'MOON ARCHIPELAGO':[['clear',28],['haze',28],['sunshower',8],['drizzle',20],['rain',13],['squall',3]],
  'BLACK REEF':[['clear',14],['haze',26],['drizzle',22],['rain',27],['squall',11]],
  'SKYWATER LAGOON':[['clear',44],['haze',10],['sunshower',25],['drizzle',13],['rain',8]],
};

function hashText(value){let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return hash>>>0}
function weightedWeather(region,day,slot){
  const table=REGION_WEATHER[region]||REGION_WEATHER['GOLDEN COAST'],total=table.reduce((sum,item)=>sum+item[1],0),roll=(hashText(`${region}|${day}|${slot}|tidal-weather-v1`)%100000)/100000*total;let cursor=roll;
  for(const [id,weight] of table){cursor-=weight;if(cursor<=0)return id}return table.at(-1)[0];
}
function eventWeather(event,id){if(event==='STORM CELL'||event==='ROGUE WAVE')return'squall';if(event==='TIDAL SURGE')return id==='clear'?'rain':id;return id}
export function weatherAt({region='GOLDEN COAST',day=1,hour=12,event=''}={}){const safeDay=Math.max(1,Math.floor(Number(day)||1)),slot=Math.floor(clamp(Number(hour)||0,0,23.999)/3),id=eventWeather(event,weightedWeather(region,safeDay,slot));return{...clone(COASTAL_WEATHER[id]),region,day:safeDay,slot,startHour:slot*3,endHour:(slot+1)*3,event:event||''}}
export function weatherParticleBudget({rain=0,quality='balanced',performanceTier='quality',reducedEffects=false,maxDrops=1200}={}){const qualityScale=quality==='ultra'?1:quality==='balanced'?.72:.5,performanceScale=performanceTier==='performance'?.55:performanceTier==='balanced'?.78:1,effectsScale=reducedEffects?.48:1;return Math.floor(maxDrops*clamp(rain)*qualityScale*performanceScale*effectsScale)}

export class WeatherDirector{
  constructor(saved){const clear=COASTAL_WEATHER.clear;this.targetId=clear.id;this.current=Object.fromEntries(WEATHER_FIELDS.map(field=>[field,clear[field]]));this.surfaceWetness=0;this.notice=false;this.sequence=0;this.restore(saved)}
  restore(saved){if(!saved||typeof saved!=='object')return this.serialize();if(COASTAL_WEATHER[saved.targetId])this.targetId=saved.targetId;if(saved.current)for(const field of WEATHER_FIELDS)if(Number.isFinite(saved.current[field]))this.current[field]=clamp(saved.current[field],field==='seaBonus'?-1:0,1);if(Number.isFinite(saved.surfaceWetness))this.surfaceWetness=clamp(saved.surfaceWetness);this.sequence=Math.max(0,Math.floor(Number(saved.sequence)||0));return this.serialize()}
  serialize(){return{version:1,targetId:this.targetId,current:{...this.current},surfaceWetness:this.surfaceWetness,sequence:this.sequence}}
  forecast(context,count=3){const startSlot=Math.floor(clamp(context.hour,0,23.999)/3),result=[];for(let offset=1;offset<=count;offset++){const absolute=startSlot+offset,day=Math.max(1,Math.floor(context.day||1)+Math.floor(absolute/8)),slot=absolute%8,hour=slot*3,id=weightedWeather(context.region||'GOLDEN COAST',day,slot);result.push({id,name:clone(COASTAL_WEATHER[id].name),day,hour})}return result}
  update(dt,context={}){
    const desired=weatherAt(context);if(desired.id!==this.targetId){this.targetId=desired.id;this.notice=true;this.sequence++}const blend=1-Math.exp(-clamp(dt,0,.1)*.32);for(const field of WEATHER_FIELDS)this.current[field]+=(desired[field]-this.current[field])*blend;
    const wetTarget=clamp(desired.rain*.86+desired.fog*.12),wetRate=desired.rain>.05?.035:.006;this.surfaceWetness+=(wetTarget-this.surfaceWetness)*(1-Math.exp(-clamp(dt,0,.1)*wetRate));
    const weatherTime=Number(context.time)||0,cycle=(weatherTime+(hashText(`${desired.region}|${desired.day}`)%113))%13.7,flash=desired.lightning>0&&cycle<.16?(cycle<.055?1:.38):0,changed=this.notice;this.notice=false;
    return{type:desired.id,name:clone(desired.name),target:desired.id,region:desired.region,rain:clamp(this.current.rain),wind:clamp(this.current.wind),fog:clamp(this.current.fog),clouds:clamp(this.current.clouds),lightning:clamp(this.current.lightning)*flash,storm:clamp(this.current.lightning*.7+this.current.rain*.35),seaBonus:this.current.seaBonus,surfaceWetness:clamp(this.surfaceWetness),changed,sequence:this.sequence,forecast:this.forecast({...context,region:desired.region,day:desired.day,hour:Number(context.hour)||0},2)};
  }
}

export function buildWeatherWorld(THREE,scene,director,{clouds=[]}={}){
  const root=new THREE.Group();root.name='tidal-dynamic-weather';scene.add(root);const maxDrops=1200,seeds=new Float32Array(maxDrops*4),positions=new Float32Array(maxDrops*6);let value=0x18f0ab3d;const random=()=>((value=Math.imul(value,1664525)+1013904223>>>0)/4294967296);for(let index=0;index<maxDrops;index++){seeds[index*4]=(random()-.5)*150;seeds[index*4+1]=random()*62;seeds[index*4+2]=(random()-.5)*150;seeds[index*4+3]=.78+random()*.7}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setDrawRange(0,0);const material=new THREE.LineBasicMaterial({color:0xc9e8f2,transparent:true,opacity:0,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false}),rainLines=new THREE.LineSegments(geometry,material);rainLines.name='weather-rain-lines';rainLines.frustumCulled=false;root.add(rainLines);
  const lightning=new THREE.PointLight(0xd9eeff,0,540,1.4);lightning.name='weather-lightning';scene.add(lightning);const puddles=[],wetSurfaces=[],weatherColors=Object.fromEntries(Object.entries(COASTAL_WEATHER).map(([id,weather])=>[id,new THREE.Color(weather.color)]));let lastScan=-99;
  function scanSurfaces(time){if(time-lastScan<4)return;lastScan=time;scene.traverse(object=>{if(!object.isMesh&&!object.isInstancedMesh)return;if(object.name==='road-rain-puddles'&&!puddles.includes(object)){object.material.userData.weatherBaseOpacity=object.material.opacity;puddles.push(object)}if(['golden-coast-asphalt-road','harbor-east-west-road','harbor-north-south-road','asphalt-repair-patches'].includes(object.name)&&!wetSurfaces.includes(object)){object.material.userData.weatherBaseRoughness=object.material.roughness;object.material.userData.weatherBaseMetalness=object.material.metalness;wetSurfaces.push(object)}})}
  return{root,director,update({dt,time,day,hour,region,event,player,mode,quality='balanced',performanceTier='quality',reducedEffects=false}){
    const snapshot=director.update(dt,{time,day,hour,region,event});scanSurfaces(time);const outdoors=mode!=='interior',activeDrops=weatherParticleBudget({rain:snapshot.rain,quality,performanceTier,reducedEffects,maxDrops});
    root.visible=outdoors&&activeDrops>0;material.opacity=outdoors?clamp(snapshot.rain*.18+.08,0,.78):0;geometry.setDrawRange(0,activeDrops*2);if(root.visible){const wind=snapshot.wind*5.4;for(let index=0;index<activeDrops;index++){const seed=index*4,fall=(time*seeds[seed+3]*24+seeds[seed+1])%62,x=seeds[seed]+wind*(1-fall/62),y=64-fall,z=seeds[seed+2],line=1.25+snapshot.rain*2.3,position=index*6;positions[position]=x;positions[position+1]=y;positions[position+2]=z;positions[position+3]=x-wind*.07;positions[position+4]=y-line;positions[position+5]=z}geometry.attributes.position.needsUpdate=true;root.position.set(player.x,player.y,player.z)}
    lightning.position.set(player.x,player.y+42,player.z);lightning.intensity=outdoors?snapshot.lightning*(reducedEffects?1.2:7.5):0;for(const puddle of puddles){puddle.visible=snapshot.surfaceWetness>.025;puddle.material.opacity=.05+snapshot.surfaceWetness*.52;puddle.material.roughness=.13-snapshot.surfaceWetness*.08}for(const surface of wetSurfaces){const base=surface.material.userData.weatherBaseRoughness??.9,metal=surface.material.userData.weatherBaseMetalness??.02;surface.material.roughness=base+(Math.max(.38,base*.43)-base)*snapshot.surfaceWetness;surface.material.metalness=metal+snapshot.surfaceWetness*.045}
    for(const cloud of clouds){cloud.material.userData.weatherBaseOpacity??=cloud.material.opacity;cloud.material.opacity=.2+snapshot.clouds*.58;cloud.material.color.setHex(snapshot.storm>.55?0x829099:0xffffff)}if(scene.fog?.color)scene.fog.color.lerp(weatherColors[snapshot.type],.012);
    return{...snapshot,activeDrops,outdoors,puddleCount:puddles.length,wetSurfaceCount:wetSurfaces.length};
  }};
}
