import { describe, it, expect } from 'vitest';
import { SceneEngine } from '../apps/server/src/engine';
import { defaultSettings, isStanding, seats } from '@vuonsen/shared';
import { parseCommunityCommand } from '../apps/server/src/community-parser';
import { CommentEffects } from '../apps/server/src/comment-effects';
import { BlessingTree } from '../apps/server/src/blessing-tree';

function fixture(maxActors=100){
  let now=100000;const e=new SceneEngine({...defaultSettings,maxActors},()=>now);
  const step=(ms:number)=>{for(let t=0;t<ms;t+=100){now+=100;e.tick();}};
  const chat=(id:string,text='Chào')=>{e.receive({type:'chat',userId:id,nickname:'Khách '+id,text,eventId:crypto.randomUUID()});e.tick();};
  const actor=(id:string)=>[...e.actors.values()].find(a=>a.key.endsWith(':'+id))!;
  return {e,step,chat,actor,jump:(ms:number)=>{now+=ms;e.tick();},get now(){return now;}};
}
describe('Expansion phase 1',()=>{
  it('has 100 unique seat positions, 100 seats and at most 20 visible standing visitors',()=>{
    expect(seats).toHaveLength(100);expect(new Set(seats.map(s=>`${s.x}:${s.y}`)).size).toBe(100);
    const f=fixture();for(let i=0;i<135;i++)f.chat(String(i));
    const s=f.e.snapshot();expect(s.room).toMatchObject({seated:100,standing:35,visibleStanding:20});expect(s.actors).toHaveLength(120);
    expect(new Set(s.actors.map(a=>a.key)).size).toBe(120);expect(new Set(s.actors.filter(isStanding).map(a=>a.standingSlot)).size).toBe(20);
    expect(s.prayerStatus).toMatchObject({active:18,queued:100,busy:17});
  });
  it('fills later prayer rows immediately and does not interrupt them for a gift',()=>{
    const f=fixture();for(let i=0;i<6;i++)f.chat(String(i));f.step(1000);for(let i=6;i<18;i++)f.chat(String(i));
    expect(f.e.snapshot().prayerStatus?.active).toBe(18);expect(f.actor('6').welcome?.row).toBe(1);expect(f.actor('12').welcome?.row).toBe(2);
    f.e.receive({type:'gift',userId:'0',gift:{id:'rose',count:2,finished:true},eventId:'gift'});f.e.tick();
    f.step(5000);expect(f.e.snapshot().ritual?.actorId).toBe(f.actor('0').key);
    expect(f.e.snapshot().prayerStatus?.active).toBe(12);expect(f.e.metrics.giftUnits).toBe(2);
  });
  it('releases an inactive seat, keeps chat standing, and seats only after an explicit request',()=>{
    const f=fixture(2);f.chat('a');f.step(6100);f.e.updateSettings({idleMinutes:.1});f.step(2000);
    expect(isStanding(f.actor('a'))).toBe(true);f.chat('a','Tôi vẫn ở đây');expect(isStanding(f.actor('a'))).toBe(true);
    expect(f.e.actions.some(a=>a.type==='CHAT_BUBBLE'&&a.actorId===f.actor('a').key)).toBe(true);
    f.chat('a','xin chỗ');f.step(2000);expect(isStanding(f.actor('a'))).toBe(false);
    expect(f.e.actors.size).toBe(1);
  });
  it('standing viewers can bow, keep their home, and expire visually without losing identity',()=>{
    const f=fixture(1);f.chat('a');f.chat('b');f.step(16000);const home=f.actor('b').seatId;
    f.chat('b','con xin lạy Phật');expect(f.actor('b').welcome?.reason).toBe('bow');f.step(6100);expect(f.actor('b').seatId).toBe(home);
    f.chat('b','lạy');expect(f.actor('b').welcome?.reason).toBe('bow');expect(f.e.snapshot().prayerStatus?.cooldown).toBe(0);
    f.e.updateSettings({standingMinutes:1});f.step(61000);expect(f.actor('b').standingSlot).toBeUndefined();
    f.chat('b','Tôi vẫn xem');expect(f.actor('b').standingSlot).toBeDefined();expect(isStanding(f.actor('b'))).toBe(true);
  });
  it('has at most one pending prayer per identity and drops a queue older than 60 seconds',()=>{
    const f=fixture();for(let i=0;i<25;i++)f.chat(String(i));
    f.chat('24','lạy');f.chat('24','lạy Phật');expect(f.e.snapshot().prayerStatus?.queued).toBe(7);
    f.jump(61000);expect(f.e.snapshot().prayerStatus).toMatchObject({expired:7,active:0,queued:0,completed:18});
  });
  it('finishes a gift before releasing an expired seat without extending last interaction time',()=>{
    const f=fixture();f.chat('a');f.step(6100);f.e.updateSettings({idleMinutes:.1});
    f.e.receive({type:'gift',userId:'a',eventId:'protected-gift',gift:{id:'rose',count:1,finished:true}});f.e.tick();
    const last=f.actor('a').lastActiveAt;f.step(6500);expect(f.e.snapshot().ritual).toBeDefined();expect(isStanding(f.actor('a'))).toBe(false);
    expect(f.actor('a').lastActiveAt).toBe(last);f.step(1000);expect(isStanding(f.actor('a'))).toBe(true);
  });
  it.each(['lạy','LAY','lạy Phật','con xin lạy Phật','lễ Phật','bái Phật','đảnh lễ'])('recognizes %s',s=>expect(parseCommunityCommand(s)).toEqual({kind:'bow'}));
  it.each(['vào chùa','VAO CHUA!','ngồi','xin chỗ'])('requests a seat with %s',s=>expect(parseCommunityCommand(s)).toEqual({kind:'seat'}));
  it.each(['chó','cho','chỗ'])('does not request a seat from the ordinary word %s',s=>expect(parseCommunityCommand(s)).toBeNull());
  it.each(['lấy','lây','lầy','đừng lạy','không lạy Phật','lạy bạn','mình kể chuyện lạy Phật'])('rejects %s',s=>expect(parseCommunityCommand(s)).toBeNull());
  it('does not let the legacy prayer matcher activate rejected phrases or ordinary conversation',()=>{
    const f=fixture();f.chat('a');f.step(16000);f.e.actions=[];
    for(const text of ['không lễ Phật','đừng niệm a di đà phật','lấy Phật','lây','lầy','Tôi đang trò chuyện']){
      f.chat('a',text);expect(f.actor('a').welcome).toBeUndefined();expect(f.actor('a').status).toBe('idle');
    }
    expect(f.e.actions.some(a=>a.type==='PRAY'||a.type==='CHANT')).toBe(false);
  });
});

