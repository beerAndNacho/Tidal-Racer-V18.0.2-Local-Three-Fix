const STORAGE_KEY='tidal-racer-gamepad-v1';

export const DEFAULT_GAMEPAD_SETTINGS=Object.freeze({deadzone:.14,sensitivity:1,vibration:true});

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):min));
const pressed=button=>Boolean(button&&(button.pressed||button.value>.55));
const value=button=>clamp(button?.value??(button?.pressed?1:0),0,1);

export function normalizeAxis(raw,deadzone=.14,sensitivity=1){
  const axis=clamp(raw,-1,1),magnitude=Math.abs(axis),zone=clamp(deadzone,.05,.35);
  if(magnitude<=zone)return 0;
  const linear=(magnitude-zone)/(1-zone),curve=Math.pow(linear,1/clamp(sensitivity,.5,1.5));
  return Math.sign(axis)*clamp(curve,0,1);
}

export class GamepadDirector{
  constructor({storage}={}){
    this.storage=storage;
    if(this.storage===undefined){try{this.storage=globalThis.localStorage}catch{this.storage=null}}
    this.settings={...DEFAULT_GAMEPAD_SETTINGS};
    this.index=null;this.id='';this.connected=false;this.previousButtons=[];this.events=[];this.pad=null;
    this.state={connected:false,id:'',index:null,steer:0,throttle:0,brake:0,drift:false,boost:false,active:false};
    try{this.updateSettings(JSON.parse(this.storage?.getItem?.(STORAGE_KEY)||'null')||{},false)}catch{}
  }

  updateSettings(next={},persist=true){
    if('deadzone' in next)this.settings.deadzone=clamp(next.deadzone,.05,.35);
    if('sensitivity' in next)this.settings.sensitivity=clamp(next.sensitivity,.5,1.5);
    if('vibration' in next)this.settings.vibration=Boolean(next.vibration);
    if(persist)this.save();
    return {...this.settings};
  }

  save(){try{this.storage?.setItem?.(STORAGE_KEY,JSON.stringify(this.settings))}catch{}return {...this.settings}}

  disconnect(){
    if(this.connected)this.events.push({type:'disconnected',id:this.id,index:this.index});
    this.index=null;this.id='';this.connected=false;this.previousButtons=[];this.pad=null;
    this.state={connected:false,id:'',index:null,steer:0,throttle:0,brake:0,drift:false,boost:false,active:false};
    return {...this.state};
  }

  poll(gamepads){
    let pads=gamepads;
    if(pads===undefined){try{pads=globalThis.navigator?.getGamepads?.()||[]}catch{pads=[]}}
    const list=Array.from(pads||[]),current=(this.index!=null&&list[this.index]?.connected)?list[this.index]:list.find(pad=>pad?.connected);
    if(!current)return this.disconnect();
    const isNew=!this.connected||this.index!==current.index||this.id!==current.id;
    this.pad=current;this.index=current.index;this.id=String(current.id||'STANDARD GAMEPAD').slice(0,96);this.connected=true;
    if(isNew){this.previousButtons=(current.buttons||[]).map(pressed);this.events.push({type:'connected',id:this.id,index:this.index})}

    const buttons=current.buttons||[],axes=current.axes||[],dpadLeft=pressed(buttons[14]),dpadRight=pressed(buttons[15]),dpadUp=pressed(buttons[12]),dpadDown=pressed(buttons[13]);
    const analogSteer=normalizeAxis(axes[0]||0,this.settings.deadzone,this.settings.sensitivity);
    const steer=clamp(analogSteer+(dpadRight?1:0)-(dpadLeft?1:0),-1,1),throttle=Math.max(value(buttons[7]),dpadUp?1:0),brake=Math.max(value(buttons[6]),dpadDown?1:0),drift=pressed(buttons[0]),boost=pressed(buttons[5]);
    const edgeActions={0:'confirm',1:'item',2:'fishingAction',3:'activity',4:'camera',8:'mode',9:'toggleFishing',10:'skill0',11:'skill1',12:'menuUp',13:'menuDown',14:'menuLeft',15:'menuRight'};
    if(!isNew)for(const [index,action] of Object.entries(edgeActions)){const down=pressed(buttons[index]);if(down&&!this.previousButtons[index])this.events.push({type:'action',action,index:Number(index)})}
    this.previousButtons=(buttons||[]).map(pressed);
    const active=Math.abs(steer)>.02||throttle>.02||brake>.02||drift||boost||Object.keys(edgeActions).some(index=>pressed(buttons[index]));
    this.state={connected:true,id:this.id,index:this.index,steer,throttle,brake,drift,boost,active};
    return {...this.state};
  }

  drainEvents(){const events=this.events;this.events=[];return events}

  pulse(intensity=.5,duration=90){
    if(!this.settings.vibration||!this.connected||!this.pad)return false;
    const strength=clamp(intensity,0,1),ms=Math.round(clamp(duration,20,500));
    try{
      if(typeof this.pad.vibrationActuator?.playEffect==='function'){
        void Promise.resolve(this.pad.vibrationActuator.playEffect('dual-rumble',{duration:ms,startDelay:0,strongMagnitude:strength,weakMagnitude:Math.min(1,strength*.72)})).catch(()=>{});return true;
      }
      const actuator=this.pad.hapticActuators?.[0]||this.pad.vibrationActuator;
      if(typeof actuator?.pulse==='function'){void Promise.resolve(actuator.pulse(strength,ms)).catch(()=>{});return true}
    }catch{}
    return false;
  }

  snapshot(){return{...this.state,settings:{...this.settings}}}
}
