import {expect,it} from 'vitest';
import {layoutNames,type NamePlate} from '../apps/overlay/src/name-layout';
it('seated names stay on their head baseline instead of being staggered',()=>{
 const names=Array.from({length:5},(_,i)=>({key:String(i),x:150+i*60,y:1100,width:58,height:30,priority:i,seated:true}));
 for(const placement of layoutNames(names).values())expect(placement).toEqual({dx:0,dy:0,visible:true});
});
it('stacks crowded head labels without shrinking text and puts the active donor first',()=>{
 const plates:NamePlate[]=Array.from({length:10},(_,i)=>({key:String(i),x:200+i*55,y:1100-i*4,width:132,height:30,priority:i===3?100:0}));
 const layout=layoutNames(plates);expect(layout.get('3')).toEqual({dx:0,dy:0,visible:true});
 const visible=plates.filter(p=>layout.get(p.key)!.visible).map(p=>({...p,x:p.x+layout.get(p.key)!.dx,y:p.y+layout.get(p.key)!.dy}));
 expect(visible.length).toBeGreaterThanOrEqual(7);
 for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++){
  const a=visible[i],b=visible[j];expect(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y).toBe(false);
 }
 expect(layoutNames(plates)).toEqual(layout);expect(plates[3].y).toBe(1088);
});
