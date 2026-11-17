import {Container,Graphics,Sprite,Text,Texture} from 'pixi.js';
import {cleanText,safeAvatarUrl} from '@vuonsen/shared';
type Entry={refs:number;used:number;texture?:Texture;abort:AbortController;promise:Promise<Texture|undefined>};
const entries=new Map<string,Entry>();
const LIMIT=32;
function prune(){
  for(const [url,e] of [...entries].sort((a,b)=>a[1].used-b[1].used)){
    if(entries.size<LIMIT)break;
    if(e.refs===0){e.abort.abort();e.texture?.destroy(true);entries.delete(url);}
  }
}
async function load(url:string,abort:AbortController){
  const timer=setTimeout(()=>abort.abort(),1800);
  try{
    const res=await fetch(url,{signal:abort.signal,mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer'});
    if(!res.ok||!/^image\/(png|jpeg|webp)/i.test(res.headers.get('content-type')||'')||Number(res.headers.get('content-length')||0)>1048576)return;
    const reader=res.body?.getReader();if(!reader)return;
    const chunks:Uint8Array<ArrayBuffer>[]=[];let size=0;
    for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>1048576){await reader.cancel();return;}chunks.push(p.value as Uint8Array<ArrayBuffer>);}
    const bitmap=await createImageBitmap(new Blob(chunks),{resizeWidth:128,resizeHeight:128,resizeQuality:'high'});
    if(abort.signal.aborted){bitmap.close();return;}
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d')!;
    ctx.beginPath();ctx.arc(64,64,64,0,Math.PI*2);ctx.clip();ctx.drawImage(bitmap,0,0,128,128);bitmap.close();
    return Texture.from(c);
  }catch{return;}finally{clearTimeout(timer);}
}
/** Ref-counted shared CDN textures. Destroying one flower never destroys a panel's avatar. */
export function avatarCircle(name:string,url: string|undefined,size:number,onLoaded?:()=>void){
  const root=new Container();root.label='avatar:fallback';
  root.addChild(new Graphics().circle(0,0,size/2).fill(0x3a2337).stroke({color:0xffe4a0,width:2}));
  const text=new Text({text:Array.from(cleanText(name,24)).filter(c=>/[\p{L}\p{N}]/u.test(c)).slice(0,2).join('').toUpperCase()||'AN',style:{fontFamily:'Segoe UI',fontSize:size*.31,fontWeight:'600',fill:0xffefd0}});
  text.anchor.set(.5);root.addChild(text);
  const key=safeAvatarUrl(url);if(!key)return root;
  let e=entries.get(key);
  if(e?.refs===0&&!e.texture){e.abort.abort();entries.delete(key);e=undefined;}
  if(!e){
    prune();if(entries.size>=LIMIT)return root;
    const abort=new AbortController();e={refs:0,used:Date.now(),abort,promise:Promise.resolve(undefined)};
    const entry=e;e.promise=load(key,abort).then(t=>{entry.texture=t;return t;});entries.set(key,e);
  }
  const entry=e;entry.refs++;entry.used=Date.now();
  root.on('destroyed',()=>{entry.refs--;entry.used=Date.now();if(entry.refs===0&&!entry.texture)entry.abort.abort();});
  void entry.promise.then(texture=>{
    if(!texture||root.destroyed)return;
    const photo=new Sprite(texture);photo.anchor.set(.5);photo.width=photo.height=size-4;root.addChild(photo);
    text.visible=false;root.label='avatar:loaded';onLoaded?.();
  });return root;
}
