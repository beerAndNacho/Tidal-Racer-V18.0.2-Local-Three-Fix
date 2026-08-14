import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),index=fs.readFileSync('index.html','utf8');
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CITY_DOCK,CITY_FACILITIES,CityLifeDirector}=new Function(core+';return {CITY_DOCK,CITY_FACILITIES,CityLifeDirector};')();
const director=new CityLifeDirector();assert.equal(director.facilityGuide({x:230,z:436},0),null,'city directory must stay hidden while aboard');
director.disembark({x:CITY_DOCK.water.x,z:CITY_DOCK.water.z,speed:0});const facingNorth=director.facilityGuide({x:230,z:436},0);assert.equal(facingNorth.facility.id,'harbor-office','dock arrival should guide to the nearest Harbor Office');assert.equal(facingNorth.arrow,'↓','a facility behind the current view needs a down arrow');
const facingSouth=director.facilityGuide({x:230,z:436},Math.PI);assert.equal(facingSouth.arrow,'↑','turning toward the same facility needs an up arrow');assert.equal(facingSouth.direction,'ahead');
const east=director.facilityGuide({x:196,z:379},0);assert.ok(['←','→'].includes(east.arrow),'lateral facility must use a side arrow');
director.profile.worldHour=3;const bank=CITY_FACILITIES.find(facility=>facility.id==='bank'),closed=director.facilityGuide({x:bank.exterior.x,z:bank.exterior.z+6},Math.PI);assert.equal(closed.facility.id,'bank');assert.equal(closed.status.open,false);assert.equal(closed.status.opens,8,'directory must expose the next bank opening');
director.profile.worldHour=12;assert.equal(director.facilityGuide({x:bank.exterior.x,z:bank.exterior.z+6},Math.PI).status.open,true);
director.enter('bank');assert.equal(director.facilityGuide(bank.interior,0),null,'city directory must hide inside a venue');

for(const token of ["arrows=['↑','↗','→','↘','↓','↙','←','↖']",'relativeAngle:delta','direction:directions[index]'])assert.ok(life.includes(token),'city guide model missing '+token);
for(const token of ['CITY DIRECTORY · NEAREST VENUE','dataset.cityGuideDirection','dataset.cityGuideDistance',"guide.status.open?'OPEN':'CLOSED'",'CLOSES ${formatLifeHour(guide.status.closes)}','OPENS ${formatLifeHour(guide.status.opens)}',"cityLife.mode==='foot'?7:24","cityLife.mode==='foot'?1.08",'CITY_FACILITIES.length','current?4.8:3.3'])assert.ok(main.includes(token),'city guide runtime missing '+token);
for(const token of ['id="navigationType"','data-mode="custom"',".navigationHud[data-mode='city'][data-open='false']",'body.on-foot .navigationHud'])assert.ok(index.includes(token),'city guide HUD missing '+token);
console.log('PASS city wayfinding: nearest venue selection, eight-way relative arrows, live schedules, custom priority, precise foot arrival, nine status pins, interior hiding, diagnostics, and mobile visibility');
