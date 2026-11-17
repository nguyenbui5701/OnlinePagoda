import type {WeatherState} from '@vuonsen/shared';
export function courtyardParticle(w:WeatherState,index:number,now:number){
  const age=now-w.startedAt,delay=(index*173+w.seed*37)%2000,duration=8500+index%4*250;
  const p=(age-delay)/duration,t=Math.max(0,Math.min(1,p)),side=index%2?-1:1;
  const x=side===1?85+(index%3)*40:995-(index%3)*40;
  const stop=w.stoppingAt===undefined?1:Math.max(0,1-(now-w.stoppingAt)/400);
  return {visible:now<w.endsAt&&p>=0&&p<1&&stop>0,x:x+Math.sin(t*7+index+w.seed)*60,
    y:220+t*1510,rotation:Math.sin(t*5+index)*.7+t*2,alpha:Math.min(1,t*8,(1-t)*7)*.9*stop,
    scale:(28+index%4*10)/128,roll:.55+.45*Math.cos(t*8+index)**2};
}
