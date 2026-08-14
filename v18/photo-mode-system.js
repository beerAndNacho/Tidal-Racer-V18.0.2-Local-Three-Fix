export const PHOTO_FILTERS=Object.freeze([
  {id:'natural',name:'NATURAL',css:'none'},
  {id:'coastal',name:'COASTAL FILM',css:'saturate(1.12) contrast(1.06) brightness(1.03)'},
  {id:'golden',name:'GOLDEN HOUR',css:'sepia(.18) saturate(1.2) contrast(1.04) brightness(1.04)'},
  {id:'storm',name:'STORM NOIR',css:'saturate(.68) contrast(1.18) brightness(.88)'},
  {id:'postcard',name:'POSTCARD',css:'saturate(1.3) contrast(1.12) brightness(1.02)'},
]);

const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const clean=value=>String(value||'tidal-racer').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'tidal-racer';

export class PhotoModeDirector{
  constructor(){this.active=false;this.yaw=0;this.pitch=.22;this.distance=12;this.fov=55;this.filterIndex=0;this.hudVisible=false;this.captureCount=0;this.originalFov=55}
  enter({cameraPosition,target,fov=55}={}){const dx=(cameraPosition?.x||0)-(target?.x||0),dy=(cameraPosition?.y||0)-(target?.y||0),dz=(cameraPosition?.z||0)-(target?.z||0),distance=Math.max(2,Math.hypot(dx,dy,dz));this.active=true;this.distance=clamp(distance,3,42);this.yaw=Math.atan2(dx,dz);this.pitch=clamp(Math.asin(clamp(dy/distance,-1,1)),-.18,1.12);this.fov=clamp(fov,28,78);this.originalFov=this.fov;return this.snapshot()}
  exit(){this.active=false;return this.snapshot()}
  reset(){this.yaw=Math.PI;this.pitch=.26;this.distance=12;this.fov=55;return this.snapshot()}
  update(dt,input={}){if(!this.active)return this.snapshot();const step=clamp(dt,0,.05),yaw=(Number(input.yaw)||0),pitch=(Number(input.pitch)||0),zoom=(Number(input.zoom)||0),fov=(Number(input.fov)||0);this.yaw+=yaw*step*1.45;this.pitch=clamp(this.pitch+pitch*step*.92,-.18,1.12);this.distance=clamp(this.distance*Math.exp(zoom*step*1.35),3,48);this.fov=clamp(this.fov+fov*step*34,28,78);return this.snapshot()}
  cycleFilter(direction=1){this.filterIndex=(this.filterIndex+(direction<0?-1:1)+PHOTO_FILTERS.length)%PHOTO_FILTERS.length;return this.filter}
  toggleHud(){this.hudVisible=!this.hudVisible;return this.hudVisible}
  get filter(){return PHOTO_FILTERS[this.filterIndex]}
  position(target={x:0,y:0,z:0}){const planar=Math.cos(this.pitch)*this.distance;return{x:(Number(target.x)||0)+Math.sin(this.yaw)*planar,y:(Number(target.y)||0)+Math.sin(this.pitch)*this.distance,z:(Number(target.z)||0)+Math.cos(this.yaw)*planar}}
  captureFilename({region='archipelago',rider='rider'}={}){this.captureCount++;const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');return`tidal-racer-${clean(region)}-${clean(rider)}-${stamp}-${String(this.captureCount).padStart(2,'0')}.png`}
  snapshot(){return{active:this.active,yaw:this.yaw,pitch:this.pitch,distance:this.distance,fov:this.fov,filter:this.filter,hudVisible:this.hudVisible,captureCount:this.captureCount}}
}
