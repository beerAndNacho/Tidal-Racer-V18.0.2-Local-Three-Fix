import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COASTAL_WEATHER, WeatherDirector, weatherAt, weatherParticleBudget } from '../v18/weather-system.js';

const base={region:'GOLDEN COAST',day:4,hour:11,time:0,event:''};
assert.deepEqual(weatherAt(base),weatherAt(base),'weather must be deterministic for the same region, day, and time slot');
assert.equal(weatherAt({...base,event:'STORM CELL'}).id,'squall','storm events must force a physical squall');
assert.equal(weatherAt({...base,event:'ROGUE WAVE'}).id,'squall','rogue waves must drive storm weather');
assert.equal(Object.keys(COASTAL_WEATHER).length,6);assert.ok(Object.values(COASTAL_WEATHER).every(weather=>weather.name.ko&&weather.name.en),'weather labels must be bilingual');

const director=new WeatherDirector();let changedCount=0,snapshot;
for(let index=0;index<800;index++){snapshot=director.update(.1,{...base,event:'STORM CELL',time:index*.1});if(snapshot.changed)changedCount++}
assert.equal(snapshot.type,'squall');assert.ok(snapshot.rain>.92&&snapshot.wind>.92&&snapshot.storm>.9,'squall must converge to heavy rain, wind, and storm');assert.ok(snapshot.surfaceWetness>.02,'rain must accumulate persistent street wetness');assert.equal(changedCount,1,'a stable weather target announces only once');
const wet=snapshot.surfaceWetness;for(let index=0;index<300;index++)snapshot=director.update(.1,{...base,event:'',hour:findClearHour('GOLDEN COAST',4),time:100+index*.1});assert.ok(snapshot.surfaceWetness<wet,'surface wetness must dry gradually after rain');

function findClearHour(region,day){for(let hour=0;hour<24;hour+=3)if(weatherAt({region,day,hour}).id==='clear')return hour;for(let offset=1;offset<30;offset++)for(let hour=0;hour<24;hour+=3)if(weatherAt({region,day:day+offset,hour}).id==='clear')return hour;throw new Error('no clear slot found')}
const saved=director.serialize(),restored=new WeatherDirector(saved);assert.deepEqual(restored.serialize(),saved,'weather transition and wetness must survive save/restore');
const lateForecast=director.forecast({region:'STORM STRAIT',day:2,hour:23,event:'STORM CELL'},2);assert.equal(lateForecast[0].day,3);assert.equal(lateForecast[0].hour,0);assert.ok(lateForecast.some(item=>item.id!=='squall')||lateForecast.every(item=>weatherAt({region:'STORM STRAIT',day:item.day,hour:item.hour}).id==='squall'),'future forecasts must use climate slots rather than current event forcing');

const ultra=weatherParticleBudget({rain:1,quality:'ultra',performanceTier:'quality'}),balanced=weatherParticleBudget({rain:1,quality:'balanced',performanceTier:'balanced'}),low=weatherParticleBudget({rain:1,quality:'low',performanceTier:'performance'}),reduced=weatherParticleBudget({rain:1,quality:'ultra',performanceTier:'quality',reducedEffects:true});
assert.equal(ultra,1200);assert.ok(ultra>balanced&&balanced>low,'rain particles must scale down with quality and performance tier');assert.ok(reduced<ultra,'reduced effects must lower rain density');assert.equal(weatherParticleBudget({rain:0}),0);

const main=fs.readFileSync('v18/main.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),audio=fs.readFileSync('v14/audio-director.js','utf8'),index=fs.readFileSync('index.html','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
assert.ok(main.includes('buildWeatherWorld(THREE,scene,weatherDirector,{clouds})')&&main.includes('weatherWorld.update'));assert.ok(main.includes('weather:weatherDirector.serialize()')&&main.includes('weatherDirector.restore(p.weather)'));
for(const token of ['latestWeather.seaBonus','latestWeather.fog','latestWeather.clouds','latestWeather.wind','audioDirector.setWeather(latestWeather)'])assert.ok(main.includes(token),`weather integration missing ${token}`);
assert.ok(engine.includes("road.name='golden-coast-asphalt-road'")&&engine.includes("eastWest.name='harbor-east-west-road'"));assert.ok(audio.includes('setWeather(snapshot')&&audio.includes('this.ambient.rg.gain')&&audio.includes("case'thunder'"));
for(const id of ['weatherHud','weatherType','weatherDetail','weatherForecast'])assert.ok(index.includes(`id="${id}"`),`weather HUD missing ${id}`);assert.ok(policy.requiredFiles.includes('v18/weather-system.js')&&policy.sourceFiles.includes('v18/weather-system.js'));

console.log(`PASS dynamic weather: deterministic regional climate, forecast, transitions, wet streets, storm events, adaptive audio, and particle budgets ${ultra}/${balanced}/${low}/${reduced}`);
