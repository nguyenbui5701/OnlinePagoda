import {cameraProfiles,type CameraView,type CommentEffectKind} from '@vuonsen/shared';
import type {Rect} from './live-motion';
export const commentLabelBounds:Rect={x:300,y:1012,width:480,height:32};
export function commentEffectRegion(kind:CommentEffectKind,view:CameraView='front'):Rect{
  if(view!=='front'){
    const base=commentEffectRegion(kind,'front'),face=cameraProfiles[view].face;
    return {...base,y:Math.max(base.y,face.y+face.height+26)};
  }
  if(kind==='phoenix'||kind==='long-phung')return {x:290,y:530,width:500,height:474};
  return ['dragon','phoenix','long-phung'].includes(kind)?{x:260,y:490,width:560,height:514}:(kind==='lotus'||kind.startsWith('sen-'))?{x:300,y:620,width:480,height:384}:{x:300,y:720,width:480,height:284};
}
/** Fit meaningful artwork, not its halo; all measurements are canvas pixels. */
export function commentArtworkLayout(kind:CommentEffectKind,bounds:Rect,view:CameraView='front',safeRegion?:Rect){
  const region=safeRegion??commentEffectRegion(kind,view),wide=kind==='fish'||kind==='offering';
  const myth=['dragon','phoenix','long-phung'].includes(kind);
  const maxHeight=myth?470:(kind==='lotus'||kind.startsWith('sen-'))?300:220;
  const scale=Math.min((myth?560:wide?400:420)/Math.max(1,bounds.width),maxHeight/Math.max(1,bounds.height));
  return {scale,pivotX:bounds.x+bounds.width/2,pivotY:bounds.y+bounds.height/2,x:540,y:region.y+region.height/2};
}
