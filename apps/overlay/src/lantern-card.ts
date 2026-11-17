import { Container,Graphics,Text } from 'pixi.js';
import { cardPresentation,lanternRevealSchema,lanternThemes,type LanternReveal,type SceneState } from '@vuonsen/shared';
import { compactCardBounds } from './live-layout';

/** Bounded vector scene; all geometry is allocated once, animation follows server timestamps. */
export class LanternCard {
  readonly root=new Container();
  private current?:LanternReveal;private reduced=false;private effects=true;private progress=0;
  private heading=new Text();private name=new Text();private wish=new Text();
  private boat=new Container();private reflection=new Container();private glow=new Graphics();private flame=new Container();
  private ripples:Graphics[]=[];private motes:Graphics[]=[];private bar=new Graphics();
  private full=new Container();private compact=new Container();private compactMode=false;
  private compactHeading=new Text();private compactName=new Text();private compactWish=new Text();private compactBar=new Graphics();
  private compactReflection=new Graphics();private compactRipple=new Graphics();
  constructor(){
    this.root.position.set(96,1340);this.root.visible=false;this.root.eventMode='none';this.root.addChild(this.full,this.compact);
    const r=this.full;
    r.addChild(new Graphics().roundRect(0,0,888,450,22).fill(0x171e1a)
      .roundRect(5,5,878,440,19).stroke({color:0xc9a56b,width:2})
      .roundRect(14,14,860,422,14).stroke({color:0x82734d,width:1,alpha:.35}));
    // A quiet jade pond, lit from the middle, with a warm stone edge.
    const pond=new Graphics().roundRect(23,208,842,195,28).fill(0x0d2427);
    for(let i=0;i<14;i++)pond.ellipse(444,307,410-i*22,85-i*4).fill({color:0x25605b,alpha:.045});
    pond.moveTo(46,211).quadraticCurveTo(444,231,842,211).stroke({color:0xd4b67b,width:1,alpha:.35});
    r.addChild(pond);
    for(let i=0;i<20;i++){
      const y=229+i*8,x=90+(i*97)%690,w=24+(i*31)%92;
      r.addChild(new Graphics().moveTo(x,y).quadraticCurveTo(x+w/2,y+2,x+w,y).stroke({color:0x82b7a3,alpha:.10,width:1}));
    }
    // Small lilies and reeds frame the scene without additional textures.
    for(const [x,y,scale] of [[102,345,.58],[784,271,.42],[732,365,.7]] as const){
      r.addChild(new Graphics().ellipse(x,y+6,48*scale,14*scale).fill({color:0x618370,alpha:.45}));
      const flower=this.lotus();flower.position.set(x,y);flower.scale.set(scale);flower.alpha=.56;r.addChild(flower);
    }
    for(const side of [0,1])for(let i=0;i<5;i++){
      const x=side?835-i*9:49+i*9;
      r.addChild(new Graphics().moveTo(x,391).quadraticCurveTo(x+(side?-18:18),351-i*8,x+(side?-9:9),333-i*8).stroke({color:0x759a7a,alpha:.3,width:2}));
    }
    this.glow.ellipse(0,0,100,28).fill({color:0xf8c963,alpha:.08}).ellipse(0,0,65,16).fill({color:0xffdb8e,alpha:.10});r.addChild(this.glow);
    for(let i=0;i<5;i++){
      const g=new Graphics().ellipse(0,0,45+i*18,9+i*4).stroke({color:0xefd18e,width:1,alpha:.3});this.ripples.push(g);r.addChild(g);
    }
    for(let i=0;i<10;i++)this.reflection.addChild(new Graphics().roundRect(-22+i, i*4,44-i*2,2,1).fill({color:0xffd58a,alpha:.3-i*.024}));
    r.addChild(this.reflection);this.boat.addChild(this.lotus());
    this.boat.addChild(new Graphics().ellipse(0,1,30,8).fill(0xf0ce82).roundRect(-9,-28,18,28,4).fill(0xffe4a2)
      .roundRect(-6,-26,4,23,2).fill({color:0xfff8d4,alpha:.7}).moveTo(0,-28).lineTo(0,-33).stroke({color:0x5e4427,width:2}));
    for(let i=5;i>0;i--)this.flame.addChild(new Graphics().ellipse(0,-40,6+i*4,11+i*4).fill({color:0xffc65b,alpha:.025}));
    this.flame.addChild(new Graphics().moveTo(0,-62).bezierCurveTo(14,-44,11,-32,0,-31).bezierCurveTo(-12,-34,-8,-48,0,-62).fill(0xffcb65)
      .ellipse(0,-40,4,9).fill(0xfff7cf));this.boat.addChild(this.flame);r.addChild(this.boat);
    for(let i=0;i<8;i++){const g=new Graphics().circle(0,0,i%3===0?2:1).fill(0xfde2a3);this.motes.push(g);r.addChild(g);}
    const set=(t:Text,y:number,size:number,color:number)=>{t.style={fontFamily:'Segoe UI',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:796,lineHeight:size*1.3};t.position.set(46,y);r.addChild(t);};
    set(this.heading,25,21,0xdabd83);set(this.name,60,34,0xffedc9);set(this.wish,113,27,0xe1e6d6);
    const footer=new Text({text:'Một lời nguyện lành · Một ánh đèn an vui · Miễn phí',style:{fontFamily:'Segoe UI',fontSize:20,fill:0xcfbd99}});footer.anchor.set(.5,0);footer.position.set(444,414);r.addChild(footer);
    this.bar.roundRect(0,0,796,2,1).fill(0xdabc7e);this.bar.position.set(46,443);r.addChild(this.bar);
    const mask=new Graphics().roundRect(0,0,888,450,22).fill(0xffffff);r.addChild(mask);r.mask=mask;
    const c=this.compact;
    c.addChild(new Graphics().roundRect(0,0,784,184,15).fill({color:0x17221d,alpha:.97}).roundRect(5,5,774,174,12).stroke({color:0xb9945a,width:1})
      .roundRect(594,18,170,148,22).fill(0x0c2728));
    for(let i=0;i<7;i++)c.addChild(new Graphics().ellipse(679,114,75-i*7,35-i*3).fill({color:0x548778,alpha:.045}));
    for(let i=0;i<6;i++)this.compactReflection.roundRect(-18+i*2,i*4,36-i*4,2,1).fill({color:0xffd58a,alpha:.27-i*.035});
    this.compactRipple.ellipse(0,0,51,10).stroke({color:0xe8c584,alpha:.3,width:1});c.addChild(this.compactReflection,this.compactRipple);
    const setCompact=(t:Text,y:number,size:number,color:number)=>{t.style={fontFamily:'Segoe UI',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:548,lineHeight:size*1.2};t.position.set(26,y);c.addChild(t);};
    setCompact(this.compactHeading,12,21,0xd9ba84);setCompact(this.compactName,40,28,0xffe8bd);setCompact(this.compactWish,78,25,0xe3eadd);
    const note=new Text({text:'Một lời nguyện lành · Miễn phí',style:{fontFamily:'Segoe UI',fontSize:17,fill:0xbfab88}});note.position.set(26,157);c.addChild(note);
    this.compactBar.roundRect(0,0,732,2,1).fill(0xd8b267);this.compactBar.position.set(26,180);c.addChild(this.compactBar);
    const clip=new Graphics().roundRect(0,0,784,184,15).fill(0xffffff);c.addChild(clip);c.mask=clip;
  }
  private lotus(){
    const c=new Container();
    c.addChild(new Graphics().ellipse(0,7,60,12).fill({color:0x061a1a,alpha:.5}));
    for(const layer of [0,1])for(let i=-3;i<=3;i++){
      const p=new Graphics().moveTo(0,7).bezierCurveTo(-21,-1,-17,-22,0,-40+layer*9).bezierCurveTo(17,-22,21,-1,0,7)
        .fill(layer?0xdca36e:0xa86d64).stroke({color:0xffe0aa,alpha:.6,width:1});
      p.rotation=i*(layer?.32:.47);p.x=i*(layer?5:8);p.y=layer?4:0;c.addChild(p);
    }
    return c;
  }
  update(state:SceneState){
    this.compactMode=state.settings.liveSafeLayout;this.full.visible=!this.compactMode;this.compact.visible=this.compactMode;
    this.root.position.set(this.compactMode?compactCardBounds.x:96,this.compactMode?compactCardBounds.y:1340);
    const parent=this.compactMode?this.compact:this.full;if(this.boat.parent!==parent)parent.addChild(this.boat);
    this.reduced=state.settings.reducedEffects;this.effects=state.settings.effects&&state.settings.effectIntensity>0;
    const result=lanternRevealSchema.safeParse(state.lantern);
    if(!state.settings.lanternEnabled||!result.success||result.data.sessionId!==state.sessionId||state.fortune){this.current=undefined;this.root.visible=false;return;}
    if(this.current?.revealId!==result.data.revealId){
      this.current=result.data;const theme=lanternThemes.find(t=>t.id===result.data.topic)!;
      this.heading.text=`HOA ĐĂNG CẦU AN · ${theme.label.toLocaleUpperCase('vi')}`;this.name.text=result.data.displayName;this.wish.text=theme.wish;
      this.compactHeading.text=`HOA ĐĂNG · ${theme.label.toLocaleUpperCase('vi')}`;this.compactName.text=result.data.displayName;this.compactWish.text=theme.wish;
      for(const [text,h] of [[this.compactHeading,26],[this.compactName,34],[this.compactWish,72]] as const){text.scale.set(1);text.scale.set(Math.min(1,548/text.width,h/text.height));}
      for(const [text,h] of [[this.name,48],[this.wish,88]] as const){text.scale.set(1);text.scale.set(Math.min(1,796/text.width,h/text.height));}
    }
    this.tick(state.serverTime);
  }
  tick(now:number,lowFps=false){
    const f=this.current,display=f?cardPresentation(f,now):undefined;this.root.visible=Boolean(display?.visible);if(!f||!display||!this.root.visible)return;
    const p=this.progress=(now-f.startedAt)/(f.expiresAt-f.startedAt),reduced=this.reduced||lowFps;
    this.root.alpha=display.alpha;this.bar.scale.x=1-display.progress;
    this.compactBar.scale.x=1-display.progress;
    if(this.compactMode){
      const drift=this.effects?p:.4,x=674+Math.sin(drift*2)*12,y=129-drift*34,s=.79-drift*.15;
      this.boat.position.set(x,y);this.boat.scale.set(s);this.boat.alpha=Math.min(1,(1-p)*6);
      this.flame.scale.set(1,this.effects&&!reduced?1+Math.sin(p*80)*.035:1);
      this.compactReflection.position.set(x,y+10);this.compactReflection.alpha=this.boat.alpha*.7;
      this.compactRipple.position.set(x,y+8);this.compactRipple.visible=this.effects;this.compactRipple.scale.set(reduced?1:1+Math.sin(p*12)*.08);
      return;
    }
    const drift=this.effects?p:.4,x=444+Math.sin(drift*2.2)*38,y=363-drift*85,s=1.12-drift*.38;
    this.boat.position.set(x,y);this.boat.scale.set(s);this.boat.alpha=Math.min(1,(1-p)*6);
    this.flame.scale.set(1,this.effects?1+Math.sin(p*80)*.035:1);
    this.glow.position.set(x,y+7);this.glow.scale.set(s);this.glow.alpha=this.boat.alpha;
    this.reflection.position.set(x,y+10);this.reflection.scale.set(s);this.reflection.alpha=this.boat.alpha*.75;
    this.ripples.forEach((g,i)=>{g.visible=this.effects&&i<(reduced?2:5);const phase=(p*2+i/5)%1;g.position.set(x,y+7);g.scale.set(.8+phase*.45);g.alpha=(1-phase)*.45;});
    this.motes.forEach((g,i)=>{g.visible=this.effects&&!reduced;const phase=(p+i/8)%1;g.position.set(x+Math.sin(i*2.4+phase*3)*95,y-30-phase*60);g.alpha=Math.sin(phase*Math.PI)*.45;});
  }
  debug(){return {visible:this.root.visible,revealId:this.current?.revealId,topic:this.current?.topic,expiresAt:this.current?.expiresAt,displayEndsAt:this.current?cardPresentation(this.current,0).displayEndsAt:undefined,progress:this.progress,reduced:this.reduced,compact:this.compactMode,bounds:this.compactMode?compactCardBounds:{x:96,y:1340,width:888,height:450}};}
}
