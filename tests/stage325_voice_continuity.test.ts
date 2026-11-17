import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GiftVoiceService32, type VoicePcm32 } from '../apps/server/src/voice32';
import type { GiftConfirmed } from '@vuonsen/shared';

const voice = (byte: number): VoicePcm32 => ({sampleRate:24000,channels:1,pcm16:Buffer.alloc(2400,byte).toString('base64')});
function gift(eventKey: string, overrides: Partial<GiftConfirmed> = {}): GiftConfirmed {
  return {
    version:1,eventKey,source:'demo',roomId:'room',userId:'u1',userKey:'user:u1',displayName:'Hoàng Khang',
    giftId:'demo:heart',giftName:'Tim ngón tay',units:1,receivedAt:Date.now(),mappedEffect:'heart',
    thanksTemplateKey:'heart',scoreDelta:1,mapped:true,actionLabel:'Thắp đèn yêu thương', ...overrides
  };
}

describe('Stage 3.2.5a - preserve previously spoken named thanks on temporary TTS failures', () => {
  it('reuses the most recent successfully spoken phrase for the SAME recipient and gift group', async () => {
    const dir=await mkdtemp(join(tmpdir(),'stage325-'));
    let attempts=0;const first=voice(3);
    try {
      const svc=new GiftVoiceService32({enabled:true,dataDirectory:dir,synth:async()=>{attempts++;if(attempts>1)throw Error('offline');return first;}});
      svc.remember('s',gift('first'));
      expect(await svc.get('s','first','s')).toEqual(first);
      svc.remember('s',gift('second'));
      expect(await svc.get('s','second','s')).toEqual(first);
      expect(svc.status().namedReuse).toBe(1);
      expect(svc.status().synthErrors).toBe(1);
      expect(svc.status().genericFallbacks).toBe(0);
    } finally {await rm(dir,{recursive:true,force:true});}
  });
  it('never borrows another person / gift type / room voice', async () => {
    const dir=await mkdtemp(join(tmpdir(),'stage325-'));
    let attempts=0;
    try {
      const svc=new GiftVoiceService32({enabled:true,dataDirectory:dir,synth:async()=>{attempts++;if(attempts>1)throw Error('offline');return voice(4);}});
      svc.remember('s',gift('first'));expect(await svc.get('s','first','s')).toBeDefined();
      for (const [eventKey,changes] of [
        ['other-user',{userId:'u2',userKey:'user:u2'}],
        ['other-name',{displayName:'Lan Anh'}],
        ['other-group',{thanksTemplateKey:'rose' as const}],
        ['other-room',{roomId:'another-room'}]
      ] as const) {
        svc.remember('s',gift(eventKey,changes));expect(await svc.get('s',eventKey,'s')).toBeUndefined();
      }
      expect(svc.status().namedReuse).toBe(0);
      expect(svc.status().genericFallbacks).toBe(4);
    } finally {await rm(dir,{recursive:true,force:true});}
  });
  it('uses named history when a new synthesis is still in progress', async () => {
    const dir=await mkdtemp(join(tmpdir(),'stage325-'));
    let resolvePending: ((value:VoicePcm32)=>void)|undefined;
    let attempts=0;
    try {
      const svc=new GiftVoiceService32({enabled:true,dataDirectory:dir,synth:async()=>{
        attempts++;if(attempts===1)return voice(5);
        return await new Promise<VoicePcm32>(resolve=>{resolvePending=resolve;});
      }});
      svc.remember('s',gift('first'));await svc.get('s','first','s');
      svc.remember('s',gift('second'));
      const pending=svc.get('s','second','s');
      for(let i=0;i<8&&!resolvePending;i++)await new Promise(done=>setTimeout(done,0));
      expect(resolvePending).toBeDefined();
      svc.remember('s',gift('third'));
      expect(await svc.get('s','third','s')).toEqual(voice(5));
      expect(svc.status().busy).toBeGreaterThan(0);
      resolvePending!(voice(6));await pending;
    } finally {await rm(dir,{recursive:true,force:true});}
  });
  it('reports only aggregate counters, never usernames or raw gift text', async () => {
    const dir=await mkdtemp(join(tmpdir(),'stage325-'));
    try {
      const svc=new GiftVoiceService32({enabled:true,dataDirectory:dir,synth:async()=>voice(7)});
      svc.remember('s',gift('one'));await svc.get('s','one','s');
      expect(JSON.stringify(svc.status())).not.toContain('Hoàng');
      expect(JSON.stringify(svc.status())).not.toContain('user:u1');
    } finally {await rm(dir,{recursive:true,force:true});}
  });
});
