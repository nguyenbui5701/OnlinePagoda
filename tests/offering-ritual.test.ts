import { describe,expect,it } from 'vitest';
import { defaultSettings,seats,type OfferingRitual,type RawEvent } from '@vuonsen/shared';
import { SceneEngine } from '../apps/server/src/engine';
import { offeringPose,OFFERING_DURATION_MS } from '../apps/overlay/src/golden/offering-ritual';

function setup() {
  let time=100000;
  const engine=new SceneEngine(defaultSettings,()=>time);
  const advance=(ms:number)=>{time+=ms;engine.tick();};
  const chat=(id:string):RawEvent=>({type:'chat',userId:id,nickname:`Khách ${id}`,text:'xin chào'});
  const gift=(id:string,ev:string):RawEvent=>({type:'gift',userId:id,nickname:`Khách ${id}`,eventId:ev,gift:{id:'rose',count:1,finished:true}});
  return {engine,advance,chat,gift,get time(){return time;}};
}
function ready(f:ReturnType<typeof setup>,id:string) {
  f.engine.receive(f.chat(id)); f.engine.tick();
  for(let i=0;i<4;i++) f.advance(3000);
  expect(f.engine.actors.get(`demo:${f.engine.sessionId}:userId:${id}`)?.status).toBe('idle');
}

describe('Gift offering - deterministic server scheduling',()=>{
  it('gives a seated donor one ritual and preserves seat and score',()=>{
    const f=setup();ready(f,'a');const seat=f.engine.snapshot().actors[0].seatId;
    f.engine.receive(f.gift('a','gift-a'));f.engine.tick();
    const ritual=f.engine.snapshot().ritual;
    expect(ritual).toMatchObject({actorId:f.engine.snapshot().actors[0].key,seatId:seat});
    expect(f.engine.snapshot().leaderboard?.[0].score).toBe(1);
    const p=offeringPose(ritual!,f.time+4200,seats.find(s=>s.id===seat)!);
    expect(p).toMatchObject({phase:'offer',x:540,y:1182});
    f.advance(OFFERING_DURATION_MS+1);
    expect(f.engine.snapshot().ritual).toBeUndefined();
    expect(f.engine.snapshot().actors[0].seatId).toBe(seat);
  });
  it('serializes two different donors and coalesces repeated gift from same donor',()=>{
    const f=setup();ready(f,'a');ready(f,'b');
    f.engine.receive(f.gift('a','a1'));f.engine.receive(f.gift('a','a2'));f.engine.receive(f.gift('b','b1'));f.engine.tick();
    const first=f.engine.snapshot().ritual!;expect(first.actorId).toContain('a');
    f.advance(OFFERING_DURATION_MS+1);
    expect(f.engine.snapshot().ritual?.actorId).toContain('b');
    expect(f.engine.snapshot().leaderboard?.find(e=>e.key===first.actorId)?.score).toBe(2);
  });
  it('does not manufacture actors from gifts, does not start an unsupported ritual',()=>{
    const f=setup(); f.engine.receive(f.gift('a','g'));f.engine.tick();
    expect(f.engine.actors.size).toBe(0);expect(f.engine.snapshot().ritual).toBeUndefined();
    expect(f.engine.metrics.giftUnits).toBe(1);
  });
  it('clears ritual on reset without changing settings',()=>{
    const f=setup();ready(f,'a');f.engine.receive(f.gift('a','g'));f.engine.tick();expect(f.engine.snapshot().ritual).toBeDefined();
    f.engine.reset();expect(f.engine.snapshot().ritual).toBeUndefined();expect(f.engine.snapshot().actors).toHaveLength(0);
  });
  it('stays bounded and takes the same coordinates after snapshot/reconnect',()=>{
    const f=setup();ready(f,'a');f.engine.receive(f.gift('a','g'));f.engine.tick();
    const ritual=f.engine.snapshot().ritual as OfferingRitual;
    const seat=seats.find(s=>s.id===ritual.seatId)!;
    expect(offeringPose(ritual,ritual.startedAt+1500,seat)).toEqual(offeringPose({...ritual},ritual.startedAt+1500,seat));
    expect(offeringPose(ritual,ritual.startedAt+OFFERING_DURATION_MS,seat).phase).toBe('done');
    for(let i=0;i<60;i++) {f.engine.receive(f.gift('a','u'+i));f.engine.tick();}
    expect(f.engine.ritualQueueLength).toBeLessThanOrEqual(16);
  });
});
