import fs from 'node:fs';
import { LIFESTYLE_EFFECTS, grantLifestyleEffect, lifestyleBonuses, lifestyleClock, lifestyleEffectFor, pruneLifestyleEffects } from '../v18/lifestyle-effect-system.js';

const city=fs.readFileSync('v18/city-life-system.js','utf8');
const main=fs.readFileSync('v18/main.js','utf8');
const fishing=fs.readFileSync('v18/fishing-system.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const checks=[];
const check=(name,ok,detail='')=>checks.push([name,Boolean(ok),detail]);

check('twelve authored lifestyle effects',Object.keys(LIFESTYLE_EFFECTS).length===12,Object.keys(LIFESTYLE_EFFECTS).length);
check('profile clock is stable',lifestyleClock({day:3,worldHour:7.5})===79.5);
check('unknown action has no effect',lifestyleEffectFor('withdraw_1000')===null);

const breakfast=grantLifestyleEffect('breakfast',[],24);
check('meal grants timed effect',breakfast.length===1&&breakfast[0].expiresAt===29);
const upgradedMeal=grantLifestyleEffect('seafood_bowl',breakfast,25);
check('same-group meal replaces previous meal',upgradedMeal.length===1&&upgradedMeal[0].actionId==='seafood_bowl');
const focused=grantLifestyleEffect('coffee',upgradedMeal,25);
const leisure=grantLifestyleEffect('dance',focused,25);
const trained=grantLifestyleEffect('cardio',leisure,25);
check('different lifestyle groups stack',trained.length===4,trained.length);

const bonuses=lifestyleBonuses(trained,25);
check('energy drain bonus is safely capped',bonuses.energyDrain===.48,bonuses.energyDrain);
check('hunger drain bonus applies',bonuses.hungerDrain===.44,bonuses.hungerDrain);
check('walking bonus is safely capped',bonuses.footSpeed===1.16,bonuses.footSpeed);
check('fishing control combines meal and focus',bonuses.fishingControl>1.1&&bonuses.fishingControl<=1.12,bonuses.fishingControl.toFixed(3));
check('active effects expose remaining time',bonuses.active.every(item=>item.remaining>0&&item.name?.en));
check('expired effects are pruned',pruneLifestyleEffects(trained,38).length===0);
check('invalid save records are ignored',pruneLifestyleEffects([{actionId:'bad',expiresAt:99},{actionId:'coffee',expiresAt:'soon'}],20).length===0);

check('city profile persists lifestyle effects',city.includes('lifestyleEffects:[]')&&city.includes('lifestyleEffects:this.profile.lifestyleEffects.map'));
check('city grants effects after paid routines',city.includes('const lifestyleEffect=this.grantLifestyle(actionId)')&&city.includes('lifestyleEffect,profile:this.serialize().profile'));
check('needs drain consumes lifestyle modifiers',city.includes('*lifestyle.hungerDrain')&&city.includes('*lifestyle.energyDrain'));
check('life panel displays active effects',main.includes('function lifestyleStatusCard()')&&main.includes('ACTIVE LIFESTYLE EFFECTS'));
check('life sequence reports earned effect',main.includes("result.lifestyleEffect?")&&main.includes("$('#lifeSequenceEffect').textContent="));
check('HUD and telemetry report active effects',main.includes("$('#lifeLifestyleStatus')")&&main.includes('dataset.lifestyleEffects')&&index.includes('id="lifeLifestyleStatus"'));
check('on-foot pace consumes lifestyle bonus',main.includes('*lifestyle.footSpeed,pace='));
check('fishing control consumes lifestyle bonus',main.includes('control:lifestyle.fishingControl')&&fishing.includes('tackle.control*control'));
check('craft handling consumes lifestyle bonus',main.includes('turn:tuned.turn*lifestyle.craftHandling'));
check('sequence markup includes effect line',index.includes('id="lifeSequenceEffect"'));

let failed=0;
for(const [name,ok,detail] of checks){
  console.log(`${ok?'PASS':'FAIL'} ${name}${detail!==''?` — ${detail}`:''}`);
  if(!ok)failed++;
}
console.log(`\n${checks.length-failed}/${checks.length} V18 lifestyle effect checks PASS`);
process.exit(failed?1:0);
