import {afterEach,it,expect,vi} from 'vitest';
import {defaultSettings,settingsSchema,settingsPatchSchema,lanternThemes,type LanternReveal} from '@vuonsen/shared';
import {FortuneVoiceService,lanternVoiceText} from '../apps/server/src/fortune-voice-service';
import {FortuneVoice} from '../apps/overlay/src/fortune-voice';
import type {AudioManager} from '../apps/overlay/src/audio';
import {SceneEngine} from '../apps/server/src/engine';
import {parseCommunityCommand} from '../apps/server/src/community-parser';
const pcm={sampleRate:24000 as const,channels:1 as const,pcm16:Buffer.alloc(2400).toString('base64')};
const reveal:LanternReveal={version:1,revealId:'r',sessionId:'s',displayName:'An',topic:'gia_dinh',startedAt:100000,expiresAt:108000};
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it.each(lanternThemes)('reads short approved lantern topic $label',({id})=>{
  const text=lanternVoiceText({...reveal,topic:id,displayName:'<b>An</b> https://bad.invalid'});
  expect(text).toContain('An gửi hoa đăng.');expect(text).not.toMatch(/https|<|>/);expect(text.length).toBeLessThan(180);
});
it('lantern service validates current cards, caches by name/topic and defers to gift synthesis',async()=>{
  const synth=vi.fn(async()=>pcm);const service=new FortuneVoiceService({kind:'lantern',enabled:true,synth,now:()=>100000});
  expect(await service.get(reveal)).toBe(pcm);await service.get(reveal);expect(synth).toHaveBeenCalledTimes(1);
  await service.get({...reveal,displayName:'Bình'});await service.get({...reveal,topic:'cha_me'});expect(synth).toHaveBeenCalledTimes(3);
  expect(await service.get({...reveal,expiresAt:100000})).toBeUndefined();
  const busy=new FortuneVoiceService({kind:'lantern',enabled:true,synth,now:()=>100000,giftBusy:()=>true});expect(await busy.get(reveal)).toBeUndefined();
  const off=new FortuneVoiceService({kind:'lantern',enabled:false,synth});expect(await off.get(reveal)).toBeUndefined();
});
function setup(){
  const engine=new SceneEngine({...defaultSettings,lanternEnabled:true,autoJoinChat:false},()=>100000);
  engine.receive({type:'chat',userId:'lantern',nickname:'An',text:'hoa đăng gia đình'});engine.tick();
  const state=engine.snapshot(),actions=engine.actions,stop=vi.fn(),setVolume=vi.fn(),playFortunePcm=vi.fn(()=>({stop,setVolume}));
  const output={enabled:true,state:'ready',playing:false,queued:0};
  return {state,actions,stop,setVolume,playFortunePcm,output,voice:new FortuneVoice({debug:()=>output,playFortunePcm} as unknown as AudioManager,'lantern')};
}
it('lantern voice plays once, changes volume and stops for gifts without replay',async()=>{
  const fetch=vi.fn(async(_url:unknown)=>({ok:true,json:async()=>pcm}));vi.stubGlobal('fetch',fetch);const t=setup();
  t.voice.update(t.state,[]);expect(fetch).not.toHaveBeenCalled();
  t.voice.update(t.state,t.actions);await vi.waitFor(()=>expect(t.voice.status).toBe('speaking'));
  expect(fetch.mock.calls[0][0]).toBe('/api/lantern-voice');
  t.state.settings.lanternVolume=.3;t.voice.update(t.state,[]);expect(t.setVolume).toHaveBeenCalledWith(.3);
  t.output.queued=1;t.voice.update(t.state,[]);expect(t.stop).toHaveBeenCalledOnce();
  t.output.queued=0;t.voice.update(t.state,t.actions);expect(fetch).toHaveBeenCalledOnce();t.voice.destroy();
});
it.each(['mute','disable','room','deadline'])('cancels pending lantern speech on %s and ignores late responses',async reason=>{
  vi.useFakeTimers();let finish!:(value:unknown)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise(r=>finish=r)));
  const t=setup();t.voice.update(t.state,t.actions);
  if(reason==='mute')t.state.settings.masterMute=true;
  if(reason==='disable')t.state.settings.lanternVoiceEnabled=false;
  if(reason==='room')t.state.sessionId='next';
  if(reason==='deadline')await vi.advanceTimersByTimeAsync(8001);else t.voice.update(t.state,[]);
  finish({ok:true,json:async()=>pcm});await vi.advanceTimersByTimeAsync(1);expect(t.playFortunePcm).not.toHaveBeenCalled();t.voice.destroy();
});
it('boost defaults preserve saved volumes, stay bounded, and patch never resets unrelated settings',()=>{
  const s=settingsSchema.parse({voiceVolume:.4,fortuneVolume:.25});expect(s.speechBoost).toBe(1);expect(s.lanternVoiceEnabled).toBe(true);
  const next=settingsSchema.parse({...s,...settingsPatchSchema.parse({speechBoost:3})});expect(next.voiceVolume).toBe(.4);expect(next.fortuneVolume).toBe(.25);
  expect(settingsPatchSchema.safeParse({speechBoost:3.1}).success).toBe(false);
});
it.each([['Cho con thắp một ngọn nến nhé','candle'],['Mong ánh nến bình an','candle'],['thắp đèn yêu thương','candle'],['xin gõ chuông','bell'],['cho mình ngân chuông','bell'],['xin một tiếng chuông bình an','bell'],['Một chú cá koi nhé','fish'],['thả cá vàng cho vui','fish'],['koi vàng đẹp quá','fish']])('accepts expanded %s',(input,effect)=>expect(parseCommunityCommand(input)).toEqual({kind:'effect',effect}));
