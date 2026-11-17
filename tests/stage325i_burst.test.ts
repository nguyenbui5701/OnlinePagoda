import { describe, expect, it } from 'vitest';
import { defaultSettings, seats, settingsSchema, type Actor, type GiftConfirmed } from '@vuonsen/shared';
import { SceneEngine } from '../apps/server/src/engine';
import { RitualVoiceSync, MAX_WAIT_MS, SPEAK_AT_MS } from '../apps/overlay/src/ritual-voice-sync';

// Simulated-time fixture: no TikTok connection, no LIVE purchase, no Reset on the running app.
function fixture() {
  let time = 100000;
  const settings = settingsSchema.parse({
    ...defaultSettings, theme:'golden', showGiftThanks:true,
    masterMute:false, voiceVolume:.8, idleMinutes:8,
  });
  const engine = new SceneEngine(settings, () => time);
  const add = (id:string, index:number, displayName=`Khach ${id}`) => {
    const key = `demo:${engine.sessionId}:userId:${id}`;
    const actor: Actor = {
      key, seatId:seats[index].id, displayName, variant:0, status:'idle',
      statusAt:time, joinedAt:time, lastActiveAt:time,
    };
    engine.actors.set(key, actor);
    return key;
  };
  const gift = (id:string, eventId:string, count=1, finished=true) => ({
    type:'gift' as const, source:'demo' as const, userId:id,
    nickname:`Khach ${id}`, eventId,
    gift:{id:'rose', name:'Hoa hong', count, finished},
  });
  const advance = (ms:number) => {time += ms; engine.tick();};
  const receive = (id:string,eventId:string,count=1) => {
    const accepted=engine.receive(gift(id,eventId,count));
    return accepted;
  };
  const confirmations = ():GiftConfirmed[] =>
    engine.actions.filter(a=>a.type==='GIFT_CONFIRMED')
      .map(a=>a.confirmedGift).filter((x): x is GiftConfirmed=>Boolean(x));
  return { engine, add, gift, receive, advance, confirmations, get time(){return time;} };
}

