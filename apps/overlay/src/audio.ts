import { defaultSettings, giftDefinitions, type GiftConfirmed, type GiftGroup, type SceneAction, type SceneState, type Settings } from '@vuonsen/shared';
import type { Socket } from 'socket.io-client';
import { RitualVoiceSync } from './ritual-voice-sync';
import { playGiftSfx } from './sfx32';
type Item={gift:GiftConfirmed;kind:'voice'|'sfx'|'full'};
export class AudioManager {
  private ritualVoice = new RitualVoiceSync();
  private ctx?:AudioContext; private master?:GainNode; private voiceGain?:GainNode; private sfxGain?:GainNode; private ambienceGain?:GainNode;
  private speechBoostGain?:GainNode;
  private stream?:MediaStreamAudioDestinationNode; private analyser?:AnalyserNode; private ambience?:OscillatorNode;
  private settings:Settings=defaultSettings; private session=''; private mode='demo'; private enabled=false;
  private queue:Item[]=[]; private seen=new Set<string>(); private running=false; private generation=0;
  private buffers=new Map<string,AudioBuffer>(); private sources=new Set<AudioScheduledSourceNode>(); private cancelVoice?:()=>void;
  state:'ready'|'blocked'|'muted'|'unavailable'='blocked'; detail='Chưa bật âm thanh bằng thao tác người dùng';
  logs:{at:number;status:string;key:string}[]=[]; played=0; skipped=0; peak=0; voiceKind='fallback';
  lastError='';
  constructor(private socket:Socket){socket.on('disconnect',()=>{this.disable();this.detail='Mất kết nối: bật lại âm thanh sau khi nối lại';});}
  private log(status:string,key=''){this.logs.unshift({at:Date.now(),status,key:key.slice(0,12)});this.logs.length=Math.min(60,this.logs.length);}
  private init(){
    if(this.ctx)return;
    this.ctx=new AudioContext(); const c=this.ctx;
    this.master=c.createGain();this.voiceGain=c.createGain();this.sfxGain=c.createGain();this.ambienceGain=c.createGain();
    this.speechBoostGain=c.createGain();
    for(const g of [this.master,this.voiceGain,this.sfxGain,this.ambienceGain])g.gain.value=0;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=8;limiter.ratio.value=12;
    this.voiceGain.connect(this.speechBoostGain);this.speechBoostGain.connect(this.master);this.sfxGain.connect(this.master);this.ambienceGain.connect(this.master);
    this.master.connect(limiter);this.analyser=c.createAnalyser();limiter.connect(this.analyser);this.analyser.connect(c.destination);
    this.stream=c.createMediaStreamDestination();limiter.connect(this.stream);
    this.ambience=c.createOscillator();this.ambience.frequency.value=130.81;this.ambience.type='sine';this.ambience.connect(this.ambienceGain);this.ambience.start();
    this.volumes();
  }
  private gain(node:GainNode|undefined,value:number){if(node&&this.ctx)node.gain.setTargetAtTime(value,this.ctx.currentTime,.06);}
  private volumes(){const s=this.settings;this.gain(this.master,this.enabled&&!s.masterMute ? .8:0);this.gain(this.voiceGain,s.voiceVolume);this.gain(this.speechBoostGain,Math.max(1,Math.min(3,s.speechBoost??1)));this.gain(this.sfxGain,s.sfxVolume);this.gain(this.ambienceGain,s.ambienceEnabled?s.ambienceVolume*(this.running ? .02:.07):0);}
  async enable(){
    try{
      this.init();
      await Promise.race([this.ctx!.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error('blocked')),1500))]);
      if(this.ctx!.state!=='running')throw Error('blocked');
      const reply=await new Promise<any>((done,reject)=>this.socket.timeout(3000).emit('audio-claim',(error:Error,value:any)=>error?reject(error):done(value)));
      if(!reply.ok){this.detail=reply.error;this.state='blocked';return false;}
      // Probe the real fallback file, so a missing asset is never reported ready.
      await this.buffer('generic');this.enabled=true;this.state=this.settings.masterMute?'muted':'ready';this.detail='Audio ready · chỉ cửa sổ này phát';this.volumes();return true;
    }catch(error){this.lastError=String(error).slice(0,180);this.enabled=false;this.state=String(error).includes('blocked')?'blocked':'unavailable';this.detail=this.state==='blocked'?'Trình duyệt chặn phát; bấm Bật âm thanh trực tiếp ở cửa sổ này':'Không tải được giọng/thiết bị âm thanh';this.log(this.state);this.volumes();this.socket.emit('audio-release');return false;}
  }
  disable(){this.enabled=false;this.stop();this.socket.emit('audio-release');this.state='blocked';this.detail='Đã tắt đầu phát này';this.volumes();}
  private stop(){this.ritualVoice.reset();this.generation++;this.queue=[];for(const s of this.sources){try{s.stop();}catch{}}this.sources.clear();this.cancelVoice?.();this.cancelVoice=undefined;this.running=false;}
  update(state:SceneState,actions:SceneAction[]){
    const oldMute=this.settings.masterMute;
    this.settings=state.settings;this.mode=state.mode;
    if(this.session!==state.sessionId){this.stop();this.seen.clear();this.session=state.sessionId;}
    if(this.settings.masterMute&&!oldMute)this.stop();
    if(this.enabled)this.state=this.settings.masterMute?'muted':this.ctx?.state==='running'?'ready':'blocked';this.volumes();
    for(const a of actions)if(a.type==='GIFT_CONFIRMED'&&a.confirmedGift){
      const gift=a.confirmedGift;
      if(this.ritualVoice.hold(gift,state,this.enabled)){
        // The notification/SFX stays immediate; only the spoken thank-you waits.
        this.enqueue({gift,kind:'sfx'});
      }else this.enqueue({gift,kind:'full'});
    }
    this.syncRitual(state);
  }
  enqueue(item:Item){
    if(this.seen.has(item.gift.eventKey))return;this.seen.add(item.gift.eventKey);if(this.seen.size>2048)this.seen.delete(this.seen.values().next().value!);
    if(!this.enabled||this.settings.masterMute||!this.settings.showGiftThanks){this.skipped++;this.log(this.settings.masterMute?'skipped':'blocked',item.gift.eventKey);return;}
    if(this.queue.length>=20){this.queue.shift();this.skipped++;this.log('skipped');}
    this.queue.push(item);this.log('queued',item.gift.eventKey);void this.pump();
  }
  /** Start queued donor thanks on the altar cue, never at the gift's arrival. */
  private syncRitual(state:SceneState){
    const due=this.ritualVoice.due(state,state.serverTime);
    if(!this.enabled||this.settings.masterMute||!this.settings.showGiftThanks||!due.length)return;
    // Speak in the event's original order; prioritize names over subsequent gift SFX.
    const voices=due.map(gift=>({gift,kind:'voice' as const}));
    const room=Math.max(0,20-this.queue.length);
    this.queue.unshift(...voices.slice(0,room));
    if(voices.length>room){this.skipped+=voices.length-room;this.log('ritual-overflow');}
    void this.pump();
  }
  async test(kind:'voice'|'sfx'|'full',group:GiftGroup='rose'){
    if(this.mode!=='demo'){this.detail='Test âm thanh chỉ dùng trong DEMO';return false;}
    if(!this.enabled && !await this.enable())return false;
    const d=giftDefinitions.find(d=>d.group===group)!;
    this.enqueue({kind,gift:{version:1,eventKey:crypto.randomUUID(),source:'demo',roomId:this.session,userId:'audio-test',userKey:'audio-test',displayName:'bạn',giftId:`demo:${group}`,giftName:d.label,units:1,receivedAt:Date.now(),mappedEffect:d.effect,thanksTemplateKey:d.group,scoreDelta:0,mapped:true,actionLabel:d.action}});return true;
  }
  private decodeVoice(data:unknown):AudioBuffer {
    const d=data as {channels?:number;sampleRate?:number;pcm16?:string}|null;
    if(!d||d.channels!==1||d.sampleRate!==24000||typeof d.pcm16!=='string'||d.pcm16.length>2000000)throw Error('Invalid voice asset');
    const raw=Uint8Array.from(atob(d.pcm16),(ch:string)=>ch.charCodeAt(0));
    if(raw.length%2!==0||raw.length<1000)throw Error('Invalid PCM');
    const pcm=new DataView(raw.buffer),b=this.ctx!.createBuffer(1,raw.length/2,d.sampleRate),samples=b.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=pcm.getInt16(i*2,true)/32768;
    return b;
  }
  private async buffer(key:string){
    if(this.buffers.has(key))return this.buffers.get(key)!;
    const response=await fetch(`/overlay/audio/vi-v2/${key}.voice.json`,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('voice unavailable');
    const b=this.decodeVoice(await response.json());this.buffers.set(key,b);return b;
  }
  private async dynamicVoice(gift:GiftConfirmed):Promise<AudioBuffer|undefined> {
    // Only server-confirmed event keys can be synthesized; do not send arbitrary text from the browser.
    try {
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9500);
      try {
        const response=await fetch('/api/voice32',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({sessionId:this.session,eventKey:gift.eventKey}),signal:controller.signal
        });
        if(!response.ok)return;
        const data=await response.json();return this.decodeVoice(data);
      }finally{clearTimeout(timer);}
    }catch{return;}
  }
  voices(){return [] as {name:string;uri:string}[];}
  private async voice(gift:GiftConfirmed,token:number){
    if(!this.settings.voiceVolume)return;
    let b:AudioBuffer|undefined;
    if(this.settings.voiceMode==='auto')b=await this.dynamicVoice(gift);
    if(token!==this.generation)return;
    this.voiceKind=b?'dynamic-vi-gtts':'fallback-vi-no-name';
    if(!b)b=await this.buffer(gift.thanksTemplateKey);
    if(token!==this.generation)return;
    await new Promise<void>(done=>{const source=this.ctx!.createBufferSource();source.buffer=b!;source.connect(this.voiceGain!);this.sources.add(source);source.onended=()=>{this.sources.delete(source);done();};source.start();});
  }
  private sfx(key:string){
    // Keep the voice path and its 1.5x pitch-preserving speed untouched.
    if (!this.ctx || !this.sfxGain || this.settings.sfxVolume <= 0) return;
    playGiftSfx(this.ctx, this.sfxGain, key, source => {
      this.sources.add(source);
      const previous = source.onended;
      source.onended = (event) => {
        this.sources.delete(source);
        previous?.call(source, event);
      };
    });
  }
  private async pump(){
    if(this.running)return;const token=this.generation;this.running=true;this.volumes();
    try{while(this.queue.length&&this.enabled&&!this.settings.masterMute&&token===this.generation){const item=this.queue.shift()!;
      if(this.ctx?.state!=='running'){this.state='blocked';this.log('blocked',item.gift.eventKey);this.queue=[];break;}
      if(item.kind!=='voice')this.sfx(item.gift.thanksTemplateKey);
      await Promise.all([
        item.kind!=='sfx'?this.voice(item.gift,token):Promise.resolve(),
        item.kind!=='voice'?new Promise(r=>setTimeout(r,2400)):Promise.resolve()
      ]);
      if(token!==this.generation)break;this.played++;this.log('played',item.gift.eventKey);
    }}catch{this.state='unavailable';this.detail='Không phát được file giọng; kiểm tra audio/vi-v2';this.log('unavailable');this.queue=[];}
    finally{if(token===this.generation){this.running=false;this.volumes();}}
  }
  getStream(){return this.stream?.stream;}
  /** Optional community bell. Never queued or replayed, and never competes with a voice. */
  communityBell(state:SceneState,actions:SceneAction[]){
    if(!actions.some(a=>a.type==='TREE_BLOOM')||!state.tree?.enabled)return;
    if(!this.enabled||this.state!=='ready'||this.settings.masterMute||this.ctx?.state!=='running'||this.running||this.queue.length||this.sources.size||this.ritualVoice.pendingCount||state.ritual||state.fortune||state.lantern)return;
    this.sfx('donut');
  }
  /** Fixed approved voice only; can check local output in LIVE without inventing a gift/event. */
  async checkOutput(){
    if(!this.enabled&&!await this.enable())return false;
    if(this.settings.masterMute){this.detail='Đang tắt mọi tiếng. Bỏ Master mute trước.';return false;}
    try{
      const b=await this.buffer('generic');
      if(!this.enabled||this.settings.masterMute||this.running||this.queue.length||this.sources.size){this.detail='Đang có tiếng phát. Chờ lượt hiện tại xong rồi thử.';return false;}
      const source=this.ctx!.createBufferSource(),gain=this.ctx!.createGain();source.buffer=b;gain.gain.value=this.settings.voiceVolume;source.connect(gain);gain.connect(this.speechBoostGain!);this.sources.add(source);
      source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();};source.start();
      this.detail='Đang phát câu cảm ơn có sẵn ở cửa sổ này. Kiểm tra loa máy tính trước.';return true;
    }catch{this.detail='Không đọc được file giọng có sẵn. Kiểm tra thư mục audio/vi-v2.';return false;}
  }
  playFortunePcm(data:unknown,volume:number,onEnded:()=>void){
    if(!this.enabled||this.state!=='ready'||this.settings.masterMute||this.running||this.queue.length||!this.ctx||!this.master)return;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
    source.buffer=this.decodeVoice(data);gain.gain.value=Math.max(0,Math.min(1,volume));
    source.connect(gain);gain.connect(this.speechBoostGain!);this.sources.add(source);
    source.onended=()=>{this.sources.delete(source);source.disconnect();gain.disconnect();onEnded();};source.start();
    return {stop:()=>{try{source.stop();}catch{}},setVolume:(v:number)=>gain.gain.setTargetAtTime(Math.max(0,Math.min(1,v)),this.ctx!.currentTime,.06)};
  }
  debug(){
    if(this.analyser){const data=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(data);this.peak=Math.max(this.peak,...data.map(Math.abs));}
    return {state:this.state,detail:this.detail,lastError:this.lastError,enabled:this.enabled,queued:this.queue.length,playing:this.running,played:this.played,skipped:this.skipped,voiceKind:this.voiceKind,peak:this.peak,speechBoost:this.settings.speechBoost??1,logs:this.logs,voices:this.voices()};
  }
}
export function mountAudioControls(audio:AudioManager){
  const panel=document.createElement('section');panel.id='audio-controls';panel.hidden=!new URLSearchParams(location.search).has('sound');
  const label=document.createElement('p'),enable=document.createElement('button'),stop=document.createElement('button'),hide=document.createElement('button'),probe=document.createElement('button');
  enable.textContent='Bật âm thanh';stop.textContent='Tắt đầu phát';hide.textContent='Ẩn bảng · phím A mở lại';
  enable.onclick=()=>void audio.enable().then(ok=>{if(ok)panel.hidden=true;});stop.onclick=()=>audio.disable();hide.onclick=()=>panel.hidden=true;
  probe.textContent='Nghe thử tại cửa sổ này';probe.onclick=()=>void audio.checkOutput();
  const help=document.createElement('p');help.textContent='Bật tiếng tại cửa sổ được capture. Dashboard có khuếch đại giọng cảm ơn, quẻ và hoa đăng tới 300%. Nghe trên máy tính rồi kiểm tra nguồn tiếng trong LIVE Studio.';
  panel.append(label,help,enable,probe,stop,hide);document.body.append(panel);
  const timer=setInterval(()=>{label.textContent=`${audio.state} · ${audio.detail}`;},400);
  window.addEventListener('keydown',e=>{if(e.code==='KeyA')panel.hidden=!panel.hidden;});
  Object.assign(window,{__audioControl:audio});window.addEventListener('beforeunload',()=>{clearInterval(timer);audio.disable();});
}
