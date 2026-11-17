import {effectGround,overlaps,informationObstacles,contentObstacle,type EffectSpaceState,type EffectRect} from './effect-space';
import {cameraFaceBounds} from './camera-motion';
import {stableSeed,type GiftFlight,type GiftTier,type GiftShow} from './gift-show';

/** Lotus/name stay full size. Only flanking decorations adapt to a tight altar view. */
export function giftComposition(tier:GiftTier,ornamentScale=1){
  const k=Math.max(.55,Math.min(1,ornamentScale));
  const ornaments=tier===1?[]:[-1,1].map(side=>({x:side*(tier>=3?285:200)*k,y:-20,width:(tier>=3?210:160)*k,height:(tier>=3?450:160)*k}));
  const parts:EffectRect[]=[{x:-190,y:-190,width:380,height:410},...ornaments.map(o=>({x:o.x-o.width/2-12,y:o.y-o.height/2-12,width:o.width+24,height:o.height+24}))];
  const x=Math.min(...parts.map(p=>p.x)),y=Math.min(...parts.map(p=>p.y));
  return {ornaments,parts,bounds:{x,y,width:Math.max(...parts.map(p=>p.x+p.width))-x,height:Math.max(...parts.map(p=>p.y+p.height))-y}};
}
/** Never search the seat area when the altar is busy. */
export function giftStageBottom(state:EffectSpaceState,now:number){return Math.min(1100,effectGround(state,now).y-100);}
/** Entire composition + name swept over its flight, in fixed screen coordinates. */
export function giftFlightBounds(f:GiftFlight):EffectRect {
  const b=giftComposition(f.groupTier??1,f.ornamentScale).bounds;
  return {x:f.x+b.x,y:f.y-f.rise+b.y,width:b.width,height:b.height+f.rise};
}
/** Empty gaps between the decorations do not cover the face or panels. */
export function giftFlightParts(f:GiftFlight):EffectRect[]{
  return giftComposition(f.groupTier??1,f.ornamentScale).parts.map(p=>({x:f.x+p.x,y:f.y-f.rise+p.y,width:p.width,height:p.height+f.rise}));
}
export function giftFlightFits(state:EffectSpaceState,now:number,f:GiftFlight,occupied:EffectRect[]=[]){
  const card=contentObstacle(state,now);
  const face=state.settings.sceneSpace==='courtyard'?{x:390,y:210,width:300,height:470}:cameraFaceBounds(state,now);
  const obstacles=[face,...informationObstacles(state),...(card?[card]:[])];
  return fitsUpperStage(f,giftStageBottom(state,now),obstacles,occupied);
}
function fitsUpperStage(f:GiftFlight,stageBottom:number,obstacles:EffectRect[],occupied:EffectRect[]){
  const b=giftFlightBounds(f);
  return b.x>=12&&b.x+b.width<=1068&&b.y>=218&&b.y+b.height<=stageBottom+1e-6&&
    !occupied.some(r=>overlaps(b,r))&&!giftFlightParts(f).some(p=>obstacles.some(r=>overlaps(p,r)));
}
/** Pick once on the server. Camera, donor motion and cards must never re-route an active flight. */
export function planGiftFlight(state:EffectSpaceState,now:number,id:string,tier:GiftTier,preferredX:number,occupied:EffectRect[]):GiftFlight|undefined {
  const ground=effectGround(state,now),seed=stableSeed(id),stageBottom=giftStageBottom(state,now);
  const jitterX=(seed%25)-12,jitterY=(seed>>>8)%9;
  const face=state.settings.sceneSpace==='courtyard'?{x:390,y:210,width:300,height:470}:cameraFaceBounds(state,now);
  const card=contentObstacle(state,now),obstacles=[face,...informationObstacles(state),...(card?[card]:[])];
  // Small gifts reserve a bank before considering the middle. Otherwise a
  // longer centre flight can win over a shorter flank flight and block both
  // sides, even though two full-size lotuses would fit above the seats.
  const preferBanks=tier<=2&&state.settings.compactGiftPanels;
  for(const bankOnly of preferBanks?[true,false]:[false]){
  for(const ornamentScale of tier===1?[1]:[1,.85,.7,.55]){
    const composition=giftComposition(tier,ornamentScale),b=composition.bounds;
    const minX=12-b.x,maxX=1068-b.x-b.width;
    const clampX=(x:number)=>Math.max(minX,Math.min(maxX,x));
    const xs=[preferredX+jitterX,...(seed%2?[800,280,540]:[280,800,540]).map(x=>x+jitterX),
      face.x-12-b.x-b.width,face.x+face.width+12-b.x,minX,maxX].map(clampX)
      .filter(x=>!bankOnly||x+b.x+b.width<=534||x+b.x>=546);
    for(const rise of state.settings.reducedEffects?[0]:[210,140,80,40,10,0]){
      const maxY=stageBottom-b.y-b.height;
      const ys=[maxY-jitterY,maxY,...[...obstacles,...occupied].flatMap(r=>[r.y-12-b.y-b.height,r.y+r.height+12-b.y+rise])];
      for(const y of ys)for(const x of xs){
        const flight:GiftFlight={x,y,rise,angle:ground.angle,groupTier:tier,ornamentSpace:'lotus',ornamentScale,stageBottom,
          ornaments:composition.ornaments.map(o=>({x:o.x,y:o.y}))};
        if(fitsUpperStage(flight,stageBottom,obstacles,occupied))return flight;
      }
    }
  }
  }
}
/** Progress stays monotonic when a preview becomes a confirmed medium gift. */
export function giftFlightProgress(show:GiftShow,now:number){
  const start=show.promotedAt??show.startedAt,from=show.progressAtPromotion??0;
  return from+(1-from)*Math.max(0,Math.min(1,(now-start)/Math.max(1,show.endsAt-start)));
}
