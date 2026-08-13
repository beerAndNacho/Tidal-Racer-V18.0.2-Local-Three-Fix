const TAU = Math.PI * 2;
export const WAVE_COMPONENTS = [
  { amplitude: 0.92, wavelength: 190, speed: 0.52, direction: [0.96, 0.28], phase: 0.2 },
  { amplitude: 0.74, wavelength: 128, speed: 0.74, direction: [-0.38, 0.93], phase: 1.3 },
  { amplitude: 0.48, wavelength: 82, speed: 1.03, direction: [0.72, -0.69], phase: 2.2 },
  { amplitude: 0.28, wavelength: 46, speed: 1.46, direction: [-0.91, -0.21], phase: 0.7 },
  { amplitude: 0.14, wavelength: 24, speed: 2.05, direction: [0.18, 0.98], phase: 2.8 },
];
export const REGION_SEA_STATE = {
  'GOLDEN COAST': 0.94,'VOLCANO BAY': 1.18,'MANGROVE DELTA': 0.82,'HARBOR CITY': 0.78,
  'STORM STRAIT': 1.42,'CORAL EXPANSE': 1.02,'MOON ARCHIPELAGO': 1.12,'BLACK REEF': 1.34,'SKYWATER LAGOON': 1.08,
};
export function seaStateFor(regionName='GOLDEN COAST',eventName=''){
  let state=REGION_SEA_STATE[regionName]??1;
  if(eventName==='TIDAL SURGE')state+=.38;
  if(eventName==='STORM CELL')state+=.58;
  if(eventName==='ROGUE WAVE')state+=.72;
  if(eventName==='CURRENT REVERSAL')state+=.12;
  return Math.min(2.05,state);
}
export function waveHeight(x,z,time,seaState=1){
  let height=0;
  for(const wave of WAVE_COMPONENTS){
    const length=Math.hypot(wave.direction[0],wave.direction[1])||1,dx=wave.direction[0]/length,dz=wave.direction[1]/length,k=TAU/wave.wavelength;
    const theta=k*(dx*x+dz*z)+time*wave.speed+wave.phase;
    height+=wave.amplitude*(Math.sin(theta)+.16*Math.sin(theta*2+.45));
  }
  return height*seaState;
}

export function renderWaveHeight(x,z,time,seaState=1){
  let height=0;
  for(let i=0;i<4;i++){
    const wave=WAVE_COMPONENTS[i],length=Math.hypot(wave.direction[0],wave.direction[1])||1,dx=wave.direction[0]/length,dz=wave.direction[1]/length,k=TAU/wave.wavelength;
    const theta=k*(dx*x+dz*z)+time*wave.speed+wave.phase;
    height+=wave.amplitude*(Math.sin(theta)+(i===0?.12*Math.sin(theta*2+.45):0));
  }
  return height*seaState;
}

export function waveNormal(x,z,time,seaState=1,sample=1.8){
  const left=waveHeight(x-sample,z,time,seaState),right=waveHeight(x+sample,z,time,seaState),back=waveHeight(x,z-sample,time,seaState),front=waveHeight(x,z+sample,time,seaState);
  const nx=left-right,nz=back-front,length=Math.hypot(nx,sample*2,nz)||1;
  return{x:nx/length,y:sample*2/length,z:nz/length};
}
export function waveCrestFactor(x,z,time,seaState=1){
  const h=waveHeight(x,z,time,seaState),n=waveNormal(x,z,time,seaState,2.4);
  return Math.max(0,(h/Math.max(1,seaState)-1)*.46+(1-n.y)*2.4);
}
