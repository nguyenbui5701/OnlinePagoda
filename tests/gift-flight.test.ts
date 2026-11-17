import {it,expect} from 'vitest';
import {defaultSettings,planGiftFlight,giftFlightBounds,giftFlightParts,giftStageBottom,giftComposition,overlaps,cameraFaceBounds,informationObstacles,type SceneState,type GiftShow,type GiftConfirmed} from '@vuonsen/shared';
import {giftShowPose} from '../apps/overlay/src/gift-show-layout';
import {GiftShowQueue} from '../apps/server/src/gift-show';

const state=(view:'front'|'left'|'right'|'wide'='front')=>({settings:{...defaultSettings,theme:'golden',sceneSpace:'hall',templeFloorPreview:true,showBlessingTree:false,compactGiftPanels:true},camera:{view,revision:1,stage:'manual-review'}} as SceneState);
it.each(['front','left','right','wide'] as const)('plans one reproducible clear path in %s',view=>{
 const s=state(view),flight=planGiftFlight(s,1000,'gift-a',1,300,[]);
 expect(flight).toBeDefined();expect(planGiftFlight(s,1000,'gift-a',1,300,[])).toEqual(flight);
 expect(planGiftFlight(s,1000,'gift-b',1,300,[])).not.toEqual(flight);
 for(const box of [cameraFaceBounds(s,1000),...informationObstacles(s)])expect(overlaps(giftFlightBounds(flight!),box)).toBe(false);
 const show={id:'gift-a',startedAt:1000,endsAt:5400,tier:1,lane:0,jitter:0,flight} as GiftShow;
 let previous=giftShowPose(show,1000);
 for(let t=1016;t<5400;t+=16){
  // Performance/reduced-mode changes mid-flight must not move it back down.
  const p=giftShowPose(show,t,t>2500);
  expect(p.x).toBe(previous.x);expect(p.y).toBeLessThanOrEqual(previous.y);
  expect(previous.y-p.y).toBeLessThan(1);previous=p;
 }
 expect(giftShowPose(JSON.parse(JSON.stringify(show)),3200)).toEqual(giftShowPose(show,3200));
});
it('camera, late cards and queue snapshots cannot mutate the selected flight',()=>{
 const s=state(),q=new GiftShowQueue();
 const gift={eventKey:'fixed',units:1,unitCoins:1,totalCoins:1,tier:1,displayName:'An'} as GiftConfirmed;
 q.enqueue(gift,1000,s.settings);q.tick(1000,s.settings,false,s);
 const start=q.snapshot().active[0];expect(start.flight).toBeDefined();
 const changed={...state('right'),camera:{...state('right').camera!,motion:{kind:'focus' as const,from:{scale:1,x:0,y:0},to:{scale:1.3,x:-150,y:-300},startedAt:1200,endsAt:1800}}};
 q.tick(2000,s.settings,true,changed);
 expect(q.snapshot().active[0].flight).toEqual(start.flight);
 start.flight!.ornaments[0]={x:9999,y:9999};
 expect(q.snapshot().active[0].flight).not.toEqual(start.flight);
});
it('medium confirmation extends a preview without restarting its flight',()=>{
 const flight=planGiftFlight(state(),1000,'promotion',1,300,[])!;
 const before={startedAt:1000,endsAt:5400,tier:1,lane:0,flight} as GiftShow;
 const progress=giftShowPose(before,3000).p;
 const after={...before,tier:2 as const,endsAt:7000,promotedAt:3000,progressAtPromotion:progress};
 expect(giftShowPose(after,3000).y).toBe(giftShowPose(before,3000).y);
 expect(giftShowPose(after,3100).y).toBeLessThan(giftShowPose(after,3000).y);
});
it.each(['front','left','right','wide'] as const)('reserves the whole dragon/phoenix group in %s, not separate pieces',view=>{
 const s=state(view);
 for(const tier of [2,3,4] as const){
  const flight=planGiftFlight(s,1000,`group-${tier}`,tier,540,[]);
  expect(flight).toBeDefined();expect(flight!.ornamentSpace).toBe('lotus');expect(flight!.groupTier).toBe(tier);
  const group=giftComposition(tier,flight!.ornamentScale),swept=giftFlightBounds(flight!);
  expect(swept.y+swept.height).toBeLessThanOrEqual(giftStageBottom(s,1000)+1e-6);
  expect(swept.y+swept.height).toBeLessThanOrEqual(1100);
  expect(flight!.ornaments).toHaveLength(2);
  expect(flight!.ornaments[0]!.x).toBe(-flight!.ornaments[1]!.x);
  expect(flight!.ornaments[0]!.y).toBe(flight!.ornaments[1]!.y);
  for(const box of [cameraFaceBounds(s,1000),...informationObstacles(s)])for(const piece of giftFlightParts(flight!))expect(overlaps(piece,box)).toBe(false);
  for(const progress of [0,.5,1])for(const o of group.ornaments){
   const x=flight!.x+o.x,y=flight!.y-flight!.rise*progress+o.y;
   expect(x-o.width/2).toBeGreaterThanOrEqual(swept.x);
   expect(x+o.width/2).toBeLessThanOrEqual(swept.x+swept.width);
   expect(y-o.height/2).toBeGreaterThanOrEqual(swept.y);
   expect(y+o.height/2).toBeLessThanOrEqual(swept.y+swept.height);
  }
 }
});
it.each(['front','left','right','wide'] as const)('never falls back to chairs when the upper stage is occupied in %s',view=>{
 const s=state(view),occupied=[{x:0,y:218,width:1080,height:giftStageBottom(s,1000)-218}];
 for(const tier of [1,2,3,4] as const)expect(planGiftFlight(s,1000,'blocked',tier,540,occupied)).toBeUndefined();
});
it.each(['front','left','right','wide'] as const)('two low gifts can coexist in %s but a large group waits until both finish',view=>{
 const s=state(view),q=new GiftShowQueue();
 const gift=(id:string,tier:1|4)=>({eventKey:id,units:1,unitCoins:tier===1?1:30,totalCoins:tier===1?1:30,tier,displayName:id} as GiftConfirmed);
 q.enqueue(gift('a',1),1000,s.settings);q.enqueue(gift('b',1),1000,s.settings);q.tick(1000,s.settings,false,s);
 const first=q.snapshot().active;expect(first).toHaveLength(2);
 for(const show of first){
  const b=giftFlightBounds(show.flight!);
  expect(b.x+b.width<=534||b.x>=546).toBe(true);
  expect(b.y+b.height).toBeLessThanOrEqual(giftStageBottom(s,1000)+1e-6);
  expect(giftShowPose(show,1000).scale*280).toBe(360);
 }
 expect(overlaps(giftFlightBounds(first[0].flight!),giftFlightBounds(first[1].flight!))).toBe(false);
 q.enqueue(gift('big',4),1100,s.settings);q.tick(1100,s.settings,false,s);
 expect(q.snapshot().active).toHaveLength(2);expect(q.snapshot().queued).toBe(1);
 expect(q.snapshot().active.map(a=>a.flight)).toEqual(first.map(a=>a.flight));
 q.tick(5400,s.settings,false,s);expect(q.snapshot().active.map(a=>a.id)).toEqual(['big']);
 expect(q.snapshot().active[0].flight?.ornaments).toHaveLength(2);
});
