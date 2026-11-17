import { createHash } from 'node:crypto';
import { z } from 'zod';
import { cleanText, fortuneRevealSchema, lanternRevealSchema, lanternSpokenWishes, type FortuneReveal, type LanternReveal } from '@vuonsen/shared';
import { synthesizeGtts32, type VoicePcm32 } from './voice32';
export const fortuneVoiceRequestSchema=z.object({sessionId:z.string().min(1).max(80),revealId:z.string().min(1).max(100)}).strict();
export type FortuneSynth=(text:string)=>Promise<VoicePcm32>;
export function fortuneVoiceText(f:FortuneReveal){return `Xin mời ${cleanText(f.displayName)||'bạn'}. Quẻ số ${f.number}. ${cleanText(f.short,240)}`.slice(0,360);}
export function lanternVoiceText(f:LanternReveal){return `${cleanText(f.displayName)||'Bạn'} gửi hoa đăng. ${lanternSpokenWishes[f.topic]}`;}
function valid(p:VoicePcm32){
  if(p?.sampleRate!==24000||p.channels!==1||typeof p.pcm16!=='string'||p.pcm16.length>2_000_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(p.pcm16))return false;
  const bytes=Buffer.from(p.pcm16,'base64').length;return bytes>1000&&bytes%2===0;
}
/** Same approved gTTS Vietnamese / atempo=1.5 pipeline as gift thanks. */
export class FortuneVoiceService {
  private cache=new Map<string,VoicePcm32>();
  private pending?:{key:string;promise:Promise<VoicePcm32|undefined>};
  private retryAt=0;
  private counts={generated:0,cacheHits:0,busy:0,errors:0};
  constructor(private options:{enabled:boolean;synth?:FortuneSynth;now?:()=>number;giftBusy?:()=>boolean;kind?:'fortune'|'lantern'}){}
  get enabled(){return this.options.enabled;}
  status(){return {...this.counts,running:Boolean(this.pending),cached:this.cache.size};}
  async get(raw:FortuneReveal|LanternReveal):Promise<VoicePcm32|undefined>{
    const parsed=(this.options.kind==='lantern'?lanternRevealSchema:fortuneRevealSchema).safeParse(raw),now=(this.options.now||Date.now)();
    if(!this.enabled||!parsed.success||now<parsed.data.startedAt||now>=parsed.data.expiresAt)return;
    const text='topic' in parsed.data?lanternVoiceText(parsed.data):fortuneVoiceText(parsed.data),key=createHash('sha256').update(text).digest('hex');
    const cached=this.cache.get(key);if(cached){this.counts.cacheHits++;return cached;}
    if(this.pending?.key===key)return this.pending.promise;
    if(this.pending||this.options.giftBusy?.()||now<this.retryAt){this.counts.busy++;return;}
    const promise=Promise.resolve().then(()=> (this.options.synth||synthesizeGtts32)(text)).then(p=>{
      if(!valid(p))throw Error('Invalid fortune PCM');
      this.cache.set(key,p);while(this.cache.size>16)this.cache.delete(this.cache.keys().next().value!);
      this.counts.generated++;return p;
    }).catch(()=>{this.counts.errors++;this.retryAt=(this.options.now||Date.now)()+60000;return undefined;}).finally(()=>{this.pending=undefined;});
    this.pending={key,promise};return promise;
  }
}
