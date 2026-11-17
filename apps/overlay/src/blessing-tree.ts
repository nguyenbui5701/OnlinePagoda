import {treePanelY} from './effect-space';
import { Container, Graphics, Text, Sprite } from 'pixi.js';
import {flowerTheme,stableSeed,type SceneState} from '@vuonsen/shared';
import {petalSprite,petalTexture} from './petal-atlas';
import {cameraFaceBounds} from '@vuonsen/shared';
import {flowerRainFrame} from './flower-rain';

/** Cached vector artwork: only opacity/transform changes during the celebration. */
export class BlessingTreeVisual {
  readonly root=new Container();
  readonly rain=new Container();
  private panel=new Container();private art=new Container();private branches=new Graphics();
  private leaves=new Container();private buds=new Container();private flowers=new Container();
  private halo=new Graphics();private wash=new Graphics();private sparkles=new Container();
  private title=this.text('CÂY PHÚC LÀNH',22);private progress=this.text('',22);private caption=this.text('',20);
  private bar=new Graphics();private frame=new Graphics();private compact=false;private lastKey='';
  private text(value:string,size:number){return new Text({text:value,style:{fontFamily:'Segoe UI',fontSize:size,fill:0xf4ddb0,align:'center'}});}
  constructor(){
    // Fixed pool, behind UI cards/panels. No particle creation during a LIVE burst.
    for(let i=0;i<72;i++){const flower=petalSprite('pink');flower.visible=false;this.rain.addChild(flower);}
    this.rain.visible=false;
    this.wash.rect(0,0,1080,1920).fill({color:0xffc763,alpha:.09});this.root.addChild(this.wash,this.panel);
    this.panel.addChild(this.frame,this.art,this.title,this.progress,this.caption,this.bar);
    this.art.addChild(this.halo,this.branches,this.leaves,this.buds,this.flowers,this.sparkles);
    for(let i=5;i>0;i--)this.halo.ellipse(0,-82,15+i*15,20+i*13).fill({color:0xeaba5a,alpha:.018});
    this.branches.moveTo(-35,5).bezierCurveTo(-12,0,5,-5,1,-65).bezierCurveTo(-5,-95,0,-116,0,-142).stroke({color:0x674019,width:12});
    this.branches.moveTo(-35,5).bezierCurveTo(-12,0,5,-5,1,-65).bezierCurveTo(-5,-95,0,-116,0,-142).stroke({color:0xd9aa56,width:5});
    const tips=[[-65,-84],[-44,-130],[-20,-155],[18,-149],[49,-126],[68,-79],[-56,-55],[49,-49]];
    for(let i=0;i<tips.length;i++){
      const [x,y]=tips[i];this.branches.moveTo(0,-35-i*9).quadraticCurveTo(x*.25,y+23,x,y).stroke({color:0xc69a47,width:3});
      for(let j=0;j<3;j++){
        const leaf=new Graphics().ellipse(0,0,6,13).fill(j%2?0xcaa558:0x98884a).ellipse(-1,-2,3,9).fill({color:0xf5db87,alpha:.4});
        leaf.position.set(x+(j-1)*11,y+Math.abs(j-1)*6);leaf.rotation=(j-1)*.7+(i%2?.2:-.2);this.leaves.addChild(leaf);
      }
      const bud=new Graphics().ellipse(x,y-6,4,6).fill(0xffe3a0);this.buds.addChild(bud);
      const flower=new Graphics();for(let j=0;j<5;j++){const a=j*Math.PI*2/5;flower.ellipse(Math.cos(a)*5,Math.sin(a)*5,5,4).fill(j%2?0xffe4a4:0xeab653);}flower.circle(0,0,2.5).fill(0xfff8cf);flower.position.set(x,y-6);this.flowers.addChild(flower);
    }
    for(let i=0;i<12;i++){const dot=new Graphics().star(0,0,4,3.5,1).fill(0xffe4a0);dot.position.set(Math.sin(i*2.4)*85,-20-i*12);this.sparkles.addChild(dot);}
  }
  tick(state:SceneState,now:number,reduced:boolean){
    const t=state.tree;this.root.visible=Boolean(t?.enabled);this.panel.visible=state.settings.showBlessingTree;this.rain.visible=false;if(!t?.enabled)return;
    this.compact=!state.settings.compactGiftPanels;
    const bloom=t.phase==='bloom'&&now<(t.endsAt??0),ratio=Math.min(1,t.progress/t.target),stage=bloom?4:Math.min(3,Math.floor(ratio*4));
    const key=[this.compact,stage,t.progress,t.target,t.completed,state.mode].join(':');
    if(key!==this.lastKey){
      this.lastKey=key;this.panel.position.set(this.compact?300:24,this.compact?204:treePanelY);this.frame.clear();
      const w=this.compact?480:230,h=this.compact?62:322;
      this.frame.roundRect(0,0,w,h,12).fill({color:0x201109,alpha:.83}).roundRect(1,1,w-2,h-2,11).stroke({color:0xb78b43,width:1,alpha:.85});
      this.title.visible=!this.compact;this.caption.visible=!this.compact;
      this.title.anchor.set(.5,0);this.title.position.set(115,13);
      this.art.position.set(this.compact?33:115,this.compact?41:216);this.art.scale.set(this.compact?.17:1);
      // The first stage is a small sapling; later stages gain canopy, buds and blooms.
      this.branches.scale.set(stage===0?.5:1);this.leaves.scale.set(stage===0?.5:1);this.buds.visible=stage>=2;this.flowers.visible=stage>=3;
      this.progress.text=this.compact?`Cùng góp tim · ${t.progress.toLocaleString('vi-VN')}/${t.target.toLocaleString('vi-VN')}`:`${t.progress.toLocaleString('vi-VN')} / ${t.target.toLocaleString('vi-VN')} tim`;
      this.progress.anchor.set(.5,0);this.progress.position.set(this.compact?262:115,this.compact?9:236);
      this.caption.text=state.mode==='demo'?`DEMO · ${t.completed} mốc`:`Cùng góp tim · ${t.completed} mốc`;this.caption.anchor.set(.5,0);this.caption.position.set(115,288);
      const bx=this.compact?61:20,by=this.compact?43:273,bw=this.compact?396:190;
      this.bar.clear().roundRect(bx,by,bw,5,2).fill(0x4b3521);if(ratio>0)this.bar.roundRect(bx,by,Math.max(3,bw*ratio),5,2).fill(0xe5bd70);
    }
    const p=bloom?Math.max(0,Math.min(1,(now-t.startedAt!)/8000)):0;
    this.wash.visible=false;this.wash.alpha=Math.sin(p*Math.PI)*(reduced?.45:1)*state.settings.effectIntensity;
    this.halo.alpha=bloom?1:.3;this.sparkles.visible=bloom&&state.settings.effects&&!reduced;
    this.sparkles.children.forEach((dot,i)=>{dot.alpha=.3+.6*Math.sin(p*Math.PI+i)**2;dot.y=-20-i*12-p*15;});
    this.rain.visible=bloom&&state.settings.effects&&state.settings.effectIntensity>0;
    const origin=this.compact?{x:333,y:230}:{x:139,y:730};
    const theme=flowerTheme(state.sessionId,t.cycle,state.settings.flowerStyle),seed=stableSeed(state.sessionId)+t.cycle;
    const face=state.settings.sceneSpace==='courtyard'?{x:390,y:210,width:300,height:470}:cameraFaceBounds(state,now);
    if(this.rain.visible)this.rain.children.forEach((node,i)=>{
      const flower=node as Sprite;flower.texture=petalTexture(i%5===0?theme:`${theme}-petal`);
      const f=flowerRainFrame(i,now,t.startedAt!,t.endsAt!,reduced,origin,{seed,hiddenTree:!state.settings.showBlessingTree,density:state.settings.petalDensity,face});
      flower.visible=f.visible;flower.position.set(f.x,f.y);flower.rotation=f.rotation;
      flower.scale.set(f.scale*f.roll,f.scale);flower.alpha=f.alpha*state.settings.effectIntensity;
    });
  }
  debug(state:SceneState|undefined){return {...state?.tree,compact:this.compact,visible:this.root.visible&&this.panel.visible,rainVisible:this.rain.visible,theme:state?.tree?flowerTheme(state.sessionId,state.tree.cycle,state.settings.flowerStyle):undefined,pool:72,
    flowers:this.rain.visible?this.rain.children.filter(f=>f.visible).length:0};}
}
