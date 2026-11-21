import {expect,it} from 'vitest';
import {defaultSettings,normalizeEvent,seats,groundHome,isStanding,type Actor,type GroundRoute} from '@vuonsen/shared';
import {SceneEngine} from '../apps/server/src/engine';
import {GroundTraffic} from '../apps/server/src/ground-traffic';
import {CommentEffects} from '../apps/server/src/comment-effects';
import {welcomePose} from '../apps/overlay/src/welcome-motion';

const now=100000;
const settings={...defaultSettings,theme:'golden' as const,sceneSpace:'hall' as const,templeFloorPreview:true,idleMinutes:30,showBlessingTree:false};
function actor(key:string,seatId:string):Actor{return {key,seatId,displayName:'Khách thử',variant:0,joinedAt:now,lastActiveAt:now,status:'idle',statusAt:now};}

it('reserved seats have visible waiting owners, and counters distinguish seated from travelling',()=>{
 const e=new SceneEngine(settings,()=>now);
 for(let i=0;i<30;i++){e.receive({type:'member',userId:String(i),eventId:String(i)});}
 e.updateSettings({autoJoinMember:true});e.tick();
 const state=e.snapshot(),waiting=state.actors.filter(a=>a.welcome?.startedAt===undefined&&a.welcome);
 expect(state.room).toMatchObject({seated:30,atSeat:12,away:18,available:70});expect(waiting).toHaveLength(12);
 for(const a of waiting){
  expect(a.welcome!.origin?.id).toBe(a.seatId);
  const seat=groundHome(seats.find(s=>s.id===a.seatId)!);
  expect(welcomePose(a,seat,now,true,true)).toMatchObject({x:seat.x,y:seat.y,phase:'waiting',pose:'kneel'});
 }
});

it('hidden standing identities release travel reservations instead of blocking visible visitors',()=>{
 const e=new SceneEngine({...settings,idleMinutes:.1},()=>now);
 for(let i=0;i<100;i++){const a=actor('old-'+i,seats[i].id);a.lastActiveAt=now-10000;e.actors.set(a.key,a);}
 e.tick();
 const all=[...e.actors.values()],hidden=all.filter(a=>isStanding(a)&&a.standingSlot===undefined);
 expect(hidden).toHaveLength(80);expect(hidden.every(a=>!a.travel&&a.status==='standing')).toBe(true);
 expect(e.snapshot().room).toMatchObject({seated:0,available:100,standing:100,visibleStanding:20});
 e.tick();expect([...e.actors.values()].filter(a=>a.travel)).toHaveLength(20);
});

it('a busy first waiter keeps their ticket but cannot block another eligible person from a free seat',()=>{
 const e=new SceneEngine({...settings,maxActors:1},()=>now);
 for(const [i,id] of ['busy','ready'].entries()){
  const event=normalizeEvent({type:'chat',userId:id,text:'xin chỗ'},e.sessionId,now)!;
  const a=actor(event.userKey,'standing-'+id);a.standingSlot=i;a.status='standing';
  if(i===0){a.status='to-standing';a.travel={from:groundHome(seats[0]),to:{id:a.seatId,x:60,y:1900,scale:.7,side:'left'},kind:'standing'};}
  e.actors.set(a.key,a);e.waiting.set(a.key,event);
 }
 e.tick();
 expect([...e.actors.values()].find(a=>!isStanding(a))?.key.endsWith(':ready')).toBe(true);
 expect([...e.waiting.keys()].some(k=>k.endsWith(':busy'))).toBe(true);
 expect(e.snapshot().room?.available).toBe(0);
});

it('same-direction walkers share a lane with spacing; close following and crossing still wait',()=>{
 const traffic=new GroundTraffic();
 const route=(y:number):GroundRoute=>({from:{x:0,y},to:{x:0,y:y+1000},startedAt:0,endsAt:10000,
  segments:[{from:{x:0,y},to:{x:0,y:y+1000},startedAt:0,endsAt:10000,resource:'up:shared'}]});
 expect(traffic.reserve('a',[route(0)],0)).toBe(true);
 expect(traffic.reserve('b',[route(-150)],0)).toBe(true);
 expect(traffic.reserve('too-close',[route(-30)],0)).toBe(false);
 const crossing:GroundRoute={from:{x:-100,y:500},to:{x:100,y:500},startedAt:4000,endsAt:6000,
  segments:[{from:{x:-100,y:500},to:{x:100,y:500},startedAt:4000,endsAt:6000,resource:'cross'}]};
 expect(traffic.reserve('cross',[crossing],0)).toBe(false);
});

it('comment effects resume after actual gift activity ends without an extra fixed 7.2-second delay',()=>{
 const q=new CommentEffects();q.request('a','lotus',0);q.tick(0,'s',false,true);q.preempt(100);
 q.request('b','candle',100);expect(q.tick(200,'s',true,true)).toHaveLength(0);
 expect(q.tick(300,'s',false,true)).toHaveLength(1);expect(q.status().preempted).toBe(1);
});

it('a queued gift starting later still preempts the chat effect that began while it waited',()=>{
 const q=new CommentEffects();q.preempt(0);q.request('a','lotus',100);q.tick(100,'s',false,true);
 expect(q.snapshot()).toHaveLength(1);
 q.tick(200,'s',true,true);expect(q.snapshot()).toHaveLength(0);expect(q.status().preempted).toBe(1);
 q.tick(300,'s',false,true);expect(q.snapshot()).toHaveLength(0);
});

it('prayer movers do not consume all eight ordinary mover slots, but total movers remain bounded',()=>{
 const t=new GroundTraffic();
 const route=(n:number):GroundRoute=>({from:{x:n*100,y:0},to:{x:n*100,y:100},startedAt:0,endsAt:1000,
  segments:[{from:{x:n*100,y:0},to:{x:n*100,y:100},startedAt:0,endsAt:1000,resource:String(n)}]});
 for(let i=0;i<10;i++)expect(t.reserve('prayer-'+i,[route(i)],0,true)).toBe(true);
 for(let i=10;i<18;i++)expect(t.reserve('walk-'+i,[route(i)],0)).toBe(true);
 expect(t.moving(500)).toBe(18);
 expect(t.reserve('extra',[route(20)],0)).toBe(false);
 expect(t.reserve('extra-prayer',[route(21)],0,true)).toBe(false);
});

it('free incense does not block unrelated chat effects, and confirmed gifts begin their visual in the receiving tick',()=>{
 const e=new SceneEngine({...settings,autoJoinChat:false,commentEffectsEnabled:true},()=>now);
 const raw={type:'chat' as const,userId:'a',text:'thắp nhang',eventId:'incense'};
 const key=normalizeEvent(raw,e.sessionId,now)!.userKey;e.actors.set(key,actor(key,seats[0].id));
 e.receive(raw);e.tick();expect(e.snapshot().ritual?.source).toBe('comment');
 e.receive({type:'chat',userId:'b',text:'rồng vàng',eventId:'effect'});e.tick();
 expect(e.snapshot().commentEffects).toHaveLength(1);expect(e.metrics.giftUnits).toBe(0);
 e.receive({type:'gift',userId:'c',eventId:'gift',gift:{id:'demo:rose',demoGroup:'rose',count:1,finished:true,unitCoins:1}});e.tick();
 expect(e.metrics.giftTransactions).toBe(1);expect(e.snapshot().giftShow?.active).toHaveLength(1);
});