describe('Expansion phase 3',()=>{
  it('keeps 3500 likes as one celebration, 3 milestones and 500 carried likes',()=>{
    const t=new BlessingTree();t.configure(true,1000);
    expect(t.receive(1200,'1',0)).toBe(true);expect(t.receive(2300,'2',1000)).toBe(false);
    expect(t.snapshot()).toMatchObject({phase:'bloom',total:3500,endsAt:8000,cycle:1});
    t.tick(7999);expect(t.snapshot().completed).toBe(0);t.tick(8000);
    expect(t.snapshot()).toMatchObject({phase:'growing',progress:500,completed:3,total:3500,cycle:1});
    expect(t.receive(500,'3',9000)).toBe(true);
  });
  it('does not count old likes, duplicate packets or invalid counts; reset clears the session',()=>{
    const t=new BlessingTree();t.receive(1000,'old',0);t.configure(true,1000);
    expect(t.receive(1000,'old',40000)).toBe(false);t.receive(1000,'new',40000);t.receive(1000,'new',100000);
    for(const n of [-1,NaN,Infinity,1.2])expect(t.receive(n,undefined,100001)).toBe(false);
    expect(t.snapshot().total).toBe(1000);t.reset(true,1000);expect(t.snapshot().total).toBe(0);expect(t.receive(1000,'new',100001)).toBe(true);
  });
  it('defers changed goals until the next cycle and clears progress when disabled',()=>{
    const t=new BlessingTree();t.configure(true,1000);t.receive(500,'a',0);t.configure(true,2000);
    expect(t.snapshot().target).toBe(1000);t.receive(1000,'b',1);t.tick(8001);
    expect(t.snapshot()).toMatchObject({target:2000,progress:500,completed:1});
    t.configure(false,2000);t.receive(10000,'off',8002);expect(t.snapshot()).toMatchObject({enabled:false,progress:0,total:0});
  });
  it('counts actual like deltas without creating visitors or gifts and dedupes beyond 30 seconds',()=>{
    const f=fixture();f.e.updateSettings({treeEnabled:true});
    const like={type:'like',userId:'a',likeCount:3500,eventId:'long-replay'};
    f.e.receive(like);f.e.tick();expect(f.e.snapshot().tree?.phase).toBe('bloom');
    f.step(31000);f.e.receive(like);f.e.tick();expect(f.e.snapshot().tree).toMatchObject({total:3500,completed:3,progress:500});
    expect(f.e.actors.size).toBe(0);expect(f.e.metrics.giftUnits).toBe(0);expect(f.e.actions.filter(a=>a.type==='TREE_BLOOM')).toHaveLength(1);
    f.e.reset();expect(f.e.snapshot().tree?.total).toBe(0);
  });
  it('does not count a like received before enabling even if it is still in the event queue',()=>{
    const f=fixture();f.e.receive({type:'like',userId:'a',eventId:'old-queued',likeCount:1000});
    f.e.updateSettings({treeEnabled:true});f.e.tick();expect(f.e.snapshot().tree?.total).toBe(0);
    f.e.receive({type:'like',userId:'a',eventId:'new-queued',likeCount:1000});f.e.tick();expect(f.e.snapshot().tree?.total).toBe(1000);
  });
});

