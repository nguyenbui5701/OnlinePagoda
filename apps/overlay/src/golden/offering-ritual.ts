/** Deterministic scene-space movement of a gift giver; server remains the source of truth. */
import type { OfferingRitual, Seat } from '@vuonsen/shared';

export const OFFERING_DURATION_MS = 9800;
type RitualPhase = 'to-aisle' | 'to-urn' | 'offer' | 'back-aisle' | 'back-seat' | 'done';
type IncenseAction = 'carry' | 'raise' | 'bow' | 'insert' | 'reverence' | 'return' | 'done';
export interface OfferingPose {
  x: number; y: number; scale: number; phase: RitualPhase;
  /** World-space normalized pose controls for the local overlay only. */
  bow: number; carryingIncense: boolean;
  incenseAction: IncenseAction; handRaise: number; armReach: number; incensePlanted: boolean;
}
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (n: number) => { const t = clamp01(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, p: number) => a + (b - a) * smooth(p);

/**
 * The actor now stops a little lower than before so it looks like it is standing
 * in front of the urn instead of sticking to it. The hand ritual is separated into
 * carry → raise → bow → insert → reverence.
 */
export function offeringPose(ritual: OfferingRitual, now: number, seat: Seat): OfferingPose {
  const age = Math.max(0, now - ritual.startedAt);
  const entryY = Math.max(1162, seat.y);
  const altarY = 1182;
  const altarScale = seat.scale;
  const make = (phase: RitualPhase, x: number, y: number, scale: number,
    incenseAction: IncenseAction, handRaise = 0, armReach = 0, bow = 0): OfferingPose => ({
    phase, x, y, scale, bow, incenseAction, handRaise, armReach,
    carryingIncense: age >= 1500 && age < 5500,
    incensePlanted: age >= 5500 && age < OFFERING_DURATION_MS,
  });
  if (age < 1800) return make('to-aisle', mix(seat.x, 540, age / 1800), mix(seat.y, entryY, age / 1800), mix(seat.scale, altarScale, age / 1800), 'carry');
  if (age < 3600) return make('to-urn', 540, mix(entryY, altarY, (age - 1800) / 1800), altarScale, 'carry', .05);
  if (age < 4300) return make('offer', 540, altarY, altarScale, 'raise', mix(.05, .95, (age - 3600) / 700));
  if (age < 4950) return make('offer', 540, altarY, altarScale, 'bow', .95, 0, .26 * Math.sin(Math.PI * (age - 4300) / 650));
  if (age < 5500) return make('offer', 540, altarY, altarScale, 'insert', .88, smooth((age - 4950) / 550), .08);
  if (age < 6350) return make('offer', 540, altarY, altarScale, 'reverence', 1 - smooth((age - 5500) / 850), 0, .10 * Math.sin(Math.PI * (age - 5500) / 850));
  if (age < 8000) return make('back-aisle', 540, mix(altarY, entryY, (age - 6350) / 1650), altarScale, 'return');
  if (age < OFFERING_DURATION_MS) return make('back-seat', mix(540, seat.x, (age - 8000) / 1800), mix(entryY, seat.y, (age - 8000) / 1800), mix(altarScale, seat.scale, (age - 8000) / 1800), 'return');
  return make('done', seat.x, seat.y, seat.scale, 'done');
}
