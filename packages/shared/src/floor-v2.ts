import type {CameraView} from './camera';
import {floorCameraProfiles} from './camera';
import type {Seat} from './index';
function frontSeatInner(y:number){
 const d=1-.00012*(y-1050),screenY=floorCameraProfiles.front.urn.y+.86*(y-1050)/d;
 const edge=480-(screenY-1000)*216/920;
 return 540+(edge-540)*d/.82-44;
}
function regularGroundX(x:number,y:number){
 // Undo the chair-bank narrowing required by A's baked-in widening carpet.
 // Keep the centre runner fixed and connect the bank to it continuously so
 // walking actors, row paths and chair feet share the same presentation map.
 const left=x<=540,q=left?x:1080-x,inner=frontSeatInner(y);
 const edge=carpetV2.left;
 const mapped=q<=inner?55+(q-55)*(360-55)/(inner-55):q<edge?360+(q-inner)*(edge-360)/(edge-inner):q;
 return left?mapped:1080-mapped;
}
/** One homography for the floor, runner and regular chair grid of each view. */
function projectFloor(view:CameraView,x:number,y:number){
 const X=x-540,Z=y-1050,side=view==='left'?1:view==='right'?-1:0;
 const wide=view==='wide';
 const d=1+side*.00025*X-(wide?.00008:side?.00010:.00012)*Z;
 const {x:cx,y:cy}=floorCameraProfiles[view].urn;
 // Reference composition: left altar -> right foreground; right altar -> left.
 // One homography for every ground element, including the two banks of seats.
 return {x:cx+((side?.74:.82)*X+side*.80*Z)/d,y:cy+(-side*.09*X+(wide?.71:side?.66:.86)*Z)/d,
  scale:Math.max(.9,Math.min(1,(wide?.92:.98)/d))};
}
/** Server routes remain in A's calibrated coordinates. B/C/D remove its
 * narrowing before projection, so chair columns follow the runner's depth. */
export function floorPoint(view:CameraView,x:number,y:number){
 return projectFloor(view,view==='front'?x:regularGroundX(x,y),y);
}
/** Project a cushion about its corrected centre without stretching its shape
 * with the bank remapping. Its ellipse still follows the local floor plane. */
export function floorCushionPoint(view:CameraView,x:number,y:number,dx:number,dy:number){
 return projectFloor(view,(view==='front'?x:regularGroundX(x,y))+dx,y+dy);
}
export function floorHome(seat:Seat):Seat{
 if(seat.id.startsWith('standing-'))return {...seat,y:1890+(seat.y-1785)/76*50};
 if(!/^seat-\d+$/.test(seat.id))return {...seat};
 const index=Number(seat.id.replace('seat-',''));
 const y=1240+Math.floor(index/10)*62;
 // The frontal artwork has a widening runner. Calibrate its left edge in
 // screen coordinates, then invert the SAME ground projection for chair feet.
 const inner=frontSeatInner(y);
 const col=index%5,left=index%10<5;
 const x=left?55+(inner-55)*col/4:1080-inner+(inner-55)*col/4;
 return {...seat,x,y};
}
export const floorV2Bounds={x:0,y:1050,width:1080,height:900};
export const carpetV2={left:420,right:660,up:500,down:580,branches:Array.from({length:10},(_,i)=>1271+i*62),prayer:{x:300,y:1060,width:480,height:156}};
export interface CarpetPatch {kind:'aisle'|'branch'|'prayer';x:number;y:number;width:number;height:number}
/** Repeat a sharp, limited-depth band of the original carpet, rather than
 * stretching its entire far-to-near photograph over a new floor. */
export function carpetSourceRow(v:number){
 const cycles=Math.max(0,Math.min(1,v))*4,t=cycles===4?1:cycles%1;
 const far=(1260-870)/801,near=(1540-870)/801;
 const farWidth=105+375*far,nearWidth=105+375*near;
 const local=farWidth*t/(nearWidth*(1-t)+farWidth*t);
 const depth=far+(near-far)*local;
 return {y:870+801*depth,left:420-190*depth,right:525+185*depth};
}
/** Side rugs join the spine; none is allowed to paint across its continuous borders. */
export function carpetPatches():CarpetPatch[]{
 const {left,right}=carpetV2;
 // Prayer slots remain logical destinations, not two obsolete visible rugs.
 const patches:CarpetPatch[]=[];
 for(const y of carpetV2.branches)patches.push(
  {kind:'branch',x:25,y:y-12,width:left-25,height:24},
  {kind:'branch',x:right,y:y-12,width:1055-right,height:24}
 );
 // Last: the uninterrupted longitudinal weave and double border remain on top.
 patches.push({kind:'aisle',x:left,y:1050,width:right-left,height:1000});
 return patches;
}
