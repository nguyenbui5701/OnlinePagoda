import {daylightAt,environmentLight,lightWeights,type EnvironmentState,type Settings,type WeatherKind} from '@vuonsen/shared';
export class SceneEnvironment {
  private state:EnvironmentState={light:'day',from:lightWeights('day'),startedAt:0,endsAt:0};
  private settings?:Settings;private nextAuto=0;private serial=0;private giftUntil=0;
  configure(settings:Settings,now:number){
    const old=this.settings;this.settings={...settings};
    if(!old||old.weatherAuto!==settings.weatherAuto||old.sceneSpace!==settings.sceneSpace)this.nextAuto=now+180000;
    if(!this.allowed())delete this.state.weather;
    this.syncLight(now,!old);
  }
  private allowed(){const s=this.settings;return Boolean(s&&s.sceneSpace==='courtyard'&&s.theme==='golden'&&s.effects&&s.effectIntensity>0&&!s.reducedEffects);}
  private syncLight(now:number,initial=false){
    const mode=this.settings?.sceneLight??'day',light=mode==='auto'?daylightAt(now):mode;
    if(initial){this.state={...this.state,light,from:lightWeights(light),startedAt:now,endsAt:now};return;}
    if(this.state.light!==light){const from=environmentLight(this.state,now);Object.assign(this.state,{light,from,startedAt:now,endsAt:now+20000});}
  }
  request(kind:WeatherKind|'stop',now:number,busy:boolean){
    if(kind==='stop'){this.stop(now);this.nextAuto=now+180000;return;}
    if(!this.allowed())throw Error('Chọn sân Quan Âm, bật hiệu ứng và tắt giảm hiệu ứng để dùng thời tiết.');
    if(busy||now<this.giftUntil)throw Error('Đang có nghi thức quà hoặc cây nở; thử thời tiết sau khi kết thúc.');
    if(this.state.weather&&this.state.weather.endsAt>now)throw Error('Đợt thời tiết đang chạy; chờ kết thúc hoặc bấm Dừng.');
    this.state.weather={kind,seed:++this.serial,startedAt:now,endsAt:now+12000};this.nextAuto=now+180000;
  }
  gift(now:number){this.giftUntil=Math.max(this.giftUntil,now+7200);this.stop(now);}
  private stop(now:number){const w=this.state.weather;if(w&&w.stoppingAt===undefined){w.stoppingAt=now;w.endsAt=Math.min(w.endsAt,now+400);}}
  tick(now:number,busy:boolean){
    this.syncLight(now);
    if(!this.allowed())delete this.state.weather;
    busy=busy||now<this.giftUntil;if(busy)this.stop(now);
    if(this.state.weather&&now>=this.state.weather.endsAt)delete this.state.weather;
    if(this.settings?.weatherAuto&&now>=this.nextAuto){
      this.nextAuto=now+180000;
      if(this.allowed()&&!busy&&!this.state.weather)this.request(this.settings.weatherPreset,now,false);
    }
  }
  reset(now:number){delete this.state.weather;this.nextAuto=now+180000;this.giftUntil=0;}
  snapshot():EnvironmentState{return {...this.state,from:{...this.state.from},...(this.state.weather?{weather:{...this.state.weather}}:{})};}
}
