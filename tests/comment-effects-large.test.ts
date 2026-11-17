import {expect,it} from 'vitest';
import {defaultSettings,type CommentEffectKind} from '@vuonsen/shared';
import {CommentEffects} from '../apps/server/src/comment-effects';
import {parseCommunityCommand} from '../apps/server/src/community-parser';
import {SceneEngine} from '../apps/server/src/engine';
import {mapTikTokEvent} from '../apps/server/src/tiktok/mapper';
import {commentArtworkLayout,commentEffectRegion,commentLabelBounds} from '../apps/overlay/src/comment-effect-layout';
import {placeBubble,overlaps} from '../apps/overlay/src/live-motion';

it.each([
 ['thắp nến','thap nen','candle'],['trái tim','trai tim','heart'],['hoa sen','hoa sen','lotus'],
 ['thỉnh chuông','thinh chuong','bell'],['ngũ quả','ngu qua','offering'],['cá chép','ca chep','fish'],['rồng vàng','rong vang','dragon']
])('accepts accented/unaccented %s through the LIVE mapper without an actor or gift', (accented,plain,effect)=>{
  for(const text of [accented,plain.toUpperCase()]){
    expect(parseCommunityCommand(text)).toEqual({kind:'effect',effect});
    const e=new SceneEngine({...defaultSettings,autoJoinChat:false},()=>100000);e.mode='tiktok';
    const result=mapTikTokEvent('chat',{user:{id:'123',nickname:'<b>An</b>\u202e'},content:text,common:{roomId:'456',msgId:'789'}},'456',0);
    expect(result.kind).toBe('event');if(result.kind!=='event')throw Error('mapper rejected');
    e.receive(result.event);e.receive(result.event);e.tick();
    expect(e.snapshot().commentEffects).toHaveLength(1);expect(e.snapshot().commentEffects?.[0]).toMatchObject({effect,displayName:'An',expiresAt:103000});
    expect(e.actors.size).toBe(0);expect(e.metrics.giftUnits).toBe(0);expect(e.snapshot().ritual).toBeUndefined();
    expect(e.actions.map(a=>a.type)).toEqual(['COMMENT_EFFECT']);
  }
});
it('preserves FIFO, sanitizes queued names, shares cooldown between types, and never replays preempted items',()=>{
  const q=new CommentEffects();q.request('a','candle',0,'<script>x</script><b>An</b>');q.request('b','fish',0,'Bình');
  q.request('a','dragon',2000,'An');expect(q.status().cooldown).toBe(1);
  const first=q.tick(0,'s',false,true)[0];expect(first.displayName).toBe('An');expect(q.snapshot()).toHaveLength(1);
  expect(q.tick(2999,'s',false,true)).toHaveLength(0);
  expect(q.tick(3000,'s',false,true)[0].actorId).toBe('b');
  q.preempt(3100);expect(q.status().preempted).toBe(1);expect(q.snapshot()).toHaveLength(0);
  expect(q.tick(11000,'s',false,true)).toHaveLength(0);
  q.request('a','dragon',30000,'An');expect(q.tick(30000,'s',false,true)).toHaveLength(1);
});
it('shares a 5-second cooldown across free effect types, without extending the 3-second display',()=>{
  const q=new CommentEffects();q.request('a','candle',0);const first=q.tick(0,'s',false,true)[0];
  expect(first.expiresAt-first.startedAt).toBe(3000);
  q.request('a','dragon',4999);expect(q.status().cooldown).toBe(1);
  q.request('a','fish',5000);expect(q.tick(5000,'s',false,true)[0].effect).toBe('fish');
  expect(q.status().shown).toBe(2);
});
it('clears disabled effects, bounds pending work and counts expiration exactly at ten seconds',()=>{
  const q=new CommentEffects();for(let i=0;i<17;i++)q.request(String(i),'lotus',0);
  expect(q.status()).toMatchObject({queued:16,busy:1});q.tick(10000,'s',false,true);expect(q.status().expired).toBe(16);
  q.request('new','lotus',11000);q.tick(11000,'s',false,true);q.tick(11001,'s',false,false);expect(q.snapshot()).toHaveLength(0);
  q.reset();expect(q.status()).toMatchObject({shown:0,queued:0,preempted:0});
});
it.each(['candle','heart','lotus','bell','offering','fish','dragon'] as CommentEffectKind[])('fits %s artwork above cards and makes bubbles avoid it',kind=>{
  const raw={x:-333,y:-264,width:666,height:544},p=commentArtworkLayout(kind,raw),r=commentEffectRegion(kind);
  const box={x:p.x-raw.width*p.scale/2,y:p.y-raw.height*p.scale/2,width:raw.width*p.scale,height:raw.height*p.scale};
  expect(box.x).toBeGreaterThanOrEqual(r.x);expect(box.y).toBeGreaterThanOrEqual(r.y);
  expect(box.x+box.width).toBeLessThanOrEqual(r.x+r.width);expect(box.y+box.height).toBeLessThanOrEqual(r.y+r.height);
  expect(commentLabelBounds.y+commentLabelBounds.height).toBeLessThan(1056);
  const bubble=placeBubble(540,950,280,60,[r,commentLabelBounds]);
  if(bubble){expect(overlaps(bubble,r)).toBe(false);expect(overlaps(bubble,commentLabelBounds)).toBe(false);}
});
