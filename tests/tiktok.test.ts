import { afterEach, describe, expect, it, vi } from 'vitest';
import { TikTokLiveConnection, SignatureRateLimitError, UserOfflineError, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { defaultSettings, normalizeEvent, normalizeUsername, commandSchema } from '@vuonsen/shared';
import { mapTikTokEvent, selectWireFields, type WebcastType } from '../apps/server/src/tiktok/mapper';
import { classifyLiveError } from '../apps/server/src/tiktok/errors';
import { TikTokLiveProvider } from '../apps/server/src/tiktok/provider';
import { connectorOptions } from '../apps/server/src/tiktok/options';
import { SourceManager } from '../apps/server/src/sources';
import { SceneEngine } from '../apps/server/src/engine';
import { FakeConnector, ROOM, rawChat, rawGift } from './fixtures/tiktok';

afterEach(() => { vi.useRealTimers(); });
describe('TikTok modern client mapping and validation', () => {
  it.each(['anh2phim003', '@anh2phim003', 'https://www.tiktok.com/@anh2phim003/live?lang=vi'])('normalizes %s', input => expect(normalizeUsername(input)).toBe('anh2phim003'));
  it.each(['', '@', 'https://evil.example/@abc/live', 'https://www.tiktok.com.evil/@abc/live', 'javascript:alert(1)', 'https://user:secret@tiktok.com/@abc/live', 'https://www.tiktok.com/@a/video/1', 'a b', 'abc.', '<b>abc</b>', 'x'.repeat(25), 'http://www.tiktok.com/@abc/live'])('rejects invalid username %s', input => expect(normalizeUsername(input)).toBeNull());
  it('preserves big string IDs, room and modern content, sanitizes nickname', () => {
    const result = mapTikTokEvent('chat', { ...rawChat(), user: { id: '9123456789012345678', nickname: '<b>Diệu Tâm</b> 🌸' } }, ROOM, 0);
    expect(result.kind).toBe('event');
    if (result.kind !== 'event') return;
    const event = normalizeEvent(result.event, 'ignored-session', 0)!;
    expect(event.userKey).toBe(`tiktok:${ROOM}:userId:9123456789012345678`);
    expect(event.displayName).toBe('Diệu Tâm 🌸');expect(event.keyword).toBe('lotus');expect(event).not.toHaveProperty('text');
  });
  it('falls back to displayId, never nickname or imprecise numeric IDs', () => {
    const input = { content: 'lễ phật', user: { id: '', displayId: 'Khach_An', nickname: 'Tên trùng' } };
    const r = mapTikTokEvent('chat', input, ROOM, 0);expect(r.kind).toBe('event');
    if (r.kind === 'event') expect(normalizeEvent(r.event, 's', 0)?.userKey).toBe(`tiktok:${ROOM}:displayId:Khach_An`);
    expect(mapTikTokEvent('chat', { ...input, user: { nickname: 'Tên trùng' } }, ROOM, 0).kind).toBe('ignored');
    expect(mapTikTokEvent('chat', { ...input, user: { id: 9123456789012345678 } }, ROOM, 0).kind).toBe('ignored');
  });
  it.each([null, {}, { content: '' }, { ...rawChat(), content: '' }, { ...rawChat(), content: ' ' }, { ...rawChat(), content: 12 }, { user: { id: '1' }, comment: 'legacy chat' }])('rejects empty/invalid/legacy payload %#', raw => expect(mapTikTokEvent('chat', raw, ROOM, 0).kind).toBe('ignored'));
  it('rejects another room and old events, but keeps identical ID-less comments', () => {
    expect(mapTikTokEvent('chat', rawChat(), '123', 0).kind).toBe('ignored');
    expect(mapTikTokEvent('chat', { ...rawChat(), common: { createTime: '1000' } }, ROOM, 1100000).kind).toBe('ignored');
    const a = mapTikTokEvent('chat', rawChat(), ROOM, 10000), b = mapTikTokEvent('chat', rawChat(), ROOM, 15000);
    expect(a.kind).toBe('event');expect(b.kind).toBe('event');if (a.kind === 'event') expect(a.event.eventId).toBeUndefined();
  });
  it('reads only ROOM_USER.total, not totalUser or memberCount', () => {
    expect(mapTikTokEvent('roomUser', { total: '42', totalUser: '9999' }, ROOM, 0)).toEqual({ kind: 'viewers', total: '42' });
    expect(mapTikTokEvent('roomUser', { totalUser: '9999', memberCount: 100 }, ROOM, 0).kind).toBe('ignored');
  });
  it('selects only required wire fields and forbids dashboard TikTok injection', () => {
    const wire = selectWireFields('chat', { ...rawChat(), cookie: 'SECRET', avatar: 'PRIVATE', user: { id: '1', nickname: 'An', token: 'SECRET' } });
    expect(JSON.stringify(wire)).not.toMatch(/SECRET|PRIVATE/);
    expect(commandSchema.safeParse({ type: 'event', event: { type: 'chat', source: 'tiktok', scope: ROOM, userId: '1' } }).success).toBe(false);
  });
  it('installed modern API accepts the options without network or authentication', async () => {
    const client = new TikTokLiveConnection('fixture_channel', connectorOptions);
    expect(client.options.processInitialData).toBe(false);expect(client.options.authenticateWs).toBe(false);expect(client.options.enableExtendedGiftInfo).toBe(false);
    expect(client.webClient.cookieJar).toBeDefined();expect(WebcastEvent.CHAT).toBe('chat');expect(ControlEvent.ERROR).toBe('error');
    await client.disconnect();
  });
});

describe('TikTok events reuse Stage 1 domain engine', () => {
  const setup = () => {
    let now = 1000000;const engine = new SceneEngine(defaultSettings, () => now);
    const event = (type: WebcastType, raw: unknown) => { const mapped = mapTikTokEvent(type, raw, ROOM, 0);if (mapped.kind === 'event') engine.receive(mapped.event);engine.tick();return mapped; };
    const step = (ms: number) => { for(let i = 0; i < ms; i += 100) { now += 100;engine.tick(); } };
    return { engine, event, step };
  };
  it('same user two chats = one actor; same nickname different IDs = two', () => {
    const {engine,event}=setup();event('chat',rawChat('1'));event('chat',rawChat('1'));event('chat',rawChat('2'));
    expect(engine.actors.size).toBe(2);expect(engine.participants.size).toBe(2);
  });
  it('queues one first-chat prayer until seated, without losing or duplicating it', () => {
    const {engine,event,step}=setup();event('chat',rawChat('1'));event('chat',rawChat('1'));
    expect(engine.actions.filter(a=>a.type==='LOTUS_BLOOM')).toHaveLength(0);step(4000);
    expect(engine.actions.filter(a=>a.type==='LOTUS_BLOOM')).toHaveLength(0);step(2200); // first visit must finish at the urn before the deferred prayer
    expect(engine.actions.filter(a=>a.type==='LOTUS_BLOOM')).toHaveLength(1);expect(engine.actors.size).toBe(1);expect(engine.toasts.some(t=>t.text.includes('cầu bình an'))).toBe(true);
  });
  it('expires a queued prayer after 30 seconds if no seat is available', () => {
    const {engine,event,step}=setup();engine.updateSettings({maxActors:1});event('chat',rawChat('1','xin chào'));event('chat',rawChat('2'));
    step(30100);expect(engine.actions.some(a=>a.type==='LOTUS_BLOOM')).toBe(false);expect(engine.metrics.reasons['Hành động chờ ngồi hết hạn 30 giây']).toBe(1);
  });
  it('member default OFF, opt-in ON; same ID chat never duplicates', () => {
    const {engine,event}=setup();event('member',rawChat('1'));expect(engine.actors.size).toBe(0);engine.updateSettings({autoJoinMember:true});event('member',rawChat('1'));event('chat',rawChat('1'));expect(engine.actors.size).toBe(1);
  });
  it('cumulative gift 1,2,3 and final 3 count exactly three, even replayed', () => {
    const {engine,event,step}=setup();for(const n of [1,2,3])event('gift',rawGift(n,0,`g${n}`));event('gift',rawGift(3,1,'g-final'));step(5100);event('gift',rawGift(3,1,'g-replayed'));
    expect(engine.metrics.giftUnits).toBe(3);expect(engine.metrics.giftTransactions).toBe(1);expect(engine.actions.filter(a=>a.type==='GIFT_THANKS')).toHaveLength(1);expect(engine.actors.size).toBe(0);
  });
  it('separate single gifts are counted despite effect cooldown; event replay is ignored', () => {
    const {engine,event}=setup();const single=rawGift(1,0,'single1',{gift:{type:2},groupId:'0'});event('gift',single);event('gift',single);event('gift',{...single,common:{msgId:'single2',roomId:ROOM}});
    expect(engine.metrics.giftUnits).toBe(2);expect(engine.metrics.giftTransactions).toBe(2);expect(engine.actions.filter(a=>a.type==='GIFT_THANKS')).toHaveLength(1);
  });
  it('streak group IDs are separated by product, user and recipient', () => {
    const {engine,event}=setup();event('gift',rawGift(3,1,'a'));event('gift',rawGift(2,1,'b',{giftId:'777'}));event('gift',rawGift(1,1,'c',{toUser:{id:'different'}}));expect(engine.metrics.giftUnits).toBe(6);
  });
  it('likes aggregate counts, are opt-in, throttle to 1/s and never create actors', () => {
    const {engine,event,step}=setup();event('like',{...rawChat(),count:20});expect(engine.actions).toHaveLength(0);engine.updateSettings({likeEffects:true});for(let i=0;i<100;i++)event('like',{...rawChat(),count:3});expect(engine.actions.filter(a=>a.type==='LIKE_PULSE')).toHaveLength(1);step(1100);event('like',{...rawChat(),count:4});expect(engine.metrics.likeUnits).toBe(324);expect(engine.actors.size).toBe(0);
  });
  it('100 modern messages / 10s remain bounded, preserve privacy and cap effects', () => {
    const {engine,event,step}=setup();for(let i=0;i<100;i++){event('chat',{...rawChat(String(i+1),'cầu an PRIVATE_CHAT_SENTINEL',`id-${i}`),token:'PRIVATE_TOKEN_SENTINEL'});step(100);}
    expect(engine.actors.size).toBe(100);expect(engine.waiting.size).toBe(0);expect(engine.pending.length).toBeLessThanOrEqual(2048);expect(JSON.stringify(engine.snapshot())).not.toMatch(/PRIVATE_CHAT_SENTINEL|PRIVATE_TOKEN_SENTINEL/);
    const bursts=new Map<number,number>();for(const a of engine.actions.filter(a=>a.type==='LOTUS_BLOOM'))bursts.set(Math.floor(a.at/1000),(bursts.get(Math.floor(a.at/1000))||0)+1);expect([...bursts.values()].every(n=>n<=6)).toBe(true);
  });
});

describe('Classified safe failures', () => {
  it('keeps TikTok room identity through standing and explicit seat requests', () => {
    let now=100000;const engine = new SceneEngine(defaultSettings,()=>now);engine.mode='tiktok';
    const send=(id:string,text='Chào')=>{const mapped=mapTikTokEvent('chat',rawChat(id,text),ROOM,now);if(mapped.kind==='event')engine.receive(mapped.event);engine.tick();};
    for(let i=1;i<=3;i++)send(String(i));
    const keys=[...engine.actors.keys()];engine.updateSettings({maxActors:1});now+=6100;engine.tick();
    expect(engine.snapshot().room).toMatchObject({seated:1,standing:2});expect([...engine.actors.keys()]).toEqual(keys);
    engine.updateSettings({maxActors:3});now+=2000;engine.tick();send('2','xin chỗ');send('3','ngồi');
    expect(engine.snapshot().room?.seated).toBe(3);expect([...engine.actors.keys()]).toEqual(keys);expect(engine.waiting.size).toBe(0);
  });
  it('uses actual library error classes and millisecond retryAfter', () => {
    expect(classifyLiveError(new UserOfflineError('private text')).kind).toBe('offline');
    const error=new SignatureRateLimitError('PRIVATE SECRET signing service rate limit response','Wait %s',{headers:{'retry-after':'120'}});
    expect(classifyLiveError(error)).toMatchObject({kind:'rate-limit',retryAfterMs:120000});expect(classifyLiveError(error).message).not.toContain('SECRET');
  });
  it('honors Retry-After header and reset timestamp', () => {
    expect(classifyLiveError({response:{statusCode:429,headers:{'retry-after':'180'}}},1000).retryAfterMs).toBe(180000);
    expect(classifyLiveError({name:'SignatureRateLimitError',retryAfter:120000,resetTime:301000},1000).retryAfterMs).toBe(300000);
  });
  it('distinguishes offline/network/signing and handles wrapped/composite errors', () => {
    expect(classifyLiveError({exception:{code:'ECONNRESET'}}).kind).toBe('network');
    expect(classifyLiveError({response:{status:403}}).kind).toBe('signing');
    expect(classifyLiveError({config:{requestErrs:[new UserOfflineError('x'),{code:'ENOTFOUND'}]}}).kind).toBe('network');
    expect(classifyLiveError({config:{requestErrs:[new UserOfflineError('x'),new Error('unknown')]}}).kind).toBe('unknown');
    expect(classifyLiveError(new Error('cookie=sessionid=PRIVATE_SECRET https://x/?token=SECRET')).message).not.toMatch(/PRIVATE_SECRET|token|sessionid/);
  });
});

describe('Connection lifecycle with fake transport (no LIVE claim)', () => {
  const setup = (behavior: ConstructorParameters<typeof FakeConnector>[0] = 'success') => {
    vi.useFakeTimers();vi.setSystemTime(1000000);const instances: FakeConnector[]=[];
    const provider=new TikTokLiveProvider(()=>{const c=new FakeConnector(behavior);instances.push(c);return c;},()=>.5,Date.now,true);
    return {provider,instances,flush:()=>vi.advanceTimersByTimeAsync(0)};
  };
  it('registers listeners before connect, ignores initial data and handles new data', async () => {
    const {provider,instances,flush}=setup('pending');const events: unknown[]=[];provider.onEvent(e=>events.push(e));await provider.connect('fixture');
    expect(instances[0].listenersAtConnect).toBe(1);instances[0].emit('chat',rawChat());expect(events).toHaveLength(0);instances[0].resolve();await flush();instances[0].emit('chat',rawChat());expect(events).toHaveLength(1);await provider.disconnect();
  });
  it('reconnects exactly once despite an error plus disconnect and no duplicate listeners', async () => {
    const {provider,instances,flush}=setup();await provider.connect('fixture');await flush();instances[0].emit('error',{code:'ECONNRESET'});instances[0].emit('disconnected',{});await vi.advanceTimersByTimeAsync(2000);
    expect(instances).toHaveLength(2);expect(instances[0].disconnected).toBe(true);expect(instances[0].listenerCount('chat')).toBe(0);expect(instances[1].listenerCount('chat')).toBe(1);expect(provider.state.status).toBe('LIVE_CONNECTED');await provider.disconnect();
  });
  it('offline/signing do not retry automatically', async () => {
    for(const error of [{name:'UserOfflineError'},{statusCode:403}]){const {provider,instances,flush}=setup({error});await provider.connect('fixture');await flush();await vi.advanceTimersByTimeAsync(600000);expect(instances).toHaveLength(1);expect(['LIVE_OFFLINE','ERROR']).toContain(provider.state.status);await provider.disconnect();}
  });
  it('rate limit waits the full duration; manual retry and channel switch cannot bypass it', async () => {
    const {provider,instances,flush}=setup({error:{name:'SignatureRateLimitError',retryAfter:120000}});await provider.connect('fixture');await flush();expect(provider.state.status).toBe('RATE_LIMITED');expect(provider.state.retryAt).toBe(Date.now()+120000);
    await expect(provider.retry()).rejects.toThrow();await provider.disconnect();await expect(provider.connect('other_fixture')).rejects.toThrow();await vi.advanceTimersByTimeAsync(120001);expect(instances).toHaveLength(1);
  });
  it('network retries use bounded exponential backoff and stop after five retries', async () => {
    const {provider,instances,flush}=setup({error:{code:'ECONNRESET'}});await provider.connect('fixture');await flush();const delays=[];
    while(provider.state.retryAt){const delay=provider.state.retryAt-Date.now();delays.push(delay);await vi.advanceTimersByTimeAsync(delay);}
    expect(delays).toEqual([2000,4000,8000,16000,30000]);expect(instances).toHaveLength(6);expect(provider.state.status).toBe('ERROR');await provider.disconnect();
  });
  it('manual disconnect cancels timers, pending connect and late events', async () => {
    const {provider,instances,flush}=setup('pending');await provider.connect('fixture');await provider.disconnect();instances[0].resolve();await flush();await vi.advanceTimersByTimeAsync(90000);expect(instances).toHaveLength(1);expect(provider.state.status).toBe('DISCONNECTED');expect(instances[0].disconnected).toBe(true);
  });
  it('times out a hung transport after 30 seconds and can change channel cleanly', async () => {
    const {provider,instances,flush}=setup('pending');await provider.connect('first');await vi.advanceTimersByTimeAsync(30000);expect(instances[0].disconnected).toBe(true);expect(provider.state.status).toBe('RECONNECTING');await provider.connect('second');await flush();expect(provider.state.username).toBe('second');expect(instances).toHaveLength(2);instances[0].emit('chat',rawChat());await provider.disconnect();
  });
  it('stream end stops retry while preserving source scene; DEMO isolated and usable', async () => {
    vi.useFakeTimers();const instances: FakeConnector[]=[];const manager=new SourceManager(defaultSettings,()=>{const c=new FakeConnector();instances.push(c);return c;},true);
    manager.mock.add(10);manager.current.tick();await manager.switchTo('tiktok');await manager.connectLive('first');await vi.advanceTimersByTimeAsync(0);instances[0].emit('chat',rawChat());manager.current.tick();expect(manager.current.actors.size).toBe(1);
    instances[0].emit('streamEnd',{});await vi.advanceTimersByTimeAsync(0);expect(manager.current.actors.size).toBe(1);expect(manager.tiktok.state.status).toBe('LIVE_OFFLINE');
    await manager.switchTo('demo');manager.mock.add(1);manager.current.tick();expect(manager.current.actors.size).toBe(11);expect([...manager.current.actors.keys()].every(k=>k.startsWith('demo:'))).toBe(true);await manager.shutdown();
  });
  it('changing room never mixes identities, reconnecting same room preserves them', async () => {
    vi.useFakeTimers();let room=ROOM;const instances:FakeConnector[]=[];const manager=new SourceManager(defaultSettings,()=>{const c=new FakeConnector('success',room);instances.push(c);return c;},true);
    await manager.switchTo('tiktok');await manager.connectLive('first');await vi.advanceTimersByTimeAsync(0);instances[0].emit('chat',rawChat());manager.current.tick();const session=manager.current.sessionId;
    instances[0].emit('disconnected',{});await vi.advanceTimersByTimeAsync(2500);expect(manager.current.sessionId).toBe(session);expect(manager.current.actors.size).toBe(1);
    room='7555555555555555555';instances.at(-1)!.emit('disconnected',{});await vi.advanceTimersByTimeAsync(2500);expect(manager.current.sessionId).not.toBe(session);expect(manager.current.actors.size).toBe(0);await manager.shutdown();
  });
});
