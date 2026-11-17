import {Assets,Texture} from 'pixi.js';
import type {CameraView} from '@vuonsen/shared';

export async function loadCameraArt(front:{hall:Texture;statue:Texture;urn:Texture}){
 const art=new Map<CameraView,typeof front>([['front',front]]),errors:Partial<Record<CameraView,string>>={};
 const cleanArt=new Map<CameraView,typeof front>([['front',front]]),cleanErrors:Partial<Record<CameraView,string>>={};
 await Promise.all((['left','right','wide'] as const).map(async view=>{
  try{
   const [hall,statue,urn]=await Promise.all([
    Assets.load<Texture>(`/overlay/art/multicamera/hall-${view}.png`),
    view==='wide'?front.statue:Assets.load<Texture>(`/overlay/art/multicamera/statue-${view}.png`),
    view==='wide'?front.urn:Assets.load<Texture>(`/overlay/art/multicamera/urn-${view}.png`)
   ]);
   if(view!=='wide')await Assets.load<Texture>(`/overlay/art/multicamera/devotees-${view}.png`);
   art.set(view,{hall,statue,urn});
  }catch{errors[view]=`Không tải được tài nguyên góc ${view}. Giữ góc hợp lệ.`;}
 }));
 await Promise.all((['left','right','wide'] as const).map(async view=>{
  try{
   const base=art.get(view);if(!base)throw Error('Missing statue/urn');
   // Supplied replacement filenames now describe the actual reference viewpoint.
   // Keep the original plates separate for rollback; no mirror or crossed mapping.
   const hall=await Assets.load<Texture>(view==='wide'?'/overlay/art/temple-v2/hall-wide.png':`/overlay/art/temple-v2/reference/hall-${view}.png`);
   cleanArt.set(view,{...base,hall});
  }catch{cleanErrors[view]=`Không tải được kiến trúc V2 góc ${view}. Giữ góc đã sẵn sàng.`;}
 }));
 return {art,errors,cleanArt,cleanErrors};
}
