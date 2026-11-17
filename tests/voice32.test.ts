import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GiftVoiceService32, type VoicePcm32 } from '../apps/server/src/voice32';
import type { GiftConfirmed } from '@vuonsen/shared';
const pcm:VoicePcm32={sampleRate:24000,channels:1,pcm16:Buffer.alloc(2400,5).toString('base64')};
function gift(key='ev1'):GiftConfirmed {return {
 version:1,eventKey:key,source:'demo',roomId:'r1',userId:'u1',userKey:'u1',displayName:'Hoàng Khang',giftId:'demo:heart',giftName:'Tim ngón tay',units:1,receivedAt:1,mappedEffect:'heart',thanksTemplateKey:'heart',scoreDelta:0,mapped:true,actionLabel:'Thắp đèn yêu thương'
};}
describe('Stage 3.2.2 dynamic Vietnamese voice',()=>{
  it('disabled by default: no synthesis or personal data sent',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'vuonsen-tts-'));let calls=0;
    try {const svc=new GiftVoiceService32({dataDirectory:dir,enabled:false,synth:async()=>{calls++;return pcm;}});
      svc.remember('s1',gift());expect(await svc.get('s1','ev1','s1')).toBeUndefined();expect(calls).toBe(0);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it('synthesizes only a confirmed event in the active room/session, cache works offline',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'vuonsen-tts-'));let calls=0,spoken='';
    try {const svc=new GiftVoiceService32({dataDirectory:dir,enabled:true,synth:async text=>{calls++;spoken=text;return pcm;}});
      expect(await svc.get('s1','ev1','s1')).toBeUndefined();
      svc.remember('s1',gift());
      expect(await svc.get('s1','ev1','other')).toBeUndefined();
      expect(await svc.get('s1','not-verified','s1')).toBeUndefined();
      expect(await svc.get('s1','ev1','s1')).toEqual(pcm);
      expect(spoken).toContain('Hoàng Khang');expect(spoken).toMatch(/đèn|ánh sáng/);
      const offline=new GiftVoiceService32({dataDirectory:dir,enabled:true,synth:async()=>{throw Error('offline');}});
      offline.remember('s1',gift());expect(await offline.get('s1','ev1','s1')).toEqual(pcm);
      expect(calls).toBe(1);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
  it('expired events are rejected and failing online TTS is not hammered',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'vuonsen-tts-'));let now=1000,calls=0;
    try {const svc=new GiftVoiceService32({dataDirectory:dir,enabled:true,now:()=>now,synth:async()=>{calls++;throw Error('offline');}});
      svc.remember('s1',gift());expect(await svc.get('s1','ev1','s1')).toBeUndefined();
      expect(await svc.get('s1','ev1','s1')).toBeUndefined();expect(calls).toBe(1);
      now+=121000;expect(await svc.get('s1','ev1','s1')).toBeUndefined();expect(calls).toBe(1);
    }finally{await rm(dir,{recursive:true,force:true});}
  });
});
