import {activeCamera,cameraFaceBounds,cameraFrame,cameraPoint,floorPoint,cardPresentation,type SceneState} from './index';
const compactCardBounds={x:148,y:1056,width:784,height:184};
export interface EffectRect{x:number;y:number;width:number;height:number}
type Rect=EffectRect;
export type EffectSpaceState=Pick<SceneState,'settings'|'camera'|'fortune'|'lantern'|'tree'>;
export const compactPanelY=220;
export const treePanelY=592;
export const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export function informationObstacles(state:EffectSpaceState):Rect[]{
  const s=state.settings,boxes:Rect[]=[];
  if(s.showGiftPanel)boxes.push(s.compactGiftPanels?{x:24,y:compactPanelY,width:230,height:350}:{x:24,y:180,width:258,height:710});
  if(s.showThanksPanel)boxes.push(s.compactGiftPanels?{x:826,y:compactPanelY,width:230,height:350}:{x:798,y:210,width:258,height:674});
  if(state.tree?.enabled&&s.showBlessingTree)boxes.push(s.compactGiftPanels?{x:24,y:treePanelY,width:230,height:322}:{x:300,y:204,width:480,height:62});
  return boxes;
}
export function contentObstacle(state:EffectSpaceState,now:number):Rect|undefined{
  return [state.fortune,state.lantern].some(c=>c&&cardPresentation(c,now).visible)?state.settings.liveSafeLayout?compactCardBounds:{x:96,y:1340,width:888,height:450}:undefined;
}
export function effectGround(state:EffectSpaceState,now:number){
  const view=activeCamera(state),project=state.settings.templeFloorPreview?floorPoint:cameraPoint;
  const p=project(view,540,1182),a=project(view,500,1182),b=project(view,580,1182),c=cameraFrame(state,now);
  return {x:Math.max(300,Math.min(780,p.x*c.scale+c.x)),y:p.y*c.scale+c.y,angle:Math.atan2(b.y-a.y,b.x-a.x)};
}
/** Relocate at full size; never shrink the art or skew its lettering. */
export function placeEffect(state:EffectSpaceState,now:number,width:number,height:number,preferred:{x:number;y:number},extra:Rect[]=[],fixedX=false){
  const face=state.settings.sceneSpace==='courtyard'?{x:390,y:210,width:300,height:470}:cameraFaceBounds(state,now);
  const card=contentObstacle(state,now),obstacles=[face,...informationObstacles(state),...extra,...(card?[card]:[])];
  const xs=fixedX?[preferred.x]:[preferred.x,540,300,780];
  const ys=[preferred.y,...obstacles.map(b=>b.y+b.height+12+height/2),...obstacles.map(b=>b.y-12-height/2)];
  const choices=xs.flatMap(x=>ys.map(y=>({x,y}))).sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
  for(const p of choices){const r={x:p.x-width/2,y:p.y-height/2,width,height};if(r.x<12||r.x+width>1068||r.y<218||r.y+height>1870)continue;if(!obstacles.some(b=>overlaps(r,b)))return {...p,bounds:r};}
}
