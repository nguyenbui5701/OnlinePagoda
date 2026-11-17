import { describe, expect, it } from 'vitest';
import { seats, type OfferingRitual } from '@vuonsen/shared';
import { giftOfferingPose, stationFor, GIFT_RITUAL_DURATION_MS, GIFT_RITUAL_SPEAK_MS } from '../apps/overlay/src/golden/gift-ritual-motion';

const start = 100000;
const groups = ['rose','candle','heart','lotus','bell','offering','fish','lantern','dragon'] as const;
const make=(effect:NonNullable<OfferingRitual['effect']>):OfferingRitual=>({
  actorId:'demo',seatId:seats[0].id,startedAt:start,durationMs:GIFT_RITUAL_DURATION_MS,effect
});

describe('3.2.5EF: every donor offers incense at the central urn; gifts decorate separately',()=>{
  it('retains 1.25x ritual timing and matching voice cue',()=>{
    expect(GIFT_RITUAL_DURATION_MS).toBe(7200);
    expect(GIFT_RITUAL_SPEAK_MS).toBe(2645);
  });
  it.each(groups)('%s uses the SAME altar coordinates and carries real incense',(kind)=>{
    const ritual=make(kind);
    const at=(age:number)=>giftOfferingPose(ritual,start+age,seats[0]);
    expect(stationFor(kind)).toMatchObject({x:540,y:1182});
    expect(at(4000)).toMatchObject({phase:'offer',x:540,y:1182,carryingIncense:true});
    expect(at(4400)).toMatchObject({phase:'offer',incensePlanted:true,carryingIncense:false});
    expect(at(4800)).toMatchObject({phase:'back-aisle',incensePlanted:true,carryingIncense:false});
    const end=at(GIFT_RITUAL_DURATION_MS);
    expect(end).toMatchObject({phase:'done',x:seats[0].x,y:seats[0].y,scale:seats[0].scale});
  });
  it('does not change movement when only the gift effect changes',()=>{
    for(const ms of [0,500,2000,2800,3000,4000,4400,6000,6600,7200]){
      const first=giftOfferingPose(make('rose'),start+ms,seats[0]);
      for(const kind of groups){expect(giftOfferingPose(make(kind),start+ms,seats[0])).toEqual(first);}
    }
  });
  it('no unknown effect redirects the actor to another location',()=>{
    const r=make('rose'); delete r.effect;
    expect(giftOfferingPose(r,start+4000,seats[0])).toMatchObject({phase:'offer',x:540,y:1182});
  });
});
