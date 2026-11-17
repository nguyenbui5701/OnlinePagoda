import { afterEach,describe,it,expect,vi } from 'vitest';
import { FortuneVoice } from '../apps/overlay/src/fortune-voice';
import type { AudioManager } from '../apps/overlay/src/audio';
import { SceneEngine } from '../apps/server/src/engine';
import { defaultSettings } from '@vuonsen/shared';
function setup(){
  const engine=new SceneEngine({...defaultSettings,fortuneVoiceEnabled:true},()=>100000);
  engine.receive({type:'chat',userId:'one',nickname:'An',eventId:'one',text:'xin quẻ'});engine.tick();
  const state=engine.snapshot(),actions=engine.actions;
  const stop=vi.fn(),setVolume=vi.fn(),playFortunePcm=vi.fn(()=>({stop,setVolume}));
  const output={enabled:true,state:'ready',playing:false,queued:0};
  const audio={debug:()=>output,playFortunePcm} as unknown as AudioManager;
  return {state,actions,voice:new FortuneVoice(audio),stop,setVolume,playFortunePcm,output};
}
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('fortune playback lifecycle',()=>{
  it('free incense does not interrupt fortune speech; a gift still does',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({pcm16:'fixture'})})));
    const t=setup();t.state.ritual={actorId:'one',seatId:'seat-0',startedAt:100000,durationMs:10000,source:'comment'};
    t.voice.update(t.state,t.actions);await vi.waitFor(()=>expect(t.voice.status).toBe('speaking'));
    t.voice.update(t.state,[]);expect(t.stop).not.toHaveBeenCalled();
    t.state.ritual.source='gift';t.voice.update(t.state,[]);expect(t.stop).toHaveBeenCalledOnce();t.voice.destroy();
  });
  it('never synthesizes snapshot/reconnect cards or disabled/blocked output',()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const t=setup();
    t.voice.update(t.state,[]);expect(fetch).not.toHaveBeenCalled();
    t.output.enabled=false;t.voice.update(t.state,t.actions);expect(t.voice.status).toBe('blocked');
    t.output.enabled=true;t.state.settings.fortuneVoiceEnabled=false;t.voice.update(t.state,t.actions);
    expect(t.voice.status).toBe('off');expect(fetch).not.toHaveBeenCalled();t.voice.destroy();
  });
  it('plays once through shared mixer, adjusts volume and stops on gift priority without replay',async()=>{
    const fetch=vi.fn(async(_url:unknown,_options:RequestInit)=>({ok:true,json:async()=>({pcm16:'fixture'})}));vi.stubGlobal('fetch',fetch);
    const t=setup();t.voice.update(t.state,t.actions);await vi.waitFor(()=>expect(t.voice.status).toBe('speaking'));
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({sessionId:t.state.sessionId,revealId:t.state.fortune!.revealId});
    t.state.settings.fortuneVolume=.2;t.voice.update(t.state,[]);expect(t.setVolume).toHaveBeenCalledWith(.2);
    t.output.queued=1;t.voice.update(t.state,[]);expect(t.stop).toHaveBeenCalledOnce();expect(t.voice.status).toBe('gift-priority');
    t.output.queued=0;t.voice.update(t.state,t.actions);expect(fetch).toHaveBeenCalledOnce();t.voice.destroy();
  });
  it('aborts pending audio on mute and ignores a late response',async()=>{
    let done!:(v:unknown)=>void;const fetch=vi.fn((_url:unknown,_options:RequestInit)=>new Promise(r=>done=r));vi.stubGlobal('fetch',fetch);
    const t=setup();t.voice.update(t.state,t.actions);t.state.settings.masterMute=true;t.voice.update(t.state,[]);
    expect(fetch.mock.calls[0][1].signal?.aborted).toBe(true);
    done({ok:true,json:async()=>({})});await new Promise(r=>setTimeout(r,0));expect(t.playFortunePcm).not.toHaveBeenCalled();t.voice.destroy();
  });
  it('server disabled is visible and never falls back to an unapproved browser voice',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:'tts-disabled'})})));
    const t=setup();t.voice.update(t.state,t.actions);await vi.waitFor(()=>expect(t.voice.status).toBe('unavailable'));
    expect(t.voice.detail).toContain('TTS_DYNAMIC_ENABLED=1');expect(t.playFortunePcm).not.toHaveBeenCalled();t.voice.destroy();
  });
  it('stops playback at the card deadline even without socket updates',async()=>{
    vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({})})));
    const t=setup();t.voice.update(t.state,t.actions);await vi.advanceTimersByTimeAsync(1);
    expect(t.voice.status).toBe('speaking');await vi.advanceTimersByTimeAsync(15000);
    expect(t.stop).toHaveBeenCalledOnce();expect(t.voice.status).toBe('expired');t.voice.destroy();
  });
});
