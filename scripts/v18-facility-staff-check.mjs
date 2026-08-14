import assert from 'node:assert/strict';
import fs from 'node:fs';

const life=fs.readFileSync('v18/city-life-system.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),policy=JSON.parse(fs.readFileSync('release/release-policy.json','utf8'));
const core=life.slice(life.indexOf('const clamp='),life.indexOf('function physical(')).replaceAll('export ','');
const {CITY_FACILITIES,CITY_INTERIOR_PEOPLE}=new Function(`${core};return {CITY_FACILITIES,CITY_INTERIOR_PEOPLE};`)();
assert.equal(Object.keys(CITY_INTERIOR_PEOPLE).length,9,'all nine interiors need authored occupants');
const people=Object.values(CITY_INTERIOR_PEOPLE).flat(),staff=people.filter(person=>person.kind==='staff'),queue=people.filter(person=>person.kind==='queue');
assert.equal(people.length,18,'interiors need the complete 18-person service population');
assert.equal(staff.length,8,'every public service venue needs a staff member while home remains private');
assert.ok(queue.length>=5,'commercial interiors need visible customer queues');
assert.ok(new Set(people.map(person=>person.name)).size===people.length,'interior people need unique identities');
for(const facility of CITY_FACILITIES){
  const occupants=CITY_INTERIOR_PEOPLE[facility.id];assert.ok(occupants?.length,`${facility.id} needs an occupant layout`);
  const queueSlots=occupants.filter(person=>person.kind==='queue').map(person=>person.queue);assert.equal(new Set(queueSlots).size,queueSlots.length,`${facility.id} queue slots must not overlap`);
  for(const person of occupants){
    const [x,z]=person.at;assert.ok(Math.abs(x)<=11&&Math.abs(z)<=8.6,`${facility.id} ${person.name} must remain inside walk bounds`);
    assert.ok(Math.hypot(x,z-8.8)>3.4,`${facility.id} ${person.name} must keep the exit clear`);
    for(let index=0;index<facility.actions.length;index++)assert.ok(Math.hypot(x-(-7.5+index*5),z+4.6)>2.15,`${facility.id} ${person.name} must not obscure action marker ${index}`);
  }
}
for(const token of ['INTERIOR_PERSON_GEOMETRY','baseY=.19','facility-person-head','facility-person-upper-arm','facility-person-lower-leg','facility-staff-badge','facility-staff-apron','facility-staff-tool','facility-staff-gavel','facility-staff-whistle','animateInteriorPeople','dataset.facilityServiceActors','dataset.facilityQueueActors'])assert.ok(life.includes(token),`staffed interior runtime missing ${token}`);
assert.ok(main.includes('cityLifeWorld.animate')&&policy.requiredFiles.includes('v18/city-life-system.js')&&policy.sourceFiles.includes('v18/city-life-system.js'),'staffed interiors must remain connected and release-required');
console.log('PASS facility staff: 18 unique occupants, 8 service staff, visible queues, articulated role animation and props, clear action markers and exits, and runtime diagnostics');
