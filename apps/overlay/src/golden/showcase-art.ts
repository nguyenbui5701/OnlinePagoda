import {Assets,Sprite,Texture} from 'pixi.js';
type Kind='lotus'|'offering'|'dragon'|'candle'|'bell'|'fish'|'phoenix';
const textures:Partial<Record<Kind,Texture>>={};
export async function loadShowcaseArt(){
  await Promise.all((['lotus','offering','dragon','candle','bell','fish','phoenix'] as const).map(async kind=>{
    try{textures[kind]=await Assets.load<Texture>(`/overlay/art/${kind==='phoenix'?'effects-v4':['candle','bell','fish'].includes(kind)?'effects-v3':'effects-v2'}/${kind}.png`);}catch{/* Vector fallback keeps the show usable offline/missing files. */}
  }));
}
export function showcaseSprite(kind:Kind,width:number,height:number):Sprite|undefined{
  const texture=textures[kind];if(!texture)return;
  const s=new Sprite(texture);s.anchor.set(.5);s.width=width;s.height=height;s.label=`showcase-art:${kind}`;return s;
}
