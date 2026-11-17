import {expect,it} from 'vitest';
import {floorPoint,defaultSettings,seats,groundHome,homeRoute,ceremonyJourney,prayerTarget,sampleRoute,carpetV2,ritualArrival,ritualDeparture,type GroundRoute} from '@vuonsen/shared';
import {GroundTraffic} from '../apps/server/src/ground-traffic';
import {SceneEngine} from '../apps/server/src/engine';
import {parseCommunityCommand} from '../apps/server/src/community-parser';
import {RitualVoiceSync} from '../apps/overlay/src/ritual-voice-sync';
import {giftOfferingPose} from '../apps/overlay/src/golden/gift-ritual-motion';

it('all chair routes use row rugs and two separate central lanes; only the chair step leaves the rug',()=>{
 for(const seat of seats){
  const home=groundHome(seat),j=ceremonyJourney(home,home,prayerTarget(1,2),1000,160,1600);
  for(const r of [j.outbound,j.inbound])for(const s of r.segments){
   expect(s.from.x===s.to.x||s.from.y===s.to.y).toBe(true);
   if(s.resource.startsWith('row:'))expect(carpetV2.branches).toContain(s.to.y);
   if(s.resource.startsWith('chair:'))expect(Math.abs(s.to.y-s.from.y)).toBe(31);
   if(s.resource.startsWith('up:'))expect(s.to.x).toBe(carpetV2.up);
   if(s.resource.startsWith('down:'))expect(s.to.x).toBe(carpetV2.down);
  }
  expect(sampleRoute(j.inbound,j.endsAt)).toMatchObject({x:home.x,y:home.y,moving:false});
  const reloaded=JSON.parse(JSON.stringify(j));expect(sampleRoute(reloaded.outbound,1500)).toEqual(sampleRoute(j.outbound,1500));
 }
});
it('all frontal cushions, including their full radius, stay outside the original widening carpet',()=>{
 for(const raw of seats){const s=groundHome(raw),left=raw.side==='left';
  for(let i=0;i<32;i++){const p=floorPoint('front',s.x+31*Math.cos(i*Math.PI/16),s.y+15*Math.sin(i*Math.PI/16));
   const edge=480-(p.y-1000)*216/920;
   expect(left?p.x<edge:p.x>1080-edge).toBe(true);
  }
 }
});
it('speed changes travel duration, never altar hold; interpolation remains continuous at every join',()=>{
 const h=groundHome(seats[99]),a=ceremonyJourney(h,h,{x:540,y:1080},0,100,2020),b=ceremonyJourney(h,h,{x:540,y:1080},0,240,2020);
 expect(a.arrivedAt).toBeGreaterThan(b.arrivedAt*2);expect(a.departAt-a.arrivedAt).toBe(2020);
 for(const s of a.outbound.segments){expect(sampleRoute(a.outbound,s.startedAt)).toMatchObject({x:s.from.x,y:s.from.y});expect(Math.hypot(sampleRoute(a.outbound,s.endsAt-.001).x-s.to.x,sampleRoute(a.outbound,s.endsAt-.001).y-s.to.y)).toBeLessThan(.01);}
});
it('gift body returns smoothly to its chair scale instead of snapping at the route boundary',()=>{
 const home=groundHome(seats[0]),journey=ceremonyJourney(home,home,{x:540,y:1080},1000,160,2020);
 const r={actorId:'a',seatId:home.id,startedAt:1000,durationMs:journey.endsAt-1000,journey};
 expect(giftOfferingPose(r,1000,home).scale).toBe(home.scale);
 expect(giftOfferingPose(r,journey.endsAt-.1,home).scale).toBeCloseTo(home.scale,6);
 expect(giftOfferingPose(r,journey.endsAt,home)).toMatchObject({x:home.x,y:home.y,scale:home.scale,phase:'done'});
});
it('traffic rejects shared/crossing paths and a ninth simultaneous mover, then releases reservations',()=>{
 const t=new GroundTraffic(),r=(n:number):GroundRoute=>({from:{x:n*100,y:0},to:{x:n*100,y:100},startedAt:0,endsAt:1000,segments:[{from:{x:n*100,y:0},to:{x:n*100,y:100},startedAt:0,endsAt:1000,resource:String(n)}]});
 for(let i=0;i<8;i++)expect(t.reserve(String(i),[r(i)],0)).toBe(true);
 expect(t.moving(500)).toBe(8);expect(t.reserve('ninth',[r(10)],0)).toBe(false);expect(t.reserve('same',[r(0)],0)).toBe(false);
 t.release('0');expect(t.reserve('ninth',[r(10)],0)).toBe(true);t.expire(1300);expect(t.moving(1300)).toBe(0);
 const c=r(0);c.segments[0]={from:{x:-10,y:50},to:{x:10,y:50},startedAt:0,endsAt:1000,resource:'cross'};
 t.clear();expect(t.reserve('v',[r(0)],0)).toBe(true);expect(t.reserve('h',[c],0)).toBe(false);
});
it.each(['thắp nhan','THẮP NHANG','thắp hương','dâng hương','con muốn lên thắp nhang','cho mình thắp hương nhé','con xin lên dâng hương'])('accepts free incense: %s',text=>expect(parseCommunityCommand(text)).toEqual({kind:'incense'}));
it.each(['không thắp nhang','đừng dâng hương','xin quẻ và thắp nhang','thắp nhang rồng vàng','tôi kể chuyện thắp nhang'])('rejects ambiguous incense: %s',text=>expect(parseCommunityCommand(text)).toBeNull());

