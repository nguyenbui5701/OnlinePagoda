/** Stage 3.2.5EF: one central incense urn for ALL confirmed gift categories.
 * Gift effects are visuals only, never actor destinations. Speed remains 1.25x.
 */
import {sampleRoute,type OfferingRitual, type Seat} from '@vuonsen/shared';
import { offeringPose, type OfferingPose } from './offering-ritual';

export const GIFT_RITUAL_DURATION_MS = 7200; // 9800 / 1.3611
export const GIFT_RITUAL_SPEAK_MS = 2645;   // arrival at the altar
export type RitualKind = 'rose' | 'candle' | 'heart' | 'lotus' | 'bell' | 'offering' | 'fish' | 'lantern' | 'dragon';
export interface RitualStation { x: number; y: number; name: string }
const CENTRAL_URN: RitualStation = { x: 540, y: 1182, name: 'Lư hương giữa chánh điện' };
export function ritualKind(ritual: OfferingRitual | undefined): RitualKind {
  const kind = ritual?.effect;
  const known: readonly RitualKind[] = ['rose','candle','heart','lotus','bell','offering','fish','lantern','dragon'];
  return kind && known.includes(kind) ? kind : 'rose';
}
/** Backward-compatible station API. It is now identical for every gift. */
export function stationFor(_kind: RitualKind): RitualStation { return CENTRAL_URN; }

export function giftOfferingPose(ritual: OfferingRitual, now: number, seat: Seat): OfferingPose {
  const j=ritual.journey;
  if(j){
    const phase=now<j.arrivedAt?'approach':now<j.departAt?'offer':now<j.endsAt?'return':'done';
    const virtualAge=phase==='approach'?2000:phase==='offer'?3600+(now-j.arrivedAt)/(j.departAt-j.arrivedAt)*2750:phase==='return'?7000:9800;
    const old=offeringPose({...ritual,startedAt:0},virtualAge,seat);
    const p=phase==='approach'?sampleRoute(j.outbound,now):phase==='return'?sampleRoute(j.inbound,now):phase==='done'?j.home:j.target;
    const scale=seat.scale;
    return {...old,x:p.x,y:p.y,scale,phase:phase==='approach'?'to-urn':phase==='return'?'back-seat':phase==='done'?'done':'offer'};
  }
  const duration = ritual.durationMs > 0 ? ritual.durationMs : GIFT_RITUAL_DURATION_MS;
  const elapsed = Math.max(0, now - ritual.startedAt);
  const virtualNow = ritual.startedAt + elapsed * (9800 / duration);
  // No gift-specific X/Y offset. All people kneel/offer at this same urn.
  return offeringPose(ritual, virtualNow, seat);
}
