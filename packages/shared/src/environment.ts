export type Daylight = 'day'|'sunset'|'night';
export type LightWeights = Record<Daylight,number>;
export type WeatherKind = 'leaves'|'petals';
export interface WeatherState {kind:WeatherKind;seed:number;startedAt:number;endsAt:number;stoppingAt?:number}
export interface EnvironmentState {light:Daylight;from:LightWeights;startedAt:number;endsAt:number;weather?:WeatherState}
export function daylightAt(now:number):Daylight {
  const hour=new Date(now+7*3600000).getUTCHours();
  return hour>=6&&hour<16?'day':hour>=16&&hour<18?'sunset':'night';
}
export function lightWeights(light:Daylight):LightWeights{return {day:light==='day'?1:0,sunset:light==='sunset'?1:0,night:light==='night'?1:0};}
export function environmentLight(state:EnvironmentState,now:number,reduced=false):LightWeights {
  const t=reduced?1:Math.max(0,Math.min(1,(now-state.startedAt)/Math.max(1,state.endsAt-state.startedAt)));
  const p=t*t*(3-2*t),target=lightWeights(state.light);
  return {day:state.from.day+(target.day-state.from.day)*p,sunset:state.from.sunset+(target.sunset-state.from.sunset)*p,night:state.from.night+(target.night-state.from.night)*p};
}
