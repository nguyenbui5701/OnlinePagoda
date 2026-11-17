import {avatarCircle} from './avatar-cache';
import {Container,Graphics} from 'pixi.js';
import {cleanText} from '@vuonsen/shared';
import {showcaseSprite} from './showcase-art';

/** Shared bounded CDN cache, no server proxy or cookies. */
export function lotusPortrait(name='Khách an lành',avatarUrl?:string,showPortrait=true):Container {
  const root=new Container();root.label='lotus-portrait:fallback';
  const illustrated=showcaseSprite('lotus',280,280);
  if(illustrated)root.addChild(illustrated);
  // Vector fallback if the local illustration cannot be loaded.
  else for(const [count,length,width,offset,color] of [[12,124,44,0,0xda659b],[9,93,37,.18,0xffb6d6]]){
    for(let i=0;i<count;i++){
      const petal=new Graphics().moveTo(0,20).bezierCurveTo(-width,-14,-width*.74,-length*.76,0,-length)
        .bezierCurveTo(width*.74,-length*.76,width,-14,0,20).closePath()
        .fill(color).stroke({color:0x582440,width:3})
        .moveTo(0,0).quadraticCurveTo(-5,-length*.5,0,-length+12).stroke({color:0xffe6bb,width:1.4,alpha:.8});
      petal.rotation=i/count*Math.PI*2+offset;root.addChild(petal);
    }
  }
  if(!showPortrait){
    root.label='lotus:plain';
    const heart=new Graphics().circle(0,-5,44).fill(0xf1bd52).stroke({color:0xffe6b2,width:2});
    for(let i=0;i<19;i++){const r=7*Math.sqrt(i),a=i*2.4;heart.circle(Math.cos(a)*r,-5+Math.sin(a)*r,2.8).fill(0xffedaa);}
    root.addChild(heart);return root;
  }
  const avatar=avatarCircle(name,avatarUrl,92,()=>{if(!root.destroyed)root.label='lotus-portrait:loaded';});
  avatar.y=-5;root.addChild(avatar);
  return root;
}
