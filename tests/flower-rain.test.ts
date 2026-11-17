import {expect,it} from 'vitest';
import {flowerRainFrame} from '../apps/overlay/src/flower-rain';
import {BlessingTree} from '../apps/server/src/blessing-tree';
it('runs one bounded rain for the tree milestone and keeps overflow likes',()=>{
  const tree=new BlessingTree();tree.configure(true,1000);
  expect(tree.receive(999,'a',1000)).toBe(false);expect(tree.receive(1,'b',1100)).toBe(true);
  expect(tree.receive(1,'b',1200)).toBe(false);tree.receive(2500,'c',2000);
  expect(tree.snapshot()).toMatchObject({cycle:1,startedAt:1100,endsAt:9100,progress:3500});
  const count=(now:number,reduced=false)=>Array.from({length:48},(_,i)=>flowerRainFrame(i,now,1100,9100,reduced)).filter(p=>p.visible).length;
  expect(count(1000)).toBe(0);expect(count(4100)).toBeGreaterThan(12);expect(count(4100,true)).toBeLessThanOrEqual(18);
  expect(count(9100)).toBe(0);tree.tick(9100);expect(tree.snapshot()).toMatchObject({progress:500,completed:3,phase:'growing'});
});
it('is deterministic on reload and keeps visible flowers outside the face area',()=>{
  for(let now=0;now<=8000;now+=100)for(let i=0;i<48;i++){
    const f=flowerRainFrame(i,now,0,8000,false);expect(f).toEqual(flowerRainFrame(i,now,0,8000,false));
    if(f.visible){expect(f.x>390&&f.x<690&&f.y>210&&f.y<680).toBe(false);expect(f.y).toBeLessThanOrEqual(1740);}
  }
});
