import {describe,it,expect} from 'vitest';
import {defaultSettings,giftTier,normalizeEvent,settingsPatchSchema,type GiftConfirmed} from '@vuonsen/shared';
import {GiftShowQueue} from '../apps/server/src/gift-show';
import {GiftScoreboard} from '../apps/server/src/gift-scoreboard';
import {mapTikTokEvent,selectWireFields} from '../apps/server/src/tiktok/mapper';
import {parseCommunityCommand} from '../apps/server/src/community-parser';
import {giftShowPose,giftShowRegion} from '../apps/overlay/src/gift-show-layout';
const make=(id:string,totalCoins?:number)=>({eventKey:id,displayName:'An Nhiên',totalCoins,unitCoins:totalCoins,units:1} as GiftConfirmed);
describe('gift tiers',()=>{
 it.each([[1,1],[4,1],[5,2],[9,2],[10,3],[29,3],[30,4],[31,4],[undefined,3]])('boundary %s → %s',(coins,tier)=>expect(giftTier(coins)).toBe(tier));
 it('keeps selected modern payload value and only confirms completed combo',()=>{
  const wire={user:{id:'42',nickname:'Sen'},common:{roomId:'123',msgId:'1'},giftId:'9',repeatCount:10,repeatEnd:1,gift:{name:'Gift',type:1,diamondCount:1,secret:'ignored'}};
  const selected=selectWireFields('gift',wire);expect(JSON.stringify(selected)).not.toContain('secret');
  const m=mapTikTokEvent('gift',selected,'123',0);expect(m.kind).toBe('event');if(m.kind!=='event')throw Error();
  const s=new GiftScoreboard(),e=normalizeEvent(m.event,'s',1)!;const g=s.confirm(e,defaultSettings,'s')!;
  expect(g.totalCoins).toBe(10);expect(g.tier).toBe(3);expect(g.scoreDelta).toBe(10);expect(s.confirm(e,defaultSettings,'s')).toBeNull();
  expect(mapTikTokEvent('gift',{...wire,repeatEnd:0},'123',0).kind).toBe('ignored');
 });
 it('uses only verified catalog ID values; never names; payload wins',()=>{
  const event=normalizeEvent({type:'gift',userId:'1',gift:{id:'99',name:'Rose',count:2,finished:true}},'s',0)!;
  const row={...defaultSettings.giftCatalog[0],giftId:'99',unitCoins:3,verified:true};
  expect(new GiftScoreboard().confirm(event,{...defaultSettings,giftCatalog:[row]},'s')?.totalCoins).toBe(6);
  expect(new GiftScoreboard().confirm(event,{...defaultSettings,giftCatalog:[{...row,verified:false}]},'s')?.unitCoins).toBeUndefined();
  expect(new GiftScoreboard().confirm({...event,gift:{...event.gift!,unitCoins:10}},{...defaultSettings,giftCatalog:[row]},'s')?.totalCoins).toBe(20);
 });
 it('two small flowers, unique lanes, FIFO big waits, no interruption, no replay',()=>{
  const q=new GiftShowQueue();for(let i=0;i<2;i++)q.enqueue(make(String(i),1),0,defaultSettings);q.tick(0,defaultSettings);
  const a=q.snapshot().active;expect(a).toHaveLength(2);expect(new Set(a.map(a=>a.lane)).size).toBe(2);
  q.enqueue(make('big',10),1,defaultSettings);q.enqueue(make('small',1),2,defaultSettings);q.tick(4399,defaultSettings);expect(q.snapshot().queued).toBe(2);
  q.tick(4400,defaultSettings);expect(q.snapshot().active.map(a=>a.id)).toEqual(['big']);expect(q.snapshot().active[0].endsAt).toBe(12400);
  q.tick(12400,defaultSettings);expect(q.snapshot().active.map(a=>a.id)).toEqual(['small']);q.tick(16800,defaultSettings);expect(q.snapshot().active).toEqual([]);
 });
 it('caps pending, expires at 30s, resets and cancels disabled',()=>{
  const q=new GiftShowQueue();for(let i=0;i<21;i++)q.enqueue(make(String(i)),0,defaultSettings);
  expect(q.snapshot()).toMatchObject({queued:20,overflow:1,unknownValue:21});q.tick(30001,defaultSettings);expect(q.snapshot().expired).toBe(20);
  q.enqueue(make('x',1),40000,defaultSettings);q.tick(40000,defaultSettings);q.tick(40001,{...defaultSettings,giftTierEffects:false});expect(q.snapshot().active).toEqual([]);
  q.reset();expect(q.snapshot().shown).toBe(0);
 });
 it('screen-space bodies and names fit below face, inside panels, above cards',()=>{
  const q=new GiftShowQueue();for(let i=0;i<2;i++)q.enqueue(make(String(i),1),0,defaultSettings);q.tick(0,defaultSettings);
  for(const a of q.snapshot().active)for(const now of [0,2200,4399]){
   const p=giftShowPose(a,now);expect(p.x-140*p.scale).toBeGreaterThanOrEqual(72);expect(p.x+140*p.scale).toBeLessThanOrEqual(1008);expect(p.scale*280).toBe(360);expect(p.y).toBeCloseTo(1040-210*p.p);
  }
  for(const sceneSpace of ['hall','courtyard'] as const)expect(giftShowRegion({settings:{...defaultSettings,sceneSpace},ritual:{startedAt:0,durationMs:9800}} as any,4000).y).toBeGreaterThanOrEqual(218);
 });
 it('new patch leaves audio settings untouched',()=>expect(settingsPatchSchema.parse({giftTierEffects:true})).toEqual({giftTierEffects:true}));
 it.each([['cho mình phượng hoàng nhé','phoenix'],['chim phuong','phoenix'],['rong phuong','long-phung'],['long phụng','long-phung'],['sen yêu thương','sen-heart'],['sen cá chép','sen-fish'],['sen ánh nến','sen-candle']])('parses %s once',(text,kind)=>expect(parseCommunityCommand(text)).toEqual({kind:'effect',effect:kind}));
 it.each(['không long phụng','đừng phượng hoàng','xin quẻ và sen yêu thương'])('does not activate %s',text=>expect(parseCommunityCommand(text)).toBeNull());
});