function fixture(){
 let now=100000,id=0;const e=new SceneEngine({...defaultSettings,theme:'golden',sceneSpace:'hall',templeFloorPreview:true,idleMinutes:30,cameraGiftFocusEnabled:true},()=>now);
 const step=(ms:number)=>{for(let n=0;n<ms;n+=100){now+=100;e.tick();}};
 const chat=(user:string,text='Chào')=>{e.receive({type:'chat',userId:user,nickname:user,text,eventId:String(++id)});e.tick();};
 const gift=(user:string)=>{e.receive({type:'gift',userId:user,eventId:'g'+(++id),gift:{id:'rose',count:1,finished:true}});e.tick();};
 const actor=(user:string)=>[...e.actors.values()].find(a=>a.key.endsWith(':'+user))!;
 return {e,step,chat,gift,actor,get now(){return now;}};
}
it('member arrivals immediately fill 18 different prayer slots, then queue excess without changing seat ownership',()=>{
 const f=fixture();f.e.updateSettings({autoJoinMember:true});
 for(let i=0;i<19;i++){f.e.receive({type:'member',userId:'member-'+i,eventId:'m'+i,nickname:'Khách '+i});f.e.tick();}
 const active=[...f.e.actors.values()].filter(a=>a.welcome?.startedAt!==undefined);
 expect(active).toHaveLength(18);expect(new Set(active.map(a=>`${a.welcome!.row}:${a.welcome!.lane}`)).size).toBe(18);
 expect(f.e.snapshot().prayerStatus?.queued).toBe(1);
 for(const a of active){const j=a.welcome!.journey!;expect(j.departAt-j.arrivedAt).toBe(1800);expect(j.endsAt-j.outbound.startedAt).toBeLessThan(20000);}
 f.step(20000);expect(f.e.snapshot().prayerStatus?.queued).toBe(0);expect(f.e.actors.size).toBe(19);
 f.e.receive({type:'member',userId:'member-0',eventId:'returning-member',nickname:'Khách 0'});f.e.tick();expect(f.actor('member-0').welcome?.reason).toBe('bow');
});
it('new visitors reserve ceremony before departure, follow it to their own seats, and keep last activity unchanged',()=>{
 const f=fixture();f.chat('a');f.chat('b');const a=f.actor('a'),b=f.actor('b'),last=a.lastActiveAt;
 expect(a.welcome?.journey).toBeDefined();expect(b.welcome?.startedAt).toBe(a.welcome?.startedAt);
 expect(b.welcome?.journey?.target).not.toEqual(a.welcome?.journey?.target);
 f.step(50000);expect(a.welcome).toBeUndefined();expect(b.welcome).toBeUndefined();expect(a.lastActiveAt).toBe(last);
 expect(a.seatId).toBe('seat-0');expect(b.seatId).toBe('seat-5');expect(f.e.snapshot().movement?.moving).toBe(0);
});
it('free incense has no gift/score/focus, holds one request per person, and gifts get the next uninterrupted turn',()=>{
 const f=fixture();f.chat('a');f.chat('b');f.step(50000);f.e.actions=[];
 f.chat('a','thắp nhang');const r=f.e.snapshot().ritual!;expect(r.source).toBe('comment');expect(r.journey).toBeDefined();
 f.chat('a','thắp nhang');expect(f.e.snapshot().movement?.incenseCooldown).toBe(1);
 f.chat('b','thắp nhang');f.gift('b');f.step(500);
 expect(f.e.snapshot().ritual?.actorId).toBe(r.actorId);expect(f.e.metrics.giftTransactions).toBe(1);
 expect(f.e.camera.motion?.kind).not.toBe('focus');
 f.step(r.startedAt+r.durationMs-f.now+100);
 expect(f.e.snapshot().ritual).toMatchObject({source:'gift',actorId:f.actor('b').key});
 expect(f.e.snapshot().movement?.incenseCompleted).toBe(1);expect(f.e.actions.filter(a=>a.type==='GIFT_CONFIRMED')).toHaveLength(1);
});
it('camera and voice use route arrival, never a free ceremony by the same donor',()=>{
 const f=fixture();f.chat('a');f.step(25000);f.gift('a');const r=f.e.snapshot().ritual!,g=f.e.actions.find(a=>a.type==='GIFT_CONFIRMED')!;
 expect(r.journey).toBeDefined();expect(ritualDeparture(r)-ritualArrival(r)).toBe(2020);
 const s=f.e.snapshot();s.settings.masterMute=false;s.settings.voiceVolume=1;s.settings.showGiftThanks=true;
 const voice=new RitualVoiceSync();expect(voice.hold(g.confirmedGift!,s,true)).toBe(true);
 expect(voice.due({...s,ritual:{...r,source:'comment'}},ritualArrival(r))).toEqual([]);
 expect(voice.due(s,ritualArrival(r)-1)).toEqual([]);expect(voice.due(s,ritualArrival(r))).toHaveLength(1);expect(voice.due(s,ritualArrival(r)+10)).toEqual([]);
 f.step(ritualArrival(r)-f.now+100);expect(f.e.camera.motion).toMatchObject({kind:'focus',actorId:r.actorId});
});
it('expired seating returns via a reserved route and a standing viewer can request incense then return outside',()=>{
 const f=fixture();f.chat('a');f.step(25000);f.e.updateSettings({idleMinutes:.1});f.step(100);
 const a=f.actor('a');expect(a.seatId).toMatch(/^standing/);expect(a.travel).toBeDefined();f.step(20000);expect(a.travel).toBeUndefined();
 f.chat('a','thắp nhang');const r=f.e.snapshot().ritual!;expect(r.source).toBe('comment');expect(r.journey?.home.id).toMatch(/^standing/);
 f.step(r.durationMs+100);expect(a.seatId).toMatch(/^standing/);expect(f.e.metrics.giftUnits).toBe(0);expect(f.e.snapshot().movement?.incenseCompleted).toBe(1);
 f.chat('a','ngồi');expect(a.travel?.kind).toBe('seat');
});
it('room/reset clears pending movement and preserves walk speed and all gift/audio settings',()=>{
 const f=fixture();f.chat('a');const settings={...f.e.settings};f.e.clearCommunityDisplay();expect(f.actor('a').welcome).toBeUndefined();expect(f.e.snapshot().movement?.moving).toBe(0);
 f.e.reset();expect(f.e.settings).toEqual(settings);expect(f.e.snapshot().movement).toMatchObject({moving:0,incenseQueued:0});
});
it('120 identities keep 100 chairs, bound parallel movers to eighteen and bound/expire the free queue',()=>{
 const f=fixture();f.e.updateSettings({templeFloorPreview:false});
 for(let i=0;i<120;i++)f.chat('crowd-'+i);
 f.step(55000);f.e.updateSettings({templeFloorPreview:true});
 expect(f.e.snapshot().room).toMatchObject({seated:100,standing:20,visibleStanding:20});
 const ownership=[...f.e.actors.values()].map(a=>[a.key,a.seatId]);
 for(let i=0;i<40;i++)f.chat('crowd-'+i,'thắp nhang');
 expect(f.e.snapshot().movement?.incenseQueued).toBe(32);expect(f.e.snapshot().movement!.incenseBusy).toBeGreaterThan(0);
 for(let i=40;i<65;i++)f.chat('crowd-'+i,'lạy Phật');
 for(let i=0;i<650;i++){f.step(100);expect(f.e.snapshot().movement!.moving).toBeLessThanOrEqual(18);}
 expect(f.e.snapshot().movement!.incenseExpired).toBeGreaterThan(0);expect(f.e.snapshot().movement!.incenseQueued).toBe(0);
 expect([...f.e.actors.values()].map(a=>[a.key,a.seatId])).toEqual(ownership);expect(f.e.metrics.giftUnits).toBe(0);
});
