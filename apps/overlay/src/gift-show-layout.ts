import type {GiftShow,SceneState} from '@vuonsen/shared';
import {giftFlightProgress} from '@vuonsen/shared';
import type {Rect} from './live-motion';
export function giftShowRegion(_state:SceneState,_now:number):Rect{return {x:12,y:218,width:1056,height:1652};}
export function giftShowPose(show:GiftShow,now:number,reduced=false){
  const p=giftFlightProgress(show,now);
  if(show.flight)return {x:show.flight.x,y:show.flight.y-show.flight.rise*p,scale:360/280,alpha:Math.max(0,Math.min(1,p*8,(1-p)*6)),p};
  return {x:show.tier<=2?[300,540,780][show.lane]+show.jitter*.3:540,y:1040-(reduced?0:210*p),
    scale:360/280,alpha:Math.max(0,Math.min(1,p*8,(1-p)*6)),p};
}
