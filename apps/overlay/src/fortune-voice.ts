import { fortuneRevealSchema, lanternRevealSchema, type LanternReveal, type FortuneReveal, type SceneAction, type SceneState } from '@vuonsen/shared';
import type { AudioManager } from './audio';
/** No speech queue or snapshot replay. Gift audio always preempts fortune audio. */
export class FortuneVoice {
  private session='';private last='';private generation=0;
  private controller?:AbortController;
  private playback?:ReturnType<AudioManager['playFortunePcm']>;
  private timer?:ReturnType<typeof setTimeout>;
  status='off';detail='';
  constructor(private audio:AudioManager,private kind:'fortune'|'lantern'='fortune'){}
  private cancel(){this.generation++;this.controller?.abort();this.controller=undefined;this.playback?.stop();this.playback=undefined;clearTimeout(this.timer);}
  update(state:SceneState,actions:SceneAction[]){
    if(state.sessionId!==this.session){this.cancel();this.last='';this.session=state.sessionId;this.status='ready';}
    const output=this.audio.debug();
    const giftBusy=output.playing||output.queued>0||Boolean(state.ritual&&state.ritual.source!=='comment')||actions.some(a=>a.type==='GIFT_CONFIRMED');
    const lantern=this.kind==='lantern',card=lantern?state.lantern:state.fortune,volume=lantern?state.settings.lanternVolume:state.settings.fortuneVolume;
    const enabled=(lantern?state.settings.lanternEnabled&&state.settings.lanternVoiceEnabled:state.settings.fortuneEnabled&&state.settings.fortuneVoiceEnabled)&&volume>0&&!state.settings.masterMute;
    if(!enabled){this.cancel();this.status='off';return;}
    if(!output.enabled||output.state!=='ready'){this.cancel();this.status='blocked';return;}
    if(giftBusy){this.cancel();this.status='gift-priority';return;}
    if(['off','blocked','gift-priority'].includes(this.status))this.status='ready';
    if((this.status==='loading'||this.status==='speaking')&&(!card||card.revealId!==this.last||state.serverTime>=card.expiresAt)){
      this.cancel();this.status='expired';
    }
    this.playback?.setVolume(volume);
    const action=actions.find(a=>a.type===(lantern?'LANTERN_REVEAL':'FORTUNE_REVEAL'));
    const result=(lantern?lanternRevealSchema:fortuneRevealSchema).safeParse(lantern?action?.lantern:action?.fortune);
    if(!result.success||result.data.sessionId!==state.sessionId)return;
    const f=result.data;if(f.revealId===this.last)return;this.last=f.revealId;
    if(state.serverTime>f.startedAt+2000)return;
    this.cancel();this.status='loading';this.detail='';
    this.timer=setTimeout(()=>{this.cancel();this.status='expired';},Math.max(0,f.expiresAt-state.serverTime));
    void this.load(f,volume,this.generation);
  }
  private async load(f:FortuneReveal|LanternReveal,volume:number,token:number){
    const controller=new AbortController();this.controller=controller;
    const timeout=setTimeout(()=>controller.abort(),9500);
    try{
      const response=await fetch(`/api/${this.kind}-voice`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:f.sessionId,revealId:f.revealId}),signal:controller.signal});
      const data=await response.json();if(token!==this.generation)return;
      if(!response.ok){this.status='unavailable';this.detail=data.error==='tts-disabled'?'Chưa bật TTS_DYNAMIC_ENABLED=1 trên server':'Không tạo được giọng hoặc lượt đọc đã nhường quà. Kiểm tra Python, FFmpeg và mạng.';return;}
      this.playback=this.audio.playFortunePcm(data,volume,()=>{if(token===this.generation){this.playback=undefined;clearTimeout(this.timer);this.status='played';}});
      this.status=this.playback?'speaking':'gift-priority';
    }catch{if(token===this.generation){this.status='unavailable';this.detail='Không tải được giọng đọc. Nội dung vẫn hiển thị chữ.';}}
    finally{clearTimeout(timeout);if(token===this.generation)this.controller=undefined;}
  }
  destroy(){this.cancel();this.status='blocked';}
}
