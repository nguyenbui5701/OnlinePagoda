import {it,expect,vi} from 'vitest';
import {cardPresentation,defaultSettings,type SceneAction} from '@vuonsen/shared';
import {SceneEngine} from '../apps/server/src/engine';
import {FortuneQueue} from '../apps/server/src/fortune-queue';
import {LanternQueue} from '../apps/server/src/lantern-queue';
import {getFortuneCatalog} from '../apps/server/src/fortune-catalog';
import {FortuneVoice} from '../apps/overlay/src/fortune-voice';
import type {AudioManager} from '../apps/overlay/src/audio';
it.each([7000,8000,9000,15000])('4s display does not mutate %sms lifetime; reload does not restart it',duration=>{
 const f={startedAt:1000,expiresAt:1000+duration};expect(cardPresentation(f,999).visible).toBe(false);
 expect(cardPresentation(f,4999).visible).toBe(true);expect(cardPresentation(f,5000).visible).toBe(false);
 expect(cardPresentation(JSON.parse(JSON.stringify(f)),6000).visible).toBe(false);expect(f.expiresAt).toBe(1000+duration);
 expect(cardPresentation(f,3000).progress).toBe(.5);expect(cardPresentation(f,5000).alpha).toBe(0);
});
it('does not extend shorter cards',()=>expect(cardPresentation({startedAt:0,expiresAt:2000},2000)).toMatchObject({visible:false,displayEndsAt:2000}));
it('hidden cards retain queue occupancy, next-turn timing and cooldown',()=>{
 const f=new FortuneQueue(getFortuneCatalog()),l=new LanternQueue();
 for(const userKey of ['a','b']){
  f.onIntent({sessionId:'s',userKey,displayName:userKey,eventId:userKey,intent:{scope:'by_number',number:123},now:1000});
  l.onIntent({sessionId:'s',userKey,displayName:userKey,eventId:userKey,topic:'binh_an',now:1000});
 }
 const fortune=f.next(1000,7000,true)!;expect(fortune.expiresAt).toBe(16000);expect(cardPresentation(fortune,5001).visible).toBe(false);expect(f.ready(5001,7000)).toBe(false);
 const lantern=l.next(1000)!;expect(lantern.expiresAt).toBe(9000);expect(cardPresentation(lantern,5001).visible).toBe(false);expect(l.ready(5001)).toBe(false);expect(l.remainingCooldown('a',5001)).toBe(1);
 expect(l.onIntent({sessionId:'s',userKey:'a',displayName:'a',eventId:'again',topic:'binh_an',now:6000})).toBe('queued');expect(l.ready(6000)).toBe(false);expect(l.snapshot(6000)?.revealId).toBe(lantern.revealId);
});
it.each(['fortune','lantern'] as const)('%s speech stays alive after 4s and stops at its original deadline',async kind=>{
 vi.useFakeTimers();const stop=vi.fn();
 const fake={debug:()=>({enabled:true,state:'ready',playing:false,queued:0}),playFortunePcm:vi.fn(()=>({stop,setVolume:vi.fn()}))};
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({sampleRate:24000,channels:1,pcm16:'fixture'})})));
 const voice=new FortuneVoice(fake as unknown as AudioManager,kind);
 try{
  const e=new SceneEngine({...defaultSettings,masterMute:false,fortuneEnabled:true,fortuneVoiceEnabled:true,lanternEnabled:true,lanternVoiceEnabled:true});const state=e.snapshot();
  const q=new FortuneQueue(getFortuneCatalog());q.onIntent({sessionId:state.sessionId,userKey:'a',displayName:'An',eventId:'1',intent:{scope:'by_number',number:123},now:1000});
  const l=new LanternQueue();l.onIntent({sessionId:state.sessionId,userKey:'a',displayName:'An',eventId:'1',topic:'binh_an',now:1000});
  const card=kind==='fortune'?q.next(1000,7000,true)!:l.next(1000)!;
  Object.assign(state,{[kind]:card,serverTime:1000});
  voice.update(state,[{id:1,actorId:'a',at:1000,type:kind==='fortune'?'FORTUNE_REVEAL':'LANTERN_REVEAL',[kind]:card} as SceneAction]);
  await vi.waitFor(()=>expect(voice.status).toBe('speaking'));expect(fake.playFortunePcm).toHaveBeenCalledTimes(1);
  state.serverTime=5500;expect(cardPresentation(card,5500).visible).toBe(false);voice.update(state,[]);expect(voice.status).toBe('speaking');expect(stop).not.toHaveBeenCalled();
  state.serverTime=card.expiresAt;voice.update(state,[]);expect(stop).toHaveBeenCalledTimes(1);
 }finally{voice.destroy();vi.unstubAllGlobals();vi.useRealTimers();}
});
