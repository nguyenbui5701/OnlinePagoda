import type { Actor, OfferingRitual } from '@vuonsen/shared';

export const smooth = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
/** Seat buckets, rather than actor count/order, guarantee at most six walkers. */
export function idleMotion(actor: Actor, now: number, enabled: boolean, reduced: boolean, ritualActor?: string) {
  const still = { dx: 0, dy: 0, pose: 'idle' as 'idle' | 'walk' | 'pray', age: 0, walking: false };
  if (!enabled || actor.welcome || actor.status !== 'idle' || actor.key === ritualActor) return still;
  const index = Number(actor.seatId.replace('seat-', '')) || 0;
  const block = Math.floor(now / 12000), phase = now % 12000;
  const settle = smooth((now - actor.statusAt) / 600);
  if (!reduced && index % 17 === block % 17 && phase >= 2000 && phase < 8000) {
    const p = (phase - 2000) / 6000, excursion = Math.sin(Math.PI * p) ** 2 * settle;
    return { dx: (index % 2 ? -1 : 1) * 28 * excursion, dy: 10 * excursion, pose: 'walk' as const, age: now % 10000, walking: true };
  }
  const gesture = (now + index * 1703) % 14000;
  return gesture < 1800 ? { ...still, pose: 'pray' as const, age: gesture } : still;
}
export function giftCamera(ritual: OfferingRitual | undefined, now: number, enabled: boolean, reduced: boolean) {
  if (!ritual || !enabled || reduced) return { scale: 1, x: 0, y: 0, focus: false };
  const age = now - ritual.startedAt, duration = ritual.durationMs || 7200;
  const arrival = duration * 3600 / 9800, leaving = duration * 6350 / 9800;
  const amount = smooth((age - arrival) / 600) * (1 - smooth((age - leaving) / 600));
  const scale = 1 + .3 * amount;
  // Translate the urn/actor upward while keeping the full viewport covered by the scene.
  return { scale, x: -540 * (scale - 1), y: -Math.min(1920 * (scale - 1), (1182 * .3 + 180) * amount), focus: amount > 0 };
}

export type Rect = { x: number; y: number; width: number; height: number };
export const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export function placeBubble(x: number, headY: number, width: number, height: number, obstacles: Rect[]): Rect | null {
  const shifts = [0, -height - 10, height + 30, ...obstacles.flatMap(r => [r.y - headY + 4, r.y + r.height - headY + height + 24])];
  for (const dy of shifts) {
    if (Math.abs(dy) > 260) continue;
    const box = { x: Math.max(12, Math.min(1068 - width, x - width / 2)), y: headY - height - 14 + dy, width, height };
    if (box.y >= 210 && box.y + height <= 1870 && !obstacles.some(r => overlaps(box, r))) return box;
  }
  return null;
}
