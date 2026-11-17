import { describe, expect, it } from 'vitest';
import { applyDelta, cleanText, defaultSettings, normalizeEvent, normalizeKeyword, isStanding, seats, type RawEvent } from '@vuonsen/shared';
import { SceneEngine } from '../apps/server/src/engine';
import { MockLiveProvider } from '../apps/server/src/provider';

function fixture() { let now=1_000_000;const engine=new SceneEngine(defaultSettings,()=>now);return {engine,advance:(ms:number)=>{now+=ms;engine.tick();}}; }
const chat=(id:string,extra:Partial<RawEvent>={}):RawEvent=>({type:'chat',userId:id,nickname:`Khách ${id}`,text:'Xin chào',...extra});
describe('Identity and moderation',()=>{
  it('prefers nonempty userId, falls back to uniqueId, namespaces sessions and fields',()=>{
    expect(normalizeEvent(chat('123',{uniqueId:'x'}),'s',0)?.userKey).toBe('demo:s:userId:123');
    expect(normalizeEvent(chat(' ',{uniqueId:'x'}),'s',0)?.userKey).toBe('demo:s:uniqueId:x');
    expect(normalizeEvent(chat(''),'s',0)).toBeNull();
    expect(normalizeEvent(chat('x'),'s1',0)?.userKey).not.toBe(normalizeEvent(chat('x'),'s2',0)?.userKey);
    expect(normalizeEvent(chat('x'),'s',0)?.userKey).not.toBe(normalizeEvent(chat('',{uniqueId:'x'}),'s',0)?.userKey);
  });
  it('rejects malformed input and retains no raw text',()=>{
    expect(normalizeEvent({type:'evil',userId:'1'},'s',0)).toBeNull();
    expect(normalizeEvent(chat('1',{text:'x'.repeat(1001)}),'s',0)).toBeNull();
    expect(normalizeEvent(chat('1'),'s',0)).not.toHaveProperty('text');
  });
  it('removes scripts, links, control characters and clips Unicode safely',()=>{
    expect(cleanText('<script>alert(1)</script><b>An</b>\u202E https://bad.example')).toBe('An');
    expect(Array.from(cleanText('😀'.repeat(30)))).toHaveLength(18);
    expect(cleanText('  An   Nhiên ')).toBe('An Nhiên');
  });
  it.each(['cầu an','CAU AN','cầu an','bình an','sức khỏe'])('recognizes lotus keyword %s',value=>expect(normalizeKeyword(value)).toBe('lotus'));
  it.each(['lễ phật','le phat','A DI DA PHAT','a di đà phật'])('recognizes prayer %s',value=>expect(normalizeKeyword(value)).toBe('pray'));
});
describe('Deterministic actors, seats and bounded queues',()=>{
  it('reuses one actor across three comments and emits lotus',()=>{
    const {engine,advance}=fixture();engine.receive(chat('1'));engine.tick();advance(5100);engine.receive(chat('1',{text:'cầu an'}));engine.tick();advance(5100);engine.receive(chat('1',{text:'lễ phật'}));engine.tick();
    expect(engine.actors.size).toBe(1);expect(engine.participants.size).toBe(1);expect(engine.actions.some(a=>a.type==='LOTUS_BLOOM')).toBe(true);
  });
  it('allocates 100 unique seats and 20 standing identities, retaining seat FIFO',()=>{
    const {engine}=fixture();for(let i=0;i<120;i++)engine.receive(chat(String(i)));for(let i=0;i<4;i++)engine.tick();
    expect(engine.actors.size).toBe(120);expect(engine.waiting.size).toBe(20);expect(engine.participants.size).toBe(120);
    expect(new Set([...engine.actors.values()].filter(a=>!isStanding(a)).map(a=>a.seatId)).size).toBe(100);expect([...engine.waiting.values()][0].userKey).toContain(':100');
    expect(seats.every(s=>s.x<410||s.x>670)).toBe(true);
  });
  it('releases seats after prayer and admits oldest queued guest without deleting identity',()=>{
    const {engine,advance}=fixture();engine.updateSettings({maxActors:1,idleMinutes:.1});engine.receive(chat('1'));engine.receive(chat('2'));engine.tick();advance(6001);
    expect([...engine.actors.values()][0].status).toBe('to-standing');expect(engine.waiting.size).toBe(0);
    expect([...engine.actors.values()].find(a=>!isStanding(a))?.key.endsWith(':2')).toBe(true);expect(engine.actors.size).toBe(2);
  });
  it('repeated queued comments do not change FIFO position or duplicate people',()=>{
    const {engine}=fixture();engine.updateSettings({maxActors:1});['1','2','3','2'].forEach(id=>engine.receive(chat(id)));engine.tick();expect([...engine.waiting.keys()].map(k=>k.split(':').at(-1))).toEqual(['2','3']);
  });
  it('bounds processing queue and toast count under bursts',()=>{
    const {engine}=fixture();for(let i=0;i<2100;i++)engine.receive(chat(String(i)));expect(engine.pending.length).toBe(2048);expect(engine.metrics.dropped).toBe(52);engine.tick();expect(engine.toasts.length).toBeLessThanOrEqual(3);expect(engine.pending.length).toBe(2018);
  });
  it('settings patches preserve preferences and reduce seats after active prayers finish',()=>{
    const {engine,advance}=fixture();engine.updateSettings({showLabels:false,templeName:'Tâm An',maxActors:10});engine.updateSettings({animationSpeed:2});expect(engine.settings.showLabels).toBe(false);expect(engine.settings.maxActors).toBe(10);expect(engine.settings.templeName).toBe('Tâm An');
    for(let i=0;i<10;i++)engine.receive(chat(String(i)));engine.tick();engine.updateSettings({maxActors:3});expect(engine.snapshot().prayerStatus?.active).toBe(10);advance(6100);expect(engine.snapshot().room).toMatchObject({seated:3,standing:7});expect(engine.waiting.size).toBe(0);
  });
});
describe('Event dedupe, cooldown and provider lifecycle',()=>{
  it('deduplicates explicit event IDs for 30 seconds then expires',()=>{
    const {engine,advance}=fixture();expect(engine.receive(chat('1',{eventId:'a'}))).toBe(true);expect(engine.receive(chat('1',{eventId:'a'}))).toBe(false);advance(30001);expect(engine.receive(chat('1',{eventId:'a'}))).toBe(true);
  });
  it('does not discard identical ID-less events at the adapter boundary',()=>{
    const {engine}=fixture();expect(engine.receive(chat('1'))).toBe(true);expect(engine.receive(chat('1'))).toBe(true);expect(engine.pending.length).toBe(2);
  });
  it('enforces per-person per-action cooldown and allows later actions',()=>{
    const {engine,advance}=fixture();engine.receive(chat('1',{text:'cầu an'}));engine.tick();engine.receive(chat('1',{text:'cau an'}));engine.tick();expect(engine.actions.filter(a=>a.type==='LOTUS_BLOOM')).toHaveLength(1);expect(engine.metrics.reasons['Cooldown 5 giây']).toBe(1);advance(5000);engine.receive(chat('1',{text:'cau an'}));engine.tick();expect(engine.actions.filter(a=>a.type==='LOTUS_BLOOM')).toHaveLength(2);
  });
  it('does not create actors from likes, gifts or default member events',()=>{
    const {engine}=fixture();engine.receive(chat('1',{type:'member'}));engine.receive(chat('2',{type:'like'}));engine.receive(chat('3',{type:'gift',gift:{id:'flower',count:1,finished:true}}));engine.tick();expect(engine.actors.size).toBe(0);expect(engine.actions.some(a=>a.type==='GIFT_THANKS')).toBe(true);
  });
  it('supports opt-in member and suppresses incomplete/replayed gift streaks',()=>{
    const {engine,advance}=fixture();engine.updateSettings({autoJoinMember:true});engine.receive(chat('1',{type:'member'}));engine.tick();expect(engine.actors.size).toBe(1);
    const gift=chat('1',{type:'gift',gift:{id:'flower',count:3,streakId:'streak',finished:false}});engine.receive(gift);engine.tick();expect(engine.actions.filter(a=>a.type==='GIFT_THANKS')).toHaveLength(0);
    gift.gift!.finished=true;engine.receive(gift);engine.tick();advance(5100);engine.receive(gift);engine.tick();expect(engine.actions.filter(a=>a.type==='GIFT_THANKS')).toHaveLength(1);
  });
  it('resets personal data and dedupe while preserving preferences',()=>{
    const {engine,advance}=fixture();engine.updateSettings({showLabels:false});engine.receive(chat('1'));engine.tick();const id=engine.sessionId;engine.reset();expect(engine.sessionId).not.toBe(id);expect(engine.actors.size+engine.waiting.size+engine.participants.size+engine.pending.length).toBe(0);expect(engine.settings.showLabels).toBe(false);expect(engine.snapshot().logs).toHaveLength(1);
  });
  it('provider reconnect does not duplicate subscriptions or reset actors',()=>{
    const {engine}=fixture();const p=new MockLiveProvider();const off=p.onEvent(e=>engine.receive(e));p.connect();p.add(1);engine.tick();p.disconnect();p.add(1);engine.tick();expect(engine.actors.size).toBe(1);p.connect();p.add(1);engine.tick();expect(engine.actors.size).toBe(2);off();p.add(1);engine.tick();expect(engine.actors.size).toBe(2);
  });
  it('merges deltas without duplicating actors',()=>{
    const {engine}=fixture();engine.receive(chat('1'));engine.tick();const state=engine.snapshot();const {actors,...rest}=state;const merged=applyDelta(state,{...rest,revision:1,upserts:actors,removed:[],actions:[]});expect(merged.actors).toHaveLength(1);expect(applyDelta(merged,{...rest,revision:2,upserts:[],removed:[actors[0].key],actions:[]}).actors).toHaveLength(0);
  });
});
