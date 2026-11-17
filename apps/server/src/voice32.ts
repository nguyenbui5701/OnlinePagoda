/** Stage 3.2.2 — optional Vietnamese gTTS. Only confirmed gift IDs from the engine are accepted. */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { dynamicThanksText, type GiftConfirmed } from '@vuonsen/shared';

export interface VoicePcm32 { sampleRate: 24000; channels: 1; pcm16: string }
type Synth = (text: string) => Promise<VoicePcm32>;
const MAX_JSON = 2_000_000;
function valid(data: unknown): data is VoicePcm32 {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<VoicePcm32>;
  return d.sampleRate === 24000 && d.channels === 1 && typeof d.pcm16 === 'string' &&
    d.pcm16.length > 2000 && d.pcm16.length <= MAX_JSON && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.pcm16);
}

/** Python process gets the utterance via stdin; names never go on the command line or server logs. */
export function synthesizeGtts32(text: string): Promise<VoicePcm32> {
  return new Promise((done, fail) => {
    const python = process.env.TTS_PYTHON || 'python';
    const child = spawn(python, ['scripts/synthesize-stage32.py'], {cwd:process.cwd(), windowsHide:true, stdio:['pipe','pipe','pipe']});
    const parts: Buffer[] = []; let length = 0; let settled = false;
    const finish = (error?: Error, data?: VoicePcm32) => {if(settled)return; settled=true;clearTimeout(timer);if(error)fail(error);else done(data!);};
    const timer = setTimeout(()=>{child.kill();finish(Error('TTS timeout'));},8000);
    child.on('error',()=>finish(Error('TTS Python unavailable')));
    child.stdout.on('data',(chunk:Buffer)=>{length+=chunk.length;if(length>MAX_JSON+300){child.kill();finish(Error('TTS output too large'));return;}parts.push(chunk);});
    // Accept only our fixed diagnostic code; never forward third-party stderr or names.
    let diagnostic='';child.stderr.on('data',(chunk:Buffer)=>{if(diagnostic.length<128)diagnostic+=chunk.toString('utf8').slice(0,128);});
    child.on('close',code=>{if(settled)return;if(code!==0)return finish(Error(diagnostic==='TTS_FFMPEG_NOT_FOUND'?'TTS_FFMPEG_NOT_FOUND':'TTS generation failed'));
      try{const data:unknown=JSON.parse(Buffer.concat(parts).toString('utf8'));if(!valid(data))throw Error('TTS invalid data');finish(undefined,data);}catch{finish(Error('TTS invalid data'));}
    });
    child.stdin.on('error',()=>{});
    child.stdin.end(JSON.stringify({text}));
  });
}

