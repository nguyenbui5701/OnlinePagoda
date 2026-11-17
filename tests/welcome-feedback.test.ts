import { expect, it } from 'vitest';
import { MockLiveProvider, demoGreetings } from '../apps/server/src/provider';
import { normalizeKeyword, type RawEvent } from '@vuonsen/shared';
import { parseFortuneCommand } from '../apps/server/src/fortune-parser';
import { parseLanternCommand } from '../apps/server/src/lantern-queue';
import { SceneEngine } from '../apps/server/src/engine';
import { defaultSettings, seats } from '@vuonsen/shared';
import { welcomePose } from '../apps/overlay/src/welcome-motion';
import { idleMotion } from '../apps/overlay/src/live-motion';

it('cycles varied DEMO greetings without generating commands or changing live chat', () => {
  const provider=new MockLiveProvider(), events:RawEvent[]=[];
  provider.onEvent(e=>events.push(e));provider.connect();provider.add(12);provider.add(1);
  expect(new Set(events.slice(0,12).map(e=>e.text)).size).toBe(12);
  expect(events[12].text).toBe(events[0].text);
  expect(new Set(events.map(e=>e.eventId)).size).toBe(13);
  for(const text of demoGreetings){
    expect(normalizeKeyword(text)).toBe('chat');
    expect(parseFortuneCommand(text)).toBeNull();expect(parseLanternCommand(text)).toBeNull();
  }
  provider.emit({type:'chat',userId:'manual',text:'Lời thật của tôi'});
  expect(events.at(-1)?.text).toBe('Lời thật của tôi');
});

it('first visit goes from entrance to the urn, bows, returns to its reserved seat and never scores',()=>{
  let now=100000;const e=new SceneEngine(defaultSettings,()=>now);
  e.receive({type:'chat',userId:'a',text:'Lời thật'});e.tick();
  const actor=e.snapshot().actors[0],seat=seats.find(s=>s.id===actor.seatId)!;
  expect(welcomePose(actor,seat,now)?.phase).toBe('approach');
  expect(welcomePose(actor,seat,now+2300)).toMatchObject({phase:'pray',x:440,y:1182,pose:'pray'});
  expect(welcomePose(actor,seat,now+4800)?.phase).toBe('return');
  expect(welcomePose(actor,seat,now+5999)).toMatchObject({phase:'settle',x:seat.x,y:seat.y});
  expect(welcomePose(structuredClone(actor),seat,now+2700)).toEqual(welcomePose(actor,seat,now+2700));
  expect(idleMotion({...actor,status:'idle'},now+4000,true,false).walking).toBe(false);
  for(let i=0;i<61;i++){now+=100;e.tick();}
  expect(e.snapshot().actors[0].welcome).toBeUndefined();expect(e.metrics.giftUnits).toBe(0);expect(e.snapshot().ritual).toBeUndefined();
  expect(e.actions.some(a=>a.type==='GIFT_CONFIRMED'||a.type==='GIFT_THANKS')).toBe(false);
  e.actors.clear();e.receive({type:'chat',userId:'a',text:'Ghé lại'});e.tick();expect(e.snapshot().actors[0].welcome).toBeUndefined();
  e.reset();e.receive({type:'chat',userId:'a',text:'Phiên mới'});e.tick();expect(e.snapshot().actors[0].welcome).toBeDefined();
});

it('uses concurrent rows and releases the front row for a queued gift',()=>{
  let now=100000;const e=new SceneEngine(defaultSettings,()=>now);
  for(let i=0;i<12;i++)e.receive({type:'chat',userId:String(i),text:'Chào'});e.tick();
  const active=()=>e.snapshot().actors.filter(a=>a.welcome?.startedAt!==undefined);
  expect(active()).toHaveLength(12);
  e.receive({type:'gift',userId:'0',eventId:'gift',gift:{id:'rose',count:2,finished:true}});e.tick();
  expect(e.metrics.giftUnits).toBe(2);expect(e.snapshot().ritual).toBeUndefined();
  for(let i=0;i<61;i++){now+=100;e.tick();}
  expect(e.snapshot().ritual?.actorId).toContain(':0');expect(active()).toHaveLength(0);
  expect(e.snapshot().actors.filter(a=>a.welcome)).toHaveLength(0);
  now+=7300;e.tick();expect(e.snapshot().ritual).toBeUndefined();expect(active()).toHaveLength(0);
  e.reset();expect(e.snapshot().actors).toHaveLength(0);
});

it('waiting for the urn does not keep inactive visitors forever',()=>{
  let now=100000;const e=new SceneEngine(defaultSettings,()=>now);
  e.receive({type:'chat',userId:'donor',text:'Chào'});e.tick();
  for(let i=0;i<61;i++){now+=100;e.tick();}
  e.receive({type:'gift',userId:'donor',gift:{id:'rose',count:1,finished:true}});e.tick();
  e.updateSettings({idleMinutes:.1});
  e.receive({type:'chat',userId:'waiting',text:'Chào'});e.tick();
  now+=6100;e.tick();
  const waiting=e.snapshot().actors.find(a=>a.key.endsWith(':waiting'))!;
  expect(waiting.status).toBe('to-standing');expect(welcomePose(waiting,seats[1],now)).toBeUndefined();
  expect(e.snapshot().ritual).toBeDefined();
});
