import {expect,it} from 'vitest';
import {flowerTheme,flowerStyles,particleBudget,settingsSchema,settingsPatchSchema,defaultSettings,stableSeed} from '@vuonsen/shared';
import {flowerRainFrame} from '../apps/overlay/src/flower-rain';
import {SceneEngine} from '../apps/server/src/engine';
it('cycles all four themes deterministically without adjacent repeats',()=>{
 for(const session of ['a','b','live-42']){
  expect(new Set([1,2,3,4].map(c=>flowerTheme(session,c,'auto'))).size).toBe(4);
  for(let c=1;c<20;c++)expect(flowerTheme(session,c,'auto')).not.toBe(flowerTheme(session,c+1,'auto'));
  for(const s of flowerStyles)expect(flowerTheme(session,12,s)).toBe(s);
 }
});
it('hides tree by default without disabling counts or changing saved audio',()=>{
 expect(settingsSchema.parse({treeEnabled:true,treeTarget:2500,voiceVolume:.23})).toMatchObject({showBlessingTree:false,treeEnabled:true,treeTarget:2500,voiceVolume:.23});
 expect(settingsPatchSchema.parse({showBlessingTree:false})).toEqual({showBlessingTree:false});
 let now=10000;const e=new SceneEngine({...defaultSettings,treeEnabled:true},()=>now);
 e.receive({type:'like',userId:'1',eventId:'first',likeCount:3500});e.tick();const before=e.snapshot().tree!;
 e.updateSettings({showBlessingTree:true});e.updateSettings({showBlessingTree:false,flowerStyle:'ivory'});
 expect(e.snapshot().tree).toEqual(before);now+=8001;e.tick();expect(e.snapshot().tree).toMatchObject({completed:3,progress:500});
 e.receive({type:'like',userId:'1',eventId:'first',likeCount:3500});e.tick();expect(e.snapshot().tree?.total).toBe(3500);
});
it('caps pooled particles and preserves the face including full sprite radius',()=>{
 expect(particleBudget('high',false)).toBe(72);expect(particleBudget('medium',false)).toBe(54);expect(particleBudget('high',true)).toBe(18);expect(particleBudget('high',false,true)).toBe(24);expect(particleBudget('high',true,true)).toBe(0);
 for(let now=0;now<8100;now+=137)for(let i=0;i<72;i++){
  const options={seed:stableSeed('live'),hiddenTree:true,density:'high' as const};
  const f=flowerRainFrame(i,now,0,8000,false,undefined,options);expect(f).toEqual(flowerRainFrame(i,now,0,8000,false,undefined,options));
  if(f.visible)expect(f.x>358&&f.x<722&&f.y>178&&f.y<712).toBe(false);
 }
 expect(flowerRainFrame(0,8001,0,8000,false,undefined,{hiddenTree:true}).visible).toBe(false);
});