interface Confirmed { gift: GiftConfirmed; sessionId: string; at: number }
export class GiftVoiceService32 {
  private recent = new Map<string,Confirmed>(); private running = 0; private retryAt = 0;
  private readonly dir: string;
  // Bounded in-memory last good voice, scoped by room, user, visible name and gift group.
  // This only reuses audio originally synthesized for THAT person and THAT gift group.
  private readonly lastNamedVoice = new Map<string, VoicePcm32>();
  private readonly voiceMetrics = {cacheHits:0, generated:0, namedReuse:0, busy:0, cooldown:0, synthErrors:0, cacheWriteErrors:0, genericFallbacks:0};
  // stage32-voice-continuity-v1
  constructor(private options: {dataDirectory:string; enabled:boolean; synth?:Synth; now?:()=>number}) {
    this.dir = resolve(options.dataDirectory, 'tts-cache');
  }
  get enabled(){return this.options.enabled;}
  // Counters have no recipient names, text, IDs or audio data.
  status(){return {...this.voiceMetrics, activeSyntheses:this.running, namedVoicesInMemory:this.lastNamedVoice.size};}
  private nameKey(gift:GiftConfirmed):string|undefined {
    const name=(gift.displayName||'').normalize('NFC').trim();
    const user=gift.userKey||gift.userId;
    if(!name || name.toLocaleLowerCase('vi')==='bạn' || !user)return;
    return createHash('sha256').update(gift.roomId).update('\0').update(user)
      .update('\0').update(name).update('\0').update(gift.thanksTemplateKey).digest('hex');
  }
  private rememberNamed(gift:GiftConfirmed, pcm:VoicePcm32):void {
    const key=this.nameKey(gift);if(!key)return;
    this.lastNamedVoice.delete(key);this.lastNamedVoice.set(key,pcm);
    // Keep memory usage bounded; never save plaintext names or a new index on disk.
    while(this.lastNamedVoice.size>12)this.lastNamedVoice.delete(this.lastNamedVoice.keys().next().value!);
  }
  private reuseNamed(gift:GiftConfirmed):VoicePcm32|undefined {
    const key=this.nameKey(gift), pcm=key&&this.lastNamedVoice.get(key);
    if(!pcm){this.voiceMetrics.genericFallbacks++;return;}
    this.lastNamedVoice.delete(key!);this.lastNamedVoice.set(key!,pcm);
    this.voiceMetrics.namedReuse++;return pcm;
  }
  private now(){return (this.options.now || Date.now)();}
  remember(sessionId: string, gift: GiftConfirmed) {
    // Keep a bounded, short-lived, server-authenticated registry; no raw chat is stored.
    this.recent.set(`${sessionId}\0${gift.eventKey}`, {gift,sessionId,at:this.now()});
    for(const [k,v] of this.recent)if(this.now()-v.at>120_000)this.recent.delete(k);
    while(this.recent.size>256)this.recent.delete(this.recent.keys().next().value!);
  }
  async get(sessionId: string, eventKey: string, currentSessionId: string): Promise<VoicePcm32|undefined> {
    if(!this.enabled || sessionId!==currentSessionId || sessionId.length>180 || eventKey.length>250)return;
    const record=this.recent.get(`${sessionId}\0${eventKey}`);
    if(!record || this.now()-record.at>120_000)return;
    const text=dynamicThanksText(record.gift);
    const filename=createHash('sha256').update('stage32-gtts-vi-atempo1.5-v1\0').update(text).digest('hex')+'.json';
    const path=resolve(this.dir,filename);
    try{
      const saved=await fs.readFile(path,'utf8');if(saved.length<=MAX_JSON+300){const data:unknown=JSON.parse(saved);
        if(valid(data)){this.voiceMetrics.cacheHits++;this.rememberNamed(record.gift,data);return data;}}
    }catch{} // Offline first: any previously synthesized sentence retains the identical voice.
    // While online TTS is busy/unavailable, prefer the LAST approved spoken phrase for
    // the SAME verified person+room+gift group over a generic "cam on ban".
    if(this.running>=1){this.voiceMetrics.busy++;return this.reuseNamed(record.gift);}
    if(this.now()<this.retryAt){this.voiceMetrics.cooldown++;return this.reuseNamed(record.gift);}
    this.running++;
    try {
      const result=await (this.options.synth||synthesizeGtts32)(text);
      if(!valid(result)){this.voiceMetrics.synthErrors++;return this.reuseNamed(record.gift);}
      this.rememberNamed(record.gift,result);
      this.voiceMetrics.generated++;
      try {
        await fs.mkdir(this.dir,{recursive:true});
        const temp=path+'.tmp';
        await fs.writeFile(temp,JSON.stringify(result),{mode:0o600});
        await fs.rename(temp,path);
        const files=await fs.readdir(this.dir,{withFileTypes:true});
        const entries=await Promise.all(files.filter(f=>f.isFile()&&/^[a-f0-9]{64}\.json$/.test(f.name)).map(async f=>({name:f.name,mtime:(await fs.stat(resolve(this.dir,f.name))).mtimeMs})));
        entries.sort((a,b)=>b.mtime-a.mtime);
        await Promise.all(entries.slice(64).map(f=>fs.unlink(resolve(this.dir,f.name)).catch(()=>{})));
      }catch{this.voiceMetrics.cacheWriteErrors++;} // A cache write failure must not discard valid audio.
      return result;
    }catch{this.voiceMetrics.synthErrors++;this.retryAt=this.now()+60_000;return this.reuseNamed(record.gift);}finally{this.running--;}
  }
}
