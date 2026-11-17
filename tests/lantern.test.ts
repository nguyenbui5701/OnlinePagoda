import { describe,it,expect } from 'vitest';
import { LanternQueue,parseLanternCommand } from '../apps/server/src/lantern-queue';
import { SceneEngine } from '../apps/server/src/engine';
import { SourceManager } from '../apps/server/src/sources';
import { defaultSettings,lanternThemes,lanternRevealSchema,settingsPatchSchema,settingsSchema,rawEventSchema } from '@vuonsen/shared';
const start=100000;
const req=(id='a',now=start)=>({sessionId:'session',userKey:id,displayName:'An',eventId:'e'+id,topic:'gia_dinh' as const,now});
function scene(){let now=start;const e=new SceneEngine({...defaultSettings,lanternEnabled:true},()=>now);return {e,advance:(n:number)=>now+=n,chat:(id:string,text='hoa đăng',eventId='e'+id)=>e.receive({type:'chat',userId:id,nickname:'An',text,eventId})};}
describe('Hoa đăng cầu an',()=>{
  it('recognizes exactly six preset topics with accents, decomposed accents, spaces and case',()=>{
    expect(parseLanternCommand(' HOA   ĐĂNG ')).toBe('binh_an');
    for(const t of lanternThemes){expect(parseLanternCommand('hoa đăng '+t.command)).toBe(t.id);expect(parseLanternCommand(('HOA ĐĂNG '+t.command).normalize('NFD'))).toBe(t.id);}
    expect(parseLanternCommand('hoa dang suc khoe')).toBe('suc_khoe');expect(lanternThemes).toHaveLength(6);
  });
  it('never treats arbitrary wishes or old commands as lantern content',()=>{
    for(const text of ['cầu an','lễ Phật','xin quẻ','hoa đăng gia đình riêng tư','hãy hoa đăng','hoa đăng <script>x</script>','hoa đăng '+'a'.repeat(121)])expect(parseLanternCommand(text)).toBeNull();
    expect(rawEventSchema.parse({type:'chat',userId:'a',lanternIntent:'gia_dinh'})).not.toHaveProperty('lanternIntent');
  });
  it('keeps feature off by default and patch does not reset audio or fortune settings',()=>{
    expect(settingsSchema.parse({voiceVolume:.3})).toMatchObject({voiceVolume:.3,lanternEnabled:false});
    expect(settingsPatchSchema.parse({lanternEnabled:true})).toEqual({lanternEnabled:true});
  });
  it('reveals a clean name for exactly 8 seconds with only a topic, never raw wishes',()=>{
    const q=new LanternQueue();q.onIntent({...req(),displayName:'<b>An</b> https://secret.invalid'});
    const f=q.next(start)!;expect(f).toMatchObject({displayName:'An',topic:'gia_dinh',startedAt:start,expiresAt:start+8000});
    expect(lanternRevealSchema.safeParse(f).success).toBe(true);expect(f).not.toHaveProperty('text');
    expect(q.snapshot(start+7999)?.revealId).toBe(f.revealId);expect(q.snapshot(start+8000)).toBeUndefined();
  });
  it('same identity waits exactly 5s across topics; same nicknames are separate identities',()=>{
    const q=new LanternQueue();expect(q.onIntent(req())).toBe('queued');expect(q.onIntent(req('b'))).toBe('queued');
    expect(q.onIntent({...req('a',start+4999),eventId:'new',topic:'cha_me'})).toBe('cooldown');
    expect(q.remainingCooldown('a',start+1000)).toBe(4);
    expect(q.onIntent({...req('a',start+5000),eventId:'newer',topic:'cha_me'})).toBe('queued');
  });
  it('prevents replay for whole session, including rejected events, without cross-source collisions',()=>{
    const q=new LanternQueue();q.onIntent(req());
    expect(q.onIntent({...req('a',start+90000)})).toBe('duplicate');
    expect(q.onIntent({...req('b'),eventId:'source-b:ea'})).toBe('queued');
  });
  it('caps pending at 16 and counts expiration once at 120 seconds',()=>{
    const q=new LanternQueue();for(let i=0;i<16;i++)expect(q.onIntent(req(String(i)))).toBe('queued');
    expect(q.onIntent(req('overflow'))).toBe('busy');expect(q.status().queued).toBe(16);
    q.expire(start+119999);expect(q.status().expired).toBe(0);q.expire(start+120000);q.expire(start+130000);
    expect(q.status()).toMatchObject({queued:0,expired:16,busy:1});expect(q.next(start+130000)).toBeNull();
  });
  it('clear removes active and queued but keeps replay/cooldown; reset clears the session',()=>{
    const q=new LanternQueue();q.onIntent(req());q.next(start);q.onIntent(req('b'));q.clearDisplay();
    expect(q.snapshot(start)).toBeUndefined();expect(q.status().queued).toBe(0);
    expect(q.onIntent({...req('a',start+1000),eventId:'fresh'})).toBe('cooldown');
    q.reset('new');expect(q.onIntent({...req(),sessionId:'new'})).toBe('queued');expect(q.status().revealed).toBe(0);
  });
  it('needs no seat, payment or actor and suppresses normal greeting/prayer actions',()=>{
    const {e,chat}=scene();e.updateSettings({autoJoinChat:false});chat('a');e.tick();
    expect(e.snapshot().lantern?.topic).toBe('binh_an');expect(e.actors.size).toBe(0);
    expect(e.actions.map(a=>a.type)).toEqual(['LANTERN_REVEAL']);expect(e.metrics.giftUnits).toBe(0);
  });
  it('only chat can request lanterns and injected internal intents are ignored',()=>{
    const {e}=scene();for(const type of ['member','like','gift'])e.receive({type,userId:'a',text:'hoa đăng',eventId:type,gift:{id:'x',count:1,finished:true}});
    e.receive({type:'chat',userId:'b',text:'chào',lanternIntent:'gia_dinh'});e.tick();expect(e.lanterns.status().revealed).toBe(0);
  });
  it('displays cooldown feedback instead of a prayer bubble',()=>{
    const {e,chat,advance}=scene();chat('a');e.tick();advance(1000);e.actions=[];chat('a','hoa đăng','new');e.tick();
    expect(JSON.stringify(e.snapshot().toasts)).toContain('chờ 4 giây');expect(e.actions.some(a=>a.type==='PRAY')).toBe(false);
  });
  it('alternates eligible queues and never overlaps or cuts 15-second voiced fortunes',()=>{
    const {e,chat,advance}=scene();e.updateSettings({fortuneVoiceEnabled:true});
    chat('f1','xin quẻ');chat('l1');chat('f2','xin quẻ');chat('l2');e.tick();
    expect(e.snapshot().fortune).toBeDefined();expect(e.snapshot().lantern).toBeUndefined();
    advance(14999);e.tick();expect(e.snapshot().fortune).toBeDefined();
    advance(1);e.tick();expect(e.snapshot().lantern).toBeDefined();expect(e.snapshot().fortune).toBeUndefined();
    advance(7999);e.tick();expect(e.snapshot().lantern).toBeDefined();
    advance(1);e.tick();expect(e.snapshot().fortune).toBeDefined();expect(e.snapshot().lantern).toBeUndefined();
    advance(15000);e.tick();expect(e.snapshot().lantern).toBeDefined();expect(e.fortunes.status().revealed).toBe(2);
  });
  it('lets eligible lanterns fill fortune interval gaps without delaying on an empty queue',()=>{
    const {e,chat,advance}=scene();e.updateSettings({fortuneIntervalSeconds:30});chat('f1','xin quẻ');chat('f2','xin quẻ');chat('l1');chat('l2');e.tick();
    advance(9000);e.tick();expect(e.snapshot().lantern).toBeDefined();
    advance(8000);e.tick();expect(e.lanterns.status().revealed).toBe(2);
    advance(13000);e.tick();expect(e.snapshot().fortune).toBeDefined();
  });
  it('gift units and ritual stay independent of lantern scheduling',()=>{
    const {e,chat}=scene();chat('a');e.tick();const before=e.snapshot().lantern;
    e.receive({type:'gift',userId:'a',eventId:'gift',gift:{id:'demo',count:3,finished:true}});e.tick();
    expect(e.metrics.giftUnits).toBe(3);expect(e.gifts.ranking()[0].score).toBe(3);expect(e.ritualQueueLength).toBe(1);expect(e.snapshot().lantern).toEqual(before);
  });
  it('disable clears queued, active and unprocessed requests without changing gift/audio/fortune config',()=>{
    const {e,chat}=scene();chat('a');e.tick();chat('b');e.updateSettings({lanternEnabled:false});e.tick();
    expect(e.snapshot().lantern).toBeUndefined();expect(e.lanterns.status().queued).toBe(0);expect(e.actions.some(a=>a.type==='LANTERN_REVEAL')).toBe(false);
    chat('c');e.tick();expect(e.lanterns.status().disabled).toBe(1);e.updateSettings({lanternEnabled:true});e.tick();expect(e.snapshot().lantern).toBeUndefined();
    expect(e.settings).toMatchObject({voiceVolume:defaultSettings.voiceVolume,fortuneEnabled:true});
  });
  it('source switch clears both source queues and unsent actions',async()=>{
    const sources=new SourceManager({...defaultSettings,lanternEnabled:true});
    try{sources.demo.receive({type:'chat',userId:'a',text:'hoa đăng',eventId:'a'});sources.demo.tick();
      sources.demo.receive({type:'chat',userId:'b',text:'hoa đăng',eventId:'b'});
      await sources.switchTo('tiktok');expect(sources.demo.snapshot().lantern).toBeUndefined();expect(sources.demo.pending.some(e=>e.lanternIntent)).toBe(false);
      expect(sources.demo.actions.some(a=>a.type==='LANTERN_REVEAL')).toBe(false);
      await sources.switchTo('demo');sources.demo.tick();expect(sources.demo.lanterns.status().queued).toBe(0);
    }finally{await sources.shutdown();}
  });
  it('reset and snapshots cannot replay an old lamp',()=>{
    const {e,chat,advance}=scene();chat('a');e.tick();const first=e.snapshot().lantern;
    expect(e.snapshot().lantern).toEqual(first);expect(e.lanterns.status().revealed).toBe(1);
    advance(8000);e.tick();expect(e.snapshot().lantern).toBeUndefined();e.reset();chat('a');e.tick();
    expect(e.snapshot().lantern?.sessionId).not.toBe(first?.sessionId);expect(e.lanterns.status().revealed).toBe(1);
  });
});
