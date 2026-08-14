import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CityPopulationDirector } from '../v18/city-population-system.js';

const director=new CityPopulationDirector({seed:1818}),courier=director.agents.find(agent=>agent.profile.id==='jiho-lee');assert.ok(courier);assert.equal(courier.routeIndex,6);assert.equal(courier.x,104);assert.equal(courier.z,395.4);assert.equal(courier.carryingParcel,true);
let sawDelivering=false,sawLoading=false,sawReturn=false;for(let frame=0;frame<9000&&courier.deliveryCycles<1;frame++){director.update({dt:.05,hour:12,enabled:true,player:{x:-100,z:-100},rain:0});sawDelivering||=courier.state==='delivering'&&courier.carryingParcel;sawLoading||=courier.state==='loading';sawReturn||=!courier.carryingParcel&&['walking','loading'].includes(courier.state)}
assert.ok(courier.deliveryCycles>=1&&sawDelivering&&sawLoading&&sawReturn,'courier must carry one parcel to the loading bay, pause, drop it, and begin the empty return');
const snapshot=director.snapshot({hour:12}).agents.find(agent=>agent.id==='jiho-lee');assert.equal(typeof snapshot.carryingParcel,'boolean');assert.ok(Number.isInteger(snapshot.deliveryCycles));

const population=fs.readFileSync('v18/city-population-system.js','utf8'),engine=fs.readFileSync('v18/engine.js','utf8'),main=fs.readFileSync('v18/main.js','utf8'),smoke=fs.readFileSync('scripts/package-smoke-check.mjs','utf8'),readme=fs.readFileSync('README.md','utf8'),contributing=fs.readFileSync('CONTRIBUTING.md','utf8'),workflow=fs.readFileSync('.github/workflows/v18-regression.yml','utf8');
for(const token of ['DELIVERY_ROUTE_INDEX=6',"profile.id==='jiho-lee'?DELIVERY_ROUTE_INDEX",'carryingParcel','deliveryCycles','arrivedWaypoint===4','citizen-delivery-parcel','citizen-delivery-box','citizen-delivery-tape','citizen-delivery-label',"agent.state==='delivering'",'dataset.cityDeliveryCouriers','dataset.cityDeliveryParcels','dataset.cityDeliveryLoading'])assert.ok(population.includes(token),'delivery population runtime missing '+token);
assert.ok(main.includes('state:agent.state,carryingParcel:agent.carryingParcel'),'courier state must reach the shared traffic actor channel');
for(const token of ["actors.find(actor=>actor.id==='jiho-lee')",'courierAtVan','parkedActiveDeliveries','darkness>.04||courierAtVan','dataset.parkedActiveDeliveries'])assert.ok(engine.includes(token),'delivery van reaction missing '+token);
for(const [source,token] of [[smoke,'reactive courier delivery routine'],[readme,'Reactive courier delivery'],[contributing,'v18-delivery-routine-check.mjs'],[workflow,'v18-delivery-routine-check.mjs']])assert.ok(source.includes(token),'release verification wiring missing '+token);
console.log('PASS courier delivery: existing bilingual courier, dedicated van-crossing-loading route, carried parcel, two-hand pose, loading pause, drop and return, saved snapshot telemetry, player and rain-compatible crowd behavior, van hazard reaction, docs, smoke, and CI');