describe('Expansion phase 2',()=>{
  it.each([['thắp nến','candle'],['trái tim','heart'],['hoa sen','lotus'],['thỉnh chuông','bell'],['ngũ quả','offering'],['cá chép','fish'],['rồng vàng','dragon']])('maps %s to a visual only', (text,effect)=>expect(parseCommunityCommand(text)).toEqual({kind:'effect',effect}));
  it('bounds free effects, expires backlog and gives paid gifts priority',()=>{
    const q=new CommentEffects();for(let i=0;i<20;i++)q.request(String(i),'dragon',0);
    expect(q.status()).toMatchObject({queued:16,busy:4});expect(q.tick(0,'s',false,true)).toHaveLength(1);
    q.request('0','lotus',100);expect(q.status().cooldown).toBe(1);
    q.preempt(100);expect(q.snapshot()).toHaveLength(0);expect(q.tick(1000,'s',true,true)).toHaveLength(0);
    q.tick(10001,'s',false,true);expect(q.status().expired).toBe(15);
    q.request('0','lotus',30001);expect(q.tick(30001,'s',false,true)).toHaveLength(1);
    q.reset();expect(q.snapshot()).toHaveLength(0);
  });
  it('keeps free effects and chanting out of gift scores and lets standing visitors participate',()=>{
    const f=fixture(1);f.chat('seated');f.chat('standing');f.step(16000);
    f.chat('standing','rồng vàng');expect(f.e.snapshot().commentEffects).toHaveLength(1);
    f.chat('standing','nam mô a di đà phật');const until=f.actor('standing').chantUntil;expect(until).toBe(f.now+4000);
    f.step(1000);f.chat('standing','nam mô');expect(f.actor('standing').chantUntil).toBe(until);
    f.step(3900);f.chat('standing','nam mô');expect(f.actor('standing').chantUntil).toBe(until);
    f.step(100);f.chat('standing','nam mô');expect(f.actor('standing').chantUntil).toBe(f.now+4000);
    expect(f.e.metrics.giftUnits).toBe(0);expect(f.e.snapshot().ritual).toBeUndefined();
    expect(f.e.actions.some(a=>a.type==='GIFT_CONFIRMED'||a.type==='GIFT_THANKS')).toBe(false);
  });
});
