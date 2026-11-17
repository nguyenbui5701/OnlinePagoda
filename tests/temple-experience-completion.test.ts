import {describe,it,expect} from 'vitest';
import {defaultSettings,normalizeEvent,groundHome,floorPoint,seats,prayerJourney,ceremonyJourney,type Actor,type OfferingRitual,placeEffect,overlaps,cameraFaceBounds,informationObstacles,type SceneState} from '@vuonsen/shared';
import {welcomePose} from '../apps/overlay/src/welcome-motion';
import {giftOfferingPose} from '../apps/overlay/src/golden/gift-ritual-motion';
import {poseTextureScale,visiblePoseHeight} from '../apps/overlay/src/golden/actor-proportions';
import {SceneEngine} from '../apps/server/src/engine';
import {GiftShowQueue} from '../apps/server/src/gift-show';
import {GiftScoreboard} from '../apps/server/src/gift-scoreboard';
import {mapTikTokEvent} from '../apps/server/src/tiktok/mapper';
import {commentArtworkLayout} from '../apps/overlay/src/comment-effect-layout';

describe('one actor reference scale across posture and travel',()=>{
 it.each([0,45,99])('welcome, prayer, return and gift keep seat %s body scale',index=>{
  const home=groundHome(seats[index]),origin={...home,id:'standing-test',x:540,y:1890,scale:.75};
  const journey=prayerJourney(origin,home,1,2,1000);
  const actor={seatId:home.id,status:'enter',welcome:{reason:'welcome',startedAt:1000,journey}} as Actor;
  for(const now of [1000,journey.arrivedAt-1,journey.arrivedAt,journey.departAt,journey.endsAt-1,journey.endsAt+1])expect(welcomePose(actor,home,now,true,true)?.scale).toBe(home.scale);
  expect(journey.departAt-journey.arrivedAt).toBe(1800);
  const j=ceremonyJourney(home,home,{x:540,y:1182},1000,160,2000);
  const ritual={actorId:'a',seatId:home.id,startedAt:1000,durationMs:j.endsAt-1000,journey:j} as OfferingRitual;
  for(const now of [1000,j.arrivedAt,j.departAt,j.endsAt])expect(giftOfferingPose(ritual,now,home).scale).toBe(home.scale);
 });
 it('normalizes anatomical landmarks instead of forcing equal overall height',()=>{
  const stand=poseTextureScale(400,80,24,80),sit=poseTextureScale(260,80,24,80);
  expect(stand*80).toBe(sit*80);expect(stand*400).toBeGreaterThan(sit*260);
  expect(visiblePoseHeight(120,78,50,.5,.5,0)).toBe(99);
 });
 it('allows floor depth to change rendered size while the posture reference remains fixed',()=>{
  const home=groundHome(seats[0]),origin={...home,id:'standing-test',x:540,y:1890,scale:.75};
  const journey=prayerJourney(origin,home,1,2,1000);
  const actor={seatId:home.id,status:'enter',welcome:{reason:'welcome',startedAt:1000,journey}} as Actor;
  const rendered=[1000,journey.arrivedAt,journey.departAt,journey.endsAt].map(now=>{
   const pose=welcomePose(actor,home,now,true,true)!;
   const projection=floorPoint('front',pose.x,pose.y).scale;
   const root=Math.min(.70,pose.scale)*projection;
   expect(root/projection).toBeCloseTo(home.scale,10);
   return root;
  });
  // This variation is intentional perspective, not a walk/pray enlargement.
  expect(Math.max(...rendered)-Math.min(...rendered)).toBeGreaterThan(.001);
 });
});

