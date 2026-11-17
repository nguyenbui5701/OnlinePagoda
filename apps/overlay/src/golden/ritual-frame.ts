/** Pure visual mapping. The authoritative ritual timeline remains on the server. */
import type { OfferingPose } from './offering-ritual';

export type RitualSpritePose = 'ritual_hold' | 'ritual_raise' | 'ritual_insert' | 'ritual_finish';

export function offeringSpriteFrame(pose: OfferingPose | undefined): RitualSpritePose | undefined {
  if (!pose || pose.phase === 'done') return undefined;
  if (pose.incenseAction === 'raise' || pose.incenseAction === 'bow') return 'ritual_raise';
  if (pose.incenseAction === 'insert') return 'ritual_insert';
  if (pose.incenseAction === 'reverence') return 'ritual_finish';
  return pose.carryingIncense ? 'ritual_hold' : undefined;
}