describe('3.2.5I - many gifts: scores, queue and voice safety (offline)', () => {
  it('keeps score for 100 unique completed gifts even when ceremonies coalesce', () => {
    const f=fixture();
    for(let i=0;i<20;i++)f.add(String(i),i);
    for(let i=0;i<100;i++)expect(f.receive(String(i%20),`distinct-${i}`)).toBe(true);
    for(let i=0;i<5;i++)f.engine.tick(); // processes max 30 events per tick
    expect(f.engine.metrics.giftTransactions).toBe(100);
    expect(f.engine.metrics.giftUnits).toBe(100);
    expect(f.engine.snapshot().leaderboard).toHaveLength(10);
    expect(f.engine.snapshot().leaderboard?.every(r=>r.score===5)).toBe(true);
    const active=f.engine.snapshot().ritual;
    expect(active).toBeDefined();
    expect(active?.durationMs).toBe(7200);
    expect(f.engine.ritualQueueLength).toBeLessThanOrEqual(16);
  });

  it('deduplicates replayed transaction IDs without dropping separate gifts', () => {
    const f=fixture(); f.add('1',0);
    expect(f.receive('1','repeat-transaction',3)).toBe(true);
    f.engine.tick();
    expect(f.receive('1','repeat-transaction',3)).toBe(false);
    expect(f.receive('1','different-transaction',2)).toBe(true);
    f.engine.tick();
    expect(f.engine.metrics.giftUnits).toBe(5);
    expect(f.engine.metrics.giftTransactions).toBe(2);
    expect(f.engine.snapshot().leaderboard?.[0].score).toBe(5);
  });

  it('keeps same-name different-user scores and confirmed gift identities separate', () => {
    const f=fixture(); f.add('a',0,'Trung ten'); f.add('b',1,'Trung ten');
    f.engine.receive({...f.gift('a','tx-a',2),nickname:'Trung ten'});
    f.engine.receive({...f.gift('b','tx-b',1),nickname:'Trung ten'});
    f.engine.tick();
    expect(f.engine.snapshot().leaderboard).toHaveLength(2);
    expect(f.engine.snapshot().leaderboard?.map(r=>r.displayName)).toEqual(['Trung ten','Trung ten']);
    const gifts=f.confirmations();
    expect(gifts).toHaveLength(2);
    expect(new Set(gifts.map(g=>g.userKey)).size).toBe(2);
    expect(f.engine.metrics.giftUnits).toBe(3);
  });

  it('does not read another donor name while someone else is at the urn', () => {
    const f=fixture(); const first=f.add('a',0); const second=f.add('b',1);
    f.receive('a','audio-a'); f.receive('b','audio-b'); f.engine.tick();
    const [giftA,giftB]=f.confirmations();
    expect(giftA.userKey).toBe(first);
    expect(giftB.userKey).toBe(second);
    const voice=new RitualVoiceSync();
    expect(voice.hold(giftB,f.engine.snapshot(),true)).toBe(true);
    f.advance(SPEAK_AT_MS);
    expect(f.engine.snapshot().ritual?.actorId).toBe(first);
    expect(voice.due(f.engine.snapshot(),f.time)).toEqual([]);
    f.advance(7200-SPEAK_AT_MS);
    expect(f.engine.snapshot().ritual?.actorId).toBe(second);
    f.advance(SPEAK_AT_MS-1);
    expect(voice.due(f.engine.snapshot(),f.time)).toEqual([]);
    f.advance(1);
    expect(voice.due(f.engine.snapshot(),f.time)).toEqual([giftB]);
    expect(voice.due(f.engine.snapshot(),f.time)).toEqual([]);
  });

  it('holds the last donor voice beyond 65 seconds while still queued', () => {
    const f=fixture();
    for(let i=0;i<12;i++)f.add(String(i),i);
    for(let i=0;i<12;i++)f.receive(String(i),`queue-${i}`);
    f.engine.tick();
    const last=f.confirmations().find(g=>g.userKey.endsWith('userId:11'));
    expect(last).toBeDefined();
    const voice=new RitualVoiceSync();
    expect(voice.hold(last!,f.engine.snapshot(),true)).toBe(true);
    for(let i=0;i<10;i++) {
      f.advance(7200);
      expect(voice.due(f.engine.snapshot(),f.time)).toEqual([]);
    }
    expect(f.time-100000).toBe(72000); // previously MAX_WAIT_MS=65000
    expect(MAX_WAIT_MS).toBeGreaterThan(150000);
    f.advance(7200); // last donor starts here
    expect(f.engine.snapshot().ritual?.actorId).toBe(last!.userKey);
    f.advance(SPEAK_AT_MS);
    expect(voice.due(f.engine.snapshot(),f.time)).toEqual([last]);
  });

  it('clears active/queued rituals and scoreboard on Reset without carrying over voices', () => {
    const f=fixture(); f.add('a',0); f.add('b',1);
    f.receive('a','before-a'); f.receive('b','before-b');f.engine.tick();
    const voice=new RitualVoiceSync();
    voice.hold(f.confirmations()[1],f.engine.snapshot(),true);
    expect(f.engine.snapshot().ritual).toBeDefined();
    const previous=f.engine.sessionId;
    f.engine.reset();voice.reset();
    expect(f.engine.sessionId).not.toBe(previous);
    expect(f.engine.snapshot().ritual).toBeUndefined();
    expect(f.engine.ritualQueueLength).toBe(0);
    expect(f.engine.snapshot().leaderboard).toHaveLength(0);
    expect(voice.pendingCount).toBe(0);
    f.advance(7201);
    expect(f.engine.snapshot().ritual).toBeUndefined();
  });

  it('does not count incomplete streak updates as finalized gifts', () => {
    const f=fixture(); f.add('a',0);
    for(const step of [1,2]) {
      expect(f.engine.receive({...f.gift('a',`partial-${step}`,step,false),
        gift:{...f.gift('a',`partial-${step}`,step,false).gift,streakId:'streak-I'}})).toBe(true);
      f.engine.tick();
    }
    f.engine.receive({...f.gift('a','final',3,true),
      gift:{...f.gift('a','final',3,true).gift,streakId:'streak-I'}});
    f.engine.tick();
    expect(f.engine.metrics.giftTransactions).toBe(1);
    expect(f.engine.metrics.giftUnits).toBe(3);
    expect(f.confirmations()).toHaveLength(1);
  });
});
