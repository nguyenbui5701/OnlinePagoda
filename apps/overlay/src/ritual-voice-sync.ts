/**
 * Stage 3.2.5D — local audio/ritual coordination (no server logic changes).
 * SFX fires when the gift arrives; speech waits until its donor reaches the altar.
 * Scene time, not wall-clock timeout, determines the speaking cue.
 */
import {ritualArrival,type GiftConfirmed,type SceneState} from '@vuonsen/shared';

export interface RitualTiming {
  actorId: string;
  startedAt: number;
  durationMs: number;
  seatId: string;
}
export type RitualScene = SceneState & { ritual?: RitualTiming };
interface Held { gift: GiftConfirmed; queuedAt: number }
export const SPEAK_AT_MS = 2645; // 1.25x ritual: start voice when actor reaches station
export const MAX_WAIT_MS = 155000; // covers server's bounded queue/TTL
export const MAX_PENDING_VOICES = 20;

export class RitualVoiceSync {
  private pending: Held[] = [];
  reset(): void { this.pending=[]; }
  get pendingCount(): number { return this.pending.length; }
  /** Hold a known visitor's gift (seated or standing) until their golden-scene ritual. */
  hold(gift: GiftConfirmed, state: SceneState, audioEnabled: boolean): boolean {
    if (!audioEnabled || !state.settings.showGiftThanks || state.settings.masterMute || state.settings.voiceVolume <= 0) return false;
    if (state.settings.theme !== 'golden') return false;
    if (!state.actors.some(a => a.key === gift.userKey && a.status !== 'exit')) return false;
    if (this.pending.some(p => p.gift.eventKey === gift.eventKey)) return true;
    if (this.pending.length >= MAX_PENDING_VOICES) return false; // fall back to immediate normal audio
    this.pending.push({gift, queuedAt: state.serverTime});
    return true;
  }
  /** Return due thank-you speech, in FIFO order. Never synthesize a new/incorrect name. */
  due(state: SceneState, at: number): GiftConfirmed[] {
    const ritual=(state as RitualScene).ritual;
    const age = ritual ? at-ritual.startedAt : -1;
    const result: GiftConfirmed[]=[];
    const retain: Held[]=[];
    for (const item of this.pending) {
      const aligned = Boolean(ritual && ritual.source!=='comment' && ritual.actorId === item.gift.userKey && at >= (ritual.journey?ritualArrival(ritual):ritual.startedAt+SPEAK_AT_MS) && age < ritual.durationMs);
      const timedOut = at-item.queuedAt >= MAX_WAIT_MS;
      const actorMissing = !state.actors.some(a=>a.key===item.gift.userKey && a.status!=='exit');
      const sceneChanged = state.settings.theme!=='golden';
      if (aligned || timedOut || actorMissing || sceneChanged) result.push(item.gift);
      else retain.push(item);
    }
    this.pending=retain;
    return result;
  }
}
