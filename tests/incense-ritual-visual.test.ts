import { describe, expect, it } from 'vitest';
import { seats, type OfferingRitual } from '@vuonsen/shared';
import { OFFERING_DURATION_MS, offeringPose } from '../apps/overlay/src/golden/offering-ritual';

const start = 1000000;
const seat = seats[0];
const ritual: OfferingRitual = { actorId: 'test-donor', seatId: seat.id, startedAt: start, durationMs: OFFERING_DURATION_MS };
const at = (age: number) => offeringPose(ritual, start + age, seat);

describe('Visible 3-stick incense ritual choreography', () => {
  it('walks in, then raises incense clearly before bowing', () => {
    expect(at(1000).phase).toBe('to-aisle');
    expect(at(2000)).toMatchObject({phase:'to-urn', carryingIncense:true});
    expect(at(3980)).toMatchObject({phase:'offer',incenseAction:'raise'});
    expect(at(4190).handRaise).toBeGreaterThan(.88);
    expect(at(4290).handRaise).toBeGreaterThan(.94);
    expect(at(4400).incenseAction).toBe('bow');
    expect(at(4400).bow).toBeGreaterThan(0);
  });
  it('moves arm to insert sticks into the urn, then leaves them planted', () => {
    expect(at(5000)).toMatchObject({incenseAction:'insert',carryingIncense:true,incensePlanted:false});
    expect(at(5440).armReach).toBeGreaterThan(.85);
    expect(at(5550)).toMatchObject({incenseAction:'reverence',carryingIncense:false,incensePlanted:true});
    expect(at(6299).incensePlanted).toBe(true);
    expect(at(6350)).toMatchObject({phase:'back-aisle',incensePlanted:true});
    expect(at(9799)).toMatchObject({phase:'back-seat',incensePlanted:true});
  });
  it('returns to the exact original seat after 9800ms, deterministic on reconnect', () => {
    const last = at(OFFERING_DURATION_MS);
    expect(last).toMatchObject({phase:'done',x:seat.x,y:seat.y,scale:seat.scale,carryingIncense:false});
    for(const time of [0,2000,3900,5500,9000]) {
      const pose=at(time);
      expect([pose.x,pose.y,pose.scale,pose.handRaise,pose.armReach,pose.bow].every(Number.isFinite)).toBe(true);
      expect(pose).toEqual(offeringPose({...ritual},start+time,{...seat}));
    }
  });
});
