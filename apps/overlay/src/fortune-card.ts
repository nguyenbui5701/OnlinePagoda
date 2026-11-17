import { Container, Graphics, Text } from 'pixi.js';
import { cardPresentation, fortuneRevealSchema, type FortuneReveal, type SceneState } from '@vuonsen/shared';
import { compactCardBounds,compactFortuneText } from './live-layout';
/** One card from server state; snapshots resume its remaining lifetime rather than replaying it. */
export class FortuneCard {
  readonly root=new Container();private current?:FortuneReveal;private session='';
  private header=new Text();private name=new Text();private title=new Text();private body=new Text();private action=new Text();private blessing=new Text();
  private progress=new Graphics();
  private full=new Container();private compact=new Container();private compactMode=false;
  private compactHeader=new Text();private compactTitle=new Text();private compactBody=new Text();private compactProgress=new Graphics();
  constructor(){
    this.root.position.set(96,1340);this.root.visible=false;this.root.eventMode='none';this.root.addChild(this.full,this.compact);
    const r=this.full;
    r.addChild(new Graphics().roundRect(0,0,888,450,20).fill({color:0x29190f,alpha:.98}).roundRect(8,8,872,434,15).stroke({color:0xd8b267,width:2})
      .roundRect(21,93,846,296,9).fill(0xf3e4c5));
    const set=(t:Text,y:number,size:number,color:number)=>{t.style={fontFamily:'Segoe UI',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:804,lineHeight:size*1.24};t.position.set(42,y);r.addChild(t);};
    set(this.header,22,24,0xe9c783);set(this.name,56,24,0xf6ead4);set(this.title,108,37,0x633816);
    set(this.body,163,30,0x39291a);set(this.action,273,27,0x6c421d);set(this.blessing,341,22,0x6c421d);
    const footer=new Text({text:'Quẻ văn hóa – chiêm nghiệm; chỉ để tham khảo · Miễn phí',style:{fontFamily:'Segoe UI',fontSize:23,fill:0xe1cba4}});footer.position.set(42,402);r.addChild(footer,this.progress);
    const mask=new Graphics().rect(0,0,888,450).fill(0xffffff);r.addChild(mask);r.mask=mask;
    const c=this.compact;
    c.addChild(new Graphics().roundRect(0,0,784,184,15).fill({color:0x21170e,alpha:.97}).roundRect(5,5,774,174,12).stroke({color:0xb9945a,width:1}));
    const compactSet=(t:Text,y:number,size:number,color:number)=>{t.style={fontFamily:'Segoe UI',fontSize:size,fill:color,wordWrap:true,wordWrapWidth:732,lineHeight:size*1.22};t.position.set(26,y);c.addChild(t);};
    compactSet(this.compactHeader,12,23,0xd9ba84);compactSet(this.compactTitle,42,28,0xffe8bd);compactSet(this.compactBody,79,26,0xf0e6d6);
    const note=new Text({text:'Chiêm nghiệm · Chỉ để tham khảo · Miễn phí',style:{fontFamily:'Segoe UI',fontSize:17,fill:0xbfab88}});note.position.set(26,157);c.addChild(note);
    this.compactProgress.roundRect(0,0,732,2,1).fill(0xd8b267);this.compactProgress.position.set(26,180);c.addChild(this.compactProgress);
    const compactMask=new Graphics().roundRect(0,0,784,184,15).fill(0xffffff);c.addChild(compactMask);c.mask=compactMask;
  }
  update(state:SceneState){
    this.compactMode=state.settings.liveSafeLayout;this.full.visible=!this.compactMode;this.compact.visible=this.compactMode;
    this.root.position.set(this.compactMode?compactCardBounds.x:96,this.compactMode?compactCardBounds.y:1340);
    if(this.session!==state.sessionId){this.current=undefined;this.session=state.sessionId;}
    const parsed=fortuneRevealSchema.safeParse(state.fortune);
    if(!state.settings.fortuneEnabled||!parsed.success||parsed.data.sessionId!==state.sessionId){this.current=undefined;this.root.visible=false;return;}
    if(this.current?.revealId!==parsed.data.revealId){
      const f=parsed.data;this.current=f;
      this.header.text=`XIN QUẺ ĐINH MÙI 2027 · SỐ ${String(f.number).padStart(3,'0')}`;
      this.name.text=`${f.displayName} · ${f.themeLabel}`;this.title.text=f.title;
      this.body.text=f.short;this.action.text=`Việc nhỏ: ${f.action}`;this.blessing.text=f.blessing;
      this.compactHeader.text=`${f.displayName} · QUẺ ${String(f.number).padStart(3,'0')} · ${f.themeLabel}`;
      this.compactTitle.text=f.title;this.compactBody.text=compactFortuneText(f.title,f.short);
      for(const [text,maxHeight] of [[this.compactHeader,28],[this.compactTitle,34],[this.compactBody,72]] as const){text.scale.set(1);text.scale.set(Math.min(1,maxHeight/text.height,732/text.width));}
      for(const [text,maxHeight] of [[this.title,47],[this.body,105],[this.action,64],[this.blessing,43]] as const){text.scale.set(1);text.scale.set(Math.min(1,maxHeight/text.height,804/text.width));}
    }
    this.tick(state.serverTime);
  }
  tick(now:number){
    const f=this.current,p=f?cardPresentation(f,now):undefined;this.root.visible=Boolean(p?.visible);if(!f||!p||!this.root.visible)return;
    const remaining=1-p.progress;
    this.root.alpha=p.alpha;
    this.progress.clear().roundRect(42,438,804*Math.max(0,remaining),3,1).fill(0xe6bd70);
    this.compactProgress.scale.x=Math.max(0,remaining);
  }
  debug(){return {visible:this.root.visible,number:this.current?.number,revealId:this.current?.revealId,expiresAt:this.current?.expiresAt,displayEndsAt:this.current?cardPresentation(this.current,0).displayEndsAt:undefined,compact:this.compactMode,bounds:this.compactMode?compactCardBounds:{x:96,y:1340,width:888,height:450}};}
}