describe('independent visual combo progress',()=>{
 const settings={...defaultSettings,autoJoinChat:false,showBlessingTree:false,giftCatalog:[{...defaultSettings.giftCatalog[0],verified:true,giftId:'5655',unitCoins:1}]};
 const raw=(user:string,count:number,finished=false,group='combo')=>({type:'gift' as const,source:'tiktok' as const,scope:'123',userId:user,nickname:`<b>${user}</b>`,eventId:`same-${user}`,
   gift:{id:'5655',unitCoins:1,count,finished,streakId:group}});
 it('A/B interleave, repeated message IDs, decreasing updates and late final do not corrupt points/voice/actors',()=>{
  let now=100000;const e=new SceneEngine(settings,()=>now);
  for(const [u,n] of [['a',1],['b',1],['a',3],['b',2],['a',2]] as const){e.receive(raw(u,n));e.tick();now+=100;}
  expect(e.metrics.giftTransactions).toBe(0);expect(e.actors.size).toBe(0);expect(e.actions.some(a=>a.type==='GIFT_CONFIRMED')).toBe(false);
  expect(e.snapshot().giftShow?.active.map(s=>[s.gift.displayName,s.gift.units]).sort()).toEqual([['a',3],['b',2]]);
  const starts=e.snapshot().giftShow!.active.map(s=>s.startedAt);
  e.receive(raw('a',2,true));e.receive(raw('b',2,true));e.tick();
  expect(e.metrics.giftUnits).toBe(5);expect(e.metrics.giftTransactions).toBe(2);
  expect(e.snapshot().giftShow!.active.map(s=>s.startedAt)).toEqual(starts);
  expect(e.actions.filter(a=>a.type==='GIFT_CONFIRMED')).toHaveLength(2);
  now+=120000;e.receive({...raw('a',3,true),eventId:'late-final'});e.receive({...raw('a',9),eventId:'late-progress'});e.tick();
  expect(e.metrics.giftUnits).toBe(5);expect(e.snapshot().giftShow?.active).toHaveLength(0);
 });
 it('preview expiry never confirms; final after expiry queues once; missing identity is final-only',()=>{
  const q=new GiftShowQueue(),score=new GiftScoreboard(),e=normalizeEvent(raw('a',1),'s',0)!;
  q.progress(e,'s',0,settings);q.tick(0,settings);q.tick(5000,settings);
  q.progress({...e,gift:{...e.gift!,count:5}},'s',5000,settings);q.tick(5001,settings);
  expect(q.snapshot().active).toHaveLength(0);expect(q.snapshot().queued).toBe(0);
  const final=score.confirm({...e,gift:{...e.gift!,count:5,finished:true}},settings,'s')!;
  q.enqueue(final,6000,settings);q.enqueue(final,6001,settings);q.tick(6001,settings);
  expect(q.snapshot().active).toHaveLength(1);expect(q.snapshot().active[0].tier).toBe(2);expect(q.snapshot().received).toBe(1);
  const payload={user:{id:'a'},giftId:'5655',repeatCount:3,repeatEnd:0,gift:{type:1,diamondCount:1}};
  expect(mapTikTokEvent('gift',payload,'123',0).kind).toBe('ignored');
  expect(mapTikTokEvent('gift',{...payload,repeatEnd:1},'123',0).kind).toBe('event');
 });
 it('unknown gift ID never borrows another gift name/price, and reset clears progress',()=>{
  const e=normalizeEvent({...raw('a',1,true),gift:{id:'unverified',name:'Hoa hồng',unitCoins:1,count:1,finished:true}},'s',0)!;
  const g=new GiftScoreboard().confirm(e,settings,'s')!;expect(g.tier).toBe(3);expect(g.totalCoins).toBe(1);expect(g.scoreDelta).toBe(1);
  const q=new GiftShowQueue();q.progress(normalizeEvent(raw('a',1),'s',0)!,'s',0,settings);q.reset();expect(q.snapshot()).toMatchObject({pendingCombos:0,active:[],queued:0,received:0});
 });
 it('cards defer visual start without consuming FIFO or changing gift confirmation',()=>{
  const q=new GiftShowQueue(),e=normalizeEvent(raw('a',1,true),'s',0)!;
  q.enqueue(new GiftScoreboard().confirm(e,settings,'s')!,0,settings);q.tick(3900,settings,true);
  expect(q.snapshot()).toMatchObject({queued:1,shown:0,received:1});q.tick(4000,settings,false);expect(q.snapshot().active[0].startedAt).toBe(4000);
 });
});

describe('full-size effect layout in four views',()=>{
 it.each(['front','left','right','wide'] as const)('%s keeps comment artwork scale and safe portrait trajectory',view=>{
  const state={settings:{...defaultSettings,theme:'golden',sceneSpace:'hall',templeFloorPreview:true,compactGiftPanels:true,showBlessingTree:false},camera:{view,revision:1,stage:'manual-review'}} as SceneState;
  const bounds={x:0,y:0,width:380,height:500};
  expect(commentArtworkLayout('dragon',bounds,view).scale).toBe(commentArtworkLayout('dragon',bounds,'front').scale);
  const p=placeEffect(state,1000,380,640,{x:300,y:960},[],true);expect(p).toBeDefined();
  for(const r of [cameraFaceBounds(state,1000),...informationObstacles(state)])expect(overlaps(p!.bounds,r)).toBe(false);
 });
});
