export const cameraViews=['front','left','right','wide'] as const;
export type CameraView=typeof cameraViews[number];
export const cameraLabels:Record<CameraView,string>={front:'A · Chính diện',left:'B · Chéo trái',right:'C · Chéo phải',wide:'D · Toàn cảnh'};
import type {CameraMotion,CameraTransform} from './camera-motion';
export interface CameraState {view:CameraView;revision:number;stage:'manual-review'|'automatic';from?:CameraView;startedAt?:number;endsAt?:number;nextAt?:number;waiting?:string;paused?:string;disabled?:CameraView[];motion?:CameraMotion;frozenFrom?:CameraTransform}
export interface CameraDisplay {view:CameraView;capture:boolean;errors:Partial<Record<CameraView,string>>}
/** Floor coordinates remain engine-owned. These are presentation calibrations only. */
export function cameraPoint(view:CameraView,x:number,y:number){
 if(view==='front')return {x,y,scale:1};
 if(view==='wide')return {x:540+(x-540)*.92,y:1120+(y-1050)*.85,scale:.92};
 const side=view==='left'?1:-1,depth=(side*(x-540)+500)/1000,t=Math.max(0,Math.min(1,(y-1050)/810));
 return {x:540+(x-540)*(.76+.12*t)+side*(1920-y)*.155,y:y-side*(x-540)*.12*(1-.5*t),scale:Math.max(.97,Math.min(1,1-depth*.03))};
}
export const cameraProfiles={
 front:{statue:{x:540,y:893,height:690},urn:{x:540,y:1050,width:295},face:{x:440,y:250,width:200,height:220},effectX:540},
 left:{statue:{x:675,y:925,height:650},urn:{x:675,y:1050,width:286},face:{x:575,y:300,width:200,height:220},effectX:560},
 right:{statue:{x:405,y:925,height:650},urn:{x:405,y:1050,width:286},face:{x:305,y:300,width:200,height:220},effectX:520},
 wide:{statue:{x:540,y:1000,height:390},urn:{x:540,y:1120,width:250},face:{x:475,y:620,width:130,height:150},effectX:540}
} as const;
/** Calibrated to the supplied clean architecture. Legacy scenes keep their anchors. */
export const floorCameraProfiles={
 front:cameraProfiles.front,
 left:{statue:{x:405,y:1000,height:540},urn:{x:405,y:1180,width:286},face:{x:325,y:480,width:160,height:180},effectX:560},
 right:{statue:{x:675,y:1000,height:540},urn:{x:675,y:1180,width:286},face:{x:595,y:480,width:160,height:180},effectX:520},
 wide:{statue:{x:540,y:1020,height:390},urn:{x:540,y:1120,width:250},face:{x:475,y:640,width:130,height:150},effectX:540}
} as const;
export const cameraProfile=(view:CameraView,floorV2=false)=>(floorV2?floorCameraProfiles:cameraProfiles)[view];
export function activeCamera(state:{settings:{sceneSpace:string;theme:string};camera?:CameraState}):CameraView {
 return state.settings.sceneSpace==='hall'&&state.settings.theme==='golden'?(state.camera?.view??'front'):'front';
}
/** At rest, look toward the altar from the projected position, not one direction per camera. */
export function altarFacing(view:CameraView,x:number,y:number):CameraView {
 if(view==='front'||view==='wide')return 'front';
 const p=cameraPoint(view,x,y),dx=cameraProfiles[view].statue.x-p.x;
 return Math.abs(dx)<45?'front':dx>0?'left':'right';
}
/** Effects arriving mid-dissolve must clear BOTH faces until the dissolve ends. */
export function cameraEffectView(state:{settings:{sceneSpace:string;theme:string};camera?:CameraState},now:number):CameraView {
 const view=activeCamera(state),from=state.camera?.from;
 if(state.settings.theme!=='golden'||state.settings.sceneSpace!=='hall'||!from||(state.camera?.endsAt??0)<=now)return view;
 const a=cameraProfiles[view].face,b=cameraProfiles[from].face;
 return b.y+b.height>a.y+a.height?from:view;
}
