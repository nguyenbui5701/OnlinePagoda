import { describe, expect, it } from 'vitest';
import { seats, type OfferingRitual } from '@vuonsen/shared';
import { offeringPose, OFFERING_DURATION_MS } from '../apps/overlay/src/golden/offering-ritual';
import { offeringSpriteFrame } from '../apps/overlay/src/golden/ritual-frame';

const start = 1000000;
const seat = seats[0];
const ritual: OfferingRitual = { actorId:'test-donor', seatId:seat.id, startedAt:start, durationMs:OFFERING_DURATION_MS };
const frameAt = (age: number) => offeringSpriteFrame(offeringPose(ritual, start + age, seat));

describe('Incense 4-pose sprite timeline', () => {
  it('picks distinct visual frames at the intended ritual moments', () => {
    expect(frameAt(2600)).toBe('ritual_hold');
    expect(frameAt(3960)).toBe('ritual_raise');
    expect(frameAt(4600)).toBe('ritual_raise');
    expect(frameAt(5200)).toBe('ritual_insert');
    expect(frameAt(5710)).toBe('ritual_finish');
  });
  it('hides incense poses after returning to the seat', () => {
    expect(frameAt(1200)).toBeUndefined();
    expect(frameAt(9900)).toBeUndefined();
  });
});
