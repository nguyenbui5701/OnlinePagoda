import {poseTextureScale,visiblePoseHeight} from './actor-proportions';
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import {cleanText,type Actor,type CameraView} from '@vuonsen/shared';
import type { RitualSpritePose } from './ritual-frame';
import type { ActorFacing } from '../actor-facing';

export interface ActorView { presentationScale?:{reference:number;projection:number}; bodyHeight?:number; root: Container; body: Container; label: Container; hands: Graphics; actor: Actor; facing?: ActorFacing; hasOfferingSprites?: boolean; pose?: (age: number, scale: number, ritualPose?: 'idle' | 'walk' | 'pray' | 'kneel' | RitualSpritePose, facing?: ActorFacing, cameraView?:CameraView) => void }
export async function loadDevotees() {
  const atlas = await Assets.load<Texture>('/overlay/art/golden/devotees-back.png');
  const frontAtlas = await Assets.load<Texture>('/overlay/art/golden/devotees.png');
  const sideAtlas=await Assets.load<Texture>('/overlay/art/golden/devotees-side.png');
  const angled:Partial<Record<CameraView,Texture[][]>>={};
  await Promise.all((['left','right'] as const).map(async view=>{
    try{
      const t=await Assets.load<Texture>(`/overlay/art/multicamera/devotees-${view}.png`);
      const c=document.createElement('canvas');c.width=t.width;c.height=t.height;
      const context=c.getContext('2d',{willReadFrequently:true})!;context.drawImage(t.source.resource as CanvasImageSource,0,0);
      const pixels=context.getImageData(0,0,c.width,c.height).data;
      angled[view]=Array.from({length:4},(_,col)=>Array.from({length:3},(_,row)=>{
        const bands=[0,.414,.754,1];
        const left=Math.floor(col*c.width/4),right=Math.floor((col+1)*c.width/4),top=Math.floor(bands[row]*c.height),bottom=Math.floor(bands[row+1]*c.height);
        let minX=right,minY=bottom,maxX=left,maxY=top;
        for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(pixels[(y*c.width+x)*4+3]>32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
        if(maxX<=minX||maxY<=minY)throw Error('Empty camera sprite cell');
        return new Texture({source:t.source,frame:new Rectangle(minX,minY,maxX-minX+1,maxY-minY+1)});
      }));
    }catch{console.warn(`Thiếu sprite góc ${view}; dùng hướng sau.`);}
  }));
  const sideCanvas=document.createElement('canvas');sideCanvas.width=sideAtlas.width;sideCanvas.height=sideAtlas.height;
  const sideContext=sideCanvas.getContext('2d',{willReadFrequently:true})!;
  sideContext.drawImage(sideAtlas.source.resource as CanvasImageSource,0,0);
  const sidePixels=sideContext.getImageData(0,0,sideCanvas.width,sideCanvas.height).data;
  const sides:Texture[]=[];
  for(let i=0;i<4;i++){
    const left=Math.floor((i%2)*sideCanvas.width/2),right=Math.floor((i%2+1)*sideCanvas.width/2);
    const top=Math.floor(Math.floor(i/2)*sideCanvas.height/2),bottom=Math.floor((Math.floor(i/2)+1)*sideCanvas.height/2);
    let minX=right,minY=bottom,maxX=left,maxY=top;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(sidePixels[(y*sideCanvas.width+x)*4+3]>32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    sides.push(new Texture({source:sideAtlas.source,frame:new Rectangle(minX,minY,maxX-minX+1,maxY-minY+1)}));
  }
  // The original front atlas has two unequal rows. Only its top standing row
  // is used for walking; keep the rear seated/bowing frames facing the altar.
  const frontCanvas=document.createElement('canvas');frontCanvas.width=frontAtlas.width;frontCanvas.height=frontAtlas.height;
  const frontContext=frontCanvas.getContext('2d',{willReadFrequently:true})!;
  frontContext.drawImage(frontAtlas.source.resource as CanvasImageSource,0,0);
  const frontPixels=frontContext.getImageData(0,0,frontCanvas.width,frontCanvas.height).data;
  const fronts:Texture[]=[];
  for(let column=0;column<4;column++){
    const left=Math.floor(column*frontCanvas.width/4),right=Math.floor((column+1)*frontCanvas.width/4),bottom=Math.floor(frontCanvas.height*.60);
    let minX=right,minY=bottom,maxX=left,maxY=0;
    for(let y=0;y<bottom;y++)for(let x=left;x<right;x++)if(frontPixels[(y*frontCanvas.width+x)*4+3]>32){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    fronts.push(new Texture({source:frontAtlas.source,frame:new Rectangle(minX,minY,maxX-minX+1,maxY-minY+1)}));
  }
  // A separate local 4x4 sprite sheet provides four arm postures for each robe.
  // When missing, the old incense graphics remain available as a fallback.
  let ritualAtlas: Texture | undefined; // hotfix: tat sprite dang huong sai huong, fallback ve sprite mat sau
  const image = atlas.source.resource as CanvasImageSource;
  const canvas = document.createElement('canvas'); canvas.width = atlas.width; canvas.height = atlas.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!; context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const textures: Texture[][] = [];
  // Original rear-facing atlas: standing / kneeling / bowing. Trim alpha per cell.
  for (let column = 0; column < 4; column++) {
    textures[column] = [];
    for (let row = 0; row < 3; row++) {
      const bands=[0,.414,.754,1], left = Math.floor(column * canvas.width/4), right=Math.floor((column+1)*canvas.width/4), top=Math.floor(bands[row]*canvas.height), bottom=Math.floor(bands[row+1]*canvas.height);
      let minX = right, minY = bottom, maxX = left, maxY = top;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixels[(y * canvas.width + x) * 4 + 3] > 32) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      textures[column].push(new Texture({ source: atlas.source, frame: new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1) }));
    }
  }
  const ritualTextures: Texture[][] = [];
  if (ritualAtlas) {
    const cellW = ritualAtlas.width / 4, cellH = ritualAtlas.height / 4;
    if (Number.isInteger(cellW) && Number.isInteger(cellH) && cellW > 0 && cellH > 0) {
      for (let column = 0; column < 4; column++) {
        ritualTextures[column] = [];
        for (let row = 0; row < 4; row++) {
          ritualTextures[column].push(new Texture({ source: ritualAtlas.source,
            frame: new Rectangle(column * cellW, row * cellH, cellW, cellH) }));
        }
      }
    }
  }
  // Measure alpha silhouettes once at load time, never inside the frame loop.
  const headWidths=new Map<Texture,number>();
  const sourcePixels=new Map<unknown,{width:number;data:Uint8ClampedArray}>();
  function headWidth(t:Texture,seated=false){
    const cached=headWidths.get(t);if(cached!==undefined)return cached;
    let source=sourcePixels.get(t.source);
    if(!source){const c=document.createElement('canvas');c.width=t.source.width;c.height=t.source.height;const ctx=c.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(t.source.resource as CanvasImageSource,0,0);source={width:c.width,data:ctx.getImageData(0,0,c.width,c.height).data};sourcePixels.set(t.source,source);}
    const f=t.frame,widths:number[]=[];
    // Upper head band excludes shoulders/robes in both standing and seated cells.
    for(let y=Math.ceil(f.y+f.height*.05);y<f.y+f.height*(seated ? .27 : .18);y++){
      let lo=f.x+f.width,hi=f.x;
      for(let x=Math.ceil(f.x);x<f.x+f.width;x++)if(source.data[(y*source.width+x)*4+3]>80){lo=Math.min(lo,x);hi=Math.max(hi,x);}
      if(hi>lo)widths.push(hi-lo+1);
    }
    widths.sort((a,b)=>a-b);const w=widths[Math.floor(widths.length*.75)]||f.width*.4;headWidths.set(t,w);return w;
  }
  const poseScales=new Map<Texture,number>();
  for(let col=0;col<4;col++){
    const seated=textures[col][1],reference=headWidth(seated,true)*85/seated.height;
    for(const rear of [textures[col],...Object.values(angled).map(a=>a[col])]){
      for(const row of [0,1])poseScales.set(rear[row],poseTextureScale(rear[row].height,headWidth(rear[row],row===1),reference,headWidth(seated,true)));
      // Bowing hides the head: inherit the seated body's calibration, not total height.
      poseScales.set(rear[2],55/rear[2].height*(poseScales.get(rear[1])!*rear[1].height/85));
    }
    for(const t of [fronts[col],sides[col]])poseScales.set(t,poseTextureScale(t.height,headWidth(t),reference,headWidth(seated,true)));
  }
  sourcePixels.clear();
  return (actor: Actor): ActorView => {
    const root = new Container(), body = new Container(), label = new Container(), hands = new Graphics();
    root.addChild(new Graphics().ellipse(0, 1, 39, 12).fill({ color: 0x100705, alpha: .36 })); root.addChild(body); body.addChild(hands);
    const standing = new Sprite(textures[actor.variant % 4][0]), seated = new Sprite(textures[actor.variant % 4][1]), bowed=new Sprite(textures[actor.variant%4][2]);
    for (const sprite of [standing, seated, bowed]) { sprite.anchor.set(.5, 1); body.addChild(sprite); }
    const offeringSprites = (ritualTextures[actor.variant % 4] ?? []).map(texture => {
      const sprite = new Sprite(texture); sprite.anchor.set(.5, 1);
      sprite.scale.set(136 / texture.height); sprite.visible = false;
      body.addChild(sprite); return sprite;
    });
    standing.scale.set(136 / standing.texture.height); seated.scale.set(85 / seated.texture.height);
    bowed.scale.set(55 / bowed.texture.height);
    label.y = 10;
    const chars=Array.from(cleanText(actor.displayName,24));
    const text = new Text({ text: chars.join(''), style: { fontFamily: 'Segoe UI', fontSize: 12, fontWeight: '600', fill: 0xffefd4 } });
    text.anchor.set(.5);while(text.width>64&&chars.length>1){chars.pop();text.text=chars.join('')+'…';}
    const width = 72;
    label.addChild(new Graphics().roundRect(-width / 2, -15, width, 30, 9).fill({ color: 0x160b08, alpha: .94 }).stroke({ color: 0xeabf63, width: 1, alpha: .7 }), text);
    root.addChild(label);
    // The name plate never changes independently of this view. Bake once instead of
    // drawing rounded geometry + text separately for every one of 120 visitors.
    label.cacheAsTexture({resolution:1,antialias:true});
    let idleStanding = 0, poseTime = performance.now();
    hands.visible = false; const view: ActorView = { root, body, label, hands, actor, hasOfferingSprites: offeringSprites.length === 4,
      pose(age, seatScale, ritualPose, facing='back', cameraView='front') {
        const status = ritualPose || view.actor.status;
        view.facing=facing;
        const rear=(angled[cameraView]??textures)[actor.variant%4];
        const standingTexture=facing==='left'||facing==='right'?sides[actor.variant%4]:facing==='front'?fronts[actor.variant%4]:rear[0];
        seated.texture=rear[1];bowed.texture=rear[2];
        seated.scale.set(poseScales.get(seated.texture)!);bowed.scale.set(poseScales.get(bowed.texture)!);
        if(standing.texture!==standingTexture)standing.texture=standingTexture;
        // Mirror only the body sprite; labels and the shadow keep their orientation.
        const standingScale=poseScales.get(standingTexture)!;
        standing.scale.set((facing==='right'?-1:1)*standingScale,standingScale);
        const ritualFrame: Record<RitualSpritePose, number> = {
          ritual_hold: 0, ritual_raise: 1, ritual_insert: 2, ritual_finish: 3,
        };
        const ritualIndex = status in ritualFrame && offeringSprites.length === 4
          ? ritualFrame[status as RitualSpritePose] : -1;
        for (let i = 0; i < offeringSprites.length; i++) offeringSprites[i].visible = i === ritualIndex;
        const seatedPose = ['kneel', 'pray', 'idle'].includes(status);
        standing.visible = ritualIndex === -1 && (!seatedPose || status === 'kneel');
        seated.visible = ritualIndex === -1 && seatedPose;
        const transition = status === 'kneel' ? Math.min(1, age / 550) : 1;
        const bow=status==='pray'?Math.pow(Math.sin(Math.min(1,age/1800)*Math.PI),2):0;
        bowed.visible=ritualIndex === -1 && status==='pray'; bowed.alpha=bow;
        standing.alpha = seatedPose ? 1 - transition : 1; seated.alpha = transition*(1-bow);
        const timestamp=performance.now(), blend=1-Math.exp(-Math.min(100,timestamp-poseTime)/90);poseTime=timestamp;
        idleStanding+=((status==='walk'?1:0)-idleStanding)*blend;
        if(view.actor.status==='idle' && ritualIndex===-1){
          standing.visible=idleStanding>.001;standing.alpha=idleStanding;
          seated.visible=idleStanding<.999;seated.alpha=(1-idleStanding)*(1-bow);
        }
        body.scale.set(1);
        view.bodyHeight=visiblePoseHeight(standing.height,seated.height,bowed.height,
          standing.visible?standing.alpha:0,seated.visible?seated.alpha:0,bowed.visible?bowed.alpha:0);
        // Face-Buddha is a short shoulder settle when reaching the seat; labels stay upright.
        body.rotation=status==='kneel'?(1-transition)*.08:status==='walk'?Math.sin(age/100)*.025:0;
        body.pivot.y = 0;
      }
    };
    return view;
  };
}
