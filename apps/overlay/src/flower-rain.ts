import {particleBudget,type PetalDensity} from '@vuonsen/shared';
/** Absolute time + event seed: reload resumes exactly the same falling flowers. */
export function flowerRainFrame(index:number,now:number,startedAt:number,endsAt:number,reduced:boolean,origin={x:139,y:730},options:{seed?:number;hiddenTree?:boolean;density?:PetalDensity;face?:{x:number;y:number;width:number;height:number}}={}){
 const seed=options.seed??0,delay=(index*137+seed%313)%1900,duration=4700+(index%5)*230;
 const p=(now-startedAt-delay)/duration,t=Math.max(0,Math.min(1,p));
 const target=55+((index*173+seed%941)%970),side=index%2?1:-1;
 const hidden=options.hiddenTree??false;
 const startX=hidden?(side<0?110:970):origin.x;
 const spread=hidden?t:Math.min(1,t*3);
 const x=startX+(target-startX)*spread+Math.sin(t*8+index+seed%17)*(reduced?8:28)*Math.sin(t*Math.PI);
 const apex=240+(index%7)*46;
 const y=hidden?190+t*1550:t<.3?origin.y+(apex-origin.y)*Math.sin(t/.3*Math.PI/2):apex+(1740-apex)*((t-.3)/.7);
 const face=options.face??{x:390,y:210,width:300,height:470},margin=32;
 const clearFace=!(x>face.x-margin&&x<face.x+face.width+margin&&y>face.y-margin&&y<face.y+face.height+margin);
 const size=24+(index%4)*10;
 return {visible:index<particleBudget(options.density??'medium',reduced)&&now>=startedAt&&now<endsAt&&p>=0&&p<1&&clearFace,
  x,y,alpha:Math.min(1,t*10,(1-t)*6)*(.68+(index%3)*.12),rotation:index+t*(reduced?1:4),scale:size/128,roll:reduced?1:.65+.35*Math.cos(t*8+index)**2};
}
