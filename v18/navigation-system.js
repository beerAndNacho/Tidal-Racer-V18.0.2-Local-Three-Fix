export const NAVIGATION_BOUNDS=Object.freeze({minX:-3900,maxX:3650,minZ:-3500,maxZ:2200});
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

export class NavigationDirector{
  constructor(saved=null){this.profile={waypoint:null};this.view={centerX:(NAVIGATION_BOUNDS.minX+NAVIGATION_BOUNDS.maxX)/2,centerZ:(NAVIGATION_BOUNDS.minZ+NAVIGATION_BOUNDS.maxZ)/2,zoom:1};this.restore(saved)}
  scale(width,height){return Math.min(Math.max(1,width)/(NAVIGATION_BOUNDS.maxX-NAVIGATION_BOUNDS.minX),Math.max(1,height)/(NAVIGATION_BOUNDS.maxZ-NAVIGATION_BOUNDS.minZ))*.88*this.view.zoom}
  worldToScreen(point,width,height){const scale=this.scale(width,height);return{x:width/2+((Number(point.x)||0)-this.view.centerX)*scale,y:height/2+((Number(point.z)||0)-this.view.centerZ)*scale}}
  screenToWorld(point,width,height){const scale=this.scale(width,height);return{x:this.view.centerX+((Number(point.x)||0)-width/2)/scale,z:this.view.centerZ+((Number(point.y)||0)-height/2)/scale}}
  clampView(){const spanX=(NAVIGATION_BOUNDS.maxX-NAVIGATION_BOUNDS.minX)/this.view.zoom,spanZ=(NAVIGATION_BOUNDS.maxZ-NAVIGATION_BOUNDS.minZ)/this.view.zoom,marginX=spanX*.38,marginZ=spanZ*.38;this.view.centerX=clamp(this.view.centerX,NAVIGATION_BOUNDS.minX-marginX,NAVIGATION_BOUNDS.maxX+marginX);this.view.centerZ=clamp(this.view.centerZ,NAVIGATION_BOUNDS.minZ-marginZ,NAVIGATION_BOUNDS.maxZ+marginZ)}
  panPixels(dx,dy,width,height){const scale=this.scale(width,height);this.view.centerX-=Number(dx||0)/scale;this.view.centerZ-=Number(dy||0)/scale;this.clampView();return this.snapshot()}
  zoomAt(factor,screenX,screenY,width,height){const before=this.screenToWorld({x:screenX,y:screenY},width,height);this.view.zoom=clamp(this.view.zoom*(Number(factor)||1),.72,3.4);const after=this.screenToWorld({x:screenX,y:screenY},width,height);this.view.centerX+=before.x-after.x;this.view.centerZ+=before.z-after.z;this.clampView();return this.snapshot()}
  resetView(){this.view.centerX=(NAVIGATION_BOUNDS.minX+NAVIGATION_BOUNDS.maxX)/2;this.view.centerZ=(NAVIGATION_BOUNDS.minZ+NAVIGATION_BOUNDS.maxZ)/2;this.view.zoom=1;return this.snapshot()}
  setWaypoint(point,label='CUSTOM WAYPOINT'){const x=clamp(point?.x,NAVIGATION_BOUNDS.minX,NAVIGATION_BOUNDS.maxX),z=clamp(point?.z,NAVIGATION_BOUNDS.minZ,NAVIGATION_BOUNDS.maxZ);this.profile.waypoint={x,z,label:String(label||'CUSTOM WAYPOINT').slice(0,64),createdAt:new Date().toISOString()};return clone(this.profile.waypoint)}
  clearWaypoint(){const previous=this.profile.waypoint;this.profile.waypoint=null;return previous}
  distanceFrom(point){return this.profile.waypoint?Math.hypot((Number(point?.x)||0)-this.profile.waypoint.x,(Number(point?.z)||0)-this.profile.waypoint.z):null}
  serialize(){return clone(this.profile)}
  restore(saved){if(!saved||typeof saved!=='object'||!saved.waypoint)return this.profile;const waypoint=saved.waypoint;if(Number.isFinite(Number(waypoint.x))&&Number.isFinite(Number(waypoint.z)))this.setWaypoint(waypoint,waypoint.label);return this.profile}
  snapshot(point=null){return{waypoint:clone(this.profile.waypoint),distance:point?this.distanceFrom(point):null,view:{...this.view},bounds:{...NAVIGATION_BOUNDS}}}
}
