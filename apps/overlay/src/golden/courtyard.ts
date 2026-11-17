import {Assets,Container,Graphics,Rectangle,Sprite,Texture} from 'pixi.js';
import {environmentLight,lightWeights,particleBudget,type SceneState} from '@vuonsen/shared';
import {courtyardParticle} from '../courtyard-weather';
import {petalSprite,petalTexture} from '../petal-atlas';

export async function createCourtyard(){
  const [day,night,quanAm]=await Promise.all(['day-v2.png','night.png','quan-am.png'].map(name=>Assets.load<Texture>('/overlay/art/courtyard/'+name)));
  const root=new Container(),weather=new Container();
  const daylight=new Sprite(day),sunset=new Sprite(day),nightlight=new Sprite(night);
  for(const s of [daylight,sunset,nightlight]){s.width=1080;s.height=1920;root.addChild(s);}
  sunset.tint=0xffc99b;
  const warmth=new Graphics().rect(0,0,1080,1920).fill({color:0xffb45f,alpha:.14});root.addChild(warmth);
  // Trim transparent padding once, then pin the lotus base to the existing altar.
  const canvas=document.createElement('canvas');canvas.width=quanAm.width;canvas.height=quanAm.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(quanAm.source.resource as CanvasImageSource,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const statue=new Sprite(new Texture({source:quanAm.source,frame:new Rectangle(x0,y0,x1-x0+1,y1-y0+1)}));
  const halo=new Graphics().circle(540,322,99).stroke({color:0xffe6a9,width:2,alpha:.35});root.addChild(halo);
  statue.anchor.set(.5,1);statue.position.set(540,955);statue.height=750;statue.scale.x=statue.scale.y;root.addChild(statue);
  const lamps=new Container();root.addChild(lamps);
  // These soft pools reinforce the two lanterns already present in the night art.
  for(const x of [153,925]){
    const glow=new Graphics();for(let i=5;i>=1;i--)glow.ellipse(x,1017,20+i*21,5+i*10).fill({color:0xffbf58,alpha:.025});lamps.addChild(glow);
  }
  const leaves=new Container(),petals=new Container();weather.addChild(leaves,petals);
  for(let i=0;i<24;i++){leaves.addChild(petalSprite('leaf-green'));petals.addChild(petalSprite('pink'));}
  let active=false,weights=lightWeights('day'),count=0;
  return {root,weather,
    tick(state:SceneState,now:number,reduced:boolean){
      active=state.settings.sceneSpace==='courtyard'&&state.settings.theme==='golden';root.visible=active;weather.visible=false;count=0;if(!active)return;
      weights=state.environment?environmentLight(state.environment,now,state.settings.reducedEffects):lightWeights('day');
      nightlight.alpha=weights.night;sunset.alpha=weights.night>=.999?0:weights.sunset/(1-weights.night);warmth.alpha=weights.sunset;
      const intensity=state.settings.sceneLightIntensity;
      lamps.alpha=(weights.night+.25*weights.sunset)*intensity;halo.alpha=.4+.6*weights.night;
      // A lit marble statue remains readable at night; UI text isn't tinted.
      const channel=(day:number,dusk:number,night:number)=>Math.round(day*weights.day+dusk*weights.sunset+night*weights.night);
      statue.tint=(channel(255,255,220)<<16)+(channel(255,228,232)<<8)+channel(255,197,255);
      const w=state.environment?.weather;
      if(!w||now>=w.endsAt||reduced||!state.settings.effects||state.settings.effectIntensity<=0)return;
      weather.visible=true;leaves.visible=w.kind==='leaves';petals.visible=w.kind==='petals';
      const pool=w.kind==='leaves'?leaves:petals,limit=particleBudget(state.settings.petalDensity,false,true);
      pool.children.forEach((node,i)=>{
        const p=node as Sprite,f=courtyardParticle(w,i,now),mix=w.seed%3,light=mix===1||mix===2&&i%2===1;
        p.texture=petalTexture(w.kind==='leaves'?(light?'leaf-gold':'leaf-green'):(light?(i%6?'ivory-petal':'ivory'):(i%6?'pink-petal':'pink')));
        p.visible=i<limit&&f.visible;p.position.set(f.x,f.y);p.rotation=f.rotation;p.scale.set(f.scale*f.roll,f.scale);
        p.alpha=f.alpha*Math.sqrt(state.settings.effectIntensity);if(p.visible)count++;
      });
    },
    debug(){return {active,weights,lamps:lamps.alpha,particles:count,statue:'quan-am',poolSize:48};}
  };
}
