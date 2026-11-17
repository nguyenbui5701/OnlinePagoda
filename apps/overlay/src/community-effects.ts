import {placeEffect,effectGround} from './effect-space';
import {artworkHasAvatar} from './artwork-diagnostics';
import {Container,Graphics,Text} from 'pixi.js';
import {cameraFaceBounds,cameraEffectView,cleanText,commentEffectLabels,type CameraView,type CommentEffect,type SceneState} from '@vuonsen/shared';
import {makeCommentArtwork} from './golden/gift-effects';
import {commentArtworkLayout,commentEffectRegion,commentLabelBounds} from './comment-effect-layout';
import type {Rect} from './live-motion';

function makeLargeEffect(effect:CommentEffect,view:CameraView){
  const root=new Container(),art=makeCommentArtwork(effect.effect,effect.displayName,effect.avatarUrl),region=commentEffectRegion(effect.effect,view);
  const raw=art.getLocalBounds(),layout=commentArtworkLayout(effect.effect,{x:raw.x,y:raw.y,width:raw.width,height:raw.height},view);
  art.pivot.set(layout.pivotX,layout.pivotY);art.scale.set(layout.scale);art.position.set(layout.x,layout.y);
  // Enlarging a candle must not enlarge its halo over the entire statue.
  const glow=new Graphics();
  if(!['dragon','phoenix','long-phung'].includes(effect.effect))glow.ellipse(540,layout.y+30,192,114).fill({color:0x1a1007,alpha:.30})
    .ellipse(540,layout.y+20,174,98).fill({color:0xffcf75,alpha:.09});
  root.addChild(glow,art);
  const sparks=Array.from({length:6},()=>{const g=new Graphics().star(0,0,4,3,1).fill(0xffe6ac);root.addChild(g);return g;});
  const label=new Container();label.position.set(commentLabelBounds.x,commentLabelBounds.y);
  label.addChild(new Graphics().roundRect(0,0,480,32,9).fill({color:0x20120b,alpha:.94}).stroke({color:0xd5b471,width:1,alpha:.8}));
  const caption=`${cleanText(effect.displayName||'Khách an lành')} · ${commentEffectLabels[effect.effect]}`;
  const text=new Text({text:caption,style:{fontFamily:'Segoe UI',fontSize:24,fill:0xffefd2,fontWeight:'600'}});
  text.anchor.set(.5);text.position.set(240,16);
  // Clip long names with an ellipsis; never shrink labels to unreadable text.
  const name=Array.from(cleanText(effect.displayName||'Khách an lành'));
  while(text.width>452&&name.length>1){name.pop();text.text=`${name.join('')}… · ${commentEffectLabels[effect.effect]}`;}
  label.addChild(text);root.addChild(label);
  return {root,art,glow,label,sparks,layout,region,raw:{x:raw.x,y:raw.y,width:raw.width,height:raw.height},caption:text.text,effect,view};
}

