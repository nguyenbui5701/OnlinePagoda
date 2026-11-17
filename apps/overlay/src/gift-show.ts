import {contentObstacle,overlaps} from './effect-space';
import {Container,Graphics,Text} from 'pixi.js';
import {giftComposition,cameraFaceBounds,cleanText,type GiftShow,type SceneState} from '@vuonsen/shared';
import {lotusPortrait} from './golden/lotus-portrait';
import {makeCommentArtwork} from './golden/gift-effects';
import {showcaseSprite} from './golden/showcase-art';
import {giftShowPose,giftShowRegion} from './gift-show-layout';
import type {Rect} from './live-motion';
function make(show:GiftShow){
  const root=new Container(),body=new Container(),decor=new Container();root.addChild(decor,body);
  const flower=lotusPortrait(show.gift.displayName,show.gift.avatarUrl);body.addChild(flower);
  const name=new Text({text:cleanText(show.gift.displayName,22),style:{fontFamily:'Segoe UI',fontSize:22,fontWeight:'600',fill:0xffefd2,stroke:{color:0x21110b,width:5}}});name.anchor.set(.5);root.addChild(name);
  const ornaments:Container[]=[];
  const composition=giftComposition(show.tier,show.flight?.ornamentScale);
  for(const [index,slot] of composition.ornaments.entries()){
    const side=index===0?-1:1;
    const kind=show.tier>=3?(show.variant==='phoenix'||show.variant==='long-phung'&&side===1?'phoenix':'dragon'):
      show.variant==='koi'?'fish':show.variant==='candles'?'candle':'heart';
    const art=show.tier>=3?(showcaseSprite(kind as 'phoenix'|'dragon',slot.width,slot.height)||makeCommentArtwork(kind)):makeCommentArtwork(kind);
    // Normalize the visible art around its own centre, including vector fallbacks.
    const b=art.getLocalBounds();art.pivot.set(b.x+b.width/2,b.y+b.height/2);
    const scale=Math.min(slot.width/Math.max(1,b.width),slot.height/Math.max(1,b.height));
    const sx=show.tier>=3?slot.width/Math.max(1,b.width):scale,sy=show.tier>=3?slot.height/Math.max(1,b.height):scale;
    art.scale.set(side===-1&&(show.tier>=3||kind==='fish')?-sx:sx,sy);
    art.position.set(0,0);
    const wrapper=new Container();wrapper.addChild(art);wrapper.position.set(slot.x,slot.y);
    decor.addChild(wrapper);ornaments.push(wrapper);
  }
  const sparks=Array.from({length:show.tier===1?4:10},(_,i)=>{
    const g=new Graphics().star(0,0,4,3,1).fill(0xffe1a6);g.position.set(Math.sin(i*2.4)*160,Math.cos(i*2.4)*95);decor.addChild(g);return g;
  });
  return {root,body,flower,name,ornaments,sparks,show,safety:1,lastAt:undefined as number|undefined};
}
export class GiftShowVisual {
  readonly root=new Container();private content=new Container();private clip=new Graphics();private items=new Map<string,ReturnType<typeof make>>();private session='';private region:Rect={x:290,y:690,width:500,height:358};
  constructor(){this.root.addChild(this.content,this.clip);this.content.mask=this.clip;}
  tick(state:SceneState,now:number,lowFps:boolean,donorNames:Rect[]=[]){
    if(this.session!==state.sessionId){this.clear();this.session=state.sessionId;}
    const s=state.settings,active=s.giftTierEffects&&s.effects&&s.flowers&&s.showGiftThanks&&s.effectIntensity>0?(state.giftShow?.active||[]).filter(e=>e.endsAt>now):[];
    this.region=giftShowRegion(state,now);const b=this.region;this.clip.clear().rect(b.x,b.y,b.width,b.height).fill(0xffffff);
    for(const [id,v] of this.items)if(!active.some(a=>a.id===id)){v.root.destroy({children:true});this.items.delete(id);}
    for(const show of active){
      let v=this.items.get(show.id);if(v&&(v.show.variant!==show.variant||v.show.phase!==show.phase)){v.root.destroy({children:true});this.items.delete(show.id);v=undefined;}if(!v){v=make(show);this.items.set(show.id,v);this.content.addChild(v.root);}
      const reduced=lowFps||s.reducedEffects,p=giftShowPose(show,now,reduced);
      v.show=show;
      const nameChars=Array.from(cleanText(show.gift.displayName,24));
      v.name.text=nameChars.join('')+' \u00d7'+show.gift.units;
      while(v.name.width>344&&nameChars.length>1){nameChars.pop();v.name.text=nameChars.join('')+'\u2026 \u00d7'+show.gift.units;}
      // Coordinates come only from the stored server flight. Never run the
      // free-space solver here: moving names/camera/cards used to teleport gifts.
      if(!show.flight){
        const origin=show.placement??{x:s.compactGiftPanels?p.x:540,y:950};
        p.x=origin.x;p.y=origin.y+90-210*p.p;
      }
      const composition=giftComposition(show.tier,show.flight?.ornamentScale);
      const boxes=composition.parts.map(b=>({x:p.x+b.x,y:p.y+b.y,width:b.width,height:b.height}));
      const face=state.settings.sceneSpace==='courtyard'?{x:390,y:210,width:300,height:470}:cameraFaceBounds(state,now);
      const card=contentObstacle(state,now);
      const obstructed=boxes.some(b=>[face,...(card?[card]:[]),...donorNames].some(r=>overlaps(b,r)));
      const dt=v.lastAt===undefined?0:Math.min(100,Math.max(0,now-v.lastAt));v.lastAt=now;
      // A new overlay can cross a flight after launch. Fade gently in place;
      // do not relocate, freeze, restart or reverse its path.
      v.safety+=((obstructed ? .18 : 1)-v.safety)*(1-Math.exp(-dt/220));
      v.root.visible=true;
      v.root.position.set(p.x,p.y);v.root.alpha=p.alpha*v.safety;v.body.scale.set(p.scale);v.body.alpha=Math.sqrt(s.effectIntensity);
      v.name.position.set(0,202);
      v.ornaments.forEach((a,i)=>{
        const slot=composition.ornaments[i];
        a.visible=Boolean(slot);if(!slot)return;
        // Local offsets: both companions rise with the same lotus, never stay
        // behind at old screen coordinates or search for a separate empty region.
        a.position.set(slot.x,slot.y+(reduced?0:Math.sin(p.p*Math.PI*2)*6));
        a.rotation=reduced?0:Math.sin(p.p*8+i)*.025;
        a.alpha=Math.sqrt(s.effectIntensity);
      });
      v.sparks.forEach((a,i)=>{a.visible=!reduced;a.alpha=Math.sin(p.p*Math.PI)*s.effectIntensity;a.y=Math.cos(i*2.4)*95-p.p*20+Math.sin(show.flight?.angle??0)*a.x*.2;});
    }
  }
  obstacles():Rect[]{return [...this.items.values()].filter(v=>v.root.visible).map(v=>{const b=giftComposition(v.show.tier,v.show.flight?.ornamentScale).bounds;return {x:v.root.x+b.x,y:v.root.y+b.y,width:b.width,height:b.height};});}
  clear(){for(const v of this.items.values())v.root.destroy({children:true});this.items.clear();}
  debug(){return {region:this.region,active:[...this.items.values()].map(v=>({at:v.lastAt,startedAt:v.show.startedAt,flight:v.show.flight,safety:v.safety,visible:v.root.visible,phase:v.show.phase,units:v.show.gift.units,id:v.show.id,tier:v.show.tier,variant:v.show.variant,lane:v.show.lane,endsAt:v.show.endsAt,x:v.root.x,y:v.root.y,bodyScale:v.body.scale.x,ornamentHeight:v.ornaments[0]?.height??0,ornaments:v.ornaments.map(a=>({x:v.root.x+a.x,y:v.root.y+a.y,offsetX:a.x,offsetY:a.y,visible:a.visible,alpha:v.root.alpha*a.alpha})),alpha:v.root.alpha,portrait:v.flower.label,name:v.name.text}))};}
}
