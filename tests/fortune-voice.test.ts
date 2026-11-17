import { describe,it,expect,vi } from 'vitest';
import { FortuneVoiceService,fortuneVoiceText,fortuneVoiceRequestSchema } from '../apps/server/src/fortune-voice-service';
import { FortuneQueue } from '../apps/server/src/fortune-queue';
import { getFortuneCatalog } from '../apps/server/src/fortune-catalog';
import { type VoicePcm32 } from '../apps/server/src/voice32';
const now=Date.parse('2027-02-06T12:00:00+07:00');
const q=new FortuneQueue(getFortuneCatalog());q.onIntent({sessionId:'s',userKey:'one',displayName:'An',eventId:'1',intent:{scope:'by_number',number:123},now});
const fortune=q.next(now,7000,true)!;
const pcm:VoicePcm32={sampleRate:24000,channels:1,pcm16:Buffer.alloc(2400).toString('base64')};
describe('fortune named gift-style voice',()=>{
  it('reads cleaned name, number and short text; request cannot supply arbitrary text',()=>{
    const text=fortuneVoiceText({...fortune,displayName:'<b>Lan</b> https://secret.invalid'});
    expect(text).toBe(`Xin mời Lan. Quẻ số 123. ${fortune.short}`);
    expect(fortuneVoiceRequestSchema.safeParse({sessionId:'s',revealId:'r',text:'injected'}).success).toBe(false);
  });
  it('disabled and expired or future reveals never call TTS',async()=>{
    const synth=vi.fn(async()=>pcm),s=new FortuneVoiceService({enabled:false,synth,now:()=>now});
    expect(await s.get(fortune)).toBeUndefined();
    const on=new FortuneVoiceService({enabled:true,synth,now:()=>now});
    expect(await on.get({...fortune,expiresAt:now})).toBeUndefined();
    expect(await on.get({...fortune,startedAt:now+1})).toBeUndefined();expect(synth).not.toHaveBeenCalled();
  });
  it('caches exact sentences but never reuses a different viewer name or fortune',async()=>{
    const synth=vi.fn(async()=>pcm),s=new FortuneVoiceService({enabled:true,synth,now:()=>now});
    await s.get(fortune);await s.get({...fortune,revealId:'s:2'});expect(synth).toHaveBeenCalledTimes(1);
    await s.get({...fortune,displayName:'Bình'});await s.get({...fortune,number:124});
    expect(synth).toHaveBeenCalledTimes(3);expect(s.status()).toMatchObject({generated:3,cacheHits:1});
  });
  it('deduplicates inflight requests and refuses extra work or gift-priority work',async()=>{
    let finish!:(v:VoicePcm32)=>void;
    const synth=vi.fn(()=>new Promise<VoicePcm32>(r=>finish=r));
    const s=new FortuneVoiceService({enabled:true,synth,now:()=>now});
    const a=s.get(fortune),b=s.get(fortune);await Promise.resolve();
    expect(await s.get({...fortune,displayName:'Other'})).toBeUndefined();finish(pcm);
    expect(await a).toBe(pcm);expect(await b).toBe(pcm);expect(synth).toHaveBeenCalledTimes(1);
    const busy=new FortuneVoiceService({enabled:true,synth,now:()=>now,giftBusy:()=>true});
    expect(await busy.get(fortune)).toBeUndefined();expect(synth).toHaveBeenCalledTimes(1);
  });
  it('invalid output and network failure produce no fake success and back off 60 seconds',async()=>{
    let time=now;
    const synth=vi.fn(async()=>{throw Error('offline');});
    const s=new FortuneVoiceService({enabled:true,synth,now:()=>time});
    expect(await s.get(fortune)).toBeUndefined();await s.get(fortune);expect(synth).toHaveBeenCalledTimes(1);
    time+=60000;await s.get({...fortune,startedAt:time,expiresAt:time+15000});expect(synth).toHaveBeenCalledTimes(2);
    const invalid=new FortuneVoiceService({enabled:true,synth:async()=>({...pcm,pcm16:'invalid'}),now:()=>now});
    expect(await invalid.get(fortune)).toBeUndefined();expect(invalid.status()).toMatchObject({errors:1,generated:0});
  });
  it('bounds cached named recordings to 16',async()=>{
    const s=new FortuneVoiceService({enabled:true,synth:async()=>pcm,now:()=>now});
    for(let i=0;i<20;i++)await s.get({...fortune,displayName:'Khách '+i});
    expect(s.status().cached).toBe(16);
  });
});
