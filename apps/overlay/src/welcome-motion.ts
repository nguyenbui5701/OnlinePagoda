import {groundHome,sampleRoute,type Actor,type Seat} from '@vuonsen/shared';
import { smooth } from './live-motion';
import { goldenSeat } from './golden/layout';

/** Pure server-timestamp choreography: loading an overlay never restarts a visit. */
export function welcomePose(actor: Actor, seat: Seat, now: number, golden=true,ordered=false) {
  const w=actor.welcome;if(!w||actor.status==='exit'||actor.status==='to-standing')return undefined;
  if(w.journey){
    const j=w.journey,phase=now<j.arrivedAt?'approach':now<j.departAt?'pray':now<j.endsAt?'return':'settle';
    const p=phase==='approach'?sampleRoute(j.outbound,now):phase==='return'?sampleRoute(j.inbound,now):phase==='pray'?j.target:j.home;
    const scale=seat.scale;
    return {...p,scale,pose:phase==='pray'?'pray' as const:phase==='settle'?'kneel' as const:'walk' as const,
      age:phase==='pray'?(now-j.arrivedAt)*1800/(j.departAt-j.arrivedAt):(now-w.startedAt!)*.5,phase};
  }
  if(ordered&&w.startedAt===undefined){const origin=groundHome(w.origin??seat);return {...origin,pose:'idle' as const,age:0,phase:'waiting' as const};}
  const index=Number(actor.seatId.replace('seat-',''))||0;
  const entrance=w.origin?(golden?goldenSeat(w.origin):w.origin):{x:250+(index%6)*116,y:1785+Math.floor((index%12)/6)*76};
  const base={...entrance,scale:seat.scale,pose:'walk' as 'walk'|'pray'|'kneel',age:0,phase:'waiting' as 'waiting'|'approach'|'pray'|'return'|'settle'};
  if(w.startedAt===undefined)return base;
  const age=Math.max(0,now-w.startedAt),x=440+w.lane*40,y=1182+(w.row??0)*170;
  if(age<1800){const p=smooth(age/1800);return {...base,x:entrance.x+(x-entrance.x)*p,y:entrance.y+(y-entrance.y)*p,age,phase:'approach' as const};}
  if(age<3400)return {...base,x,y,pose:'pray' as const,age:(age-1800)*1800/1600,phase:'pray' as const};
  if(age<5800){
    const p=smooth((age-3400)/2400);
    return {...base,x:x+(seat.x-x)*p,y:y+(seat.y-y)*p,scale:seat.scale,age:age-3400,phase:'return' as const};
  }
  return {...base,x:seat.x,y:seat.y,scale:seat.scale,pose:'kneel' as const,age:(age-5800)*550/200,phase:'settle' as const};
}