export class CommunityVisuals {
  readonly root=new Container();
  private effects=new Map<string,ReturnType<typeof makeLargeEffect>>();
  private chants=new Map<string,Graphics>();private session='';
  tick(state:SceneState,now:number,anchors:Map<string,{x:number;y:number}>,lowFps=false){
    if(this.session!==state.sessionId){this.clear();this.session=state.sessionId;}
    const current=(state.giftShow?.active.some(e=>e.endsAt>now)?[]:state.commentEffects||[]).filter(e=>e.expiresAt>now&&state.settings.commentEffectsEnabled&&state.settings.effects&&state.settings.effectIntensity>0).slice(0,1);
    for(const [id,fx] of this.effects)if(!current.some(e=>e.id===id)){fx.root.destroy({children:true});this.effects.delete(id);}
    for(const e of current){
      let fx=this.effects.get(e.id);const view=cameraEffectView(state,now);
      if(fx&&fx.view!==view){fx.root.destroy({children:true});this.effects.delete(e.id);fx=undefined;}
      if(!fx){fx=makeLargeEffect(e,view);this.effects.set(e.id,fx);this.root.addChild(fx.root);}
      const base=commentEffectRegion(e.effect,view),ground=effectGround(state,now);
      fx.layout=commentArtworkLayout(e.effect,fx.raw,view);
      const width=Math.max(480,fx.raw.width*fx.layout.scale),height=fx.raw.height*fx.layout.scale+96;
      const slot=placeEffect(state,now,width,height,{x:ground.x,y:base.y+base.height/2});
      fx.root.visible=Boolean(slot);if(!slot)continue;
      fx.region=slot.bounds;fx.layout.x=slot.x;fx.layout.y=slot.y-32;
      fx.art.scale.set(fx.layout.scale);fx.art.x=slot.x;
      fx.glow.position.set(slot.x-540,fx.layout.y-(base.y+base.height/2));fx.glow.skew.y=ground.angle*.5;
      fx.label.position.set(slot.x-240,slot.bounds.y+slot.bounds.height-32);
      const p=Math.max(0,Math.min(1,(now-e.startedAt)/(e.expiresAt-e.startedAt))),reduced=lowFps||state.settings.reducedEffects;
      fx.root.alpha=Math.max(0,Math.min(1,p*8,(1-p)*6));
      // Perceptual opacity keeps the main silhouette legible at the usual 65% setting.
      fx.art.alpha=Math.sqrt(state.settings.effectIntensity);fx.glow.alpha=state.settings.effectIntensity;
      fx.art.y=fx.layout.y+(e.effect==='lotus'&&!reduced?28-56*Math.min(1,p/.8):-(reduced?0:Math.sin(p*Math.PI)*8));
      fx.art.rotation=reduced||e.effect==='lotus'?0:Math.sin(p*14)*(e.effect==='bell'?.06:.012);
      fx.sparks.forEach((g,i)=>{g.visible=!reduced;g.x=fx.layout.x-210+i*84;g.y=fx.region.y+fx.region.height*.7-Math.sin(p*Math.PI)*24+(i%2)*20+Math.sin(ground.angle)*(i-2.5)*20;g.alpha=Math.sin(p*Math.PI)*.7*state.settings.effectIntensity;});
    }
    const chanting=state.actors.filter(a=>(a.chantUntil??0)>now&&anchors.has(a.key));
    for(const [key,g] of this.chants)if(!chanting.some(a=>a.key===key)){g.destroy();this.chants.delete(key);}
    for(const actor of chanting){
      let g=this.chants.get(actor.key);if(!g){g=new Graphics().ellipse(0,0,47,16).stroke({color:0xffdc83,width:2,alpha:.8});
        for(let i=-2;i<=2;i++)g.ellipse(i*14,-6,9,16).stroke({color:0xffdf9a,width:1.5,alpha:.7});
        this.chants.set(actor.key,g);this.root.addChild(g);}
      const a=anchors.get(actor.key)!;g.position.set(a.x,a.y+20);g.alpha=.65+Math.sin(now/500)*.15;
    }
  }
  obstacles():Rect[]{return [...this.effects.values()].filter(f=>f.root.visible).flatMap(f=>[f.region,{x:f.label.x,y:f.label.y,width:480,height:32}]);}
  clear(){for(const f of this.effects.values())f.root.destroy({children:true});for(const g of this.chants.values())g.destroy();this.effects.clear();this.chants.clear();}
  debug(state:SceneState|undefined){return {effects:state?.commentEffects||[],chants:this.chants.size,rendered:[...this.effects.values()].map(f=>{
    const b=f.art.getBounds(),safe=this.root.parent?.scale.x||1;
    return {id:f.effect.id,effect:f.effect.effect,displayName:f.effect.displayName,caption:f.caption,portrait:f.art.label??null,hasAvatar:artworkHasAvatar(f.art),expiresAt:f.effect.expiresAt,alpha:f.root.alpha,
      body:{x:b.x/safe,y:b.y/safe,width:b.width/safe,height:b.height/safe},region:f.region,label:{x:f.label.x,y:f.label.y,width:480,height:32},visible:f.root.visible,particles:f.sparks.filter(s=>s.visible).length};
  })};}
}
