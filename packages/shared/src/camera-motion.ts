import {activeCamera,cameraPoint,cameraProfile,type CameraState,type CameraView} from './camera';
import {floorPoint} from './floor-v2';
import type {GroundPoint} from './ground-routes';
export interface CameraTransform {scale:number;x:number;y:number}
export interface CameraMotion {kind:'drift'|'focus'|'recover'|'settle';from:CameraTransform;to:CameraTransform;startedAt:number;endsAt:number;actorId?:string;ritualKey?:string;releaseAt?:number;spaceFrom?:number;spaceTo?:number}
export function focusSpaceAt(m:CameraMotion|undefined,now:number){if(!m)return 0;const p=Math.max(0,Math.min(1,(now-m.startedAt)/Math.max(1,m.endsAt-m.startedAt))),t=p*p*p*(10+p*(-15+6*p));return (m.spaceFrom??0)+((m.spaceTo??0)-(m.spaceFrom??0))*t;}
export const cameraRest:CameraTransform={scale:1,x:0,y:0};
export function motionAt(m:CameraMotion|undefined,now:number):CameraTransform{
 if(!m)return {...cameraRest};
 const p=Math.max(0,Math.min(1,(now-m.startedAt)/Math.max(1,m.endsAt-m.startedAt))),t=p*p*p*(10+p*(-15+6*p));
 return {scale:m.from.scale+(m.to.scale-m.from.scale)*t,x:m.from.x+(m.to.x-m.from.x)*t,y:m.from.y+(m.to.y-m.from.y)*t};
}
export function boundCamera(t:CameraTransform,view:CameraView,keepFace=false,floorV2=false):CameraTransform{
 const scale=Math.max(1,Math.min(1.3,t.scale));
 let x=Math.max(1080*(1-scale),Math.min(0,t.x)),y=Math.max(1920*(1-scale),Math.min(0,t.y));
 if(keepFace){const f=cameraProfile(view,floorV2).face;y=Math.max(y,218-f.y*scale);x=Math.max(24-f.x*scale,Math.min(1056-(f.x+f.width)*scale,x));}
 return {scale,x:Math.max(1080*(1-scale),Math.min(0,x)),y:Math.max(1920*(1-scale),Math.min(0,y))};
}
export function driftTarget(view:CameraView,zoom:number,dx:number,dy:number,floorV2=false){
 const scale=1.03+.07*Math.max(0,Math.min(1,zoom));
 // Front's face sits near the upper HUD: use an upper composition pivot so
 // the face clamp still stays within the promised +/-24px pan envelope.
 const pivotY=view==='front'?540:960;
 return boundCamera({scale,x:-540*(scale-1)+(dx*2-1)*32,y:-pivotY*(scale-1)+(dy*2-1)*24},view,true,floorV2);
}
export function offeringCamera(view:CameraView,floorV2=false,target:GroundPoint={x:540,y:1182}){
 const p=(floorV2?floorPoint:cameraPoint)(view,target.x,target.y),scale=1.3;
 return boundCamera({scale,x:540-p.x*scale,y:1018-p.y*scale},view);
}
export function pickDriftTarget(view:CameraView,from:CameraTransform,random:()=>number,floorV2=false){
 const target=(z:number,x:number,y:number)=>driftTarget(view,z,x,y,floorV2);
 let best=target(random(),random(),random());
 const distance=(p:CameraTransform)=>Math.hypot(p.x-from.x,p.y-from.y)+Math.abs(p.scale-from.scale)*600;
 for(let i=0;i<5&&distance(best)<24;i++){const p=target(random(),random(),random());if(distance(p)>distance(best))best=p;}
 if(distance(best)<24)best=target(from.scale<1.065?.95:.05,from.x>-540*(from.scale-1)?.05:.95,from.y>-(view==='front'?540:960)*(from.scale-1)?.05:.95);
 return best;
}
export function cameraFrame(state:{settings:{theme:string;sceneSpace:string};camera?:CameraState},now:number,view=activeCamera(state)){
 if(state.settings.theme!=='golden'||state.settings.sceneSpace!=='hall')return {...cameraRest};
 const c=state.camera;if(c?.from===view&&(c.endsAt??0)>now)return c.frozenFrom??{...cameraRest};
 return boundCamera(motionAt(c?.motion,now),view);
}
export function cameraRect(r:{x:number;y:number;width:number;height:number},t:CameraTransform){return {x:r.x*t.scale+t.x,y:r.y*t.scale+t.y,width:r.width*t.scale,height:r.height*t.scale};}
export function cameraFaceBounds(state:{settings:{theme:string;sceneSpace:string;templeFloorPreview?:boolean};camera?:CameraState},now:number){
 const v2=state.settings.templeFloorPreview&&state.settings.sceneSpace==='hall'&&state.settings.theme==='golden';
 const view=activeCamera(state),r=cameraRect(cameraProfile(view,v2).face,cameraFrame(state,now,view));
 const from=state.camera?.from;
 if(from&&(state.camera?.endsAt??0)>now){const b=cameraRect(cameraProfile(from,v2).face,cameraFrame(state,now,from));const x=Math.min(r.x,b.x),y=Math.min(r.y,b.y);return {x,y,width:Math.max(r.x+r.width,b.x+b.width)-x,height:Math.max(r.y+r.height,b.y+b.height)-y};}
 return r;
}
