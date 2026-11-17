import { describe,it,expect } from 'vitest';
import { SceneEngine } from '../apps/server/src/engine';
import { FortuneQueue } from '../apps/server/src/fortune-queue';
import { getFortuneCatalog,readFortuneCatalog } from '../apps/server/src/fortune-catalog';
import { parseFortuneCommand } from '../apps/server/src/fortune-parser';
import { mapTikTokEvent } from '../apps/server/src/tiktok/mapper';
import { defaultSettings,fortuneRevealSchema,settingsPatchSchema,settingsSchema,rawEventSchema } from '@vuonsen/shared';
const items=getFortuneCatalog(),start=Date.parse('2027-02-06T12:00:00+07:00');
const intent=parseFortuneCommand('xin quẻ gia đạo')!;
const request=(id='u1',now=start)=>({sessionId:'s',userKey:id,displayName:'An',eventId:'e'+id,intent,now});
function setup(){let now=start;const e=new SceneEngine(defaultSettings,()=>now);return {e,advance:(ms:number)=>now+=ms,chat:(id:string,text='xin quẻ',eventId='e'+id)=>e.receive({type:'chat',userId:id,nickname:'Cùng tên',text,eventId})};}
describe('Xin quẻ Đinh Mùi 2027',()=>{
  it('loads all 576 validated entries once, preserves supplied collection counts',()=>{
    expect(items).toHaveLength(576);expect(getFortuneCatalog()).toBe(items);
    expect(['chu_de','con_giap','tan_mui_1991'].map(c=>items.filter(i=>i.collection===c).length)).toEqual([384,144,48]);
  });
  it('missing catalogue safely disables only fortunes',()=>{
    expect(readFortuneCatalog(new URL('./missing-2027.json',import.meta.url))).toEqual([]);
    const q=new FortuneQueue([]);expect(q.onIntent(request())).toBe('unavailable');expect(q.next(start)).toBeNull();
  });
  it('recognizes themes, zodiac, 1991 and numeric commands; distinguishes Tý and Tỵ',()=>{
    expect(parseFortuneCommand('xin que gia dao')).toEqual(intent);
    expect(parseFortuneCommand('xin quẻ tuổi Tý')?.scope).toBe('con_giap');
    expect(parseFortuneCommand('xin quẻ tuổi Tỵ')).toEqual({scope:'con_giap',theme:'tuoi_ti'});
    expect(parseFortuneCommand('xin que tuoi ran')).toEqual({scope:'con_giap',theme:'tuoi_ti'});
    expect(parseFortuneCommand('xin quẻ Tân Mùi')).toEqual({scope:'tan_mui_1991',theme:'tan_mui_1991'});
    expect(parseFortuneCommand('xin quẻ 1991')?.scope).toBe('tan_mui_1991');
    expect(parseFortuneCommand('xem quẻ 576')).toEqual({scope:'by_number',number:576});
    for(const text of ['cầu an','xin tiền','xin quẻ 0','xem quẻ 577','quẻo','xin quẻ '+'a'.repeat(150)])expect(parseFortuneCommand(text)).toBeNull();
  });
  it('uses separate stable identity for same nickname, with exact numeric lookup',()=>{
    const q=new FortuneQueue(items);q.onIntent({...request('one'),intent:{scope:'by_number',number:123}});q.onIntent(request('two'));
    expect(q.next(start)?.number).toBe(123);expect(q.next(start+6999)).toBeNull();expect(q.next(start+7000)).not.toBeNull();
  });
  it('deduplicates beyond the old engine 30 second window and permits separate events',()=>{
    const {e,chat,advance}=setup();chat('a');e.tick();advance(61000);chat('a');e.tick();
    expect(e.fortunes.status()).toMatchObject({revealed:1,duplicate:1});
    chat('a','xin quẻ gia đạo','new-topic');e.tick();expect(e.fortunes.status().revealed).toBe(2);
  });
  it('allows a new draw on the same topic after 60 seconds, including across Vietnam midnight',()=>{
    const q=new FortuneQueue(items),t=Date.parse('2027-02-06T23:58:00+07:00');
    expect(q.onIntent(request('u',t))).toBe('queued');
    expect(q.onIntent({...request('u',t+100),eventId:'b'})).toBe('cooldown');
    expect(q.onIntent({...request('u',t+61000),eventId:'c'})).toBe('queued');
    expect(q.onIntent({...request('u',t+121000),eventId:'d'})).toBe('queued');
  });
  it('bounds 50 chats while keeping gift score independent and ceremony duration unchanged',()=>{
    const {e,chat}=setup();for(let i=0;i<50;i++)chat(String(i));e.tick();e.tick();
    expect(e.fortunes.status()).toMatchObject({queued:32,revealed:1,busy:17});expect(e.metrics.giftUnits).toBe(0);
    e.receive({type:'gift',userId:'0',eventId:'gift',gift:{id:'test-only',count:3,finished:true}});e.tick();
    expect(e.metrics.giftUnits).toBe(3);expect(e.gifts.ranking()[0].score).toBe(3);expect(e.ritualQueueLength).toBe(1);
    expect(e.fortunes.status().queued).toBe(32);
  });
  it('never parses member/gift/like text or trusts supplied fortuneIntent',()=>{
    const {e}=setup();for(const type of ['gift','like','member'])e.receive({type,userId:'a',eventId:type,text:'xin quẻ',gift:{id:'x',count:1,finished:true}});
    e.receive({type:'chat',userId:'b',text:'chào',fortuneIntent:{scope:'by_number',number:1}});e.tick();expect(e.fortunes.status().revealed).toBe(0);
    expect(rawEventSchema.parse({type:'chat',userId:'a',fortuneIntent:intent})).not.toHaveProperty('fortuneIntent');
  });
  it('keeps only a safe intent plus bounded transient chat, never chat in snapshots',()=>{
    const {e,chat}=setup();chat('a','xin quẻ gia đạo');expect(e.pending[0].fortuneIntent).toEqual(intent);
    expect(e.pending[0].chatText).toBe('xin quẻ gia đạo');e.tick();
    expect(e.snapshot().fortune?.theme).toBe('gia_dao');expect(JSON.stringify(e.snapshot())).not.toContain('xin quẻ gia đạo');
  });
  it('disabled setting rejects requests and cancels current/pending display without points',()=>{
    const {e,chat}=setup();chat('a');chat('b');e.tick();e.updateSettings({fortuneEnabled:false});
    expect(e.snapshot().fortune).toBeUndefined();expect(e.fortunes.status().queued).toBe(0);chat('c');e.tick();
    expect(e.fortunes.status().disabled).toBe(1);expect(e.metrics.giftUnits).toBe(0);
    e.updateSettings({fortuneEnabled:true});e.tick();expect(e.snapshot().fortune).toBeUndefined();
  });
  it('reconnect snapshot does not enqueue/reveal again and expires on server deadline',()=>{
    const {e,chat,advance}=setup();chat('a');e.tick();const a=e.snapshot().fortune;
    expect(e.snapshot().fortune).toEqual(a);expect(e.actions.filter(a=>a.type==='FORTUNE_REVEAL')).toHaveLength(1);
    advance(7001);e.tick();expect(e.snapshot().fortune).toBeUndefined();expect(e.fortunes.status().revealed).toBe(1);
  });
  it('reset clears session, pending, seen, daily and counters',()=>{
    const {e,chat}=setup();chat('a');chat('b');e.tick();const old=e.sessionId;e.reset();
    expect(e.sessionId).not.toBe(old);expect(e.fortunes.status()).toMatchObject({queued:0,revealed:0});expect(e.snapshot().fortune).toBeUndefined();
    chat('a');e.tick();expect(e.snapshot().fortune?.sessionId).toBe(e.sessionId);
  });
  it('mapper rejects wrong room/historical input before fortune normalization',()=>{
    const raw={user:{id:'123',nickname:'A'},content:'xin quẻ',common:{roomId:'other',msgId:'m'}};
    expect(mapTikTokEvent('chat',raw,'room',start).kind).toBe('ignored');
    expect(mapTikTokEvent('chat',{...raw,common:{roomId:'room',createTime:'100',msgId:'m'}},'room',start).kind).toBe('ignored');
  });
  it('new session cannot inherit an old pending card; names and DTO are bounded',()=>{
    const q=new FortuneQueue(items);q.onIntent({...request(),displayName:'<b>An</b> https://secret.invalid'});
    const first=q.next(start)!;expect(first.displayName).toBe('An');expect(fortuneRevealSchema.safeParse(first).success).toBe(true);
    q.onIntent({...request('two'),sessionId:'new'});expect(q.next(start)?.sessionId).toBe('new');expect(q.status().revealed).toBe(1);
    expect(fortuneRevealSchema.safeParse({...first,short:'x'.repeat(301)}).success).toBe(false);
  });
  it('old settings add optional fortune defaults and patches never reset existing gift/audio config',()=>{
    expect(settingsSchema.parse({voiceVolume:.3})).toMatchObject({voiceVolume:.3,fortuneEnabled:true,fortuneVoiceEnabled:false,fortuneIntervalSeconds:7});
    expect(settingsPatchSchema.parse({fortuneVolume:.2})).toEqual({fortuneVolume:.2});
    expect(settingsPatchSchema.safeParse({fortuneIntervalSeconds:6}).success).toBe(false);
  });
  it('fortune does not require a seat, actor or gift',()=>{
    const e=new SceneEngine({...defaultSettings,autoJoinChat:false},()=>start);
    e.receive({type:'chat',userId:'visitor',text:'xin quẻ 1991',eventId:'independent'});e.tick();
    expect(e.actors.size).toBe(0);expect(e.snapshot().fortune?.theme).toBe('tan_mui_1991');expect(e.gifts.ranking()).toEqual([]);
  });
  it('frequency change never cuts an existing card short; display clearing permits draws after cooldown',()=>{
    const q=new FortuneQueue(items);q.onIntent(request('a'));q.onIntent(request('b'));q.next(start,30000);
    expect(q.next(start+7000,7000)).toBeNull();expect(q.next(start+9000,7000)).not.toBeNull();
    q.clearDisplay();expect(q.onIntent({...request('a',start+61000),eventId:'again'})).toBe('queued');
  });
  it('accepts another request at 5 seconds without ending the current voiced fortune',()=>{
    const q=new FortuneQueue(items);q.onIntent(request('same'));const first=q.next(start,7000,true)!;
    expect(q.onIntent({...request('same',start+4999),eventId:'early'})).toBe('cooldown');
    expect(q.onIntent({...request('same',start+5000),eventId:'ready'})).toBe('queued');
    expect(q.remainingCooldown('same',start+5000)).toBe(5);
    expect(q.next(start+5000,7000,true)).toBeNull();expect(q.snapshot(start+5000)?.revealId).toBe(first.revealId);
    expect(q.next(start+15000,7000,true)?.number).not.toBe(first.number);
  });
  it('same-topic rerolls change the previous number after cooldown, without replaying event IDs',()=>{
    const q=new FortuneQueue(items);let previous=0;
    for(let i=0;i<10;i++){
      const r={...request('same',start+i*60000),eventId:'draw'+i};
      expect(q.onIntent(r)).toBe('queued');const f=q.next(r.now)!;
      expect(f.number).not.toBe(previous);previous=f.number;
      expect(q.onIntent(r)).toBe('duplicate');
      expect(q.remainingCooldown('same',r.now+1000)).toBe(4);
    }
    expect(q.status().alreadyToday).toBe(0);
  });
  it('fortune requests never fall through to normal prayer bubbles and explain cooldown',()=>{
    const {e,chat,advance}=setup();chat('one');e.tick();
    expect(e.actions.some(a=>a.type==='PRAY')).toBe(false);e.actions=[];
    advance(1000);chat('one','xin quẻ','again');e.tick();
    expect(e.actions.some(a=>a.type==='PRAY')).toBe(false);
    expect(JSON.stringify(e.snapshot())).toContain('chờ 4 giây');
    advance(59000);chat('one','xin quẻ','new-draw');e.tick();
    expect(e.fortunes.status().revealed).toBe(2);
  });
  it('voice-enabled cards reserve 15 seconds and do not overlap queued cards',()=>{
    const q=new FortuneQueue(items);q.onIntent(request('a'));q.onIntent(request('b'));
    expect(q.next(start,7000,true)?.expiresAt).toBe(start+15000);
    expect(q.next(start+14999,7000,true)).toBeNull();
    expect(q.next(start+15000,7000,true)?.displayName).toBe('An');
  });
  it('source switch clears unprocessed fortune intents and unsent reveals, preserving chat actors',()=>{
    const {e,chat}=setup();chat('a');e.tick();chat('b');e.clearFortuneDisplay();e.tick();
    expect(e.snapshot().fortune).toBeUndefined();expect(e.fortunes.status().queued).toBe(0);
    expect(e.actions.some(a=>a.type==='FORTUNE_REVEAL')).toBe(false);expect(e.actors.size).toBe(2);
  });
});
