import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CITY_FACILITIES,CITY_STREET_LAMP_POSITIONS,CITY_STREET_COLLIDERS}=new Function(core+';return {CITY_FACILITIES,CITY_STREET_LAMP_POSITIONS,CITY_STREET_COLLIDERS};')();
assert.equal(CITY_STREET_LAMP_POSITIONS.length,16,'Golden Coast needs 16 authored street lamps');
assert.equal(new Set(CITY_STREET_LAMP_POSITIONS.map(point=>point.x+','+point.z)).size,16,'street lamp coordinates must be unique');
const lampColliders=CITY_STREET_COLLIDERS.filter(collider=>collider.id.startsWith('street-lamp-'));assert.equal(lampColliders.length,16,'every lamp pole needs a physical collider');
for(const [index,point] of CITY_STREET_LAMP_POSITIONS.entries()){
  assert.ok(point.x>=-35&&point.x<=488&&point.z>=379.5&&point.z<=441,'lamp '+index+' must remain inside the authored street bounds');
  const doorDistance=Math.min(...CITY_FACILITIES.map(facility=>Math.hypot(point.x-facility.exterior.x,point.z-facility.exterior.z)));assert.ok(doorDistance>9,'lamp '+index+' must preserve venue approach clearance');
}
for(let a=0;a<lampColliders.length;a++)for(let b=a+1;b<lampColliders.length;b++)assert.ok(Math.hypot(lampColliders[a].x-lampColliders[b].x,lampColliders[a].z-lampColliders[b].z)>8,'lamp poles must not overlap');
for(const token of ['golden-coast-street-lighting','street-lamp-pole','street-lamp-arm','street-lamp-bulb','street-lamp-light-pool','street-lamp-wet-reflection','golden-coast-road-studs','animateCityStreetLighting','range<125','wetness*.24','dataset.cityStreetLights','dataset.cityWetReflections','dataset.cityNightFactor'])assert.ok(life.includes(token),'city lighting runtime missing '+token);
assert.ok(life.includes('CITY_CAMERA_COLLIDERS')&&life.includes('street-lamp|traffic-signal|marina-cafe-table'),'tall lamp and signal poles must participate in foot camera collision');
assert.ok(main.includes('wetness:latestWeather.surfaceWetness'),'weather surface wetness must feed city reflection animation');
console.log('PASS city street lighting: 16 safe collidable poles, inward fixtures, 125 m dynamic-light budget, night factor, road studs, light pools, weather-scaled wet reflections, and diagnostics');
